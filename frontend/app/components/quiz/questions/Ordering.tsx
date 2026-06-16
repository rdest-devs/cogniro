'use client';

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { useState } from 'react';

import SubmitButton from '@/app/components/common/SubmitButton';
import { cn } from '@/lib/cn';

import QuestionCard from '../shared/QuestionCard';
import QuizLayout from '../shared/QuizLayout';

interface OrderingProps {
  questionNumber: number;
  totalQuestions: number;
  time: string;
  question: string;
  hint?: string;
  items: string[];
  onSubmit?: (order: number[]) => void;
}

interface OrderedItem {
  text: string;
  origIdx: number;
}

function SortableRow({
  item,
  position,
}: {
  item: OrderedItem;
  position: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.origIdx });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl px-4 py-3.5',
        isDragging
          ? 'relative z-10 border-2 border-[var(--selected-border)] bg-[var(--selected-bg)] shadow-[0_4px_12px_rgba(246,162,0,0.25)]'
          : 'border-[1.5px] border-[var(--border)] bg-[var(--card-bg)]',
      )}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label="Przeciągnij, aby zmienić kolejność"
        className="flex cursor-grab touch-none items-center active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical
          size={18}
          className={cn(
            isDragging ? 'text-[var(--orange)]' : 'text-[var(--text-muted)]',
          )}
        />
      </button>
      <span className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full bg-[var(--orange)] text-xs font-bold text-white">
        {position}
      </span>
      <span
        className={cn(
          'text-sm text-[var(--text-dark)]',
          isDragging ? 'font-semibold' : 'font-medium',
        )}
      >
        {item.text}
      </span>
    </div>
  );
}

export default function Ordering({
  questionNumber,
  totalQuestions,
  time,
  question,
  hint,
  items,
  onSubmit,
}: OrderingProps) {
  const [ordered, setOrdered] = useState<OrderedItem[]>(() =>
    items.map((text, origIdx) => ({ text, origIdx })),
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) {
      setOrdered((prev) => {
        const oldIndex = prev.findIndex((o) => o.origIdx === active.id);
        const newIndex = prev.findIndex((o) => o.origIdx === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  return (
    <QuizLayout
      questionNumber={questionNumber}
      totalQuestions={totalQuestions}
      time={time}
    >
      <QuestionCard question={question} hint={hint} />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={ordered.map((o) => o.origIdx)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2.5">
            {ordered.map((item, i) => (
              <SortableRow key={item.origIdx} item={item} position={i + 1} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <SubmitButton
        label="Zatwierdź kolejność"
        onClick={() => onSubmit?.(ordered.map((x) => x.origIdx))}
      />
    </QuizLayout>
  );
}
