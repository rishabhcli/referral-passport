import { useParams } from 'react-router-dom';
import { REPLAY_ACCEPTED, REPLAY_BLOCKED } from '@/data/replayScenarios';
import { Badge } from '@/components/ui/badge';
import { Shield, Info } from 'lucide-react';
import ReferralRunView from '@/components/ReferralRunView';

export default function ReplayRunPage() {
  const { scenario } = useParams<{ scenario: string }>();
  const runState = scenario === 'blocked' ? REPLAY_BLOCKED : REPLAY_ACCEPTED;

  return (
    <div className="min-h-screen bg-background">
      {/* Replay Banner */}
      <div className="bg-status-info-muted border-b border-status-info/20">
        <div className="mx-auto max-w-6xl px-4 py-2 flex items-center gap-2 text-sm text-status-info">
          <Info className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="font-medium">Replay Mode</span>
          <span className="text-status-info/70">— This is a pre-loaded {scenario === 'blocked' ? 'blocked' : 'accepted'} scenario for demonstration purposes.</span>
        </div>
      </div>

      {/* Header */}
      <header className="border-b bg-card">
        <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-2 text-primary font-semibold text-sm tracking-tight">
            <Shield className="h-4 w-4" />
            Consult Passport
          </div>
          <Badge variant="outline" className="text-xs">Replay</Badge>
        </div>
      </header>

      <main>
        <ReferralRunView runState={runState} isReplay />
      </main>
    </div>
  );
}
