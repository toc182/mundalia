import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { mockLeaderboard } from '@/data/mockData';

export default function Leaderboard() {
  const { user } = useAuth();

  const getMedalColor = (position) => {
    switch (position) {
      case 1: return 'bg-yellow-400 text-yellow-900';
      case 2: return 'bg-gray-300 text-gray-700';
      case 3: return 'bg-amber-600 text-amber-100';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Ranking Global</h1>

      <Card>
        <CardHeader>
          <CardTitle>Top Jugadores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {mockLeaderboard.map((player, index) => {
              const position = index + 1;
              const isCurrentUser = user && player.name === user.name;

              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-4 p-3 rounded-lg transition-colors
                    ${isCurrentUser ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getMedalColor(position)}`}>
                    {position}
                  </div>

                  <div className="flex-1">
                    <span className={`font-medium ${isCurrentUser ? 'text-primary' : ''}`}>
                      {player.name}
                      {isCurrentUser && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          Tu
                        </Badge>
                      )}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-lg font-bold">{player.total_points}</span>
                    <span className="text-sm text-muted-foreground ml-1">pts</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {user && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Tu Posicion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">7</p>
                <p className="text-sm text-muted-foreground">de 10 jugadores</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">28</p>
                <p className="text-sm text-muted-foreground">puntos totales</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
