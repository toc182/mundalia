import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { settingsAPI } from '@/services/api';
import { Clock, Lock, Unlock } from 'lucide-react';
import type { StatsTabProps } from '@/types/admin';

// World Cup 2026 starts June 11, 2026 at 12:00 Mexico City time (UTC-6)
const WORLD_CUP_START = '2026-06-11T17:00';

export function StatsTab({ stats }: StatsTabProps): JSX.Element {
  const [deadline, setDeadline] = useState<string>('');
  const [loadingDeadline, setLoadingDeadline] = useState<boolean>(true);
  const [savingDeadline, setSavingDeadline] = useState<boolean>(false);
  const [deadlineMessage, setDeadlineMessage] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(true);

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
      } catch (err) {
        console.error('Error loading settings:', err);
      } finally {
        setLoadingDeadline(false);
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

  return (
    <div className="space-y-6">
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
    </div>
  );
}

export default StatsTab;
