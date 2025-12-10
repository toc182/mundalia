import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { mockTeams, getAllGroups } from '@/data/mockData';
import { playoffs } from '@/data/playoffsData';
import { predictionsAPI } from '@/services/api';

// Mapeo de playoff ID a team ID en mockTeams
const playoffToTeamId = {
  'UEFA_A': 6,   // Grupo B
  'UEFA_B': 23,  // Grupo F
  'UEFA_C': 16,  // Grupo D
  'UEFA_D': 4,   // Grupo A
  'FIFA_1': 42,  // Grupo K
  'FIFA_2': 35,  // Grupo I
};

export default function Predictions() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setId = searchParams.get('setId');

  const [predictions, setPredictions] = useState({});
  const [playoffSelections, setPlayoffSelections] = useState({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [activeGroup, setActiveGroup] = useState('A');

  useEffect(() => {
    const loadPredictions = async () => {
      // Si hay setId, solo cargar del servidor (sin fallback a localStorage)
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
          }
          // Si no hay datos, empezar en blanco - NO inicializar con orden por defecto
        } catch (err) {
          console.error('Error loading predictions:', err);
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
      } else {
        // Sin setId: comportamiento legacy con localStorage
        const savedPredictions = localStorage.getItem('natalia_predictions');
        if (savedPredictions) {
          setPredictions(JSON.parse(savedPredictions));
        } else {
          // Initialize with default order (solo para legacy)
          const initial = {};
          getAllGroups().forEach(group => {
            initial[group] = mockTeams
              .filter(t => t.group_letter === group)
              .map(t => t.id);
          });
          setPredictions(initial);
        }

        // Load playoff selections from localStorage (legacy)
        const savedPlayoffs = localStorage.getItem('natalia_playoffs');
        if (savedPlayoffs) {
          setPlayoffSelections(JSON.parse(savedPlayoffs));
        }
      }
    };

    loadPredictions();
  }, [setId]);

  // Get the winning team from a playoff
  const getPlayoffWinner = (playoffId) => {
    const selection = playoffSelections[playoffId];
    if (!selection?.final) return null;

    const playoff = playoffs.find(p => p.id === playoffId);
    if (!playoff) return null;

    return playoff.teams.find(t => t.id === selection.final);
  };

  // Get team by ID, replacing playoff placeholders with actual winners
  const getTeamById = (id) => {
    const team = mockTeams.find(t => t.id === id);
    if (!team) return null;

    // Check if this is a playoff placeholder
    if (team.is_playoff) {
      // Find which playoff this corresponds to
      const playoffEntry = Object.entries(playoffToTeamId).find(([_, teamId]) => teamId === id);
      if (playoffEntry) {
        const playoffId = playoffEntry[0];
        const winner = getPlayoffWinner(playoffId);
        if (winner) {
          // Return the winner team with the original ID for tracking
          return {
            ...winner,
            id: team.id, // Keep original ID for predictions
            originalPlayoffId: playoffId,
            isPlayoffWinner: true,
          };
        }
      }
    }

    return team;
  };

  const handleDragStart = (e, teamId) => {
    e.dataTransfer.setData('teamId', teamId.toString());
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Helper para obtener el orden inicial de un grupo
  const getInitialGroupOrder = (group) => {
    return mockTeams.filter(t => t.group_letter === group).map(t => t.id);
  };

  const handleDrop = (e, targetIndex, group) => {
    e.preventDefault();
    const draggedTeamId = parseInt(e.dataTransfer.getData('teamId'));

    // Si el grupo no tiene predicciones, inicializar con el orden por defecto
    const currentOrder = predictions[group]?.length > 0
      ? [...predictions[group]]
      : getInitialGroupOrder(group);

    const draggedIndex = currentOrder.indexOf(draggedTeamId);

    if (draggedIndex === targetIndex) return;

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

    // Si el grupo no tiene predicciones, inicializar con el orden por defecto
    const currentOrder = predictions[group]?.length > 0
      ? [...predictions[group]]
      : getInitialGroupOrder(group);

    const temp = currentOrder[fromIndex];
    currentOrder[fromIndex] = currentOrder[toIndex];
    currentOrder[toIndex] = temp;

    setPredictions(prev => ({
      ...prev,
      [group]: currentOrder
    }));
    setSaved(false);
  };

  const groups = getAllGroups();

  // Contar grupos completados (que tienen predicciones guardadas)
  const completedGroups = groups.filter(g => predictions[g]?.length === 4).length;
  const isComplete = completedGroups === 12;

  const handleContinue = async () => {
    if (!isComplete) {
      setError('Debes ordenar todos los grupos antes de continuar');
      return;
    }

    setSaving(true);
    setError(null);

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
      await predictionsAPI.saveGroups(predictionsArray, setId);
      setSaved(true);
      setSaving(false);
      setTimeout(() => {
        navigate(nextUrl);
      }, 500);
    } catch (err) {
      // Aunque falle el servidor, permitir continuar (ya está en localStorage)
      setError('Error al guardar en servidor - Continuando con guardado local');
      setSaving(false);
      setTimeout(() => {
        navigate(nextUrl);
      }, 1500);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">Inicio</Link>
        <span>/</span>
        <Link to="/repechajes" className="hover:text-foreground">Paso 1: Repechajes</Link>
        <span>/</span>
        <span className="font-medium text-foreground">Paso 2: Grupos</span>
        <span>/</span>
        <span>Paso 3: Terceros</span>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Predicciones de Grupos</h1>
        <div className="flex items-center gap-3">
          <Badge variant={isComplete ? 'default' : 'secondary'}>
            {completedGroups}/12 grupos
          </Badge>
          <Button onClick={handleContinue} disabled={!isComplete || saving}>
            {saving ? 'Guardando...' : 'Continuar'}
          </Button>
        </div>
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

      <p className="text-muted-foreground mb-4">
        Arrastra los equipos para ordenarlos segun como crees que terminaran en cada grupo.
        Los primeros 2 clasifican directamente. El 3ro puede clasificar como mejor tercero.
      </p>

      {!isComplete && (
        <Alert className="mb-6">
          <AlertDescription>
            Ordena cada grupo moviendo al menos un equipo para confirmar tu prediccion.
            Grupos sin ordenar: {groups.filter(g => !predictions[g]?.length).map(g => g).join(', ') || 'ninguno'}
          </AlertDescription>
        </Alert>
      )}

      {/* Group selector for mobile */}
      <div className="flex flex-wrap gap-2 mb-6 md:hidden">
        {groups.map(group => (
          <Button
            key={group}
            variant={activeGroup === group ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveGroup(group)}
          >
            Grupo {group}
          </Button>
        ))}
      </div>

      {/* Mobile view - one group at a time */}
      <div className="md:hidden">
        <GroupCard
          group={activeGroup}
          teamIds={predictions[activeGroup] || []}
          getTeamById={getTeamById}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onMove={moveTeam}
        />
      </div>

      {/* Desktop view - grid of all groups */}
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {groups.map(group => (
          <GroupCard
            key={group}
            group={group}
            teamIds={predictions[group] || []}
            getTeamById={getTeamById}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onMove={moveTeam}
          />
        ))}
      </div>

      {/* Bottom navigation */}
      <div className="flex justify-between mt-8 pt-6 border-t">
        <Button variant="outline" asChild>
          <Link to={setId ? `/repechajes?setId=${setId}` : '/repechajes'}>Volver a Repechajes</Link>
        </Button>
        <Button onClick={handleContinue} size="lg" disabled={!isComplete || saving}>
          {saving ? 'Guardando...' : 'Continuar a Terceros'}
        </Button>
      </div>
    </div>
  );
}

