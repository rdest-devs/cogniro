'use client';

import { useState } from 'react';

import QuestionCard from './QuestionCard';
import QuizLayout from './QuizLayout';
import RadioAnswer from './RadioAnswer';
import SubmitButton from './SubmitButton';

interface ImageQuestionProps {
  questionNumber: number;
  totalQuestions: number;
  time: string;
  question: string;
  imageUrl: string;
  answers: string[];
  onSubmit?: (selectedIndex: number) => void;
}

export default function ImageQuestion({
  questionNumber,
  totalQuestions,
  time,
  question,
  imageUrl,
  answers,
  onSubmit,
}: ImageQuestionProps) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <QuizLayout
      questionNumber={questionNumber}
      totalQuestions={totalQuestions}
      time={time}
      contentClassName="gap-5 pt-5"
    >
      <QuestionCard question={question} imageUrl={imageUrl} />

      <div className="flex flex-col gap-2.5">
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
