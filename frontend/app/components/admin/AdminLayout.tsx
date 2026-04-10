import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface AdminLayoutProps {
  activeItem?: string;
  children: React.ReactNode;
}

export default function AdminLayout({
  activeItem = 'quizy',
  children,
}: AdminLayoutProps) {
  return (
    <div className="flex h-full w-full bg-[var(--page-bg)]">
      <Sidebar activeItem={activeItem} />

      <div className="flex flex-1 flex-col">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
