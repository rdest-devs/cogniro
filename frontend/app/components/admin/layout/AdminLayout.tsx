import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface AdminLayoutProps {
  activeItem?: string;
  children: React.ReactNode;
  onCreateQuiz?: () => void;
}

export default function AdminLayout({
  activeItem = 'quizy',
  children,
  onCreateQuiz,
}: AdminLayoutProps) {
  return (
    <div className="flex h-full w-full overflow-hidden bg-[var(--page-bg)]">
      <Sidebar activeItem={activeItem} />

      <div className="flex min-h-0 flex-1 flex-col">
        <TopBar onCreateQuiz={onCreateQuiz} />
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
