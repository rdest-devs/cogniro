'use client';

import { useState } from 'react';

import {
  AttemptReview,
  ImageAnswers,
  ImageQuestion,
  MultipleChoice,
  Ordering,
  QuizResults,
  QuizStart,
  RangeSlider,
  SingleChoice,
  SliderQuestion,
} from '../components/quiz';
import type { ImageAnswerOption, ReviewQuestion } from '../types';

const quizStartData = {
  title: 'Quiz Informatyczny',
  description:
    'Sprawdź swoją wiedzę z zakresu informatyki! Odpowiedz na pytania i zobacz wynik zaraz po zakończeniu quizu.',
  logoUrl: '/images/wi-new-logo.png',
};

type QuizQuestion =
  | {
      id: number;
      type: 'single' | 'multiple';
      question: string;
      answers: string[];
      hint?: string;
    }
  | {
      id: number;
      type: 'image-question';
      question: string;
      imageUrl: string;
      answers: string[];
    }
  | {
      id: number;
      type: 'image-answers';
      question: string;
      answers: ImageAnswerOption[];
    }
  | {
      id: number;
      type: 'ordering';
      question: string;
      hint?: string;
      items: string[];
    }
  | {
      id: number;
      type: 'slider';
      question: string;
      hint?: string;
      min: number;
      max: number;
      step: number;
      defaultValue: number;
      unit: string;
      ticks: number[];
    }
  | {
      id: number;
      type: 'range-slider';
      question: string;
      hint?: string;
      min: number;
      max: number;
      defaultValue: number;
      lowLabel: string;
      highLabel: string;
    };

type SubmittedAnswer = {
  questionId: number;
  selected?: number[];
  ordering?: string[];
  value?: number;
};

const questions: QuizQuestion[] = [
  {
    id: 1,
    type: 'single' as const,
    question:
      'Który protokół jest używany do bezpiecznego przesyłania danych w sieci?',
    answers: ['HTTP', 'HTTPS', 'FTP', 'SMTP'],
  },
  {
    id: 2,
    type: 'multiple' as const,
    question: 'Które z poniższych są językami programowania?',
    hint: 'Wybierz wszystkie poprawne odpowiedzi',
    answers: ['Python', 'HTML', 'Java', 'CSS'],
  },
  {
    id: 3,
    type: 'image-question',
    question: 'Który schemat blokowy przedstawia pętlę while?',
    imageUrl: '/images/flowchart.png',
    answers: ['Schemat A', 'Schemat B', 'Schemat C'],
  },
  {
    id: 4,
    type: 'image-answers',
    question: 'Który obraz przedstawia strukturę drzewa binarnego?',
    answers: [
      { imageUrl: '/images/diagram-a.png', label: 'A' },
      { imageUrl: '/images/diagram-b.png', label: 'B' },
      { imageUrl: '/images/diagram-c.png', label: 'C' },
      { imageUrl: '/images/diagram-d.png', label: 'D' },
    ],
  },
  {
    id: 5,
    type: 'ordering',
    question: 'Ułóż etapy kompilacji programu w odpowiedniej kolejności',
    hint: 'Przeciągnij elementy, aby ustalić kolejność',
    items: [
      'Analiza leksykalna',
      'Analiza składniowa',
      'Optymalizacja',
      'Generowanie kodu',
    ],
  },
  {
    id: 6,
    type: 'slider',
    question: 'Ile bitów ma adres IPv4?',
    hint: 'Wybierz wartość za pomocą suwaka',
    min: 0,
    max: 128,
    step: 1,
    defaultValue: 32,
    unit: 'bitów',
    ticks: [0, 32, 64, 96, 128],
  },
  {
    id: 7,
    type: 'range-slider',
    question: 'Oceń swoją pewność w zakresie programowania obiektowego',
    hint: 'Przesuń suwak, aby wybrać wartość od 1 do 10',
    min: 1,
    max: 10,
    defaultValue: 7,
    lowLabel: 'Niska pewność',
    highLabel: 'Wysoka pewność',
  },
];

interface QuizResultsApiResponse {
  scorePercent: number;
  scorePoints: number;
  scoreMaxPoints: number;
  correct: number;
  scoreTotal: number;
  showAnswerReview: boolean;
  message: string;
  reviewQuestions: ReviewQuestion[];
}

type View = 'start' | 'question' | 'results' | 'review';

