'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  clearStoredAdminToken,
  getStoredAdminToken,
  logoutAdmin,
} from '@/lib/admin-auth/client';

import AdminDashboard from './AdminDashboard';
import AdminLogin from './AdminLogin';

export default function AdminPage() {
  const [hydrated, setHydrated] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    void Promise.resolve().then(() => {
      setAuthed(getStoredAdminToken() !== null);
      setHydrated(true);
    });
  }, []);

  const handleLoggedIn = useCallback(() => {
    setAuthed(true);
  }, []);

  const handleSessionInvalid = useCallback(() => {
    clearStoredAdminToken();
    setAuthed(false);
  }, []);

  const handleLogout = useCallback(() => {
    void logoutAdmin().finally(() => {
      setAuthed(false);
    });
  }, []);

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--page-bg)]">
        <p className="text-sm text-[var(--text-muted)]">Ładowanie…</p>
      </div>
    );
  }

  if (!authed) {
    return <AdminLogin onSuccess={handleLoggedIn} />;
  }

  return (
    <AdminDashboard
      onLogout={handleLogout}
      onSessionInvalid={handleSessionInvalid}
    />
  );
}
