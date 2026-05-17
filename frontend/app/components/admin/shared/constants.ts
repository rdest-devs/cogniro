import type { LucideIcon } from 'lucide-react';
import { BarChart3, FileText, Settings } from 'lucide-react';

export type SidebarMenuItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Pozycja widoczna, ale bez nawigacji (np. w przygotowaniu). */
  disabled?: boolean;
};

export const menuItems: SidebarMenuItem[] = [
  { id: 'quizy', label: 'Moje Quizy', icon: FileText },
  { id: 'statystyki', label: 'Statystyki', icon: BarChart3 },
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
