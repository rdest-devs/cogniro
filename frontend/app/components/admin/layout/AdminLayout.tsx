import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface AdminLayoutProps {
  activeItem?: string;
  children: React.ReactNode;
  logoHref?: string;
  /** Sidebar item navigation handler (e.g. Statistics). */
  onMenuNavigate?: (menuItemId: string) => void;
  onCreateQuiz?: () => void;
  onLogout?: () => void;
}

export default function AdminLayout({
  activeItem = 'quizy',
  children,
  logoHref = '/admin/',
  onMenuNavigate,
  onCreateQuiz,
  onLogout,
}: AdminLayoutProps) {
  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-[var(--page-bg)]">
      <Sidebar
        activeItem={activeItem}
        quizListHref={logoHref}
        onNavigate={onMenuNavigate}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <TopBar
          logoHref={logoHref}
          onCreateQuiz={onCreateQuiz}
          onLogout={onLogout}
        />
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
