'use client';

import { useEffect, useRef, useState } from 'react';

import SubmitButton from '@/app/components/common/SubmitButton';
import type { QuizChoiceAnswer } from '@/app/types';

import QuestionCard from '../shared/QuestionCard';
import QuizLayout from '../shared/QuizLayout';
import SingleSelectAnswers from '../shared/SingleSelectAnswers';

const REVEAL_DURATION_MS = 12000;
/** Smallest resolution fraction at the start (heavily pixelated). */
const MIN_FRACTION = 0.04;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Draws an image to a canvas, starting heavily pixelated and de-pixelating over
 * `durationMs`. Pixelation is done by down-scaling then up-scaling on the same
 * canvas with image smoothing off (no pixel readback, so no canvas tainting).
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

    const draw = (fraction: number) => {
      const w = canvas.width;
      const h = canvas.height;
      const f = Math.min(1, Math.max(MIN_FRACTION, fraction));
      const sw = Math.max(1, Math.round(w * f));
      const sh = Math.max(1, Math.round(h * f));
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, w, h);
      // Down-scale the image into the top-left, then up-scale that region.
      ctx.drawImage(image, 0, 0, sw, sh);
      ctx.drawImage(canvas, 0, 0, sw, sh, 0, 0, w, h);
    };

    const tick = (ts: number) => {
      if (cancelled) {
        return;
      }
      if (startTs === null) {
        startTs = ts;
      }
      const elapsed = ts - startTs;
      const t = Math.min(1, elapsed / durationMs);
      draw(MIN_FRACTION + (1 - MIN_FRACTION) * t);
      if (t < 1) {
        rafId = window.requestAnimationFrame(tick);
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
      if (prefersReducedMotion()) {
        draw(1);
        return;
      }
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
