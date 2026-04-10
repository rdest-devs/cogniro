'use client';

import { useState } from 'react';

import CheckboxAnswer from './CheckboxAnswer';
import ProgressBar from './ProgressBar';
import QuestionCard from './QuestionCard';
import QuestionHeader from './QuestionHeader';
import SubmitButton from './SubmitButton';

interface MultipleChoiceProps {
  questionNumber?: number;
  totalQuestions?: number;
  time?: string;
  question?: string;
  hint?: string;
  answers?: string[];
  onSubmit?: (selectedIndices: number[]) => void;
}

export default function MultipleChoice({
  questionNumber = 5,
  totalQuestions = 10,
  time = '1:15',
  question = 'Które z poniższych są językami programowania?',
  hint = 'Wybierz wszystkie poprawne odpowiedzi',
  answers = ['Python', 'HTML', 'Java', 'CSS'],
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
    <div className="flex min-h-full w-full max-w-[390px] flex-col bg-[var(--page-bg)]">
      <ProgressBar current={questionNumber} total={totalQuestions} />
      <QuestionHeader
        current={questionNumber}
        total={totalQuestions}
        time={time}
      />

      <div className="flex flex-1 flex-col gap-6 px-6 pt-6 pb-8">
        <QuestionCard question={question} hint={hint} />

        <div className="flex flex-col gap-3">
          {answers.map((answer, i) => (
            <CheckboxAnswer
              key={answer}
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
      </div>
    </div>
  );
}
