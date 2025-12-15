/**
 * Modal for resolving unresolvable ties
 * User drags to reorder teams that couldn't be separated by FIFA criteria
 */

import { useState, useEffect } from 'react';
import { GripVertical, AlertTriangle, X } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';

export default function TiebreakerModal({ tie, onResolve, onClose }) {
  const [order, setOrder] = useState([]);
  const [draggedItem, setDraggedItem] = useState(null);

  // Initialize order from tie data
  useEffect(() => {
    if (tie?.teams) {
      setOrder(tie.teams.map(t => t.teamId));
    }
  }, [tie]);

  // Handle drag start
  const handleDragStart = (e, teamId) => {
    setDraggedItem(teamId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', teamId);
  };

  // Handle drag over
  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (draggedItem === null) return;

    const draggedIndex = order.indexOf(draggedItem);
    if (draggedIndex === index) return;

    // Reorder
    const newOrder = [...order];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(index, 0, draggedItem);
    setOrder(newOrder);
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  // Handle touch move for mobile
  const [touchStartY, setTouchStartY] = useState(null);
  const [touchedItem, setTouchedItem] = useState(null);

  const handleTouchStart = (e, teamId, index) => {
    setTouchStartY(e.touches[0].clientY);
    setTouchedItem({ teamId, index });
  };

  const handleTouchMove = (e) => {
    if (!touchedItem || touchStartY === null) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY;
    const threshold = 40; // pixels to move before swapping

    if (Math.abs(diff) > threshold) {
      const direction = diff > 0 ? 1 : -1;
      const currentIndex = order.indexOf(touchedItem.teamId);
      const newIndex = currentIndex + direction;

      if (newIndex >= 0 && newIndex < order.length) {
        const newOrder = [...order];
        newOrder.splice(currentIndex, 1);
        newOrder.splice(newIndex, 0, touchedItem.teamId);
        setOrder(newOrder);
        setTouchStartY(currentY);
        setTouchedItem({ ...touchedItem, index: newIndex });
      }
    }
  };

  const handleTouchEnd = () => {
    setTouchStartY(null);
    setTouchedItem(null);
  };

  // Handle confirm
  const handleConfirm = () => {
    onResolve(tie.group, order);
  };

  // Get team data by ID
  const getTeamById = (teamId) => {
    return tie.teams.find(t => t.teamId === teamId);
  };

  if (!tie) return null;

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Resolver Empate - Grupo {tie.group}
          </DialogTitle>
          <DialogDescription>
            Estos equipos están empatados según todos los criterios FIFA.
            Arrastra para ordenarlos según tu predicción.
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertDescription className="text-yellow-800 text-sm">
            {tie.reason}
          </AlertDescription>
        </Alert>

        <div className="py-4">
          <div className="text-xs text-muted-foreground mb-2">
            Arrastra para reordenar (arriba = mejor posición)
          </div>

          <div
            className="space-y-2"
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {order.map((teamId, index) => {
              const team = getTeamById(teamId);
              if (!team) return null;

              return (
                <div
                  key={teamId}
                  draggable
                  onDragStart={(e) => handleDragStart(e, teamId)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  onTouchStart={(e) => handleTouchStart(e, teamId, index)}
                  className={`flex items-center gap-3 p-3 bg-muted rounded-lg cursor-move
                             transition-all duration-150
                             ${draggedItem === teamId ? 'opacity-50 scale-95' : ''}
                             ${touchedItem?.teamId === teamId ? 'bg-primary/10 scale-[1.02]' : ''}
                             hover:bg-muted/80`}
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />

                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground
                                   flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {index + 1}
                  </span>

                  {team.flagUrl && (
                    <img
                      src={team.flagUrl}
                      alt={team.teamCode}
                      className="w-8 h-5 object-cover rounded flex-shrink-0"
                    />
                  )}

                  <span className="font-medium truncate">{team.teamName}</span>

                  <div className="ml-auto text-xs text-muted-foreground flex-shrink-0">
                    {team.points} pts | DG: {team.goalDifference > 0 ? '+' : ''}{team.goalDifference}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>
            Confirmar Orden
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
