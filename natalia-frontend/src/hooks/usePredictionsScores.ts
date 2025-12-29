/**
 * Custom hook for PredictionsScores page
 * Handles scores state, standings calculation, and tiebreaker logic
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTeamsByGroup } from '../data/mockData';
import { ALL_GROUPS } from '../data/groupMatches';
import {
  calculateGroupStandings,
  sortThirdPlaceTeams,
  type ThirdPlaceTeam as ThirdPlaceTeamCalc
} from '../utils/fifaTiebreaker';
import { getThirdPlaceCombination } from '../data/thirdPlaceCombinations';
import { predictionsAPI } from '../services/api';
import {
  PLAYOFF_TO_TEAM_ID,
  getPlayoffWinner,
  type PlayoffSelections
} from '../utils/predictionHelpers';
import type { Team, GroupPrediction } from '@/types';
import type {
  ScoresState,
  TiebreakerDecisionsState,
  GroupStandingsState,
  SavedStandingsState,
  UnresolvableTieWithGroup,
  CurrentTiebreaker,
  ThirdPlaceInfo,
} from '../types/predictionsScores';

interface UsePredictionsScoresReturn {
  // State
  scores: ScoresState;
  saving: boolean;
  error: string;
  loading: boolean;
  showTiebreakerModal: boolean;
  currentTiebreaker: CurrentTiebreaker | null;
  showConfirmModal: boolean;
  incompleteGroups: string[];

  // Computed values
  groupStandings: GroupStandingsState;
  unresolvableTies: UnresolvableTieWithGroup[];
  allGroupsComplete: boolean;
  thirdPlaceInfo: ThirdPlaceInfo;
  totalCompleted: number;

  // Actions
  getGroupTeams: (groupLetter: string) => Team[];
  handleScoreChange: (group: string, matchNumber: number, scoreA: number | string, scoreB: number | string) => void;
  handleTiebreakerResolve: (group: string, resolvedOrder: number[]) => Promise<void>;
  openTiebreakerModal: (tie: UnresolvableTieWithGroup) => void;
  closeTiebreakerModal: () => void;
  handleSave: () => Promise<void>;
  handleResetGroup: (group: string) => void;
  handleFillRandom: () => void;
  handleContinue: () => Promise<void>;
  handleConfirmContinue: () => Promise<void>;
  handleBack: () => void;
  setShowConfirmModal: (show: boolean) => void;
  setError: (error: string) => void;
}

export function usePredictionsScores(setId: string | null): UsePredictionsScoresReturn {
  const navigate = useNavigate();

  // State
  const [scores, setScores] = useState<ScoresState>({});
  const [tiebreakerDecisions, setTiebreakerDecisions] = useState<TiebreakerDecisionsState>({});
  const [playoffSelections, setPlayoffSelections] = useState<PlayoffSelections>({});
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [showTiebreakerModal, setShowTiebreakerModal] = useState<boolean>(false);
  const [currentTiebreaker, setCurrentTiebreaker] = useState<CurrentTiebreaker | null>(null);
  const [savedStandings, setSavedStandings] = useState<SavedStandingsState | null>(null);
  const [hasKnockout, setHasKnockout] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [incompleteGroups, setIncompleteGroups] = useState<string[]>([]);

  // Get teams for each group (with playoff winners substituted)
  const getGroupTeams = useCallback((groupLetter: string): Team[] => {
    const teams = getTeamsByGroup(groupLetter);

    return teams.map(team => {
      if (team.is_playoff) {
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
            } as Team & { selectedWinner?: number | string };
          }
        }
      }
      return team;
    });
  }, [playoffSelections]);

  // Calculate standings for all groups
  const groupStandings = useMemo((): GroupStandingsState => {
    const standings: GroupStandingsState = {};

    ALL_GROUPS.forEach(group => {
      const teams = getGroupTeams(group);
      const groupScores = scores[group] || {};
      const decision = tiebreakerDecisions[group] || null;

      const result = calculateGroupStandings(teams, groupScores, decision);
      standings[group] = result;
    });

    return standings;
  }, [scores, tiebreakerDecisions, getGroupTeams]);

  // Check for unresolvable ties
  const unresolvableTies = useMemo((): UnresolvableTieWithGroup[] => {
    const ties: UnresolvableTieWithGroup[] = [];

    ALL_GROUPS.forEach(group => {
      const result = groupStandings[group];

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
  const allGroupsComplete = useMemo((): boolean => {
    return ALL_GROUPS.every(group => groupStandings[group]?.isComplete);
  }, [groupStandings]);

  // Calculate best third places and validate combination
  const thirdPlaceInfo = useMemo((): ThirdPlaceInfo => {
    if (!allGroupsComplete) {
      return { valid: false, reason: 'Completa todos los grupos primero' };
    }

    const thirdPlaces: ThirdPlaceTeamCalc[] = ALL_GROUPS.map(group => ({
      group,
      team: groupStandings[group]?.standings?.[2],
    })).filter((t): t is ThirdPlaceTeamCalc => !!t.team);

    if (thirdPlaces.length !== 12) {
      return { valid: false, reason: 'Faltan equipos en tercera posicion' };
    }

    const sorted = sortThirdPlaceTeams(thirdPlaces);
    const best8 = sorted.slice(0, 8);
    const qualifyingGroups = best8.map(t => t.group).sort().join('');

    const combination = getThirdPlaceCombination(qualifyingGroups.split(''));

    if (!combination) {
      return {
        valid: false,
        reason: `La combinacion ${qualifyingGroups} no es valida segun FIFA. Ajusta algunos marcadores.`,
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

  // Count total completed matches
  const totalCompleted = useMemo((): number => {
    return ALL_GROUPS.reduce((sum, group) => {
      const groupScores = scores[group] || {};
      return sum + Object.values(groupScores).filter(
        s => s && s.a !== undefined && s.b !== undefined && s.a !== '' && s.b !== ''
      ).length;
    }, 0);
  }, [scores]);

  // Load existing data
  useEffect(() => {
    async function loadData(): Promise<void> {
      if (!setId) {
        setLoading(false);
        return;
      }

      try {
        const [scoresRes, playoffsRes, knockoutRes, groupsRes] = await Promise.all([
          predictionsAPI.getScores(setId),
          predictionsAPI.getPlayoffs(setId),
          predictionsAPI.getKnockout(setId),
          predictionsAPI.getGroups(setId),
        ]);

        setScores(scoresRes.data || {});
        setPlayoffSelections(playoffsRes.data || {});

        const knockoutData = knockoutRes.data || {};
        const hasKnockoutData = Object.keys(knockoutData).length > 0;
        setHasKnockout(hasKnockoutData);

        const groupsData: GroupPrediction[] = groupsRes.data || [];
        if (groupsData.length === 48) {
          const snapshot: SavedStandingsState = {};
          ALL_GROUPS.forEach(group => {
            const groupTeams = groupsData
              .filter(g => g.group_letter === group)
              .sort((a, b) => a.predicted_position - b.predicted_position)
              .map(g => g.team_id);
            snapshot[group] = groupTeams;
          });
          setSavedStandings(snapshot);
        }

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

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Handle score change
  const handleScoreChange = useCallback((group: string, matchNumber: number, scoreA: number | string, scoreB: number | string): void => {
    setScores(prev => ({
      ...prev,
      [group]: {
        ...prev[group],
        [matchNumber]: { a: scoreA, b: scoreB },
      },
    }));

    setTiebreakerDecisions(prev => {
      if (prev[group]) {
        const { [group]: _, ...rest } = prev;
        return rest;
      }
      return prev;
    });
  }, []);

  // Handle tiebreaker resolution
  const handleTiebreakerResolve = useCallback(async (group: string, resolvedOrder: number[]): Promise<void> => {
    const newDecisions: TiebreakerDecisionsState = {
      ...tiebreakerDecisions,
      [group]: {
        tiedTeamIds: currentTiebreaker?.teams.map(t => t.teamId) || [],
        resolvedOrder,
      },
    };

    setTiebreakerDecisions(newDecisions);
    setShowTiebreakerModal(false);
    setCurrentTiebreaker(null);

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

  // Open tiebreaker modal
  const openTiebreakerModal = useCallback((tie: UnresolvableTieWithGroup): void => {
    setCurrentTiebreaker(tie);
    setShowTiebreakerModal(true);
  }, []);

  // Close tiebreaker modal
  const closeTiebreakerModal = useCallback((): void => {
    setShowTiebreakerModal(false);
    setCurrentTiebreaker(null);
  }, []);

  // Check if standings changed
  const hasStandingsChanged = useCallback((): boolean => {
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

  // Handle save progress
  const handleSave = async (): Promise<void> => {
    setSaving(true);
    setError('');

    try {
      await predictionsAPI.saveScores(scores, setId || '');
      for (const [group, decision] of Object.entries(tiebreakerDecisions)) {
        await predictionsAPI.saveTiebreaker({
          setId: setId || '',
          group,
          tiedTeamIds: decision.tiedTeamIds,
          resolvedOrder: decision.resolvedOrder,
        });
      }
      setError('');
      alert('Progreso guardado correctamente');
    } catch (err: unknown) {
      console.error('Error saving:', err);
      const errorMessage = err && typeof err === 'object' && 'response' in err
        ? ((err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Error al guardar')
        : 'Error al guardar';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Handle reset scores for a group
  const handleResetGroup = useCallback((group: string): void => {
    setScores(prev => {
      const { [group]: _, ...rest } = prev;
      return rest;
    });
    setTiebreakerDecisions(prev => {
      const { [group]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  // Fill random scores
  const handleFillRandom = useCallback((): void => {
    const newScores: ScoresState = {};
    ALL_GROUPS.forEach(group => {
      newScores[group] = {};
      for (let i = 1; i <= 6; i++) {
        newScores[group][i] = {
          a: Math.floor(Math.random() * 4),
          b: Math.floor(Math.random() * 4),
        };
      }
    });
    setScores(newScores);
    setTiebreakerDecisions({});
  }, []);

  // Proceed to knockout
  const proceedToKnockout = async (clearBracket: boolean = false): Promise<void> => {
    setSaving(true);
    setError('');

    try {
      await predictionsAPI.saveScores(scores, setId || '');

      const groupPositions: GroupPrediction[] = [];
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

      await predictionsAPI.saveGroups(groupPositions, Number(setId));
      await predictionsAPI.saveThirdPlaces(thirdPlaceInfo.qualifyingGroups || '', Number(setId));

      if (clearBracket) {
        await predictionsAPI.saveKnockout({}, Number(setId));
      }

      navigate(`/eliminatorias?setId=${setId}`);
    } catch (err: unknown) {
      console.error('Error saving:', err);
      const errorMessage = err && typeof err === 'object' && 'response' in err
        ? ((err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Error al guardar')
        : 'Error al guardar';
      setError(errorMessage);
      setSaving(false);
    }
  };

  // Handle continue
  const handleContinue = async (): Promise<void> => {
    setIncompleteGroups([]);

    const incomplete = ALL_GROUPS.filter(group => !groupStandings[group]?.isComplete);

    if (incomplete.length > 0) {
      setIncompleteGroups(incomplete);
      setError(`Faltan marcadores en ${incomplete.length} grupo(s): ${incomplete.join(', ')}`);
      return;
    }

    if (unresolvableTies.length > 0) {
      setError('Resuelve los empates antes de continuar');
      openTiebreakerModal(unresolvableTies[0]);
      return;
    }

    if (!thirdPlaceInfo.valid) {
      setError(thirdPlaceInfo.reason || 'Error de validacion');
      return;
    }

    if (hasKnockout && hasStandingsChanged()) {
      setShowConfirmModal(true);
      return;
    }

    await proceedToKnockout(false);
  };

  // Handle confirm continue
  const handleConfirmContinue = async (): Promise<void> => {
    setShowConfirmModal(false);
    await proceedToKnockout(true);
  };

  // Handle go back
  const handleBack = (): void => {
    navigate(`/repechajes?setId=${setId}`);
  };

  return {
    // State
    scores,
    saving,
    error,
    loading,
    showTiebreakerModal,
    currentTiebreaker,
    showConfirmModal,
    incompleteGroups,

    // Computed values
    groupStandings,
    unresolvableTies,
    allGroupsComplete,
    thirdPlaceInfo,
    totalCompleted,

    // Actions
    getGroupTeams,
    handleScoreChange,
    handleTiebreakerResolve,
    openTiebreakerModal,
    closeTiebreakerModal,
    handleSave,
    handleResetGroup,
    handleFillRandom,
    handleContinue,
    handleConfirmContinue,
    handleBack,
    setShowConfirmModal,
    setError,
  };
}
