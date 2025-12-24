import { useState, useEffect, SyntheticEvent, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { leaderboardAPI } from '@/services/api';
import { Trophy, Users, ListOrdered, Calculator, ChevronLeft, ChevronRight } from 'lucide-react';

interface LeaderboardEntry {
  prediction_set_id: number;
  user_id: number;
  user_name: string;
  username?: string;
  prediction_name: string;
  total_points: number;
  country?: string;
}

const PAGE_SIZE = 100;

// Get flag image URL from country code
const getFlagUrl = (countryCode: string | undefined): string | null => {
  if (!countryCode || countryCode === 'none') return null;
  return `https://flagcdn.com/24x18/${countryCode.toLowerCase()}.png`;
};

export default function Leaderboard(): JSX.Element {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [counts, setCounts] = useState({ positions: 0, scores: 0 });
  const [mode, setMode] = useState<'positions' | 'scores'>('positions');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [userPosition, setUserPosition] = useState<number | null>(null);
  const [userPage, setUserPage] = useState<number | null>(null);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    const fetchCounts = async (): Promise<void> => {
      try {
        const response = await leaderboardAPI.getCounts();
        setCounts(response.data);
      } catch (err) {
        console.error('Error fetching counts:', err);
      }
    };
    fetchCounts();
  }, []);

  // Reset page when mode changes
  useEffect(() => {
    setPage(1);
    initialLoadDone.current = false;
  }, [mode]);

  useEffect(() => {
    const fetchLeaderboard = async (): Promise<void> => {
      setLoading(true);
      try {
        const response = await leaderboardAPI.getGlobal(mode, page, PAGE_SIZE);
        const data = response.data;
        setEntries(data.entries);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setUserPosition(data.userPosition);
        setUserPage(data.userPage);

        // On first load, auto-navigate to user's page if they have a position
        if (!initialLoadDone.current && data.userPage && data.userPage !== page) {
          initialLoadDone.current = true;
          setPage(data.userPage);
          return; // Will re-fetch with correct page
        }
        initialLoadDone.current = true;
      } catch {
        setError('Error al cargar el ranking');
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [mode, page]);

  const getMedalColor = (position: number): string => {
    switch (position) {
      case 1: return 'bg-yellow-400 text-yellow-900';
      case 2: return 'bg-gray-300 text-gray-700';
      case 3: return 'bg-amber-600 text-amber-100';
      default: return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  // Calculate base position for current page
  const basePosition = (page - 1) * PAGE_SIZE;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Trophy className="h-6 w-6 text-yellow-500" />
        Ranking Global
      </h1>

      {/* Mode tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={mode === 'positions' ? 'default' : 'outline'}
          onClick={() => setMode('positions')}
          className="flex items-center gap-2"
        >
          <ListOrdered className="h-4 w-4" />
          Escoger Ganadores
          {counts.positions > 0 && (
            <Badge variant="secondary" className="ml-1">{counts.positions}</Badge>
          )}
        </Button>
        <Button
          variant={mode === 'scores' ? 'default' : 'outline'}
          onClick={() => setMode('scores')}
          className="flex items-center gap-2"
        >
          <Calculator className="h-4 w-4" />
          Marcadores
          {counts.scores > 0 && (
            <Badge variant="secondary" className="ml-1">{counts.scores}</Badge>
          )}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Aún no hay predicciones completas en modo {mode === 'positions' ? 'Escoger Ganadores' : 'Marcadores Exactos'}.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              ¡Completa tu predicción hasta la final para aparecer aquí!
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
        {/* Pagination controls - TOP */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-muted-foreground">
              {total} predicciones · Página {page} de {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              {userPage && userPage !== page && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(userPage)}
                  disabled={loading}
                >
                  Ir a mi posición
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        <Card>
          <CardContent className="pt-4">
            <div className="space-y-0.5">
              {entries.map((entry, index) => {
                const position = basePosition + index + 1;
                const isCurrentUser = user && entry.user_id === user.id;
                const displayName = entry.username || entry.user_name;

                return (
                  <div
                    key={entry.prediction_set_id}
                    className={`flex items-center gap-2 py-1.5 px-2 rounded transition-colors
                      ${isCurrentUser ? 'bg-primary/10' : 'hover:bg-muted/50'}`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${getMedalColor(position)}`}>
                      {position}
                    </div>

                    {entry.country && getFlagUrl(entry.country) && (
                      <img
                        src={getFlagUrl(entry.country)!}
                        alt={entry.country}
                        className="w-5 h-auto shrink-0"
                        onError={(e: SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none'; }}
                      />
                    )}

                    <div className="flex-1 min-w-0 flex items-center gap-1.5 truncate">
                      <span className={`font-medium text-sm ${isCurrentUser ? 'text-primary' : ''} truncate`}>
                        {displayName}
                      </span>
                      <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                        · {entry.prediction_name}
                      </span>
                      {isCurrentUser && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 shrink-0">
                          Tú
                        </Badge>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-bold">{entry.total_points}</span>
                      <span className="text-xs text-muted-foreground ml-0.5">pts</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Pagination controls - BOTTOM */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              {total} predicciones · Página {page} de {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              {userPage && userPage !== page && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(userPage)}
                  disabled={loading}
                >
                  Ir a mi posición
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* User position card */}
        {userPosition && (
          <Card className="mt-4">
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Tu mejor posición:</div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">#{userPosition}</span>
                  <span className="text-sm text-muted-foreground">de {total}</span>
                  {userPage && userPage !== page && (
                    <Button
                      variant="link"
                      size="sm"
                      className="text-xs p-0 h-auto"
                      onClick={() => setPage(userPage)}
                    >
                      (ver)
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        </>
      )}
    </div>
  );
}
