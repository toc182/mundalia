import { memo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { mockTeams } from '@/data/mockData';
import type { Team } from '@/types';

interface GroupCardProps {
  group: string;
  teamIds: number[];
  getTeamById: (id: number) => Team | null;
  onMove: (group: string, fromIndex: number, direction: number) => void;
  onReorder: (group: string, fromIndex: number, toIndex: number) => void;
  // Legacy props - kept for compatibility but not used with dnd-kit
  onDragStart?: (e: React.DragEvent<HTMLDivElement>, teamId: number) => void;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>, targetIndex: number, group: string) => void;
}

interface SortableTeamItemProps {
  team: Team;
  index: number;
  group: string;
  onMove: (group: string, fromIndex: number, direction: number) => void;
}

function SortableTeamItem({ team, index, group, onMove }: SortableTeamItemProps): JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: team.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const qualifies = index < 2;
  const isThird = index === 2;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-2 rounded-lg border transition-colors select-none
        ${qualifies ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800' : ''}
        ${isThird ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800' : ''}
        ${!qualifies && !isThird ? 'bg-background border-border' : ''}
        ${isDragging ? 'opacity-50 shadow-lg z-50 scale-[1.02]' : ''}
      `}
    >
      {/* Position number */}
      <span className={`text-sm font-bold w-5 text-center
        ${qualifies ? 'text-green-600 dark:text-green-400' : ''}
        ${isThird ? 'text-yellow-600 dark:text-yellow-400' : ''}
        ${!qualifies && !isThird ? 'text-muted-foreground' : ''}
      `}>
        {index + 1}
      </span>

      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="touch-none p-1 rounded hover:bg-muted/50 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
        aria-label={`Arrastrar ${team.name}`}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Flag */}
      <img
        src={team.flag_url}
        alt={team.name}
        className="w-8 h-5 object-cover rounded shadow-sm"
      />

      {/* Team name */}
      <div className="flex-1 min-w-0">
        <span className="font-medium text-sm truncate block">{team.name}</span>
        {team.is_playoff && !team.isPlayoffWinner && (
          <p className="text-xs text-muted-foreground truncate">{team.playoff_teams}</p>
        )}
      </div>

      {/* Arrow buttons */}
      <div className="flex gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); onMove(group, index, -1); }}
          disabled={index === 0}
          aria-label={`Mover ${team.name} arriba`}
          className="w-8 h-8 flex items-center justify-center rounded-md border bg-background hover:bg-muted active:bg-muted/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onMove(group, index, 1); }}
          disabled={index === 3}
          aria-label={`Mover ${team.name} abajo`}
          className="w-8 h-8 flex items-center justify-center rounded-md border bg-background hover:bg-muted active:bg-muted/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export const GroupCard = memo(function GroupCard({
  group,
  teamIds,
  getTeamById,
  onMove,
  onReorder,
}: GroupCardProps): JSX.Element {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Si no hay teamIds, obtener equipos del grupo desde mockTeams
  const displayTeamIds = teamIds.length > 0 ? teamIds : mockTeams
    .filter(t => t.group_letter === group)
    .map(t => t.id);

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = displayTeamIds.indexOf(Number(active.id));
      const newIndex = displayTeamIds.indexOf(Number(over.id));
      onReorder(group, oldIndex, newIndex);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Grupo {group}</CardTitle>
      </CardHeader>
      <CardContent>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={displayTeamIds}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {displayTeamIds.map((teamId, index) => {
                const team = getTeamById(teamId);
                if (!team) return null;

                return (
                  <SortableTeamItem
                    key={team.id}
                    team={team}
                    index={index}
                    group={group}
                    onMove={onMove}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </CardContent>
    </Card>
  );
});

export default GroupCard;