export default function QuizDemoPage() {
  const [view, setView] = useState<View>('start');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [submittedAnswers, setSubmittedAnswers] = useState<SubmittedAnswer[]>(
    [],
  );
  const [result, setResult] = useState<QuizResultsApiResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const currentQuestion = questions[questionIndex];
  const totalQuestions = questions.length;

  const submitQuiz = async (answers: SubmittedAnswer[]) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const backendBaseUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://127.0.0.1:8000';

      const response = await fetch(`${backendBaseUrl}/quiz/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch quiz results (${response.status})`);
      }

      const data = (await response.json()) as QuizResultsApiResponse;
      setResult(data);
      setView('results');
    } catch (error) {
      console.error('Quiz results fetch failed:', error);
      setSubmitError('Nie udało się pobrać wyników. Spróbuj ponownie.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnswerSubmit = async (
    answer: Omit<SubmittedAnswer, 'questionId'>,
  ) => {
    const nextAnswers = [
      ...submittedAnswers.filter(
        (submitted) => submitted.questionId !== currentQuestion.id,
      ),
      {
        questionId: currentQuestion.id,
        ...answer,
      },
    ];

    setSubmittedAnswers(nextAnswers);

    const isLastQuestion = questionIndex === totalQuestions - 1;

    if (isLastQuestion) {
      await submitQuiz(nextAnswers);
      return;
    }

    setQuestionIndex((prev) => prev + 1);
  };

  const resetQuiz = () => {
    setView('start');
    setQuestionIndex(0);
    setSubmittedAnswers([]);
    setResult(null);
    setIsSubmitting(false);
    setSubmitError(null);
  };

  if (isSubmitting) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--page-bg)] px-6">
        <p className="text-base font-semibold text-[var(--text-dark)]">
          Przeliczanie wyniku...
        </p>
      </div>
    );
  }

  if (view === 'start') {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--page-bg)]">
        <QuizStart {...quizStartData} onStart={() => setView('question')} />
      </div>
    );
  }

  if (view === 'question' && currentQuestion) {
    let questionView = null;

    if (currentQuestion.type === 'single') {
      questionView = (
        <SingleChoice
          questionNumber={questionIndex + 1}
          totalQuestions={totalQuestions}
          time="--:--"
          question={currentQuestion.question}
          answers={currentQuestion.answers}
          onSubmit={(selectedIndex) =>
            handleAnswerSubmit({ selected: [selectedIndex] })
          }
        />
      );
    }

    if (currentQuestion.type === 'multiple') {
      questionView = (
        <MultipleChoice
          questionNumber={questionIndex + 1}
          totalQuestions={totalQuestions}
          time="--:--"
          question={currentQuestion.question}
          hint={currentQuestion.hint}
          answers={currentQuestion.answers}
          onSubmit={(selectedIndices) =>
            handleAnswerSubmit({ selected: selectedIndices })
          }
        />
      );
    }

    if (currentQuestion.type === 'image-question') {
      questionView = (
        <ImageQuestion
          questionNumber={questionIndex + 1}
          totalQuestions={totalQuestions}
          time="--:--"
          question={currentQuestion.question}
          imageUrl={currentQuestion.imageUrl}
          answers={currentQuestion.answers}
          onSubmit={(selectedIndex) =>
            handleAnswerSubmit({ selected: [selectedIndex] })
          }
        />
      );
    }

    if (currentQuestion.type === 'image-answers') {
      questionView = (
        <ImageAnswers
          questionNumber={questionIndex + 1}
          totalQuestions={totalQuestions}
          time="--:--"
          question={currentQuestion.question}
          answers={currentQuestion.answers}
          onSubmit={(selectedIndex) =>
            handleAnswerSubmit({ selected: [selectedIndex] })
          }
        />
      );
    }

    if (currentQuestion.type === 'ordering') {
      questionView = (
        <Ordering
          questionNumber={questionIndex + 1}
          totalQuestions={totalQuestions}
          time="--:--"
          question={currentQuestion.question}
          hint={currentQuestion.hint}
          items={currentQuestion.items}
          onSubmit={(order) => handleAnswerSubmit({ ordering: order })}
        />
      );
    }

    if (currentQuestion.type === 'slider') {
      questionView = (
        <SliderQuestion
          questionNumber={questionIndex + 1}
          totalQuestions={totalQuestions}
          time="--:--"
          question={currentQuestion.question}
          hint={currentQuestion.hint}
          min={currentQuestion.min}
          max={currentQuestion.max}
          step={currentQuestion.step}
          defaultValue={currentQuestion.defaultValue}
          unit={currentQuestion.unit}
          ticks={currentQuestion.ticks}
          onSubmit={(value) => handleAnswerSubmit({ value })}
        />
      );
    }

    if (currentQuestion.type === 'range-slider') {
      questionView = (
        <RangeSlider
          questionNumber={questionIndex + 1}
          totalQuestions={totalQuestions}
          time="--:--"
          question={currentQuestion.question}
          hint={currentQuestion.hint}
          min={currentQuestion.min}
          max={currentQuestion.max}
          defaultValue={currentQuestion.defaultValue}
          lowLabel={currentQuestion.lowLabel}
          highLabel={currentQuestion.highLabel}
          onSubmit={(value) => handleAnswerSubmit({ value })}
        />
      );
    }

    if (!questionView) {
      return (
        <div className="flex h-screen items-center justify-center bg-[var(--page-bg)] px-6">
          <p className="text-base font-semibold text-[var(--text-dark)]">
            Nieobsługiwany typ pytania.
          </p>
        </div>
      );
    }

    return (
      <div className="flex h-screen items-center justify-center bg-[var(--page-bg)]">
        <div className="flex flex-col items-center gap-3">
          {questionView}
          {submitError && (
            <p className="text-sm font-medium text-[var(--wrong-fg)]">
              {submitError}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (view === 'review' && result?.showAnswerReview) {
    const correctCount = result.reviewQuestions.filter(
      (q) => q.isCorrect,
    ).length;

    return (
      <div className="flex h-screen justify-center overflow-hidden bg-[var(--page-bg)]">
        <AttemptReview
          correctCount={correctCount}
          wrongCount={result.reviewQuestions.length - correctCount}
          scorePercent={result.scorePercent}
          questions={result.reviewQuestions}
          onBack={() => setView('results')}
        />
      </div>
    );
  }

  if (view === 'results' && result) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--page-bg)]">
        <QuizResults
          scorePercent={result.scorePercent}
          scorePoints={result.scorePoints}
          scoreTotal={result.scoreMaxPoints}
          message={result.message}
          showAnswerReview={result.showAnswerReview}
          onReview={() => setView('review')}
          onRetry={resetQuiz}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-[var(--page-bg)]">
      <p className="text-base font-semibold text-[var(--text-dark)]">
        Wystąpił błąd podczas ładowania quizu.
      </p>
    </div>
  );
}
