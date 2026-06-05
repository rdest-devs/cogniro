'use client';

import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  CalendarPlus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';

interface Props {
  value: Date | null;
  onChange: (date: Date | null) => void;
  minDate?: Date;
  label: string;
  optional?: boolean;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function DateTimePicker({
  value,
  onChange,
  minDate,
  label,
  optional = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [hour, setHour] = useState(value ? value.getHours() : 12);
  const [minute, setMinute] = useState(
    value ? Math.min(Math.round(value.getMinutes() / 5) * 5, 55) : 0,
  );
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(
    value ?? undefined,
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const hourRef = useRef<HTMLDivElement>(null);
  const minRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => {
      hourRef.current
        ?.querySelector('[data-sel]')
        ?.scrollIntoView({ block: 'center' });
      minRef.current
        ?.querySelector('[data-sel]')
        ?.scrollIntoView({ block: 'center' });
    }, 0);
  }, [open]);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  const handleOpen = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setOpenUp(window.innerHeight - rect.bottom < 320);
    }
    if (!value) {
      const now = new Date();
      const h = now.getHours();
      const m = Math.min(Math.round(now.getMinutes() / 5) * 5, 55);
      setHour(h);
      setMinute(m);
      setSelectedDay(now);
    }
    setOpen((o) => !o);
  };

  const emit = (day: Date | undefined, h: number, m: number) => {
    if (!day) {
      onChange(null);
      return;
    }
    const d = new Date(day);
    d.setHours(h, m, 0, 0);
    onChange(d);
  };

  const handleDaySelect = (day: Date | undefined) => {
    setSelectedDay(day);
  };
  const handleHour = (h: number) => {
    setHour(h);
  };
  const handleMinute = (m: number) => {
    setMinute(m);
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDay(undefined);
    onChange(null);
    setOpen(false);
  };

  const colCls =
    'h-40 w-10 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--page-bg)] py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden';
  const colBtn = (active: boolean) =>
    `block w-full rounded-md px-1 py-1 text-center text-xs font-medium transition-colors ${active ? 'bg-[var(--primary-blue)] text-white' : 'text-[var(--text-dark)] hover:bg-[var(--selected-bg)]'}`;

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <p className="mb-1 text-sm font-medium text-[var(--text-dark)]">
          {label}
        </p>
      )}

      {/* Trigger */}
      {optional && !value ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={handleOpen}
          className="flex w-full items-center gap-2 rounded-xl border border-dashed border-[var(--border)] px-3 py-2 text-sm text-[var(--text-muted)] transition-colors hover:border-[var(--primary-blue)] hover:text-[var(--primary-blue)]"
        >
          <CalendarPlus size={15} />
          Dodaj datę zakończenia
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <button
            ref={triggerRef}
            type="button"
            onClick={handleOpen}
            className="flex flex-1 items-center justify-between rounded-xl border border-[var(--primary-blue)] bg-[var(--card-bg)] px-3 py-2 text-left text-sm text-[var(--text-dark)] focus:ring-2 focus:ring-[var(--primary-blue)] focus:outline-none"
          >
            <span>
              {value
                ? format(value, 'd MMM yyyy, HH:mm', { locale: pl })
                : 'Wybierz datę i godzinę'}
            </span>
            <ChevronDown
              size={14}
              className="shrink-0 text-[var(--text-muted)]"
            />
          </button>
          {optional && value && (
            <button
              type="button"
              onClick={clear}
              aria-label="Usuń datę"
              className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-muted)] transition-colors hover:border-[var(--wrong-fg)] hover:text-[var(--wrong-fg)]"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Popover */}
      {open && (
        <div
          className={`absolute left-0 z-50 flex rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xl ${openUp ? 'bottom-full mb-1' : 'top-full mt-1'}`}
        >
          {/* ── Calendar ── */}
          <div className="p-2">
            <DayPicker
              mode="single"
              selected={selectedDay}
              onSelect={handleDaySelect}
              disabled={minDate ? { before: minDate } : undefined}
              locale={pl}
              classNames={{
                root: 'select-none',
                months: '',
                month: '',
                month_caption: 'flex justify-between items-center px-0.5 mb-1',
                caption_label:
                  'text-xs font-semibold text-[var(--text-dark)] capitalize',
                nav: 'flex gap-0.5',
                button_previous:
                  'p-0.5 rounded border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--page-bg)]',
                button_next:
                  'p-0.5 rounded border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--page-bg)]',
                month_grid: 'border-collapse',
                weekdays: '',
                weekday:
                  'text-[10px] font-medium text-[var(--text-muted)] w-7 h-6 text-center',
                week: '',
                day: 'p-0 text-center',
                day_button:
                  'mx-auto w-7 h-7 rounded-lg text-xs font-medium text-[var(--text-dark)] hover:bg-[var(--selected-bg)] transition-colors focus:outline-none',
                selected:
                  '[&>button]:!bg-[var(--primary-blue)] [&>button]:text-white',
                today:
                  '[&>button]:font-bold [&>button]:text-[var(--primary-blue)]',
                outside: '[&>button]:opacity-30',
                disabled: '[&>button]:opacity-20 [&>button]:cursor-not-allowed',
              }}
              components={{
                Chevron: ({ orientation }) =>
                  orientation === 'left' ? (
                    <ChevronLeft size={12} />
                  ) : (
                    <ChevronRight size={12} />
                  ),
              }}
            />
          </div>

          {/* ── Divider ── */}
          <div className="w-px self-stretch bg-[var(--border)]" />

          {/* ── Time columns ── */}
          <div className="flex flex-col justify-between p-2">
            <p className="mb-1.5 text-center text-[10px] font-semibold tracking-wide text-[var(--text-muted)] uppercase">
              Godzina
            </p>
            <div className="flex items-center gap-0.5">
              <div ref={hourRef} className={colCls}>
                {HOURS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    data-sel={h === hour || undefined}
                    onClick={() => handleHour(h)}
                    className={colBtn(h === hour)}
                  >
                    {pad(h)}
                  </button>
                ))}
              </div>
              <span className="text-sm font-bold text-[var(--text-muted)]">
                :
              </span>
              <div ref={minRef} className={colCls}>
                {MINUTES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    data-sel={m === minute || undefined}
                    onClick={() => handleMinute(m)}
                    className={colBtn(m === minute)}
                  >
                    {pad(m)}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (selectedDay) emit(selectedDay, hour, minute);
                setOpen(false);
              }}
              className="mt-2 w-full rounded-lg bg-[var(--primary-blue)] py-1 text-xs font-semibold text-white hover:opacity-90"
            >
              Gotowe
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
