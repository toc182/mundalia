import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { StepNavigation } from '@/components/StepNavigation';
import { mockTeams, getAllGroups } from '@/data/mockData';
import { getThirdPlaceCombination } from '@/data/thirdPlaceCombinations';
import { predictionsAPI } from '@/services/api';
import { getTeamById as getTeamByIdHelper } from '@/utils/predictionHelpers';
import type { Team, ThirdPlaceCombination } from '@/types';

interface GroupPredictions {
  [group: string]: number[];
}

interface PlayoffSelections {
  [playoffId: string]: {
    semi1?: number;
    semi2?: number;
    final?: number;
  };
}

interface ThirdPlaceTeamInfo {
  group: string;
  team: Team | null;
  teamId: number | undefined;
}

export default function ThirdPlaces(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setId = searchParams.get('setId');

  const [predictions, setPredictions] = useState<GroupPredictions>({});
  const [playoffSelections, setPlayoffSelections] = useState<PlayoffSelections>({});
  const [bestThirdPlaces, setBestThirdPlaces] = useState<string[]>([]);
  const [saved, setSaved] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Snapshot for change detection
  const originalThirdPlacesRef = useRef<string[] | null>(null);

  // Timer ref for cleanup
  const navTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showResetWarning, setShowResetWarning] = useState<boolean>(false);
  const [hasKnockoutData, setHasKnockoutData] = useState<boolean>(false);

  // Compare current selections with original to detect real changes
  const hasRealChanges = (): boolean => {
    if (!originalThirdPlacesRef.current) return false;
    const original = [...originalThirdPlacesRef.current].sort().join('');
    const current = [...bestThirdPlaces].sort().join('');
    return original !== current;
  };

  useEffect(() => {
    const loadData = async (): Promise<void> => {
      // Si hay setId, solo cargar del servidor (sin fallback a localStorage)
      if (setId) {
        try {
          // Cargar predicciones de grupos del servidor
          const groupsResponse = await predictionsAPI.getMy(setId);
          if (groupsResponse.data?.groupPredictions?.length > 0) {
            const grouped: GroupPredictions = {};
            groupsResponse.data.groupPredictions.forEach((gp: any) => {
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
            // Save snapshot of original selections
            originalThirdPlacesRef.current = [...groups];
          } else {
            originalThirdPlacesRef.current = [];
          }
          // Si no hay datos, empezar en blanco
        } catch (err) {
          console.error('Error loading data:', err);
          originalThirdPlacesRef.current = [];
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
          const parsed = JSON.parse(savedThirdPlaces);
          setBestThirdPlaces(parsed);
          originalThirdPlacesRef.current = [...parsed];
        } else {
          originalThirdPlacesRef.current = [];
        }
        setLoading(false);
      }
    };
    loadData();
  }, [setId]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
    };
  }, []);

  // Get team by ID using centralized helper
  const getTeamById = (id: number): Team | null => getTeamByIdHelper(id, playoffSelections);

  // Get the third place team for each group
  const getThirdPlaceTeams = (): ThirdPlaceTeamInfo[] => {
    const groups = getAllGroups();
    return groups.map(group => {
      const teamIds = predictions[group] || [];
      const thirdPlaceId = teamIds[2];
      const team = thirdPlaceId ? getTeamById(thirdPlaceId) : null;
      return { group, team, teamId: thirdPlaceId };
    });
  };

  const thirdPlaceTeams = getThirdPlaceTeams();

  const toggleThirdPlace = (group: string): void => {
    setBestThirdPlaces(prev => {
      if (prev.includes(group)) {
        return prev.filter(g => g !== group);
      } else if (prev.length < 8) {
        return [...prev, group];
      }
      return prev;
    });
    setSaved(false);
  };

  const thirdPlaceCombination: ThirdPlaceCombination | null = bestThirdPlaces.length === 8
    ? getThirdPlaceCombination(bestThirdPlaces)
    : null;

  const isComplete = bestThirdPlaces.length === 8 && thirdPlaceCombination;

  const handleFinish = async (): Promise<void> => {

    // Check if there are real changes
    const changesDetected = hasRealChanges();

    // If there are changes and we have a setId, check for subsequent data
    if (changesDetected && setId) {
      try {
        const response = await predictionsAPI.hasSubsequentData(setId, 'thirds');
        const { hasKnockout } = response.data;

        if (hasKnockout) {
          // Show warning modal
          setHasKnockoutData(true);
          setShowResetWarning(true);
          return;
        }
      } catch (err) {
        console.error('[THIRDS] Error checking subsequent data:', err);
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
    localStorage.setItem('natalia_best_third_places', JSON.stringify(bestThirdPlaces));

    const nextUrl = setId ? `/eliminatorias?setId=${setId}` : '/eliminatorias';

    try {
      // If we need to reset subsequent data first
      if (resetFirst && setId) {
        await predictionsAPI.resetFromThirds(setId);
      }

      // Convertir array a string: ['A','B','C'] -> 'ABC'
      const selectedGroups = bestThirdPlaces.sort().join('');
      await predictionsAPI.saveThirdPlaces(selectedGroups, setId);

      // Update snapshot to current state after successful save
      originalThirdPlacesRef.current = [...bestThirdPlaces];

      setSaved(true);
      window.scrollTo(0, 0);
      navigate(nextUrl);
    } catch (err) {
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

  const handleBack = (): void => {
    const backUrl = setId ? `/grupos?setId=${setId}` : '/grupos';
    window.scrollTo(0, 0);
    navigate(backUrl);
  };


  // Show loading spinner while data is loading
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header con titulo */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold">{t('thirdPlaces.title')}</h1>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm text-muted-foreground">{t('thirdPlaces.selectGroups')}</span>
          <Badge variant={isComplete ? 'default' : 'secondary'}>
            {bestThirdPlaces.length}/8
          </Badge>
        </div>
      </div>

      {/* Botones de navegacion en linea separada */}
      <div className="mb-6">
        <StepNavigation
          onBack={handleBack}
          onNext={handleFinish}
          isComplete={isComplete}
          saving={saving}
          backLabel={t('common.back')}
        />
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

      {bestThirdPlaces.length === 8 && !thirdPlaceCombination && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>
            {t('thirdPlaces.invalidCombination')}
          </AlertDescription>
        </Alert>
      )}

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {thirdPlaceTeams.map(({ group, team }) => {
              const isSelected = bestThirdPlaces.includes(group);
              const canSelect = isSelected || bestThirdPlaces.length < 8;

              return (
                <button
                  key={group}
                  onClick={() => toggleThirdPlace(group)}
                  disabled={!canSelect && !isSelected}
                  className={`p-3 rounded-lg border-2 transition-all text-left
                    ${isSelected
                      ? 'border-green-500 bg-green-50'
                      : canSelect
                        ? 'border-border hover:border-muted-foreground'
                        : 'border-border opacity-50 cursor-not-allowed'
                    }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      {t('thirdPlaces.thirdGroup', { group })}
                    </span>
                    {isSelected && (
                      <span className="text-green-600 text-xs">✓</span>
                    )}
                  </div>
                  {team ? (
                    <div className="flex items-center gap-2">
                      <img
                        src={team.flag_url}
                        alt={team.name}
                        className="w-6 h-4 object-cover rounded"
                      />
                      <span className="text-sm font-medium truncate">
                        {team.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {t('thirdPlaces.undefined')}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Bottom navigation */}
      <div className="mt-8 pt-6 border-t">
        <StepNavigation
          onBack={handleBack}
          onNext={handleFinish}
          isComplete={isComplete}
          saving={saving}
          size="lg"
          backLabel={t('common.back')}
        />
      </div>

      {/* Reset Warning Modal */}
      <Dialog open={showResetWarning} onOpenChange={setShowResetWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('thirdPlaces.changesDetected')}</DialogTitle>
            <DialogDescription>
              {t('thirdPlaces.changesWarning')}
              <p className="mt-3 font-medium">{t('thirdPlaces.resetConfirm')}</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCancelReset}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirmReset} disabled={saving}>
              {saving ? t('common.loading') : t('thirdPlaces.continueAndDelete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
