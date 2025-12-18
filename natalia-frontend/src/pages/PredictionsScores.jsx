/**
 * Predictions by Exact Scores Page
 * User enters exact match scores for all 72 group stage matches
 * System calculates standings automatically using FIFA tiebreaker rules
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, AlertTriangle, Save, RotateCcw } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import GroupScoreInput from '../components/GroupScoreInput';
import TiebreakerModal from '../components/TiebreakerModal';
import { getTeamsByGroup, getAllGroups } from '../data/mockData';
import { ALL_GROUPS } from '../data/groupMatches';
import { calculateGroupStandings, sortThirdPlaceTeams } from '../utils/fifaTiebreaker';
import { getThirdPlaceCombination } from '../data/thirdPlaceCombinations';
import { predictionsAPI, predictionSetsAPI } from '../services/api';
import { PLAYOFF_TO_TEAM_ID, getPlayoffWinner } from '../utils/predictionHelpers';

export default function PredictionsScores() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setId = searchParams.get('setId');

  // State
  const [scores, setScores] = useState({}); // { A: { 1: {a:2,b:1}, ... }, B: {...} }
  const [tiebreakerDecisions, setTiebreakerDecisions] = useState({}); // { A: { tiedTeamIds, resolvedOrder } }
  const [playoffSelections, setPlayoffSelections] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showTiebreakerModal, setShowTiebreakerModal] = useState(false);
  const [currentTiebreaker, setCurrentTiebreaker] = useState(null);
  const [savedStandings, setSavedStandings] = useState(null); // Snapshot of standings when first completed
  const [hasKnockout, setHasKnockout] = useState(false); // Whether knockout predictions exist
  const [showConfirmModal, setShowConfirmModal] = useState(false); // Confirmation for reset
  const [incompleteGroups, setIncompleteGroups] = useState([]); // Groups that need completion

  // Get teams for each group (with playoff winners substituted)
  const getGroupTeams = useCallback((groupLetter) => {
    const teams = getTeamsByGroup(groupLetter);

    return teams.map(team => {
      if (team.is_playoff) {
        // Check if we have a playoff selection for this team
        const playoffId = Object.keys(PLAYOFF_TO_TEAM_ID).find(
          key => PLAYOFF_TO_TEAM_ID[key] === team.id
        );

        if (playoffId) {
          const winnerTeam = getPlayoffWinner(playoffId, playoffSelections);

          if (winnerTeam) {
            return {
              ...team,
              name: winnerTeam.name,
              code: winnerTeam.code,
              flag_url: winnerTeam.flag_url,
              selectedWinner: playoffSelections[playoffId].final,
            };
          }
        }
      }
      return team;
    });
  }, [playoffSelections]);

  // Calculate standings for all groups
  const groupStandings = useMemo(() => {
    const standings = {};

    ALL_GROUPS.forEach(group => {
      const teams = getGroupTeams(group);
      const groupScores = scores[group] || {};
      const decision = tiebreakerDecisions[group];

      const result = calculateGroupStandings(teams, groupScores, decision);
      standings[group] = result;
    });

    return standings;
  }, [scores, tiebreakerDecisions, getGroupTeams]);

  // Check for unresolvable ties (only in groups that are complete - all 6 matches)
  const unresolvableTies = useMemo(() => {
    const ties = [];

    ALL_GROUPS.forEach(group => {
      const result = groupStandings[group];

      // Only report ties for groups that are complete (all 6 matches entered)
      if (result?.isComplete && result?.unresolvableTie) {
        ties.push({
          group,
          ...result.unresolvableTie,
        });
      }
    });

    return ties;
  }, [groupStandings]);

  // Check if all groups are complete
  const allGroupsComplete = useMemo(() => {
    return ALL_GROUPS.every(group => groupStandings[group]?.isComplete);
  }, [groupStandings]);

  // Calculate best third places and validate combination
  const thirdPlaceInfo = useMemo(() => {
    if (!allGroupsComplete) {
      return { valid: false, reason: 'Completa todos los grupos primero' };
    }

    // Get third place from each group
    const thirdPlaces = ALL_GROUPS.map(group => ({
      group,
      team: groupStandings[group]?.standings?.[2], // Position 3 (index 2)
    })).filter(t => t.team);

    if (thirdPlaces.length !== 12) {
      return { valid: false, reason: 'Faltan equipos en tercera posición' };
    }

    // Sort to get best 8
    const sorted = sortThirdPlaceTeams(thirdPlaces);
    const best8 = sorted.slice(0, 8);
    const qualifyingGroups = best8.map(t => t.group).sort().join('');

    // Validate against FIFA combinations
    const combination = getThirdPlaceCombination(qualifyingGroups.split(''));

    if (!combination) {
      return {
        valid: false,
        reason: `La combinación ${qualifyingGroups} no es válida según FIFA. Ajusta algunos marcadores.`,
        qualifyingGroups,
        best8,
      };
    }

    return {
      valid: true,
      qualifyingGroups,
      combination,
      best8,
    };
  }, [allGroupsComplete, groupStandings]);

  // Load existing data
  useEffect(() => {
    async function loadData() {
      if (!setId) {
        setLoading(false);
        return;
      }

      try {
        // Load scores, playoff selections, knockout, and group predictions in parallel
        const [scoresRes, playoffsRes, knockoutRes, groupsRes] = await Promise.all([
          predictionsAPI.getScores(setId),
          predictionsAPI.getPlayoffs(setId),
          predictionsAPI.getKnockout(setId),
          predictionsAPI.getGroups(setId),
        ]);

        setScores(scoresRes.data || {});
        setPlayoffSelections(playoffsRes.data || {});

        // Check if knockout predictions exist
        const knockoutData = knockoutRes.data || {};
        const hasKnockoutData = Object.keys(knockoutData).length > 0;
        setHasKnockout(hasKnockoutData);

        // If we have group predictions saved, convert to savedStandings format
        // This means groups were completed before
        const groupsData = groupsRes.data || [];
        if (groupsData.length === 48) { // 12 groups x 4 teams = 48
          // Convert group predictions to standings snapshot
          const snapshot = {};
          ALL_GROUPS.forEach(group => {
            const groupTeams = groupsData
              .filter(g => g.group_letter === group)
              .sort((a, b) => a.predicted_position - b.predicted_position)
              .map(g => g.team_id);
            snapshot[group] = groupTeams;
          });
          setSavedStandings(snapshot);
        }

        // Load tiebreaker decisions
        const tiebreakerRes = await predictionsAPI.getTiebreaker(setId);
        setTiebreakerDecisions(tiebreakerRes.data || {});
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Error al cargar datos');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [setId]);

  // Handle score change - also clears any tiebreaker decision for that group
  const handleScoreChange = useCallback((group, matchNumber, scoreA, scoreB) => {
    setScores(prev => ({
      ...prev,
      [group]: {
        ...prev[group],
        [matchNumber]: { a: scoreA, b: scoreB },
      },
    }));

    // Clear tiebreaker decision for this group since scores changed
    setTiebreakerDecisions(prev => {
      if (prev[group]) {
        const { [group]: _, ...rest } = prev;
        return rest;
      }
      return prev;
    });
  }, []);

  // Handle tiebreaker resolution
  const handleTiebreakerResolve = useCallback(async (group, resolvedOrder) => {
    const newDecisions = {
      ...tiebreakerDecisions,
      [group]: {
        tiedTeamIds: currentTiebreaker?.teams.map(t => t.teamId) || [],
        resolvedOrder,
      },
    };

    setTiebreakerDecisions(newDecisions);
    setShowTiebreakerModal(false);
    setCurrentTiebreaker(null);

    // Save to server
    if (setId) {
      try {
        await predictionsAPI.saveTiebreaker({
          setId,
          group,
          tiedTeamIds: newDecisions[group].tiedTeamIds,
          resolvedOrder,
        });
      } catch (err) {
        console.error('Error saving tiebreaker:', err);
      }
    }
  }, [tiebreakerDecisions, currentTiebreaker, setId]);

  // Open tiebreaker modal for a specific tie
  const openTiebreakerModal = useCallback((tie) => {
    setCurrentTiebreaker(tie);
    setShowTiebreakerModal(true);
  }, []);

  // Check if current standings differ from saved snapshot
  const hasStandingsChanged = useCallback(() => {
    if (!savedStandings) return false;

    for (const group of ALL_GROUPS) {
      const currentOrder = groupStandings[group]?.standings?.map(t => t.teamId) || [];
      const savedOrder = savedStandings[group] || [];

      if (currentOrder.length !== savedOrder.length) return true;
      for (let i = 0; i < currentOrder.length; i++) {
        if (currentOrder[i] !== savedOrder[i]) return true;
      }
    }
    return false;
  }, [savedStandings, groupStandings]);

  // Handle save progress (partial save)
  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      await predictionsAPI.saveScores(scores, setId);
      // Also save tiebreaker decisions
      for (const [group, decision] of Object.entries(tiebreakerDecisions)) {
        await predictionsAPI.saveTiebreaker({
          setId,
          group,
          tiedTeamIds: decision.tiedTeamIds,
          resolvedOrder: decision.resolvedOrder,
        });
      }
      setError(''); // Clear any previous error
      alert('Progreso guardado correctamente');
    } catch (err) {
      console.error('Error saving:', err);
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  // Handle reset scores for a group
  const handleResetGroup = useCallback((group) => {
    setScores(prev => {
      const { [group]: _, ...rest } = prev;
      return rest;
    });
    // Also clear tiebreaker for this group
    setTiebreakerDecisions(prev => {
      const { [group]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  // Fill random scores for testing
  const handleFillRandom = useCallback(() => {
    const newScores = {};
    ALL_GROUPS.forEach(group => {
      newScores[group] = {};
      // 6 matches per group (round robin: 4 teams = 6 matches)
      for (let i = 1; i <= 6; i++) {
        newScores[group][i] = {
          a: Math.floor(Math.random() * 4), // 0-3 goals
          b: Math.floor(Math.random() * 4),
        };
      }
    });
    setScores(newScores);
    setTiebreakerDecisions({}); // Clear any previous tiebreaker decisions
  }, []);

  // Proceed to knockout (called after confirmation if needed)
  const proceedToKnockout = async (clearBracket = false) => {
    setSaving(true);
    setError('');

    try {
      // Save scores
      await predictionsAPI.saveScores(scores, setId);

      // Convert calculated standings to group predictions format
      const groupPositions = [];
      ALL_GROUPS.forEach(group => {
        const standings = groupStandings[group]?.standings || [];
        standings.forEach((team, index) => {
          groupPositions.push({
            group_letter: group,
            team_id: team.teamId,
            predicted_position: index + 1
          });
        });
      });

      await predictionsAPI.saveGroups(groupPositions, setId);

      // Save third places
      await predictionsAPI.saveThirdPlaces(thirdPlaceInfo.qualifyingGroups, setId);

      // Clear knockout if requested (user confirmed changes)
      if (clearBracket) {
        await predictionsAPI.saveKnockout({}, setId);
      }

      // Navigate to knockout
      navigate(`/eliminatorias?setId=${setId}`);
    } catch (err) {
      console.error('Error saving:', err);
      setError(err.response?.data?.error || 'Error al guardar');
      setSaving(false);
    }
  };

  // Handle continue to next step
  const handleContinue = async () => {
    // Clear previous incomplete groups highlight
    setIncompleteGroups([]);

    // Find incomplete groups
    const incomplete = ALL_GROUPS.filter(group => !groupStandings[group]?.isComplete);

    if (incomplete.length > 0) {
      setIncompleteGroups(incomplete);
      setError(`Faltan marcadores en ${incomplete.length} grupo(s): ${incomplete.join(', ')}`);
      return;
    }

    // Check for unresolvable ties
    if (unresolvableTies.length > 0) {
      setError('Resuelve los empates antes de continuar');
      openTiebreakerModal(unresolvableTies[0]);
      return;
    }

    // Validate third place combination
    if (!thirdPlaceInfo.valid) {
      setError(thirdPlaceInfo.reason);
      return;
    }

    // Check if standings changed and knockout exists
    if (hasKnockout && hasStandingsChanged()) {
      // Show confirmation modal
      setShowConfirmModal(true);
      return;
    }

    // No changes or no existing knockout - proceed directly
    await proceedToKnockout(false);
  };

  // Handle confirmation modal response
  const handleConfirmContinue = async () => {
    setShowConfirmModal(false);
    await proceedToKnockout(true); // Clear bracket since user confirmed
  };

  // Handle go back
  const handleBack = () => {
    navigate(`/repechajes?setId=${setId}`);
  };

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground">Cargando datos...</p>
        </div>
      </div>
    );
  }

  // Count total completed matches
  const totalCompleted = ALL_GROUPS.reduce((sum, group) => {
    const groupScores = scores[group] || {};
    return sum + Object.values(groupScores).filter(
      s => s && s.a !== undefined && s.b !== undefined && s.a !== '' && s.b !== ''
    ).length;
  }, 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold mb-2">Fase de Grupos - Marcadores</h1>
          <p className="text-muted-foreground">
            Ingresa los marcadores de los 72 partidos. Las tablas se calculan automáticamente.
          </p>
          <div className="mt-2 text-sm">
            <span className="font-medium">{totalCompleted}/72</span> partidos completados
          </div>
        </div>

        {/* Top navigation buttons */}
        <div className="flex justify-between items-center mb-6">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={saving}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Atrás
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleFillRandom}
              disabled={saving}
              title="Rellenar con scores aleatorios (para pruebas)"
            >
              🎲 Random
            </Button>
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={saving}
            >
              <Save className="w-4 h-4 mr-2" />
              Guardar
            </Button>

            <Button
              onClick={handleContinue}
              disabled={saving}
            >
              {saving ? 'Guardando...' : 'Siguiente'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Unresolvable ties warning */}
        {unresolvableTies.length > 0 && (
          <Alert className="mb-4 border-yellow-400 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Hay {unresolvableTies.length} grupo(s) con empates que requieren tu decisión.
            </AlertDescription>
          </Alert>
        )}

        {/* Third place validation - only show error, not success */}
        {allGroupsComplete && !thirdPlaceInfo.valid && (
          <Alert className="mb-4 border-red-400 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {thirdPlaceInfo.reason}
            </AlertDescription>
          </Alert>
        )}

        {/* Groups grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {ALL_GROUPS.map(group => {
            const teams = getGroupTeams(group);
            const groupResult = groupStandings[group];
            const isIncomplete = incompleteGroups.includes(group);

            return (
              <GroupScoreInput
                key={group}
                group={group}
                teams={teams}
                scores={scores[group] || {}}
                standings={groupResult?.standings}
                isComplete={groupResult?.isComplete}
                isIncomplete={isIncomplete}
                unresolvableTie={groupResult?.unresolvableTie}
                onScoreChange={(matchNum, a, b) => handleScoreChange(group, matchNum, a, b)}
                onResolveTie={() => openTiebreakerModal({ group, ...groupResult?.unresolvableTie })}
                onReset={() => handleResetGroup(group)}
              />
            );
          })}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={saving}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Atrás
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={saving}
            >
              <Save className="w-4 h-4 mr-2" />
              Guardar
            </Button>

            <Button
              onClick={handleContinue}
              disabled={saving}
            >
              {saving ? 'Guardando...' : 'Siguiente'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
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

      {/* Confirmation Modal for Group Changes */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambios en la Fase de Grupos</DialogTitle>
            <DialogDescription>
              Has realizado cambios en la fase de grupos. Si decides continuar, se reseteará el bracket de eliminatorias y tendrás que completarlo nuevamente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmContinue}
            >
              Continuar y Resetear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
