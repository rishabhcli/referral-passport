import type { RunStateModel, RequirementItem, SponsorTraceItem } from '@/types/domain';

const ts = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000).toISOString();
type TStatus = SponsorTraceItem['status'];

const sharedPatientContext = {
  patientId: 'replay-patient',
  displayName: 'Eleanor Vance',
  age: 67,
  sex: 'Female',
  conditionTags: ['CKD Stage 3', 'Type 2 Diabetes', 'Hypertension'],
  fhirContext: {
    fhirUrl: 'https://fhir.demo.clinic/Patient/demo-001',
    patientId: 'demo-001',
    tokenPresent: true,
    sourceLabel: 'Demo EHR (Synthetic)',
  },
};

const sharedDestination = {
  id: 'replay-dest',
  slug: 'nephrology-intake',
  displayName: 'Nephrology Intake',
  specialty: 'Nephrology',
  agentLabel: 'Nephrology Intake Desk (A2A)',
  isActive: true,
};

const baseEvidence = [
  { id: 'e1', type: 'Condition', label: 'CKD Stage 3', date: '2025-11-15', value: 'active — onset 2023-06-01', source: 'Demo EHR (Synthetic)', attached: true, newlyAdded: false, resourceType: 'Condition', resourceKey: 'cond-ckd3' },
  { id: 'e2', type: 'Condition', label: 'Type 2 Diabetes Mellitus', date: '2025-08-20', value: 'active — onset 2019-03-15', source: 'Demo EHR (Synthetic)', attached: true, newlyAdded: false, resourceType: 'Condition', resourceKey: 'cond-t2dm' },
  { id: 'e3', type: 'Condition', label: 'Essential Hypertension', date: '2025-06-10', value: 'active — onset 2017-09-01', source: 'Demo EHR (Synthetic)', attached: true, newlyAdded: false, resourceType: 'Condition', resourceKey: 'cond-htn' },
  { id: 'e4', type: 'Observation', label: 'eGFR', date: '2026-02-28', value: '38 mL/min/1.73m²', source: 'Demo EHR (Synthetic)', attached: true, newlyAdded: false, resourceType: 'Observation', resourceKey: 'obs-egfr' },
  { id: 'e5', type: 'Observation', label: 'Serum Creatinine', date: '2026-02-28', value: '1.6 mg/dL', source: 'Demo EHR (Synthetic)', attached: true, newlyAdded: false, resourceType: 'Observation', resourceKey: 'obs-creatinine' },
  { id: 'e6', type: 'Medication', label: 'Lisinopril 20mg', date: '2025-12-01', value: 'Once daily', source: 'Demo EHR (Synthetic)', attached: true, newlyAdded: false, resourceType: 'MedicationRequest', resourceKey: 'med-lisinopril' },
  { id: 'e7', type: 'Document', label: 'PCP Referral Note', date: '2026-03-15', value: 'Patient with progressive CKD, declining eGFR trend...', source: 'Demo EHR (Synthetic)', attached: true, newlyAdded: false, resourceType: 'DocumentReference', resourceKey: 'doc-referral-note' },
];

const uacrEvidence = {
  id: 'e8', type: 'Observation', label: 'UACR', date: '2026-03-10', value: '285 mg/g (elevated)', source: 'Demo EHR (Synthetic)', attached: true, newlyAdded: true, resourceType: 'Observation', resourceKey: 'obs-uacr-recent',
};

const uacrReqMet: RequirementItem = { code: 'uacr_recent', label: 'UACR within 90 days', status: 'met', description: 'UACR observation present and within recency window', required: true, repairable: true };
const uacrReqUnmet: RequirementItem = { code: 'uacr_recent', label: 'UACR within 90 days', status: 'unmet', description: 'Not found in patient chart — order/retrieve manually', required: true, repairable: true };

const baseRequirements: RequirementItem[] = [
  { code: 'reason_present', label: 'Reason for Consult', status: 'met', description: 'Referral reason documented', required: true, repairable: false },
  { code: 'kidney_context_present', label: 'Kidney Disease Context', status: 'met', description: 'CKD staging and history present', required: true, repairable: false },
  { code: 'renal_labs_present', label: 'Recent Renal Labs', status: 'met', description: 'eGFR and creatinine within 90 days', required: true, repairable: false },
  { code: 'medications_present', label: 'Medication List', status: 'met', description: 'Current medications documented', required: true, repairable: false },
];

