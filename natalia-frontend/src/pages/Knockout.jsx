import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { mockTeams } from '@/data/mockData';
import { playoffs } from '@/data/playoffsData';
import {
  roundOf32Structure,
  roundOf16Structure,
  quarterFinalsStructure,
  semiFinalsStructure,
  thirdPlaceMatch,
  finalMatch
} from '@/data/knockoutBracket';
import { getThirdPlaceAssignments } from '@/data/thirdPlaceCombinations';
import { predictionsAPI } from '@/services/api';

// Mapeo de playoff ID a team ID en mockTeams
const playoffToTeamId = {
  'UEFA_A': 6,
  'UEFA_B': 23,
  'UEFA_C': 16,
  'UEFA_D': 4,
  'FIFA_1': 42,
  'FIFA_2': 35,
};

export default function Knockout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setId = searchParams.get('setId');

  const [predictions, setPredictions] = useState({});
  const [playoffSelections, setPlayoffSelections] = useState({});
  const [bestThirdPlaces, setBestThirdPlaces] = useState([]);
  const [knockoutPredictions, setKnockoutPredictions] = useState({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [activeRound, setActiveRound] = useState('r32');

  useEffect(() => {
    const loadData = async () => {
      // Si hay setId, solo cargar del servidor (sin fallback a localStorage)
      if (setId) {
        try {
          // Cargar predicciones de grupos del servidor
          const groupsResponse = await predictionsAPI.getMy(setId);
          if (groupsResponse.data?.groupPredictions?.length > 0) {
            const grouped = {};
            groupsResponse.data.groupPredictions.forEach(gp => {
              if (!grouped[gp.group_letter]) {
                grouped[gp.group_letter] = [];
              }
              grouped[gp.group_letter][gp.predicted_position - 1] = gp.team_id;
            });
            setPredictions(grouped);
          }

          // Cargar playoffs del servidor
          const playoffsResponse = await predictionsAPI.getPlayoffs(setId);
          if (playoffsResponse.data && Object.keys(playoffsResponse.data).length > 0) {
            setPlayoffSelections(playoffsResponse.data);
          }

          // Cargar terceros del servidor
          const thirdResponse = await predictionsAPI.getThirdPlaces(setId);
          if (thirdResponse.data?.selectedGroups) {
            const groups = thirdResponse.data.selectedGroups.split('');
            setBestThirdPlaces(groups);
          }

          // Cargar knockout del servidor
          const knockoutResponse = await predictionsAPI.getKnockout(setId);
          if (knockoutResponse.data && Object.keys(knockoutResponse.data).length > 0) {
            setKnockoutPredictions(knockoutResponse.data);
          }
          // Si no hay datos, empezar en blanco
        } catch (err) {
          console.error('Error loading data:', err);
        }
      } else {
        // Sin setId: comportamiento legacy con localStorage
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

        const savedKnockout = localStorage.getItem('natalia_knockout');
        if (savedKnockout) {
          setKnockoutPredictions(JSON.parse(savedKnockout));
        }
      }
    };
    loadData();
  }, [setId]);

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

  // Get team by position (1A, 2B, 3C, etc.)
  const getTeamByPosition = (position, group) => {
    const groupPredictions = predictions[group];
    if (!groupPredictions) return null;

    let index;
    if (position.startsWith('1')) index = 0;
    else if (position.startsWith('2')) index = 1;
    else if (position.startsWith('3')) index = 2;
    else return null;

    const teamId = groupPredictions[index];
    return getTeamById(teamId);
  };

  // Get third place assignments based on selected best thirds
  const thirdPlaceAssignments = bestThirdPlaces.length === 8
    ? getThirdPlaceAssignments(bestThirdPlaces)
    : null;

  // Get winner of a match from predictions
  const getMatchWinner = (matchId) => {
    const winnerId = knockoutPredictions[matchId];
    if (!winnerId) return null;
    return getTeamById(winnerId);
  };

  // Get loser of a match from predictions
  const getMatchLoser = (matchId, teamAId, teamBId) => {
    const winnerId = knockoutPredictions[matchId];
    if (!winnerId) return null;
    const loserId = winnerId === teamAId ? teamBId : teamAId;
    return getTeamById(loserId);
  };

  // Build Round of 32 matches
  const buildR32Matches = () => {
    return roundOf32Structure.map(match => {
      let teamA = null;
      let teamB = null;

      if (match.teamA.type === 'winner') {
        teamA = getTeamByPosition(`1${match.teamA.group}`, match.teamA.group);
      } else if (match.teamA.type === 'runner_up') {
        teamA = getTeamByPosition(`2${match.teamA.group}`, match.teamA.group);
      }

      if (match.teamB.type === 'runner_up') {
        teamB = getTeamByPosition(`2${match.teamB.group}`, match.teamB.group);
      } else if (match.teamB.type === 'third_place') {
        if (thirdPlaceAssignments && thirdPlaceAssignments[match.matchId]) {
          const thirdGroup = thirdPlaceAssignments[match.matchId];
          teamB = getTeamByPosition(`3${thirdGroup}`, thirdGroup);
          if (teamB) {
            teamB = { ...teamB, thirdPlaceFrom: thirdGroup };
          }
        }
      }

      return {
        ...match,
        teamA,
        teamB,
        selectedWinner: knockoutPredictions[match.matchId] || null,
      };
    });
  };

  // Build Round of 16 matches
  const buildR16Matches = () => {
    return roundOf16Structure.map(match => {
      const teamA = getMatchWinner(match.teamA.from);
      const teamB = getMatchWinner(match.teamB.from);

      return {
        ...match,
        teamA,
        teamB,
        fromA: match.teamA.from,
        fromB: match.teamB.from,
        selectedWinner: knockoutPredictions[match.matchId] || null,
      };
    });
  };

  // Build Quarter Final matches
  const buildQFMatches = () => {
    return quarterFinalsStructure.map(match => {
      const teamA = getMatchWinner(match.teamA.from);
      const teamB = getMatchWinner(match.teamB.from);

      return {
        ...match,
        teamA,
        teamB,
        fromA: match.teamA.from,
        fromB: match.teamB.from,
        selectedWinner: knockoutPredictions[match.matchId] || null,
      };
    });
  };

  // Build Semi Final matches
  const buildSFMatches = () => {
    return semiFinalsStructure.map(match => {
      const teamA = getMatchWinner(match.teamA.from);
      const teamB = getMatchWinner(match.teamB.from);

      return {
        ...match,
        teamA,
        teamB,
        fromA: match.teamA.from,
        fromB: match.teamB.from,
        selectedWinner: knockoutPredictions[match.matchId] || null,
      };
    });
  };

  // Build Third Place match
  const buildThirdPlaceMatch = () => {
    // Get losers from semifinals
    const sf1 = semiFinalsStructure[0];
    const sf2 = semiFinalsStructure[1];

    const sf1TeamA = getMatchWinner(sf1.teamA.from);
    const sf1TeamB = getMatchWinner(sf1.teamB.from);
    const sf2TeamA = getMatchWinner(sf2.teamA.from);
    const sf2TeamB = getMatchWinner(sf2.teamB.from);

    let teamA = null;
    let teamB = null;

    if (knockoutPredictions[sf1.matchId] && sf1TeamA && sf1TeamB) {
      teamA = getMatchLoser(sf1.matchId, sf1TeamA.id, sf1TeamB.id);
    }
    if (knockoutPredictions[sf2.matchId] && sf2TeamA && sf2TeamB) {
      teamB = getMatchLoser(sf2.matchId, sf2TeamA.id, sf2TeamB.id);
    }

    return {
      ...thirdPlaceMatch,
      teamA,
      teamB,
      fromA: sf1.matchId,
      fromB: sf2.matchId,
      selectedWinner: knockoutPredictions[thirdPlaceMatch.matchId] || null,
    };
  };

  // Build Final match
  const buildFinalMatch = () => {
    const teamA = getMatchWinner(finalMatch.teamA.from);
    const teamB = getMatchWinner(finalMatch.teamB.from);

    return {
      ...finalMatch,
      teamA,
      teamB,
      fromA: finalMatch.teamA.from,
      fromB: finalMatch.teamB.from,
      selectedWinner: knockoutPredictions[finalMatch.matchId] || null,
    };
  };

  const r32Matches = buildR32Matches();
  const r16Matches = buildR16Matches();
  const qfMatches = buildQFMatches();
  const sfMatches = buildSFMatches();
  const thirdPlace = buildThirdPlaceMatch();
  const final = buildFinalMatch();

  const selectWinner = (matchId, teamId) => {
    setKnockoutPredictions(prev => {
      const newPredictions = { ...prev, [matchId]: teamId };

      // Clear dependent predictions when changing a result
      const clearDependents = (mId) => {
        // R32 -> R16
        roundOf16Structure.forEach(m => {
          if (m.teamA.from === mId || m.teamB.from === mId) {
            delete newPredictions[m.matchId];
            clearDependents(m.matchId);
          }
        });
        // R16 -> QF
        quarterFinalsStructure.forEach(m => {
          if (m.teamA.from === mId || m.teamB.from === mId) {
            delete newPredictions[m.matchId];
            clearDependents(m.matchId);
          }
        });
        // QF -> SF
        semiFinalsStructure.forEach(m => {
          if (m.teamA.from === mId || m.teamB.from === mId) {
            delete newPredictions[m.matchId];
            clearDependents(m.matchId);
          }
        });
        // SF -> Final/3rd
        if (thirdPlaceMatch.teamA.from === mId || thirdPlaceMatch.teamB.from === mId) {
          delete newPredictions[thirdPlaceMatch.matchId];
        }
        if (finalMatch.teamA.from === mId || finalMatch.teamB.from === mId) {
          delete newPredictions[finalMatch.matchId];
        }
      };

      // Only clear if changing an existing prediction
      if (prev[matchId] && prev[matchId] !== teamId) {
        clearDependents(matchId);
      }

      return newPredictions;
    });
    setSaved(false);
  };

  // Count completed matches per round
  const r32Complete = r32Matches.filter(m => m.selectedWinner).length;
  const r16Complete = r16Matches.filter(m => m.selectedWinner).length;
  const qfComplete = qfMatches.filter(m => m.selectedWinner).length;
  const sfComplete = sfMatches.filter(m => m.selectedWinner).length;
  const thirdPlaceComplete = thirdPlace.selectedWinner ? 1 : 0;
  const finalComplete = final.selectedWinner ? 1 : 0;

  const totalComplete = r32Complete + r16Complete + qfComplete + sfComplete + thirdPlaceComplete + finalComplete;
  const totalMatches = 16 + 8 + 4 + 2 + 1 + 1; // 32
  const isComplete = totalComplete === totalMatches;

  // Check if predictions are missing
  const missingPredictions = Object.keys(predictions).length === 0;
  const missingThirdPlaces = bestThirdPlaces.length !== 8;

  if (missingPredictions || missingThirdPlaces) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert className="mb-6">
          <AlertDescription>
            {missingPredictions && 'Debes completar las predicciones de grupos primero. '}
            {missingThirdPlaces && 'Debes seleccionar los 8 mejores terceros lugares primero.'}
          </AlertDescription>
        </Alert>
        <Button asChild>
          <Link to={missingPredictions ? '/grupos' : '/terceros'}>
            Ir a {missingPredictions ? 'Grupos' : 'Terceros'}
          </Link>
        </Button>
      </div>
    );
  }

  const rounds = [
    { id: 'r32', label: 'Round of 32', count: r32Complete, total: 16, next: 'r16' },
    { id: 'r16', label: 'Round of 16', count: r16Complete, total: 8, next: 'qf' },
    { id: 'qf', label: 'Cuartos', count: qfComplete, total: 4, next: 'sf' },
    { id: 'sf', label: 'Semis', count: sfComplete, total: 2, next: 'final' },
    { id: 'final', label: 'Final', count: thirdPlaceComplete + finalComplete, total: 2, next: null },
  ];

  const currentRound = rounds.find(r => r.id === activeRound);
  const isCurrentRoundComplete = currentRound?.count === currentRound?.total;

  const handleNextRound = () => {
    // Save progress
    localStorage.setItem('natalia_knockout', JSON.stringify(knockoutPredictions));
    // Go to next round
    if (currentRound?.next) {
      setActiveRound(currentRound.next);
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    setError(null);

    // Guardar en localStorage primero
    localStorage.setItem('natalia_knockout', JSON.stringify(knockoutPredictions));

    const nextUrl = setId ? `/prediccion/${setId}` : '/mis-predicciones';

    try {
      await predictionsAPI.saveKnockout(knockoutPredictions, setId);
      setSaved(true);
      setTimeout(() => {
        navigate(nextUrl);
      }, 1000);
    } catch (err) {
      setError('Error al guardar en servidor - Continuando con guardado local');
      setTimeout(() => {
        navigate(nextUrl);
      }, 1500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground flex-wrap">
        <Link to="/" className="hover:text-foreground">Inicio</Link>
        <span>/</span>
        <Link to="/repechajes" className="hover:text-foreground">Paso 1</Link>
        <span>/</span>
        <Link to="/grupos" className="hover:text-foreground">Paso 2</Link>
        <span>/</span>
        <Link to="/terceros" className="hover:text-foreground">Paso 3</Link>
        <span>/</span>
        <span className="font-medium text-foreground">Paso 4: Eliminatorias</span>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Eliminatorias</h1>
        <Badge variant={isComplete ? 'default' : 'secondary'}>
          {totalComplete}/{totalMatches} partidos
        </Badge>
      </div>

      {saved && (
        <Alert className="mb-6">
          <AlertDescription>
            Predicciones guardadas correctamente. Redirigiendo...
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Round selector tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {rounds.map(round => (
          <Button
            key={round.id}
            variant={activeRound === round.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveRound(round.id)}
            className="relative"
          >
            {round.label}
            <Badge
              variant={round.count === round.total ? 'default' : 'secondary'}
              className="ml-2 text-xs"
            >
              {round.count}/{round.total}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Round of 32 */}
      {activeRound === 'r32' && (
        <>
          <p className="text-muted-foreground mb-4">
            Selecciona al ganador de cada partido. Los 16 ganadores avanzaran al Round of 16.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {r32Matches.map(match => (
              <MatchCard
                key={match.matchId}
                match={match}
                onSelectWinner={selectWinner}
                showPosition={true}
              />
            ))}
          </div>
          <div className="flex justify-end mt-6">
            <Button
              onClick={handleNextRound}
              disabled={!isCurrentRoundComplete}
              size="lg"
            >
              Continuar a Round of 16
            </Button>
          </div>
        </>
      )}

      {/* Round of 16 */}
      {activeRound === 'r16' && (
        <>
          <p className="text-muted-foreground mb-4">
            Los ganadores del Round of 32 se enfrentan. Los 8 ganadores avanzaran a Cuartos de Final.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {r16Matches.map(match => (
              <MatchCard
                key={match.matchId}
                match={match}
                onSelectWinner={selectWinner}
                showFrom={true}
              />
            ))}
          </div>
          <div className="flex justify-end mt-6">
            <Button
              onClick={handleNextRound}
              disabled={!isCurrentRoundComplete}
              size="lg"
            >
              Continuar a Cuartos
            </Button>
          </div>
        </>
      )}

      {/* Quarter Finals */}
      {activeRound === 'qf' && (
        <>
          <p className="text-muted-foreground mb-4">
            Los 8 equipos restantes se enfrentan por un lugar en Semifinales.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {qfMatches.map(match => (
              <MatchCard
                key={match.matchId}
                match={match}
                onSelectWinner={selectWinner}
                showFrom={true}
              />
            ))}
          </div>
          <div className="flex justify-end mt-6">
            <Button
              onClick={handleNextRound}
              disabled={!isCurrentRoundComplete}
              size="lg"
            >
              Continuar a Semifinales
            </Button>
          </div>
        </>
      )}

      {/* Semi Finals */}
      {activeRound === 'sf' && (
        <>
          <p className="text-muted-foreground mb-4">
            Los 4 semifinalistas luchan por un lugar en la Final.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {sfMatches.map(match => (
              <MatchCard
                key={match.matchId}
                match={match}
                onSelectWinner={selectWinner}
                showFrom={true}
              />
            ))}
          </div>
          <div className="flex justify-end mt-6">
            <Button
              onClick={handleNextRound}
              disabled={!isCurrentRoundComplete}
              size="lg"
            >
              Continuar a la Final
            </Button>
          </div>
        </>
      )}

      {/* Final & Third Place */}
      {activeRound === 'final' && (
        <>
          <p className="text-muted-foreground mb-4">
            El partido por el tercer lugar y la Gran Final.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <MatchCard
              match={thirdPlace}
              onSelectWinner={selectWinner}
              showFrom={true}
              highlight="bronze"
            />
            <MatchCard
              match={final}
              onSelectWinner={selectWinner}
              showFrom={true}
              highlight="gold"
            />
          </div>

          {/* Champion display */}
          {final.selectedWinner && (
            <div className="mt-8 text-center">
              <h2 className="text-xl font-bold mb-4">Tu Prediccion de Campeon</h2>
              <div className="inline-flex items-center gap-4 p-6 bg-yellow-50 border-2 border-yellow-400 rounded-xl">
                <img
                  src={getTeamById(final.selectedWinner)?.flag_url}
                  alt="Champion"
                  className="w-16 h-10 object-cover rounded shadow"
                />
                <span className="text-2xl font-bold">
                  {getTeamById(final.selectedWinner)?.name}
                </span>
                <span className="text-3xl">🏆</span>
              </div>
            </div>
          )}

          {/* Finalizar button */}
          <div className="flex justify-end mt-6">
            <Button
              onClick={handleFinish}
              disabled={!isCurrentRoundComplete || saving}
              size="lg"
            >
              {saving ? 'Guardando...' : 'Finalizar Predicciones'}
            </Button>
          </div>
        </>
      )}

      {/* Bottom navigation - only show back button */}
      <div className="mt-8 pt-6 border-t">
        <Button variant="outline" asChild>
          <Link to={setId ? `/terceros?setId=${setId}` : '/terceros'}>Volver a Terceros</Link>
        </Button>
      </div>
    </div>
  );
}

function MatchCard({ match, onSelectWinner, showPosition = false, showFrom = false, highlight = null }) {
  const { matchId, matchNumber, teamA, teamB, selectedWinner, fromA, fromB, label } = match;

  const highlightStyles = {
    gold: 'border-yellow-400 bg-yellow-50',
    bronze: 'border-amber-600 bg-amber-50',
  };

  const TeamRow = ({ team, from, isSelected, onSelect, opponent }) => {
    if (!team) {
      return (
        <div className="flex items-center gap-2 p-2 bg-muted rounded text-muted-foreground">
          {showFrom && from && (
            <span className="text-xs font-medium text-muted-foreground">
              G.{from.replace('M', '')}
            </span>
          )}
          <span className="text-sm">Por definir</span>
        </div>
      );
    }

    const canSelect = opponent !== null;

    return (
      <button
        onClick={() => canSelect && onSelect(matchId, team.id)}
        disabled={!canSelect}
        className={`w-full flex items-center gap-2 p-2 rounded transition-all text-left
          ${isSelected
            ? 'bg-green-100 border-2 border-green-500'
            : canSelect
              ? 'bg-muted hover:bg-muted/80 border-2 border-transparent'
              : 'bg-muted opacity-50 cursor-not-allowed border-2 border-transparent'
          }`}
      >
        <img
          src={team.flag_url}
          alt={team.name}
          className="w-6 h-4 object-cover rounded"
        />
        <span className={`text-sm flex-1 truncate ${isSelected ? 'font-bold' : ''}`}>
          {team.name}
        </span>
        {team.thirdPlaceFrom && (
          <Badge variant="outline" className="text-xs">
            3{team.thirdPlaceFrom}
          </Badge>
        )}
        {isSelected && (
          <span className="text-green-600 text-sm">✓</span>
        )}
      </button>
    );
  };

  return (
    <Card className={`${selectedWinner ? 'border-green-200' : ''} ${highlight ? highlightStyles[highlight] : ''}`}>
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm font-medium">
            {label || `Partido ${matchNumber}`}
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {matchId}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 px-3 pb-3">
        <TeamRow
          team={teamA}
          from={fromA}
          isSelected={selectedWinner === teamA?.id}
          onSelect={onSelectWinner}
          opponent={teamB}
        />
        <div className="text-center text-xs text-muted-foreground">vs</div>
        <TeamRow
          team={teamB}
          from={fromB}
          isSelected={selectedWinner === teamB?.id}
          onSelect={onSelectWinner}
          opponent={teamA}
        />
      </CardContent>
    </Card>
  );
}
