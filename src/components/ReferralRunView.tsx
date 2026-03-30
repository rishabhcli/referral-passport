import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, XCircle, AlertTriangle, Clock, Shield, ChevronDown, FileText, Activity, Radio, Eye, Layers } from 'lucide-react';
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
    <div className="space-y-0.5">
      {STATE_STEPS.map((step, i) => {
        const isPast = i < currentIdx || currentState === 'accepted';
        const isCurrent = step.state === currentState;
        const isSkipped = (isBlocked || isFailed) && i > currentIdx;

        let dotClass = 'bg-border';
        let textClass = 'text-muted-foreground';
        let lineClass = 'bg-border';

        if (isPast) {
          dotClass = 'bg-status-success';
          textClass = 'text-foreground';
          lineClass = 'bg-status-success';
        }
        if (isCurrent && !isBlocked && !isFailed) {
          dotClass = 'bg-primary ring-4 ring-primary/15';
          textClass = 'text-foreground font-semibold';
        }
        if (isCurrent && currentState === 'input_required') {
          dotClass = 'bg-status-warning ring-4 ring-status-warning/15';
        }
        if (isCurrent && currentState === 'accepted') {
          dotClass = 'bg-status-success ring-4 ring-status-success/15';
        }
        if (isSkipped) {
          dotClass = 'bg-muted';
          textClass = 'text-muted-foreground/40';
        }

        return (
          <div key={step.state} className="flex items-start gap-3 relative">
            <div className="flex flex-col items-center">
              <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 transition-all ${dotClass}`} />
              {i < STATE_STEPS.length - 1 && (
                <div className={`w-px h-5 mt-0.5 transition-colors ${isPast ? lineClass : 'bg-border'}`} />
              )}
            </div>
            <span className={`text-xs leading-tight -mt-0.5 ${textClass}`}>{step.label}</span>
          </div>
        );
      })}
      {isBlocked && (
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-status-danger ring-4 ring-status-danger/15 flex-shrink-0" />
          <span className="text-xs text-status-danger font-semibold">Blocked</span>
        </div>
      )}
      {isFailed && (
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-status-danger ring-4 ring-status-danger/15 flex-shrink-0" />
          <span className="text-xs text-status-danger font-semibold">Failed</span>
        </div>
      )}
    </div>
  );
}

// === Passport Card ===
function PassportCard({ passport }: { passport: RunStateModel['passport'] }) {
  if (!passport) return null;
  return (
    <div className="card-elevated overflow-hidden">
      <div className="px-5 py-3 border-b bg-muted/20 flex items-center gap-2">
        <FileText className="h-3.5 w-3.5 text-primary" />
        <span className="text-sm font-semibold">Referral Passport</span>
      </div>
      <div className="p-5 space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="mono-label mb-1">Destination</p>
            <p className="font-medium">{passport.destination}</p>
          </div>
          <div>
            <p className="mono-label mb-1">Status</p>
            <span className="status-chip bg-primary/10 text-primary text-[11px]">{passport.status}</span>
          </div>
        </div>
        <div>
          <p className="mono-label mb-1">Reason for Referral</p>
          <p className="text-foreground leading-relaxed">{passport.reasonForReferral}</p>
        </div>
        <div>
          <p className="mono-label mb-1">Clinical Context</p>
          <p className="text-muted-foreground leading-relaxed">{passport.clinicalContext}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {passport.conditions.map((c, i) => (
            <span key={i} className="status-chip bg-secondary text-secondary-foreground text-[11px]">{c}</span>
          ))}
        </div>
        <div className="border-t pt-3">
          <p className="mono-label mb-1.5">Key Medications</p>
          <div className="flex flex-wrap gap-1.5">
            {passport.medications.map((m, i) => (
              <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded-md text-muted-foreground">{m}</span>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
          <span className="flex items-center gap-1.5">
            <Layers className="h-3 w-3" />
            {passport.attachedEvidenceIds.length} evidence items
          </span>
          {passport.lastSubmittedAt && (
            <span>Submitted {new Date(passport.lastSubmittedAt).toLocaleTimeString()}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// === Requirement Checklist ===
function RequirementChecklist({ requirements }: { requirements: RequirementItem[] }) {
  const metCount = requirements.filter(r => r.status === 'met').length;
  return (
    <div className="card-clinical overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/20 flex items-center justify-between">
        <span className="text-sm font-semibold">Requirement Checklist</span>
        <span className="text-[11px] font-mono text-muted-foreground">{metCount}/{requirements.length}</span>
      </div>
      <div className="p-4 space-y-2.5">
        {requirements.map(req => (
          <div key={req.code} className={`flex items-start gap-2.5 p-2.5 rounded-lg transition-colors ${
            req.status === 'unmet' ? 'bg-status-danger-muted/50' : 'bg-transparent'
          }`}>
            {req.status === 'met' ? (
              <CheckCircle2 className="h-4 w-4 text-status-success flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-4 w-4 text-status-danger flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className={`text-sm ${req.status === 'unmet' ? 'font-semibold text-status-danger' : 'text-foreground font-medium'}`}>
                {req.label}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{req.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// === Evidence Table ===
function EvidenceTable({ evidence }: { evidence: EvidenceItem[] }) {
  return (
    <div className="card-elevated overflow-hidden">
      <div className="px-5 py-3 border-b bg-muted/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="h-3.5 w-3.5 text-primary" />
          <span className="text-sm font-semibold">Evidence Table</span>
        </div>
        <span className="text-[11px] font-mono text-muted-foreground">{evidence.length} items</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/10">
              <th className="px-5 py-2.5 text-left mono-label">Evidence</th>
              <th className="px-3 py-2.5 text-left mono-label">Type</th>
              <th className="px-3 py-2.5 text-left mono-label">Date</th>
              <th className="px-3 py-2.5 text-left mono-label">Value</th>
              <th className="px-3 py-2.5 text-left mono-label">Source</th>
            </tr>
          </thead>
          <tbody>
            {evidence.map(e => (
              <tr key={e.id} className={`border-b last:border-0 transition-colors hover:bg-muted/30 ${e.newlyAdded ? 'animate-highlight-row' : ''}`}>
                <td className="px-5 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className={e.newlyAdded ? 'font-semibold text-status-success' : 'font-medium'}>{e.label}</span>
                    {e.newlyAdded && (
                      <span className="inline-flex items-center gap-1 bg-status-success-muted text-status-success text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                        <span className="h-1 w-1 rounded-full bg-status-success" />
                        New
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <span className="text-[11px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{e.type}</span>
                </td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">{e.date}</td>
                <td className="px-3 py-2.5 text-xs max-w-[200px] truncate">{e.value}</td>
                <td className="px-3 py-2.5 text-[11px] text-muted-foreground">{e.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// === Intake Decision Card ===
function IntakeDecisionCard({ decision }: { decision: RunStateModel['intakeDecision'] }) {
  if (!decision) return null;
  const isAccepted = decision.decision === 'accepted';
  const isInputRequired = decision.decision === 'input_required';

  const borderColor = isAccepted ? 'border-status-success/40' : isInputRequired ? 'border-status-warning/40' : 'border-status-danger/40';
  const bgColor = isAccepted ? 'bg-status-success-muted/30' : isInputRequired ? 'bg-status-warning-muted/30' : 'bg-status-danger-muted/30';

  return (
    <div className={`card-clinical overflow-hidden ${borderColor}`}>
      <div className={`px-4 py-3 border-b flex items-center justify-between ${bgColor}`}>
        <span className="text-sm font-semibold">Intake Decision</span>
        <span className={`status-chip ${isAccepted ? 'bg-status-success-muted text-status-success' : isInputRequired ? 'bg-status-warning-muted text-status-warning' : 'bg-status-danger-muted text-status-danger'}`}>
          {isAccepted && <CheckCircle2 className="h-3 w-3" />}
          {isInputRequired && <AlertTriangle className="h-3 w-3" />}
          {decision.decision === 'blocked' && <XCircle className="h-3 w-3" />}
          {decision.decision.replace(/_/g, ' ')}
        </span>
      </div>
      <div className="p-4 space-y-2">
        <p className="text-sm leading-relaxed">{decision.summary}</p>
        <p className="text-[11px] text-muted-foreground font-mono">
          {decision.agentLabel} · {new Date(decision.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}

// === Sponsor Trace Rail ===
function SponsorTraceRail({ trace }: { trace: SponsorTraceItem[] }) {
  const statusIcon = (s: string) => {
    if (s === 'success') return <CheckCircle2 className="h-3.5 w-3.5 text-status-success" />;
    if (s === 'warning') return <AlertTriangle className="h-3.5 w-3.5 text-status-warning" />;
    if (s === 'error') return <XCircle className="h-3.5 w-3.5 text-status-danger" />;
    return <Radio className="h-3.5 w-3.5 text-status-info" />;
  };

  const kindColors: Record<string, string> = {
    context: 'bg-status-info/10 text-status-info border-status-info/20',
    fhir: 'bg-status-success/10 text-status-success border-status-success/20',
    a2a: 'bg-status-warning/10 text-status-warning border-status-warning/20',
    mcp: 'bg-primary/10 text-primary border-primary/20',
    system: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <div className="card-clinical overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/20 flex items-center gap-2">
        <Radio className="h-3.5 w-3.5 text-primary" />
        <span className="text-sm font-semibold">Submission Trace</span>
        <span className="text-[11px] font-mono text-muted-foreground ml-auto">{trace.length} events</span>
      </div>
      <div className="p-4 space-y-0">
        {trace.map((t, i) => (
          <div key={t.id} className="trace-line flex items-start gap-2.5 pb-3">
            <div className="mt-0.5 flex-shrink-0 z-10 bg-card">{statusIcon(t.status)}</div>
            <div className="flex-1 min-w-0 space-y-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`inline-flex items-center border rounded-md text-[10px] font-mono font-semibold uppercase tracking-wider px-1.5 py-0 ${kindColors[t.kind] ?? kindColors.system}`}>
                  {t.kind}
                </span>
                <span className="text-xs font-medium">{t.label}</span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">{t.description}</p>
            </div>
            <span className="text-muted-foreground text-[10px] font-mono flex-shrink-0 mt-0.5">
              {new Date(t.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>
    </div>
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
    if (type === 'check') return <CheckCircle2 className="h-3.5 w-3.5 text-status-success" />;
    if (type === 'alert') return <AlertTriangle className="h-3.5 w-3.5 text-status-warning" />;
    if (type === 'x') return <XCircle className="h-3.5 w-3.5 text-status-danger" />;
    return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  return (
    <div className="card-clinical overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/20 flex items-center gap-2">
        <Activity className="h-3.5 w-3.5 text-primary" />
        <span className="text-sm font-semibold">Activity Timeline</span>
        <span className="text-[11px] font-mono text-muted-foreground ml-auto">{events.length}</span>
      </div>
      <div className="p-4">
        <div className="relative space-y-0">
          {events.map((ev, i) => {
            const meta = EVENT_META[ev.eventType] ?? { label: ev.eventType.replace(/[._]/g, ' '), icon: 'clock' as const };
            const isLast = i === events.length - 1;
            return (
              <div key={ev.id} className="flex gap-3 relative">
                {!isLast && (
                  <div className="absolute left-[7px] top-[16px] w-px h-[calc(100%-2px)] bg-border" />
                )}
                <div className="mt-0.5 flex-shrink-0 z-10 bg-card">{iconEl(meta.icon)}</div>
                <div className="pb-3 min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-xs font-medium leading-tight">{meta.label}</p>
                    <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">
                      {ev.createdAt ? new Date(ev.createdAt).toLocaleTimeString() : ''}
                    </span>
                  </div>
                  {ev.source && (
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{ev.source}</p>
                  )}
                </div>
              </div>
            );
          })}
          {events.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">No events yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// === Outcome Stamp ===
function OutcomeStamp({ state }: { state: RunState }) {
  if (state === 'accepted') {
    return (
      <div className="animate-stamp-in flex flex-col items-center gap-3 py-6">
        <div className="relative">
          <div className="h-20 w-20 rounded-full bg-status-success/10 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-status-success" />
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-status-success/20 animate-pulse-ring" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-xl font-bold text-status-success">Accepted by Nephrology Intake</p>
          <p className="text-sm text-muted-foreground">Referral packet meets all requirements</p>
        </div>
      </div>
    );
  }
  if (state === 'blocked') {
    return (
      <div className="animate-fade-in-up flex flex-col items-center gap-3 py-6">
        <div className="h-20 w-20 rounded-full bg-status-danger/10 flex items-center justify-center">
          <XCircle className="h-10 w-10 text-status-danger" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-xl font-bold text-status-danger">Blocked — Manual Follow-up Required</p>
          <p className="text-sm text-muted-foreground">Required evidence could not be retrieved automatically</p>
        </div>
      </div>
    );
  }
  return null;
}

// === Debug Drawer (tabbed) ===
function DebugDrawer({ runState }: { runState: RunStateModel }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t mt-8">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs text-muted-foreground py-3 hover:text-foreground transition-colors group"
      >
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
        <span className="font-mono uppercase tracking-wider text-[10px]">Debug Inspector</span>
        <span className="text-[10px] text-muted-foreground/60 ml-1">
          {runState.events.length} events · {runState.trace.length} trace items · {runState.evidence.length} evidence
        </span>
      </button>
      {open && (
        <div className="pb-6 animate-slide-up-fade">
          <Tabs defaultValue="state" className="w-full">
            <TabsList className="bg-muted/50 h-8">
              <TabsTrigger value="state" className="text-xs h-7">Run State</TabsTrigger>
              <TabsTrigger value="artifacts" className="text-xs h-7">Artifacts</TabsTrigger>
              <TabsTrigger value="events" className="text-xs h-7">Raw Events</TabsTrigger>
            </TabsList>
            <TabsContent value="state">
              <pre className="text-xs font-mono bg-muted/50 p-4 rounded-xl overflow-auto max-h-96 border">
                {JSON.stringify({
                  runId: runState.runId,
                  state: runState.state,
                  stateReason: runState.stateReason,
                  isTerminal: runState.isTerminal,
                  canRepair: runState.canRepair,
                  canReset: runState.canReset,
                  createdAt: runState.createdAt,
                  updatedAt: runState.updatedAt,
                }, null, 2)}
              </pre>
            </TabsContent>
            <TabsContent value="artifacts">
              <pre className="text-xs font-mono bg-muted/50 p-4 rounded-xl overflow-auto max-h-96 border">
                {JSON.stringify({
                  passport: runState.passport,
                  requirements: runState.requirements,
                  intakeDecision: runState.intakeDecision,
                }, null, 2)}
              </pre>
            </TabsContent>
            <TabsContent value="events">
              <pre className="text-xs font-mono bg-muted/50 p-4 rounded-xl overflow-auto max-h-96 border">
                {JSON.stringify(runState.events, null, 2)}
              </pre>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}

// === Main View Component ===
interface ReferralRunViewProps {
  runState: RunStateModel;
  isReplay?: boolean;
  actions?: React.ReactNode;
  errorBanner?: React.ReactNode;
}

export default function ReferralRunView({ runState, isReplay, actions, errorBanner }: ReferralRunViewProps) {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg brand-gradient-bg flex items-center justify-center shadow-sm">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-base font-bold tracking-tight">Consult Passport</h1>
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
            <p className="text-sm text-muted-foreground">
              {runState.patientContext.displayName} · {runState.patientContext.age}{runState.patientContext.sex[0]} · {runState.destination?.displayName}
            </p>
          )}
        </div>
        {!isReplay && actions}
      </div>

      {/* Terminal stamp */}
      {runState.isTerminal && <OutcomeStamp state={runState.state} />}

      {/* Error banner */}
      {errorBanner}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Status Rail */}
        <div className="lg:col-span-2">
          <div className="card-clinical p-4 space-y-3">
            <p className="mono-label">Status</p>
            <StatusRail currentState={runState.state} />
          </div>
        </div>

        {/* Center: Passport + Evidence */}
        <div className="lg:col-span-6 space-y-5">
          <PassportCard passport={runState.passport} />
          <EvidenceTable evidence={runState.evidence} />
        </div>

        {/* Right: Requirements + Decision + Trace + Timeline */}
        <div className="lg:col-span-4 space-y-5">
          {runState.requirements.length > 0 && <RequirementChecklist requirements={runState.requirements} />}
          <IntakeDecisionCard decision={runState.intakeDecision} />
          {runState.trace.length > 0 && <SponsorTraceRail trace={runState.trace} />}
          {runState.events.length > 0 && <ActivityTimeline events={runState.events} />}
        </div>
      </div>

      {!isReplay && <DebugDrawer runState={runState} />}
    </div>
  );
}
