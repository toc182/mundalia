import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { leaderboardAPI } from '@/services/api';
import { Trophy, Users, ListOrdered, Calculator } from 'lucide-react';

// Get flag image URL from country code
const getFlagUrl = (countryCode) => {
  if (!countryCode || countryCode === 'none') return null;
  return `https://flagcdn.com/24x18/${countryCode.toLowerCase()}.png`;
};

export default function Leaderboard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [counts, setCounts] = useState({ positions: 0, scores: 0 });
  const [mode, setMode] = useState('positions');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const response = await leaderboardAPI.getCounts();
        setCounts(response.data);
      } catch (err) {
        console.error('Error fetching counts:', err);
      }
    };
    fetchCounts();
  }, []);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const response = await leaderboardAPI.getGlobal(mode);
        setEntries(response.data);
      } catch (err) {
        setError('Error al cargar el ranking');
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [mode]);

  const getMedalColor = (position) => {
    switch (position) {
      case 1: return 'bg-yellow-400 text-yellow-900';
      case 2: return 'bg-gray-300 text-gray-700';
      case 3: return 'bg-amber-600 text-amber-100';
      default: return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const currentUserEntries = entries.filter(e => e.user_id === user?.id);

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
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-0.5">
              {entries.map((entry, index) => {
                const position = index + 1;
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
                        src={getFlagUrl(entry.country)}
                        alt={entry.country}
                        className="w-5 h-auto shrink-0"
                        onError={(e) => { e.target.style.display = 'none'; }}
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
      )}

      {currentUserEntries.length > 0 && (
        <Card className="mt-4">
          <CardContent className="py-3">
            <div className="text-xs text-muted-foreground mb-2">Tus posiciones:</div>
            <div className="flex flex-wrap gap-2">
              {currentUserEntries.map(entry => {
                const position = entries.indexOf(entry) + 1;
                return (
                  <div key={entry.prediction_set_id} className="flex items-center gap-1 text-sm bg-muted/50 px-2 py-1 rounded">
                    <span className="font-medium">#{position}</span>
                    <span className="text-muted-foreground">{entry.prediction_name}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
