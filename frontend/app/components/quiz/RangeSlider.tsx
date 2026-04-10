'use client';

import { useState } from 'react';

import ProgressBar from './ProgressBar';
import QuestionCard from './QuestionCard';
import QuestionHeader from './QuestionHeader';
import SubmitButton from './SubmitButton';

interface RangeSliderProps {
  questionNumber?: number;
  totalQuestions?: number;
  time?: string;
  question?: string;
  hint?: string;
  min?: number;
  max?: number;
  defaultValue?: number;
  lowLabel?: string;
  highLabel?: string;
  onSubmit?: (value: number) => void;
}

export default function RangeSlider({
  questionNumber = 5,
  totalQuestions = 10,
  time = '1:22',
  question = 'Oceń swoją pewność w zakresie programowania obiektowego',
  hint = 'Przesuń suwak, aby wybrać wartość od 1 do 10',
  min = 1,
  max = 10,
  defaultValue = 7,
  lowLabel = 'Niska pewność',
  highLabel = 'Wysoka pewność',
  onSubmit,
}: RangeSliderProps) {
  const [value, setValue] = useState(defaultValue);
  const range = max - min;
  const percent = range > 0 ? ((value - min) / range) * 100 : 0;

  // Generate tick marks
  const midpoint = Math.round((min + max) / 2);
  const tickValues = [min, midpoint, max];

  return (
    <div className="flex min-h-full w-full max-w-[390px] flex-col bg-[var(--page-bg)]">
      <ProgressBar current={questionNumber} total={totalQuestions} />
      <QuestionHeader
        current={questionNumber}
        total={totalQuestions}
        time={time}
      />

      <div className="flex flex-1 flex-col gap-6 px-6 pt-6 pb-8">
        <QuestionCard question={question} hint={hint} />

        {/* Value Display */}
        <div className="flex w-full flex-col gap-6">
          <div className="flex items-center gap-1">
            <span className="text-5xl font-extrabold text-[var(--orange)]">
              {value}
            </span>
            <span className="text-base font-medium text-[var(--text-muted)]">
              / {max}
            </span>
          </div>

          {/* Slider */}
          <div className="w-full">
            <div className="relative h-6 w-full">
              <div className="absolute top-1/2 h-2 w-full -translate-y-1/2 rounded-full bg-[var(--border)]">
                <div
                  className="h-full rounded-full bg-[var(--orange)]"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <input
                type="range"
                min={min}
                max={max}
                step={1}
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
            <div className="mt-3 flex w-full justify-between">
              {tickValues.map((tick) => (
                <span
                  key={tick}
                  className="text-xs font-medium text-[var(--text-muted)]"
                >
                  {tick}
                </span>
              ))}
            </div>

            {/* Description labels */}
            <div className="mt-1 flex w-full justify-between px-1">
              <span className="text-[11px] text-[var(--text-muted)]">
                {lowLabel}
              </span>
              <span className="text-[11px] text-[var(--text-muted)]">
                {highLabel}
              </span>
            </div>
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
