'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import AdminLayout from '@/app/components/admin/layout/AdminLayout';
import { deleteResult, readResult } from '@/lib/results/client';

type Props = {
  adminBase: string;
  date: string;
  file: string;
  quizFilter: string | null;
  onBack: () => void;
  onCreateQuiz?: () => void;
  onLogout?: () => void;
};

export function ResultDetailView({
  adminBase,
  date,
  file,
  quizFilter,
  onBack,
  onCreateQuiz,
  onLogout,
}: Props) {
  const [payload, setPayload] = useState<unknown>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await readResult(date, file);
        if (!cancelled) {
          setPayload(data);
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
  }, [date, file]);

  const qs = () => {
    const p = new URLSearchParams({ view: 'results', date });
    if (quizFilter) {
      p.set('quizFilter', quizFilter);
    }
    return p.toString();
  };

  return (
    <AdminLayout onCreateQuiz={onCreateQuiz} onLogout={onLogout}>
      <div className="mb-4 flex flex-wrap gap-3">
        <button
          type="button"
          className="rounded border px-3 py-1"
          onClick={onBack}
        >
          Powrót
        </button>
        <Link
          className="rounded border px-3 py-1"
          href={`${adminBase}?${qs()}`}
        >
          Lista plików dnia
        </Link>
        <button
          type="button"
          className="rounded border px-3 py-1"
          onClick={() => {
            void (async () => {
              try {
                const data = await readResult(date, file);
                setPayload(data);
                setErr(null);
              } catch (e) {
                setErr(String(e));
              }
            })();
          }}
        >
          Odśwież
        </button>
        <button
          type="button"
          className="rounded bg-red-700 px-3 py-1 text-white"
          onClick={async () => {
            if (confirm(`Usunąć plik ${file}?`)) {
              await deleteResult(date, file);
              onBack();
            }
          }}
        >
          Usuń plik
        </button>
      </div>
      <section>
        <h2 className="text-xl font-semibold">
          {file}{' '}
          <span className="text-base font-normal text-zinc-500">({date})</span>
        </h2>
        {err && <p className="text-sm text-red-700">{err}</p>}
        {payload !== null && !err && (
          <pre className="mt-4 max-h-[60vh] overflow-auto rounded border bg-zinc-50 p-4 text-xs">
            {JSON.stringify(payload, null, 2)}
          </pre>
        )}
      </section>
    </AdminLayout>
  );
}
