'use client';

import { useState } from 'react';

import QuestionCard from './QuestionCard';
import QuizLayout from './QuizLayout';
import SliderTrack from './SliderTrack';
import SubmitButton from './SubmitButton';

interface RangeSliderProps {
  questionNumber: number;
  totalQuestions: number;
  time: string;
  question: string;
  hint?: string;
  min: number;
  max: number;
  defaultValue: number;
  lowLabel: string;
  highLabel: string;
  onSubmit?: (value: number) => void;
}

export default function RangeSlider({
  questionNumber,
  totalQuestions,
  time,
  question,
  hint,
  min,
  max,
  defaultValue,
  lowLabel,
  highLabel,
  onSubmit,
}: RangeSliderProps) {
  const [value, setValue] = useState(defaultValue);
  const range = max - min;
  const percent = range > 0 ? ((value - min) / range) * 100 : 0;

  const midpoint = Math.round((min + max) / 2);
  const tickValues = [min, midpoint, max];

  return (
    <QuizLayout
      questionNumber={questionNumber}
      totalQuestions={totalQuestions}
      time={time}
    >
      <QuestionCard question={question} hint={hint} />

      {/* Value Display + Slider */}
      <div className="flex w-full flex-col items-center gap-6">
        <p className="flex items-center gap-1">
          <span className="text-5xl font-extrabold text-[var(--orange)]">
            {value}
          </span>
          <span className="text-base font-medium text-[var(--text-muted)]">
            / {max}
          </span>
        </p>

        <div className="w-full">
          <SliderTrack
            min={min}
            max={max}
            step={1}
            value={value}
            percent={percent}
            onChange={setValue}
            trackHeight="h-6"
          />

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
    </QuizLayout>
  );
}
