'use client';

import { useSearchParams } from 'next/navigation';
import ExportedImage from 'next-image-export-optimizer';
import { Suspense } from 'react';

import { QrCode } from '@/app/components/admin/dashboard/QrCode';

import { resolvePresenterSession } from './presenter-session';

function PresenterFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white p-6">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-6 text-sm text-[var(--text-muted)]">
        Ładowanie…
      </div>
    </main>
  );
}

function PresenterScreen() {
  const params = useSearchParams();
  const session = resolvePresenterSession(
    params.get('pin'),
    params.get('href'),
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-white p-6">
      {!session ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-6 text-sm text-[var(--text-muted)]">
          Brak poprawnych danych do wyświetlenia.
        </div>
      ) : (
        <div className="flex w-full max-w-3xl flex-col items-center gap-8 rounded-3xl border border-[var(--border)] bg-[var(--card-bg)] p-8">
          <ExportedImage
            src="/images/wi-new-logo.png"
            alt="Logo Wydziału Informatyki"
            width={340}
            height={96}
            className="h-auto w-full max-w-[320px] object-contain"
            priority
          />
          <QrCode value={session.playHref} size={360} />
          <div className="text-center font-mono text-5xl tracking-[0.3em] text-[var(--text-dark)]">
            {session.pin}
          </div>
          <a
            href={session.playHref}
            target="_blank"
            rel="noreferrer"
            className="text-center text-xl break-all text-black underline"
          >
            {session.playHref}
          </a>
        </div>
      )}
    </main>
  );
}

export default function PresenterPage() {
  return (
    <Suspense fallback={<PresenterFallback />}>
      <PresenterScreen />
    </Suspense>
  );
}
