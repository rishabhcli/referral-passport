import { supabase } from '@/lib/supabase';
import { chartToolService } from './chartToolService';
import { intakeDeskService } from './intakeDeskService';
import { passportBuilderService } from './passportBuilderService';
import { patientContextService } from './patientContextService';
import { traceService } from './traceService';
import { auditService } from './auditService';
import { TERMINAL_STATES } from '@/types/domain';
import type {
  RunState, RunStateModel, SponsorTraceItem, EvidenceItem,
  ReferralPassport, IntakeDecision, RequirementItem, RunEvent,
} from '@/types/domain';

export const runOrchestratorService = {
  async startReferralRun(
    userId: string,
    patientId: string,
    destinationSlug: string,
  ): Promise<RunStateModel> {
    const { data: dest, error: destErr } = await supabase
      .from('destinations').select('*').eq('slug', destinationSlug).single();
    if (destErr || !dest) throw new Error('Destination not found');

    const { data: scenario } = await supabase
      .from('demo_scenarios').select('*').eq('is_default', true).single();

    const patient = await patientContextService.getPatient(patientId);
    const patientContext = patientContextService.buildPatientContext(patient);

    const { data: run, error: runErr } = await supabase
      .from('referral_runs')
      .insert([{
        created_by: userId,
        patient_id: patientId,
        destination_id: dest.id,
        scenario_id: scenario?.id ?? null,
        state: 'assembling' as const,
        entry_surface: 'app',
        context_snapshot: patientContext as any,
      }])
      .select()
      .single();
    if (runErr || !run) throw new Error(`Failed to create run: ${runErr?.message}`);

    const runId = run.id;
    const trace: SponsorTraceItem[] = [];

    await appendEvent(runId, 'run.created', 'orchestrator', 'init', { patientId, destinationSlug });
    trace.push(traceService.createEntry('context', 'Patient context bound', `Patient: ${patientContext.displayName} (${patientContext.age}${patientContext.sex[0]})`, 'success', 'context-service'));
    trace.push(traceService.createEntry('fhir', 'FHIR context loaded', `Source: ${patientContext.fhirContext.sourceLabel}`, 'success', 'fhir-service'));

    const sourceLabel = patientContext.fhirContext.sourceLabel;
    const snapshot = await chartToolService.getPatientSnapshot(patientId, sourceLabel);
    trace.push(...snapshot.trace);
    await appendEvent(runId, 'snapshot.received', 'chart-tool', 'assembling', { evidenceCount: snapshot.evidence.length });

    const passport = passportBuilderService.buildPassport(patientContext, snapshot.evidence, dest.display_name);
    passport.status = 'submitted';
    passport.lastSubmittedAt = new Date().toISOString();

    await persistArtifact(runId, 'referral_passport', passport);
    await persistArtifact(runId, 'evidence_table', snapshot.evidence);
    await appendEvent(runId, 'passport.created', 'passport-builder', 'assembling', {});

    await updateRunState(runId, 'submitted');
    trace.push(traceService.createEntry('a2a', `A2A task submitted to ${dest.display_name}`, `Submitting referral packet with ${snapshot.evidence.length} evidence items`, 'info', 'a2a-transport'));
    await appendEvent(runId, 'intake.submitted', 'orchestrator', 'submitted', {});

    const decision = await intakeDeskService.evaluate(dest.id, snapshot.evidence, passport as unknown as Record<string, unknown>);
    await persistArtifact(runId, 'intake_decision', decision);

    const newState: RunState = decision.decision === 'accepted' ? 'accepted' :
      decision.decision === 'input_required' ? 'input_required' : 'blocked';

    await updateRunState(runId, newState, decision.summary,
      decision.missingRequirements[0]?.code ?? null);

    if (newState === 'input_required') {
      trace.push(traceService.createEntry('a2a', 'A2A response: input_required',
        `Missing: ${decision.missingRequirements.map(r => r.label).join(', ')}`, 'warning', 'nephrology-intake'));
      await appendEvent(runId, 'intake.input_required', 'intake-desk', 'input_required', {
        missingRequirements: decision.missingRequirements.map(r => r.code),
      });
    }

    await auditService.log(userId, 'referral_run.started', 'referral_run', runId, { patientId, destinationSlug });

    const allEvents = await getRunEvents(runId);
    return buildReadModel(runId, newState, decision.summary, patientContext, dest, passport, snapshot.evidence, decision, [...decision.missingRequirements, ...decision.satisfiedRequirements], trace, allEvents);
  },

  async getReferralRun(runId: string): Promise<RunStateModel> {
    const { data: run, error } = await supabase
      .from('referral_runs')
      .select('*, patients(*), destinations(*)')
      .eq('id', runId)
      .single();
    if (error || !run) throw new Error('Run not found');

    const patientContext = patientContextService.buildPatientContext(run.patients as any);
    const artifacts = await getLatestArtifacts(runId);
    const events = await getRunEvents(runId);

    const passport = artifacts.referral_passport as ReferralPassport | null;
    const evidence = (artifacts.evidence_table as EvidenceItem[]) ?? [];
    const decision = artifacts.intake_decision as IntakeDecision | null;
    const requirements = decision
      ? [...(decision.missingRequirements ?? []), ...(decision.satisfiedRequirements ?? [])]
      : [];

    const trace = reconstructTrace(events);

    return buildReadModel(
      runId, run.state as RunState, run.state_reason,
      patientContext, run.destinations as any,
      passport, evidence, decision, requirements, trace, events
    );
  },

  async repairReferralRun(runId: string, requirementCode: string, userId: string): Promise<RunStateModel> {
    const { data: run, error } = await supabase
      .from('referral_runs')
      .select('*, patients(*), destinations(*)')
      .eq('id', runId)
      .single();
    if (error || !run) throw new Error('Run not found');
    if (run.state !== 'input_required') throw new Error(`Cannot repair from state: ${run.state}`);

    const trace: SponsorTraceItem[] = [];

    await updateRunState(runId, 'repairing');
    await appendEvent(runId, 'repair.started', 'orchestrator', 'repairing', { requirementCode });
    trace.push(traceService.createEntry('mcp', 'MCP tool call: get_latest_uacr', 'Searching patient chart for qualifying UACR observation', 'info', 'chart-tool-service'));

    const patientContext = patientContextService.buildPatientContext(run.patients as any);
    const sourceLabel = patientContext.fhirContext.sourceLabel;
    const uacrResult = await chartToolService.getLatestUacr(run.patient_id, sourceLabel);
    trace.push(...uacrResult.trace);
    await appendEvent(runId, 'uacr.requested', 'chart-tool', 'repairing', {});

    if (!uacrResult.evidence) {
      await updateRunState(runId, 'blocked', 'UACR not found in patient chart. Manual follow-up required.');
      await persistArtifact(runId, 'follow_up_task', {
        action: 'Order/retrieve UACR and resubmit referral',
        assignee: 'Referring provider',
        priority: 'high',
        status: 'pending',
      });
      await appendEvent(runId, 'run.blocked', 'orchestrator', 'blocked', { reason: 'uacr_not_found' });
      trace.push(traceService.createEntry('system', 'Run blocked', 'UACR not found — manual follow-up required', 'error', 'orchestrator'));

      const allEvents = await getRunEvents(runId);
      const artifacts = await getLatestArtifacts(runId);
      const patientContext = patientContextService.buildPatientContext(run.patients as any);
      return buildReadModel(runId, 'blocked', 'UACR not found', patientContext, run.destinations as any,
        artifacts.referral_passport as any, (artifacts.evidence_table as EvidenceItem[]) ?? [], artifacts.intake_decision as any,
        [], trace, allEvents);
    }

    await appendEvent(runId, 'uacr.attached', 'chart-tool', 'repairing', { resourceKey: uacrResult.evidence.resourceKey });

    const artifacts = await getLatestArtifacts(runId);
    let evidence = (artifacts.evidence_table as EvidenceItem[]) ?? [];
    evidence = [...evidence, uacrResult.evidence];
    await persistArtifact(runId, 'evidence_table', evidence);

    let passport = artifacts.referral_passport as ReferralPassport;
    passport = passportBuilderService.updatePassportWithEvidence(passport, uacrResult.evidence);
    passport.lastSubmittedAt = new Date().toISOString();
    await persistArtifact(runId, 'referral_passport', passport);

    await updateRunState(runId, 'resubmitting');
    trace.push(traceService.createEntry('a2a', 'Resubmitting to Nephrology Intake', 'Packet updated with UACR evidence', 'info', 'a2a-transport'));
    await appendEvent(runId, 'intake.resubmitted', 'orchestrator', 'resubmitting', {});

    const decision = await intakeDeskService.evaluate(run.destination_id, evidence, passport as unknown as Record<string, unknown>);
    await persistArtifact(runId, 'intake_decision', decision);

    const finalState: RunState = decision.decision === 'accepted' ? 'accepted' : 'blocked';
    await updateRunState(runId, finalState, decision.summary);
    await supabase.from('referral_runs').update({
      repair_attempted: true,
      ...(finalState === 'accepted' ? { accepted_at: new Date().toISOString() } : { blocked_at: new Date().toISOString() }),
    }).eq('id', runId);

    if (finalState === 'accepted') {
      trace.push(traceService.createEntry('a2a', 'A2A response: accepted', 'Referral accepted by Nephrology Intake', 'success', 'nephrology-intake'));
      await appendEvent(runId, 'intake.accepted', 'intake-desk', 'accepted', {});
    } else {
      trace.push(traceService.createEntry('a2a', 'A2A response: blocked', decision.summary, 'error', 'nephrology-intake'));
      await appendEvent(runId, 'run.blocked', 'intake-desk', 'blocked', {});
    }

    await auditService.log(userId, 'referral_run.repaired', 'referral_run', runId, { requirementCode, outcome: finalState });

    const allEvents = await getRunEvents(runId);
    const patientContext = patientContextService.buildPatientContext(run.patients as any);
    const allRequirements = [...(decision.missingRequirements ?? []), ...(decision.satisfiedRequirements ?? [])];

    return buildReadModel(runId, finalState, decision.summary, patientContext, run.destinations as any,
      passport, evidence, decision, allRequirements, trace, allEvents);
  },

  async listRecentRuns(userId: string) {
    const { data, error } = await supabase
      .from('referral_runs')
      .select('id, state, state_reason, patient_id, created_at, updated_at, patients(display_name), destinations(display_name)')
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    return (data ?? []).map(r => ({
      id: r.id,
      state: r.state as RunState,
      patientId: r.patient_id,
      patientName: (r.patients as any)?.display_name ?? 'Unknown',
      destination: (r.destinations as any)?.display_name ?? 'Unknown',
      createdAt: r.created_at ?? '',
    }));
  },

  async resetReferralRun(runId: string, userId: string): Promise<string> {
    const { data: run } = await supabase.from('referral_runs').select('patient_id, destination_id').eq('id', runId).single();
    if (!run) throw new Error('Run not found');
    const { data: dest } = await supabase.from('destinations').select('slug').eq('id', run.destination_id).single();
    const newRun = await this.startReferralRun(userId, run.patient_id, dest?.slug ?? 'nephrology-intake');
    return newRun.runId;
  },
};

