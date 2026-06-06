'use client';

import { useState } from 'react';

import { changeAdminPassword } from '@/lib/admin-auth/client';
import { getChangePasswordErrorMessage } from '@/lib/admin-auth/error-message';

const MIN_PASSWORD_LENGTH = 8;
// bcrypt only consumes the first 72 bytes; reject longer inputs client-side too.
const MAX_PASSWORD_BYTES = 72;

const inputClass =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2.5 text-sm text-[var(--text-dark)] outline-none focus:border-[var(--primary-blue)]';

type Status = 'idle' | 'submitting' | 'success';

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(
        `Nowe hasło musi mieć co najmniej ${MIN_PASSWORD_LENGTH} znaków.`,
      );
      return;
    }
    if (new TextEncoder().encode(newPassword).length > MAX_PASSWORD_BYTES) {
      setError('Nowe hasło jest zbyt długie (maksymalnie 72 bajty).');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Nowe hasło i potwierdzenie nie są takie same.');
      return;
    }

    setStatus('submitting');
    try {
      await changeAdminPassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setStatus('success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setStatus('idle');
      setError(getChangePasswordErrorMessage(err));
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-md space-y-4 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-5"
    >
      <div className="space-y-1.5">
        <label
          htmlFor="current-password"
          className="block text-sm font-medium text-[var(--text-dark)]"
        >
          Obecne hasło
        </label>
        <input
          id="current-password"
          type="password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="new-password"
          className="block text-sm font-medium text-[var(--text-dark)]"
        >
          Nowe hasło
        </label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="confirm-password"
          className="block text-sm font-medium text-[var(--text-dark)]"
        >
          Powtórz nowe hasło
        </label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={inputClass}
        />
      </div>

      {error ? (
        <p className="text-sm font-medium text-[var(--wrong-fg)]" role="alert">
          {error}
        </p>
      ) : null}
      {status === 'success' ? (
        <p className="text-sm font-medium text-[var(--active)]" role="status">
          Hasło zostało zmienione.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-[var(--primary-blue)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === 'submitting' ? 'Zapisywanie…' : 'Zmień hasło'}
      </button>
    </form>
  );
}
