'use client';

import { ChevronDown, LogOut } from 'lucide-react';
import ExportedImage from 'next-image-export-optimizer';
import { useEffect, useRef, useState } from 'react';

interface TopBarProps {
  userName?: string;
  userInitials?: string;
  logoUrl?: string;
  onLogout?: () => void;
}

export default function TopBar({
  userName = 'Admin',
  userInitials = 'AB',
  logoUrl = '/images/wi-new-logo.png',
  onLogout,
}: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-[var(--border)] bg-[var(--card-bg)] px-8">
      <ExportedImage
        src={logoUrl}
        alt="Logo"
        width={120}
        height={34}
        className="h-[34px] w-auto object-contain"
      />

      <div ref={menuRef} className="relative">
        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-black/5"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary-blue)]">
            <span className="text-xs font-semibold text-white">
              {userInitials}
            </span>
          </div>
          <span className="text-sm font-medium text-[var(--text-dark)]">
            {userName}
          </span>
          <ChevronDown
            size={14}
            className={`text-[var(--text-muted)] transition-transform ${menuOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {menuOpen && (
          <div className="absolute top-full right-0 mt-1 w-48 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card-bg)] shadow-lg">
            <button
              onClick={() => {
                setMenuOpen(false);
                onLogout?.();
              }}
              className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-3 text-sm font-medium text-[var(--text-dark)] transition-colors hover:bg-black/5"
            >
              <LogOut size={16} className="text-[var(--text-muted)]" />
              Wyloguj się
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
