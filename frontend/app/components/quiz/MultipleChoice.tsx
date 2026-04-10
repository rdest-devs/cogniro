'use client';

import { useState } from 'react';

import CheckboxAnswer from './CheckboxAnswer';
import QuestionCard from './QuestionCard';
import QuizLayout from './QuizLayout';
import SubmitButton from './SubmitButton';

interface MultipleChoiceProps {
  questionNumber: number;
  totalQuestions: number;
  time: string;
  question: string;
  hint?: string;
  answers: string[];
  onSubmit?: (selectedIndices: number[]) => void;
}

export default function MultipleChoice({
  questionNumber,
  totalQuestions,
  time,
  question,
  hint,
  answers,
  onSubmit,
}: MultipleChoiceProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggle = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <QuizLayout
      questionNumber={questionNumber}
      totalQuestions={totalQuestions}
      time={time}
    >
      <QuestionCard question={question} hint={hint} />

      <div className="flex flex-col gap-3">
        {answers.map((answer, i) => (
          <CheckboxAnswer
            key={`${i}-${answer}`}
            label={answer}
            selected={selected.has(i)}
            onClick={() => toggle(i)}
          />
        ))}
      </div>

      <SubmitButton
        label="Zatwierdź odpowiedź"
        onClick={() => onSubmit?.(Array.from(selected))}
        disabled={selected.size === 0}
      />
    </QuizLayout>
  );
}
