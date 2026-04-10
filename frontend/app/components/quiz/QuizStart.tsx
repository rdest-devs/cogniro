'use client';

import ExportedImage from 'next-image-export-optimizer';
import { useState } from 'react';

interface QuizStartProps {
  title: string;
  description: string;
  logoUrl: string;
  onStart?: (name: string) => void;
}

export default function QuizStart({
  title,
  description,
  logoUrl,
  onStart,
}: QuizStartProps) {
  const [name, setName] = useState('');

  return (
    <div className="flex min-h-full w-full max-w-[390px] flex-col bg-[var(--page-bg)]">
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 pb-10">
        {/* Logo */}
        <ExportedImage
          src={logoUrl}
          alt="Logo"
          width={200}
          height={66}
          className="h-[66px] w-auto object-contain"
        />

        {/* Quiz Info Card */}
        <div className="flex w-full flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6">
          <h1 className="text-center text-2xl font-bold text-[var(--text-dark)]">
            {title}
          </h1>
          <p className="text-center text-sm leading-[1.5] text-[var(--text-muted)]">
            {description}
          </p>
        </div>

        {/* Name Input */}
        <div className="flex w-full flex-col gap-1.5">
          <label
            htmlFor="quiz-name"
            className="text-sm font-medium text-[var(--text-dark)]"
          >
            Twoje imię
          </label>
          <input
            id="quiz-name"
            type="text"
            placeholder="Wpisz swoje imię..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] px-4 text-sm text-[var(--text-dark)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--primary-blue)]"
          />
        </div>

        {/* Start Button */}
        <button
          onClick={() => onStart?.(name)}
          className="w-full cursor-pointer rounded-2xl bg-[var(--orange)] px-6 py-4 text-center text-base font-bold text-white transition-opacity hover:opacity-90"
        >
          Rozpocznij przygodę
        </button>
      </div>
    </div>
  );
}
