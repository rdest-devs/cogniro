'use client';

import { useState } from 'react';

import { DateTimePicker } from '@/app/components/admin/dashboard/DateTimePicker';
import type { ActivateBody } from '@/lib/sessions/client';

type Mode = 'now' | 'scheduled';

interface Props {
  onConfirm: (body: ActivateBody) => void;
  onCancel: () => void;
  busy?: boolean;
}

export function ActivateModal({ onConfirm, onCancel, busy = false }: Props) {
  const [mode, setMode] = useState<Mode>('now');
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [schedEnd, setSchedEnd] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const minDate = new Date();

  const handleConfirm = () => {
    setError(null);
    const now = new Date();

    if (mode === 'now') {
      if (endDate && endDate <= now) {
        setError('Godzina zakończenia musi być w przyszłości.');
        return;
      }
      onConfirm({
        schedule_start: null,
        schedule_end: endDate ? endDate.toISOString() : null,
        manual_status: null,
      });
      return;
    }

    if (!startDate) {
      setError('Wybierz datę i godzinę otwarcia.');
      return;
    }
    if (startDate <= now) {
      setError('Data otwarcia musi być w przyszłości.');
      return;
    }
    if (schedEnd && startDate >= schedEnd) {
      setError('Data zakończenia musi być późniejsza niż data otwarcia.');
      return;
    }
    onConfirm({
      schedule_start: startDate.toISOString(),
      schedule_end: schedEnd ? schedEnd.toISOString() : null,
      manual_status: null,
    });
  };

  const modeButtonBase =
    'flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors';
  const modeActive =
    'border-[var(--primary-blue)] bg-[var(--primary-blue)] text-white';
  const modeInactive =
    'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--primary-blue)] hover:text-[var(--primary-blue)]';

  return (
    <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-lg">
      <h2 className="mb-3 text-base font-bold text-[var(--text-dark)]">
        Uruchamianie quizu
      </h2>

      <p className="mb-3 text-[13px] text-[var(--text-muted)]">
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
        <DateTimePicker
          label="Zamknij dostęp o (opcjonalnie):"
          value={endDate}
          onChange={setEndDate}
          minDate={minDate}
          optional
        />
      )}

      {mode === 'scheduled' && (
        <div className="space-y-3">
          <DateTimePicker
            label="Dostępny od:"
            value={startDate}
            onChange={setStartDate}
            minDate={minDate}
          />
          <DateTimePicker
            label="Dostępny do (opcjonalnie):"
            value={schedEnd}
            onChange={setSchedEnd}
            minDate={startDate ?? minDate}
            optional
          />
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-[var(--wrong-fg)] bg-[var(--wrong-bg)] px-3 py-2 text-[13px] text-[var(--wrong-fg)]"
        >
          {error}
        </p>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--page-bg)]"
        >
          Anuluj
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={busy}
          className="rounded-xl bg-[var(--primary-blue)] px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Uruchamianie…' : 'Uruchom quiz'}
        </button>
      </div>
    </div>
  );
}
