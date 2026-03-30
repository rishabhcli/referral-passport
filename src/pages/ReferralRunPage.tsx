import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/AuthProvider';
import { runOrchestratorService } from '@/services/runOrchestratorService';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import ReferralRunView from '@/components/ReferralRunView';

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

  const actions = (
    <div className="flex gap-2">
      {runState.canRepair && (
        <Button onClick={() => repairMutation.mutate()} disabled={repairMutation.isPending} className="gap-1.5" data-testid="repair-run">
          {repairMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
          Fetch Missing Evidence
        </Button>
      )}
      {runState.canReset && (
        <Button variant="outline" onClick={() => resetMutation.mutate()} disabled={resetMutation.isPending} className="gap-1.5" data-testid="reset-run">
          <RefreshCw className="h-3.5 w-3.5" /> New Run
        </Button>
      )}
    </div>
  );

  const errorBanner = repairMutation.isError ? (
    <div className="bg-status-danger-muted text-status-danger text-sm p-3 rounded-md">
      Repair failed: {(repairMutation.error as Error).message}. You can retry.
    </div>
  ) : null;

  return <ReferralRunView runState={runState} actions={actions} errorBanner={errorBanner} />;
}
