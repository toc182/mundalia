import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { exportToCanvas } from '@/utils/exportCanvas';
import { mockTeams, getAllGroups, type Team } from '@/data/mockData';
import { playoffs, type Playoff } from '@/data/playoffsData';
import { getThirdPlaceCombination } from '@/data/thirdPlaceCombinations';
import {
  roundOf32Structure,
  roundOf16Structure,
  quarterFinalsStructure,
  semiFinalsStructure,
  thirdPlaceMatch,
  finalMatch,
  type RoundOf32Match,
  type KnockoutMatchStructure,
  type SpecialMatch,
  type TeamSlotFromGroup,
  type TeamSlotFromMatch,
} from '@/data/knockoutBracket';
import { predictionSetsAPI } from '@/services/api';
import {
  getTeamById as getTeamByIdHelper,
  getPlayoffWinner as getPlayoffWinnerHelper,
  type PlayoffWinnerTeam,
  type PlayoffSelections,
} from '@/utils/predictionHelpers';
import MatchBox from '@/components/MatchBox';

// API response type for prediction set detail
interface PredictionSetResponse {
  id: number;
  name: string;
  created_at: string;
  groupPredictions?: Array<{
    group_letter: string;
    team_id: number;
    predicted_position: number;
  }>;
  playoffPredictions?: PlayoffSelections;
  thirdPlaces?: string;
  knockoutPredictions?: Record<string, number>;
}

// Internal state types
interface PredictionSetState {
  id: number;
  name: string;
  created_at: string;
}

type GroupPredictions = Record<string, number[]>;
type KnockoutPredictions = Record<string, number>;

