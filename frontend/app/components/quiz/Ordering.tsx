'use client';

import { GripVertical } from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/cn';

import QuestionCard from './QuestionCard';
import QuizLayout from './QuizLayout';
import SubmitButton from './SubmitButton';

interface OrderingProps {
  questionNumber: number;
  totalQuestions: number;
  time: string;
  question: string;
  hint?: string;
  items: string[];
  onSubmit?: (order: string[]) => void;
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
  const [order, setOrder] = useState(items);
  const [dragging, setDragging] = useState<number | null>(null);

  useEffect(() => {
    setOrder(items);
  }, [items]);

  const moveItem = (from: number, to: number) => {
    const next = [...order];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setOrder(next);
  };

  return (
    <QuizLayout
      questionNumber={questionNumber}
      totalQuestions={totalQuestions}
      time={time}
    >
      <QuestionCard question={question} hint={hint} />

      <div className="flex flex-col gap-2.5">
        {order.map((item, i) => {
          const isDragging = dragging === i;
          return (
            <div
              key={`${i}-${item}`}
              draggable
              onDragStart={() => setDragging(i)}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragging !== null && dragging !== i) {
                  moveItem(dragging, i);
                  setDragging(i);
                }
              }}
              onDragEnd={() => setDragging(null)}
              className={cn(
                'flex w-full cursor-grab items-center gap-3 rounded-2xl px-4 py-3.5 transition-all',
                isDragging
                  ? 'border-2 border-[var(--selected-border)] bg-[var(--selected-bg)] shadow-[0_4px_12px_rgba(246,162,0,0.25)]'
                  : 'border-[1.5px] border-[var(--border)] bg-[var(--card-bg)]',
              )}
            >
              <GripVertical
                size={18}
                className={cn(
                  isDragging
                    ? 'text-[var(--orange)]'
                    : 'text-[var(--text-muted)]',
                )}
              />
              <span className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full bg-[var(--orange)] text-xs font-bold text-white">
                {i + 1}
              </span>
              <span
                className={cn(
                  'text-sm text-[var(--text-dark)]',
                  isDragging ? 'font-semibold' : 'font-medium',
                )}
              >
                {item}
              </span>
            </div>
          );
        })}
      </div>

      <SubmitButton
        label="Zatwierdź kolejność"
        onClick={() => onSubmit?.(order)}
      />
    </QuizLayout>
  );
}
