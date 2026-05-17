'use client';

import { useState } from 'react';

import SliderTrack from '@/app/components/common/SliderTrack';
import SubmitButton from '@/app/components/common/SubmitButton';
import { cn } from '@/lib/cn';

import QuestionCard from '../shared/QuestionCard';
import QuizLayout from '../shared/QuizLayout';

interface SliderQuestionProps {
  /** When true, renders only the slider + value + submit (no quiz chrome). */
  playInline?: boolean;
  questionNumber?: number;
  totalQuestions?: number;
  time?: string;
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

function SliderBody({
  question,
  min,
  max,
  step,
  value,
  unit,
  ticks,
  onChange,
}: {
  question: string;
  min: number;
  max: number;
  step: number;
  value: number;
  unit: string;
  ticks: number[];
  onChange: (v: number) => void;
}) {
  const range = max - min;
  const percent = range > 0 ? ((value - min) / range) * 100 : 0;

  return (
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
          onChange={onChange}
          ariaLabel={question}
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
  );
}

export default function SliderQuestion({
  playInline = false,
  questionNumber = 1,
  totalQuestions = 1,
  time = '--:--',
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

  const body = (
    <>
      {!playInline && <QuestionCard question={question} hint={hint} />}
      <SliderBody
        question={question}
        min={min}
        max={max}
        step={step}
        value={value}
        unit={unit}
        ticks={ticks}
        onChange={setValue}
      />
      <SubmitButton
        label="Zatwierdź odpowiedź"
        onClick={() => onSubmit?.(value)}
      />
    </>
  );

  if (playInline) {
    return <div className="flex w-full flex-col gap-6">{body}</div>;
  }

  return (
    <QuizLayout
      questionNumber={questionNumber}
      totalQuestions={totalQuestions}
      time={time}
      contentClassName="gap-8"
    >
      {body}
    </QuizLayout>
  );
}
