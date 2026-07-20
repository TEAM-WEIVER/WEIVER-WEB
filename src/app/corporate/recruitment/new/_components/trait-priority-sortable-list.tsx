'use client';

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

import { cn } from '@/lib/utils';

import type { TraitPriority } from './job-posting-form.constants';

type TraitPrioritySortableListProps = {
  traits: TraitPriority[];
  traitIds: string[];
  onDragEnd: (event: DragEndEvent) => void;
};

function SortableTraitItem({ trait, index }: { trait: TraitPriority; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: trait.title,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn('flex items-center gap-3.5', isDragging && 'relative z-10 opacity-80')}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <div className="border-border-default bg-bg-tertiary flex h-[68px] w-12 shrink-0 items-center justify-center rounded-lg border">
        <p className="text-h4 text-text-disabled">{index + 1}</p>
      </div>
      <div className="border-border-light bg-bg-secondary flex min-h-[68px] min-w-0 flex-1 items-center rounded-lg border p-3.5">
        <div className="flex min-w-0 items-center gap-3.5">
          <button
            type="button"
            aria-label={`${trait.title} 순서 이동`}
            className="text-primary-600 flex size-[18px] shrink-0 cursor-grab items-center justify-center active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-[18px]" />
          </button>
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-body2 text-text-primary">{trait.title}</p>
            <p className="text-caption text-text-tertiary truncate">{trait.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TraitPrioritySortableList({
  traits,
  traitIds,
  onDragEnd,
}: TraitPrioritySortableListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={traitIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-3.5">
          {traits.map((trait, index) => (
            <SortableTraitItem key={trait.title} trait={trait} index={index} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