async function updateRunState(runId: string, state: RunState, reason?: string | null, requirementCode?: string | null) {
  const updates: Record<string, unknown> = { state };
  if (reason !== undefined) updates.state_reason = reason;
  if (requirementCode !== undefined) updates.current_requirement_code = requirementCode;
  await supabase.from('referral_runs').update(updates).eq('id', runId);
}

async function appendEvent(runId: string, eventType: string, source: string, stage: string, payload: Record<string, unknown>) {
  await supabase.from('run_events').insert([{ run_id: runId, event_type: eventType, source, stage, payload: payload as any }]);
}

async function persistArtifact(runId: string, artifactName: string, content: unknown) {
  const { data: existing } = await supabase
    .from('artifact_snapshots')
    .select('artifact_version')
    .eq('run_id', runId)
    .eq('artifact_name', artifactName)
    .order('artifact_version', { ascending: false })
    .limit(1);

  const version = (existing?.[0]?.artifact_version ?? 0) + 1;
  await supabase.from('artifact_snapshots').insert([{
    run_id: runId,
    artifact_name: artifactName,
    artifact_version: version,
    content: content as any,
  }]);
}

async function getLatestArtifacts(runId: string): Promise<Record<string, unknown>> {
  const { data } = await supabase
    .from('artifact_snapshots')
    .select('*')
    .eq('run_id', runId)
    .order('artifact_version', { ascending: false });

  const artifacts: Record<string, unknown> = {};
  for (const a of data ?? []) {
    if (!artifacts[a.artifact_name]) {
      artifacts[a.artifact_name] = a.content;
    }
  }
  return artifacts;
}

