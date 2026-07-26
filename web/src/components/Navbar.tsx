import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { Button } from '@/components/ui/button';

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const { pathname } = useLocation();

  const onLoginPage    = pathname === '/login';
  const onRegisterPage = pathname === '/register';

  return (
    <header className="border-b bg-background sticky top-0 z-10">
      <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="font-bold text-lg tracking-tight">
          📉 PriceDrop Detective
        </Link>
        <nav className="flex items-center gap-1">
          <Link to="/trackers">
            <Button variant="ghost" size="sm">Trackers</Button>
          </Link>
          {isAuthenticated ? (
            <>
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">My Trackers</Button>
              </Link>
              <Link to="/settings">
                <Button variant="ghost" size="sm">Settings</Button>
              </Link>
              <Button variant="outline" size="sm" onClick={() => { logout(); void navigate('/'); }}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                disabled={onLoginPage}
                aria-current={onLoginPage ? 'page' : undefined}
                onClick={() => { if (!onLoginPage) void navigate('/login'); }}
              >
                Sign in
              </Button>
              <Button
                size="sm"
                disabled={onRegisterPage}
                aria-current={onRegisterPage ? 'page' : undefined}
                onClick={() => { if (!onRegisterPage) void navigate('/register'); }}
              >
                Get started
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme" className="ml-1">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </Button>
        </nav>
      </div>
    </header>
  );
}
