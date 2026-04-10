'use client';

import { useState } from 'react';

import { cn } from '@/lib/cn';

import QuestionCard from './QuestionCard';
import QuizLayout from './QuizLayout';
import SliderTrack from './SliderTrack';
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
    <QuizLayout
      questionNumber={questionNumber}
      totalQuestions={totalQuestions}
      time={time}
      contentClassName="gap-8"
    >
      <QuestionCard question={question} hint={hint} />

      {/* Value Display + Slider */}
      <div className="flex flex-col items-center gap-6">
        <div className="flex h-[100px] w-[100px] flex-col items-center justify-center rounded-full border-[3px] border-[var(--orange)] bg-[var(--card-bg)]">
          <span className="text-4xl font-extrabold text-[var(--orange)]">
            {value}
          </span>
          <span className="text-xs font-medium text-[var(--text-muted)]">
            {unit}
          </span>
        </div>

        <div className="w-full">
          <SliderTrack
            min={min}
            max={max}
            step={step}
            value={value}
            percent={percent}
            onChange={setValue}
          />

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
        </div>
      </div>

      <SubmitButton
        label="Zatwierdź odpowiedź"
        onClick={() => onSubmit?.(value)}
      />
    </QuizLayout>
  );
}
