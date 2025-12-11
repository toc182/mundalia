import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut } from 'lucide-react';

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header con usuario y logout */}
      <div className="flex justify-between items-center mb-8">
        <div className="text-sm text-muted-foreground">
          Hola, <span className="font-medium text-foreground">{user?.name || user?.email}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Salir
        </Button>
      </div>

      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Quiniela Mundial 2026</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Predice los resultados del Mundial, compite con tus amigos y demuestra quien sabe mas de futbol.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Hacer Predicciones</CardTitle>
            <CardDescription>
              Completa tus predicciones para el Mundial 2026
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" size="lg">
              <Link to="/repechajes">Comenzar</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Ver Mis Predicciones</CardTitle>
            <CardDescription>
              Revisa las predicciones que has guardado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full" size="lg">
              <Link to="/mis-predicciones">Ver Predicciones</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow opacity-60">
          <CardHeader>
            <CardTitle>Ver Ranking</CardTitle>
            <CardDescription>
              Mira tu posicion en el leaderboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full" size="lg" disabled>
              <span>Proximamente</span>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow opacity-60">
          <CardHeader>
            <CardTitle>Mis Grupos</CardTitle>
            <CardDescription>
              Compite con amigos y familia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full" size="lg" disabled>
              <span>Proximamente</span>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-16 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-6">Sistema de Puntos</h2>
        <Card>
          <CardContent className="pt-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Prediccion</th>
                  <th className="text-right py-2">Puntos</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2">Posicion exacta en grupo</td>
                  <td className="text-right font-semibold">3 pts</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">Equipo que clasifica (sin posicion)</td>
                  <td className="text-right font-semibold">1 pt</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">Ganador Octavos de Final</td>
                  <td className="text-right font-semibold">2 pts</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">Ganador Cuartos de Final</td>
                  <td className="text-right font-semibold">4 pts</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">Ganador Semifinal</td>
                  <td className="text-right font-semibold">6 pts</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">Acertar Finalista</td>
                  <td className="text-right font-semibold">8 pts</td>
                </tr>
                <tr>
                  <td className="py-2">Acertar Campeon</td>
                  <td className="text-right font-semibold">15 pts</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
