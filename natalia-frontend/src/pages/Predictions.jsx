import { useState, useEffect, useRef, memo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { mockTeams, getAllGroups } from '@/data/mockData';
import { predictionsAPI } from '@/services/api';
import { getTeamById as getTeamByIdHelper } from '@/utils/predictionHelpers';

export default function Predictions() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setId = searchParams.get('setId');

  const [predictions, setPredictions] = useState({});
  const [playoffSelections, setPlayoffSelections] = useState({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Snapshot for change detection
  const originalPredictionsRef = useRef(null);
  const [showResetWarning, setShowResetWarning] = useState(false);
  const [subsequentData, setSubsequentData] = useState({ hasThirds: false, hasKnockout: false });

  // Helper para inicializar todos los grupos con orden por defecto
  const getDefaultPredictions = () => {
    const initial = {};
    getAllGroups().forEach(group => {
      initial[group] = mockTeams
        .filter(t => t.group_letter === group)
        .map(t => t.id);
    });
    return initial;
  };

  // Compare current predictions with original to detect real changes
  const hasRealChanges = () => {
    if (!originalPredictionsRef.current) return false;
    const original = originalPredictionsRef.current;
    const current = predictions;

    // Compare each group's team order
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
    const loadPredictions = async () => {
      // Si hay setId, cargar del servidor
      if (setId) {
        try {
          const response = await predictionsAPI.getMy(setId);
          const data = response.data;

          if (data.groupPredictions && data.groupPredictions.length > 0) {
            // Convert array to grouped object
            const grouped = {};
            data.groupPredictions.forEach(gp => {
              if (!grouped[gp.group_letter]) {
                grouped[gp.group_letter] = [];
              }
              grouped[gp.group_letter][gp.predicted_position - 1] = gp.team_id;
            });
            setPredictions(grouped);
            // Save snapshot of original predictions
            originalPredictionsRef.current = JSON.parse(JSON.stringify(grouped));
          } else {
            // Si no hay datos guardados, inicializar con orden por defecto
            const defaults = getDefaultPredictions();
            setPredictions(defaults);
            originalPredictionsRef.current = JSON.parse(JSON.stringify(defaults));
          }
        } catch (err) {
          console.error('Error loading predictions:', err);
          // En caso de error, inicializar con orden por defecto
          const defaults = getDefaultPredictions();
          setPredictions(defaults);
          originalPredictionsRef.current = JSON.parse(JSON.stringify(defaults));
        }

        // También cargar playoffs del servidor para este set
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
        // Sin setId: comportamiento legacy con localStorage
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

        // Load playoff selections from localStorage (legacy)
        const savedPlayoffs = localStorage.getItem('natalia_playoffs');
        if (savedPlayoffs) {
          setPlayoffSelections(JSON.parse(savedPlayoffs));
        }
        setLoading(false);
      }
    };

    loadPredictions();
  }, [setId]);

  // Get team by ID using centralized helper
  const getTeamById = (id) => getTeamByIdHelper(id, playoffSelections);

  // Drag & drop handlers (desktop)
  const handleDragStart = (e, teamId) => {
    e.dataTransfer.setData('teamId', teamId.toString());
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetIndex, group) => {
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

  const moveTeam = (group, fromIndex, direction) => {
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex > 3) return;

    const currentOrder = [...(predictions[group] || [])];
    const temp = currentOrder[fromIndex];
    currentOrder[fromIndex] = currentOrder[toIndex];
    currentOrder[toIndex] = temp;

    setPredictions(prev => ({
      ...prev,
      [group]: currentOrder
    }));
    setSaved(false);
  };

  // Reorder teams (for touch drag)
  const reorderTeams = (group, fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    const currentOrder = [...(predictions[group] || [])];
    const [removed] = currentOrder.splice(fromIndex, 1);
    currentOrder.splice(toIndex, 0, removed);

    setPredictions(prev => ({
      ...prev,
      [group]: currentOrder
    }));
    setSaved(false);
  };

  const groups = getAllGroups();

  // Siempre completo porque inicializamos con orden por defecto
  const isComplete = Object.keys(predictions).length === 12;

  const handleContinue = async () => {

    // Check if there are real changes
    const changesDetected = hasRealChanges();

    // If there are changes and we have a setId, check for subsequent data
    if (changesDetected && setId) {
      try {
        const response = await predictionsAPI.hasSubsequentData(setId, 'groups');
        const { hasThirds, hasKnockout } = response.data;

        if (hasThirds || hasKnockout) {
          // Show warning modal
          setSubsequentData({ hasThirds, hasKnockout });
          setShowResetWarning(true);
          return;
        }
      } catch (err) {
        console.error('[GROUPS] Error checking subsequent data:', err);
        // Continue anyway if check fails
      }
    }

    // No changes or no subsequent data - proceed normally
    await saveAndNavigate();
  };

  const saveAndNavigate = async (resetFirst = false) => {
    setSaving(true);
    setError(null);
    setShowResetWarning(false);

    // Guardar en localStorage primero (respaldo inmediato)
    localStorage.setItem('natalia_predictions', JSON.stringify(predictions));

    // Convert predictions object to array format for API
    const predictionsArray = [];
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
      // If we need to reset subsequent data first
      if (resetFirst && setId) {
        await predictionsAPI.resetFromGroups(setId);
      }

      await predictionsAPI.saveGroups(predictionsArray, setId);

      // Update snapshot to current state after successful save
      originalPredictionsRef.current = JSON.parse(JSON.stringify(predictions));

      setSaved(true);
      setSaving(false);
      window.scrollTo(0, 0);
      navigate(nextUrl);
    } catch (err) {
      // Aunque falle el servidor, permitir continuar (ya está en localStorage)
      setError('Error al guardar en servidor - Continuando con guardado local');
      setSaving(false);
      setTimeout(() => {
        window.scrollTo(0, 0);
        navigate(nextUrl);
      }, 800);
    }
  };

  const handleConfirmReset = () => {
    saveAndNavigate(true);
  };

  const handleCancelReset = () => {
    setShowResetWarning(false);
  };

  const handleBack = () => {
    const backUrl = setId ? `/repechajes?setId=${setId}` : '/repechajes';
    window.scrollTo(0, 0);
    navigate(backUrl);
  };

  const BackButton = ({ size = 'default' }) => (
    <Button variant="outline" onClick={handleBack} size={size}>
      <ChevronLeft className="mr-1 h-4 w-4" />
      Atras
    </Button>
  );

  const NextButton = ({ size = 'default' }) => (
    <Button onClick={handleContinue} disabled={!isComplete || saving} size={size}>
      {saving ? 'Guardando...' : 'Siguiente'}
      <ChevronRight className="ml-1 h-4 w-4" />
    </Button>
  );

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

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header con titulo */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Predicciones de Grupos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ordena los equipos de cada grupo. Top 2 clasifican, 3ro puede avanzar.
        </p>
      </div>

      {/* Botones de navegacion en linea separada */}
      <div className="flex justify-between mb-6">
        <BackButton />
        <NextButton />
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

      {/* Grid de todos los grupos */}
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
      <div className="flex justify-between mt-8 pt-6 border-t">
        <BackButton size="lg" />
        <NextButton size="lg" />
      </div>

      {/* Reset Warning Modal */}
      <Dialog open={showResetWarning} onOpenChange={setShowResetWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambios detectados</DialogTitle>
            <DialogDescription>
              Has modificado el orden de los grupos. Esto afectará las siguientes fases que ya tienes completadas:
              <ul className="list-disc list-inside mt-2 space-y-1">
                {subsequentData.hasThirds && <li>Selección de terceros lugares</li>}
                {subsequentData.hasKnockout && <li>Predicciones de eliminatorias</li>}
              </ul>
              <p className="mt-3 font-medium">Si continúas, estas selecciones serán borradas y tendrás que completarlas de nuevo.</p>
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

const GroupCard = memo(function GroupCard({ group, teamIds, getTeamById, onMove, onReorder, onDragStart, onDragOver, onDrop }) {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [touchY, setTouchY] = useState(null);
  const itemRefs = useRef([]);

  // Si no hay teamIds, obtener equipos del grupo desde mockTeams
  const displayTeamIds = teamIds.length > 0 ? teamIds : mockTeams
    .filter(t => t.group_letter === group)
    .map(t => t.id);

  // Touch handlers for mobile drag
  const handleTouchStart = (e, index) => {
    setDraggedIndex(index);
    setTouchY(e.touches[0].clientY);
  };

  const handleTouchMove = (e, currentIndex) => {
    if (draggedIndex === null) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - touchY;

    // Determinar si se movió lo suficiente para cambiar posición
    const itemHeight = 56; // altura aproximada de cada item

    if (Math.abs(diff) > itemHeight / 2) {
      const direction = diff > 0 ? 1 : -1;
      const newIndex = draggedIndex + direction;

      if (newIndex >= 0 && newIndex <= 3) {
        onReorder(group, draggedIndex, newIndex);
        setDraggedIndex(newIndex);
        setTouchY(currentY);
      }
    }
  };

  const handleTouchEnd = () => {
    setDraggedIndex(null);
    setTouchY(null);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Grupo {group}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {displayTeamIds.map((teamId, index) => {
          const team = getTeamById(teamId);
          if (!team) return null;

          // Siempre mostrar colores de clasificacion
          const qualifies = index < 2;
          const isThird = index === 2;
          const isDragging = draggedIndex === index;

          return (
            <div
              key={team.id}
              ref={el => itemRefs.current[index] = el}
              draggable
              onDragStart={(e) => onDragStart(e, team.id)}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, index, group)}
              onTouchStart={(e) => handleTouchStart(e, index)}
              onTouchMove={(e) => handleTouchMove(e, index)}
              onTouchEnd={handleTouchEnd}
              className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-grab active:cursor-grabbing select-none
                ${qualifies ? 'bg-green-50 border-green-200' : ''}
                ${isThird ? 'bg-yellow-50 border-yellow-200' : ''}
                ${isDragging ? 'opacity-50 scale-105 shadow-lg' : ''}
                hover:shadow-md`}
              style={{ touchAction: 'none' }}
            >
              <span className="text-sm font-medium text-muted-foreground w-5">
                {index + 1}
              </span>
              <span className="text-lg cursor-grab">☰</span>
              <img
                src={team.flag_url}
                alt={team.name}
                className="w-8 h-5 object-cover rounded"
              />
              <div className="flex-1 min-w-0">
                <span className="font-medium text-sm truncate block">{team.name}</span>
                {team.is_playoff && !team.isPlayoffWinner && (
                  <p className="text-xs text-muted-foreground truncate">{team.playoff_teams}</p>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); onMove(group, index, -1); }}
                  disabled={index === 0}
                  className="w-10 h-10 flex items-center justify-center rounded bg-muted hover:bg-muted/80 active:bg-muted/60 disabled:opacity-30 text-xl font-bold select-none"
                  style={{ touchAction: 'manipulation' }}
                >
                  ▲
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onMove(group, index, 1); }}
                  disabled={index === 3}
                  className="w-10 h-10 flex items-center justify-center rounded bg-muted hover:bg-muted/80 active:bg-muted/60 disabled:opacity-30 text-xl font-bold select-none"
                  style={{ touchAction: 'manipulation' }}
                >
                  ▼
                </button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
});
