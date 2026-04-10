'use client';

import { useState } from 'react';

import { cn } from '@/lib/cn';

import ProgressBar from './ProgressBar';
import QuestionCard from './QuestionCard';
import QuestionHeader from './QuestionHeader';
import SubmitButton from './SubmitButton';

interface SliderQuestionProps {
  questionNumber: number;
  totalQuestions: number;
  time: string;
  question: string;
  hint?: string;
  min: number;
  max: number;
  step?: number;
  defaultValue: number;
  unit: string;
  ticks: number[];
  onSubmit?: (value: number) => void;
}

export default function SliderQuestion({
  questionNumber,
  totalQuestions,
  time,
  question,
  hint,
  min,
  max,
  step = 1,
  defaultValue,
  unit,
  ticks,
  onSubmit,
}: SliderQuestionProps) {
  const [value, setValue] = useState(defaultValue);
  const range = max - min;
  const percent = range > 0 ? ((value - min) / range) * 100 : 0;

  return (
    <div className="flex min-h-full w-full max-w-[390px] flex-col bg-[var(--page-bg)]">
      <ProgressBar current={questionNumber} total={totalQuestions} />
      <QuestionHeader
        current={questionNumber}
        total={totalQuestions}
        time={time}
      />

      <div className="flex flex-1 flex-col gap-8 px-6 pt-6 pb-8">
        <QuestionCard question={question} hint={hint} />

        {/* Value Display */}
        <div className="flex flex-col items-center gap-6">
          <div className="flex h-[100px] w-[100px] flex-col items-center justify-center rounded-full border-[3px] border-[var(--orange)] bg-[var(--card-bg)]">
            <span className="text-4xl font-extrabold text-[var(--orange)]">
              {value}
            </span>
            <span className="text-xs font-medium text-[var(--text-muted)]">
              {unit}
            </span>
          </div>

          {/* Slider Track */}
          <div className="w-full">
            <div className="relative h-10 w-full">
              {/* Track background */}
              <div className="absolute top-1/2 h-2 w-full -translate-y-1/2 rounded-full bg-[var(--border)]">
                <div
                  className="h-full rounded-full bg-[var(--orange)]"
                  style={{ width: `${percent}%` }}
                />
              </div>
              {/* Thumb */}
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                className="absolute top-0 h-full w-full cursor-pointer opacity-0"
              />
              <div
                className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[var(--orange)] bg-white"
                style={{ left: `${percent}%` }}
              />
            </div>

            {/* Tick labels */}
            {ticks && (
              <div className="mt-1 flex w-full justify-between px-1">
                {ticks.map((tick) => (
                  <span
                    key={tick}
                    className={cn(
                      'text-xs',
                      tick === value
                        ? 'font-bold text-[var(--orange)]'
                        : 'font-medium text-[var(--text-muted)]',
                    )}
                  >
                    {tick}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <SubmitButton
          label="Zatwierdź odpowiedź"
          onClick={() => onSubmit?.(value)}
        />
      </div>
    </div>
  );
}
