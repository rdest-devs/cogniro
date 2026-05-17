'use client';

import Link from 'next/link';

import { cn } from '@/lib/cn';

import { menuItems } from '../shared/constants';

interface SidebarProps {
  activeItem?: string;
  onNavigate?: (item: string) => void;
  /** Adres listy „Moje Quizy” (domyślnie jak logo: `/admin/`). */
  quizListHref?: string;
}

export default function Sidebar({
  activeItem = 'quizy',
  onNavigate,
  quizListHref = '/admin/',
}: SidebarProps) {
  return (
    <aside className="flex h-full w-[260px] flex-col bg-[var(--sidebar-bg)]">
      <div className="h-px w-full bg-white/10" />
      <nav className="flex flex-1 flex-col gap-0.5 p-4 px-2">
        <div className="px-4 pt-1 pb-2">
          <span className="text-[11px] font-semibold tracking-[1.2px] text-[var(--sidebar-text-muted)]">
            MENU
          </span>
        </div>
        {menuItems.map((item) => {
          const isActive = activeItem === item.id;
          const Icon = item.icon;
          const rowClass = cn(
            'flex w-full cursor-pointer items-center gap-3 rounded-xl py-3 pr-5 pl-6 text-left no-underline ring-offset-2 ring-offset-[var(--sidebar-bg)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]',
            isActive
              ? 'border-l-4 border-l-[var(--orange)] bg-[var(--sidebar-active)]'
              : 'border-l-4 border-l-transparent',
          );

          const inner = (
            <>
              <Icon
                size={20}
                className={cn(
                  isActive
                    ? 'text-[var(--orange)]'
                    : 'text-[var(--sidebar-text-muted)]',
                )}
              />
              <span
                className={cn(
                  'text-sm',
                  isActive
                    ? 'font-semibold text-white'
                    : 'font-medium text-[var(--sidebar-text)]',
                )}
              >
                {item.label}
              </span>
            </>
          );

          if (item.id === 'quizy' && quizListHref) {
            return (
              <Link
                key={item.id}
                href={quizListHref}
                aria-current={isActive ? 'page' : undefined}
                className={rowClass}
              >
                {inner}
              </Link>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate?.(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={rowClass}
            >
              {inner}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
