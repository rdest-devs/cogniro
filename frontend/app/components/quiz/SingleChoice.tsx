'use client';

import { useState } from 'react';

import QuestionCard from './QuestionCard';
import QuizLayout from './QuizLayout';
import RadioAnswer from './RadioAnswer';
import SubmitButton from './SubmitButton';

interface SingleChoiceProps {
  questionNumber: number;
  totalQuestions: number;
  time: string;
  question: string;
  answers: string[];
  onSubmit?: (selectedIndex: number) => void;
}

export default function SingleChoice({
  questionNumber,
  totalQuestions,
  time,
  question,
  answers,
  onSubmit,
}: SingleChoiceProps) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <QuizLayout
      questionNumber={questionNumber}
      totalQuestions={totalQuestions}
      time={time}
    >
      <QuestionCard question={question} />

      <div className="flex flex-col gap-3">
        {answers.map((answer, i) => (
          <RadioAnswer
            key={`${i}-${answer}`}
            label={answer}
            selected={selected === i}
            onClick={() => setSelected(i)}
          />
        ))}
      </div>

      <SubmitButton
        label="Zatwierdź odpowiedź"
        onClick={() => selected !== null && onSubmit?.(selected)}
        disabled={selected === null}
      />
    </QuizLayout>
  );
}
