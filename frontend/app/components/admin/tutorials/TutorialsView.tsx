'use client';

import AdminLayout from '@/app/components/admin/layout/AdminLayout';

import { TutorialList } from './TutorialList';
import { tutorialGroups } from './tutorialsData';

type Props = {
  adminBase: string;
  menuActiveItem?: string;
  onMenuNavigate?: (menuItemId: string) => void;
  onLogout?: () => void;
};

export function TutorialsView({
  adminBase,
  menuActiveItem = 'samouczki',
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
      <TutorialList groups={tutorialGroups} />
    </AdminLayout>
  );
}