const passport = {
  id: 'replay-passport',
  title: 'Nephrology Consult Passport',
  patientSummary: '67F with CKD Stage 3, Type 2 Diabetes, Hypertension',
  destination: 'Nephrology Intake',
  reasonForReferral: 'Progressive CKD with declining eGFR trend, nephrologist evaluation requested for management optimization.',
  clinicalContext: 'Patient has CKD Stage 3 with eGFR 38 mL/min/1.73m², on ACE inhibitor therapy. Comorbid Type 2 Diabetes and Hypertension.',
  conditions: ['CKD Stage 3', 'Type 2 Diabetes', 'Hypertension'],
  medications: ['Lisinopril 20mg daily', 'Metformin 1000mg BID', 'Amlodipine 5mg daily'],
  keyFindings: ['eGFR 38 mL/min/1.73m²', 'Creatinine 1.6 mg/dL', 'UACR 285 mg/g'],
  attachedEvidenceIds: ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8'],
  status: 'submitted' as const,
  lastSubmittedAt: ts(2),
};

function makeEvents(scenario: 'accepted' | 'blocked') {
  const events = [
    { id: 'ev1', runId: 'replay', eventType: 'run.created', source: 'orchestrator', stage: 'init', payload: {}, createdAt: ts(10) },
    { id: 'ev2', runId: 'replay', eventType: 'context.bound', source: 'orchestrator', stage: 'init', payload: {}, createdAt: ts(9.5) },
    { id: 'ev3', runId: 'replay', eventType: 'snapshot.requested', source: 'chart-tool', stage: 'assembly', payload: {}, createdAt: ts(9) },
    { id: 'ev4', runId: 'replay', eventType: 'snapshot.received', source: 'chart-tool', stage: 'assembly', payload: {}, createdAt: ts(8.5) },
    { id: 'ev5', runId: 'replay', eventType: 'passport.created', source: 'passport-builder', stage: 'assembly', payload: {}, createdAt: ts(8) },
    { id: 'ev6', runId: 'replay', eventType: 'evidence.created', source: 'passport-builder', stage: 'assembly', payload: {}, createdAt: ts(7.5) },
    { id: 'ev7', runId: 'replay', eventType: 'intake.submitted', source: 'orchestrator', stage: 'submission', payload: {}, createdAt: ts(7) },
    { id: 'ev8', runId: 'replay', eventType: 'intake.input_required', source: 'intake-desk', stage: 'evaluation', payload: {}, createdAt: ts(6) },
    { id: 'ev9', runId: 'replay', eventType: 'repair.started', source: 'orchestrator', stage: 'repair', payload: {}, createdAt: ts(4) },
    { id: 'ev10', runId: 'replay', eventType: 'uacr.requested', source: 'chart-tool', stage: 'repair', payload: {}, createdAt: ts(3.5) },
  ];
  if (scenario === 'accepted') {
    events.push(
      { id: 'ev11', runId: 'replay', eventType: 'uacr.attached', source: 'chart-tool', stage: 'repair', payload: {}, createdAt: ts(3) },
      { id: 'ev12', runId: 'replay', eventType: 'intake.resubmitted', source: 'orchestrator', stage: 'resubmission', payload: {}, createdAt: ts(2.5) },
      { id: 'ev13', runId: 'replay', eventType: 'intake.accepted', source: 'intake-desk', stage: 'terminal', payload: {}, createdAt: ts(2) },
    );
  } else {
    events.push(
      { id: 'ev11', runId: 'replay', eventType: 'run.blocked', source: 'orchestrator', stage: 'terminal', payload: { reason: 'UACR not found in patient chart' }, createdAt: ts(3) },
    );
  }
  return events;
}

