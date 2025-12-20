import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { adminAPI } from '@/services/api';
import { mockTeams, getAllGroups, getTeamsByGroup } from '@/data/mockData';
import { playoffs } from '@/data/playoffsData';
import { PLAYOFF_TO_TEAM_ID } from '@/utils/predictionHelpers';
import { GROUP_MATCH_STRUCTURE, getMatchTeams } from '@/data/groupMatches';
import {
  roundOf32Structure,
  roundOf16Structure,
  quarterFinalsStructure,
  semiFinalsStructure,
  thirdPlaceMatch,
  finalMatch
} from '@/data/knockoutBracket';
import { getThirdPlaceAssignments } from '@/data/thirdPlaceCombinations';
import { calculateGroupStandings } from '@/utils/fifaTiebreaker';
import GroupStandingsTable from '@/components/GroupStandingsTable';
import TiebreakerModal from '@/components/TiebreakerModal';
import { Shield, Users, Trophy, ListOrdered, Check, X, RotateCcw, Save, AlertTriangle } from 'lucide-react';

export default function Admin() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Real results from database
  const [realPlayoffs, setRealPlayoffs] = useState([]);
  const [realGroupMatches, setRealGroupMatches] = useState([]);
  const [realGroupStandings, setRealGroupStandings] = useState([]);
  const [realKnockout, setRealKnockout] = useState([]);

  // Timer ref for cleanup
  const successTimerRef = useRef(null);

  const loadData = useCallback(async () => {
    if (!user || user.role !== 'admin') return;
    setLoading(true);
    try {
      const [statsRes, playoffsRes, matchesRes, standingsRes, knockoutRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getPlayoffs(),
        adminAPI.getGroupMatches(),
        adminAPI.getGroupStandings(),
        adminAPI.getKnockout()
      ]);
      setStats(statsRes.data);
      setRealPlayoffs(playoffsRes.data);
      setRealGroupMatches(matchesRes.data);
      setRealGroupStandings(standingsRes.data);
      setRealKnockout(knockoutRes.data);
    } catch {
      setError('Error cargando datos');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  const showSuccess = (msg) => {
    setSuccess(msg);
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    successTimerRef.current = setTimeout(() => setSuccess(null), 3000);
  };

  const tabs = [
    { id: 'stats', label: 'Dashboard', icon: Shield },
    { id: 'playoffs', label: 'Repechajes', icon: Trophy },
    { id: 'groups', label: 'Grupos', icon: ListOrdered },
    { id: 'knockout', label: 'Eliminatorias', icon: Trophy },
  ];

  // Check admin access (after hooks)
  if (!user) {
    return <Navigate to="/login" />;
  }

  if (user.role !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>No tienes acceso a esta pagina.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Shield className="h-6 w-6" />
        Panel de Administracion
      </h1>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-4 bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map(tab => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'outline'}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2"
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'stats' && (
        <StatsTab stats={stats} />
      )}

      {activeTab === 'playoffs' && (
        <PlayoffsTab
          realPlayoffs={realPlayoffs}
          onSave={loadData}
          showSuccess={showSuccess}
          setError={setError}
        />
      )}

      {activeTab === 'groups' && (
        <GroupsTab
          realPlayoffs={realPlayoffs}
          realGroupMatches={realGroupMatches}
          showSuccess={showSuccess}
          setError={setError}
        />
      )}

      {activeTab === 'knockout' && (
        <KnockoutTab
          realPlayoffs={realPlayoffs}
          realGroupStandings={realGroupStandings}
          realKnockout={realKnockout}
          onSave={loadData}
          showSuccess={showSuccess}
          setError={setError}
        />
      )}
    </div>
  );
}

// ============================================
// STATS TAB
// ============================================
function StatsTab({ stats }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats?.total_users || 0}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Predicciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats?.total_predictions || 0}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Progreso Resultados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Repechajes:</span>
              <span className="font-medium">{stats?.playoffs_entered || 0}/6</span>
            </div>
            <div className="flex justify-between">
              <span>Grupos:</span>
              <span className="font-medium">{stats?.groups_entered || 0}/12</span>
            </div>
            <div className="flex justify-between">
              <span>Eliminatorias:</span>
              <span className="font-medium">{stats?.knockout_entered || 0}/32</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// PLAYOFFS TAB
