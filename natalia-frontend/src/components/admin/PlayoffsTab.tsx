import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { adminAPI } from '@/services/api';
import { playoffs } from '@/data/playoffsData';
import type { MockTeam } from '@/data/mockData';
import type { PlayoffsTabProps } from '@/types/admin';

export function PlayoffsTab({ realPlayoffs, onSave, showSuccess, setError }: PlayoffsTabProps): JSX.Element {
  const [saving, setSaving] = useState<string | null>(null);

  const getPlayoffWinner = (playoffId: string): number | undefined => {
    const result = realPlayoffs.find(r => r.playoff_id === playoffId);
    return result?.winner_team_id;
  };

  const getWinnerTeam = (playoffId: string): MockTeam | undefined => {
    const winnerId = getPlayoffWinner(playoffId);
    if (!winnerId) return undefined;
    const playoff = playoffs.find(p => p.id === playoffId);
    return playoff?.teams.find(t => t.id === winnerId) as MockTeam | undefined;
  };

  const handleSave = async (playoffId: string, winnerId: number): Promise<void> => {
    setSaving(playoffId);
    try {
      await adminAPI.savePlayoff(playoffId, winnerId);
      await onSave();
      showSuccess(`Resultado de ${playoffId} guardado`);
    } catch {
      setError('Error guardando resultado');
    } finally {
      setSaving(null);
    }
  };

  // Count completed playoffs
  const completedCount = realPlayoffs.length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground mb-4">
        Selecciona el equipo que gano cada repechaje y clasifico al Mundial.
      </p>

      {/* Summary of classified teams */}
      {completedCount > 0 && (
        <Card className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-800 dark:text-green-300">
              Equipos Clasificados ({completedCount}/6)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {playoffs.map(playoff => {
                const winner = getWinnerTeam(playoff.id);
                if (!winner) return null;
                return (
                  <div key={playoff.id} className="flex items-center gap-1 bg-white dark:bg-background px-2 py-1 rounded border">
                    <img src={winner.flag_url} alt="" className="w-5 h-3 object-cover" />
                    <span className="text-xs font-medium">{winner.name}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {playoffs.map(playoff => {
          const currentWinner = getPlayoffWinner(playoff.id);

          return (
            <Card key={playoff.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{playoff.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {playoff.teams.map(team => (
                    <button
                      key={team.id}
                      onClick={() => handleSave(playoff.id, team.id)}
                      disabled={saving === playoff.id}
                      className={`w-full flex items-center gap-2 p-2 rounded border transition-colors
                        ${currentWinner === team.id
                          ? 'bg-green-100 border-green-500 dark:bg-green-900/30'
                          : 'hover:bg-muted'
                        }`}
                    >
                      <img src={team.flag_url} alt="" className="w-6 h-4 object-cover" />
                      <span className="flex-1 text-left text-sm">{team.name}</span>
                      {currentWinner === team.id && (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default PlayoffsTab;
