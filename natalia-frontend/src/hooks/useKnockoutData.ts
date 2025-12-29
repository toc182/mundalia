import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { predictionsAPI, predictionSetsAPI } from '@/services/api';
import {
  getTeamById as getTeamByIdHelper,
  type PlayoffSelections,
} from '@/utils/predictionHelpers';
import {
  roundOf32Structure,
  roundOf16Structure,
  quarterFinalsStructure,
  semiFinalsStructure,
  thirdPlaceMatch,
  finalMatch,
} from '@/data/knockoutBracket';
import { getThirdPlaceAssignments } from '@/data/thirdPlaceCombinations';
import type {
  PredictionMode,
  RoundId,
  GroupPredictions,
  KnockoutPredictions,
  KnockoutScores,
  KnockoutSaveData,
  PlayoffWinnerTeam,
  BuildR32Match,
  BuildKnockoutMatch,
  BuildSpecialMatch,
} from '@/types/knockout';

interface UseKnockoutDataReturn {
  // State
  predictions: GroupPredictions;
  playoffSelections: PlayoffSelections;
  bestThirdPlaces: string[];
  knockoutPredictions: KnockoutPredictions;
  setKnockoutPredictions: React.Dispatch<React.SetStateAction<KnockoutPredictions>>;
  knockoutScores: KnockoutScores;
  setKnockoutScores: React.Dispatch<React.SetStateAction<KnockoutScores>>;
  saved: boolean;
  setSaved: React.Dispatch<React.SetStateAction<boolean>>;
  saving: boolean;
  setSaving: React.Dispatch<React.SetStateAction<boolean>>;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  loading: boolean;
  predictionSetName: string;
  predictionMode: PredictionMode;
  setId: string | null;

  // Computed matches (memoized)
  r32Matches: BuildR32Match[];
  r16Matches: BuildKnockoutMatch[];
  qfMatches: BuildKnockoutMatch[];
  sfMatches: BuildKnockoutMatch[];
  thirdPlace: BuildSpecialMatch;
  final: BuildSpecialMatch;

  // Completion stats
  r32Complete: number;
  r16Complete: number;
  qfComplete: number;
  sfComplete: number;
  thirdPlaceComplete: number;
  finalComplete: number;
  totalComplete: number;
  totalMatches: number;
  isComplete: boolean;
  missingPredictions: boolean;
  missingThirdPlaces: boolean;

  // Helpers
  getTeamById: (id: number) => PlayoffWinnerTeam | null;
  selectWinner: (matchId: string, teamId: number) => void;
  handleScoreChange: (matchId: string, teamAId: number | undefined, teamBId: number | undefined, newScoreA: number | string, newScoreB: number | string) => void;
  handleSave: () => Promise<void>;
  buildSaveData: () => KnockoutSaveData | KnockoutPredictions;

  // Timer refs for cleanup
  savedTimerRef: React.MutableRefObject<NodeJS.Timeout | null>;
  navTimerRef: React.MutableRefObject<NodeJS.Timeout | null>;
}

