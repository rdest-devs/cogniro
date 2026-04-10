'use client';

import { useState } from 'react';

import ProgressBar from './ProgressBar';
import QuestionCard from './QuestionCard';
import QuestionHeader from './QuestionHeader';
import RadioAnswer from './RadioAnswer';
import SubmitButton from './SubmitButton';

interface ImageQuestionProps {
  questionNumber?: number;
  totalQuestions?: number;
  time?: string;
  question?: string;
  imageUrl?: string;
  answers?: string[];
  onSubmit?: (selectedIndex: number) => void;
}

export default function ImageQuestion({
  questionNumber = 7,
  totalQuestions = 10,
  time = '0:58',
  question = 'Który schemat blokowy przedstawia pętlę while?',
  imageUrl = '/images/flowchart.png',
  answers = ['Schemat A', 'Schemat B', 'Schemat C'],
  onSubmit,
}: ImageQuestionProps) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="flex min-h-full w-full max-w-[390px] flex-col bg-[var(--page-bg)]">
      <ProgressBar current={questionNumber} total={totalQuestions} />
      <QuestionHeader
        current={questionNumber}
        total={totalQuestions}
        time={time}
      />

      <div className="flex flex-1 flex-col gap-5 px-6 pt-5 pb-8">
        <QuestionCard question={question} imageUrl={imageUrl} />

        <div className="flex flex-col gap-2.5">
          {answers.map((answer, i) => (
            <RadioAnswer
              key={answer}
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
      </div>
    </div>
  );
}
