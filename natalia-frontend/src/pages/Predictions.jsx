import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { mockTeams, getAllGroups } from '@/data/mockData';
import { playoffs } from '@/data/playoffsData';

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
  const [predictions, setPredictions] = useState({});
  const [playoffSelections, setPlayoffSelections] = useState({});
  const [saved, setSaved] = useState(false);
  const [activeGroup, setActiveGroup] = useState('A');

  useEffect(() => {
    // Load saved predictions from localStorage
    const savedPredictions = localStorage.getItem('natalia_predictions');
    if (savedPredictions) {
      setPredictions(JSON.parse(savedPredictions));
    } else {
      // Initialize with default order
      const initial = {};
      getAllGroups().forEach(group => {
        initial[group] = mockTeams
          .filter(t => t.group_letter === group)
          .map(t => t.id);
      });
      setPredictions(initial);
    }

    // Load playoff selections
    const savedPlayoffs = localStorage.getItem('natalia_playoffs');
    if (savedPlayoffs) {
      setPlayoffSelections(JSON.parse(savedPlayoffs));
    }
  }, []);

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

  const handleDrop = (e, targetIndex, group) => {
    e.preventDefault();
    const draggedTeamId = parseInt(e.dataTransfer.getData('teamId'));
    const currentOrder = [...predictions[group]];
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

    const currentOrder = [...predictions[group]];
    const temp = currentOrder[fromIndex];
    currentOrder[fromIndex] = currentOrder[toIndex];
    currentOrder[toIndex] = temp;

    setPredictions(prev => ({
      ...prev,
      [group]: currentOrder
    }));
    setSaved(false);
  };

  const handleContinue = () => {
    localStorage.setItem('natalia_predictions', JSON.stringify(predictions));
    setSaved(true);
    setTimeout(() => {
      navigate('/terceros');
    }, 500);
  };

  const groups = getAllGroups();

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
        <Button onClick={handleContinue}>
          Continuar
        </Button>
      </div>

      {saved && (
        <Alert className="mb-6">
          <AlertDescription>
            Predicciones guardadas correctamente
          </AlertDescription>
        </Alert>
      )}

      <p className="text-muted-foreground mb-6">
        Arrastra los equipos para ordenarlos segun como crees que terminaran en cada grupo.
        Los primeros 2 clasifican directamente. El 3ro puede clasificar como mejor tercero.
      </p>

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
          <Link to="/repechajes">Volver a Repechajes</Link>
        </Button>
        <Button onClick={handleContinue} size="lg">
          Continuar a Terceros
        </Button>
      </div>
    </div>
  );
}

function GroupCard({ group, teamIds, getTeamById, onDragStart, onDragOver, onDrop, onMove }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Grupo {group}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {teamIds.map((teamId, index) => {
          const team = getTeamById(teamId);
          if (!team) return null;

          const qualifies = index < 2;
          const isThird = index === 2;

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
                ${team.isPlayoffWinner ? 'ring-2 ring-blue-300' : ''}
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
