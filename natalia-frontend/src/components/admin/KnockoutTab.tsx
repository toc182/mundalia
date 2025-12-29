import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Save } from 'lucide-react';
import { adminAPI } from '@/services/api';
import { mockTeams } from '@/data/mockData';
import { playoffs } from '@/data/playoffsData';
import { PLAYOFF_TO_TEAM_ID } from '@/utils/predictionHelpers';
import {
  roundOf32Structure,
  roundOf16Structure,
  quarterFinalsStructure,
  semiFinalsStructure,
  thirdPlaceMatch,
  finalMatch,
} from '@/data/knockoutBracket';
import { getThirdPlaceAssignments, type ThirdPlaceAssignments } from '@/data/thirdPlaceCombinations';
import { AdminBracket } from './AdminBracket';
import type { MockTeam } from '@/data/mockData';
import type {
  KnockoutTabProps,
  LocalKnockoutResults,
  ExtendedMockTeam,
  AdminBracketMatchData,
} from '@/types/admin';

export function KnockoutTab({ realPlayoffs, realGroupStandings, realKnockout, onSave, showSuccess, setError }: KnockoutTabProps): JSX.Element {
  const [saving, setSaving] = useState<boolean>(false);
  const [localResults, setLocalResults] = useState<LocalKnockoutResults>({});

  // Initialize local results from database
  useEffect(() => {
    if (realKnockout && realKnockout.length > 0) {
      const results: LocalKnockoutResults = {};
      realKnockout.forEach(r => {
        results[r.match_key] = {
          winner: r.winner_team_id,
          scoreA: r.score_a ?? '',
          scoreB: r.score_b ?? ''
        };
      });
      setLocalResults(results);
    }
  }, [realKnockout]);

  // Get all teams including playoff winners
  const getAllTeams = useCallback((): MockTeam[] => {
    const teams = [...mockTeams];
    playoffs.forEach(p => {
      p.teams.forEach(t => {
        if (!teams.find(at => at.id === t.id)) {
          teams.push(t as MockTeam);
        }
      });
    });
    return teams;
  }, []);

  const allTeams = getAllTeams();

  // Get playoff winner team
  const getPlayoffWinner = useCallback((playoffId: string): MockTeam | null => {
    const result = realPlayoffs.find(r => r.playoff_id === playoffId);
    if (!result) return null;
    const playoff = playoffs.find(p => p.id === playoffId);
    return playoff?.teams.find(t => t.id === result.winner_team_id) as MockTeam || null;
  }, [realPlayoffs]);

  // Get team by ID, substituting playoff winners
  const getTeamById = useCallback((id: number | null): ExtendedMockTeam | null => {
    if (!id) return null;
    const team = allTeams.find(t => t.id === id);
    if (!team) return null;

    if (team.is_playoff) {
      const playoffEntry = Object.entries(PLAYOFF_TO_TEAM_ID).find(([, teamId]) => teamId === id);
      if (playoffEntry) {
        const winner = getPlayoffWinner(playoffEntry[0]);
        if (winner) {
          return { ...winner, id: team.id, isPlayoffWinner: true };
        }
      }
    }
    return team;
  }, [allTeams, getPlayoffWinner]);

  // Get team from group standings by position
  const getTeamByGroupPosition = useCallback((group: string, position: number): ExtendedMockTeam | null => {
    const standing = realGroupStandings.find(
      s => s.group_letter === group && s.final_position === position
    );
    if (!standing) return null;
    return getTeamById(standing.team_id);
  }, [realGroupStandings, getTeamById]);

  // Calculate 8 best third places from standings
  const getBestThirdPlaces = useCallback((): string[] => {
    const thirds = realGroupStandings
      .filter(s => s.final_position === 3)
      .map(s => s.group_letter)
      .sort();

    return thirds.slice(0, 8);
  }, [realGroupStandings]);

  const bestThirdPlaces = getBestThirdPlaces();
  const thirdPlaceAssignments: ThirdPlaceAssignments | null = bestThirdPlaces.length === 8
    ? getThirdPlaceAssignments(bestThirdPlaces)
    : null;

  // Get winner of a match from local results
  const getMatchWinner = useCallback((matchId: string): ExtendedMockTeam | null => {
    const result = localResults[matchId];
    if (!result?.winner) return null;
    return getTeamById(result.winner);
  }, [localResults, getTeamById]);

  // Get loser of a match
  const getMatchLoser = useCallback((matchId: string, teamAId: number | null, teamBId: number | null): ExtendedMockTeam | null => {
    const result = localResults[matchId];
    if (!result?.winner || !teamAId || !teamBId) return null;
    const loserId = result.winner === teamAId ? teamBId : teamAId;
    return getTeamById(loserId);
  }, [localResults, getTeamById]);

  // Build R32 matches
  const buildR32Matches = useCallback((): AdminBracketMatchData[] => {
    return roundOf32Structure.map(match => {
      let teamA: ExtendedMockTeam | null = null;
      let teamB: ExtendedMockTeam | null = null;

      if (match.teamA.type === 'winner') {
        teamA = getTeamByGroupPosition(match.teamA.group!, 1);
      } else if (match.teamA.type === 'runner_up') {
        teamA = getTeamByGroupPosition(match.teamA.group!, 2);
      }

      if (match.teamB.type === 'runner_up') {
        teamB = getTeamByGroupPosition(match.teamB.group!, 2);
      } else if (match.teamB.type === 'third_place') {
        if (thirdPlaceAssignments && thirdPlaceAssignments[match.matchId as keyof ThirdPlaceAssignments]) {
          const thirdGroup = thirdPlaceAssignments[match.matchId as keyof ThirdPlaceAssignments];
          teamB = getTeamByGroupPosition(thirdGroup, 3);
          if (teamB) {
            teamB = { ...teamB, thirdPlaceFrom: thirdGroup };
          }
        }
      }

      const result = localResults[match.matchId];
      return {
        ...match,
        teamA,
        teamB,
        selectedWinner: result?.winner || null,
        scoreA: result?.scoreA ?? '',
        scoreB: result?.scoreB ?? '',
      };
    });
  }, [getTeamByGroupPosition, thirdPlaceAssignments, localResults]);

  // Build R16 matches
  const buildR16Matches = useCallback((): AdminBracketMatchData[] => {
    return roundOf16Structure.map(match => {
      const teamA = getMatchWinner(match.teamA.from);
      const teamB = getMatchWinner(match.teamB.from);
      const result = localResults[match.matchId];

      return {
        ...match,
        teamA,
        teamB,
        fromA: match.teamA.from,
        fromB: match.teamB.from,
        selectedWinner: result?.winner || null,
        scoreA: result?.scoreA ?? '',
        scoreB: result?.scoreB ?? '',
      };
    });
  }, [getMatchWinner, localResults]);

  // Build QF matches
  const buildQFMatches = useCallback((): AdminBracketMatchData[] => {
    return quarterFinalsStructure.map(match => {
      const teamA = getMatchWinner(match.teamA.from);
      const teamB = getMatchWinner(match.teamB.from);
      const result = localResults[match.matchId];

      return {
        ...match,
        teamA,
        teamB,
        fromA: match.teamA.from,
        fromB: match.teamB.from,
        selectedWinner: result?.winner || null,
        scoreA: result?.scoreA ?? '',
        scoreB: result?.scoreB ?? '',
      };
    });
  }, [getMatchWinner, localResults]);

  // Build SF matches
  const buildSFMatches = useCallback((): AdminBracketMatchData[] => {
    return semiFinalsStructure.map(match => {
      const teamA = getMatchWinner(match.teamA.from);
      const teamB = getMatchWinner(match.teamB.from);
      const result = localResults[match.matchId];

      return {
        ...match,
        teamA,
        teamB,
        fromA: match.teamA.from,
        fromB: match.teamB.from,
        selectedWinner: result?.winner || null,
        scoreA: result?.scoreA ?? '',
        scoreB: result?.scoreB ?? '',
      };
    });
  }, [getMatchWinner, localResults]);

  // Build Third Place match
  const buildThirdPlaceMatch = useCallback((): AdminBracketMatchData => {
    const sf1 = semiFinalsStructure[0];
    const sf2 = semiFinalsStructure[1];

    const sf1TeamA = getMatchWinner(sf1.teamA.from);
    const sf1TeamB = getMatchWinner(sf1.teamB.from);
    const sf2TeamA = getMatchWinner(sf2.teamA.from);
    const sf2TeamB = getMatchWinner(sf2.teamB.from);

    let teamA: ExtendedMockTeam | null = null;
    let teamB: ExtendedMockTeam | null = null;

    if (localResults[sf1.matchId]?.winner && sf1TeamA && sf1TeamB) {
      teamA = getMatchLoser(sf1.matchId, sf1TeamA.id, sf1TeamB.id);
    }
    if (localResults[sf2.matchId]?.winner && sf2TeamA && sf2TeamB) {
      teamB = getMatchLoser(sf2.matchId, sf2TeamA.id, sf2TeamB.id);
    }

    const result = localResults[thirdPlaceMatch.matchId];
    return {
      ...thirdPlaceMatch,
      teamA,
      teamB,
      selectedWinner: result?.winner || null,
      scoreA: result?.scoreA ?? '',
      scoreB: result?.scoreB ?? '',
    };
  }, [getMatchWinner, getMatchLoser, localResults]);

  // Build Final match
  const buildFinalMatch = useCallback((): AdminBracketMatchData => {
    const teamA = getMatchWinner(finalMatch.teamA.from);
    const teamB = getMatchWinner(finalMatch.teamB.from);
    const result = localResults[finalMatch.matchId];

    return {
      ...finalMatch,
      teamA,
      teamB,
      selectedWinner: result?.winner || null,
      scoreA: result?.scoreA ?? '',
      scoreB: result?.scoreB ?? '',
    };
  }, [getMatchWinner, localResults]);

  const r32Matches = buildR32Matches();
  const r16Matches = buildR16Matches();
  const qfMatches = buildQFMatches();
  const sfMatches = buildSFMatches();
  const thirdPlace = buildThirdPlaceMatch();
  const final = buildFinalMatch();

  // Handle score change
  const handleScoreChange = useCallback((matchId: string, teamAId: number | null, teamBId: number | null, newScoreA: string, newScoreB: string): void => {
    setLocalResults(prev => {
      const scoreA = newScoreA === '' ? null : Number(newScoreA);
      const scoreB = newScoreB === '' ? null : Number(newScoreB);

      let winner = prev[matchId]?.winner || null;

      // Auto-derive winner if scores are different
      if (scoreA !== null && scoreB !== null) {
        if (scoreA > scoreB && teamAId) {
          winner = teamAId;
        } else if (scoreB > scoreA && teamBId) {
          winner = teamBId;
        } else if (scoreA === scoreB) {
          winner = prev[matchId]?.winner || null;
        }
      }

      return {
        ...prev,
        [matchId]: {
          winner,
          scoreA: newScoreA,
          scoreB: newScoreB
        }
      };
    });
  }, []);

  // Handle winner selection (for ties)
  const selectWinner = useCallback((matchId: string, teamId: number): void => {
    setLocalResults(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        winner: teamId
      }
    }));
  }, []);

  // Save all results
  const handleSaveAll = async (): Promise<void> => {
    setSaving(true);
    try {
      for (const [matchKey, result] of Object.entries(localResults)) {
        if (result.winner) {
          await adminAPI.saveKnockout(
            matchKey,
            result.winner,
            result.scoreA === '' ? null : Number(result.scoreA),
            result.scoreB === '' ? null : Number(result.scoreB)
          );
        }
      }
      await onSave();
      showSuccess('Resultados guardados');
    } catch {
      setError('Error guardando resultados');
    } finally {
      setSaving(false);
    }
  };

  // Count completed matches
  const completedCount = Object.values(localResults).filter(r => r.winner).length;

  // Check if group standings are available
  const hasGroupStandings = realGroupStandings && realGroupStandings.length > 0;

  if (!hasGroupStandings) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertDescription>
            Debes ingresar los resultados de los grupos primero para ver el bracket de eliminatorias.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-muted-foreground">
            Ingresa los marcadores de cada partido. Los equipos se determinan automaticamente segun los resultados de grupos.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Progreso: <span className="font-medium">{completedCount}/32</span> partidos
          </p>
        </div>
        <Button onClick={handleSaveAll} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Guardando...' : 'Guardar Todo'}
        </Button>
      </div>

      {/* Bracket visualization */}
      <div className="overflow-x-auto pb-4">
        <AdminBracket
          r32Matches={r32Matches}
          r16Matches={r16Matches}
          qfMatches={qfMatches}
          sfMatches={sfMatches}
          final={final}
          thirdPlace={thirdPlace}
          onScoreChange={handleScoreChange}
          onSelectWinner={selectWinner}
          getTeamById={getTeamById}
        />
      </div>

      {/* Bottom save button */}
      <div className="flex justify-center pt-4">
        <Button onClick={handleSaveAll} disabled={saving} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Guardando...' : 'Guardar Todo'}
        </Button>
      </div>
    </div>
  );
}

export default KnockoutTab;
