'use client';

import ExportedImage from 'next-image-export-optimizer';
import { useState } from 'react';

import { APP_LOGO_URL } from '@/lib/branding';

type Props = { onSubmit: (code: string) => void };

export function EnterCode({ onSubmit }: Props) {
  const [code, setCode] = useState('');

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto bg-[var(--page-bg)]">
      <form
        className="my-auto flex w-full flex-col items-center gap-8 px-6 py-10"
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = code.trim().toUpperCase();
          if (trimmed) {
            onSubmit(trimmed);
          }
        }}
      >
        <ExportedImage
          src={APP_LOGO_URL}
          alt="Logo"
          width={200}
          height={66}
          className="h-[66px] w-auto object-contain"
        />

        <div className="flex w-full flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6">
          <h1 className="text-center text-2xl font-bold text-[var(--text-dark)]">
            Podaj kod quizu
          </h1>
          <p className="text-center text-sm leading-[1.5] text-[var(--text-muted)]">
            Wpisz kod z ekranu prowadzącego (np. z sali lub z linku), aby
            dołączyć do sesji.
          </p>
        </div>

        <div className="flex w-full flex-col gap-1.5">
          <label
            htmlFor="play-quiz-code"
            className="text-sm font-medium text-[var(--text-dark)]"
          >
            Kod sesji
          </label>
          <input
            id="play-quiz-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={8}
            autoComplete="one-time-code"
            inputMode="text"
            placeholder="np. AB12CD"
            className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] px-4 text-center text-lg font-semibold tracking-widest text-[var(--text-dark)] uppercase outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--primary-blue)]"
            autoFocus
          />
        </div>

        <button
          type="submit"
          disabled={!code.trim()}
          className="w-full cursor-pointer rounded-2xl bg-[var(--orange)] px-6 py-4 text-center text-base font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Dalej
        </button>
      </form>
    </div>
  );
}
