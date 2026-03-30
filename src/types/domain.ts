// ===== Run States =====
export const RUN_STATES = [
  'idle', 'assembling', 'submitted', 'input_required',
  'repairing', 'resubmitting', 'accepted', 'blocked', 'failed'
] as const;

export type RunState = typeof RUN_STATES[number];

export const TERMINAL_STATES: RunState[] = ['accepted', 'blocked', 'failed'];
export const ACTIVE_STATES: RunState[] = ['idle', 'assembling', 'submitted', 'input_required', 'repairing', 'resubmitting'];

export const VALID_TRANSITIONS: Record<RunState, RunState[]> = {
  idle: ['assembling', 'failed'],
  assembling: ['submitted', 'failed'],
  submitted: ['input_required', 'failed'],
  input_required: ['repairing', 'failed'],
  repairing: ['resubmitting', 'failed'],
  resubmitting: ['accepted', 'blocked', 'failed'],
  accepted: [],
  blocked: [],
  failed: [],
};

export function isValidTransition(from: RunState, to: RunState): boolean {
  if (to === 'failed' && !TERMINAL_STATES.includes(from)) return true;
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ===== Patient Context =====
export interface PatientContext {
  patientId: string;
  displayName: string;
  age: number;
  sex: string;
  conditionTags: string[];
  fhirContext: {
    fhirUrl: string;
    patientId: string;
    tokenPresent: boolean;
    sourceLabel: string;
  };
}

// ===== Referral Passport =====
export interface ReferralPassport {
  id: string;
  title: string;
  patientSummary: string;
  destination: string;
  reasonForReferral: string;
  clinicalContext: string;
  conditions: string[];
  medications: string[];
  keyFindings: string[];
  attachedEvidenceIds: string[];
  status: 'draft' | 'submitted' | 'accepted' | 'blocked';
  lastSubmittedAt: string | null;
}

// ===== Evidence =====
export interface EvidenceItem {
  id: string;
  type: string;
  label: string;
  date: string;
  value: string;
  source: string;
  attached: boolean;
  newlyAdded: boolean;
  resourceType: string;
  resourceKey: string;
}

// ===== Intake Decision =====
export type IntakeDecisionType = 'input_required' | 'accepted' | 'blocked';

export interface IntakeDecision {
  decision: IntakeDecisionType;
  taskState: string;
  missingRequirements: RequirementItem[];
  satisfiedRequirements: RequirementItem[];
  summary: string;
  agentLabel: string;
  timestamp: string;
}

// ===== Requirement =====
export type RequirementStatus = 'met' | 'unmet' | 'pending';

export interface RequirementItem {
  code: string;
  label: string;
  status: RequirementStatus;
  description: string;
  required: boolean;
  repairable: boolean;
}

// ===== Sponsor Trace =====
export type TraceKind = 'context' | 'fhir' | 'a2a' | 'mcp' | 'system';

export interface SponsorTraceItem {
  id: string;
  kind: TraceKind;
  label: string;
  description: string;
  status: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  source: string;
}

// ===== Run Event =====
export interface RunEvent {
  id: string;
  runId: string;
  eventType: string;
  source: string;
  stage: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

// ===== Run State (composite read model) =====
export interface RunStateModel {
  runId: string;
  state: RunState;
  stateReason: string | null;
  patientContext: PatientContext | null;
  destination: DestinationInfo | null;
  passport: ReferralPassport | null;
  evidence: EvidenceItem[];
  intakeDecision: IntakeDecision | null;
  requirements: RequirementItem[];
  trace: SponsorTraceItem[];
  events: RunEvent[];
  canRepair: boolean;
  canReset: boolean;
  isTerminal: boolean;
  createdAt: string;
  updatedAt: string;
}

// ===== Destination =====
export interface DestinationInfo {
  id: string;
  slug: string;
  displayName: string;
  specialty: string;
  agentLabel: string;
  isActive: boolean;
}

// ===== User Profile =====
export type UserRole = 'admin' | 'coordinator' | 'clinician' | 'demo';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  organizationName: string;
  createdAt: string;
}

// ===== DB Row types =====
export interface PatientRow {
  id: string;
  external_patient_key: string;
  display_name: string;
  mrn: string;
  birth_date: string;
  sex: string;
  is_synthetic: boolean;
  primary_conditions: Record<string, unknown>;
  summary: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ReferralRunRow {
  id: string;
  created_by: string;
  patient_id: string;
  destination_id: string;
  scenario_id: string | null;
  state: RunState;
  state_reason: string | null;
  current_requirement_code: string | null;
  accepted_at: string | null;
  blocked_at: string | null;
  repair_attempted: boolean;
  entry_surface: string;
  context_snapshot: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface FhirResourceRow {
  id: string;
  patient_id: string;
  resource_type: string;
  resource_key: string;
  resource_json: Record<string, unknown>;
  effective_at: string;
  created_at: string;
}

export interface RunSummary {
  id: string;
  state: RunState;
  patientName: string;
  destination: string;
  createdAt: string;
}