function GroupCard({ group, teamIds, getTeamById, onDragStart, onDragOver, onDrop, onMove, isEdited }) {
  // Si no hay teamIds, obtener equipos del grupo desde mockTeams
  const displayTeamIds = teamIds.length > 0 ? teamIds : mockTeams
    .filter(t => t.group_letter === group)
    .map(t => t.id);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Grupo {group}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {displayTeamIds.map((teamId, index) => {
          const team = getTeamById(teamId);
          if (!team) return null;

          // Solo mostrar colores de clasificacion si el grupo ha sido editado
          const hasBeenEdited = isEdited || teamIds.length > 0;
          const qualifies = hasBeenEdited && index < 2;
          const isThird = hasBeenEdited && index === 2;

          return (
            <div
              key={team.id}
              draggable
              onDragStart={(e) => onDragStart(e, team.id)}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, index, group)}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-move transition-colors
                ${qualifies ? 'bg-green-50 border-green-200' : ''}
                ${isThird ? 'bg-yellow-50 border-yellow-200' : ''}
                hover:bg-muted`}
            >
              <span className="text-sm font-medium text-muted-foreground w-5">
                {index + 1}
              </span>
              <img
                src={team.flag_url}
                alt={team.name}
                className="w-8 h-5 object-cover rounded"
              />
              <div className="flex-1">
                <span className="font-medium text-sm">{team.name}</span>
                {team.isPlayoffWinner && (
                  <p className="text-xs text-blue-600">Ganador Repechaje</p>
                )}
                {team.is_playoff && !team.isPlayoffWinner && (
                  <p className="text-xs text-muted-foreground">{team.playoff_teams}</p>
                )}
              </div>
              {qualifies && (
                <Badge variant="outline" className="text-green-600 border-green-300 text-xs">
                  Clasifica
                </Badge>
              )}
              {isThird && (
                <Badge variant="outline" className="text-yellow-600 border-yellow-300 text-xs">
                  3ro
                </Badge>
              )}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => onMove(group, index, -1)}
                  disabled={index === 0}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs"
                >
                  ▲
                </button>
                <button
                  onClick={() => onMove(group, index, 1)}
                  disabled={index === 3}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs"
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
}
