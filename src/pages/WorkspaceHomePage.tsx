import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { runOrchestratorService } from '@/services/runOrchestratorService';
import { patientContextService } from '@/services/patientContextService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
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

  const { data: patient } = useQuery({
    queryKey: ['defaultPatient'],
    queryFn: () => patientContextService.getDefaultPatient(),
  });

  const { data: recentRuns } = useQuery({
    queryKey: ['recentRuns', profile?.id],
    queryFn: () => runOrchestratorService.listRecentRuns(profile!.id),
    enabled: !!profile,
  });

  const conditions = patient ? (patient.primary_conditions as unknown as Array<{ display: string }>) ?? [] : [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Referral Acceptance Workspace</h1>
        <p className="text-sm text-muted-foreground">Welcome back, {profile?.fullName ?? 'Coordinator'}</p>
      </div>

      {patient && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Demo Patient</CardTitle>
              <Badge variant="outline" className="text-xs">Synthetic</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{patient.display_name}</p>
                <p className="text-sm text-muted-foreground">
                  {(patient.summary as any)?.age ?? '67'}
                  {patient.sex?.[0]} · MRN: {patient.mrn}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {conditions.map((c, i) => (
                    <span key={i} className="status-chip bg-secondary text-secondary-foreground">{c.display}</span>
                  ))}
                </div>
              </div>
              <Button onClick={() => navigate(`/app/referrals/new?patient=${patient.id}`)} className="gap-1.5">
                Start Consult Passport <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-sm font-medium text-foreground mb-3">Recent Referral Runs</h2>
        {(!recentRuns || recentRuns.length === 0) ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No referral runs yet. Start your first Consult Passport above.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentRuns.map(run => {
              const cfg = stateConfig[run.state] ?? { icon: <Clock className="h-3 w-3" />, className: 'bg-secondary text-secondary-foreground' };
              return (
                <Card key={run.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate(`/app/runs/${run.id}`)}>
                  <CardContent className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{run.patientName}</p>
                      <p className="text-xs text-muted-foreground">{run.destination} · {new Date(run.createdAt).toLocaleString()}</p>
                    </div>
                    <span className={`status-chip ${cfg.className} gap-1`}>
                      {cfg.icon} {run.state.replace(/_/g, ' ')}
                    </span>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
