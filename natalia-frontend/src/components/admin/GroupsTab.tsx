import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, RotateCcw, Save, AlertTriangle } from 'lucide-react';
import { adminAPI } from '@/services/api';
import { getAllGroups, getTeamsByGroup } from '@/data/mockData';
import { playoffs } from '@/data/playoffsData';
import { PLAYOFF_TO_TEAM_ID } from '@/utils/predictionHelpers';
import { GROUP_MATCH_STRUCTURE, getMatchTeams } from '@/data/groupMatches';
import { calculateGroupStandings, type Team, type MatchScore, type GroupStandingsResult } from '@/utils/fifaTiebreaker';
import GroupStandingsTable from '@/components/GroupStandingsTable';
import TiebreakerModal from '@/components/TiebreakerModal';
import type {
  GroupsTabProps,
  LocalScores,
  TiebreakerDecisions,
  CurrentTiebreaker,
  ExtendedMockTeam,
} from '@/types/admin';

export function GroupsTab({ realPlayoffs, realGroupMatches, showSuccess, setError }: GroupsTabProps): JSX.Element {
  const groups = getAllGroups();
  const [savingAll, setSavingAll] = useState<boolean>(false);
  const [localScores, setLocalScores] = useState<LocalScores>({});
  const [tiebreakerDecisions, setTiebreakerDecisions] = useState<TiebreakerDecisions>({});
  const [showTiebreakerModal, setShowTiebreakerModal] = useState<boolean>(false);
  const [currentTiebreaker, setCurrentTiebreaker] = useState<CurrentTiebreaker | null>(null);

  // Initialize local scores from database when matches load
  useEffect(() => {
    if (realGroupMatches && realGroupMatches.length > 0) {
      const scoresByGroup: LocalScores = {};
      realGroupMatches.forEach(match => {
        const group = match.group_letter;
        if (!scoresByGroup[group]) scoresByGroup[group] = {};
        scoresByGroup[group][match.match_index + 1] = {
          a: match.score_a ?? '',
          b: match.score_b ?? '',
          team_a_id: match.team_a_id,
          team_b_id: match.team_b_id
        };
      });
      setLocalScores(scoresByGroup);
    }
  }, [realGroupMatches]);

  // Get teams for a group, substituting playoff winners
  const getGroupTeams = useCallback((groupLetter: string): ExtendedMockTeam[] => {
    const teams = getTeamsByGroup(groupLetter);

    return teams.map(team => {
      if (team.is_playoff) {
        const playoffId = Object.keys(PLAYOFF_TO_TEAM_ID).find(
          key => PLAYOFF_TO_TEAM_ID[key] === team.id
        );
        if (playoffId) {
          const playoffResult = realPlayoffs.find(r => r.playoff_id === playoffId);
          if (playoffResult) {
            const playoff = playoffs.find(p => p.id === playoffId);
            const winnerTeam = playoff?.teams.find(t => t.id === playoffResult.winner_team_id);
            if (winnerTeam) {
              return {
                ...team,
                name: winnerTeam.name,
                code: winnerTeam.code,
                flag_url: winnerTeam.flag_url,
                actualTeamId: playoffResult.winner_team_id
              };
            }
          }
        }
      }
      return team;
    });
  }, [realPlayoffs]);

  // Calculate standings dynamically using FIFA tiebreaker rules
  const groupStandings = useMemo<Record<string, GroupStandingsResult>>(() => {
    const standings: Record<string, GroupStandingsResult> = {};
    groups.forEach(groupLetter => {
      const teams = getGroupTeams(groupLetter);
      const groupScores = localScores[groupLetter] || {};
      const decision = tiebreakerDecisions[groupLetter];
      const result = calculateGroupStandings(teams as Team[], groupScores as Record<number, MatchScore>, decision || null);
      standings[groupLetter] = result;
    });
    return standings;
  }, [localScores, getGroupTeams, groups, tiebreakerDecisions]);

  // Handle score change - also clears tiebreaker decision for that group
  const handleScoreChange = useCallback((groupLetter: string, matchNumber: number, side: 'a' | 'b', value: string): void => {
    const cleaned = value.replace(/[^0-9]/g, '');
    const parsed = cleaned === '' ? '' : Math.min(99, Math.max(0, parseInt(cleaned, 10)));

    setLocalScores(prev => ({
      ...prev,
      [groupLetter]: {
        ...prev[groupLetter],
        [matchNumber]: {
          ...prev[groupLetter]?.[matchNumber],
          [side]: parsed
        }
      }
    }));

    // Clear tiebreaker decision for this group since scores changed
    setTiebreakerDecisions(prev => {
      if (prev[groupLetter]) {
        const { [groupLetter]: _, ...rest } = prev;
        return rest;
      }
      return prev;
    });
  }, []);

  // Save all groups at once (no reload to preserve tiebreaker decisions)
  const handleSaveAll = async (): Promise<void> => {
    setSavingAll(true);
    try {
      for (const groupLetter of groups) {
        const teams = getGroupTeams(groupLetter);
        const groupScores = localScores[groupLetter] || {};

        const matches = GROUP_MATCH_STRUCTURE.map(match => {
          const { teamA, teamB } = getMatchTeams(teams as Team[], match.matchNumber);
          const score = groupScores[match.matchNumber] || {};

          return {
            match_index: match.matchNumber - 1,
            team_a_id: (teamA as ExtendedMockTeam)?.actualTeamId || teamA?.id,
            team_b_id: (teamB as ExtendedMockTeam)?.actualTeamId || teamB?.id,
            score_a: score.a === '' ? null : score.a,
            score_b: score.b === '' ? null : score.b
          };
        });

        await adminAPI.saveGroupMatches(groupLetter, matches);
      }
      // Don't reload data to preserve local state and tiebreaker decisions
      showSuccess('Todos los grupos guardados');
    } catch {
      setError('Error guardando grupos');
    } finally {
      setSavingAll(false);
    }
  };

  // Reset group scores
  const handleResetGroup = useCallback((groupLetter: string): void => {
    setLocalScores(prev => {
      const { [groupLetter]: _, ...rest } = prev;
      return rest;
    });
    // Also clear tiebreaker for this group
    setTiebreakerDecisions(prev => {
      const { [groupLetter]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  // Open tiebreaker modal for a specific tie
  const openTiebreakerModal = useCallback((groupLetter: string, tie: any): void => {
    setCurrentTiebreaker({ group: groupLetter, ...tie });
    setShowTiebreakerModal(true);
  }, []);

  // Handle tiebreaker resolution
  const handleTiebreakerResolve = useCallback((group: string, resolvedOrder: number[]): void => {
    setTiebreakerDecisions(prev => ({
      ...prev,
      [group]: {
        tiedTeamIds: currentTiebreaker?.teams?.map((t: any) => t.teamId) || [],
        resolvedOrder,
      },
    }));
    setShowTiebreakerModal(false);
    setCurrentTiebreaker(null);
  }, [currentTiebreaker]);

  // Count completed matches
  const getCompletedCount = useCallback((groupLetter: string): number => {
    const groupScores = localScores[groupLetter] || {};
    return Object.values(groupScores).filter(
      s => s && s.a !== null && s.a !== undefined && s.a !== '' &&
           s.b !== null && s.b !== undefined && s.b !== ''
    ).length;
  }, [localScores]);

  // Total progress
  const totalCompleted = groups.reduce((sum, g) => sum + getCompletedCount(g), 0);
  const totalMatches = 72; // 12 groups x 6 matches

  return (
    <div className="space-y-4">
      {/* Header with save all button */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-muted-foreground">
            Ingresa los marcadores de cada partido. Las posiciones se calculan automaticamente con reglas FIFA.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Progreso: <span className="font-medium">{totalCompleted}/{totalMatches}</span> partidos
          </p>
        </div>
        <Button
          onClick={handleSaveAll}
          disabled={savingAll}
        >
          <Save className="h-4 w-4 mr-2" />
          {savingAll ? 'Guardando...' : 'Guardar Todo'}
        </Button>
      </div>

      {/* All groups displayed */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.map(groupLetter => {
          const teams = getGroupTeams(groupLetter);
          const groupScores = localScores[groupLetter] || {};
          const completedCount = getCompletedCount(groupLetter);
          const standingsResult = groupStandings[groupLetter];

          return (
            <Card key={groupLetter} className={standingsResult?.isComplete ? 'border-green-300' : ''}>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    Grupo {groupLetter}
                    {standingsResult?.isComplete && <Check className="h-4 w-4 text-green-600" />}
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">{completedCount}/6</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Match inputs by day */}
                {[1, 2, 3].map(day => {
                  const dayMatches = GROUP_MATCH_STRUCTURE.filter(m => m.matchDay === day);
                  return (
                    <div key={day}>
                      <div className="text-xs font-medium text-muted-foreground mb-1">
                        Jornada {day}
                      </div>
                      <div className="space-y-1">
                        {dayMatches.map(match => {
                          const { teamA, teamB } = getMatchTeams(teams as Team[], match.matchNumber);
                          const score = groupScores[match.matchNumber] || {};

                          return (
                            <div key={match.matchNumber} className="flex items-center gap-1 py-1 border-b last:border-b-0">
                              {/* Team A */}
                              <div className="flex items-center gap-1 flex-1 justify-end min-w-0">
                                <span className="text-xs truncate text-right">{teamA?.name || 'TBD'}</span>
                                {teamA?.flag_url && (
                                  <img src={teamA.flag_url} alt="" className="w-5 h-3 object-cover rounded flex-shrink-0" />
                                )}
                              </div>

                              {/* Scores */}
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  maxLength={2}
                                  value={score.a ?? ''}
                                  onChange={(e) => handleScoreChange(groupLetter, match.matchNumber, 'a', e.target.value)}
                                  className="w-8 h-7 text-center border rounded text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                                  placeholder="-"
                                />
                                <span className="text-muted-foreground text-xs">-</span>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  maxLength={2}
                                  value={score.b ?? ''}
                                  onChange={(e) => handleScoreChange(groupLetter, match.matchNumber, 'b', e.target.value)}
                                  className="w-8 h-7 text-center border rounded text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                                  placeholder="-"
                                />
                              </div>

                              {/* Team B */}
                              <div className="flex items-center gap-1 flex-1 min-w-0">
                                {teamB?.flag_url && (
                                  <img src={teamB.flag_url} alt="" className="w-5 h-3 object-cover rounded flex-shrink-0" />
                                )}
                                <span className="text-xs truncate">{teamB?.name || 'TBD'}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Dynamic standings table using FIFA tiebreaker rules */}
                <GroupStandingsTable
                  standings={standingsResult?.standings}
                  isComplete={standingsResult?.isComplete}
                />

                {/* Unresolvable tie warning with resolve button */}
                {standingsResult?.unresolvableTie && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-yellow-800">{standingsResult.unresolvableTie.reason}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full border-yellow-400 text-yellow-800 hover:bg-yellow-100"
                      onClick={() => openTiebreakerModal(groupLetter, standingsResult.unresolvableTie!)}
                    >
                      Resolver empate
                    </Button>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleResetGroup(groupLetter)}
                    disabled={savingAll || completedCount === 0}
                    className="text-muted-foreground"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Limpiar
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Bottom save button */}
      <div className="flex justify-center pt-4">
        <Button
          onClick={handleSaveAll}
          disabled={savingAll}
          size="lg"
        >
          <Save className="h-4 w-4 mr-2" />
          {savingAll ? 'Guardando...' : 'Guardar Todo'}
        </Button>
      </div>

      {/* Tiebreaker Modal */}
      {showTiebreakerModal && currentTiebreaker && (
        <TiebreakerModal
          tie={currentTiebreaker}
          onResolve={handleTiebreakerResolve}
          onClose={() => {
            setShowTiebreakerModal(false);
            setCurrentTiebreaker(null);
          }}
        />
      )}
    </div>
  );
}

export default GroupsTab;
