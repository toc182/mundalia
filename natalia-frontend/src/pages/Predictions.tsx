import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StepNavigation } from '@/components/StepNavigation';
import { GroupCard } from '@/components/GroupCard';
import { mockTeams, getAllGroups } from '@/data/mockData';
import { predictionsAPI } from '@/services/api';
import { getTeamById as getTeamByIdHelper } from '@/utils/predictionHelpers';
import type { Team } from '@/types';

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

interface SubsequentData {
  hasThirds: boolean;
  hasKnockout: boolean;
}

interface GroupPrediction {
  group_letter: string;
  team_id: number;
  predicted_position: number;
}

export default function Predictions(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setId = searchParams.get('setId');

  const [predictions, setPredictions] = useState<GroupPredictions>({});
  const [playoffSelections, setPlayoffSelections] = useState<PlayoffSelections>({});
  const [saved, setSaved] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Snapshot for change detection
  const originalPredictionsRef = useRef<GroupPredictions | null>(null);
  const [showResetWarning, setShowResetWarning] = useState<boolean>(false);
  const [subsequentData, setSubsequentData] = useState<SubsequentData>({ hasThirds: false, hasKnockout: false });

  // Timer ref for cleanup
  const navTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper para inicializar todos los grupos con orden por defecto
  const getDefaultPredictions = (): GroupPredictions => {
    const initial: GroupPredictions = {};
    getAllGroups().forEach(group => {
      initial[group] = mockTeams
        .filter(t => t.group_letter === group)
        .map(t => t.id);
    });
    return initial;
  };

  // Compare current predictions with original to detect real changes
  const hasRealChanges = (): boolean => {
    if (!originalPredictionsRef.current) return false;
    const original = originalPredictionsRef.current;
    const current = predictions;

    for (const group of getAllGroups()) {
      const origOrder = original[group] || [];
      const currOrder = current[group] || [];

      if (origOrder.length !== currOrder.length) return true;

      for (let i = 0; i < origOrder.length; i++) {
        if (origOrder[i] !== currOrder[i]) {
          return true;
        }
      }
    }
    return false;
  };

  useEffect(() => {
    const loadPredictions = async (): Promise<void> => {
      if (setId) {
        try {
          const response = await predictionsAPI.getMy(setId);
          const data = response.data;

          if (data.groupPredictions && data.groupPredictions.length > 0) {
            const grouped: GroupPredictions = {};
            data.groupPredictions.forEach((gp: any) => {
              if (!grouped[gp.group_letter]) {
                grouped[gp.group_letter] = [];
              }
              grouped[gp.group_letter][gp.predicted_position - 1] = gp.team_id;
            });
            setPredictions(grouped);
            originalPredictionsRef.current = JSON.parse(JSON.stringify(grouped));
          } else {
            const defaults = getDefaultPredictions();
            setPredictions(defaults);
            originalPredictionsRef.current = JSON.parse(JSON.stringify(defaults));
          }
        } catch (err) {
          console.error('Error loading predictions:', err);
          setError('Error al cargar las predicciones. Por favor recarga la página.');
          const defaults = getDefaultPredictions();
          setPredictions(defaults);
          originalPredictionsRef.current = JSON.parse(JSON.stringify(defaults));
        }

        try {
          const playoffsResponse = await predictionsAPI.getPlayoffs(setId);
          if (playoffsResponse.data && Object.keys(playoffsResponse.data).length > 0) {
            setPlayoffSelections(playoffsResponse.data);
          }
        } catch (err) {
          console.error('Error loading playoffs:', err);
        }
        setLoading(false);
      } else {
        const savedPredictions = localStorage.getItem('natalia_predictions');
        if (savedPredictions) {
          const parsed = JSON.parse(savedPredictions);
          setPredictions(parsed);
          originalPredictionsRef.current = JSON.parse(JSON.stringify(parsed));
        } else {
          const defaults = getDefaultPredictions();
          setPredictions(defaults);
          originalPredictionsRef.current = JSON.parse(JSON.stringify(defaults));
        }

        const savedPlayoffs = localStorage.getItem('natalia_playoffs');
        if (savedPlayoffs) {
          setPlayoffSelections(JSON.parse(savedPlayoffs));
        }
        setLoading(false);
      }
    };

    loadPredictions();
  }, [setId]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
    };
  }, []);

  const getTeamById = (id: number): Team | null => getTeamByIdHelper(id, playoffSelections);

  // Drag & drop handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, teamId: number): void => {
    e.dataTransfer.setData('teamId', teamId.toString());
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetIndex: number, group: string): void => {
    e.preventDefault();
    const draggedTeamId = parseInt(e.dataTransfer.getData('teamId'));
    const currentOrder = [...(predictions[group] || [])];
    const draggedIndex = currentOrder.indexOf(draggedTeamId);

    if (draggedIndex === targetIndex || draggedIndex === -1) return;

    currentOrder.splice(draggedIndex, 1);
    currentOrder.splice(targetIndex, 0, draggedTeamId);

    setPredictions(prev => ({
      ...prev,
      [group]: currentOrder
    }));
    setSaved(false);
  };

  const moveTeam = useCallback((group: string, fromIndex: number, direction: number): void => {
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex > 3) return;

    setPredictions(prev => {
      const currentOrder = [...(prev[group] || [])];
      const temp = currentOrder[fromIndex];
      currentOrder[fromIndex] = currentOrder[toIndex];
      currentOrder[toIndex] = temp;
      return { ...prev, [group]: currentOrder };
    });
    setSaved(false);
  }, []);

  const reorderTeams = useCallback((group: string, fromIndex: number, toIndex: number): void => {
    if (fromIndex === toIndex) return;

    setPredictions(prev => {
      const currentOrder = [...(prev[group] || [])];
      const [removed] = currentOrder.splice(fromIndex, 1);
      currentOrder.splice(toIndex, 0, removed);
      return { ...prev, [group]: currentOrder };
    });
    setSaved(false);
  }, []);

  const groups = getAllGroups();
  const isComplete = Object.keys(predictions).length === 12;

  const handleContinue = async (): Promise<void> => {
    const changesDetected = hasRealChanges();

    if (changesDetected && setId) {
      try {
        const response = await predictionsAPI.hasSubsequentData(setId, 'groups');
        const { hasThirds, hasKnockout } = response.data;

        if (hasThirds || hasKnockout) {
          setSubsequentData({ hasThirds, hasKnockout });
          setShowResetWarning(true);
          return;
        }
      } catch (err) {
        console.error('[GROUPS] Error checking subsequent data:', err);
      }
    }

    await saveAndNavigate();
  };

  const saveAndNavigate = async (resetFirst: boolean = false): Promise<void> => {
    setSaving(true);
    setError(null);
    setShowResetWarning(false);

    localStorage.setItem('natalia_predictions', JSON.stringify(predictions));

    const predictionsArray: GroupPrediction[] = [];
    Object.entries(predictions).forEach(([groupLetter, teamIds]) => {
      teamIds.forEach((teamId, index) => {
        predictionsArray.push({
          group_letter: groupLetter,
          team_id: teamId,
          predicted_position: index + 1
        });
      });
    });

    const nextUrl = setId ? `/terceros?setId=${setId}` : '/terceros';

    try {
      if (resetFirst && setId) {
        await predictionsAPI.resetFromGroups(setId);
      }

      await predictionsAPI.saveGroups(predictionsArray, setId);
      originalPredictionsRef.current = JSON.parse(JSON.stringify(predictions));

      setSaved(true);
      setSaving(false);
      window.scrollTo(0, 0);
      navigate(nextUrl);
    } catch (err) {
      setError('Error al guardar en servidor - Continuando con guardado local');
      setSaving(false);
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
      navTimerRef.current = setTimeout(() => {
        window.scrollTo(0, 0);
        navigate(nextUrl);
      }, 800);
    }
  };

  const handleConfirmReset = (): void => {
    saveAndNavigate(true);
  };

  const handleCancelReset = (): void => {
    setShowResetWarning(false);
  };

  const handleBack = (): void => {
    const backUrl = setId ? `/repechajes?setId=${setId}` : '/repechajes';
    window.scrollTo(0, 0);
    navigate(backUrl);
  };

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

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Predicciones de Grupos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ordena los equipos de cada grupo. Top 2 clasifican, 3ro puede avanzar.
        </p>
      </div>

      {/* Top navigation */}
      <div className="mb-6">
        <StepNavigation
          onBack={handleBack}
          onNext={handleContinue}
          isComplete={isComplete}
          saving={saving}
          backLabel="Atrás"
        />
      </div>

      {saved && (
        <Alert className="mb-6">
          <AlertDescription>
            Predicciones guardadas correctamente
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Groups grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {groups.map(group => (
          <GroupCard
            key={group}
            group={group}
            teamIds={predictions[group] || []}
            getTeamById={getTeamById}
            onMove={moveTeam}
            onReorder={reorderTeams}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          />
        ))}
      </div>

      {/* Bottom navigation */}
      <div className="mt-8 pt-6 border-t">
        <StepNavigation
          onBack={handleBack}
          onNext={handleContinue}
          isComplete={isComplete}
          saving={saving}
          size="lg"
          backLabel="Atrás"
        />
      </div>

      {/* Reset Warning Modal */}
      <Dialog open={showResetWarning} onOpenChange={setShowResetWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambios detectados</DialogTitle>
            <DialogDescription asChild>
              <div>
                Has modificado el orden de los grupos. Esto afectará las siguientes fases que ya tienes completadas:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  {subsequentData.hasThirds && <li>Selección de terceros lugares</li>}
                  {subsequentData.hasKnockout && <li>Predicciones de eliminatorias</li>}
                </ul>
                <p className="mt-3 font-medium">Si continúas, estas selecciones serán borradas y tendrás que completarlas de nuevo.</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCancelReset}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmReset} disabled={saving}>
              {saving ? 'Guardando...' : 'Continuar y borrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