// ============================================
function PlayoffsTab({ realPlayoffs, onSave, showSuccess, setError }) {
  const [saving, setSaving] = useState(null);

  const getPlayoffWinner = (playoffId) => {
    const result = realPlayoffs.find(r => r.playoff_id === playoffId);
    return result?.winner_team_id;
  };

  const getWinnerTeam = (playoffId) => {
    const winnerId = getPlayoffWinner(playoffId);
    if (!winnerId) return null;
    const playoff = playoffs.find(p => p.id === playoffId);
    return playoff?.teams.find(t => t.id === winnerId);
  };

  const handleSave = async (playoffId, winnerId) => {
    setSaving(playoffId);
    try {
      await adminAPI.savePlayoff(playoffId, winnerId);
      await onSave();
      showSuccess(`Resultado de ${playoffId} guardado`);
    } catch {
      setError('Error guardando resultado');
    } finally {
      setSaving(null);
    }
  };

  // Count completed playoffs
  const completedCount = realPlayoffs.length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground mb-4">
        Selecciona el equipo que gano cada repechaje y clasifico al Mundial.
      </p>

      {/* Summary of classified teams */}
      {completedCount > 0 && (
        <Card className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-800 dark:text-green-300">
              Equipos Clasificados ({completedCount}/6)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {playoffs.map(playoff => {
                const winner = getWinnerTeam(playoff.id);
                if (!winner) return null;
                return (
                  <div key={playoff.id} className="flex items-center gap-1 bg-white dark:bg-background px-2 py-1 rounded border">
                    <img src={winner.flag_url} alt="" className="w-5 h-3 object-cover" />
                    <span className="text-xs font-medium">{winner.name}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {playoffs.map(playoff => {
          const currentWinner = getPlayoffWinner(playoff.id);

          return (
            <Card key={playoff.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{playoff.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {playoff.teams.map(team => (
                    <button
                      key={team.id}
                      onClick={() => handleSave(playoff.id, team.id)}
                      disabled={saving === playoff.id}
                      className={`w-full flex items-center gap-2 p-2 rounded border transition-colors
                        ${currentWinner === team.id
                          ? 'bg-green-100 border-green-500 dark:bg-green-900/30'
                          : 'hover:bg-muted'
                        }`}
                    >
                      <img src={team.flag_url} alt="" className="w-6 h-4 object-cover" />
                      <span className="flex-1 text-left text-sm">{team.name}</span>
                      {currentWinner === team.id && (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// GROUPS TAB - Score Input Mode (All groups expanded)
// ============================================
function GroupsTab({ realPlayoffs, realGroupMatches, showSuccess, setError }) {
  const groups = getAllGroups();
  const [savingAll, setSavingAll] = useState(false);
  const [localScores, setLocalScores] = useState({}); // { A: { 1: { a: 2, b: 1 }, ... }, ... }
  const [tiebreakerDecisions, setTiebreakerDecisions] = useState({}); // { A: { tiedTeamIds, resolvedOrder }, ... }
  const [showTiebreakerModal, setShowTiebreakerModal] = useState(false);
  const [currentTiebreaker, setCurrentTiebreaker] = useState(null);

  // Initialize local scores from database when matches load
  useEffect(() => {
    if (realGroupMatches && realGroupMatches.length > 0) {
      const scoresByGroup = {};
      realGroupMatches.forEach(match => {
        const group = match.group_letter;
        if (!scoresByGroup[group]) scoresByGroup[group] = {};
        scoresByGroup[group][match.match_index + 1] = {
          a: match.score_a,
          b: match.score_b,
          team_a_id: match.team_a_id,
          team_b_id: match.team_b_id
        };
      });
      setLocalScores(scoresByGroup);
    }
  }, [realGroupMatches]);

  // Get teams for a group, substituting playoff winners
  const getGroupTeams = useCallback((groupLetter) => {
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
  const groupStandings = useMemo(() => {
    const standings = {};
    groups.forEach(groupLetter => {
      const teams = getGroupTeams(groupLetter);
      const groupScores = localScores[groupLetter] || {};
      const decision = tiebreakerDecisions[groupLetter];
      const result = calculateGroupStandings(teams, groupScores, decision);
      standings[groupLetter] = result;
    });
    return standings;
  }, [localScores, getGroupTeams, groups, tiebreakerDecisions]);

  // Handle score change - also clears tiebreaker decision for that group
  const handleScoreChange = useCallback((groupLetter, matchNumber, side, value) => {
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
  const handleSaveAll = async () => {
    setSavingAll(true);
    try {
      for (const groupLetter of groups) {
        const teams = getGroupTeams(groupLetter);
        const groupScores = localScores[groupLetter] || {};

        const matches = GROUP_MATCH_STRUCTURE.map(match => {
          const { teamA, teamB } = getMatchTeams(teams, match.matchNumber);
          const score = groupScores[match.matchNumber] || {};

          return {
            match_index: match.matchNumber - 1,
            team_a_id: teamA?.actualTeamId || teamA?.id,
            team_b_id: teamB?.actualTeamId || teamB?.id,
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
  const handleResetGroup = useCallback((groupLetter) => {
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
  const openTiebreakerModal = useCallback((groupLetter, tie) => {
    setCurrentTiebreaker({ group: groupLetter, ...tie });
    setShowTiebreakerModal(true);
  }, []);

  // Handle tiebreaker resolution
  const handleTiebreakerResolve = useCallback((group, resolvedOrder) => {
    setTiebreakerDecisions(prev => ({
      ...prev,
      [group]: {
        tiedTeamIds: currentTiebreaker?.teams?.map(t => t.teamId) || [],
        resolvedOrder,
      },
    }));
    setShowTiebreakerModal(false);
    setCurrentTiebreaker(null);
  }, [currentTiebreaker]);

  // Count completed matches
  const getCompletedCount = useCallback((groupLetter) => {
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
                          const { teamA, teamB } = getMatchTeams(teams, match.matchNumber);
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
                      onClick={() => openTiebreakerModal(groupLetter, standingsResult.unresolvableTie)}
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

// ============================================
// KNOCKOUT TAB - Bracket visualization with scores
// ============================================
function KnockoutTab({ realPlayoffs, realGroupStandings, realKnockout, onSave, showSuccess, setError }) {
  const [saving, setSaving] = useState(false);
  const [localResults, setLocalResults] = useState({}); // { matchKey: { winner: id, scoreA: num, scoreB: num } }

  // Initialize local results from database
  useEffect(() => {
    if (realKnockout && realKnockout.length > 0) {
      const results = {};
      realKnockout.forEach(r => {
        results[r.match_key] = {
          winner: r.winner_team_id,
          scoreA: r.score_a,
          scoreB: r.score_b
        };
      });
      setLocalResults(results);
    }
  }, [realKnockout]);

  // Get all teams including playoff winners
  const getAllTeams = useCallback(() => {
    const teams = [...mockTeams];
    playoffs.forEach(p => {
      p.teams.forEach(t => {
        if (!teams.find(at => at.id === t.id)) {
          teams.push(t);
        }
      });
    });
    return teams;
  }, []);

  const allTeams = getAllTeams();

  // Get playoff winner team
  const getPlayoffWinner = useCallback((playoffId) => {
    const result = realPlayoffs.find(r => r.playoff_id === playoffId);
    if (!result) return null;
    const playoff = playoffs.find(p => p.id === playoffId);
    return playoff?.teams.find(t => t.id === result.winner_team_id);
  }, [realPlayoffs]);

  // Get team by ID, substituting playoff winners
  const getTeamById = useCallback((id) => {
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
  const getTeamByGroupPosition = useCallback((group, position) => {
    const standing = realGroupStandings.find(
      s => s.group_letter === group && s.final_position === position
    );
    if (!standing) return null;
    return getTeamById(standing.team_id);
  }, [realGroupStandings, getTeamById]);

  // Calculate 8 best third places from standings
  const getBestThirdPlaces = useCallback(() => {
    const thirds = realGroupStandings
      .filter(s => s.final_position === 3)
      .map(s => s.group_letter)
      .sort();

    // For now, take first 8 groups alphabetically that have 3rd place teams
    // In reality, FIFA ranks them by points/GD but we don't have that data
    return thirds.slice(0, 8);
  }, [realGroupStandings]);

  const bestThirdPlaces = getBestThirdPlaces();
  const thirdPlaceAssignments = bestThirdPlaces.length === 8
    ? getThirdPlaceAssignments(bestThirdPlaces)
    : null;

  // Get winner of a match from local results
  const getMatchWinner = useCallback((matchId) => {
    const result = localResults[matchId];
    if (!result?.winner) return null;
    return getTeamById(result.winner);
  }, [localResults, getTeamById]);

  // Get loser of a match
  const getMatchLoser = useCallback((matchId, teamAId, teamBId) => {
    const result = localResults[matchId];
    if (!result?.winner) return null;
    const loserId = result.winner === teamAId ? teamBId : teamAId;
    return getTeamById(loserId);
  }, [localResults, getTeamById]);

  // Build R32 matches
  const buildR32Matches = useCallback(() => {
    return roundOf32Structure.map(match => {
      let teamA = null;
      let teamB = null;

      if (match.teamA.type === 'winner') {
        teamA = getTeamByGroupPosition(match.teamA.group, 1);
      } else if (match.teamA.type === 'runner_up') {
        teamA = getTeamByGroupPosition(match.teamA.group, 2);
      }

      if (match.teamB.type === 'runner_up') {
        teamB = getTeamByGroupPosition(match.teamB.group, 2);
      } else if (match.teamB.type === 'third_place') {
        if (thirdPlaceAssignments && thirdPlaceAssignments[match.matchId]) {
          const thirdGroup = thirdPlaceAssignments[match.matchId];
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
  const buildR16Matches = useCallback(() => {
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
  const buildQFMatches = useCallback(() => {
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
  const buildSFMatches = useCallback(() => {
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
  const buildThirdPlaceMatch = useCallback(() => {
    const sf1 = semiFinalsStructure[0];
    const sf2 = semiFinalsStructure[1];

    const sf1TeamA = getMatchWinner(sf1.teamA.from);
    const sf1TeamB = getMatchWinner(sf1.teamB.from);
    const sf2TeamA = getMatchWinner(sf2.teamA.from);
    const sf2TeamB = getMatchWinner(sf2.teamB.from);

    let teamA = null;
    let teamB = null;

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
  const buildFinalMatch = useCallback(() => {
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
  const handleScoreChange = useCallback((matchId, teamAId, teamBId, newScoreA, newScoreB) => {
    setLocalResults(prev => {
      const scoreA = newScoreA === '' ? null : Number(newScoreA);
      const scoreB = newScoreB === '' ? null : Number(newScoreB);

      let winner = prev[matchId]?.winner;

      // Auto-derive winner if scores are different
      if (scoreA !== null && scoreB !== null) {
        if (scoreA > scoreB && teamAId) {
          winner = teamAId;
        } else if (scoreB > scoreA && teamBId) {
          winner = teamBId;
        } else if (scoreA === scoreB) {
          // Tie - keep existing winner or clear
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
  const selectWinner = useCallback((matchId, teamId) => {
    setLocalResults(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        winner: teamId
      }
    }));
  }, []);

  // Save all results
  const handleSaveAll = async () => {
    setSaving(true);
    try {
      for (const [matchKey, result] of Object.entries(localResults)) {
        if (result.winner) {
          await adminAPI.saveKnockout(
            matchKey,
            result.winner,
            result.scoreA === '' ? null : result.scoreA,
            result.scoreB === '' ? null : result.scoreB
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

// Admin Bracket Match component
function AdminBracketMatch({ match, onScoreChange, onSelectWinner, matchWidth }) {
  if (!match) return null;
  const canSelect = match.teamA && match.teamB;
  const isTied = match.scoreA !== '' && match.scoreB !== '' &&
                Number(match.scoreA) === Number(match.scoreB);

  const renderTeamSlot = (team, isTop, side) => {
    const isSelected = match.selectedWinner === team?.id;
    const isEliminated = match.selectedWinner && match.selectedWinner !== team?.id;
    const teamScore = side === 'a' ? match.scoreA : match.scoreB;

    const canClick = canSelect && isTied;

    if (!team) {
      return (
        <div className={`flex items-center h-[28px] px-2 py-0.5 text-[11px] text-muted-foreground bg-muted/30 border-x border-t ${!isTop ? 'border-b rounded-b' : 'rounded-t'} border-dashed border-gray-300`}>
          <span className="flex-1">Por definir</span>
          <span className="w-8 text-center">-</span>
        </div>
      );
    }

    return (
      <div className={`flex items-center h-[28px] ${isTop ? 'rounded-t border-x border-t' : 'rounded-b border'}
        ${isSelected ? 'bg-green-100 border-green-500' : isEliminated ? 'bg-gray-50 border-gray-300' : 'bg-white border-gray-300'}`}
      >
        <button
          onClick={() => canClick && onSelectWinner(match.matchId, team.id)}
          disabled={!canClick}
          className={`flex items-center gap-1.5 flex-1 px-2 py-0.5 text-left transition-colors min-w-0
            ${isSelected ? 'font-semibold' : ''}
            ${!isSelected && !isEliminated && canClick ? 'hover:bg-blue-50' : ''}
          `}
        >
          <img src={team.flag_url} alt="" className={`w-5 h-3 object-cover rounded shrink-0 ${isEliminated ? 'opacity-50' : ''}`} />
          <span className={`text-[11px] truncate ${isEliminated ? 'text-gray-400' : ''}`}>{team.name}</span>
          {team.thirdPlaceFrom && <span className="text-[9px] text-muted-foreground">3{team.thirdPlaceFrom}</span>}
        </button>

        <input
          type="text"
          inputMode="numeric"
          maxLength={2}
          defaultValue={teamScore ?? ''}
          key={`${match.matchId}-${side}-${teamScore ?? 'empty'}`}
          onBlur={(e) => {
            const val = e.target.value.replace(/[^0-9]/g, '');
            const num = val === '' ? '' : Math.min(99, parseInt(val, 10));
            onScoreChange(
              match.matchId,
              match.teamA?.id,
              match.teamB?.id,
              side === 'a' ? num : match.scoreA,
              side === 'b' ? num : match.scoreB
            );
          }}
          disabled={!canSelect}
          className="w-8 h-6 mx-0.5 text-center border border-gray-300 rounded text-sm font-bold bg-white
            focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary
            disabled:bg-muted disabled:cursor-not-allowed
            placeholder:text-gray-400"
          placeholder="-"
        />
      </div>
    );
  };

  return (
    <div style={{ width: matchWidth }} className="shrink-0">
      {renderTeamSlot(match.teamA, true, 'a')}
      {renderTeamSlot(match.teamB, false, 'b')}
      {isTied && !match.selectedWinner && (
        <div className="text-[9px] text-center py-0.5 bg-yellow-50 text-yellow-700 border border-t-0 border-yellow-200 rounded-b">
          Click para elegir ganador
        </div>
      )}
    </div>
  );
}

// Full bracket visualization for Admin
function AdminBracket({ r32Matches, r16Matches, qfMatches, sfMatches, final, thirdPlace, onScoreChange, onSelectWinner, getTeamById }) {
  // Visual order for bracket
  const r32VisualOrder = [
    'M74', 'M77', 'M73', 'M75', 'M83', 'M84', 'M81', 'M82',
    'M76', 'M78', 'M79', 'M80', 'M86', 'M88', 'M85', 'M87',
  ];
  const r16VisualOrder = ['M89', 'M90', 'M93', 'M94', 'M91', 'M92', 'M95', 'M96'];
  const qfVisualOrder = ['M97', 'M98', 'M99', 'M100'];
  const sfVisualOrder = ['M101', 'M102'];

  const getMatchById = (matches, id) => matches.find(m => m.matchId === id);

  const r32Ordered = r32VisualOrder.map(id => getMatchById(r32Matches, id)).filter(Boolean);
  const r16Ordered = r16VisualOrder.map(id => getMatchById(r16Matches, id)).filter(Boolean);
  const qfOrdered = qfVisualOrder.map(id => getMatchById(qfMatches, id)).filter(Boolean);
  const sfOrdered = sfVisualOrder.map(id => getMatchById(sfMatches, id)).filter(Boolean);

  // Dimensions
  const MATCH_HEIGHT = 68;
  const MATCH_WIDTH = 180;
  const CONNECTOR_WIDTH = 24;
  const TITLE_HEIGHT = 24;
  const R32_GAP = 8;

  const getMatchCenterY = (index, gap) => {
    return TITLE_HEIGHT + (MATCH_HEIGHT / 2) + index * (MATCH_HEIGHT + gap);
  };

  const getColumnHeight = (count, gap) => {
    return TITLE_HEIGHT + count * MATCH_HEIGHT + (count - 1) * gap;
  };

  const r32Height = getColumnHeight(16, R32_GAP);

  return (
    <div className="relative min-w-max" style={{ height: r32Height + 150 }}>
      {/* Round titles */}
      <div className="absolute text-xs font-semibold text-center text-muted-foreground"
           style={{ left: 0, top: 0, width: MATCH_WIDTH }}>Dieciseisavos</div>
      <div className="absolute text-xs font-semibold text-center text-muted-foreground"
           style={{ left: MATCH_WIDTH + CONNECTOR_WIDTH, top: 0, width: MATCH_WIDTH }}>Octavos</div>
      <div className="absolute text-xs font-semibold text-center text-muted-foreground"
           style={{ left: (MATCH_WIDTH + CONNECTOR_WIDTH) * 2, top: 0, width: MATCH_WIDTH }}>Cuartos</div>
      <div className="absolute text-xs font-semibold text-center text-muted-foreground"
           style={{ left: (MATCH_WIDTH + CONNECTOR_WIDTH) * 3, top: 0, width: MATCH_WIDTH }}>Semifinales</div>
      <div className="absolute text-xs font-semibold text-center text-muted-foreground"
           style={{ left: (MATCH_WIDTH + CONNECTOR_WIDTH) * 4, top: 0, width: MATCH_WIDTH }}>Final</div>

      {/* R32 - 16 matches */}
      {r32Ordered.map((match, i) => (
        <div key={match.matchId} className="absolute"
             style={{ left: 0, top: TITLE_HEIGHT + i * (MATCH_HEIGHT + R32_GAP) }}>
          <div className="text-[9px] text-muted-foreground mb-0.5">{match.matchId}</div>
          <AdminBracketMatch match={match} onScoreChange={onScoreChange} onSelectWinner={onSelectWinner} matchWidth={MATCH_WIDTH} />
        </div>
      ))}

      {/* Connectors R32 → R16 */}
      <svg className="absolute pointer-events-none"
           style={{ left: MATCH_WIDTH, top: 0, width: CONNECTOR_WIDTH, height: r32Height }}>
        {Array.from({ length: 8 }, (_, i) => {
          const topMatchCenter = getMatchCenterY(i * 2, R32_GAP);
          const bottomMatchCenter = getMatchCenterY(i * 2 + 1, R32_GAP);
          const nextMatchCenter = (topMatchCenter + bottomMatchCenter) / 2;
          const midX = CONNECTOR_WIDTH / 2;

          return (
            <g key={i} className="text-gray-300">
              <line x1="0" y1={topMatchCenter} x2={midX} y2={topMatchCenter} stroke="currentColor" strokeWidth="1" />
              <line x1="0" y1={bottomMatchCenter} x2={midX} y2={bottomMatchCenter} stroke="currentColor" strokeWidth="1" />
              <line x1={midX} y1={topMatchCenter} x2={midX} y2={bottomMatchCenter} stroke="currentColor" strokeWidth="1" />
              <line x1={midX} y1={nextMatchCenter} x2={CONNECTOR_WIDTH} y2={nextMatchCenter} stroke="currentColor" strokeWidth="1" />
            </g>
          );
        })}
      </svg>

      {/* R16 - 8 matches */}
      {r16Ordered.map((match, i) => {
        const topR32Center = getMatchCenterY(i * 2, R32_GAP);
        const bottomR32Center = getMatchCenterY(i * 2 + 1, R32_GAP);
        const centerY = (topR32Center + bottomR32Center) / 2 - MATCH_HEIGHT / 2;

        return (
          <div key={match.matchId} className="absolute"
               style={{ left: MATCH_WIDTH + CONNECTOR_WIDTH, top: centerY }}>
            <div className="text-[9px] text-muted-foreground mb-0.5">{match.matchId}</div>
            <AdminBracketMatch match={match} onScoreChange={onScoreChange} onSelectWinner={onSelectWinner} matchWidth={MATCH_WIDTH} />
          </div>
        );
      })}

      {/* Connectors R16 → QF */}
      <svg className="absolute pointer-events-none"
           style={{ left: MATCH_WIDTH * 2 + CONNECTOR_WIDTH, top: 0, width: CONNECTOR_WIDTH, height: r32Height }}>
        {Array.from({ length: 4 }, (_, i) => {
          const topIdx = i * 2;
          const bottomIdx = i * 2 + 1;
          const topR16Center = (getMatchCenterY(topIdx * 2, R32_GAP) + getMatchCenterY(topIdx * 2 + 1, R32_GAP)) / 2;
          const bottomR16Center = (getMatchCenterY(bottomIdx * 2, R32_GAP) + getMatchCenterY(bottomIdx * 2 + 1, R32_GAP)) / 2;
          const nextMatchCenter = (topR16Center + bottomR16Center) / 2;
          const midX = CONNECTOR_WIDTH / 2;

          return (
            <g key={i} className="text-gray-300">
              <line x1="0" y1={topR16Center} x2={midX} y2={topR16Center} stroke="currentColor" strokeWidth="1" />
              <line x1="0" y1={bottomR16Center} x2={midX} y2={bottomR16Center} stroke="currentColor" strokeWidth="1" />
              <line x1={midX} y1={topR16Center} x2={midX} y2={bottomR16Center} stroke="currentColor" strokeWidth="1" />
              <line x1={midX} y1={nextMatchCenter} x2={CONNECTOR_WIDTH} y2={nextMatchCenter} stroke="currentColor" strokeWidth="1" />
            </g>
          );
        })}
      </svg>

      {/* QF - 4 matches */}
      {qfOrdered.map((match, i) => {
        const topR32 = getMatchCenterY(i * 4, R32_GAP);
        const bottomR32 = getMatchCenterY(i * 4 + 3, R32_GAP);
        const centerY = (topR32 + bottomR32) / 2 - MATCH_HEIGHT / 2;

        return (
          <div key={match.matchId} className="absolute"
               style={{ left: (MATCH_WIDTH + CONNECTOR_WIDTH) * 2, top: centerY }}>
            <div className="text-[9px] text-muted-foreground mb-0.5">{match.matchId}</div>
            <AdminBracketMatch match={match} onScoreChange={onScoreChange} onSelectWinner={onSelectWinner} matchWidth={MATCH_WIDTH} />
          </div>
        );
      })}

      {/* Connectors QF → SF */}
      <svg className="absolute pointer-events-none"
           style={{ left: MATCH_WIDTH * 3 + CONNECTOR_WIDTH * 2, top: 0, width: CONNECTOR_WIDTH, height: r32Height }}>
        {Array.from({ length: 2 }, (_, i) => {
          const topIdx = i * 2;
          const bottomIdx = i * 2 + 1;
          const topQFCenter = (getMatchCenterY(topIdx * 4, R32_GAP) + getMatchCenterY(topIdx * 4 + 3, R32_GAP)) / 2;
          const bottomQFCenter = (getMatchCenterY(bottomIdx * 4, R32_GAP) + getMatchCenterY(bottomIdx * 4 + 3, R32_GAP)) / 2;
          const nextMatchCenter = (topQFCenter + bottomQFCenter) / 2;
          const midX = CONNECTOR_WIDTH / 2;

          return (
            <g key={i} className="text-gray-300">
              <line x1="0" y1={topQFCenter} x2={midX} y2={topQFCenter} stroke="currentColor" strokeWidth="1" />
              <line x1="0" y1={bottomQFCenter} x2={midX} y2={bottomQFCenter} stroke="currentColor" strokeWidth="1" />
              <line x1={midX} y1={topQFCenter} x2={midX} y2={bottomQFCenter} stroke="currentColor" strokeWidth="1" />
              <line x1={midX} y1={nextMatchCenter} x2={CONNECTOR_WIDTH} y2={nextMatchCenter} stroke="currentColor" strokeWidth="1" />
            </g>
          );
        })}
      </svg>

      {/* SF - 2 matches */}
      {sfOrdered.map((match, i) => {
        const topR32 = getMatchCenterY(i * 8, R32_GAP);
        const bottomR32 = getMatchCenterY(i * 8 + 7, R32_GAP);
        const centerY = (topR32 + bottomR32) / 2 - MATCH_HEIGHT / 2;

        return (
          <div key={match.matchId} className="absolute"
               style={{ left: (MATCH_WIDTH + CONNECTOR_WIDTH) * 3, top: centerY }}>
            <div className="text-[9px] text-muted-foreground mb-0.5">{match.matchId}</div>
            <AdminBracketMatch match={match} onScoreChange={onScoreChange} onSelectWinner={onSelectWinner} matchWidth={MATCH_WIDTH} />
          </div>
        );
      })}

      {/* Connector SF → Final */}
      <svg className="absolute pointer-events-none"
           style={{ left: MATCH_WIDTH * 4 + CONNECTOR_WIDTH * 3, top: 0, width: CONNECTOR_WIDTH, height: r32Height }}>
        {(() => {
          const topSFCenter = (getMatchCenterY(0, R32_GAP) + getMatchCenterY(7, R32_GAP)) / 2;
          const bottomSFCenter = (getMatchCenterY(8, R32_GAP) + getMatchCenterY(15, R32_GAP)) / 2;
          const finalCenter = (topSFCenter + bottomSFCenter) / 2;
          const midX = CONNECTOR_WIDTH / 2;

          return (
            <g className="text-gray-300">
              <line x1="0" y1={topSFCenter} x2={midX} y2={topSFCenter} stroke="currentColor" strokeWidth="1" />
              <line x1="0" y1={bottomSFCenter} x2={midX} y2={bottomSFCenter} stroke="currentColor" strokeWidth="1" />
              <line x1={midX} y1={topSFCenter} x2={midX} y2={bottomSFCenter} stroke="currentColor" strokeWidth="1" />
              <line x1={midX} y1={finalCenter} x2={CONNECTOR_WIDTH} y2={finalCenter} stroke="currentColor" strokeWidth="1" />
            </g>
          );
        })()}
      </svg>

      {/* Final */}
      {(() => {
        const topSFCenter = (getMatchCenterY(0, R32_GAP) + getMatchCenterY(7, R32_GAP)) / 2;
        const bottomSFCenter = (getMatchCenterY(8, R32_GAP) + getMatchCenterY(15, R32_GAP)) / 2;
        const finalCenterY = (topSFCenter + bottomSFCenter) / 2 - MATCH_HEIGHT / 2;

        return (
          <div className="absolute" style={{ left: (MATCH_WIDTH + CONNECTOR_WIDTH) * 4, top: finalCenterY }}>
            <div className="text-[9px] text-muted-foreground mb-0.5">M104 - Final</div>
            <AdminBracketMatch match={final} onScoreChange={onScoreChange} onSelectWinner={onSelectWinner} matchWidth={MATCH_WIDTH} />
            {final.selectedWinner && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-400 rounded text-center" style={{ width: MATCH_WIDTH }}>
                <div className="text-[10px] text-yellow-700 mb-1">Campeon</div>
                <div className="flex items-center justify-center gap-2">
                  <img src={getTeamById(final.selectedWinner)?.flag_url} alt="" className="w-6 h-4 object-cover rounded" />
                  <span className="text-sm font-bold">{getTeamById(final.selectedWinner)?.name}</span>
                  <span>🏆</span>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* 3rd Place - below Final */}
      {(() => {
        const topSFCenter = (getMatchCenterY(0, R32_GAP) + getMatchCenterY(7, R32_GAP)) / 2;
        const bottomSFCenter = (getMatchCenterY(8, R32_GAP) + getMatchCenterY(15, R32_GAP)) / 2;
        const finalCenterY = (topSFCenter + bottomSFCenter) / 2 - MATCH_HEIGHT / 2;
        const thirdPlaceTop = finalCenterY + MATCH_HEIGHT + 130;

        return (
          <div className="absolute" style={{ left: (MATCH_WIDTH + CONNECTOR_WIDTH) * 4, top: thirdPlaceTop }}>
            <div className="text-[9px] text-muted-foreground mb-0.5">M103 - 3er Puesto</div>
            <AdminBracketMatch match={thirdPlace} onScoreChange={onScoreChange} onSelectWinner={onSelectWinner} matchWidth={MATCH_WIDTH} />
          </div>
        );
      })()}
    </div>
  );
}