export function useKnockoutData(): UseKnockoutDataReturn {
  const [searchParams] = useSearchParams();
  const setId = searchParams.get('setId');

  const [predictions, setPredictions] = useState<GroupPredictions>({});
  const [playoffSelections, setPlayoffSelections] = useState<PlayoffSelections>({});
  const [bestThirdPlaces, setBestThirdPlaces] = useState<string[]>([]);
  const [knockoutPredictions, setKnockoutPredictions] = useState<KnockoutPredictions>({});
  const [knockoutScores, setKnockoutScores] = useState<KnockoutScores>({});
  const [saved, setSaved] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [predictionSetName, setPredictionSetName] = useState<string>('');
  const [predictionMode, setPredictionMode] = useState<PredictionMode>('positions');
  const [loading, setLoading] = useState<boolean>(true);

  const savedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const navTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load data on mount
  useEffect(() => {
    const loadData = async (): Promise<void> => {
      if (setId) {
        try {
          // Load prediction set info
          const setResponse = await predictionSetsAPI.getById(parseInt(setId, 10));
          if (setResponse.data?.name) {
            setPredictionSetName(setResponse.data.name);
          }
          if (setResponse.data?.mode) {
            setPredictionMode(setResponse.data.mode);
          }

          // Load group predictions
          const groupsResponse = await predictionsAPI.getGroups(parseInt(setId, 10));
          if (groupsResponse.data && Array.isArray(groupsResponse.data) && groupsResponse.data.length > 0) {
            const grouped: GroupPredictions = {};
            groupsResponse.data.forEach((gp: any) => {
              if (!grouped[gp.group_letter]) {
                grouped[gp.group_letter] = [];
              }
              grouped[gp.group_letter][gp.predicted_position - 1] = gp.team_id;
            });
            setPredictions(grouped);
          }

          // Load playoff predictions
          const playoffsResponse = await predictionsAPI.getPlayoffs(parseInt(setId, 10));
          if (playoffsResponse.data && Object.keys(playoffsResponse.data).length > 0) {
            setPlayoffSelections(playoffsResponse.data as PlayoffSelections);
          }

          // Load third places
          const thirdResponse = await predictionsAPI.getThirdPlaces(parseInt(setId, 10));
          if (thirdResponse.data?.selectedGroups) {
            const groups = thirdResponse.data.selectedGroups.split('');
            setBestThirdPlaces(groups);
          }

          // Load knockout predictions
          const knockoutResponse = await predictionsAPI.getKnockout(parseInt(setId, 10));
          if (knockoutResponse.data && Object.keys(knockoutResponse.data).length > 0) {
            const knockoutData = knockoutResponse.data;
            const firstValue = Object.values(knockoutData)[0];

            if (typeof firstValue === 'object' && firstValue !== null) {
              // Scores format
              const preds: KnockoutPredictions = {};
              const scores: KnockoutScores = {};
              Object.entries(knockoutData).forEach(([matchKey, data]) => {
                const dataObj = data as { winner: number; scoreA: number | null; scoreB: number | null };
                preds[matchKey] = dataObj.winner;
                if (dataObj.scoreA !== null && dataObj.scoreB !== null) {
                  scores[matchKey] = { a: dataObj.scoreA, b: dataObj.scoreB };
                }
              });
              setKnockoutPredictions(preds);
              setKnockoutScores(scores);
            } else {
              // Positions format
              setKnockoutPredictions(knockoutData as KnockoutPredictions);
            }
          }
        } catch (err) {
          console.error('Error loading data:', err);
          setError('Error al cargar los datos. Por favor recarga la página.');
        } finally {
          setLoading(false);
        }
      } else {
        // Legacy localStorage behavior
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
        setLoading(false);
      }
    };
    loadData();
  }, [setId]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
    };
  }, []);

  // Get team by ID
  const getTeamById = useCallback((id: number): PlayoffWinnerTeam | null => {
    return getTeamByIdHelper(id, playoffSelections) as PlayoffWinnerTeam | null;
  }, [playoffSelections]);

  // Get team by position (1A, 2B, 3C, etc.)
  const getTeamByPosition = useCallback((position: string, group: string): PlayoffWinnerTeam | null => {
    const groupPredictions = predictions[group];
    if (!groupPredictions) return null;

    let index: number;
    if (position.startsWith('1')) index = 0;
    else if (position.startsWith('2')) index = 1;
    else if (position.startsWith('3')) index = 2;
    else return null;

    const teamId = groupPredictions[index];
    return getTeamById(teamId);
  }, [predictions, getTeamById]);

  // Third place assignments (memoized)
  const thirdPlaceAssignments = useMemo(() =>
    bestThirdPlaces.length === 8 ? getThirdPlaceAssignments(bestThirdPlaces) : null,
    [bestThirdPlaces]
  );

  // Get winner of a match
  const getMatchWinner = useCallback((matchId: string): PlayoffWinnerTeam | null => {
    const winnerId = knockoutPredictions[matchId];
    if (!winnerId) return null;
    return getTeamById(winnerId);
  }, [knockoutPredictions, getTeamById]);

  // Get loser of a match
  const getMatchLoser = useCallback((matchId: string, teamAId: number, teamBId: number): PlayoffWinnerTeam | null => {
    const winnerId = knockoutPredictions[matchId];
    if (!winnerId) return null;
    const loserId = winnerId === teamAId ? teamBId : teamAId;
    return getTeamById(loserId);
  }, [knockoutPredictions, getTeamById]);

  // Build match functions (memoized)
  const r32Matches = useMemo((): BuildR32Match[] => {
    return roundOf32Structure.map(match => {
      let teamA: PlayoffWinnerTeam | null = null;
      let teamB: PlayoffWinnerTeam | null = null;

      if (match.teamA.type === 'winner') {
        teamA = getTeamByPosition(`1${match.teamA.group}`, match.teamA.group!);
      } else if (match.teamA.type === 'runner_up') {
        teamA = getTeamByPosition(`2${match.teamA.group}`, match.teamA.group!);
      }

      if (match.teamB.type === 'runner_up') {
        teamB = getTeamByPosition(`2${match.teamB.group}`, match.teamB.group!);
      } else if (match.teamB.type === 'third_place') {
        if (thirdPlaceAssignments && match.matchId in thirdPlaceAssignments) {
          const thirdGroup = thirdPlaceAssignments[match.matchId as keyof typeof thirdPlaceAssignments];
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
  }, [predictions, playoffSelections, bestThirdPlaces, knockoutPredictions, thirdPlaceAssignments, getTeamByPosition]);

  const r16Matches = useMemo((): BuildKnockoutMatch[] => {
    return roundOf16Structure.map(match => ({
      ...match,
      teamA: getMatchWinner(match.teamA.from),
      teamB: getMatchWinner(match.teamB.from),
      fromA: match.teamA.from,
      fromB: match.teamB.from,
      selectedWinner: knockoutPredictions[match.matchId] || null,
    }));
  }, [knockoutPredictions, getMatchWinner]);

  const qfMatches = useMemo((): BuildKnockoutMatch[] => {
    return quarterFinalsStructure.map(match => ({
      ...match,
      teamA: getMatchWinner(match.teamA.from),
      teamB: getMatchWinner(match.teamB.from),
      fromA: match.teamA.from,
      fromB: match.teamB.from,
      selectedWinner: knockoutPredictions[match.matchId] || null,
    }));
  }, [knockoutPredictions, getMatchWinner]);

  const sfMatches = useMemo((): BuildKnockoutMatch[] => {
    return semiFinalsStructure.map(match => ({
      ...match,
      teamA: getMatchWinner(match.teamA.from),
      teamB: getMatchWinner(match.teamB.from),
      fromA: match.teamA.from,
      fromB: match.teamB.from,
      selectedWinner: knockoutPredictions[match.matchId] || null,
    }));
  }, [knockoutPredictions, getMatchWinner]);

  const thirdPlace = useMemo((): BuildSpecialMatch => {
    const sf1 = semiFinalsStructure[0];
    const sf2 = semiFinalsStructure[1];

    const sf1TeamA = getMatchWinner(sf1.teamA.from);
    const sf1TeamB = getMatchWinner(sf1.teamB.from);
    const sf2TeamA = getMatchWinner(sf2.teamA.from);
    const sf2TeamB = getMatchWinner(sf2.teamB.from);

    let teamA: PlayoffWinnerTeam | null = null;
    let teamB: PlayoffWinnerTeam | null = null;

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
  }, [knockoutPredictions, getMatchWinner, getMatchLoser]);

  const final = useMemo((): BuildSpecialMatch => ({
    ...finalMatch,
    teamA: getMatchWinner(finalMatch.teamA.from),
    teamB: getMatchWinner(finalMatch.teamB.from),
    fromA: finalMatch.teamA.from,
    fromB: finalMatch.teamB.from,
    selectedWinner: knockoutPredictions[finalMatch.matchId] || null,
  }), [knockoutPredictions, getMatchWinner]);

  // Clear dependent predictions helper
  const clearDependentPredictions = useCallback((matchId: string, preds: KnockoutPredictions): KnockoutPredictions => {
    const newPredictions = { ...preds };

    const clearDependents = (mId: string): void => {
      roundOf16Structure.forEach(m => {
        if (m.teamA.from === mId || m.teamB.from === mId) {
          delete newPredictions[m.matchId];
          clearDependents(m.matchId);
        }
      });
      quarterFinalsStructure.forEach(m => {
        if (m.teamA.from === mId || m.teamB.from === mId) {
          delete newPredictions[m.matchId];
          clearDependents(m.matchId);
        }
      });
      semiFinalsStructure.forEach(m => {
        if (m.teamA.from === mId || m.teamB.from === mId) {
          delete newPredictions[m.matchId];
          clearDependents(m.matchId);
        }
      });
      if (thirdPlaceMatch.teamA.from === mId || thirdPlaceMatch.teamB.from === mId) {
        delete newPredictions[thirdPlaceMatch.matchId];
      }
      if (finalMatch.teamA.from === mId || finalMatch.teamB.from === mId) {
        delete newPredictions[finalMatch.matchId];
      }
    };

    clearDependents(matchId);
    return newPredictions;
  }, []);

  // Select winner
  const selectWinner = useCallback((matchId: string, teamId: number): void => {
    if (predictionMode === 'scores') {
      const score = knockoutScores[matchId];
      if (score && score.a !== '' && score.b !== '') {
        const scoreA = Number(score.a);
        const scoreB = Number(score.b);
        if (scoreA !== scoreB) {
          return;
        }
      }
    }

    setKnockoutPredictions(prev => {
      const newPredictions = { ...prev, [matchId]: teamId };
      if (prev[matchId] && prev[matchId] !== teamId) {
        return clearDependentPredictions(matchId, newPredictions);
      }
      return newPredictions;
    });
    setSaved(false);
  }, [predictionMode, knockoutScores, clearDependentPredictions]);

  // Handle score change
  const handleScoreChange = useCallback((
    matchId: string,
    teamAId: number | undefined,
    teamBId: number | undefined,
    newScoreA: number | string,
    newScoreB: number | string
  ): void => {
    setKnockoutScores(prev => ({
      ...prev,
      [matchId]: { a: newScoreA, b: newScoreB }
    }));

    const scoreA = newScoreA === '' ? null : Number(newScoreA);
    const scoreB = newScoreB === '' ? null : Number(newScoreB);

    if (scoreA !== null && scoreB !== null) {
      if (scoreA > scoreB && teamAId) {
        setKnockoutPredictions(prev => {
          const newPreds = { ...prev, [matchId]: teamAId };
          if (prev[matchId] && prev[matchId] !== teamAId) {
            return clearDependentPredictions(matchId, newPreds);
          }
          return newPreds;
        });
      } else if (scoreB > scoreA && teamBId) {
        setKnockoutPredictions(prev => {
          const newPreds = { ...prev, [matchId]: teamBId };
          if (prev[matchId] && prev[matchId] !== teamBId) {
            return clearDependentPredictions(matchId, newPreds);
          }
          return newPreds;
        });
      } else if (scoreA === scoreB) {
        setKnockoutPredictions(prev => {
          if (prev[matchId]) {
            const { [matchId]: _, ...rest } = prev;
            return clearDependentPredictions(matchId, rest);
          }
          return prev;
        });
      }
    }

    setSaved(false);
  }, [clearDependentPredictions]);

  // Build save data
  const buildSaveData = useCallback((): KnockoutSaveData | KnockoutPredictions => {
    if (predictionMode === 'scores') {
      const saveData: KnockoutSaveData = {};
      const allMatchIds = new Set([...Object.keys(knockoutPredictions), ...Object.keys(knockoutScores)]);
      allMatchIds.forEach(matchId => {
        const winner = knockoutPredictions[matchId];
        const score = knockoutScores[matchId];
        if (winner || score) {
          saveData[matchId] = {
            winner: winner || null,
            scoreA: typeof score?.a === 'number' ? score.a : null,
            scoreB: typeof score?.b === 'number' ? score.b : null
          };
        }
      });
      return saveData;
    }
    return knockoutPredictions;
  }, [predictionMode, knockoutPredictions, knockoutScores]);

  // Handle save
  const handleSave = useCallback(async (): Promise<void> => {
    setSaving(true);
    setError(null);

    localStorage.setItem('natalia_knockout', JSON.stringify(knockoutPredictions));
    if (predictionMode === 'scores') {
      localStorage.setItem('natalia_knockout_scores', JSON.stringify(knockoutScores));
    }

    try {
      await predictionsAPI.saveKnockout(buildSaveData(), parseInt(setId!, 10));
      setSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError('Error al guardar en servidor');
    } finally {
      setSaving(false);
    }
  }, [knockoutPredictions, knockoutScores, predictionMode, setId, buildSaveData]);

  // Completion stats
  const r32Complete = r32Matches.filter(m => m.selectedWinner).length;
  const r16Complete = r16Matches.filter(m => m.selectedWinner).length;
  const qfComplete = qfMatches.filter(m => m.selectedWinner).length;
  const sfComplete = sfMatches.filter(m => m.selectedWinner).length;
  const thirdPlaceComplete = thirdPlace.selectedWinner ? 1 : 0;
  const finalComplete = final.selectedWinner ? 1 : 0;
  const totalComplete = r32Complete + r16Complete + qfComplete + sfComplete + thirdPlaceComplete + finalComplete;
  const totalMatches = 16 + 8 + 4 + 2 + 1 + 1;
  const isComplete = totalComplete === totalMatches;
  const missingPredictions = Object.keys(predictions).length === 0;
  const missingThirdPlaces = bestThirdPlaces.length !== 8;

  return {
    predictions,
    playoffSelections,
    bestThirdPlaces,
    knockoutPredictions,
    setKnockoutPredictions,
    knockoutScores,
    setKnockoutScores,
    saved,
    setSaved,
    saving,
    setSaving,
    error,
    setError,
    loading,
    predictionSetName,
    predictionMode,
    setId,
    r32Matches,
    r16Matches,
    qfMatches,
    sfMatches,
    thirdPlace,
    final,
    r32Complete,
    r16Complete,
    qfComplete,
    sfComplete,
    thirdPlaceComplete,
    finalComplete,
    totalComplete,
    totalMatches,
    isComplete,
    missingPredictions,
    missingThirdPlaces,
    getTeamById,
    selectWinner,
    handleScoreChange,
    handleSave,
    buildSaveData,
    savedTimerRef,
    navTimerRef,
  };
}

export default useKnockoutData;
