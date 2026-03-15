import { useState, useMemo } from 'react';
import type { Swimmer, Squad } from '../lib/typeAdapters';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { GripVertical, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface SquadOverviewGridProps {
  swimmers: Swimmer[];
  squads: Squad[];
}

type AgeGroup = '8-' | '9' | '10' | '11' | '12' | '13' | '14' | '15' | '16' | '17' | '18+';

const AGE_GROUPS: AgeGroup[] = ['8-', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18+'];

interface DraggableSquadRowProps {
  squad: Squad;
  index: number;
  moveSquadRow: (dragIndex: number, hoverIndex: number) => void;
  getSwimmersInSquadByAge: (squadId: string, ageGroup: AgeGroup) => Swimmer[];
  visibleAgeGroups: Set<AgeGroup>;
  visibleAgeGroupsOrdered: AgeGroup[];
}

interface DraggableColumnHeaderProps {
  ageGroup: AgeGroup;
  index: number;
  moveColumn: (dragIndex: number, hoverIndex: number) => void;
}

const DraggableSquadRow = ({
  squad,
  index,
  moveSquadRow,
  getSwimmersInSquadByAge,
  visibleAgeGroupsOrdered,
}: DraggableSquadRowProps) => {
  const [{ isDragging }, drag, preview] = useDrag({
    type: 'SQUAD_ROW',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'SQUAD_ROW',
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        moveSquadRow(item.index, index);
        item.index = index;
      }
    },
  });

  return (
    <div ref={(node) => { preview(node); drop(node); }} className={cn('', isDragging && 'opacity-50')}>
      <div className="flex border-b hover:bg-accent/20 transition-colors">
        {/* Squad name column with drag handle */}
        <div
          className="sticky left-0 z-10 bg-card border-r flex items-center"
          style={{ minWidth: '200px', width: '200px' }}
        >
          <div
            ref={drag}
            className="px-2 cursor-move hover:bg-accent/50 h-full flex items-center"
            data-testid={`drag-handle-squad-${squad.id}`}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 px-3 py-6 font-medium truncate" data-testid={`squad-name-${squad.id}`}>
            {squad.name}
          </div>
        </div>

        {/* Age group columns */}
        {visibleAgeGroupsOrdered.map((ageGroup) => {
          const swimmersInCell = getSwimmersInSquadByAge(squad.id, ageGroup);

          return (
            <div
              key={ageGroup}
              className="border-r p-2 flex-shrink-0"
              style={{ minWidth: '120px', width: '120px' }}
              data-testid={`cell-${squad.id}-${ageGroup}`}
            >
              <div className="space-y-1">
                {swimmersInCell.map((swimmer) => (
                  <div
                    key={swimmer.id}
                    className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 truncate"
                    title={`${swimmer.firstName} ${swimmer.lastName}`}
                    data-testid={`swimmer-chip-${swimmer.id}`}
                  >
                    {swimmer.firstName} {swimmer.lastName}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const DraggableColumnHeader = ({ ageGroup, index, moveColumn }: DraggableColumnHeaderProps) => {
  const [{ isDragging }, drag, preview] = useDrag({
    type: 'COLUMN',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'COLUMN',
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        moveColumn(item.index, index);
        item.index = index;
      }
    },
  });

  return (
    <div
      ref={(node) => { preview(node); drop(node); }}
      className={cn(
        'border-r border-b font-medium text-center flex-shrink-0 bg-card',
        isDragging && 'opacity-50'
      )}
      style={{ minWidth: '120px', width: '120px' }}
      data-testid={`column-header-${ageGroup}`}
    >
      <div
        ref={drag}
        className="px-3 py-3 cursor-move hover:bg-accent/50 transition-colors"
      >
        {ageGroup}
      </div>
    </div>
  );
};

export function SquadOverviewGrid({ swimmers, squads }: SquadOverviewGridProps) {
  const [squadOrder, setSquadOrder] = useState<string[]>(squads.map((s) => s.id));
  const [ageGroupOrder, setAgeGroupOrder] = useState<AgeGroup[]>([...AGE_GROUPS]);
  const [visibleSquads, setVisibleSquads] = useState<Set<string>>(new Set(squads.map((s) => s.id)));
  const [visibleAgeGroups, setVisibleAgeGroups] = useState<Set<AgeGroup>>(new Set(AGE_GROUPS));

  // Calculate age as at end of current year (Dec 31, 2026)
  const getAgeGroup = (dateOfBirth: Date): AgeGroup => {
    const endOfYear = new Date(2026, 11, 31);
    const age = endOfYear.getFullYear() - dateOfBirth.getFullYear();

    if (age <= 8) return '8-';
    if (age >= 18) return '18+';
    return age.toString() as AgeGroup;
  };

  // Get swimmers for a specific squad and age group
  const getSwimmersInSquadByAge = (squadId: string, ageGroup: AgeGroup): Swimmer[] => {
    return swimmers.filter(
      (swimmer) =>
        swimmer.squadId === squadId && getAgeGroup(swimmer.dateOfBirth) === ageGroup
    );
  };

  // Get count for a specific age group (for header count row)
  const getAgeGroupCount = (ageGroup: AgeGroup): number => {
    return swimmers.filter((swimmer) => getAgeGroup(swimmer.dateOfBirth) === ageGroup).length;
  };

  // Move squad row
  const moveSquadRow = (dragIndex: number, hoverIndex: number) => {
    const newOrder = [...squadOrder];
    const [removed] = newOrder.splice(dragIndex, 1);
    newOrder.splice(hoverIndex, 0, removed);
    setSquadOrder(newOrder);
  };

  // Move column
  const moveColumn = (dragIndex: number, hoverIndex: number) => {
    const newOrder = [...ageGroupOrder];
    const [removed] = newOrder.splice(dragIndex, 1);
    newOrder.splice(hoverIndex, 0, removed);
    setAgeGroupOrder(newOrder);
  };

  // Toggle squad visibility
  const toggleSquadVisibility = (squadId: string) => {
    const newVisible = new Set(visibleSquads);
    if (newVisible.has(squadId)) {
      newVisible.delete(squadId);
    } else {
      newVisible.add(squadId);
    }
    setVisibleSquads(newVisible);
  };

  // Toggle age group visibility
  const toggleAgeGroupVisibility = (ageGroup: AgeGroup) => {
    const newVisible = new Set(visibleAgeGroups);
    if (newVisible.has(ageGroup)) {
      newVisible.delete(ageGroup);
    } else {
      newVisible.add(ageGroup);
    }
    setVisibleAgeGroups(newVisible);
  };

  const orderedSquads = useMemo(
    () =>
      squadOrder
        .map((id) => squads.find((s) => s.id === id))
        .filter((s): s is Squad => s !== undefined && visibleSquads.has(s.id)),
    [squadOrder, squads, visibleSquads]
  );

  const visibleAgeGroupsOrdered = useMemo(
    () => ageGroupOrder.filter((ag) => visibleAgeGroups.has(ag)),
    [ageGroupOrder, visibleAgeGroups]
  );

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-4 h-full flex flex-col" data-testid="squad-overview-grid">
        {/* Controls */}
        <div className="flex gap-3 flex-shrink-0">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-show-hide-squads">
                <Settings2 className="h-4 w-4 mr-2" />
                Show/Hide Squads
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Visible Squads</h4>
                <div className="space-y-2">
                  {squads.map((squad) => (
                    <div key={squad.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`squad-${squad.id}`}
                        checked={visibleSquads.has(squad.id)}
                        onCheckedChange={() => toggleSquadVisibility(squad.id)}
                        data-testid={`checkbox-squad-${squad.id}`}
                      />
                      <Label
                        htmlFor={`squad-${squad.id}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {squad.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-show-hide-age-groups">
                <Settings2 className="h-4 w-4 mr-2" />
                Show/Hide Age Groups
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Visible Age Groups</h4>
                <div className="grid grid-cols-2 gap-2">
                  {AGE_GROUPS.map((ageGroup) => (
                    <div key={ageGroup} className="flex items-center space-x-2">
                      <Checkbox
                        id={`age-${ageGroup}`}
                        checked={visibleAgeGroups.has(ageGroup)}
                        onCheckedChange={() => toggleAgeGroupVisibility(ageGroup)}
                        data-testid={`checkbox-age-${ageGroup}`}
                      />
                      <Label
                        htmlFor={`age-${ageGroup}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {ageGroup}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Grid */}
        <Card className="overflow-hidden flex-1 flex flex-col">
          <div className="overflow-auto flex-1">
            <div className="inline-block min-w-full">
              {/* Header Row */}
              <div className="flex border-b bg-muted/30 sticky top-0 z-20">
                <div
                  className="sticky left-0 z-30 bg-card border-r font-medium px-3 py-3"
                  style={{ minWidth: '200px', width: '200px' }}
                >
                  Squad
                </div>
                {visibleAgeGroupsOrdered.map((ageGroup) => (
                  <DraggableColumnHeader
                    key={ageGroup}
                    ageGroup={ageGroup}
                    index={ageGroupOrder.indexOf(ageGroup)}
                    moveColumn={moveColumn}
                  />
                ))}
              </div>

              {/* Count Row */}
              <div className="flex border-b bg-muted/10 sticky top-[49px] z-20">
                <div
                  className="sticky left-0 z-30 bg-card border-r text-sm text-muted-foreground px-3 py-2"
                  style={{ minWidth: '200px', width: '200px' }}
                >
                  Total Swimmers
                </div>
                {visibleAgeGroupsOrdered.map((ageGroup) => (
                  <div
                    key={ageGroup}
                    className="border-r text-sm text-center py-2 font-medium flex-shrink-0 bg-card"
                    style={{ minWidth: '120px', width: '120px' }}
                    data-testid={`count-${ageGroup}`}
                  >
                    {getAgeGroupCount(ageGroup)}
                  </div>
                ))}
              </div>

              {/* Squad Rows */}
              {orderedSquads.map((squad) => (
                <DraggableSquadRow
                  key={squad.id}
                  squad={squad}
                  index={squadOrder.indexOf(squad.id)}
                  moveSquadRow={moveSquadRow}
                  getSwimmersInSquadByAge={getSwimmersInSquadByAge}
                  visibleAgeGroups={visibleAgeGroups}
                  visibleAgeGroupsOrdered={visibleAgeGroupsOrdered}
                />
              ))}
            </div>
          </div>
        </Card>

        {/* Legend */}
        <div className="text-sm text-muted-foreground flex-shrink-0">
          <p>
            <strong>Tip:</strong> Drag squad names or age group headers to reorder. Use the Show/Hide buttons to toggle visibility.
          </p>
          <p className="mt-1">Age groups are calculated as of December 31, 2026.</p>
        </div>
      </div>
    </DndProvider>
  );
}
