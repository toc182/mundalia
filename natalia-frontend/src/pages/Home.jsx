import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Quiniela Mundial 2026</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Predice los resultados del Mundial, compite con tus amigos y demuestra quien sabe mas de futbol.
        </p>
      </div>

      {user ? (
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Predicciones</CardTitle>
              <CardDescription>
                Ordena los equipos en cada grupo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/predictions">Hacer Predicciones</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ranking</CardTitle>
              <CardDescription>
                Mira tu posicion en el leaderboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link to="/leaderboard">Ver Ranking</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Grupos Privados</CardTitle>
              <CardDescription>
                Compite con amigos y familia
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link to="/groups">Mis Grupos</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Comienza Ahora</CardTitle>
              <CardDescription>
                Crea tu cuenta gratis y empieza a predecir
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full">
                <Link to="/register">Crear Cuenta</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/login">Ya tengo cuenta</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8">Como Funciona</h2>
        <div className="grid md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-xl font-bold text-primary">1</span>
            </div>
            <h3 className="font-semibold mb-2">Predice los Grupos</h3>
            <p className="text-sm text-muted-foreground">
              Ordena como crees que quedaran los equipos en cada grupo
            </p>
          </div>
          <div>
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-xl font-bold text-primary">2</span>
            </div>
            <h3 className="font-semibold mb-2">Escoge Ganadores</h3>
            <p className="text-sm text-muted-foreground">
              En las eliminatorias, predice quien ganara cada partido
            </p>
          </div>
          <div>
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-xl font-bold text-primary">3</span>
            </div>
            <h3 className="font-semibold mb-2">Gana Puntos</h3>
            <p className="text-sm text-muted-foreground">
              Acumula puntos por cada prediccion correcta
            </p>
          </div>
        </div>
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
