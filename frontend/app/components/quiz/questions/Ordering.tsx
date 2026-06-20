'use client';

import { GripVertical } from 'lucide-react';
import { useRef, useState } from 'react';

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

export default function Ordering({
  questionNumber,
  totalQuestions,
  time,
  question,
  hint,
  items,
  onSubmit,
}: OrderingProps) {
  const [ordered, setOrdered] = useState(() =>
    items.map((text, origIdx) => ({ text, origIdx })),
  );
  const [dragging, setDragging] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // Authoritative current index of the dragged row. Kept in a ref (not just
  // state) so consecutive pointermove events read a fresh value instead of a
  // stale closure between renders.
  const draggingRef = useRef<number | null>(null);
  // Screen-reader announcement for keyboard-driven reordering.
  const [announcement, setAnnouncement] = useState('');

  const moveItem = (from: number, to: number) => {
    setOrdered((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  // Keyboard reordering: move the focused row up/down one slot. Focus follows
  // the row's stable key, so repeated arrow presses keep moving the same item.
  const moveByKeyboard = (i: number, dir: -1 | 1) => {
    const to = i + dir;
    if (to < 0 || to >= ordered.length) return;
    moveItem(i, to);
    setAnnouncement(
      `${ordered[i].text}: pozycja ${to + 1} z ${ordered.length}`,
    );
  };

  /** Index of the row whose bounds contain clientY, or null between/outside rows. */
  const rowUnderPointer = (clientY: number): number | null => {
    const rows = listRef.current?.children;
    if (!rows) return null;
    for (let k = 0; k < rows.length; k++) {
      const r = rows[k].getBoundingClientRect();
      if (clientY >= r.top && clientY <= r.bottom) return k;
    }
    return null;
  };

  const startDrag = (i: number) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current !== null) return; // ignore extra fingers mid-drag
    if (e.button !== 0) return; // ignore non-primary mouse buttons
    e.preventDefault(); // suppress text selection / native image drag
    draggingRef.current = i;
    setDragging(i);
    // Capture keeps pointermove/up firing on this row even as the finger moves
    // over its siblings - this is what makes the drag track on touch.
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const from = draggingRef.current;
    if (from === null) return;
    const to = rowUnderPointer(e.clientY);
    if (to !== null && to !== from) {
      moveItem(from, to);
      draggingRef.current = to;
      setDragging(to);
    }
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current === null) return;
    draggingRef.current = null;
    setDragging(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <QuizLayout
      questionNumber={questionNumber}
      totalQuestions={totalQuestions}
      time={time}
    >
      <QuestionCard question={question} hint={hint} />

      <div ref={listRef} className="flex flex-col gap-2.5">
        {ordered.map(({ text, origIdx }, i) => {
          const isDragging = dragging === i;
          return (
            <div
              key={origIdx}
              role="button"
              tabIndex={0}
              aria-label={`Pozycja ${i + 1} z ${ordered.length}: ${text}. Użyj strzałek w górę i w dół, aby zmienić kolejność.`}
              onPointerDown={startDrag(i)}
              onPointerMove={onDragMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  moveByKeyboard(i, -1);
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  moveByKeyboard(i, 1);
                }
              }}
              className={cn(
                'flex w-full cursor-grab touch-none items-center gap-3 rounded-2xl px-4 py-3.5 transition-all outline-none select-none [-webkit-touch-callout:none] focus-visible:ring-2 focus-visible:ring-[var(--orange)] active:cursor-grabbing',
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
                {text}
              </span>
            </div>
          );
        })}
      </div>

      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <SubmitButton
        label="Zatwierdź kolejność"
        onClick={() => onSubmit?.(ordered.map((x) => x.origIdx))}
      />
    </QuizLayout>
  );
}
