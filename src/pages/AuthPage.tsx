import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';

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
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 text-primary">
            <Shield className="h-6 w-6" />
            <span className="text-xl font-semibold tracking-tight">Consult Passport</span>
          </div>
          <p className="text-sm text-muted-foreground">Referral Acceptance Workspace</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">{mode === 'signin' ? 'Sign In' : 'Create Account'}</CardTitle>
            <CardDescription>
              {mode === 'signin' ? 'Access your workspace' : 'Set up a new account'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} required />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
              </Button>
            </form>
            <div className="mt-3 text-center">
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground underline"
                onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              >
                {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
              </button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardContent className="pt-4 pb-4">
            <Button variant="outline" className="w-full" onClick={handleDemoLogin} disabled={loading}>
              Continue as Demo Coordinator
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">Instant access with synthetic data</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
