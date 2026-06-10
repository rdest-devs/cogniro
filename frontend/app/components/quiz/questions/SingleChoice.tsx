'use client';

import { useState } from 'react';

import SubmitButton from '@/app/components/common/SubmitButton';
import type { QuizChoiceAnswer, QuizImage } from '@/app/types';

import QuestionCard from '../shared/QuestionCard';
import QuizLayout from '../shared/QuizLayout';
import SingleSelectAnswers from '../shared/SingleSelectAnswers';

interface SingleChoiceProps {
  questionNumber: number;
  totalQuestions: number;
  time: string;
  question: string;
  questionImage?: QuizImage;
  answers: Array<string | QuizChoiceAnswer>;
  onSubmit?: (selectedIndex: number) => void;
}

export default function SingleChoice({
  questionNumber,
  totalQuestions,
  time,
  question,
  questionImage,
  answers,
  onSubmit,
}: SingleChoiceProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const groupAriaLabel = question.trim() || 'Wybór jednej odpowiedzi';

  return (
    <QuizLayout
      questionNumber={questionNumber}
      totalQuestions={totalQuestions}
      time={time}
    >
      <QuestionCard
        question={question}
        image={questionImage}
        imageLoading="eager"
      />

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
