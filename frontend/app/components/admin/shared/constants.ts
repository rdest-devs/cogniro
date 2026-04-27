import { BarChart3, FileText, Search, Settings } from 'lucide-react';

export const menuItems = [
  { id: 'quizy', label: 'Moje Quizy', icon: FileText },
  { id: 'statystyki', label: 'Statystyki', icon: BarChart3 },
  { id: 'przeglądaj', label: 'Przeglądaj Wszystkie', icon: Search },
  { id: 'ustawienia', label: 'Ustawienia', icon: Settings },
];

export const statusColors: Record<string, string> = {
  Aktywny: 'bg-[var(--active)] text-white',
  Stare: 'bg-[var(--orange)] text-white',
  Zakończony: 'bg-[var(--wrong-fg)] text-white',
  active: 'bg-[var(--active)] text-white',
  completed: 'bg-[var(--wrong-fg)] text-white',
};

export const typeColors: Record<string, string> = {
  Jednokrotny: 'bg-[var(--active)] text-white',
  Wielokrotny: 'bg-[var(--primary-blue)] text-white',
};
