import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  BookOpen,
  FileText,
  GraduationCap,
  Settings,
} from 'lucide-react';

export type SidebarMenuItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Visible item with no navigation (e.g. coming soon). */
  disabled?: boolean;
};

export const menuItems: SidebarMenuItem[] = [
  { id: 'quizy', label: 'Moje Quizy', icon: FileText },
  { id: 'details', label: 'Szczegóły quizów', icon: BookOpen },
  { id: 'statystyki', label: 'Statystyki', icon: BarChart3 },
  { id: 'samouczki', label: 'Samouczki', icon: GraduationCap },
  { id: 'ustawienia', label: 'Ustawienia', icon: Settings, disabled: true },
];

export const statusColors: Record<string, string> = {
  Aktywny: 'bg-[var(--active)] text-white',
  Stare: 'bg-[var(--orange)] text-white',
  Zakończony: 'bg-[var(--wrong-fg)] text-white',
  Nieaktywny: 'bg-[var(--border)] text-[var(--text-dark)]',
  active: 'bg-[var(--active)] text-white',
  completed: 'bg-[var(--wrong-fg)] text-white',
  idle: 'bg-[var(--border)] text-[var(--text-dark)]',
  running: 'bg-[var(--active)] text-white',
};

export const typeColors: Record<string, string> = {
  Jednokrotny: 'bg-[var(--active)] text-white',
  Wielokrotny: 'bg-[var(--primary-blue)] text-white',
  'Prawda / fałsz': 'bg-[var(--orange)] text-white',
  Suwak: 'bg-[var(--wrong-fg)] text-white',
};

/** Shared admin toolbar button styles (AdminPanel, QuizDetail). */
export const adminToolbarButtonClass =
  'inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-dark)] transition-colors hover:bg-[var(--page-bg)] disabled:cursor-not-allowed disabled:opacity-50';

export const adminPrimaryOutlineButtonClass =
  'inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[var(--primary-blue)] px-3 py-2 text-xs font-semibold text-[var(--primary-blue)] transition-colors hover:bg-[var(--primary-blue)] hover:text-white';

export const adminDangerOutlineButtonClass =
  'inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[var(--wrong-fg)] px-3 py-2 text-xs font-semibold text-[var(--wrong-fg)] transition-colors hover:bg-[var(--wrong-fg)] hover:text-white disabled:cursor-not-allowed disabled:opacity-50';

/** Table with blue header row (e.g. live session + QR, demo results). */
export const adminBlueHeadTableClass =
  'w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)]';

export const adminBlueHeadTableTheadClass = 'bg-[var(--primary-blue)]';

export const adminBlueHeadTableThClass =
  'px-4 py-3 text-left text-sm font-semibold text-white';

export const adminBlueHeadTableTdClass =
  'px-4 py-3 text-sm text-[var(--text-dark)]';

export const adminBlueHeadTableTdMutedClass =
  'px-4 py-3 text-sm text-[var(--text-muted)]';
