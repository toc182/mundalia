import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ChevronRight } from 'lucide-react';
import { playoffs } from '@/data/playoffsData';
import { predictionsAPI, predictionSetsAPI } from '@/services/api';
import MatchBox from '@/components/MatchBox';
import type { Playoff, PlayoffTeam } from '@/types';

interface PlayoffSelections {
  [playoffId: string]: {
    semi1?: number;
    semi2?: number;
    final?: number;
  };
}

interface SubsequentData {
  hasGroups: boolean;
  hasThirds: boolean;
  hasKnockout: boolean;
}

interface PlayoffBracketProps {
  playoff: Playoff;
  selections: {
    semi1?: number;
    semi2?: number;
    final?: number;
  };
  onSelectWinner: (round: string, winnerId: number) => void;
  getTeamById: (teamId: number) => PlayoffTeam | undefined;
}

interface PlayoffBracketFIFAProps {
  playoff: Playoff;
  selections: {
    semi1?: number;
    final?: number;
  };
  onSelectWinner: (round: string, winnerId: number) => void;
  getTeamById: (teamId: number) => PlayoffTeam | undefined;
}

interface NextButtonProps {
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export default function Playoffs(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setId = searchParams.get('setId');

  const [selections, setSelections] = useState<PlayoffSelections>({});
  const [saved, setSaved] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [predictionMode, setPredictionMode] = useState<'positions' | 'scores'>('positions');

  // Timer ref for cleanup
  const navTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Snapshot for change detection
  const originalSelectionsRef = useRef<PlayoffSelections | null>(null);
  const [showResetWarning, setShowResetWarning] = useState<boolean>(false);
  const [subsequentData, setSubsequentData] = useState<SubsequentData>({ hasGroups: false, hasThirds: false, hasKnockout: false });

  // Compare current selections with original to detect real changes
  const hasRealChanges = (): boolean => {
    if (!originalSelectionsRef.current) return false;
    const original = originalSelectionsRef.current;
    const current = selections;

    // Compare each playoff's final winner (that's what matters for downstream)
    for (const playoffId of Object.keys({ ...original, ...current })) {
      const origFinal = original[playoffId]?.final;
      const currFinal = current[playoffId]?.final;
      if (origFinal !== currFinal) {
        return true;
      }
    }
    return false;
  };

  useEffect(() => {
    const loadSelections = async (): Promise<void> => {
      // Si hay setId, solo cargar del servidor (sin fallback a localStorage)
      if (setId) {
        try {
          // Load playoffs and prediction set info in parallel
          const [playoffsRes, setInfoRes] = await Promise.all([
            predictionsAPI.getPlayoffs(setId),
            predictionSetsAPI.getById(setId),
          ]);

          if (playoffsRes.data && Object.keys(playoffsRes.data).length > 0) {
            setSelections(playoffsRes.data);
            // Save snapshot of original selections
            originalSelectionsRef.current = JSON.parse(JSON.stringify(playoffsRes.data));
          } else {
            originalSelectionsRef.current = {};
          }

          // Set prediction mode from the prediction set
          if (setInfoRes.data?.mode) {
            setPredictionMode(setInfoRes.data.mode);
          }
        } catch (err) {
          // Error de servidor, empezar en blanco
          console.error('[PLAYOFFS] Error loading playoffs:', err);
          originalSelectionsRef.current = {};
        }
      } else {
        // Sin setId: comportamiento legacy con localStorage
        const savedSelections = localStorage.getItem('natalia_playoffs');
        if (savedSelections) {
          const parsed = JSON.parse(savedSelections);
          setSelections(parsed);
          originalSelectionsRef.current = JSON.parse(JSON.stringify(parsed));
        } else {
          originalSelectionsRef.current = {};
        }
      }
    };
    loadSelections();
  }, [setId]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
    };
  }, []);

  const selectWinner = (playoffId: string, round: string, winnerId: number): void => {
    setSelections(prev => {
      const playoffSelections = prev[playoffId] || {};

      // Si cambia el ganador de una semi, limpiar la final
      if (round.startsWith('semi')) {
        return {
          ...prev,
          [playoffId]: {
            ...playoffSelections,
            [round]: winnerId,
            final: playoffSelections.final === winnerId ? winnerId : undefined
          }
        };
      }

      return {
        ...prev,
        [playoffId]: {
          ...playoffSelections,
          [round]: winnerId
        }
      };
    });
    setSaved(false);
  };

  // Check if all playoffs are complete
  const isComplete = (): boolean => {
    return playoffs.every(playoff => {
      const sel = selections[playoff.id];
      if (!sel?.final) return false;
      return true;
    });
  };

  const handleContinue = async (): Promise<void> => {

    // Check if there are real changes
    const changesDetected = hasRealChanges();

    // If there are changes and we have a setId, check for subsequent data
    if (changesDetected && setId) {
      try {
        const response = await predictionsAPI.hasSubsequentData(setId, 'playoffs');
        const { hasGroups, hasThirds, hasKnockout } = response.data;

        if (hasGroups || hasThirds || hasKnockout) {
          // Show warning modal
          setSubsequentData({ hasGroups, hasThirds, hasKnockout });
          setShowResetWarning(true);
          return;
        }
      } catch (err) {
        console.error('[PLAYOFFS] Error checking subsequent data:', err);
        // Continue anyway if check fails
      }
    }

    // No changes or no subsequent data - proceed normally
    await saveAndNavigate();
  };

  const saveAndNavigate = async (resetFirst: boolean = false): Promise<void> => {
    setSaving(true);
    setError(null);
    setShowResetWarning(false);

    // Guardar en localStorage primero
    localStorage.setItem('natalia_playoffs', JSON.stringify(selections));

    // Navigate to correct page based on prediction mode
    const groupsPage = predictionMode === 'scores' ? '/grupos-marcadores' : '/grupos';
    const nextUrl = setId ? `${groupsPage}?setId=${setId}` : groupsPage;

    try {
      // If we need to reset subsequent data first
      if (resetFirst && setId) {
        await predictionsAPI.resetFromPlayoffs(setId);
      }

      const response = await predictionsAPI.savePlayoffs(selections, setId);

      // Update snapshot to current state after successful save
      originalSelectionsRef.current = JSON.parse(JSON.stringify(selections));

      setSaved(true);
      window.scrollTo(0, 0);
      navigate(nextUrl);
    } catch (err: any) {
      console.error('[PLAYOFFS] savePlayoffs error:', err.response?.data || err.message);
      setError(t('errors.savingFailed'));
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
      navTimerRef.current = setTimeout(() => {
        window.scrollTo(0, 0);
        navigate(nextUrl);
      }, 800);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmReset = (): void => {
    saveAndNavigate(true);
  };

  const handleCancelReset = (): void => {
    setShowResetWarning(false);
  };

  const getTeamById = (playoff: Playoff, teamId: number): PlayoffTeam | undefined => {
    return playoff.teams.find(t => t.id === teamId);
  };

  const completedCount = playoffs.filter(p => selections[p.id]?.final).length;

  const NextButton = ({ size = 'default' }: NextButtonProps): JSX.Element => (
    <Button
      onClick={handleContinue}
      disabled={!isComplete() || saving}
      size={size}
    >
      {saving ? t('common.loading') : t('common.next')}
      <ChevronRight className="ml-1 h-4 w-4" />
    </Button>
  );

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header con titulo */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold">{t('playoffs.title')}</h1>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm text-muted-foreground">{t('playoffs.step')}</span>
          <Badge variant={isComplete() ? 'default' : 'secondary'}>
            {completedCount}/{playoffs.length}
          </Badge>
        </div>
      </div>

      {/* Botones de navegacion en linea separada */}
      <div className="flex justify-end mb-6">
        <NextButton />
      </div>

      {saved && (
        <Alert className="mb-6">
          <AlertDescription>
            {t('common.success')}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!isComplete() && (
        <Alert className="mb-6">
          <AlertDescription>
            {t('playoffs.description')}
          </AlertDescription>
        </Alert>
      )}

      {/* UEFA Playoffs */}
      <h2 className="text-xl font-semibold mb-4">{t('playoffs.uefaPlayoffs')}</h2>
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {playoffs.filter(p => p.confederation === 'UEFA').map(playoff => (
          <PlayoffBracket
            key={playoff.id}
            playoff={playoff}
            selections={selections[playoff.id] || {}}
            onSelectWinner={(round, winnerId) => selectWinner(playoff.id, round, winnerId)}
            getTeamById={(teamId) => getTeamById(playoff, teamId)}
          />
        ))}
      </div>

      {/* FIFA Playoffs */}
      <h2 className="text-xl font-semibold mb-4">{t('playoffs.fifaPlayoffs')}</h2>
      <div className="grid md:grid-cols-2 gap-6">
        {playoffs.filter(p => p.confederation === 'FIFA').map(playoff => (
          <PlayoffBracketFIFA
            key={playoff.id}
            playoff={playoff}
            selections={selections[playoff.id] || {}}
            onSelectWinner={(round, winnerId) => selectWinner(playoff.id, round, winnerId)}
            getTeamById={(teamId) => getTeamById(playoff, teamId)}
          />
        ))}
      </div>

      {/* Bottom navigation */}
      <div className="flex justify-end mt-8 pt-6 border-t">
        <NextButton size="lg" />
      </div>

      {/* Reset Warning Modal */}
      <Dialog open={showResetWarning} onOpenChange={setShowResetWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('playoffs.changesDetected')}</DialogTitle>
            <DialogDescription>
              {t('playoffs.changesWarning')}
              <ul className="list-disc list-inside mt-2 space-y-1">
                {subsequentData.hasGroups && <li>{t('playoffs.groupPredictions')}</li>}
                {subsequentData.hasThirds && <li>{t('playoffs.thirdPlaceSelection')}</li>}
                {subsequentData.hasKnockout && <li>{t('playoffs.knockoutPredictions')}</li>}
              </ul>
              <p className="mt-3 font-medium">{t('playoffs.resetConfirm')}</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCancelReset}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirmReset} disabled={saving}>
              {saving ? t('common.loading') : t('playoffs.continueAndDelete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlayoffBracket({ playoff, selections, onSelectWinner, getTeamById }: PlayoffBracketProps): JSX.Element {
  const { t } = useTranslation();
  const semi1Winner = selections.semi1;
  const semi2Winner = selections.semi2;
  const finalWinner = selections.final;

  // Helper para crear props de MatchBox
  const getMatchBoxProps = (teamAId: number, teamBId: number, round: string, selectedWinner: number | undefined) => ({
    teamA: getTeamById(teamAId) || null,
    teamB: getTeamById(teamBId) || null,
    selectedWinner: selectedWinner || null,
    onSelectWinner: (teamId: number) => onSelectWinner(round, teamId),
    size: 'md' as const,
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-base">{playoff.name}</CardTitle>
            <CardDescription className="text-xs">
              {t('playoffs.winnerGoesTo', { group: playoff.destinationGroup })}
            </CardDescription>
          </div>
          {finalWinner && (
            <Badge className="bg-green-500 text-xs">{t('predictions.complete')}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Labels row */}
        <div className="flex mb-1">
          <div className="flex-1 text-xs text-muted-foreground font-medium">{t('playoffs.semifinal')}</div>
          <div className="w-5" />
          <div className="flex-1 text-xs text-muted-foreground font-medium">{t('playoffs.final')}</div>
        </div>

        {/* Bracket visual - constantes igual que Knockout */}
        {(() => {
          const MATCH_H = 64;
          const GAP = 4;
          const TOTAL_H = MATCH_H * 2 + GAP;
          const SVG_W = 20;
          const top1Center = MATCH_H / 2;
          const top2Center = MATCH_H + GAP + MATCH_H / 2;
          const midY = (top1Center + top2Center) / 2;

          return (
            <div className="flex items-center">
              {/* Columna Semifinales */}
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <MatchBox
                  {...getMatchBoxProps(playoff.bracket.semi1.teamA, playoff.bracket.semi1.teamB, 'semi1', semi1Winner)}
                />
                <MatchBox
                  {...getMatchBoxProps(playoff.bracket.semi2.teamA, playoff.bracket.semi2.teamB, 'semi2', semi2Winner)}
                />
              </div>

              {/* Lineas conectoras SVG */}
              <svg width={SVG_W} height={TOTAL_H} className="shrink-0">
                <line x1="0" y1={top1Center} x2={SVG_W/2} y2={top1Center} stroke="#d1d5db" strokeWidth="1" />
                <line x1="0" y1={top2Center} x2={SVG_W/2} y2={top2Center} stroke="#d1d5db" strokeWidth="1" />
                <line x1={SVG_W/2} y1={top1Center} x2={SVG_W/2} y2={top2Center} stroke="#d1d5db" strokeWidth="1" />
                <line x1={SVG_W/2} y1={midY} x2={SVG_W} y2={midY} stroke="#d1d5db" strokeWidth="1" />
              </svg>

              {/* Columna Final */}
              <div className="flex-1 min-w-0">
                <MatchBox
                  {...getMatchBoxProps(semi1Winner || 0, semi2Winner || 0, 'final', finalWinner)}
                />
              </div>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}

function PlayoffBracketFIFA({ playoff, selections, onSelectWinner, getTeamById }: PlayoffBracketFIFAProps): JSX.Element {
  const { t } = useTranslation();
  const semi1Winner = selections.semi1;
  const finalWinner = selections.final;
  const seededTeam = getTeamById(playoff.bracket.finalTeamA);

  // Helper para crear props de MatchBox
  const getMatchBoxProps = (teamAId: number, teamBId: number, round: string, selectedWinner: number | undefined) => ({
    teamA: getTeamById(teamAId) || null,
    teamB: getTeamById(teamBId) || null,
    selectedWinner: selectedWinner || null,
    onSelectWinner: (teamId: number) => onSelectWinner(round, teamId),
    size: 'md' as const,
  });

  // Seeded team box (team on top, "-" on bottom) - no clickeable
  const SeededTeamBox = (): JSX.Element => {
    const isSelected = finalWinner === seededTeam?.id;
    const isEliminated = finalWinner && finalWinner !== seededTeam?.id;

    return (
      <div className="border border-gray-300 rounded overflow-hidden">
        <div className={`flex items-center gap-2 h-[32px] px-3 py-1.5 border-b border-gray-300
          ${isSelected ? 'bg-green-100 font-semibold' : isEliminated ? 'bg-gray-50' : 'bg-white'}
        `}>
          <img src={seededTeam?.flag_url} alt="" className={`w-6 h-4 object-cover rounded shrink-0 ${isEliminated ? 'opacity-50' : ''}`} />
          <span className={`text-sm truncate ${isEliminated ? 'text-gray-400' : ''}`}>{seededTeam?.name}</span>
        </div>
        <div className="h-[32px] px-3 py-1.5 text-sm text-muted-foreground bg-muted/30 flex items-center justify-center">
          -
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-base">{playoff.name}</CardTitle>
            <CardDescription className="text-xs">
              {t('playoffs.winnerGoesTo', { group: playoff.destinationGroup })}
            </CardDescription>
          </div>
          {finalWinner && (
            <Badge className="bg-green-500 text-xs">{t('predictions.complete')}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Labels row - igual que UEFA */}
        <div className="flex mb-1">
          <div className="flex-1 text-xs text-muted-foreground font-medium">{t('playoffs.round1')}</div>
          <div className="w-5" />
          <div className="flex-1 text-xs text-muted-foreground font-medium">{t('playoffs.final')}</div>
        </div>

        {/* Bracket visual - mismo estilo que UEFA */}
        {(() => {
          const MATCH_H = 64;
          const GAP = 4;
          const TOTAL_H = MATCH_H * 2 + GAP;
          const SVG_W = 20;
          const top1Center = MATCH_H / 2;
          const top2Center = MATCH_H + GAP + MATCH_H / 2;
          const midY = (top1Center + top2Center) / 2;

          return (
            <div className="flex items-center">
              {/* Columna izquierda: Cabeza de serie arriba, Ronda 1 abajo */}
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <SeededTeamBox />
                <MatchBox
                  {...getMatchBoxProps(playoff.bracket.semi1.teamA, playoff.bracket.semi1.teamB, 'semi1', semi1Winner)}
                />
              </div>

              {/* Lineas conectoras SVG - igual que UEFA */}
              <svg width={SVG_W} height={TOTAL_H} className="shrink-0">
                <line x1="0" y1={top1Center} x2={SVG_W/2} y2={top1Center} stroke="#d1d5db" strokeWidth="1" />
                <line x1="0" y1={top2Center} x2={SVG_W/2} y2={top2Center} stroke="#d1d5db" strokeWidth="1" />
                <line x1={SVG_W/2} y1={top1Center} x2={SVG_W/2} y2={top2Center} stroke="#d1d5db" strokeWidth="1" />
                <line x1={SVG_W/2} y1={midY} x2={SVG_W} y2={midY} stroke="#d1d5db" strokeWidth="1" />
              </svg>

              {/* Columna Final */}
              <div className="flex-1 min-w-0">
                <MatchBox
                  {...getMatchBoxProps(playoff.bracket.finalTeamA, semi1Winner || 0, 'final', finalWinner)}
                />
              </div>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}
