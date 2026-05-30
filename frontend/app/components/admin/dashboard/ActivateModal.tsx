'use client';

import { useState } from 'react';

import type { ActivateBody } from '@/lib/sessions/client';

type Mode = 'now' | 'scheduled';

interface Props {
  onConfirm: (body: ActivateBody) => void;
  onCancel: () => void;
}

function localDatetimeToIso(date: string, time: string): string | null {
  if (!date || !time) return null;
  const dt = new Date(`${date}T${time}`);
  if (isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

function nowDatetime(): { date: string; time: string } {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return { date, time: `${h}:${m}` };
}

export function ActivateModal({ onConfirm, onCancel }: Props) {
  const [mode, setMode] = useState<Mode>('now');

  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');

  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [schedEndDate, setSchedEndDate] = useState('');
  const [schedEndTime, setSchedEndTime] = useState('');

  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    setError(null);

    if (mode === 'now') {
      const scheduleEnd = endDate
        ? localDatetimeToIso(endDate, endTime || '23:59')
        : null;
      if (endDate && !scheduleEnd) {
        setError('Nieprawidłowa data lub godzina zakończenia.');
        return;
      }
      onConfirm({
        schedule_start: null,
        schedule_end: scheduleEnd,
        manual_status: 'open',
      });
      return;
    }

    const scheduleStart = localDatetimeToIso(startDate, startTime);
    if (!scheduleStart) {
      setError('Podaj datę i godzinę otwarcia.');
      return;
    }
    if (new Date(scheduleStart) <= new Date()) {
      setError('Data otwarcia musi być w przyszłości.');
      return;
    }
    const scheduleEnd = schedEndDate
      ? localDatetimeToIso(schedEndDate, schedEndTime || '23:59')
      : null;
    if (schedEndDate && !scheduleEnd) {
      setError('Nieprawidłowa data lub godzina zakończenia.');
      return;
    }
    if (scheduleEnd && scheduleStart >= scheduleEnd) {
      setError('Data zakończenia musi być późniejsza niż data otwarcia.');
      return;
    }
    onConfirm({
      schedule_start: scheduleStart,
      schedule_end: scheduleEnd,
      manual_status: null,
    });
  };

  const today = nowDatetime().date;

  const inputClass =
    'rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--text-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)]';
  const modeButtonBase =
    'flex-1 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors';
  const modeActive =
    'border-[var(--primary-blue)] bg-[var(--primary-blue)] text-white';
  const modeInactive =
    'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--primary-blue)] hover:text-[var(--primary-blue)]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-[var(--text-dark)]">
          Uruchamianie quizu
        </h2>

        <p className="mb-3 text-sm text-[var(--text-muted)]">
          Kiedy quiz ma być dostępny dla uczestników?
        </p>

        <div className="mb-5 flex gap-2">
          <button
            type="button"
            className={`${modeButtonBase} ${mode === 'now' ? modeActive : modeInactive}`}
            onClick={() => setMode('now')}
          >
            Teraz
          </button>
          <button
            type="button"
            className={`${modeButtonBase} ${mode === 'scheduled' ? modeActive : modeInactive}`}
            onClick={() => setMode('scheduled')}
          >
            Zaplanuj
          </button>
        </div>

        {mode === 'now' && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-[var(--text-dark)]">
              Zamknij dostęp o (opcjonalnie):
            </p>
            <div className="flex gap-2">
              <input
                type="date"
                min={today}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`${inputClass} flex-1`}
              />
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={`${inputClass} w-28`}
              />
            </div>
          </div>
        )}

        {mode === 'scheduled' && (
          <div className="space-y-3">
            <div>
              <p className="mb-1 text-sm font-medium text-[var(--text-dark)]">
                Dostępny od:
              </p>
              <div className="flex gap-2">
                <input
                  type="date"
                  min={today}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={`${inputClass} flex-1`}
                />
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={`${inputClass} w-28`}
                />
              </div>
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-[var(--text-dark)]">
                Dostępny do (opcjonalnie):
              </p>
              <div className="flex gap-2">
                <input
                  type="date"
                  min={today}
                  value={schedEndDate}
                  onChange={(e) => setSchedEndDate(e.target.value)}
                  className={`${inputClass} flex-1`}
                />
                <input
                  type="time"
                  value={schedEndTime}
                  onChange={(e) => setSchedEndTime(e.target.value)}
                  className={`${inputClass} w-28`}
                />
              </div>
            </div>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-xl border border-[var(--wrong-fg)] bg-[var(--wrong-bg)] px-3 py-2 text-sm text-[var(--wrong-fg)]"
          >
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-muted)] hover:bg-[var(--page-bg)]"
          >
            Anuluj
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-xl bg-[var(--primary-blue)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Uruchom quiz
          </button>
        </div>
      </div>
    </div>
  );
}
