import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { mockTeams, getAllGroups } from '@/data/mockData';
import { playoffs } from '@/data/playoffsData';
import { getThirdPlaceCombination } from '@/data/thirdPlaceCombinations';

// Mapeo de playoff ID a team ID en mockTeams
const playoffToTeamId = {
  'UEFA_A': 6,
  'UEFA_B': 23,
  'UEFA_C': 16,
  'UEFA_D': 4,
  'FIFA_1': 42,
  'FIFA_2': 35,
};

export default function MyPredictions() {
  const [predictions, setPredictions] = useState({});
  const [playoffSelections, setPlayoffSelections] = useState({});
  const [bestThirdPlaces, setBestThirdPlaces] = useState([]);

  useEffect(() => {
    const savedPredictions = localStorage.getItem('natalia_predictions');
    if (savedPredictions) {
      setPredictions(JSON.parse(savedPredictions));
    }

    const savedPlayoffs = localStorage.getItem('natalia_playoffs');
    if (savedPlayoffs) {
      setPlayoffSelections(JSON.parse(savedPlayoffs));
    }

    const savedThirdPlaces = localStorage.getItem('natalia_best_third_places');
    if (savedThirdPlaces) {
      setBestThirdPlaces(JSON.parse(savedThirdPlaces));
    }
  }, []);

  // Get the winning team from a playoff
  const getPlayoffWinner = (playoffId) => {
    const selection = playoffSelections[playoffId];
    if (!selection?.final) return null;
    const playoff = playoffs.find(p => p.id === playoffId);
    if (!playoff) return null;
    return playoff.teams.find(t => t.id === selection.final);
  };

  // Get team by ID
  const getTeamById = (id) => {
    const team = mockTeams.find(t => t.id === id);
    if (!team) return null;

    if (team.is_playoff) {
      const playoffEntry = Object.entries(playoffToTeamId).find(([_, teamId]) => teamId === id);
      if (playoffEntry) {
        const playoffId = playoffEntry[0];
        const winner = getPlayoffWinner(playoffId);
        if (winner) {
          return { ...winner, id: team.id, isPlayoffWinner: true };
        }
      }
    }
    return team;
  };

  const groups = getAllGroups();
  const completedPlayoffs = playoffs.filter(p => playoffSelections[p.id]?.final).length;
  const completedGroups = groups.filter(g => predictions[g]?.length === 4).length;
  const thirdPlaceCombination = bestThirdPlaces.length === 8
    ? getThirdPlaceCombination(bestThirdPlaces)
    : null;

  const hasPredictions = completedPlayoffs > 0 || completedGroups > 0 || bestThirdPlaces.length > 0;

  if (!hasPredictions) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Inicio</Link>
          <span>/</span>
          <span className="font-medium text-foreground">Mis Predicciones</span>
        </div>

        <h1 className="text-2xl font-bold mb-6">Mis Predicciones</h1>

        <Alert>
          <AlertDescription>
            Aun no has hecho ninguna prediccion.
            <Link to="/repechajes" className="ml-1 underline hover:no-underline">
              Comienza aqui
            </Link>
          </AlertDescription>
        </Alert>

        <div className="mt-6">
          <Button asChild>
            <Link to="/repechajes">Hacer Predicciones</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">Inicio</Link>
        <span>/</span>
        <span className="font-medium text-foreground">Mis Predicciones</span>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Mis Predicciones</h1>
        <Button variant="outline" asChild>
          <Link to="/repechajes">Editar Predicciones</Link>
        </Button>
      </div>

      {/* Progress Summary */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Badge variant={completedPlayoffs === 6 ? 'default' : 'secondary'}>
          Repechajes: {completedPlayoffs}/6
        </Badge>
        <Badge variant={completedGroups === 12 ? 'default' : 'secondary'}>
          Grupos: {completedGroups}/12
        </Badge>
        <Badge variant={bestThirdPlaces.length === 8 && thirdPlaceCombination ? 'default' : 'secondary'}>
          Terceros: {bestThirdPlaces.length}/8
        </Badge>
      </div>

      {/* Repechajes Section */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Repechajes Intercontinentales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {playoffs.map(playoff => {
              const winner = getPlayoffWinner(playoff.id);
              return (
                <div
                  key={playoff.id}
                  className={`p-3 rounded-lg border ${winner ? 'bg-green-50 border-green-200' : 'bg-muted'}`}
                >
                  <p className="text-xs text-muted-foreground mb-1">{playoff.name}</p>
                  {winner ? (
                    <div className="flex items-center gap-2">
                      <img
                        src={winner.flag_url}
                        alt={winner.name}
                        className="w-6 h-4 object-cover rounded"
                      />
                      <span className="text-sm font-medium">{winner.name}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Sin seleccionar</span>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    → Grupo {playoff.destinationGroup}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Groups Section */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Predicciones de Grupos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {groups.map(group => {
              const teamIds = predictions[group] || [];
              return (
                <div key={group} className="border rounded-lg p-3">
                  <p className="text-sm font-medium mb-2">Grupo {group}</p>
                  {teamIds.length > 0 ? (
                    <div className="space-y-1">
                      {teamIds.map((teamId, index) => {
                        const team = getTeamById(teamId);
                        if (!team) return null;
                        const qualifies = index < 2;
                        const isThird = index === 2;
                        return (
                          <div
                            key={teamId}
                            className={`flex items-center gap-2 text-xs p-1 rounded
                              ${qualifies ? 'bg-green-50' : ''}
                              ${isThird ? 'bg-yellow-50' : ''}
                            `}
                          >
                            <span className="w-4 text-muted-foreground">{index + 1}.</span>
                            <img
                              src={team.flag_url}
                              alt={team.name}
                              className="w-5 h-3 object-cover rounded"
                            />
                            <span className="truncate">{team.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sin prediccion</span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Best Third Places Section */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Mejores Terceros Lugares</CardTitle>
        </CardHeader>
        <CardContent>
          {bestThirdPlaces.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-2 mb-3">
                {bestThirdPlaces.map(group => {
                  const teamIds = predictions[group] || [];
                  const thirdPlaceId = teamIds[2];
                  const team = thirdPlaceId ? getTeamById(thirdPlaceId) : null;
                  return (
                    <div
                      key={group}
                      className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded"
                    >
                      <span className="text-xs text-muted-foreground">3{group}</span>
                      {team && (
                        <>
                          <img
                            src={team.flag_url}
                            alt={team.name}
                            className="w-5 h-3 object-cover rounded"
                          />
                          <span className="text-sm">{team.name}</span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              {thirdPlaceCombination ? (
                <Badge variant="outline" className="text-green-600 border-green-300">
                  Combinacion valida (Opcion {thirdPlaceCombination.option})
                </Badge>
              ) : bestThirdPlaces.length === 8 ? (
                <Badge variant="outline" className="text-red-600 border-red-300">
                  Combinacion no valida
                </Badge>
              ) : null}
            </>
          ) : (
            <span className="text-sm text-muted-foreground">Sin seleccionar</span>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t">
        <Button variant="outline" asChild>
          <Link to="/">Volver al Inicio</Link>
        </Button>
        <Button asChild>
          <Link to="/repechajes">Editar Predicciones</Link>
        </Button>
      </div>
    </div>
  );
}