async function getRunEvents(runId: string): Promise<RunEvent[]> {
  const { data } = await supabase
    .from('run_events')
    .select('*')
    .eq('run_id', runId)
    .order('created_at', { ascending: true });

  return (data ?? []).map(e => ({
    id: e.id,
    runId: e.run_id,
    eventType: e.event_type,
    source: e.source ?? '',
    stage: e.stage ?? '',
    payload: (e.payload ?? {}) as Record<string, unknown>,
    createdAt: e.created_at ?? '',
  }));
}

function reconstructTrace(events: RunEvent[]): SponsorTraceItem[] {
  return events.map(e => ({
    id: e.id,
    kind: mapEventToTraceKind(e.eventType),
    label: formatEventLabel(e.eventType),
    description: JSON.stringify(e.payload).substring(0, 200),
    status: mapEventToStatus(e.eventType),
    timestamp: e.createdAt,
    source: e.source,
  }));
}

function mapEventToTraceKind(eventType: string): SponsorTraceItem['kind'] {
  if (eventType.startsWith('context.') || eventType === 'run.created') return 'context';
  if (eventType.startsWith('intake.') || eventType.startsWith('run.')) return 'a2a';
  if (eventType.startsWith('uacr.') || eventType.startsWith('snapshot.') || eventType.startsWith('repair.')) return 'mcp';
  if (eventType.startsWith('passport.') || eventType.startsWith('evidence.')) return 'fhir';
  return 'system';
}

