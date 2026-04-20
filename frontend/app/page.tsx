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
} from './components/quiz';
import {
  attemptReviewDemo,
  imageAnswersDemo,
  imageQuestionDemo,
  multipleChoiceDemo,
  orderingDemo,
  quizResultsDemo,
  quizStartDemo,
  rangeSliderDemo,
  singleChoiceDemo,
  sliderQuestionDemo,
} from './data/demo';

const screens = [
  'Quiz Start',
  'Single Choice',
  'Multiple Choice',
  'Image Question',
  'Image Answers',
  'Ordering',
  'Slider',
  'Range Slider',
  'Quiz Results',
  'Attempt Review',
] as const;

type Screen = (typeof screens)[number];

export default function Home() {
  const [current, setCurrent] = useState<Screen>('Quiz Start');
  const shouldCenterVertically = current !== 'Attempt Review';

  return (
    <div className="flex h-screen flex-col">
      <nav className="flex flex-wrap gap-2 border-b border-[var(--border)] bg-[var(--card-bg)] p-3">
        {screens.map((screen) => (
          <button
            key={screen}
            onClick={() => setCurrent(screen)}
            className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              current === screen
                ? 'bg-[var(--primary-blue)] text-white'
                : 'bg-white text-[var(--text-dark)] hover:bg-[var(--page-bg)]'
            }`}
          >
            {screen}
          </button>
        ))}
        <a
          href="/admin/"
          className="cursor-pointer rounded-lg bg-[var(--orange)] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
        >
          Admin
        </a>
      </nav>

      <div
        className={`flex flex-1 overflow-auto bg-[var(--page-bg)] ${shouldCenterVertically ? 'items-center justify-center' : 'justify-center'}`}
      >
        {current === 'Quiz Start' && <QuizStart {...quizStartDemo} />}
        {current === 'Single Choice' && <SingleChoice {...singleChoiceDemo} />}
        {current === 'Multiple Choice' && (
          <MultipleChoice {...multipleChoiceDemo} />
        )}
        {current === 'Image Question' && (
          <ImageQuestion {...imageQuestionDemo} />
        )}
        {current === 'Image Answers' && <ImageAnswers {...imageAnswersDemo} />}
        {current === 'Ordering' && <Ordering {...orderingDemo} />}
        {current === 'Slider' && <SliderQuestion {...sliderQuestionDemo} />}
        {current === 'Range Slider' && <RangeSlider {...rangeSliderDemo} />}
        {current === 'Quiz Results' && <QuizResults {...quizResultsDemo} />}
        {current === 'Attempt Review' && (
          <AttemptReview {...attemptReviewDemo} />
        )}
      </div>
    </div>
  );
}
