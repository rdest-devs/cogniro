'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import AdminLayout from '@/app/components/admin/layout/AdminLayout';
import { deleteResult, listDay } from '@/lib/results/client';

type FileRow = {
  filename: string;
  quiz_id: string;
  quiz_title: string;
  session_started_at: string;
  session_stopped_at: string;
  score_count: number;
};

type Props = {
  adminBase: string;
  date: string;
  quizFilter: string | null;
  menuActiveItem?: string;
  onMenuNavigate?: (menuItemId: string) => void;
  onBack: () => void;
  onCreateQuiz?: () => void;
  onLogout?: () => void;
};

export function ResultsDayView({
  adminBase,
  date,
  quizFilter,
  menuActiveItem = 'statystyki',
  onMenuNavigate,
  onBack,
  onCreateQuiz,
  onLogout,
}: Props) {
  const [files, setFiles] = useState<FileRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await listDay(date);
        if (!cancelled) {
          setFiles(
            quizFilter ? rows.filter((f) => f.quiz_id === quizFilter) : rows,
          );
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
  }, [date, quizFilter]);

  const qs = (extra: Record<string, string>) => {
    const p = new URLSearchParams({ view: 'results', ...extra });
    if (quizFilter) {
      p.set('quizFilter', quizFilter);
    }
    return p.toString();
  };

  return (
    <AdminLayout
      activeItem={menuActiveItem}
      logoHref={adminBase}
      onMenuNavigate={onMenuNavigate}
      onCreateQuiz={onCreateQuiz}
      onLogout={onLogout}
    >
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
                const rows = await listDay(date);
                setFiles(
                  quizFilter
                    ? rows.filter((f) => f.quiz_id === quizFilter)
                    : rows,
                );
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
        <h2 className="text-xl font-semibold">Wyniki — {date}</h2>
        {err && <p className="text-sm text-red-700">{err}</p>}
        <ul className="mt-4 space-y-2">
          {files.map((f) => (
            <li
              key={f.filename}
              className="flex flex-wrap items-center gap-2 text-sm"
            >
              <Link
                className="text-[var(--primary-blue)] underline"
                href={`${adminBase}?${qs({ date, file: f.filename })}`}
              >
                {f.filename}
              </Link>
              <span className="text-zinc-500">
                {f.quiz_title} · {f.score_count} wyników
              </span>
              <button
                type="button"
                className="text-red-700 underline"
                onClick={async () => {
                  if (confirm(`Usunąć plik ${f.filename}?`)) {
                    await deleteResult(date, f.filename);
                    setFiles((prev) =>
                      prev.filter((x) => x.filename !== f.filename),
                    );
                  }
                }}
              >
                Usuń
              </button>
            </li>
          ))}
        </ul>
      </section>
    </AdminLayout>
  );
}
