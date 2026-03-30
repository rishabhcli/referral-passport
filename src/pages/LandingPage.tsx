import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Shield, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">Loading...</div>;
  }

  if (session) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="max-w-md text-center space-y-6">
        <div className="inline-flex items-center gap-2 text-primary">
          <Shield className="h-8 w-8" />
          <span className="text-2xl font-semibold tracking-tight">Consult Passport</span>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Build nephrology referrals the intake desk will actually accept.
          Submit, get feedback, repair missing evidence, and get accepted — all in one flow.
        </p>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span className="px-2 py-1 rounded bg-secondary">Submit</span>
          <ArrowRight className="h-3 w-3" />
          <span className="px-2 py-1 rounded bg-status-warning-muted text-status-warning">Input Required</span>
          <ArrowRight className="h-3 w-3" />
          <span className="px-2 py-1 rounded bg-secondary">Fetch Evidence</span>
          <ArrowRight className="h-3 w-3" />
          <span className="px-2 py-1 rounded bg-status-success-muted text-status-success">Accepted</span>
        </div>

        <Button onClick={() => navigate('/auth')} className="gap-1.5">
          Get Started <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
