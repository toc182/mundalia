import { useState, useRef, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { mockTeams } from '@/data/mockData';
import type { Team } from '@/types';

interface GroupCardProps {
  group: string;
  teamIds: number[];
  getTeamById: (id: number) => Team | null;
  onMove: (group: string, fromIndex: number, direction: number) => void;
  onReorder: (group: string, fromIndex: number, toIndex: number) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, teamId: number) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, targetIndex: number, group: string) => void;
}

export const GroupCard = memo(function GroupCard({
  group,
  teamIds,
  getTeamById,
  onMove,
  onReorder,
  onDragStart,
  onDragOver,
  onDrop
}: GroupCardProps): JSX.Element {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [touchY, setTouchY] = useState<number | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Si no hay teamIds, obtener equipos del grupo desde mockTeams
  const displayTeamIds = teamIds.length > 0 ? teamIds : mockTeams
    .filter(t => t.group_letter === group)
    .map(t => t.id);

  // Touch handlers for mobile drag
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>, index: number): void => {
    setDraggedIndex(index);
    setTouchY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>, currentIndex: number): void => {
    if (draggedIndex === null || touchY === null) return;

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

  const handleTouchEnd = (): void => {
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
              {qualifies && <span className="text-green-600 text-sm" aria-label="Clasifica">✓</span>}
              {isThird && <span className="text-yellow-600 text-sm" aria-label="Posible clasificacion">?</span>}
              <span className="text-lg cursor-grab" aria-hidden="true">☰</span>
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
                  aria-label={`Mover ${team.name} arriba`}
                  className="w-10 h-10 flex items-center justify-center rounded bg-muted hover:bg-muted/80 active:bg-muted/60 disabled:opacity-30 text-xl font-bold select-none"
                  style={{ touchAction: 'manipulation' }}
                >
                  ▲
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onMove(group, index, 1); }}
                  disabled={index === 3}
                  aria-label={`Mover ${team.name} abajo`}
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

export default GroupCard;
