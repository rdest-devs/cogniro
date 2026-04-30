'use client';

import ExportedImage from 'next-image-export-optimizer';
import { useState } from 'react';

import { loginAdmin, setStoredAdminToken } from '@/lib/admin-auth/client';

interface AdminLoginProps {
  onSuccess: () => void;
}

export default function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const result = await loginAdmin(password);
      setStoredAdminToken(result.access_token);
      onSuccess();
    } catch {
      setError('Nieprawidłowe hasło.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--page-bg)] px-6">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-8 shadow-sm">
        <div className="mb-8 flex justify-center">
          <ExportedImage
            src="/images/wi-new-logo.png"
            alt="WI"
            width={160}
            height={46}
            className="h-[46px] w-auto object-contain"
          />
        </div>
        <h1 className="mb-1 text-center text-xl font-bold text-[var(--text-dark)]">
          Panel administratora
        </h1>
        <p className="mb-6 text-center text-sm text-[var(--text-muted)]">
          Zaloguj się hasłem
        </p>
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex flex-col gap-4"
        >
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--text-dark)]">
            Hasło
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-[var(--text-dark)] outline-none focus:border-[var(--primary-blue)]"
              disabled={submitting}
            />
          </label>
          {error && (
            <p className="text-sm font-medium text-[var(--wrong-fg)]">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting || !password.trim()}
            className="flex cursor-pointer items-center justify-center rounded-2xl bg-[var(--orange)] px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? 'Logowanie…' : 'Zaloguj'}
          </button>
        </form>
      </div>
    </div>
  );
}
