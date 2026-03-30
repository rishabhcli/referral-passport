import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Shield, LogOut, User } from 'lucide-react';

export default function AppShell() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/app" className="flex items-center gap-2.5 group">
            <div className="h-8 w-8 rounded-lg brand-gradient-bg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-foreground text-sm tracking-tight">Consult Passport</span>
          </Link>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 mr-2">
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="text-right">
                <p className="text-xs font-medium leading-tight">{profile?.fullName ?? profile?.email}</p>
                <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">{profile?.role}</p>
              </div>
            </div>
            <div className="h-5 w-px bg-border hidden sm:block" />
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>
      <main className="animate-fade-in-up">
        <Outlet />
      </main>
    </div>
  );
}
