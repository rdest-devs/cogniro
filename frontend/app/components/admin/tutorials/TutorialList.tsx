import { GraduationCap } from 'lucide-react';

import type { TutorialGroup } from './tutorialsData';

interface TutorialListProps {
  groups: TutorialGroup[];
}

/** Presentational list of grouped tutorials (no layout/routing, easy to render and test). */
export function TutorialList({ groups }: TutorialListProps) {
  return (
    <div className="space-y-8">
      <header className="flex items-start gap-3">
        <GraduationCap
          size={24}
          className="mt-0.5 shrink-0 text-[var(--primary-blue)]"
          aria-hidden
        />
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-dark)]">
            Samouczki
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Krótkie instrukcje krok po kroku dla najważniejszych akcji w panelu.
          </p>
        </div>
      </header>

      {groups.map((group) => (
        <section key={group.id} className="space-y-3">
          <h2 className="text-lg font-semibold text-[var(--text-dark)]">
            {group.title}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {group.tutorials.map((tutorial) => (
              <article
                key={tutorial.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-5"
              >
                <h3 className="text-base font-semibold text-[var(--text-dark)]">
                  {tutorial.title}
                </h3>
                <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-[var(--text-muted)]">
                  {tutorial.steps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
