import { Link, useNavigate } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { Button } from '@/components/ui/button';

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

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
              <Link to="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
              <Link to="/register"><Button size="sm">Get started</Button></Link>
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
