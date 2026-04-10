'use client';

import { Plus } from 'lucide-react';
import ExportedImage from 'next-image-export-optimizer';

interface TopBarProps {
  userName?: string;
  userInitials?: string;
  logoUrl?: string;
  onCreateQuiz?: () => void;
}

export default function TopBar({
  userName = 'Admin',
  userInitials = 'AB',
  logoUrl = '/images/wi-new-logo.png',
  onCreateQuiz,
}: TopBarProps) {
  return (
    <div className="flex h-16 w-full items-center justify-between border-b border-[var(--border)] bg-[var(--card-bg)] px-8">
      <ExportedImage
        src={logoUrl}
        alt="Logo"
        width={120}
        height={34}
        className="h-[34px] w-auto object-contain"
      />

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary-blue)]">
            <span className="text-xs font-semibold text-white">
              {userInitials}
            </span>
          </div>
          <span className="text-sm font-medium text-[var(--text-dark)]">
            {userName}
          </span>
        </div>

        <button
          onClick={onCreateQuiz}
          className="flex cursor-pointer items-center gap-2 rounded-2xl bg-[var(--orange)] px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
        >
          <Plus size={16} />
          Stwórz nowy quiz
        </button>
      </div>
    </div>
  );
}
