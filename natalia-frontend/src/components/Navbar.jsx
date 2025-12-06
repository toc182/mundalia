import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="border-b bg-card">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold">
          Natalia
        </Link>

        {user ? (
          <div className="flex items-center gap-4">
            <Link to="/playoffs" className="text-sm hover:text-primary">
              Playoffs
            </Link>
            <Link to="/predictions" className="text-sm hover:text-primary">
              Grupos
            </Link>
            <Link to="/leaderboard" className="text-sm hover:text-primary">
              Ranking
            </Link>
            <Link to="/groups" className="text-sm hover:text-primary">
              Mis Grupos
            </Link>
            <span className="text-sm text-muted-foreground">
              {user.name}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Salir
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Entrar</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/register">Registrarse</Link>
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
}
