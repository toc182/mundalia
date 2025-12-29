import { useState, useEffect, useRef, useCallback, useMemo, RefObject } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronLeft, ChevronRight, Trophy, Save } from 'lucide-react';
import { mockTeams, type MockTeam } from '@/data/mockData';
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
} from '@/data/knockoutBracket';
import { getThirdPlaceAssignments } from '@/data/thirdPlaceCombinations';
import { predictionsAPI, predictionSetsAPI } from '@/services/api';
import {
  getTeamById as getTeamByIdHelper,
  type PlayoffSelections,
} from '@/utils/predictionHelpers';
import MatchBox from '@/components/MatchBox';

// Extended team type with thirdPlaceFrom property
// Since PlayoffWinnerTeam from predictionHelpers has type issues, we define it locally
interface PlayoffWinnerTeam extends MockTeam {
  originalPlayoffId?: string;
  isPlayoffWinner?: boolean;
  thirdPlaceFrom?: string;
}

// MatchTeam interface for MatchBox component compatibility
interface MatchTeam {
  id: number | string;
  name: string;
  flag_url: string;
  thirdPlaceFrom?: string;
}

// Helper to convert PlayoffWinnerTeam to MatchTeam
const toMatchTeam = (team: PlayoffWinnerTeam | null): MatchTeam | null => {
  if (!team) return null;
  return {
    id: team.id,
    name: team.name,
    flag_url: team.flag_url,
    thirdPlaceFrom: team.thirdPlaceFrom,
  };
};

// Types for component state
type PredictionMode = 'positions' | 'scores';
type RoundId = 'r32' | 'r16' | 'qf' | 'sf' | 'final';

interface GroupPredictions {
  [groupLetter: string]: number[];
}

interface KnockoutPredictions {
  [matchId: string]: number;
}

interface KnockoutScores {
  [matchId: string]: {
    a: number | string;
    b: number | string;
  };
}

interface KnockoutSaveData {
  [matchId: string]: {
    winner: number | null;
    scoreA: number | null;
    scoreB: number | null;
  };
}

interface MobileRound {
  id: RoundId;
  label: string;
  count: number;
  total: number;
  next: RoundId | null;
}

interface Round {
  id: RoundId;
  label: string;
  count: number;
  total: number;
  next: RoundId | null;
}

// Extended match types with computed team data
interface BuildR32Match {
  matchId: string;
  matchNumber: number;
  teamA: PlayoffWinnerTeam | null;
  teamB: PlayoffWinnerTeam | null;
  selectedWinner: number | null;
  label?: string;
}

interface BuildKnockoutMatch {
  matchId: string;
  matchNumber: number;
  teamA: PlayoffWinnerTeam | null;
  teamB: PlayoffWinnerTeam | null;
  fromA: string;
  fromB: string;
  selectedWinner: number | null;
  label?: string;
}

interface BuildSpecialMatch {
  matchId: string;
  matchNumber: number;
  teamA: PlayoffWinnerTeam | null;
  teamB: PlayoffWinnerTeam | null;
  fromA: string;
  fromB: string;
  selectedWinner: number | null;
  label: string;
}

interface MatchPair {
  m1: string;
  m2: string;
  next: string;
}

interface BackButtonProps {
  size?: 'default' | 'sm' | 'lg';
}

interface NavigationButtonProps {
  size?: 'default' | 'sm' | 'lg';
}

interface TeamButtonProps {
  team: PlayoffWinnerTeam | null;
  matchId: string;
  isSelected: boolean;
  isEliminated: boolean;
  onSelect: (matchId: string, teamId: number) => void;
  canSelect: boolean;
}

interface WinnerSlotProps {
  team: PlayoffWinnerTeam | null;
  highlight?: 'gold' | 'bronze' | null;
}

interface MatchUnitProps {
  match: BuildR32Match | BuildKnockoutMatch | BuildSpecialMatch;
  onSelectWinner: (matchId: string, teamId: number) => void;
  showLabel?: boolean;
}

interface BracketPairProps {
  match1: BuildR32Match | BuildKnockoutMatch;
  match2: BuildR32Match | BuildKnockoutMatch;
  nextRoundMatch: string | null;
  onSelectWinner: (matchId: string, teamId: number) => void;
}

interface SingleMatchProps {
  match: BuildSpecialMatch;
  onSelectWinner: (matchId: string, teamId: number) => void;
  highlight?: 'gold' | 'bronze' | null;
}

interface DesktopBracketMatchProps {
  match: BuildR32Match | BuildKnockoutMatch | BuildSpecialMatch | null;
  predictionMode: PredictionMode;
  knockoutScores: KnockoutScores;
  onScoreChange: (matchId: string, teamAId: number | undefined, teamBId: number | undefined, newScoreA: number | string, newScoreB: number | string) => void;
  onSelectWinner: (matchId: string, teamId: number) => void;
  matchWidth: number;
}

interface BracketSlotProps {
  team: PlayoffWinnerTeam | null;
  matchId: string;
  isSelected: boolean;
  isEliminated: boolean;
  onSelect: (matchId: string, teamId: number) => void;
  canSelect: boolean;
  small?: boolean;
}

interface FullBracketProps {
  r32Matches: BuildR32Match[];
  r16Matches: BuildKnockoutMatch[];
  qfMatches: BuildKnockoutMatch[];
  sfMatches: BuildKnockoutMatch[];
  final: BuildSpecialMatch;
  thirdPlace: BuildSpecialMatch;
  onSelectWinner: (matchId: string, teamId: number) => void;
  getTeamById: (id: number) => PlayoffWinnerTeam | null;
  predictionMode: PredictionMode;
  knockoutScores: KnockoutScores;
  onScoreChange: (matchId: string, teamAId: number | undefined, teamBId: number | undefined, newScoreA: number | string, newScoreB: number | string) => void;
}

interface MobileMatchBoxProps {
  match: BuildR32Match | BuildKnockoutMatch | BuildSpecialMatch | null;
  predictionMode: PredictionMode;
  knockoutScores: KnockoutScores;
  onScoreChange: (matchId: string, teamAId: number | undefined, teamBId: number | undefined, newScoreA: number | string, newScoreB: number | string) => void;
  onSelectWinner: (matchId: string, teamId: number) => void;
}

interface MobileMatchPairProps {
  match1: BuildR32Match | BuildKnockoutMatch | null;
  match2: BuildR32Match | BuildKnockoutMatch | null;
  nextMatch: BuildR32Match | BuildKnockoutMatch | null;
  predictionMode: PredictionMode;
  knockoutScores: KnockoutScores;
  onScoreChange: (matchId: string, teamAId: number | undefined, teamBId: number | undefined, newScoreA: number | string, newScoreB: number | string) => void;
  onSelectWinner: (matchId: string, teamId: number) => void;
}

