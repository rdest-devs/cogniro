'use client';

import { useEffect, useRef, useState } from 'react';

import SubmitButton from '@/app/components/common/SubmitButton';
import type { QuizChoiceAnswer } from '@/app/types';

import QuestionCard from '../shared/QuestionCard';
import QuizLayout from '../shared/QuizLayout';
import SingleSelectAnswers from '../shared/SingleSelectAnswers';

const REVEAL_DURATION_MS = 12000;
/** Mosaic columns; rows derive from the image aspect. Fewer = bigger pixels. */
const GRID_COLS = 14;

/** Fisher-Yates shuffle of [0..n-1] for a scattered (non row-by-row) reveal. */
function shuffledIndices(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Draws an image to a canvas as a grid of big mosaic "pixels", then reveals the
 * sharp image one block at a time, linearly over `durationMs`, in a scattered
 * order (Kahoot-style). The coarse base is a down-scale-then-up-scale with image
 * smoothing off and each revealed block is a direct sub-image draw, so there is
 * no pixel readback (no canvas tainting / CORS issues).
 */
function PixelatedImage({
  src,
  durationMs = REVEAL_DURATION_MS,
}: {
  src: string;
  durationMs?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Reset stale error state when the source changes (e.g. a retried/new image).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset error on src change
    setError(false);
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    let rafId = 0;
    let startTs: number | null = null;
    let cancelled = false;

    const image = new Image();
    image.decoding = 'async';

    // Grid + scattered reveal order, set once the image (and canvas) are sized.
    let cols = 0;
    let rows = 0;
    let total = 0;
    let order: number[] = [];
    let revealed = 0;

    // Coarse base: one flat "big pixel" per grid cell. Down-scale the whole image
    // to cols×rows in the top-left, then nearest-neighbor up-scale it to fill the
    // canvas (no pixel readback, so no canvas tainting).
    const drawMosaic = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(image, 0, 0, cols, rows);
      ctx.drawImage(canvas, 0, 0, cols, rows, 0, 0, w, h);
    };

    // Replace one mosaic cell with its sharp image region.
    const drawSharpBlock = (index: number) => {
      const bx = index % cols;
      const by = Math.floor(index / cols);
      const x0 = Math.round((bx * canvas.width) / cols);
      const x1 = Math.round(((bx + 1) * canvas.width) / cols);
      const y0 = Math.round((by * canvas.height) / rows);
      const y1 = Math.round(((by + 1) * canvas.height) / rows);
      if (x1 <= x0 || y1 <= y0) {
        return;
      }
      const sx0 = Math.round((bx * image.naturalWidth) / cols);
      const sx1 = Math.round(((bx + 1) * image.naturalWidth) / cols);
      const sy0 = Math.round((by * image.naturalHeight) / rows);
      const sy1 = Math.round(((by + 1) * image.naturalHeight) / rows);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(
        image,
        sx0,
        sy0,
        sx1 - sx0,
        sy1 - sy0,
        x0,
        y0,
        x1 - x0,
        y1 - y0,
      );
    };

    const tick = (ts: number) => {
      if (cancelled) {
        return;
      }
      if (startTs === null) {
        startTs = ts;
      }
      const t = Math.min(1, (ts - startTs) / durationMs);
      // Reveal blocks linearly with time; only paint the newly-revealed ones.
      const target = Math.floor(t * total);
      while (revealed < target) {
        drawSharpBlock(order[revealed]);
        revealed += 1;
      }
      if (t < 1) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        // Final crisp pass to erase any block-boundary seams.
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      }
    };

    image.onload = () => {
      if (cancelled) {
        return;
      }
      const maxWidth = 800;
      const scale =
        image.naturalWidth > maxWidth ? maxWidth / image.naturalWidth : 1;
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      cols = Math.min(GRID_COLS, canvas.width);
      rows = Math.max(1, Math.round((cols * canvas.height) / canvas.width));
      total = cols * rows;
      order = shuffledIndices(total);
      revealed = 0;
      if (prefersReducedMotion()) {
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        return;
      }
      drawMosaic();
      rafId = window.requestAnimationFrame(tick);
    };
    image.onerror = () => {
      if (!cancelled) {
        setError(true);
      }
    };
    image.src = src;

    return () => {
      cancelled = true;
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [src, durationMs]);

  if (error) {
    return (
      <p className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-4 py-6 text-center text-sm text-[var(--text-muted)]">
        Nie udało się załadować obrazu.
      </p>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={1}
      height={1}
      role="img"
      aria-label="Stopniowo odpikselowywany obraz pytania"
      className="h-auto w-full rounded-2xl border border-[var(--border)] bg-[var(--card-bg)]"
    />
  );
}

interface ImagePixelateQuestionProps {
  questionNumber: number;
  totalQuestions: number;
  time: string;
  question: string;
  hint?: string;
  imageUrl: string;
  answers: Array<string | QuizChoiceAnswer>;
  /**
   * How long the image takes to fully de-pixelate. Defaults to REVEAL_DURATION_MS;
   * PlayingShell passes the question's timer so the reveal tracks `time_s`.
   */
  durationMs?: number;
  onSubmit?: (selectedIndex: number) => void;
}

export default function ImagePixelateQuestion({
  questionNumber,
  totalQuestions,
  time,
  question,
  hint,
  imageUrl,
  answers,
  durationMs,
  onSubmit,
}: ImagePixelateQuestionProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const groupAriaLabel = question.trim() || 'Wybór jednej odpowiedzi';

  return (
    <QuizLayout
      questionNumber={questionNumber}
      totalQuestions={totalQuestions}
      time={time}
    >
      <QuestionCard question={question} hint={hint} />

      <PixelatedImage src={imageUrl} durationMs={durationMs} />

      <SingleSelectAnswers
        answers={answers}
        selected={selected}
        onSelect={setSelected}
        groupAriaLabel={groupAriaLabel}
      />

      <SubmitButton
        label="Zatwierdź odpowiedź"
        onClick={() => selected !== null && onSubmit?.(selected)}
        disabled={selected === null}
      />
    </QuizLayout>
  );
}
