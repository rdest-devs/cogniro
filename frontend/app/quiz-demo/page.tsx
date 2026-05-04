'use client';

import { useEffect, useRef, useState } from 'react';

import { resolveMediaUrl } from '@/lib/media-url';

import {
  AttemptReview,
  MultipleChoice,
  Ordering,
  QuizResults,
  QuizStart,
  RangeSlider,
  SingleChoice,
  SliderQuestion,
} from '../components/quiz';
import type { QuizChoiceAnswer, QuizImage, ReviewQuestion } from '../types';

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
      image?: QuizImage;
      answers: QuizChoiceAnswer[];
      hint?: string;
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
    type: 'single',
    question:
      'Który protokół jest używany do bezpiecznego przesyłania danych w sieci?',
    answers: [
      { text: 'HTTP' },
      { text: 'HTTPS' },
      { text: 'FTP' },
      { text: 'SMTP' },
    ],
  },
  {
    id: 2,
    type: 'multiple',
    question: 'Które z poniższych są językami programowania?',
    hint: 'Wybierz wszystkie poprawne odpowiedzi',
    answers: [
      { text: 'Python' },
      { text: 'HTML' },
      { text: 'Java' },
      { text: 'CSS' },
    ],
  },
  {
    id: 3,
    type: 'single',
    question: 'Co przedstawia ten schemat?',
    image: {
      assetId: 'demo_flowchart',
      url: '/images/flowchart.png',
      thumbUrl: '/images/flowchart.png',
      width: 720,
      height: 405,
      alt: 'Schemat blokowy',
    },
    answers: [
      { text: 'Pętla while' },
      { text: 'Instrukcja switch' },
      { text: 'Sortowanie bąbelkowe' },
    ],
  },
  {
    id: 4,
    type: 'single',
    question: 'Który obraz przedstawia strukturę drzewa binarnego?',
    answers: [
      {
        text: 'A',
        image: {
          assetId: 'demo_diagram_a',
          url: '/images/diagram-a.png',
          thumbUrl: '/images/diagram-a.png',
          width: 256,
          height: 256,
          alt: 'Diagram A – lista jednokierunkowa',
        },
      },
      {
        text: 'B',
        image: {
          assetId: 'demo_diagram_b',
          url: '/images/diagram-b.png',
          thumbUrl: '/images/diagram-b.png',
          width: 256,
          height: 256,
          alt: 'Diagram B – tablica haszująca',
        },
      },
      {
        text: 'C',
        image: {
          assetId: 'demo_diagram_c',
          url: '/images/diagram-c.png',
          thumbUrl: '/images/diagram-c.png',
          width: 256,
          height: 256,
          alt: 'Diagram C – drzewo binarne',
        },
      },
      {
        text: 'D',
        image: {
          assetId: 'demo_diagram_d',
          url: '/images/diagram-d.png',
          thumbUrl: '/images/diagram-d.png',
          width: 256,
          height: 256,
          alt: 'Diagram D – stos',
        },
      },
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

function resolveBackendBaseUrl(): string {
  const candidate =
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.NEXT_PUBLIC_BACKEND_URL ??
    'http://127.0.0.1:8000';

  return candidate.replace(/\/+$/, '');
}

function getQuestionImageUrls(question: QuizQuestion): string[] {
  if (question.type !== 'single' && question.type !== 'multiple') {
    return [];
  }

  const urls: string[] = [];

  if (question.image?.url) {
    urls.push(question.image.url);
  }

  for (const answer of question.answers) {
    if (answer.image?.thumbUrl) {
      urls.push(answer.image.thumbUrl);
    }
  }

  return urls;
}

function preloadImage(url: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  const img = new Image();
  img.src = resolveMediaUrl(url);
}

function preloadQuestionImages(
  quiz: QuizQuestion[],
  questionIndex: number,
): void {
  const question = quiz[questionIndex];
  if (!question) {
    return;
  }

  for (const url of getQuestionImageUrls(question)) {
    preloadImage(url);
  }
}

export default function QuizDemoPage() {
  const [view, setView] = useState<View>('start');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [submittedAnswers, setSubmittedAnswers] = useState<SubmittedAnswer[]>(
    [],
  );
  const [result, setResult] = useState<QuizResultsApiResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const initialPreloadDoneRef = useRef(false);

  const currentQuestion = questions[questionIndex];
  const totalQuestions = questions.length;

  useEffect(() => {
    if (view !== 'question') {
      return;
    }

    if (!initialPreloadDoneRef.current) {
      preloadQuestionImages(questions, 0);
      preloadQuestionImages(questions, 1);
      initialPreloadDoneRef.current = true;
      return;
    }

    preloadQuestionImages(questions, questionIndex + 1);
  }, [view, questionIndex]);

  const submitQuiz = async (answers: SubmittedAnswer[]) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const backendBaseUrl = resolveBackendBaseUrl();

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
    initialPreloadDoneRef.current = false;
  };

  if (isSubmitting) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[var(--page-bg)] px-6">
        <p className="text-base font-semibold text-[var(--text-dark)]">
          Przeliczanie wyniku...
        </p>
      </div>
    );
  }

  if (view === 'start') {
    return (
      <div className="flex h-dvh items-center justify-center bg-[var(--page-bg)]">
        <QuizStart
          {...quizStartData}
          onStart={() => {
            setQuestionIndex(0);
            initialPreloadDoneRef.current = false;
            setView('question');
          }}
        />
      </div>
    );
  }

  if (view === 'question' && currentQuestion) {
    let questionView = null;

    if (currentQuestion.type === 'single') {
      questionView = (
        <SingleChoice
          key={`q-${questionIndex}`}
          questionNumber={questionIndex + 1}
          totalQuestions={totalQuestions}
          time="--:--"
          question={currentQuestion.question}
          questionImage={currentQuestion.image}
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
          key={`q-${questionIndex}`}
          questionNumber={questionIndex + 1}
          totalQuestions={totalQuestions}
          time="--:--"
          question={currentQuestion.question}
          hint={currentQuestion.hint}
          questionImage={currentQuestion.image}
          answers={currentQuestion.answers}
          onSubmit={(selectedIndices) =>
            handleAnswerSubmit({ selected: selectedIndices })
          }
        />
      );
    }

    if (currentQuestion.type === 'ordering') {
      questionView = (
        <Ordering
          key={`q-${questionIndex}`}
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
          key={`q-${questionIndex}`}
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
          key={`q-${questionIndex}`}
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
        <div className="flex h-dvh items-center justify-center bg-[var(--page-bg)] px-6">
          <p className="text-base font-semibold text-[var(--text-dark)]">
            Nieobsługiwany typ pytania.
          </p>
        </div>
      );
    }

    return (
      <div className="relative flex h-dvh justify-center overflow-hidden bg-[var(--page-bg)]">
        {questionView}
        {submitError && (
          <p className="absolute right-3 bottom-3 left-3 rounded-xl border border-[var(--wrong-fg)] bg-[var(--wrong-bg)] px-3 py-2 text-center text-sm font-medium text-[var(--wrong-fg)]">
            {submitError}
          </p>
        )}
      </div>
    );
  }

  if (view === 'review' && result?.showAnswerReview) {
    const correctCount = result.reviewQuestions.filter(
      (q) => q.isCorrect,
    ).length;

    return (
      <div className="flex h-dvh justify-center overflow-hidden bg-[var(--page-bg)]">
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
      <div className="flex h-dvh justify-center overflow-hidden bg-[var(--page-bg)]">
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
    <div className="flex h-dvh items-center justify-center bg-[var(--page-bg)]">
      <p className="text-base font-semibold text-[var(--text-dark)]">
        Wystąpił błąd podczas ładowania quizu.
      </p>
    </div>
  );
}