function makeTrace(scenario: 'accepted' | 'blocked'): SponsorTraceItem[] {
  const trace: SponsorTraceItem[] = [
    { id: 't1', kind: 'context', label: 'Patient context bound', description: 'Eleanor Vance (67F) · CKD3, T2DM, HTN', status: 'success' as TStatus, timestamp: ts(9.5), source: 'orchestrator' },
    { id: 't2', kind: 'mcp', label: 'Chart snapshot requested', description: 'MCP tool call: getPatientSnapshot(demo-001)', status: 'info' as TStatus, timestamp: ts(9), source: 'chart-tool-service' },
    { id: 't3', kind: 'fhir', label: 'FHIR resources loaded', description: '7 resources retrieved from patient chart', status: 'success' as TStatus, timestamp: ts(8.5), source: 'fhir-data-service' },
    { id: 't4', kind: 'a2a', label: 'A2A task submitted', description: 'Referral packet submitted to Nephrology Intake', status: 'info' as TStatus, timestamp: ts(7), source: 'intake-desk' },
    { id: 't5', kind: 'a2a', label: 'A2A response: input_required', description: 'Missing: UACR within 90 days', status: 'warning' as TStatus, timestamp: ts(6), source: 'intake-desk' },
    { id: 't6', kind: 'mcp', label: 'MCP tool call: get_latest_uacr', description: 'Searching patient chart for UACR observation within 90-day window', status: 'info' as TStatus, timestamp: ts(3.5), source: 'chart-tool-service' },
  ];
  if (scenario === 'accepted') {
    trace.push(
      { id: 't7', kind: 'fhir', label: 'FHIR Observation retrieved', description: 'UACR: 285 mg/g (2026-03-10)', status: 'success' as TStatus, timestamp: ts(3), source: 'fhir-data-service' },
      { id: 't8', kind: 'a2a', label: 'A2A response: accepted', description: 'All requirements satisfied. Referral accepted by Nephrology Intake.', status: 'success' as TStatus, timestamp: ts(2), source: 'intake-desk' },
    );
  } else {
    trace.push(
      { id: 't7', kind: 'mcp', label: 'UACR not found in chart', description: 'No qualifying UACR observation found in patient record', status: 'warning' as TStatus, timestamp: ts(3), source: 'chart-tool-service' },
    );
  }
  return trace;
}

export const REPLAY_ACCEPTED: RunStateModel = {
  runId: 'replay-accepted',
  state: 'accepted',
  stateReason: 'All requirements satisfied',
  patientContext: sharedPatientContext,
  destination: sharedDestination,
  passport: { ...passport, attachedEvidenceIds: ['e1','e2','e3','e4','e5','e6','e7','e8'] },
  evidence: [...baseEvidence, uacrEvidence],
  intakeDecision: {
    decision: 'accepted',
    taskState: 'completed',
    missingRequirements: [],
    satisfiedRequirements: [...baseRequirements.map(r => r.code), 'uacr_recent'],
    summary: 'All requirements satisfied. Referral accepted by Nephrology Intake.',
    agentLabel: 'Nephrology Intake Desk (A2A)',
    timestamp: ts(2),
  },
  requirements: [
    ...baseRequirements,
    { code: 'uacr_recent', label: 'UACR within 90 days', status: 'met', description: 'UACR observation present and within recency window', required: true, repairable: true },
  ],
  trace: makeTrace('accepted'),
  events: makeEvents('accepted'),
  canRepair: false,
  canReset: true,
  isTerminal: true,
  createdAt: ts(10),
  updatedAt: ts(2),
};

export const REPLAY_BLOCKED: RunStateModel = {
  runId: 'replay-blocked',
  state: 'blocked',
  stateReason: 'UACR not found in patient chart — manual follow-up required',
  patientContext: sharedPatientContext,
  destination: sharedDestination,
  passport: { ...passport, attachedEvidenceIds: ['e1','e2','e3','e4','e5','e6','e7'] },
  evidence: baseEvidence,
  intakeDecision: {
    decision: 'blocked',
    taskState: 'blocked',
    missingRequirements: [uacrReqUnmet],
    satisfiedRequirements: baseRequirements,
    summary: 'Required UACR evidence could not be retrieved. Manual follow-up needed.',
    agentLabel: 'Nephrology Intake Desk (A2A)',
    timestamp: ts(3),
  },
  requirements: [...baseRequirements, uacrReqUnmet],
  trace: makeTrace('blocked'),
  events: makeEvents('blocked'),
  canRepair: false,
  canReset: true,
  isTerminal: true,
  createdAt: ts(10),
  updatedAt: ts(3),
};
