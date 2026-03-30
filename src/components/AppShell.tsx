import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Shield, LogOut } from 'lucide-react';

export default function AppShell() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-4">
          <Link to="/app" className="flex items-center gap-2 text-primary font-semibold text-sm tracking-tight">
            <Shield className="h-4 w-4" />
            Consult Passport
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{profile?.fullName ?? profile?.email}</span>
            <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">{profile?.role}</span>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="h-7 w-7 p-0">
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
