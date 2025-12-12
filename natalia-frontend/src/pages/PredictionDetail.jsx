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
    // Handle string vs number comparison
    const finalId = typeof selection.final === 'string' ? parseInt(selection.final, 10) : selection.final;
    return playoff.teams.find(t => t.id === finalId);
  };

  // Get team by ID
  const getTeamById = (teamId) => {
    // Handle string vs number
    const numId = typeof teamId === 'string' ? parseInt(teamId, 10) : teamId;
    const team = mockTeams.find(t => t.id === numId);
    if (!team) return null;

    if (team.is_playoff) {
      const playoffEntry = Object.entries(playoffToTeamId).find(([_, tid]) => tid === numId);
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
            <div className="flex flex-wrap gap-2">
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
            {/* Round by round matches - showing both teams and winner */}
            <div className="space-y-6">
              {/* Dieciseisavos (Round of 32) */}
              <RoundMatches
                label="Dieciseisavos de Final"
                matches={roundOf32Structure}
                getTeamById={getTeamById}
                knockoutPredictions={knockoutPredictions}
                predictions={predictions}
                bestThirdPlaces={bestThirdPlaces}
              />

              {/* Octavos de Final */}
              <RoundMatches
                label="Octavos de Final"
                matches={roundOf16Structure}
                getTeamById={getTeamById}
                knockoutPredictions={knockoutPredictions}
                predictions={predictions}
                bestThirdPlaces={bestThirdPlaces}
              />

              {/* Cuartos de Final */}
              <RoundMatches
                label="Cuartos de Final"
                matches={quarterFinalsStructure}
                getTeamById={getTeamById}
                knockoutPredictions={knockoutPredictions}
                predictions={predictions}
                bestThirdPlaces={bestThirdPlaces}
              />

              {/* Semifinal */}
              <RoundMatches
                label="Semifinales"
                matches={semiFinalsStructure}
                getTeamById={getTeamById}
                knockoutPredictions={knockoutPredictions}
                predictions={predictions}
                bestThirdPlaces={bestThirdPlaces}
                allMatches={semiFinalsStructure}
              />

              {/* Tercer Puesto */}
              <RoundMatches
                label="Tercer Puesto"
                matches={[thirdPlaceMatch]}
                getTeamById={getTeamById}
                knockoutPredictions={knockoutPredictions}
                predictions={predictions}
                bestThirdPlaces={bestThirdPlaces}
                allMatches={semiFinalsStructure}
              />

              {/* Final */}
              <RoundMatches
                label="Final"
                matches={[finalMatch]}
                getTeamById={getTeamById}
                knockoutPredictions={knockoutPredictions}
                predictions={predictions}
                bestThirdPlaces={bestThirdPlaces}
                allMatches={semiFinalsStructure}
              />
            </div>

            {/* Podium at bottom */}
            {(champion || thirdPlaceWinner) && (
              <div className="mt-6 pt-4 border-t">
                <p className="text-sm font-medium mb-3">Podio</p>
                <div className="flex justify-center gap-4 flex-wrap">
                  {/* Second Place */}
                  {champion && knockoutPredictions[finalMatch.matchId] && (
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center mb-1">
                        <span className="text-2xl">🥈</span>
                      </div>
                      <p className="text-xs text-muted-foreground">2do</p>
                      {(() => {
                        const finalistA = knockoutPredictions[semiFinalsStructure[0].matchId];
                        const finalistB = knockoutPredictions[semiFinalsStructure[1].matchId];
                        const runnerUpId = championId === finalistA ? finalistB : finalistA;
                        const runnerUp = runnerUpId ? getTeamById(runnerUpId) : null;
                        return runnerUp ? (
                          <div className="flex items-center justify-center gap-1 mt-1">
                            <img src={runnerUp.flag_url} alt={runnerUp.name} className="w-5 h-3 object-cover rounded" />
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}

                  {/* Champion */}
                  {champion && (
                    <div className="text-center -mt-2">
                      <div className="w-20 h-20 bg-yellow-100 border-2 border-yellow-400 rounded-lg flex items-center justify-center mb-1">
                        <span className="text-3xl">🥇</span>
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
                      <div className="w-16 h-16 bg-amber-100 rounded-lg flex items-center justify-center mb-1">
                        <span className="text-2xl">🥉</span>
                      </div>
                      <p className="text-xs text-muted-foreground">3ro</p>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <img src={thirdPlaceWinner.flag_url} alt={thirdPlaceWinner.name} className="w-5 h-3 object-cover rounded" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t">
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

// Componente para mostrar un partido con los dos equipos y el ganador resaltado
function MatchBox({ match, getTeamById, knockoutPredictions, predictions, bestThirdPlaces, allMatches }) {
  const winnerId = knockoutPredictions[match.matchId];

  // Encontrar el perdedor de un partido de semifinal
  const findLoserOfMatch = (matchId) => {
    const sfWinner = knockoutPredictions[matchId];
    if (!sfWinner) return null;

    // Buscar la estructura del partido en todas las rondas
    const sfMatch = allMatches?.find(m => m.matchId === matchId);
    if (!sfMatch) return null;

    // Obtener los dos equipos que jugaron esa semifinal
    const teamAId = knockoutPredictions[sfMatch.teamA?.from];
    const teamBId = knockoutPredictions[sfMatch.teamB?.from];

    // El perdedor es el que no es el ganador
    const loserId = teamAId === sfWinner ? teamBId : teamAId;
    return loserId ? getTeamById(loserId) : null;
  };

  // Resolver equipos del partido basado en la estructura de knockoutBracket.js
  const resolveTeamSource = (source) => {
    if (!source) return null;

    // R32 - equipos directos de grupos
    if (source.type === 'winner' && source.group) {
      // 1ro del grupo
      const groupPreds = predictions[source.group];
      if (!groupPreds || !groupPreds[0]) return null;
      return getTeamById(groupPreds[0]);
    }

    if (source.type === 'runner_up' && source.group) {
      // 2do del grupo
      const groupPreds = predictions[source.group];
      if (!groupPreds || !groupPreds[1]) return null;
      return getTeamById(groupPreds[1]);
    }

    if (source.type === 'third_place' && source.pools) {
      // Mejor tercero de un pool de grupos
      const matchedGroup = bestThirdPlaces.find(g => source.pools.includes(g));
      if (!matchedGroup) return null;
      const groupPreds = predictions[matchedGroup];
      if (!groupPreds || !groupPreds[2]) return null;
      const team = getTeamById(groupPreds[2]);
      if (team) {
        return { ...team, thirdPlaceFrom: matchedGroup };
      }
      return null;
    }

    // R16 y posteriores - ganador de partido previo
    if (source.from) {
      // Si tiene position='loser', es para el partido de 3er puesto
      if (source.position === 'loser') {
        return findLoserOfMatch(source.from);
      }
      // Ganador del partido previo (default o position='winner')
      const prevWinner = knockoutPredictions[source.from];
      if (!prevWinner) return null;
      return getTeamById(prevWinner);
    }

    return null;
  };

  const teamA = resolveTeamSource(match.teamA);
  const teamB = resolveTeamSource(match.teamB);
  const winner = winnerId ? getTeamById(winnerId) : null;

  const TeamSlot = ({ team, isWinner }) => {
    if (!team) {
      return (
        <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground bg-muted/30 border-b last:border-b-0">
          <span className="w-5 h-3 bg-gray-200 rounded"></span>
          <span>Por definir</span>
        </div>
      );
    }

    return (
      <div className={`flex items-center gap-2 px-2 py-1 text-xs border-b last:border-b-0 ${isWinner ? 'bg-green-100 font-semibold' : 'bg-white'}`}>
        <img src={team.flag_url} alt={team.name} className="w-5 h-3 object-cover rounded" />
        <span className="truncate">{team.name}</span>
        {team.thirdPlaceFrom && <span className="text-[10px] text-muted-foreground">3{team.thirdPlaceFrom}</span>}
        {isWinner && <span className="ml-auto text-green-600">✓</span>}
      </div>
    );
  };

  return (
    <div className="border rounded overflow-hidden w-[160px] shrink-0">
      <TeamSlot team={teamA} isWinner={winner && teamA && winner.id === teamA.id} />
      <TeamSlot team={teamB} isWinner={winner && teamB && winner.id === teamB.id} />
    </div>
  );
}

// Componente para mostrar una ronda completa con partidos
function RoundMatches({ label, matches, getTeamById, knockoutPredictions, predictions, bestThirdPlaces, allMatches }) {
  if (!matches || matches.length === 0) return null;

  const completedCount = matches.filter(m => knockoutPredictions[m.matchId]).length;

  return (
    <div>
      <p className="text-sm font-medium mb-2">{label} ({completedCount}/{matches.length})</p>
      <div className="flex flex-wrap gap-2">
        {matches.map((match) => (
          <MatchBox
            key={match.matchId}
            match={match}
            getTeamById={getTeamById}
            knockoutPredictions={knockoutPredictions}
            predictions={predictions}
            bestThirdPlaces={bestThirdPlaces}
            allMatches={allMatches}
          />
        ))}
      </div>
    </div>
  );
}
