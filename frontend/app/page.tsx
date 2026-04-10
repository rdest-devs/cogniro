'use client';

import { useState } from 'react';

import { AdminPanel, QuizDetail, QuizEditor } from './components/admin';
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
  'Admin Panel',
  'Quiz Detail',
  'Quiz Editor',
] as const;

type Screen = (typeof screens)[number];

export default function Home() {
  const [current, setCurrent] = useState<Screen>('Quiz Start');

  const isAdmin = ['Admin Panel', 'Quiz Detail', 'Quiz Editor'].includes(
    current,
  );

  return (
    <div className="flex h-screen flex-col">
      {/* Navigation */}
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
      </nav>

      {/* Screen */}
      <div
        className={`flex flex-1 overflow-auto bg-[var(--page-bg)] ${isAdmin ? '' : 'items-center justify-center'}`}
      >
        {current === 'Quiz Start' && <QuizStart />}
        {current === 'Single Choice' && <SingleChoice />}
        {current === 'Multiple Choice' && <MultipleChoice />}
        {current === 'Image Question' && <ImageQuestion />}
        {current === 'Image Answers' && <ImageAnswers />}
        {current === 'Ordering' && <Ordering />}
        {current === 'Slider' && <SliderQuestion />}
        {current === 'Range Slider' && <RangeSlider />}
        {current === 'Quiz Results' && <QuizResults />}
        {current === 'Attempt Review' && <AttemptReview />}
        {current === 'Admin Panel' && <AdminPanel />}
        {current === 'Quiz Detail' && <QuizDetail />}
        {current === 'Quiz Editor' && <QuizEditor />}
      </div>
    </div>
  );
}
