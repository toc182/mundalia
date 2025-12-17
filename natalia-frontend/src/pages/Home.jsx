import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { predictionSetsAPI } from '@/services/api';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMode, setNewMode] = useState('positions'); // 'positions' | 'scores'
  const [saving, setSaving] = useState(false);

  // Abrir modal si viene de menu con ?newPrediction=true
  useEffect(() => {
    if (searchParams.get('newPrediction') === 'true') {
      setShowCreateDialog(true);
      // Limpiar el query param
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const response = await predictionSetsAPI.create(newName.trim(), newMode);
      setShowCreateDialog(false);
      setNewName('');
      setNewMode('positions');
      navigate(`/repechajes?setId=${response.data.id}`);
    } catch (err) {
      console.error('Error creating prediction set:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
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
            <Button className="w-full" size="lg" onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Prediccion
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

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Ver Ranking</CardTitle>
            <CardDescription>
              Mira tu posición en el leaderboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full" size="lg">
              <Link to="/ranking">Ver Ranking</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Mis Grupos</CardTitle>
            <CardDescription>
              Compite con amigos y familia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full" size="lg">
              <Link to="/mis-grupos">Ver Grupos</Link>
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

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Prediccion</DialogTitle>
            <DialogDescription>
              Dale un nombre a tu prediccion para identificarla facilmente
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Ej: Mi prediccion optimista"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />

          {/* Mode selector */}
          <div className="space-y-3 pt-2">
            <label className="text-sm font-medium">Modo de prediccion</label>
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                <input
                  type="radio"
                  name="mode"
                  value="positions"
                  checked={newMode === 'positions'}
                  onChange={() => setNewMode('positions')}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium">Escoger Ganadores</div>
                  <div className="text-sm text-muted-foreground">
                    Arrastra equipos para ordenar su posición final de grupo. Escoge ganadores de la fase de eliminación directa.
                  </div>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                <input
                  type="radio"
                  name="mode"
                  value="scores"
                  checked={newMode === 'scores'}
                  onChange={() => setNewMode('scores')}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium">Marcadores Exactos</div>
                  <div className="text-sm text-muted-foreground">
                    Ingresa el resultado de cada partido (posiciones calculadas automaticamente)
                  </div>
                </div>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || saving}>
              {saving ? 'Creando...' : 'Crear y Comenzar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
