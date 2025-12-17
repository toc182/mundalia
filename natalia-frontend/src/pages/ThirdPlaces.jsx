import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { mockTeams, getAllGroups } from '@/data/mockData';
import { playoffs } from '@/data/playoffsData';
import { getThirdPlaceCombination } from '@/data/thirdPlaceCombinations';
import { predictionsAPI } from '@/services/api';

// Mapeo de playoff ID a team ID en mockTeams
const playoffToTeamId = {
  'UEFA_A': 6,
  'UEFA_B': 23,
  'UEFA_C': 16,
  'UEFA_D': 4,
  'FIFA_1': 42,
  'FIFA_2': 35,
};

export default function ThirdPlaces() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setId = searchParams.get('setId');

  const [predictions, setPredictions] = useState({});
  const [playoffSelections, setPlayoffSelections] = useState({});
  const [bestThirdPlaces, setBestThirdPlaces] = useState([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Snapshot for change detection
  const originalThirdPlacesRef = useRef(null);
  const [showResetWarning, setShowResetWarning] = useState(false);
  const [hasKnockoutData, setHasKnockoutData] = useState(false);

  // Compare current selections with original to detect real changes
  const hasRealChanges = () => {
    if (!originalThirdPlacesRef.current) return false;
    const original = [...originalThirdPlacesRef.current].sort().join('');
    const current = [...bestThirdPlaces].sort().join('');
    return original !== current;
  };

  useEffect(() => {
    const loadData = async () => {
      // Si hay setId, solo cargar del servidor (sin fallback a localStorage)
      if (setId) {
        try {
          // Cargar predicciones de grupos del servidor
          const groupsResponse = await predictionsAPI.getMy(setId);
          if (groupsResponse.data?.groupPredictions?.length > 0) {
            const grouped = {};
            groupsResponse.data.groupPredictions.forEach(gp => {
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

  // Get the winning team from a playoff
  const getPlayoffWinner = (playoffId) => {
    const selection = playoffSelections[playoffId];
    if (!selection?.final) return null;
    const playoff = playoffs.find(p => p.id === playoffId);
    if (!playoff) return null;
    return playoff.teams.find(t => t.id === selection.final);
  };

  // Get team by ID
  const getTeamById = (id) => {
    const team = mockTeams.find(t => t.id === id);
    if (!team) return null;

    if (team.is_playoff) {
      const playoffEntry = Object.entries(playoffToTeamId).find(([_, teamId]) => teamId === id);
      if (playoffEntry) {
        const playoffId = playoffEntry[0];
        const winner = getPlayoffWinner(playoffId);
        if (winner) {
          return { ...winner, id: team.id, isPlayoffWinner: true };
        }
      }
    }
    return team;
  };

  // Get the third place team for each group
  const getThirdPlaceTeams = () => {
    const groups = getAllGroups();
    return groups.map(group => {
      const teamIds = predictions[group] || [];
      const thirdPlaceId = teamIds[2];
      const team = thirdPlaceId ? getTeamById(thirdPlaceId) : null;
      return { group, team, teamId: thirdPlaceId };
    });
  };

  const thirdPlaceTeams = getThirdPlaceTeams();

  const toggleThirdPlace = (group) => {
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

  const thirdPlaceCombination = bestThirdPlaces.length === 8
    ? getThirdPlaceCombination(bestThirdPlaces)
    : null;

  const isComplete = bestThirdPlaces.length === 8 && thirdPlaceCombination;

  const handleFinish = async () => {
    console.log('[THIRDS] handleFinish called');

    // Check if there are real changes
    const changesDetected = hasRealChanges();
    console.log('[THIRDS] Changes detected:', changesDetected);

    // If there are changes and we have a setId, check for subsequent data
    if (changesDetected && setId) {
      try {
        const response = await predictionsAPI.hasSubsequentData(setId, 'thirds');
        const { hasKnockout } = response.data;
        console.log('[THIRDS] Subsequent data:', { hasKnockout });

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

  const saveAndNavigate = async (resetFirst = false) => {
    setSaving(true);
    setError(null);
    setShowResetWarning(false);

    // Guardar en localStorage primero
    localStorage.setItem('natalia_best_third_places', JSON.stringify(bestThirdPlaces));

    const nextUrl = setId ? `/eliminatorias?setId=${setId}` : '/eliminatorias';

    try {
      // If we need to reset subsequent data first
      if (resetFirst && setId) {
        console.log('[THIRDS] Resetting knockout data...');
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
      setError('Error al guardar en servidor - Continuando con guardado local');
      setTimeout(() => {
        window.scrollTo(0, 0);
        navigate(nextUrl);
      }, 800);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmReset = () => {
    saveAndNavigate(true);
  };

  const handleCancelReset = () => {
    setShowResetWarning(false);
  };

  const handleBack = () => {
    const backUrl = setId ? `/grupos?setId=${setId}` : '/grupos';
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
    <Button onClick={handleFinish} disabled={!isComplete || saving} size={size}>
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
        <h1 className="text-2xl font-bold">Mejores Terceros Lugares</h1>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm text-muted-foreground">Selecciona 8 de 12 terceros</span>
          <Badge variant={isComplete ? 'default' : 'secondary'}>
            {bestThirdPlaces.length}/8
          </Badge>
        </div>
      </div>

      {/* Botones de navegacion en linea separada */}
      <div className="flex justify-between mb-6">
        <BackButton />
        <NextButton />
      </div>

      {saved && (
        <Alert className="mb-6">
          <AlertDescription>
            Seleccion guardada. Continuando a eliminatorias...
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
            Combinacion no valida - selecciona otra combinacion de terceros lugares
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
                      3ro Grupo {group}
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
                      Sin definir
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

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
              Has modificado la selección de terceros lugares. Esto afectará las predicciones de eliminatorias que ya tienes completadas.
              <p className="mt-3 font-medium">Si continúas, las predicciones de eliminatorias serán borradas y tendrás que completarlas de nuevo.</p>
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
