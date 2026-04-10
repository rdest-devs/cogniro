'use client';

import { cn } from '@/lib/cn';

import { menuItems } from './constants';

interface SidebarProps {
  activeItem?: string;
  onNavigate?: (item: string) => void;
}

export default function Sidebar({
  activeItem = 'quizy',
  onNavigate,
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
          return (
            <button
              key={item.id}
              onClick={() => onNavigate?.(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex w-full cursor-pointer items-center gap-3 rounded-xl py-3 pr-5 pl-6 transition-colors',
                isActive
                  ? 'border-l-4 border-l-[var(--orange)] bg-[var(--sidebar-active)]'
                  : 'border-l-4 border-l-transparent',
              )}
            >
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
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
