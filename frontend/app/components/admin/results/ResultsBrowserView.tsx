'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import AdminLayout from '@/app/components/admin/layout/AdminLayout';
import { deleteDay, listDates } from '@/lib/results/client';

type Props = {
  adminBase: string;
  quizFilter: string | null;
  onBack: () => void;
  onCreateQuiz?: () => void;
  onLogout?: () => void;
};

export function ResultsBrowserView({
  adminBase,
  quizFilter,
  onBack,
  onCreateQuiz,
  onLogout,
}: Props) {
  const [dates, setDates] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const next = await listDates();
        if (!cancelled) {
          setDates(next);
          setErr(null);
        }
      } catch (e) {
        if (!cancelled) {
          setErr(String(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const qs = (extra: Record<string, string>) => {
    const p = new URLSearchParams({ view: 'results', ...extra });
    if (quizFilter) {
      p.set('quizFilter', quizFilter);
    }
    return p.toString();
  };

  return (
    <AdminLayout onCreateQuiz={onCreateQuiz} onLogout={onLogout}>
      <div className="mb-4 flex gap-3">
        <button
          type="button"
          className="rounded border px-3 py-1"
          onClick={onBack}
        >
          Powrót
        </button>
        <button
          type="button"
          className="rounded border px-3 py-1"
          onClick={() => {
            void (async () => {
              try {
                const next = await listDates();
                setDates(next);
                setErr(null);
              } catch (e) {
                setErr(String(e));
              }
            })();
          }}
        >
          Odśwież
        </button>
      </div>
      <section>
        <h2 className="text-xl font-semibold">Wyniki</h2>
        {err && <p className="text-sm text-red-700">{err}</p>}
        <ul className="mt-4 space-y-2">
          {dates.map((d) => (
            <li key={d} className="flex items-center gap-2">
              <Link
                className="text-[var(--primary-blue)] underline"
                href={`${adminBase}?${qs({ date: d })}`}
              >
                {d}
              </Link>
              <button
                type="button"
                className="text-sm text-red-700 underline"
                onClick={async () => {
                  if (confirm(`Usunąć cały dzień ${d}?`)) {
                    await deleteDay(d);
                    setDates((prev) => prev.filter((x) => x !== d));
                  }
                }}
              >
                Usuń dzień
              </button>
            </li>
          ))}
        </ul>
      </section>
    </AdminLayout>
  );
}
