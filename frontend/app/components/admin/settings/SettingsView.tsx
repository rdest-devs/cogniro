'use client';

import AdminLayout from '@/app/components/admin/layout/AdminLayout';

import { ChangePasswordForm } from './ChangePasswordForm';

type Props = {
  adminBase: string;
  menuActiveItem?: string;
  onMenuNavigate?: (menuItemId: string) => void;
  onLogout?: () => void;
};

export function SettingsView({
  adminBase,
  menuActiveItem = 'ustawienia',
  onMenuNavigate,
  onLogout,
}: Props) {
  return (
    <AdminLayout
      activeItem={menuActiveItem}
      logoHref={adminBase}
      onMenuNavigate={onMenuNavigate}
      onLogout={onLogout}
    >
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold text-[var(--text-dark)]">
            Ustawienia
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Zarządzaj kontem administratora.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-[var(--text-dark)]">
            Zmiana hasła
          </h2>
          <ChangePasswordForm />
        </section>
      </div>
    </AdminLayout>
  );
}