export default function PredictionDetail(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [predictionSet, setPredictionSet] = useState<PredictionSetState | null>(null);
  const [predictions, setPredictions] = useState<GroupPredictions>({});
  const [playoffSelections, setPlayoffSelections] = useState<PlayoffSelections>({});
  const [bestThirdPlaces, setBestThirdPlaces] = useState<string[]>([]);
  const [knockoutPredictions, setKnockoutPredictions] = useState<KnockoutPredictions>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);

  useEffect(() => {
    const loadPredictionSet = async (): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const response = await predictionSetsAPI.getById(Number(id));
        const data: PredictionSetResponse = response.data as unknown as PredictionSetResponse;

        setPredictionSet({
          id: data.id,
          name: data.name,
          created_at: data.created_at
        });

        // Group predictions - convert array to grouped object
        if (data.groupPredictions && data.groupPredictions.length > 0) {
          const grouped: GroupPredictions = {};
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

  // Get team by ID using centralized helper
  const getTeamById = (teamId: number | string | null | undefined): PlayoffWinnerTeam | null =>
    getTeamByIdHelper(teamId, playoffSelections);

  // Get playoff winner using centralized helper
  const getPlayoffWinner = (playoffId: string): Team | null =>
    getPlayoffWinnerHelper(playoffId, playoffSelections);

  // Export to image using Canvas API
  const handleExport = async (): Promise<void> => {
    if (!predictionSet) return;

    setExporting(true);
    try {
      const dataUrl = await exportToCanvas({
        predictionName: predictionSet.name,
        username: user?.username,
        predictions,
        knockoutPredictions,
        bestThirdPlaces,
        getTeamById,
      });

      const link = document.createElement('a');
      link.download = `${predictionSet.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error exporting:', err);
    } finally {
      setExporting(false);
    }
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
            {t('predictions.created')} {new Date(predictionSet.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span className="ml-2">{t('export.button')}</span>
          </Button>
          <Button variant="outline" asChild>
            <Link to={`/repechajes?setId=${id}`}>{t('common.edit')}</Link>
          </Button>
        </div>
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
            {playoffs.map((playoff: Playoff) => {
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

          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t">
        <Button variant="outline" asChild>
          <Link to="/mis-predicciones">{t('common.back')}</Link>
        </Button>
        <Button asChild>
          <Link to={`/repechajes?setId=${id}`}>{t('common.edit')}</Link>
        </Button>
      </div>
    </div>
  );
}

// Props for ReadonlyMatchBox component
interface ReadonlyMatchBoxProps {
  match: RoundOf32Match | KnockoutMatchStructure | SpecialMatch;
  getTeamById: (teamId: number | string | null | undefined) => PlayoffWinnerTeam | null;
  knockoutPredictions: KnockoutPredictions;
  predictions: GroupPredictions;
  bestThirdPlaces: string[];
  allMatches?: KnockoutMatchStructure[];
}

// Extended team type with third place info
interface MatchTeam extends PlayoffWinnerTeam {
  thirdPlaceFrom?: string;
}

// Componente wrapper que resuelve equipos y usa MatchBox unificado
function ReadonlyMatchBox({
  match,
  getTeamById,
  knockoutPredictions,
  predictions,
  bestThirdPlaces,
  allMatches
}: ReadonlyMatchBoxProps): JSX.Element {
  const winnerId = knockoutPredictions[match.matchId];

  // Encontrar el perdedor de un partido de semifinal
  const findLoserOfMatch = (matchId: string): PlayoffWinnerTeam | null => {
    const sfWinner = knockoutPredictions[matchId];
    if (!sfWinner) return null;

    const sfMatch = allMatches?.find(m => m.matchId === matchId);
    if (!sfMatch) return null;

    const teamAId = knockoutPredictions[sfMatch.teamA?.from];
    const teamBId = knockoutPredictions[sfMatch.teamB?.from];

    const loserId = teamAId === sfWinner ? teamBId : teamAId;
    return loserId ? getTeamById(loserId) : null;
  };

  // Resolver equipos del partido basado en la estructura de knockoutBracket.js
  const resolveTeamSource = (source: TeamSlotFromGroup | TeamSlotFromMatch | undefined): MatchTeam | null => {
    if (!source) return null;

    // Type guard for TeamSlotFromGroup
    if ('type' in source) {
      const groupSource = source as TeamSlotFromGroup;

      if (groupSource.type === 'winner' && groupSource.group) {
        const groupPreds = predictions[groupSource.group];
        if (!groupPreds || !groupPreds[0]) return null;
        return getTeamById(groupPreds[0]);
      }

      if (groupSource.type === 'runner_up' && groupSource.group) {
        const groupPreds = predictions[groupSource.group];
        if (!groupPreds || !groupPreds[1]) return null;
        return getTeamById(groupPreds[1]);
      }

      if (groupSource.type === 'third_place' && groupSource.pools) {
        const matchedGroup = bestThirdPlaces.find(g => groupSource.pools!.includes(g));
        if (!matchedGroup) return null;
        const groupPreds = predictions[matchedGroup];
        if (!groupPreds || !groupPreds[2]) return null;
        const team = getTeamById(groupPreds[2]);
        if (team) {
          return { ...team, thirdPlaceFrom: matchedGroup };
        }
        return null;
      }
    }

    // Type guard for TeamSlotFromMatch
    if ('from' in source) {
      const matchSource = source as TeamSlotFromMatch;

      if (matchSource.from) {
        if (matchSource.position === 'loser') {
          return findLoserOfMatch(matchSource.from);
        }
        const prevWinner = knockoutPredictions[matchSource.from];
        if (!prevWinner) return null;
        return getTeamById(prevWinner);
      }
    }

    return null;
  };

  const teamA = resolveTeamSource(match.teamA);
  const teamB = resolveTeamSource(match.teamB);

  return (
    <div className="w-[160px] shrink-0">
      <MatchBox
        teamA={teamA}
        teamB={teamB}
        selectedWinner={winnerId}
        readonly={true}
        size="sm"
      />
    </div>
  );
}

// Props for RoundMatches component
interface RoundMatchesProps {
  label: string;
  matches: RoundOf32Match[] | KnockoutMatchStructure[] | SpecialMatch[];
  getTeamById: (teamId: number | string | null | undefined) => PlayoffWinnerTeam | null;
  knockoutPredictions: KnockoutPredictions;
  predictions: GroupPredictions;
  bestThirdPlaces: string[];
  allMatches?: KnockoutMatchStructure[];
}

// Componente para mostrar una ronda completa con partidos
function RoundMatches({
  label,
  matches,
  getTeamById,
  knockoutPredictions,
  predictions,
  bestThirdPlaces,
  allMatches
}: RoundMatchesProps): JSX.Element | null {
  if (!matches || matches.length === 0) return null;

  const completedCount = matches.filter(m => knockoutPredictions[m.matchId]).length;

  return (
    <div>
      <p className="text-sm font-medium mb-2">{label} ({completedCount}/{matches.length})</p>
      <div className="flex flex-wrap gap-2">
        {matches.map((match) => (
          <ReadonlyMatchBox
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