function formatEventLabel(eventType: string): string {
  const labels: Record<string, string> = {
    'run.created': 'Run initialized',
    'context.bound': 'Patient context bound',
    'snapshot.received': 'Chart snapshot received',
    'passport.created': 'Referral passport built',
    'intake.submitted': 'Submitted to Nephrology Intake',
    'intake.input_required': 'Input required by intake',
    'repair.started': 'Repair initiated',
    'uacr.requested': 'UACR retrieval requested',
    'uacr.attached': 'UACR evidence attached',
    'intake.resubmitted': 'Resubmitted to intake',
    'intake.accepted': 'Accepted by Nephrology Intake',
    'run.blocked': 'Run blocked',
    'run.failed': 'Run failed',
  };
  return labels[eventType] ?? eventType;
}

function mapEventToStatus(eventType: string): SponsorTraceItem['status'] {
  if (eventType.includes('accepted')) return 'success';
  if (eventType.includes('blocked') || eventType.includes('failed')) return 'error';
  if (eventType.includes('input_required')) return 'warning';
  return 'info';
}

function buildReadModel(
  runId: string, state: RunState, stateReason: string | null,
  patientContext: any, destination: any,
  passport: ReferralPassport | null, evidence: EvidenceItem[],
  decision: IntakeDecision | null, requirements: RequirementItem[],
  trace: SponsorTraceItem[], events: RunEvent[]
): RunStateModel {
  return {
    runId,
    state,
    stateReason: stateReason ?? null,
    patientContext,
    destination: destination ? {
      id: destination.id,
      slug: destination.slug,
      displayName: destination.display_name,
      specialty: destination.specialty,
      agentLabel: destination.agent_label,
      isActive: destination.is_active,
    } : null,
    passport,
    evidence,
    intakeDecision: decision,
    requirements,
    trace,
    events,
    canRepair: state === 'input_required' && requirements.some(r => r.status === 'unmet' && r.repairable),
    canReset: TERMINAL_STATES.includes(state),
    isTerminal: TERMINAL_STATES.includes(state),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
