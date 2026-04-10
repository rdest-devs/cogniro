'use client';

import { useState } from 'react';

import ProgressBar from './ProgressBar';
import QuestionCard from './QuestionCard';
import QuestionHeader from './QuestionHeader';
import RadioAnswer from './RadioAnswer';
import SubmitButton from './SubmitButton';

interface SingleChoiceProps {
  questionNumber?: number;
  totalQuestions?: number;
  time?: string;
  question?: string;
  answers?: string[];
  onSubmit?: (selectedIndex: number) => void;
}

export default function SingleChoice({
  questionNumber = 3,
  totalQuestions = 10,
  time = '0:42',
  question = 'Który protokół jest używany do bezpiecznego przesyłania danych w sieci?',
  answers = ['HTTP', 'HTTPS', 'FTP', 'SMTP'],
  onSubmit,
}: SingleChoiceProps) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="flex min-h-full w-full max-w-[390px] flex-col bg-[var(--page-bg)]">
      <ProgressBar current={questionNumber} total={totalQuestions} />
      <QuestionHeader
        current={questionNumber}
        total={totalQuestions}
        time={time}
      />

      <div className="flex flex-1 flex-col gap-6 px-6 pt-6 pb-8">
        <QuestionCard question={question} />

        <div className="flex flex-col gap-3">
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
