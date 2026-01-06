import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { settingsAPI, type PredictionModes } from '@/services/api';
import { Clock, Lock, Unlock, Settings2, AlertTriangle } from 'lucide-react';
import type { StatsTabProps } from '@/types/admin';

// World Cup 2026 starts June 11, 2026 at 12:00 Mexico City time (UTC-6)
const WORLD_CUP_START = '2026-06-11T17:00';

export function StatsTab({ stats }: StatsTabProps): JSX.Element {
  const [deadline, setDeadline] = useState<string>('');
  const [loadingDeadline, setLoadingDeadline] = useState<boolean>(true);
  const [savingDeadline, setSavingDeadline] = useState<boolean>(false);
  const [deadlineMessage, setDeadlineMessage] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(true);

  // Prediction modes state
  const [predictionModes, setPredictionModes] = useState<PredictionModes>('both');
  const [loadingModes, setLoadingModes] = useState<boolean>(true);
  const [savingModes, setSavingModes] = useState<boolean>(false);
  const [modesMessage, setModesMessage] = useState<string>('');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await settingsAPI.getAll();
        const currentDeadline = response.data?.predictions_deadline;
        if (currentDeadline) {
          // Convert to local datetime-local format
          const date = new Date(currentDeadline);
          const localDateTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
          setDeadline(localDateTime);
          setIsOpen(new Date() < date);
        }
        // Load prediction modes
        const currentModes = response.data?.prediction_modes as PredictionModes | undefined;
        if (currentModes) {
          setPredictionModes(currentModes);
          setOriginalModes(currentModes);
        }
      } catch (err) {
        console.error('Error loading settings:', err);
      } finally {
        setLoadingDeadline(false);
        setLoadingModes(false);
      }
    };
    loadSettings();
  }, []);

  const handleSaveDeadline = async () => {
    setSavingDeadline(true);
    setDeadlineMessage('');
    try {
      // Convert local time to ISO string
      const isoDeadline = deadline ? new Date(deadline).toISOString() : null;
      await settingsAPI.setDeadline(isoDeadline);
      setDeadlineMessage(deadline ? 'Deadline guardado' : 'Deadline eliminado - predicciones siempre abiertas');
      if (deadline) {
        setIsOpen(new Date() < new Date(deadline));
      } else {
        setIsOpen(true);
      }
    } catch (err) {
      console.error('Error saving deadline:', err);
      setDeadlineMessage('Error al guardar');
    } finally {
      setSavingDeadline(false);
      setTimeout(() => setDeadlineMessage(''), 3000);
    }
  };

  const handleSetWorldCupDeadline = () => {
    setDeadline(WORLD_CUP_START);
  };

  const handleClearDeadline = async () => {
    setDeadline('');
    setSavingDeadline(true);
    try {
      await settingsAPI.setDeadline(null);
      setDeadlineMessage('Deadline eliminado - predicciones siempre abiertas');
      setIsOpen(true);
    } catch (err) {
      console.error('Error clearing deadline:', err);
      setDeadlineMessage('Error al eliminar');
    } finally {
      setSavingDeadline(false);
      setTimeout(() => setDeadlineMessage(''), 3000);
    }
  };

  // Track if modes have been modified
  const [originalModes, setOriginalModes] = useState<PredictionModes>('both');

  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
  const [predictionsToDelete, setPredictionsToDelete] = useState<number>(0);
  const [modeToDeleteName, setModeToDeleteName] = useState<string>('');

  const handleSaveClick = async () => {
    // If changing to a single mode, check if there are predictions to delete
    if (predictionModes !== 'both' && originalModes !== predictionModes) {
      try {
        const response = await settingsAPI.getPredictionCountsByMode();
        const counts = response.data as { positions: number; scores: number };
        const modeToDelete = predictionModes === 'positions' ? 'scores' : 'positions';
        const countToDelete = counts[modeToDelete] || 0;

        if (countToDelete > 0) {
          setPredictionsToDelete(countToDelete);
          setModeToDeleteName(modeToDelete === 'positions' ? 'Escoger Ganadores' : 'Marcadores Exactos');
          setShowConfirmDialog(true);
          return;
        }
      } catch (err) {
        console.error('Error checking prediction counts:', err);
      }
    }

    // No predictions to delete, save directly
    await handleSaveModes(false);
  };

  const handleConfirmDelete = async () => {
    setShowConfirmDialog(false);
    await handleSaveModes(true);
  };

  const handleSaveModes = async (confirmDelete: boolean) => {
    setSavingModes(true);
    setModesMessage('');
    try {
      const response = await settingsAPI.setPredictionModes(predictionModes, confirmDelete);
      const deletedCount = (response.data as any)?.deletedCount || 0;
      setOriginalModes(predictionModes);
      if (deletedCount > 0) {
        setModesMessage(`Guardado. Se eliminaron ${deletedCount} predicciones.`);
      } else {
        setModesMessage('Guardado correctamente');
      }
    } catch (err) {
      console.error('Error saving prediction modes:', err);
      setModesMessage('Error al guardar');
    } finally {
      setSavingModes(false);
      setTimeout(() => setModesMessage(''), 5000);
    }
  };

  const modesChanged = predictionModes !== originalModes;

  return (
    <div className="space-y-6">
      {/* Prediction Modes Card */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Modos de Predicción
          </CardTitle>
          <CardDescription>
            Configura qué modos de predicción están disponibles para los usuarios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingModes ? (
            <div className="h-10 animate-pulse bg-muted rounded" />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant={predictionModes === 'both' ? 'default' : 'outline'}
                  onClick={() => setPredictionModes('both')}
                  className="flex-1"
                >
                  Ambos modos
                </Button>
                <Button
                  variant={predictionModes === 'positions' ? 'default' : 'outline'}
                  onClick={() => setPredictionModes('positions')}
                  className="flex-1"
                >
                  Solo Escoger Ganadores
                </Button>
                <Button
                  variant={predictionModes === 'scores' ? 'default' : 'outline'}
                  onClick={() => setPredictionModes('scores')}
                  className="flex-1"
                >
                  Solo Marcadores Exactos
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                {predictionModes === 'both' && 'Los usuarios pueden elegir entre ambos modos al crear una predicción.'}
                {predictionModes === 'positions' && 'Los usuarios solo podrán crear predicciones en modo "Escoger Ganadores".'}
                {predictionModes === 'scores' && 'Los usuarios solo podrán crear predicciones en modo "Marcadores Exactos".'}
              </p>

              <div className="flex items-center gap-3">
                <Button
                  onClick={handleSaveClick}
                  disabled={savingModes || !modesChanged}
                >
                  {savingModes ? 'Guardando...' : 'Guardar'}
                </Button>
                {modesMessage && (
                  <span className={`text-sm ${modesMessage.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                    {modesMessage}
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deadline Settings Card */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Cierre de Predicciones
          </CardTitle>
          <CardDescription>
            Configura la fecha y hora limite para hacer predicciones
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            {isOpen ? (
              <div className="flex items-center gap-2 text-green-600">
                <Unlock className="h-4 w-4" />
                <span className="font-medium">Predicciones abiertas</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600">
                <Lock className="h-4 w-4" />
                <span className="font-medium">Predicciones cerradas</span>
              </div>
            )}
          </div>

          {loadingDeadline ? (
            <div className="h-10 animate-pulse bg-muted rounded" />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleSaveDeadline} disabled={savingDeadline}>
                  {savingDeadline ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleSetWorldCupDeadline}>
                  1 hora antes del Mundial
                </Button>
                <Button variant="outline" size="sm" onClick={handleClearDeadline} disabled={savingDeadline}>
                  Sin limite (siempre abierto)
                </Button>
              </div>

              {deadlineMessage && (
                <p className={`text-sm ${deadlineMessage.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                  {deadlineMessage}
                </p>
              )}

              {deadline && (
                <p className="text-sm text-muted-foreground">
                  Las predicciones se cerraran el{' '}
                  <strong>
                    {new Date(deadline).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </strong>
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Usuarios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.total_users || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Predicciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.total_predictions || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Progreso Resultados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Repechajes:</span>
                <span className="font-medium">{stats?.playoffs_entered || 0}/6</span>
              </div>
              <div className="flex justify-between">
                <span>Grupos:</span>
                <span className="font-medium">{stats?.groups_entered || 0}/12</span>
              </div>
              <div className="flex justify-between">
                <span>Eliminatorias:</span>
                <span className="font-medium">{stats?.knockout_entered || 0}/32</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog for deleting predictions */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirmar eliminación de predicciones
            </DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Se eliminarán <strong>{predictionsToDelete}</strong> predicciones del modo "{modeToDeleteName}".
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Eliminar y guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default StatsTab;
