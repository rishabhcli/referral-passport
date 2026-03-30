import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/AuthProvider';
import { runOrchestratorService } from '@/services/runOrchestratorService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, XCircle, AlertTriangle, Clock, ArrowRight, Loader2, Shield, RefreshCw, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { RunStateModel, RunState, RequirementItem, EvidenceItem, SponsorTraceItem } from '@/types/domain';

// === Status Rail ===
const STATE_STEPS: { state: RunState; label: string }[] = [
  { state: 'assembling', label: 'Assembling' },
  { state: 'submitted', label: 'Submitted' },
  { state: 'input_required', label: 'Input Required' },
  { state: 'repairing', label: 'Repairing' },
  { state: 'resubmitting', label: 'Resubmitting' },
  { state: 'accepted', label: 'Accepted' },
];

function StatusRail({ currentState }: { currentState: RunState }) {
  const currentIdx = STATE_STEPS.findIndex(s => s.state === currentState);
  const isBlocked = currentState === 'blocked';
  const isFailed = currentState === 'failed';

  return (
    <div className="space-y-1">
      {STATE_STEPS.map((step, i) => {
        const isPast = i < currentIdx || currentState === 'accepted';
        const isCurrent = step.state === currentState;
        const isSkipped = (isBlocked || isFailed) && i > currentIdx;

        let dotColor = 'bg-muted';
        let textColor = 'text-muted-foreground';
        if (isPast) { dotColor = 'bg-status-success'; textColor = 'text-foreground'; }
        if (isCurrent && !isBlocked && !isFailed) { dotColor = 'bg-primary'; textColor = 'text-foreground font-medium'; }
        if (isCurrent && currentState === 'input_required') { dotColor = 'bg-status-warning'; }
        if (isCurrent && currentState === 'accepted') { dotColor = 'bg-status-success'; }
        if (isSkipped) { dotColor = 'bg-muted'; textColor = 'text-muted-foreground/50'; }

        return (
          <div key={step.state} className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full flex-shrink-0 ${dotColor}`} />
            <span className={`text-xs ${textColor}`}>{step.label}</span>
          </div>
        );
      })}
      {isBlocked && (
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-status-danger flex-shrink-0" />
          <span className="text-xs text-status-danger font-medium">Blocked</span>
        </div>
      )}
      {isFailed && (
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-status-danger flex-shrink-0" />
          <span className="text-xs text-status-danger font-medium">Failed</span>
        </div>
      )}
    </div>
  );
}

// === Passport Card ===
function PassportCard({ passport }: { passport: RunStateModel['passport'] }) {
  if (!passport) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Referral Passport</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Destination</p>
          <p className="font-medium">{passport.destination}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Reason for Referral</p>
          <p>{passport.reasonForReferral}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Clinical Context</p>
          <p>{passport.clinicalContext}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {passport.conditions.map((c, i) => (
            <span key={i} className="status-chip bg-secondary text-secondary-foreground">{c}</span>
          ))}
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Key Medications</p>
          <div className="flex flex-wrap gap-1.5">
            {passport.medications.map((m, i) => (
              <span key={i} className="text-xs text-muted-foreground">{m}{i < passport.medications.length - 1 ? ' ·' : ''}</span>
            ))}
          </div>
        </div>
        <div className="text-xs text-muted-foreground border-t pt-2">
          {passport.attachedEvidenceIds.length} evidence items attached
          {passport.lastSubmittedAt && ` · Last submitted ${new Date(passport.lastSubmittedAt).toLocaleTimeString()}`}
        </div>
      </CardContent>
    </Card>
  );
}

// === Requirement Checklist ===
function RequirementChecklist({ requirements }: { requirements: RequirementItem[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Requirement Checklist</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {requirements.map(req => (
          <div key={req.code} className="flex items-start gap-2">
            {req.status === 'met' ? (
              <CheckCircle2 className="h-4 w-4 text-status-success flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-4 w-4 text-status-danger flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className={`text-sm ${req.status === 'unmet' ? 'font-medium text-status-danger' : 'text-foreground'}`}>
                {req.label}
              </p>
              <p className="text-xs text-muted-foreground">{req.description}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// === Evidence Table ===
function EvidenceTable({ evidence }: { evidence: EvidenceItem[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Evidence Table</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">Evidence</th>
                <th className="pb-2 pr-3 font-medium">Type</th>
                <th className="pb-2 pr-3 font-medium">Date</th>
                <th className="pb-2 pr-3 font-medium">Value</th>
                <th className="pb-2 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {evidence.map(e => (
                <tr key={e.id} className={`border-b last:border-0 ${e.newlyAdded ? 'animate-highlight-row' : ''}`}>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-1.5">
                      <span className={e.newlyAdded ? 'font-medium text-status-success' : ''}>{e.label}</span>
                      {e.newlyAdded && <Badge className="bg-status-success-muted text-status-success text-xs px-1.5 py-0">New</Badge>}
                    </div>
                  </td>
                  <td className="py-2 pr-3 text-muted-foreground text-xs">{e.type}</td>
                  <td className="py-2 pr-3 text-muted-foreground text-xs">{e.date}</td>
                  <td className="py-2 pr-3 text-xs max-w-[200px] truncate">{e.value}</td>
                  <td className="py-2 text-muted-foreground text-xs">{e.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// === Intake Decision Card ===
function IntakeDecisionCard({ decision }: { decision: RunStateModel['intakeDecision'] }) {
  if (!decision) return null;
  const isAccepted = decision.decision === 'accepted';
  const isInputRequired = decision.decision === 'input_required';

  return (
    <Card className={isAccepted ? 'border-status-success/30' : isInputRequired ? 'border-status-warning/30' : 'border-status-danger/30'}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Intake Decision</CardTitle>
          <span className={`status-chip ${isAccepted ? 'bg-status-success-muted text-status-success' : isInputRequired ? 'bg-status-warning-muted text-status-warning' : 'bg-status-danger-muted text-status-danger'}`}>
            {isAccepted && <CheckCircle2 className="h-3 w-3" />}
            {isInputRequired && <AlertTriangle className="h-3 w-3" />}
            {decision.decision === 'blocked' && <XCircle className="h-3 w-3" />}
            {decision.decision.replace(/_/g, ' ')}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm">{decision.summary}</p>
        <p className="text-xs text-muted-foreground">{decision.agentLabel} · {new Date(decision.timestamp).toLocaleTimeString()}</p>
      </CardContent>
    </Card>
  );
}

// === Sponsor Trace Rail ===
function SponsorTraceRail({ trace }: { trace: SponsorTraceItem[] }) {
  const statusIcon = (s: string) => {
    if (s === 'success') return <CheckCircle2 className="h-3 w-3 text-status-success" />;
    if (s === 'warning') return <AlertTriangle className="h-3 w-3 text-status-warning" />;
    if (s === 'error') return <XCircle className="h-3 w-3 text-status-danger" />;
    return <Clock className="h-3 w-3 text-status-info" />;
  };
  const kindBadge = (k: string) => {
    const colors: Record<string, string> = {
      context: 'bg-status-info-muted text-status-info',
      fhir: 'bg-status-success-muted text-status-success',
      a2a: 'bg-status-warning-muted text-status-warning',
      mcp: 'bg-accent text-accent-foreground',
      system: 'bg-secondary text-secondary-foreground',
    };
    return colors[k] ?? colors.system;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Submission Trace</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {trace.map(t => (
          <div key={t.id} className="flex items-start gap-2 text-xs">
            <div className="mt-0.5">{statusIcon(t.status)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`status-chip text-[10px] px-1.5 py-0 ${kindBadge(t.kind)}`}>{t.kind.toUpperCase()}</span>
                <span className="font-medium">{t.label}</span>
              </div>
              <p className="text-muted-foreground truncate">{t.description}</p>
            </div>
            <span className="text-muted-foreground text-[10px] flex-shrink-0">
              {new Date(t.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// === Activity Timeline ===
const EVENT_META: Record<string, { label: string; icon: 'check' | 'clock' | 'alert' | 'x' }> = {
  'run.created': { label: 'Run created', icon: 'clock' },
  'context.bound': { label: 'Patient context bound', icon: 'check' },
  'snapshot.requested': { label: 'Chart snapshot requested', icon: 'clock' },
  'snapshot.received': { label: 'Chart snapshot received', icon: 'check' },
  'passport.created': { label: 'Passport assembled', icon: 'check' },
  'evidence.created': { label: 'Evidence table created', icon: 'check' },
  'intake.submitted': { label: 'Submitted to intake desk', icon: 'clock' },
  'intake.input_required': { label: 'Intake: input required', icon: 'alert' },
  'repair.started': { label: 'Repair initiated', icon: 'clock' },
  'uacr.requested': { label: 'UACR retrieval requested', icon: 'clock' },
  'uacr.attached': { label: 'UACR evidence attached', icon: 'check' },
  'intake.resubmitted': { label: 'Resubmitted to intake desk', icon: 'clock' },
  'intake.accepted': { label: 'Intake: accepted', icon: 'check' },
  'run.blocked': { label: 'Run blocked', icon: 'x' },
  'run.failed': { label: 'Run failed', icon: 'x' },
};

function ActivityTimeline({ events }: { events: RunStateModel['events'] }) {
  const iconEl = (type: 'check' | 'clock' | 'alert' | 'x') => {
    if (type === 'check') return <CheckCircle2 className="h-3 w-3 text-status-success" />;
    if (type === 'alert') return <AlertTriangle className="h-3 w-3 text-status-warning" />;
    if (type === 'x') return <XCircle className="h-3 w-3 text-status-danger" />;
    return <Clock className="h-3 w-3 text-muted-foreground" />;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-0">
          {events.map((ev, i) => {
            const meta = EVENT_META[ev.eventType] ?? { label: ev.eventType.replace(/[._]/g, ' '), icon: 'clock' as const };
            const isLast = i === events.length - 1;
            return (
              <div key={ev.id} className="flex gap-2.5 relative">
                {/* Vertical line */}
                {!isLast && (
                  <div className="absolute left-[5px] top-[14px] w-px h-[calc(100%)] bg-border" />
                )}
                <div className="mt-0.5 flex-shrink-0 z-10 bg-card">{iconEl(meta.icon)}</div>
                <div className="pb-3 min-w-0">
                  <p className="text-xs font-medium leading-tight">{meta.label}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {ev.source && <span className="mr-1.5">{ev.source}</span>}
                    {ev.createdAt ? new Date(ev.createdAt).toLocaleTimeString() : ''}
                  </p>
                </div>
              </div>
            );
          })}
          {events.length === 0 && (
            <p className="text-xs text-muted-foreground">No events yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// === Outcome Stamp ===
function OutcomeStamp({ state }: { state: RunState }) {
  if (state === 'accepted') {
    return (
      <div className="animate-stamp-in flex flex-col items-center gap-2 py-4">
        <div className="h-16 w-16 rounded-full bg-status-success/10 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-status-success" />
        </div>
        <p className="text-lg font-semibold text-status-success">Accepted by Nephrology Intake</p>
        <p className="text-sm text-muted-foreground">Referral packet meets all requirements</p>
      </div>
    );
  }
  if (state === 'blocked') {
    return (
      <div className="animate-fade-in-up flex flex-col items-center gap-2 py-4">
        <div className="h-16 w-16 rounded-full bg-status-danger/10 flex items-center justify-center">
          <XCircle className="h-8 w-8 text-status-danger" />
        </div>
        <p className="text-lg font-semibold text-status-danger">Blocked — Manual Follow-up Required</p>
        <p className="text-sm text-muted-foreground">Required evidence could not be retrieved automatically</p>
      </div>
    );
  }
  return null;
}

// === Debug Drawer ===
function DebugDrawer({ runState }: { runState: RunStateModel }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t mt-6">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1 text-xs text-muted-foreground py-2 hover:text-foreground">
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
        Debug Inspector
      </button>
      {open && (
        <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-96">
          {JSON.stringify(runState, null, 2)}
        </pre>
      )}
    </div>
  );
}

// === Main Run Page ===
export default function ReferralRunPage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: runState, isLoading, error } = useQuery({
    queryKey: ['run', runId],
    queryFn: () => runOrchestratorService.getReferralRun(runId!),
    enabled: !!runId,
    refetchInterval: (query) => {
      const state = query.state.data?.state;
      if (state && ['accepted', 'blocked', 'failed'].includes(state)) return false;
      return 3000;
    },
  });

  const repairMutation = useMutation({
    mutationFn: async () => {
      if (!runId || !profile) throw new Error('Missing context');
      const missingReq = runState?.requirements.find(r => r.status === 'unmet' && r.repairable);
      if (!missingReq) throw new Error('No repairable requirement');
      return runOrchestratorService.repairReferralRun(runId, missingReq.code, profile.id);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['run', runId], data);
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!runId || !profile) throw new Error('Missing context');
      return runOrchestratorService.resetReferralRun(runId, profile.id);
    },
    onSuccess: (newRunId) => {
      navigate(`/app/runs/${newRunId}`);
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-2"><Skeleton className="h-40" /></div>
          <div className="lg:col-span-6 space-y-4"><Skeleton className="h-60" /><Skeleton className="h-40" /></div>
          <div className="lg:col-span-4 space-y-4"><Skeleton className="h-32" /><Skeleton className="h-48" /></div>
        </div>
      </div>
    );
  }

  if (error || !runState) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-destructive mb-4">Failed to load referral run</p>
        <Button variant="outline" onClick={() => navigate('/app')}>Return to workspace</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <h1 className="text-base font-semibold">Consult Passport</h1>
            {runState.isTerminal && (
              <span className={`status-chip ${
                runState.state === 'accepted' ? 'bg-status-success-muted text-status-success' :
                'bg-status-danger-muted text-status-danger'
              }`}>
                {runState.state === 'accepted' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                {runState.state.replace(/_/g, ' ')}
              </span>
            )}
          </div>
          {runState.patientContext && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {runState.patientContext.displayName} · {runState.patientContext.age}{runState.patientContext.sex[0]} · {runState.destination?.displayName}
            </p>
          )}
        </div>
        {/* Actions */}
        <div className="flex gap-2">
          {runState.canRepair && (
            <Button onClick={() => repairMutation.mutate()} disabled={repairMutation.isPending} className="gap-1.5">
              {repairMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
              Fetch Missing Evidence
            </Button>
          )}
          {runState.canReset && (
            <Button variant="outline" onClick={() => resetMutation.mutate()} disabled={resetMutation.isPending} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> New Run
            </Button>
          )}
        </div>
      </div>

      {/* Terminal stamp */}
      {runState.isTerminal && <OutcomeStamp state={runState.state} />}

      {/* Error banner */}
      {repairMutation.isError && (
        <div className="bg-status-danger-muted text-status-danger text-sm p-3 rounded-md">
          Repair failed: {(repairMutation.error as Error).message}. You can retry.
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Status Rail */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-medium">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusRail currentState={runState.state} />
            </CardContent>
          </Card>
        </div>

        {/* Center: Passport + Evidence */}
        <div className="lg:col-span-6 space-y-4">
          <PassportCard passport={runState.passport} />
          <EvidenceTable evidence={runState.evidence} />
        </div>

        {/* Right: Requirements + Decision + Trace */}
        <div className="lg:col-span-4 space-y-4">
          {runState.requirements.length > 0 && <RequirementChecklist requirements={runState.requirements} />}
          <IntakeDecisionCard decision={runState.intakeDecision} />
          {runState.trace.length > 0 && <SponsorTraceRail trace={runState.trace} />}
          {runState.events.length > 0 && <ActivityTimeline events={runState.events} />}
        </div>
      </div>

      <DebugDrawer runState={runState} />
    </div>
  );
}
