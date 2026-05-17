'use client';

import { PLAY_USER_SHELL_CLASS } from '@/app/play/playShellClasses';

export function PlayExperienceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh w-full bg-[var(--page-bg)]">
      <div className={PLAY_USER_SHELL_CLASS}>{children}</div>
    </div>
  );
}
