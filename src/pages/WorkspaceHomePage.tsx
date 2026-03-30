import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { runOrchestratorService } from '@/services/runOrchestratorService';
import { patientContextService } from '@/services/patientContextService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Clock, CheckCircle2, XCircle, AlertTriangle, Shield, Activity, User } from 'lucide-react';
import CreatePatientDialog from '@/components/CreatePatientDialog';
import type { RunState } from '@/types/domain';

const stateConfig: Record<string, { icon: React.ReactNode; className: string }> = {
  accepted: { icon: <CheckCircle2 className="h-3 w-3" />, className: 'bg-status-success-muted text-status-success' },
  blocked: { icon: <XCircle className="h-3 w-3" />, className: 'bg-status-danger-muted text-status-danger' },
  input_required: { icon: <AlertTriangle className="h-3 w-3" />, className: 'bg-status-warning-muted text-status-warning' },
  failed: { icon: <XCircle className="h-3 w-3" />, className: 'bg-status-danger-muted text-status-danger' },
};

export default function WorkspaceHomePage() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const { data: patients } = useQuery({
    queryKey: ['patients'],
    queryFn: () => patientContextService.listPatients(),
  });

  const { data: recentRuns } = useQuery({
    queryKey: ['recentRuns', profile?.id],
    queryFn: () => runOrchestratorService.listRecentRuns(profile!.id),
    enabled: !!profile,
  });

  const acceptedCount = recentRuns?.filter(r => r.state === 'accepted').length ?? 0;
  const blockedCount = recentRuns?.filter(r => r.state === 'blocked').length ?? 0;
  const activeCount = recentRuns?.filter(r => !['accepted', 'blocked', 'failed'].includes(r.state)).length ?? 0;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-8">
      {/* Welcome */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-foreground">Referral Acceptance Workspace</h1>
        <p className="text-sm text-muted-foreground">Welcome back, {profile?.fullName ?? 'Coordinator'}</p>
      </div>

      {/* Metrics strip */}
      {recentRuns && recentRuns.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Accepted', value: acceptedCount, icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-status-success', bg: 'bg-status-success-muted' },
            { label: 'Blocked', value: blockedCount, icon: <XCircle className="h-4 w-4" />, color: 'text-status-danger', bg: 'bg-status-danger-muted' },
            { label: 'In Progress', value: activeCount, icon: <Activity className="h-4 w-4" />, color: 'text-status-info', bg: 'bg-status-info-muted' },
          ].map(m => (
            <div key={m.label} className="card-clinical p-4 flex items-center gap-3">
              <div className={`h-9 w-9 rounded-lg ${m.bg} flex items-center justify-center ${m.color}`}>
                {m.icon}
              </div>
              <div>
                <p className="text-xl font-bold animate-count-up">{m.value}</p>
                <p className="text-[11px] text-muted-foreground font-medium">{m.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Patients */}
      {patients && patients.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-foreground">Patients</h2>
              <span className="text-[11px] text-muted-foreground">{patients.length} total</span>
            </div>
            <CreatePatientDialog />
          </div>
          <div className="space-y-2">
            {patients.map(patient => {
              const conditions = (patient.primary_conditions as unknown as Array<{ display: string }>) ?? [];
              const summary = patient.summary as Record<string, unknown> | null;
              return (
                <div key={patient.id} className="card-elevated p-0 overflow-hidden" data-testid={`patient-card-${patient.id}`}>
                  <div className="px-5 py-3 border-b bg-muted/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">
                        {patient.is_synthetic ? 'Synthetic' : 'Patient'}
                      </span>
                    </div>
                    {patient.is_synthetic && (
                      <Badge variant="outline" className="text-[10px] font-mono uppercase tracking-wider">Demo</Badge>
                    )}
                  </div>
                  <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div>
                        <p
                          className="text-base font-semibold text-foreground cursor-pointer hover:text-primary transition-colors"
                          onClick={() => navigate(`/app/patients/${patient.id}`)}
                          data-testid={`patient-link-${patient.id}`}
                        >
                          {patient.display_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {(summary as any)?.age ?? ''}{patient.sex?.[0] ?? ''}{patient.mrn ? ` · MRN: ${patient.mrn}` : ''}
                        </p>
                      </div>
                      {conditions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {conditions.slice(0, 4).map((c, i) => (
                            <span key={i} className="status-chip bg-secondary text-secondary-foreground text-[11px]">{c.display}</span>
                          ))}
                          {conditions.length > 4 && (
                            <span className="status-chip bg-secondary text-secondary-foreground text-[11px]">+{conditions.length - 4}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={() => navigate(`/app/referrals/new?patient=${patient.id}`)}
                      className="gap-2 brand-gradient-bg border-0 text-white hover:opacity-90 rounded-xl h-11 px-6 shadow-card shrink-0"
                    >
                      Start Consult Passport <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Runs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Recent Referral Runs</h2>
          {recentRuns && recentRuns.length > 0 && (
            <span className="text-[11px] text-muted-foreground">{recentRuns.length} total</span>
          )}
        </div>
        {(!recentRuns || recentRuns.length === 0) ? (
          <div className="card-clinical p-8 text-center">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No referral runs yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Start your first Consult Passport above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentRuns.map(run => {
              const cfg = stateConfig[run.state] ?? { icon: <Clock className="h-3 w-3" />, className: 'bg-secondary text-secondary-foreground' };
              return (
                <div
                  key={run.id}
                  className="card-clinical p-4 flex items-center justify-between cursor-pointer group"
                  onClick={() => navigate(`/app/runs/${run.id}`)}
                  data-testid={`run-card-${run.id}`}
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium group-hover:text-primary transition-colors">{run.patientName}</p>
                    <p className="text-xs text-muted-foreground">{run.destination} · {new Date(run.createdAt).toLocaleString()}</p>
                  </div>
                  <span className={`status-chip ${cfg.className} gap-1`}>
                    {cfg.icon} {run.state.replace(/_/g, ' ')}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
