import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { mockTeams, getAllGroups } from '@/data/mockData';
import { playoffs } from '@/data/playoffsData';
import { getThirdPlaceCombination } from '@/data/thirdPlaceCombinations';
import {
  roundOf32Structure,
  roundOf16Structure,
  quarterFinalsStructure,
  semiFinalsStructure,
  thirdPlaceMatch,
  finalMatch
} from '@/data/knockoutBracket';
import { predictionSetsAPI } from '@/services/api';

// Mapeo de playoff ID a team ID en mockTeams
const playoffToTeamId = {
  'UEFA_A': 6,
  'UEFA_B': 23,
  'UEFA_C': 16,
  'UEFA_D': 4,
  'FIFA_1': 42,
  'FIFA_2': 35,
};

export default function PredictionDetail() {
  const { id } = useParams();
  const [predictionSet, setPredictionSet] = useState(null);
  const [predictions, setPredictions] = useState({});
  const [playoffSelections, setPlayoffSelections] = useState({});
  const [bestThirdPlaces, setBestThirdPlaces] = useState([]);
  const [knockoutPredictions, setKnockoutPredictions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadPredictionSet = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await predictionSetsAPI.getById(id);
        const data = response.data;

        setPredictionSet({
          id: data.id,
          name: data.name,
          created_at: data.created_at
        });

        // Group predictions - convert array to grouped object
        if (data.groupPredictions && data.groupPredictions.length > 0) {
          const grouped = {};
          data.groupPredictions.forEach(gp => {
            if (!grouped[gp.group_letter]) {
              grouped[gp.group_letter] = [];
            }
            grouped[gp.group_letter][gp.predicted_position - 1] = gp.team_id;
          });
          setPredictions(grouped);
        }

        // Playoff predictions
        if (data.playoffPredictions) {
          setPlayoffSelections(data.playoffPredictions);
        }

        // Third places
        if (data.thirdPlaces) {
          setBestThirdPlaces(data.thirdPlaces.split(''));
        }

        // Knockout predictions
        if (data.knockoutPredictions) {
          setKnockoutPredictions(data.knockoutPredictions);
        }
      } catch (err) {
        setError('Error al cargar la prediccion');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadPredictionSet();
  }, [id]);

  // Get the winning team from a playoff
  const getPlayoffWinner = (playoffId) => {
    const selection = playoffSelections[playoffId];
    if (!selection?.final) return null;
    const playoff = playoffs.find(p => p.id === playoffId);
    if (!playoff) return null;
    return playoff.teams.find(t => t.id === selection.final);
  };

  // Get team by ID
  const getTeamById = (teamId) => {
    const team = mockTeams.find(t => t.id === teamId);
    if (!team) return null;

    if (team.is_playoff) {
      const playoffEntry = Object.entries(playoffToTeamId).find(([_, tid]) => tid === teamId);
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

  // Count knockout predictions
  const r32Count = roundOf32Structure.filter(m => knockoutPredictions[m.matchId]).length;
  const r16Count = roundOf16Structure.filter(m => knockoutPredictions[m.matchId]).length;
  const qfCount = quarterFinalsStructure.filter(m => knockoutPredictions[m.matchId]).length;
  const sfCount = semiFinalsStructure.filter(m => knockoutPredictions[m.matchId]).length;
  const thirdPlaceCount = knockoutPredictions[thirdPlaceMatch.matchId] ? 1 : 0;
  const finalCount = knockoutPredictions[finalMatch.matchId] ? 1 : 0;
  const totalKnockout = r32Count + r16Count + qfCount + sfCount + thirdPlaceCount + finalCount;

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Inicio</Link>
          <span>/</span>
          <Link to="/mis-predicciones" className="hover:text-foreground">Mis Predicciones</Link>
          <span>/</span>
          <span className="font-medium text-foreground">Cargando...</span>
        </div>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-current border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Cargando prediccion...</p>
        </div>
      </div>
    );
  }

  if (error || !predictionSet) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>{error || 'Prediccion no encontrada'}</AlertDescription>
        </Alert>
        <Button asChild className="mt-4">
          <Link to="/mis-predicciones">Volver a Mis Predicciones</Link>
        </Button>
      </div>
    );
  }

  // Get champion prediction
  const championId = knockoutPredictions[finalMatch.matchId];
  const champion = championId ? getTeamById(championId) : null;

  // Get third place prediction
  const thirdPlaceWinnerId = knockoutPredictions[thirdPlaceMatch.matchId];
  const thirdPlaceWinner = thirdPlaceWinnerId ? getTeamById(thirdPlaceWinnerId) : null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">Inicio</Link>
        <span>/</span>
        <Link to="/mis-predicciones" className="hover:text-foreground">Mis Predicciones</Link>
        <span>/</span>
        <span className="font-medium text-foreground">{predictionSet.name}</span>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{predictionSet.name}</h1>
          <p className="text-sm text-muted-foreground">
            Creada: {new Date(predictionSet.created_at).toLocaleDateString()}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to={`/repechajes?setId=${id}`}>Editar Prediccion</Link>
        </Button>
      </div>

      {/* Champion Display */}
      {champion && (
        <Card className="mb-6 border-yellow-400 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-4">
              <span className="text-4xl">🏆</span>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Prediccion de Campeon</p>
                <div className="flex items-center gap-3">
                  <img
                    src={champion.flag_url}
                    alt={champion.name}
                    className="w-12 h-8 object-cover rounded shadow"
                  />
                  <span className="text-2xl font-bold">{champion.name}</span>
                </div>
              </div>
              <span className="text-4xl">🏆</span>
            </div>
          </CardContent>
        </Card>
      )}

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
        <Badge variant={totalKnockout === 32 ? 'default' : 'secondary'}>
          Eliminatorias: {totalKnockout}/32
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

      {/* Knockout Predictions Section */}
      {totalKnockout > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Eliminatorias</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Round breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
              <RoundSummary label="R32" count={r32Count} total={16} />
              <RoundSummary label="R16" count={r16Count} total={8} />
              <RoundSummary label="Cuartos" count={qfCount} total={4} />
              <RoundSummary label="Semis" count={sfCount} total={2} />
              <RoundSummary label="3er Lugar" count={thirdPlaceCount} total={1} />
              <RoundSummary label="Final" count={finalCount} total={1} />
            </div>

            {/* Final Four Display */}
            {sfCount === 2 && (
              <div className="border-t pt-4 mt-4">
                <p className="text-sm font-medium mb-3">Semifinalistas</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {semiFinalsStructure.map(sf => {
                    const teamAId = knockoutPredictions[sf.teamA.from];
                    const teamBId = knockoutPredictions[sf.teamB.from];
                    const teamA = teamAId ? getTeamById(teamAId) : null;
                    const teamB = teamBId ? getTeamById(teamBId) : null;
                    return [teamA, teamB].filter(Boolean).map((team, idx) => (
                      <div key={`${sf.matchId}-${idx}`} className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded">
                        <img
                          src={team.flag_url}
                          alt={team.name}
                          className="w-6 h-4 object-cover rounded"
                        />
                        <span className="text-sm font-medium">{team.name}</span>
                      </div>
                    ));
                  })}
                </div>
              </div>
            )}

            {/* Podium */}
            {(champion || thirdPlaceWinner) && (
              <div className="border-t pt-4 mt-4">
                <p className="text-sm font-medium mb-3">Podio</p>
                <div className="flex justify-center gap-4 flex-wrap">
                  {/* Second Place */}
                  {champion && knockoutPredictions[finalMatch.matchId] && (
                    <div className="text-center">
                      <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center mb-2">
                        <span className="text-3xl">🥈</span>
                      </div>
                      <p className="text-xs text-muted-foreground">2do Lugar</p>
                      {(() => {
                        const finalistA = knockoutPredictions[semiFinalsStructure[0].matchId];
                        const finalistB = knockoutPredictions[semiFinalsStructure[1].matchId];
                        const runnerUpId = championId === finalistA ? finalistB : finalistA;
                        const runnerUp = runnerUpId ? getTeamById(runnerUpId) : null;
                        return runnerUp ? (
                          <div className="flex items-center justify-center gap-1 mt-1">
                            <img src={runnerUp.flag_url} alt={runnerUp.name} className="w-5 h-3 object-cover rounded" />
                            <span className="text-xs">{runnerUp.name}</span>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}

                  {/* Champion */}
                  {champion && (
                    <div className="text-center -mt-4">
                      <div className="w-24 h-24 bg-yellow-100 border-2 border-yellow-400 rounded-lg flex items-center justify-center mb-2">
                        <span className="text-4xl">🥇</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Campeon</p>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <img src={champion.flag_url} alt={champion.name} className="w-5 h-3 object-cover rounded" />
                        <span className="text-xs font-bold">{champion.name}</span>
                      </div>
                    </div>
                  )}

                  {/* Third Place */}
                  {thirdPlaceWinner && (
                    <div className="text-center">
                      <div className="w-20 h-20 bg-amber-100 rounded-lg flex items-center justify-center mb-2">
                        <span className="text-3xl">🥉</span>
                      </div>
                      <p className="text-xs text-muted-foreground">3er Lugar</p>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <img src={thirdPlaceWinner.flag_url} alt={thirdPlaceWinner.name} className="w-5 h-3 object-cover rounded" />
                        <span className="text-xs">{thirdPlaceWinner.name}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mt-4">
              <Button variant="outline" size="sm" asChild>
                <Link to={`/eliminatorias?setId=${id}`}>Ver/Editar Bracket Completo</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t">
        <Button variant="outline" asChild>
          <Link to="/mis-predicciones">Volver a Mis Predicciones</Link>
        </Button>
        <Button asChild>
          <Link to={`/repechajes?setId=${id}`}>Editar Prediccion</Link>
        </Button>
      </div>
    </div>
  );
}

function RoundSummary({ label, count, total }) {
  const isComplete = count === total;
  return (
    <div className={`p-3 rounded-lg border text-center ${isComplete ? 'bg-green-50 border-green-200' : 'bg-muted'}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${isComplete ? 'text-green-600' : ''}`}>
        {count}/{total}
      </p>
    </div>
  );
}
