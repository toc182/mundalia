import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Menu, User, X, Plus, List, Trophy, Users, LogOut, UserCircle } from 'lucide-react';

// Logo component - solo texto estilizado
const MundaliaLogo = () => (
  <span className="text-xl font-bold tracking-tight">
    <span className="text-primary">Mund</span>
    <span className="text-sky-500">alia</span>
  </span>
);

export default function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setUserMenuOpen(false);
  };

  const handleNavigation = (path) => {
    navigate(path);
    setMenuOpen(false);
  };

  // Si no hay usuario, no mostrar menus
  if (!user) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-background border-b flex items-center justify-center">
        <Link to="/" className="hover:opacity-80 transition-opacity">
          <MundaliaLogo />
        </Link>
      </header>
    );
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-background border-b flex items-center justify-between px-4">
        {/* Menu hamburguesa izquierda */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>

        {/* Logo centro */}
        <Link to="/" className="hover:opacity-80 transition-opacity">
          <MundaliaLogo />
        </Link>

        {/* Usuario derecha */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <User className="h-6 w-6" />
          </button>

          {/* Dropdown menu usuario */}
          {userMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setUserMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-48 bg-background border rounded-lg shadow-lg z-50">
                <button
                  onClick={() => { navigate('/cuenta'); setUserMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted text-left"
                >
                  <UserCircle className="h-4 w-4" />
                  Cuenta
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted text-left border-t"
                >
                  <LogOut className="h-4 w-4" />
                  Salir
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Menu lateral */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 pt-14"
            onClick={() => setMenuOpen(false)}
          />
          <nav className="fixed top-14 left-0 w-64 h-[calc(100vh-3.5rem)] bg-background border-r z-50 overflow-y-auto">
            <div className="p-4 space-y-1">
              <button
                onClick={() => handleNavigation('/?newPrediction=true')}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted rounded-lg text-left"
              >
                <Plus className="h-5 w-5" />
                Nueva Prediccion
              </button>
              <button
                onClick={() => handleNavigation('/mis-predicciones')}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted rounded-lg text-left"
              >
                <List className="h-5 w-5" />
                Ver Predicciones
              </button>
              <button
                onClick={() => handleNavigation('/ranking')}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted rounded-lg text-left opacity-50"
              >
                <Trophy className="h-5 w-5" />
                Ranking
                <span className="text-xs text-muted-foreground ml-auto">Pronto</span>
              </button>
              <button
                onClick={() => handleNavigation('/mis-grupos')}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted rounded-lg text-left opacity-50"
              >
                <Users className="h-5 w-5" />
                Grupos
                <span className="text-xs text-muted-foreground ml-auto">Pronto</span>
              </button>
            </div>
          </nav>
        </>
      )}
    </>
  );
}
