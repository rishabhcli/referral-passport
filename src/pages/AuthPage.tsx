import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, ArrowRight, Loader2 } from 'lucide-react';

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, session } = useAuth();
  const navigate = useNavigate();

  if (session) {
    return <Navigate to="/app" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else {
        await signUp(email, password, fullName);
      }
      navigate('/app');
    } catch (err: any) {
      setError(err.message ?? 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const demoEmail = 'demo@consultpassport.dev';
      const demoPw = 'demo-passport-2025';
      try {
        await signIn(demoEmail, demoPw);
      } catch {
        await signUp(demoEmail, demoPw, 'Demo Coordinator');
        await signIn(demoEmail, demoPw);
      }
      navigate('/app');
    } catch (err: any) {
      setError(err.message ?? 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8 animate-fade-in-up">
        {/* Brand */}
        <div className="text-center space-y-3">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl brand-gradient-bg shadow-elevated mx-auto">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Consult Passport</h1>
            <p className="text-sm text-muted-foreground mt-1">Referral Acceptance Workspace</p>
          </div>
        </div>

        {/* Auth form */}
        <div className="card-elevated p-6 space-y-5">
          <div>
            <h2 className="text-sm font-semibold">{mode === 'signin' ? 'Sign In' : 'Create Account'}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {mode === 'signin' ? 'Access your workspace' : 'Set up a new account'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-xs">Full Name</Label>
                <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} required className="h-10 rounded-lg" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="h-10 rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs">Password</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="h-10 rounded-lg" />
            </div>
            {error && (
              <div className="bg-status-danger-muted text-status-danger text-xs p-2.5 rounded-lg">{error}</div>
            )}
            <Button type="submit" className="w-full h-10 rounded-lg brand-gradient-bg border-0 text-white hover:opacity-90 gap-2" disabled={loading}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          <div className="text-center">
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            >
              {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>

        {/* Demo login */}
        <div className="card-clinical p-4 border-dashed space-y-3">
          <Button
            variant="outline"
            className="w-full h-10 rounded-lg gap-2 font-medium"
            onClick={handleDemoLogin}
            disabled={loading}
          >
            Continue as Demo Coordinator <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <p className="text-[11px] text-muted-foreground text-center">
            Instant access with synthetic patient data
          </p>
        </div>
      </div>
    </div>
  );
}
