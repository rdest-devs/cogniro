'use client';

import type { KqfQuiz } from '@/lib/kqf';

export function PlayResult({ quiz, score }: { quiz: KqfQuiz; score: number }) {
  return (
    <section>
      <h2 className="text-2xl font-bold">Twój wynik: {score}</h2>
      <p className="text-zinc-500">
        Dziękujemy za udział w quizie „{quiz.front_matter.title}”.
      </p>
    </section>
  );
}
