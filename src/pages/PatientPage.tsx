import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { patientContextService } from '@/services/patientContextService';
import { chartToolService } from '@/services/chartToolService';
import { runOrchestratorService } from '@/services/runOrchestratorService';
import { useAuth } from '@/features/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowRight, Shield, User, Calendar, Activity, Clock, CheckCircle2, XCircle } from 'lucide-react';

const stateStyles: Record<string, string> = {
  accepted: 'bg-status-success-muted text-status-success',
  blocked: 'bg-status-danger-muted text-status-danger',
  input_required: 'bg-status-warning-muted text-status-warning',
  failed: 'bg-status-danger-muted text-status-danger',
};

export default function PatientPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const { data: patient, isLoading: loadingPatient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => patientContextService.getPatient(patientId!),
    enabled: !!patientId,
  });

  const { data: snapshot, isLoading: loadingEvidence } = useQuery({
    queryKey: ['patientEvidence', patientId],
    queryFn: async () => {
      const { evidence } = await chartToolService.getPatientSnapshot(patientId!);
      return evidence;
    },
    enabled: !!patientId,
  });

  const { data: recentRuns } = useQuery({
    queryKey: ['patientRuns', patientId, profile?.id],
    queryFn: async () => {
      const runs = await runOrchestratorService.listRecentRuns(profile!.id);
      return runs.filter(r => r.patientId === patientId);
    },
    enabled: !!patientId && !!profile,
  });

  const conditions = patient
    ? ((patient.primary_conditions as unknown as Array<{ display: string }>) ?? [])
    : [];

  const summary = patient?.summary as Record<string, unknown> | null;
  const birthDate = patient?.birth_date ? new Date(patient.birth_date) : null;
  const age = birthDate
    ? Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  if (loadingPatient) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="card-clinical p-8 text-center">
          <p className="text-sm text-muted-foreground">Patient not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
      {/* Patient Summary */}
      <div className="card-elevated p-0 overflow-hidden">
        <div className="px-5 py-3 border-b bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-3 w-3 text-primary" />
            </div>
            <span className="mono-label">Patient Record</span>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono uppercase tracking-wider">Synthetic</Badge>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div>
            <h1 className="text-lg font-bold text-foreground">{patient.display_name}</h1>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground mt-1">
              {age !== null && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> {age}{patient.sex?.[0]} · DOB {birthDate!.toLocaleDateString()}
                </span>
              )}
              {patient.mrn && <span className="font-mono text-xs">MRN: {patient.mrn}</span>}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {conditions.map((c, i) => (
              <span key={i} className="status-chip bg-secondary text-secondary-foreground text-[11px]">{c.display}</span>
            ))}
          </div>

          {summary && (
            <p className="text-sm text-muted-foreground leading-relaxed border-t pt-4">
              {(summary as any).narrative ?? `${patient.display_name} is a ${age}-year-old patient with ${conditions.map(c => c.display).join(', ')}.`}
            </p>
          )}
        </div>
      </div>

      {/* Destination CTA */}
      <div className="card-clinical p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Nephrology Intake</p>
            <p className="text-xs text-muted-foreground">Build & submit a referral passport</p>
          </div>
        </div>
        <Button
          onClick={() => navigate(`/app/referrals/new?patient=${patient.id}`)}
          className="gap-2 brand-gradient-bg border-0 text-white hover:opacity-90 rounded-xl h-10 px-5 shadow-card shrink-0"
        >
          Start Consult Passport <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Evidence Table */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-3.5 w-3.5 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Recent Evidence</h2>
        </div>
        {loadingEvidence ? (
          <div className="card-clinical p-6"><Skeleton className="h-24 w-full" /></div>
        ) : !snapshot || snapshot.length === 0 ? (
          <div className="card-clinical p-8 text-center text-sm text-muted-foreground">No evidence records found.</div>
        ) : (
          <div className="card-clinical overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-[10px] uppercase tracking-wider font-semibold">Evidence</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-semibold">Type</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-semibold">Date</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-semibold">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.slice(0, 8).map(ev => (
                  <TableRow key={ev.id}>
                    <TableCell className="text-sm font-medium">{ev.label}</TableCell>
                    <TableCell>
                      <span className="status-chip bg-secondary text-secondary-foreground text-[10px]">{ev.type}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{ev.date}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{ev.value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Recent Runs */}
      {recentRuns && recentRuns.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Recent Runs</h2>
            <span className="text-[11px] text-muted-foreground">{recentRuns.length} total</span>
          </div>
          <div className="space-y-2">
            {recentRuns.map(run => {
              const style = stateStyles[run.state] ?? 'bg-secondary text-secondary-foreground';
              const StateIcon = run.state === 'accepted' ? CheckCircle2
                : run.state === 'blocked' || run.state === 'failed' ? XCircle
                : Clock;
              return (
                <div
                  key={run.id}
                  className="card-clinical p-4 flex items-center justify-between cursor-pointer group"
                  onClick={() => navigate(`/app/runs/${run.id}`)}
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium group-hover:text-primary transition-colors">{run.destination}</p>
                    <p className="text-xs text-muted-foreground font-mono">{new Date(run.createdAt).toLocaleString()}</p>
                  </div>
                  <span className={`status-chip ${style} gap-1`}>
                    <StateIcon className="h-3 w-3" /> {run.state.replace(/_/g, ' ')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