interface MobileKnockoutSlidesProps {
  r32Matches: BuildR32Match[];
  r16Matches: BuildKnockoutMatch[];
  qfMatches: BuildKnockoutMatch[];
  sfMatches: BuildKnockoutMatch[];
  final: BuildSpecialMatch;
  thirdPlace: BuildSpecialMatch;
  predictionMode: PredictionMode;
  knockoutScores: KnockoutScores;
  onScoreChange: (matchId: string, teamAId: number | undefined, teamBId: number | undefined, newScoreA: number | string, newScoreB: number | string) => void;
  onSelectWinner: (matchId: string, teamId: number) => void;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  handleScroll: () => void;
  getTeamById: (id: number) => PlayoffWinnerTeam | null;
}

export default function Knockout(): React.JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setId = searchParams.get('setId');

  const [predictions, setPredictions] = useState<GroupPredictions>({});
  const [playoffSelections, setPlayoffSelections] = useState<PlayoffSelections>({});
  const [bestThirdPlaces, setBestThirdPlaces] = useState<string[]>([]);
  const [knockoutPredictions, setKnockoutPredictions] = useState<KnockoutPredictions>({});
  const [knockoutScores, setKnockoutScores] = useState<KnockoutScores>({}); // { matchId: { a: score, b: score } }
  const [saved, setSaved] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeRound, setActiveRound] = useState<RoundId>('r32');
  const [predictionSetName, setPredictionSetName] = useState<string>('');
  const [predictionMode, setPredictionMode] = useState<PredictionMode>('positions');
  const [loading, setLoading] = useState<boolean>(true); // Loading state para evitar flash de "debes completar"
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef<boolean>(false);
  const savedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const navTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const loadData = async (): Promise<void> => {
      // Si hay setId, solo cargar del servidor (sin fallback a localStorage)
      if (setId) {
        try {
          // Cargar nombre y modo del prediction set
          const setResponse = await predictionSetsAPI.getById(parseInt(setId, 10));
          if (setResponse.data?.name) {
            setPredictionSetName(setResponse.data.name);
          }
          if (setResponse.data?.mode) {
            setPredictionMode(setResponse.data.mode);
          }

          // Cargar predicciones de grupos del servidor
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

          // Cargar playoffs del servidor
          const playoffsResponse = await predictionsAPI.getPlayoffs(parseInt(setId, 10));
          if (playoffsResponse.data && Object.keys(playoffsResponse.data).length > 0) {
            // Backend already returns { semi1, semi2, final } format
            setPlayoffSelections(playoffsResponse.data as PlayoffSelections);
          }

          // Cargar terceros del servidor
          const thirdResponse = await predictionsAPI.getThirdPlaces(parseInt(setId, 10));
          if (thirdResponse.data?.selectedGroups) {
            const groups = thirdResponse.data.selectedGroups.split('');
            setBestThirdPlaces(groups);
          }

          // Cargar knockout del servidor
          const knockoutResponse = await predictionsAPI.getKnockout(parseInt(setId, 10));
          if (knockoutResponse.data && Object.keys(knockoutResponse.data).length > 0) {
            const knockoutData = knockoutResponse.data;

            // Check if data is in scores format (objects) or positions format (just IDs)
            const firstValue = Object.values(knockoutData)[0];
            if (typeof firstValue === 'object' && firstValue !== null) {
              // Scores format: { matchId: { winner, scoreA, scoreB } }
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
              // Positions format: { matchId: winnerId }
              setKnockoutPredictions(knockoutData as KnockoutPredictions);
            }
          }
          // Si no hay datos, empezar en blanco
        } catch (err) {
          console.error('Error loading data:', err);
          setError('Error al cargar los datos. Por favor recarga la página.');
        } finally {
          setLoading(false);
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

  // Orden de los slides (para mapear índice a round id) - definido aquí para usar en useCallback
  const slideRoundIds: RoundId[] = ['r32', 'r16', 'qf', 'final'];

  // Handler para detectar scroll y actualizar activeRound
  const handleScroll = useCallback(() => {
    if (isScrolling.current) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const slideWidth = container.offsetWidth;
    const scrollLeft = container.scrollLeft;
    const newIndex = Math.round(scrollLeft / slideWidth);
    const newRoundId = slideRoundIds[newIndex];

    if (newRoundId && newRoundId !== activeRound) {
      setActiveRound(newRoundId);
    }
  }, [activeRound, slideRoundIds]);

  // Scroll programático a un slide específico
  const scrollToRound = useCallback((roundId: RoundId) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const index = slideRoundIds.indexOf(roundId);
    if (index === -1) return;

    isScrolling.current = true;
    const slideWidth = container.offsetWidth;
    container.scrollTo({ left: index * slideWidth, behavior: 'smooth' });

    // Reset isScrolling después de la animación
    setTimeout(() => {
      isScrolling.current = false;
    }, 300);
  }, [slideRoundIds]);

  // Get team by ID using centralized helper
  const getTeamById = (id: number): PlayoffWinnerTeam | null => getTeamByIdHelper(id, playoffSelections) as PlayoffWinnerTeam | null;

  // Get team by position (1A, 2B, 3C, etc.)
  const getTeamByPosition = (position: string, group: string): PlayoffWinnerTeam | null => {
    const groupPredictions = predictions[group];
    if (!groupPredictions) return null;

    let index: number;
    if (position.startsWith('1')) index = 0;
    else if (position.startsWith('2')) index = 1;
    else if (position.startsWith('3')) index = 2;
    else return null;

    const teamId = groupPredictions[index];
    return getTeamById(teamId);
  };

  // Get third place assignments based on selected best thirds (memoized)
  const thirdPlaceAssignments = useMemo(() =>
    bestThirdPlaces.length === 8 ? getThirdPlaceAssignments(bestThirdPlaces) : null,
    [bestThirdPlaces]
  );

  // Get winner of a match from predictions
  const getMatchWinner = (matchId: string): PlayoffWinnerTeam | null => {
    const winnerId = knockoutPredictions[matchId];
    if (!winnerId) return null;
    return getTeamById(winnerId);
  };

  // Get loser of a match from predictions
  const getMatchLoser = (matchId: string, teamAId: number, teamBId: number): PlayoffWinnerTeam | null => {
    const winnerId = knockoutPredictions[matchId];
    if (!winnerId) return null;
    const loserId = winnerId === teamAId ? teamBId : teamAId;
    return getTeamById(loserId);
  };

  // Build Round of 32 matches
  const buildR32Matches = (): BuildR32Match[] => {
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
  };

  // Build Round of 16 matches
  const buildR16Matches = (): BuildKnockoutMatch[] => {
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
  const buildQFMatches = (): BuildKnockoutMatch[] => {
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
  const buildSFMatches = (): BuildKnockoutMatch[] => {
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
  const buildThirdPlaceMatch = (): BuildSpecialMatch => {
    // Get losers from semifinals
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
  };

  // Build Final match
  const buildFinalMatch = (): BuildSpecialMatch => {
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

  // Memoize bracket calculations to avoid recalculating on every render
  const r32Matches = useMemo(() => buildR32Matches(), [predictions, playoffSelections, bestThirdPlaces, knockoutPredictions]);
  const r16Matches = useMemo(() => buildR16Matches(), [knockoutPredictions, playoffSelections]);
  const qfMatches = useMemo(() => buildQFMatches(), [knockoutPredictions, playoffSelections]);
  const sfMatches = useMemo(() => buildSFMatches(), [knockoutPredictions, playoffSelections]);
  const thirdPlace = useMemo(() => buildThirdPlaceMatch(), [knockoutPredictions, playoffSelections]);
  const final = useMemo(() => buildFinalMatch(), [knockoutPredictions, playoffSelections]);

  // Helper to clear dependent predictions
  const clearDependentPredictions = (matchId: string, predictions: KnockoutPredictions): KnockoutPredictions => {
    const newPredictions = { ...predictions };

    const clearDependents = (mId: string): void => {
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

    clearDependents(matchId);
    return newPredictions;
  };

  const selectWinner = (matchId: string, teamId: number): void => {
    // In scores mode, only allow click selection if there's a tie
    if (predictionMode === 'scores') {
      const score = knockoutScores[matchId];
      if (score && score.a !== '' && score.b !== '') {
        const scoreA = Number(score.a);
        const scoreB = Number(score.b);
        // If not a tie, don't allow click - winner is determined by score
        if (scoreA !== scoreB) {
          return;
        }
      }
    }

    setKnockoutPredictions(prev => {
      const newPredictions = { ...prev, [matchId]: teamId };

      // Only clear if changing an existing prediction
      if (prev[matchId] && prev[matchId] !== teamId) {
        return clearDependentPredictions(matchId, newPredictions);
      }

      return newPredictions;
    });
    setSaved(false);
  };

  // Handle score change for a knockout match
  const handleScoreChange = (matchId: string, teamAId: number | undefined, teamBId: number | undefined, newScoreA: number | string, newScoreB: number | string): void => {
    setKnockoutScores(prev => ({
      ...prev,
      [matchId]: { a: newScoreA, b: newScoreB }
    }));

    // Auto-derive winner if scores are different
    const scoreA = newScoreA === '' ? null : Number(newScoreA);
    const scoreB = newScoreB === '' ? null : Number(newScoreB);

    if (scoreA !== null && scoreB !== null) {
      if (scoreA > scoreB && teamAId) {
        // Team A wins
        setKnockoutPredictions(prev => {
          const newPreds = { ...prev, [matchId]: teamAId };
          if (prev[matchId] && prev[matchId] !== teamAId) {
            return clearDependentPredictions(matchId, newPreds);
          }
          return newPreds;
        });
      } else if (scoreB > scoreA && teamBId) {
        // Team B wins
        setKnockoutPredictions(prev => {
          const newPreds = { ...prev, [matchId]: teamBId };
          if (prev[matchId] && prev[matchId] !== teamBId) {
            return clearDependentPredictions(matchId, newPreds);
          }
          return newPreds;
        });
      } else if (scoreA === scoreB) {
        // Tie - clear winner, user must click to select
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

  // Show loading spinner while data is loading
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

  // Check if predictions are missing
  const missingPredictions = Object.keys(predictions).length === 0;
  const missingThirdPlaces = bestThirdPlaces.length !== 8;

  if (missingPredictions || missingThirdPlaces) {
    const groupsPage = predictionMode === 'scores' ? '/grupos-marcadores' : '/grupos';
    const groupsPageWithSet = setId ? `${groupsPage}?setId=${setId}` : groupsPage;
    const tercerosWith = setId ? `/terceros?setId=${setId}` : '/terceros';

    // In scores mode, both groups and third places come from the same page
    const redirectTo = predictionMode === 'scores'
      ? groupsPageWithSet
      : (missingPredictions ? groupsPageWithSet : tercerosWith);

    const redirectLabel = predictionMode === 'scores'
      ? 'Grupos (Marcadores)'
      : (missingPredictions ? 'Grupos' : 'Terceros');

    // Message varies by mode
    const message = predictionMode === 'scores'
      ? 'Debes completar los marcadores de todos los grupos primero.'
      : (missingPredictions
          ? 'Debes completar las predicciones de grupos primero.'
          : 'Debes seleccionar los 8 mejores terceros lugares primero.');

    return (
      <div className="container mx-auto px-4 py-8">
        <Alert className="mb-6">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
        <Button asChild>
          <Link to={redirectTo}>
            Ir a {redirectLabel}
          </Link>
        </Button>
      </div>
    );
  }

  // Tabs para móvil (cada tab muestra 2 rondas)
  const mobileRounds: MobileRound[] = [
    { id: 'r32', label: 'R32 → R16', count: r32Complete + r16Complete, total: 24, next: 'r16' },
    { id: 'r16', label: 'R16 → QF', count: r16Complete + qfComplete, total: 12, next: 'qf' },
    { id: 'qf', label: 'QF → SF', count: qfComplete + sfComplete, total: 6, next: 'final' },
    { id: 'final', label: 'SF → Final', count: sfComplete + thirdPlaceComplete + finalComplete, total: 4, next: null },
  ];

  // Mantener rounds original para desktop badge contador
  const rounds: Round[] = [
    { id: 'r32', label: 'Round of 32', count: r32Complete, total: 16, next: 'r16' },
    { id: 'r16', label: 'Round of 16', count: r16Complete, total: 8, next: 'qf' },
    { id: 'qf', label: 'Cuartos', count: qfComplete, total: 4, next: 'sf' },
    { id: 'sf', label: 'Semis', count: sfComplete, total: 2, next: 'final' },
    { id: 'final', label: 'Final', count: thirdPlaceComplete + finalComplete, total: 2, next: null },
  ];

  const currentRound = rounds.find(r => r.id === activeRound);
  const currentMobileRound = mobileRounds.find(r => r.id === activeRound);
  const isCurrentRoundComplete = currentMobileRound?.count === currentMobileRound?.total;

  const handleNextRound = (): void => {
    // Save progress
    localStorage.setItem('natalia_knockout', JSON.stringify(knockoutPredictions));
    // Go to next round
    if (currentRound?.next) {
      setActiveRound(currentRound.next);
    }
  };

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    setError(null);

    // Guardar en localStorage primero
    localStorage.setItem('natalia_knockout', JSON.stringify(knockoutPredictions));
    if (predictionMode === 'scores') {
      localStorage.setItem('natalia_knockout_scores', JSON.stringify(knockoutScores));
    }

    try {
      // Build data to send based on mode
      let dataToSave: any;
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
        dataToSave = saveData;
      } else {
        dataToSave = knockoutPredictions;
      }

      await predictionsAPI.saveKnockout(dataToSave, parseInt(setId!, 10));
      setSaved(true);
      // Clear saved message after 2 seconds
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError('Error al guardar en servidor');
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = async (): Promise<void> => {
    setSaving(true);
    setError(null);

    // Guardar en localStorage primero
    localStorage.setItem('natalia_knockout', JSON.stringify(knockoutPredictions));
    if (predictionMode === 'scores') {
      localStorage.setItem('natalia_knockout_scores', JSON.stringify(knockoutScores));
    }

    const nextUrl = setId ? `/prediccion/${setId}` : '/mis-predicciones';

    try {
      // Build data to send based on mode
      let dataToSave: any;
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
        dataToSave = saveData;
      } else {
        dataToSave = knockoutPredictions;
      }

      await predictionsAPI.saveKnockout(dataToSave, parseInt(setId!, 10));
      setSaved(true);
      window.scrollTo(0, 0);
      navigate(nextUrl);
    } catch (err) {
      setError('Error al guardar en servidor - Continuando con guardado local');
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
      navTimerRef.current = setTimeout(() => {
        window.scrollTo(0, 0);
        navigate(nextUrl);
      }, 800);
    } finally {
      setSaving(false);
    }
  };

  const handleBack = (): void => {
    // In scores mode, go back to grupos-marcadores (no separate terceros page)
    // In positions mode, go back to terceros
    const backPage = predictionMode === 'scores' ? '/grupos-marcadores' : '/terceros';
    const backUrl = setId ? `${backPage}?setId=${setId}` : backPage;
    window.scrollTo(0, 0);
    navigate(backUrl);
  };

  // Map round to previous round for back navigation
  const previousRound: Record<RoundId, RoundId | null> = {
    'r32': null,      // First round - goes to groups
    'r16': 'r32',
    'qf': 'r16',
    'sf': 'qf',
    'final': 'qf',
  };

  // Unified back button - goes to previous round or groups page
  const BackButton = ({ size = 'default' }: BackButtonProps): React.JSX.Element => {
    const prevRound = previousRound[activeRound];

    const handleClick = (): void => {
      if (prevRound) {
        scrollToRound(prevRound);
      } else {
        handleBack();
      }
    };

    return (
      <Button variant="outline" onClick={handleClick} size={size}>
        <ChevronLeft className="mr-1 h-4 w-4" />
        Atrás
      </Button>
    );
  };

  // Unified navigation button - always enabled except Finalizar requires completion
  const NavigationButton = ({ size = 'default' }: NavigationButtonProps): React.JSX.Element => {
    const isLastRound = activeRound === 'final';
    const isDisabled = saving || (isLastRound && !isComplete);

    const handleClick = (): void => {
      if (isLastRound) {
        handleFinish();
      } else if (currentMobileRound?.next) {
        scrollToRound(currentMobileRound.next);
      }
    };

    return (
      <Button onClick={handleClick} disabled={isDisabled} size={size}>
        {saving ? 'Guardando...' : isLastRound ? 'Finalizar' : 'Siguiente'}
        {isLastRound ? (
          <Trophy className="ml-1 h-4 w-4" />
        ) : (
          <ChevronRight className="ml-1 h-4 w-4" />
        )}
      </Button>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header con titulo */}
      <div className="mb-4">
        {predictionSetName && (
          <div className="text-sm text-muted-foreground mb-1">{predictionSetName}</div>
        )}
        <h1 className="text-2xl font-bold">Eliminatorias</h1>
        <p className="text-sm text-muted-foreground mt-1">Seleccionar los ganadores de partidos de Eliminatoria</p>
      </div>

      {/* Botones de navegacion en linea separada */}
      <div className="flex justify-between items-center mb-6">
        <BackButton />
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setKnockoutPredictions({})}
          >
            Reset
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={saving || Object.keys(knockoutPredictions).length === 0}
          >
            <Save className="w-4 h-4 mr-1" />
            Guardar
          </Button>
        </div>
        {/* Desktop: Finalizar siempre visible, Mobile: navegación por slides */}
        <div className="hidden lg:block">
          <Button onClick={handleFinish} disabled={saving || !isComplete}>
            {saving ? 'Guardando...' : 'Finalizar'}
            <Trophy className="ml-1 h-4 w-4" />
          </Button>
        </div>
        <div className="lg:hidden">
          <NavigationButton />
        </div>
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

      {/* DESKTOP: Bracket completo horizontal */}
      <div className="hidden lg:block">
        <FullBracket
          r32Matches={r32Matches}
          r16Matches={r16Matches}
          qfMatches={qfMatches}
          sfMatches={sfMatches}
          final={final}
          thirdPlace={thirdPlace}
          onSelectWinner={selectWinner}
          getTeamById={getTeamById}
          predictionMode={predictionMode}
          knockoutScores={knockoutScores}
          onScoreChange={handleScoreChange}
        />

        {/* Bottom navigation desktop */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t">
          <BackButton size="lg" />
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setKnockoutPredictions({})}
            >
              Reset
            </Button>
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={saving || Object.keys(knockoutPredictions).length === 0}
            >
              <Save className="w-4 h-4 mr-2" />
              Guardar
            </Button>
          </div>
          {/* Desktop: siempre mostrar Finalizar (deshabilitado hasta completar) */}
          <Button onClick={handleFinish} disabled={saving || !isComplete} size="lg">
            {saving ? 'Guardando...' : 'Finalizar'}
            <Trophy className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* MOBILE: Tabs por ronda */}
      <div className="lg:hidden">
        {/* Round selector tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {mobileRounds.map(round => (
            <Button
              key={round.id}
              variant={activeRound === round.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => scrollToRound(round.id)}
            >
              {round.label}
            </Button>
          ))}
        </div>

        {/* Scroll-snap container con slides */}
        <MobileKnockoutSlides
          r32Matches={r32Matches}
          r16Matches={r16Matches}
          qfMatches={qfMatches}
          sfMatches={sfMatches}
          final={final}
          thirdPlace={thirdPlace}
          predictionMode={predictionMode}
          knockoutScores={knockoutScores}
          onScoreChange={handleScoreChange}
          onSelectWinner={selectWinner}
          scrollContainerRef={scrollContainerRef}
          handleScroll={handleScroll}
          getTeamById={getTeamById}
        />

        {/* Bottom navigation mobile */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t">
          <BackButton size="lg" />
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setKnockoutPredictions({})}
            >
              Reset
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={saving || Object.keys(knockoutPredictions).length === 0}
            >
              <Save className="w-4 h-4" />
            </Button>
          </div>
          <NavigationButton size="lg" />
        </div>
      </div>
    </div>
  );
}

// Componente MobileMatchBox - wrapper que usa MatchBox unificado
function MobileMatchBox({ match, predictionMode, knockoutScores, onScoreChange, onSelectWinner }: MobileMatchBoxProps): React.JSX.Element | null {
  if (!match) return null;
  const showScoreInputs = predictionMode === 'scores';
  const score = knockoutScores[match.matchId] || {};

  return (
    <MatchBox
      teamA={toMatchTeam(match.teamA)}
      teamB={toMatchTeam(match.teamB)}
      selectedWinner={match.selectedWinner}
      onSelectWinner={(teamId) => onSelectWinner(match.matchId, typeof teamId === 'string' ? parseInt(teamId, 10) : teamId)}
      showScores={showScoreInputs}
      scoreA={score.a}
      scoreB={score.b}
      onScoreChange={(side, value) => {
        onScoreChange(
          match.matchId,
          match.teamA?.id,
          match.teamB?.id,
          side === 'a' ? value : score.a,
          side === 'b' ? value : score.b
        );
      }}
      size="lg"
    />
  );
}

// Componente MatchPair para móvil - FUERA del render
function MobileMatchPair({ match1, match2, nextMatch, predictionMode, knockoutScores, onScoreChange, onSelectWinner }: MobileMatchPairProps): React.JSX.Element {
  const MATCH_H = 64;
  const GAP = 4;
  const TOTAL_H = MATCH_H * 2 + GAP;
  const SVG_W = 20;
  const top1Center = MATCH_H / 2;
  const top2Center = MATCH_H + GAP + MATCH_H / 2;
  const midY = (top1Center + top2Center) / 2;

  return (
    <div className="flex items-center">
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <MobileMatchBox
          match={match1}
          predictionMode={predictionMode}
          knockoutScores={knockoutScores}
          onScoreChange={onScoreChange}
          onSelectWinner={onSelectWinner}
        />
        <MobileMatchBox
          match={match2}
          predictionMode={predictionMode}
          knockoutScores={knockoutScores}
          onScoreChange={onScoreChange}
          onSelectWinner={onSelectWinner}
        />
      </div>
      <svg width={SVG_W} height={TOTAL_H} className="shrink-0">
        <line x1="0" y1={top1Center} x2={SVG_W/2} y2={top1Center} stroke="#d1d5db" strokeWidth="1" />
        <line x1="0" y1={top2Center} x2={SVG_W/2} y2={top2Center} stroke="#d1d5db" strokeWidth="1" />
        <line x1={SVG_W/2} y1={top1Center} x2={SVG_W/2} y2={top2Center} stroke="#d1d5db" strokeWidth="1" />
        <line x1={SVG_W/2} y1={midY} x2={SVG_W} y2={midY} stroke="#d1d5db" strokeWidth="1" />
      </svg>
      <div className="flex-1 min-w-0">
        <MobileMatchBox
          match={nextMatch}
          predictionMode={predictionMode}
          knockoutScores={knockoutScores}
          onScoreChange={onScoreChange}
          onSelectWinner={onSelectWinner}
        />
      </div>
    </div>
  );
}

// Componente contenedor de slides móvil - FUERA del render
function MobileKnockoutSlides({ r32Matches, r16Matches, qfMatches, sfMatches, final, thirdPlace, predictionMode, knockoutScores, onScoreChange, onSelectWinner, scrollContainerRef, handleScroll, getTeamById }: MobileKnockoutSlidesProps): React.JSX.Element {
  const r32Pairs: MatchPair[] = [
    { m1: 'M74', m2: 'M77', next: 'M89' },
    { m1: 'M73', m2: 'M75', next: 'M90' },
    { m1: 'M83', m2: 'M84', next: 'M93' },
    { m1: 'M81', m2: 'M82', next: 'M94' },
    { m1: 'M76', m2: 'M78', next: 'M91' },
    { m1: 'M79', m2: 'M80', next: 'M92' },
    { m1: 'M86', m2: 'M88', next: 'M95' },
    { m1: 'M85', m2: 'M87', next: 'M96' },
  ];

  const r16Pairs: MatchPair[] = [
    { m1: 'M89', m2: 'M90', next: 'M97' },
    { m1: 'M93', m2: 'M94', next: 'M98' },
    { m1: 'M91', m2: 'M92', next: 'M99' },
    { m1: 'M95', m2: 'M96', next: 'M100' },
  ];

  const qfPairs: MatchPair[] = [
    { m1: 'M97', m2: 'M98', next: 'M101' },
    { m1: 'M99', m2: 'M100', next: 'M102' },
  ];

  const getMatch = (id: string): BuildR32Match | BuildKnockoutMatch | null => {
    return [...r32Matches, ...r16Matches, ...qfMatches, ...sfMatches].find(m => m.matchId === id) || null;
  };

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
    >
      {/* Slide 1: R32 → R16 */}
      <div className="w-full flex-shrink-0 snap-start snap-always px-1">
        <div className="space-y-4">
          <div className="flex gap-2 text-xs text-muted-foreground font-medium">
            <div className="flex-1 text-center">Dieciseisavos</div>
            <div className="w-5"></div>
            <div className="flex-1 text-center">Octavos</div>
          </div>
          {r32Pairs.map((pair, i) => (
            <MobileMatchPair
              key={i}
              match1={getMatch(pair.m1)}
              match2={getMatch(pair.m2)}
              nextMatch={getMatch(pair.next)}
              predictionMode={predictionMode}
              knockoutScores={knockoutScores}
              onScoreChange={onScoreChange}
              onSelectWinner={onSelectWinner}
            />
          ))}
        </div>
      </div>

      {/* Slide 2: R16 → QF */}
      <div className="w-full flex-shrink-0 snap-start snap-always px-1">
        <div className="space-y-4">
          <div className="flex gap-2 text-xs text-muted-foreground font-medium">
            <div className="flex-1 text-center">Octavos</div>
            <div className="w-5"></div>
            <div className="flex-1 text-center">Cuartos</div>
          </div>
          {r16Pairs.map((pair, i) => (
            <MobileMatchPair
              key={i}
              match1={getMatch(pair.m1)}
              match2={getMatch(pair.m2)}
              nextMatch={getMatch(pair.next)}
              predictionMode={predictionMode}
              knockoutScores={knockoutScores}
              onScoreChange={onScoreChange}
              onSelectWinner={onSelectWinner}
            />
          ))}
        </div>
      </div>

      {/* Slide 3: QF → SF */}
      <div className="w-full flex-shrink-0 snap-start snap-always px-1">
        <div className="space-y-4">
          <div className="flex gap-2 text-xs text-muted-foreground font-medium">
            <div className="flex-1 text-center">Cuartos</div>
            <div className="w-5"></div>
            <div className="flex-1 text-center">Semifinales</div>
          </div>
          {qfPairs.map((pair, i) => (
            <MobileMatchPair
              key={i}
              match1={getMatch(pair.m1)}
              match2={getMatch(pair.m2)}
              nextMatch={getMatch(pair.next)}
              predictionMode={predictionMode}
              knockoutScores={knockoutScores}
              onScoreChange={onScoreChange}
              onSelectWinner={onSelectWinner}
            />
          ))}
        </div>
      </div>

      {/* Slide 4: SF → Final + 3er Puesto */}
      <div className="w-full flex-shrink-0 snap-start snap-always px-1">
        <div className="space-y-4">
          <div className="flex gap-2 text-xs text-muted-foreground font-medium">
            <div className="flex-1 text-center">Semifinales</div>
            <div className="w-5"></div>
            <div className="flex-1 text-center">Final</div>
          </div>
          <MobileMatchPair
            match1={sfMatches.find(m => m.matchId === 'M101') || null}
            match2={sfMatches.find(m => m.matchId === 'M102') || null}
            nextMatch={final}
            predictionMode={predictionMode}
            knockoutScores={knockoutScores}
            onScoreChange={onScoreChange}
            onSelectWinner={onSelectWinner}
          />

          {final.selectedWinner && (
            <div className="p-2 bg-yellow-50 border-2 border-yellow-400 rounded-lg w-fit">
              <div className="text-[10px] text-yellow-700 mb-1">Campeón</div>
              <div className="flex items-center gap-2">
                <img src={getTeamById(final.selectedWinner)?.flag_url} alt="" className="w-8 h-5 object-cover rounded shadow" />
                <span className="text-sm font-bold">{getTeamById(final.selectedWinner)?.name}</span>
                <span className="text-lg">🏆</span>
              </div>
            </div>
          )}

          <div className="pt-4 border-t">
            <div className="text-xs font-semibold text-muted-foreground mb-2">3er Puesto</div>
            <MobileMatchBox
              match={thirdPlace}
              predictionMode={predictionMode}
              knockoutScores={knockoutScores}
              onScoreChange={onScoreChange}
              onSelectWinner={onSelectWinner}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente TeamButton reutilizable
function TeamButton({ team, matchId, isSelected, isEliminated, onSelect, canSelect }: TeamButtonProps): React.JSX.Element {
  if (!team) {
    return (
      <div className="p-1.5 rounded border border-dashed text-center text-[10px] text-muted-foreground bg-muted/30 w-[150px]">
        Por definir
      </div>
    );
  }

  return (
    <button
      onClick={() => canSelect && onSelect(matchId, team.id)}
      disabled={!canSelect}
      className={`flex items-center gap-1.5 p-1.5 rounded border transition-all text-left w-[150px]
        ${isSelected ? 'bg-green-100 border-green-400 ring-2 ring-green-400' : ''}
        ${isEliminated ? 'opacity-40' : canSelect ? 'hover:bg-muted' : ''}
        ${!canSelect && !isSelected && !isEliminated ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <img src={team.flag_url} alt={team.name} className="w-5 h-3 object-cover rounded shrink-0" />
      <span className="text-xs font-medium truncate flex-1">{team.name}</span>
      {team.thirdPlaceFrom && (
        <span className="text-[10px] text-muted-foreground shrink-0">3{team.thirdPlaceFrom}</span>
      )}
    </button>
  );
}

// Componente WinnerSlot reutilizable
function WinnerSlot({ team, highlight = null }: WinnerSlotProps): React.JSX.Element {
  const highlightStyles = {
    gold: 'bg-yellow-50 border-yellow-400',
    bronze: 'bg-amber-50 border-amber-500',
  };

  if (team) {
    return (
      <div className={`p-1.5 rounded border flex items-center gap-1.5 w-[150px] ${highlight ? highlightStyles[highlight] : 'bg-green-50 border-green-300'}`}>
        <img src={team.flag_url} alt="" className="w-5 h-3 object-cover rounded shrink-0" />
        <span className={`text-xs font-bold truncate flex-1 ${highlight === 'gold' ? 'text-yellow-700' : highlight === 'bronze' ? 'text-amber-700' : 'text-green-700'}`}>
          {team.name}
        </span>
      </div>
    );
  }

  return (
    <div className="p-1.5 rounded border-2 border-dashed border-muted-foreground/30 text-center text-xs text-muted-foreground w-[150px]">
      Ganador
    </div>
  );
}

// Un partido individual (2 equipos → 1 ganador)
function MatchUnit({ match, onSelectWinner, showLabel = true }: MatchUnitProps): React.JSX.Element {
  const { matchId, matchNumber, teamA, teamB, selectedWinner, label } = match;
  const canSelect = teamA && teamB;
  const winnerTeam = selectedWinner ? (selectedWinner === teamA?.id ? teamA : teamB) : null;

  return (
    <div className="flex items-stretch gap-0.5">
      {/* Columna equipos */}
      <div className="space-y-0.5">
        {showLabel && (
          <div className="text-[10px] text-muted-foreground font-medium mb-0.5">
            {label || matchId}
          </div>
        )}
        <TeamButton
          team={teamA}
          matchId={matchId}
          isSelected={selectedWinner === teamA?.id}
          isEliminated={!!(selectedWinner && selectedWinner !== teamA?.id)}
          onSelect={onSelectWinner}
          canSelect={!!canSelect}
        />
        <TeamButton
          team={teamB}
          matchId={matchId}
          isSelected={selectedWinner === teamB?.id}
          isEliminated={!!(selectedWinner && selectedWinner !== teamB?.id)}
          onSelect={onSelectWinner}
          canSelect={!!canSelect}
        />
      </div>

      {/* Linea conectora */}
      <div className="w-2 flex items-center">
        <div className="w-full border-t-2 border-r-2 border-b-2 border-muted-foreground/30 rounded-r h-5" />
      </div>

      {/* Columna ganador */}
      <div className="flex items-center">
        <WinnerSlot team={winnerTeam} />
      </div>
    </div>
  );
}

// Par de partidos conectados al partido de siguiente ronda
function BracketPair({ match1, match2, nextRoundMatch, onSelectWinner }: BracketPairProps): React.JSX.Element {
  const winner1 = match1.selectedWinner ? (match1.selectedWinner === match1.teamA?.id ? match1.teamA : match1.teamB) : null;
  const winner2 = match2.selectedWinner ? (match2.selectedWinner === match2.teamA?.id ? match2.teamA : match2.teamB) : null;

  return (
    <div className="flex items-stretch">
      {/* Columna de partidos actuales */}
      <div className="space-y-2">
        <MatchUnit match={match1} onSelectWinner={onSelectWinner} />
        <MatchUnit match={match2} onSelectWinner={onSelectWinner} />
      </div>

      {/* Conector hacia siguiente ronda */}
      <div className="w-4 flex flex-col justify-center">
        <div className="flex-1 border-b-2 border-r-2 border-muted-foreground/20 rounded-br" />
        <div className="flex-1 border-t-2 border-r-2 border-muted-foreground/20 rounded-tr" />
      </div>

      {/* Vista previa de siguiente ronda */}
      <div className="flex flex-col justify-center pl-1">
        <div className="text-[10px] text-muted-foreground mb-1">{nextRoundMatch || 'Sig. Ronda'}</div>
        <div className="space-y-0.5">
          <WinnerSlot team={winner1} />
          <WinnerSlot team={winner2} />
        </div>
      </div>
    </div>
  );
}

// Partido individual con highlight (para Final y 3er puesto)
function SingleMatch({ match, onSelectWinner, highlight = null }: SingleMatchProps): React.JSX.Element {
  const { matchId, teamA, teamB, selectedWinner, label } = match;
  const canSelect = teamA && teamB;
  const winnerTeam = selectedWinner ? (selectedWinner === teamA?.id ? teamA : teamB) : null;

  const containerStyles = {
    gold: 'bg-yellow-50/50 border-yellow-300 rounded-lg p-3',
    bronze: 'bg-amber-50/50 border-amber-300 rounded-lg p-3',
  };

  return (
    <div className={highlight ? containerStyles[highlight] : ''}>
      <div className="text-sm font-medium mb-2">{label || matchId}</div>
      <div className="flex items-stretch gap-0.5">
        <div className="space-y-0.5">
          <TeamButton
            team={teamA}
            matchId={matchId}
            isSelected={selectedWinner === teamA?.id}
            isEliminated={!!(selectedWinner && selectedWinner !== teamA?.id)}
            onSelect={onSelectWinner}
            canSelect={!!canSelect}
          />
          <TeamButton
            team={teamB}
            matchId={matchId}
            isSelected={selectedWinner === teamB?.id}
            isEliminated={!!(selectedWinner && selectedWinner !== teamB?.id)}
            onSelect={onSelectWinner}
            canSelect={!!canSelect}
          />
        </div>
        <div className="w-2 flex items-center">
          <div className="w-full border-t-2 border-r-2 border-b-2 border-muted-foreground/30 rounded-r h-5" />
        </div>
        <div className="flex items-center">
          <WinnerSlot team={winnerTeam} highlight={highlight} />
        </div>
      </div>
    </div>
  );
}

// Componente BracketMatch para desktop - wrapper que usa MatchBox unificado
function DesktopBracketMatch({ match, predictionMode, knockoutScores, onScoreChange, onSelectWinner, matchWidth }: DesktopBracketMatchProps): React.JSX.Element | null {
  if (!match) return null;
  const showScoreInputs = predictionMode === 'scores';
  const score = knockoutScores[match.matchId] || {};

  return (
    <div style={{ width: matchWidth }} className="shrink-0">
      <MatchBox
        teamA={toMatchTeam(match.teamA)}
        teamB={toMatchTeam(match.teamB)}
        selectedWinner={match.selectedWinner}
        onSelectWinner={(teamId) => onSelectWinner(match.matchId, typeof teamId === 'string' ? parseInt(teamId, 10) : teamId)}
        showScores={showScoreInputs}
        scoreA={score.a}
        scoreB={score.b}
        onScoreChange={(side, value) => {
          onScoreChange(
            match.matchId,
            match.teamA?.id,
            match.teamB?.id,
            side === 'a' ? value : score.a,
            side === 'b' ? value : score.b
          );
        }}
        size="sm"
      />
    </div>
  );
}

// Componente para un slot de equipo en el bracket (clickeable)
function BracketSlot({ team, matchId, isSelected, isEliminated, onSelect, canSelect, small = false }: BracketSlotProps): React.JSX.Element {
  if (!team) {
    return (
      <div className={`rounded border border-dashed border-muted-foreground/30 bg-muted/20 text-center text-muted-foreground ${small ? 'p-1 text-[10px] w-[120px]' : 'p-1.5 text-xs w-[150px]'}`}>
        Por definir
      </div>
    );
  }

  return (
    <button
      onClick={() => canSelect && onSelect(matchId, team.id)}
      disabled={!canSelect}
      className={`flex items-center gap-1.5 rounded border transition-all text-left
        ${small ? 'p-1 w-[120px]' : 'p-1.5 w-[150px]'}
        ${isSelected ? 'bg-green-100 border-green-400 ring-2 ring-green-400' : 'border-border'}
        ${isEliminated ? 'opacity-40' : canSelect ? 'hover:bg-muted cursor-pointer' : ''}
        ${!canSelect && !isSelected && !isEliminated ? 'opacity-60' : ''}
      `}
    >
      <img src={team.flag_url} alt={team.name} className={`object-cover rounded shrink-0 ${small ? 'w-4 h-2.5' : 'w-5 h-3'}`} />
      <span className={`font-medium truncate flex-1 ${small ? 'text-[10px]' : 'text-xs'}`}>{team.name}</span>
    </button>
  );
}

// Bracket completo horizontal para desktop
function FullBracket({ r32Matches, r16Matches, qfMatches, sfMatches, final, thirdPlace, onSelectWinner, getTeamById, predictionMode, knockoutScores, onScoreChange }: FullBracketProps): React.JSX.Element {
  const showScoreInputs = predictionMode === 'scores';

  // Orden visual correcto para el bracket (según estructura FIFA)
  // R32 ordenados para que alimenten correctamente a R16
  const r32VisualOrder = [
    'M74', 'M77',  // → M89
    'M73', 'M75',  // → M90
    'M83', 'M84',  // → M93
    'M81', 'M82',  // → M94
    'M76', 'M78',  // → M91
    'M79', 'M80',  // → M92
    'M86', 'M88',  // → M95
    'M85', 'M87',  // → M96
  ];

  const r16VisualOrder = [
    'M89', 'M90',  // → M97
    'M93', 'M94',  // → M98
    'M91', 'M92',  // → M99
    'M95', 'M96',  // → M100
  ];

  const qfVisualOrder = [
    'M97', 'M98',   // → M101
    'M99', 'M100',  // → M102
  ];

  const sfVisualOrder = ['M101', 'M102']; // → M104 (Final)

  // Reordenar los matches según el orden visual
  const getMatchById = (matches: (BuildR32Match | BuildKnockoutMatch)[], id: string): BuildR32Match | BuildKnockoutMatch | undefined =>
    matches.find(m => m.matchId === id);

  const r32Ordered = r32VisualOrder.map(id => getMatchById(r32Matches, id)).filter(Boolean) as BuildR32Match[];
  const r16Ordered = r16VisualOrder.map(id => getMatchById(r16Matches, id)).filter(Boolean) as BuildKnockoutMatch[];
  const qfOrdered = qfVisualOrder.map(id => getMatchById(qfMatches, id)).filter(Boolean) as BuildKnockoutMatch[];
  const sfOrdered = sfVisualOrder.map(id => getMatchById(sfMatches, id)).filter(Boolean) as BuildKnockoutMatch[];

  // Constantes de dimensiones (en pixeles)
  const MATCH_HEIGHT = showScoreInputs ? 60 : 52; // altura de un partido (2 equipos de ~24px + 4px de border/gap + tie indicator)
  const MATCH_WIDTH = showScoreInputs ? 180 : 140; // wider to accommodate score inputs
  const CONNECTOR_WIDTH = 24;
  const TITLE_HEIGHT = 24;

  // Gaps entre partidos para cada ronda (van aumentando para centrar con siguiente ronda)
  const R32_GAP = 8;
  const R16_GAP = R32_GAP + MATCH_HEIGHT + R32_GAP; // espacio de 1 partido + gaps
  const QF_GAP = R16_GAP + MATCH_HEIGHT + R16_GAP;
  const SF_GAP = QF_GAP + MATCH_HEIGHT + QF_GAP;

  // Calcular la posición Y del centro de un partido dado su índice y gap
  const getMatchCenterY = (index: number, gap: number): number => {
    return TITLE_HEIGHT + (MATCH_HEIGHT / 2) + index * (MATCH_HEIGHT + gap);
  };

  // Calcular altura total de una columna
  const getColumnHeight = (count: number, gap: number): number => {
    return TITLE_HEIGHT + count * MATCH_HEIGHT + (count - 1) * gap;
  };

  // El bracket completo usa posicionamiento absoluto
  const r32Height = getColumnHeight(16, R32_GAP);

  return (
    <div className="overflow-x-auto pb-4">
      <div className="relative min-w-max" style={{ height: r32Height + 100 }}>

        {/* Títulos de rondas */}
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

        {/* R32 - 16 partidos */}
        {r32Ordered.map((match, i) => (
          <div key={match.matchId} className="absolute"
               style={{ left: 0, top: TITLE_HEIGHT + i * (MATCH_HEIGHT + R32_GAP) }}>
            <DesktopBracketMatch match={match} predictionMode={predictionMode} knockoutScores={knockoutScores} onScoreChange={onScoreChange} onSelectWinner={onSelectWinner} matchWidth={MATCH_WIDTH} />
          </div>
        ))}

        {/* Conectores R32 → R16 */}
        <svg className="absolute pointer-events-none"
             style={{ left: MATCH_WIDTH, top: 0, width: CONNECTOR_WIDTH, height: r32Height }}>
          {Array.from({ length: 8 }, (_, i) => {
            const topMatchCenter = getMatchCenterY(i * 2, R32_GAP);
            const bottomMatchCenter = getMatchCenterY(i * 2 + 1, R32_GAP);
            // El centro del partido R16 es el punto medio entre los 2 R32 que lo alimentan
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

        {/* R16 - 8 partidos (centrados entre cada par de R32) */}
        {r16Ordered.map((match, i) => {
          const topR32Center = getMatchCenterY(i * 2, R32_GAP);
          const bottomR32Center = getMatchCenterY(i * 2 + 1, R32_GAP);
          const centerY = (topR32Center + bottomR32Center) / 2 - MATCH_HEIGHT / 2;

          return (
            <div key={match.matchId} className="absolute"
                 style={{ left: MATCH_WIDTH + CONNECTOR_WIDTH, top: centerY }}>
              <DesktopBracketMatch match={match} predictionMode={predictionMode} knockoutScores={knockoutScores} onScoreChange={onScoreChange} onSelectWinner={onSelectWinner} matchWidth={MATCH_WIDTH} />
            </div>
          );
        })}

        {/* Conectores R16 → QF */}
        <svg className="absolute pointer-events-none"
             style={{ left: MATCH_WIDTH * 2 + CONNECTOR_WIDTH, top: 0, width: CONNECTOR_WIDTH, height: r32Height }}>
          {Array.from({ length: 4 }, (_, i) => {
            const topIdx = i * 2;
            const bottomIdx = i * 2 + 1;
            // Centro de los partidos R16
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

        {/* QF - 4 partidos */}
        {qfOrdered.map((match, i) => {
          // Centro entre 4 R32 matches (posiciones i*4, i*4+1, i*4+2, i*4+3)
          const topR32 = getMatchCenterY(i * 4, R32_GAP);
          const bottomR32 = getMatchCenterY(i * 4 + 3, R32_GAP);
          const centerY = (topR32 + bottomR32) / 2 - MATCH_HEIGHT / 2;

          return (
            <div key={match.matchId} className="absolute"
                 style={{ left: (MATCH_WIDTH + CONNECTOR_WIDTH) * 2, top: centerY }}>
              <DesktopBracketMatch match={match} predictionMode={predictionMode} knockoutScores={knockoutScores} onScoreChange={onScoreChange} onSelectWinner={onSelectWinner} matchWidth={MATCH_WIDTH} />
            </div>
          );
        })}

        {/* Conectores QF → SF */}
        <svg className="absolute pointer-events-none"
             style={{ left: MATCH_WIDTH * 3 + CONNECTOR_WIDTH * 2, top: 0, width: CONNECTOR_WIDTH, height: r32Height }}>
          {Array.from({ length: 2 }, (_, i) => {
            const topIdx = i * 2;
            const bottomIdx = i * 2 + 1;
            // Centro de los QF matches
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

        {/* SF - 2 partidos */}
        {sfOrdered.map((match, i) => {
          // Centro entre 8 R32 matches
          const topR32 = getMatchCenterY(i * 8, R32_GAP);
          const bottomR32 = getMatchCenterY(i * 8 + 7, R32_GAP);
          const centerY = (topR32 + bottomR32) / 2 - MATCH_HEIGHT / 2;

          return (
            <div key={match.matchId} className="absolute"
                 style={{ left: (MATCH_WIDTH + CONNECTOR_WIDTH) * 3, top: centerY }}>
              <DesktopBracketMatch match={match} predictionMode={predictionMode} knockoutScores={knockoutScores} onScoreChange={onScoreChange} onSelectWinner={onSelectWinner} matchWidth={MATCH_WIDTH} />
            </div>
          );
        })}

        {/* Conectores SF → Final */}
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
              <DesktopBracketMatch match={final} predictionMode={predictionMode} knockoutScores={knockoutScores} onScoreChange={onScoreChange} onSelectWinner={onSelectWinner} matchWidth={MATCH_WIDTH} />
              {final.selectedWinner && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-400 rounded text-center" style={{ width: MATCH_WIDTH }}>
                  <div className="text-[10px] text-yellow-700 mb-1">Campeón</div>
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

        {/* 3er Puesto - debajo de la Final */}
        {(() => {
          const topSFCenter = (getMatchCenterY(0, R32_GAP) + getMatchCenterY(7, R32_GAP)) / 2;
          const bottomSFCenter = (getMatchCenterY(8, R32_GAP) + getMatchCenterY(15, R32_GAP)) / 2;
          const finalCenterY = (topSFCenter + bottomSFCenter) / 2 - MATCH_HEIGHT / 2;
          // Posicionar debajo de la final + espacio para el campeón
          const thirdPlaceTop = finalCenterY + MATCH_HEIGHT + 120;

          return (
            <div className="absolute" style={{ left: (MATCH_WIDTH + CONNECTOR_WIDTH) * 4, top: thirdPlaceTop }}>
              <div className="text-xs font-semibold text-center text-muted-foreground mb-2" style={{ width: MATCH_WIDTH }}>3er Puesto</div>
              <DesktopBracketMatch match={thirdPlace} predictionMode={predictionMode} knockoutScores={knockoutScores} onScoreChange={onScoreChange} onSelectWinner={onSelectWinner} matchWidth={MATCH_WIDTH} />
            </div>
          );
        })()}

      </div>
    </div>
  );
}
