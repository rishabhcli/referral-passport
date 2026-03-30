import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { ArrowRight, Shield, CheckCircle2, AlertTriangle, Search, Zap } from 'lucide-react';

export default function LandingPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (session) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Minimal top bar */}
      <header className="border-b bg-card/60 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg brand-gradient-bg flex items-center justify-center">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-foreground tracking-tight">Consult Passport</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/auth')} className="text-muted-foreground">
            Sign in
          </Button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-2xl space-y-10 text-center">
          <div className="space-y-4 animate-fade-in-up">
            <p className="mono-label">Referral Acceptance Engine</p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight">
              Build referrals the intake desk
              <br />
              <span className="brand-gradient-text">will actually accept.</span>
            </h1>
            <p className="text-muted-foreground text-base max-w-lg mx-auto leading-relaxed">
              Submit a nephrology referral, get immediate feedback on missing evidence,
              repair the packet from the chart, and get accepted — all in one deterministic flow.
            </p>
          </div>

          {/* Flow diagram */}
          <div className="animate-slide-up-fade" style={{ animationDelay: '0.15s', animationFillMode: 'backwards' }}>
            <div className="inline-flex items-center gap-2 sm:gap-3 bg-card rounded-2xl border px-5 py-4 shadow-card">
              {[
                { icon: <Zap className="h-3.5 w-3.5" />, label: 'Submit', color: 'bg-primary/10 text-primary' },
                { icon: <AlertTriangle className="h-3.5 w-3.5" />, label: 'Input Required', color: 'bg-status-warning-muted text-status-warning' },
                { icon: <Search className="h-3.5 w-3.5" />, label: 'Fetch Evidence', color: 'bg-status-info-muted text-status-info' },
                { icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: 'Accepted', color: 'bg-status-success-muted text-status-success' },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-2 sm:gap-3">
                  <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${step.color}`}>
                    {step.icon}
                    <span className="hidden sm:inline">{step.label}</span>
                  </div>
                  {i < 3 && <ArrowRight className="h-3 w-3 text-border" />}
                </div>
              ))}
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-slide-up-fade" style={{ animationDelay: '0.3s', animationFillMode: 'backwards' }}>
            <Button size="lg" onClick={() => navigate('/auth')} className="gap-2 brand-gradient-bg border-0 text-white hover:opacity-90 px-8 h-12 text-sm font-medium rounded-xl shadow-elevated">
              Get Started <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate('/replay/accepted')} className="gap-2 h-12 text-sm rounded-xl">
              View Demo Replay
            </Button>
          </div>

          {/* Subtle feature pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground animate-slide-up-fade" style={{ animationDelay: '0.45s', animationFillMode: 'backwards' }}>
            {['FHIR Context', 'A2A Intake Desk', 'MCP Chart Tools', 'Deterministic State Machine'].map(tag => (
              <span key={tag} className="rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider">{tag}</span>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
