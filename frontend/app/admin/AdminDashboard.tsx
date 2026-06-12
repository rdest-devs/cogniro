'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ResultDetailView } from '@/app/components/admin/results/ResultDetailView';
import { ResultsBrowserView } from '@/app/components/admin/results/ResultsBrowserView';
import { ResultsDayView } from '@/app/components/admin/results/ResultsDayView';
import { SettingsView } from '@/app/components/admin/settings/SettingsView';
import { TutorialsView } from '@/app/components/admin/tutorials/TutorialsView';
import { formatAdminDate } from '@/lib/admin-date-time';
import {
  AdminQuizApiError,
  getAllAdminQuizzes,
  mapApiQuizStatusToLabel,
} from '@/lib/admin-quiz';

import { AdminPanel, QuizDetail, QuizEditor } from '../components/admin';
import { RunningQuizView } from '../components/admin/dashboard/RunningQuizView';
import type { AdminQuizApiListItem, QuizCard, QuizInfo } from '../types';

type AdminView =
  | 'panel'
  | 'detail'
  | 'details'
  | 'editor'
  | 'running'
  | 'results'
  | 'settings'
  | 'tutorials';
type EditorMode = 'create' | 'edit';

function mapApiQuizToCard(quiz: AdminQuizApiListItem): QuizCard {
  return {
    id: quiz.id,
    title: quiz.title,
    questionCount: quiz.question_count,
    lastActivatedAt: quiz.last_activated_at
      ? (formatAdminDate(quiz.last_activated_at, 'datetime') ??
        quiz.last_activated_at)
      : null,
    createdAt: formatAdminDate(quiz.created_at, 'datetime') ?? quiz.created_at,
    status: mapApiQuizStatusToLabel(quiz.status) as QuizCard['status'],
  };
}

function mapApiQuizToInfo(quiz: AdminQuizApiListItem): QuizInfo {
  return {
    id: quiz.id,
    title: quiz.title,
    status: mapApiQuizStatusToLabel(quiz.status) as QuizInfo['status'],
    date: formatAdminDate(quiz.created_at, 'datetime') ?? quiz.created_at,
    questionCount: quiz.question_count,
    lastActivatedAt: quiz.last_activated_at
      ? (formatAdminDate(quiz.last_activated_at, 'datetime') ??
        quiz.last_activated_at)
      : null,
  };
}

function toUiErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Nie udało się pobrać quizów administracyjnych.';
}

interface AdminDashboardProps {
  onLogout: () => void;
  onSessionInvalid: () => void;
}

export default function AdminDashboard({
  onLogout,
  onSessionInvalid,
}: AdminDashboardProps) {
  const router = useRouter();
  const pathname = usePathname() || '/admin/';
  const searchParams = useSearchParams();

  const adminBase = pathname.endsWith('/') ? pathname : `${pathname}/`;

  const quizIdFromUrl = searchParams.get('quiz');
  const wantsNew = searchParams.get('new') === '1';
  const wantsEdit = searchParams.get('edit') === '1';
  const viewParam = searchParams.get('view');
  const resultsDate = searchParams.get('date');
  const resultsFile = searchParams.get('file');
  const quizFilter = searchParams.get('quizFilter');

  const adminView: AdminView = useMemo(() => {
    if (viewParam === 'results') {
      return 'results';
    }
    if (viewParam === 'running' && quizIdFromUrl) {
      return 'running';
    }
    if (viewParam === 'details') {
      return 'details';
    }
    if (viewParam === 'tutorials') {
      return 'tutorials';
    }
    if (viewParam === 'settings') {
      return 'settings';
    }
    if (wantsNew) {
      return 'editor';
    }
    if (quizIdFromUrl && wantsEdit) {
      return 'editor';
    }
    if (quizIdFromUrl) {
      return 'detail';
    }
    return 'panel';
  }, [viewParam, wantsNew, quizIdFromUrl, wantsEdit]);

  const editorMode: EditorMode = wantsNew ? 'create' : 'edit';

  const [adminQuizzes, setAdminQuizzes] = useState<AdminQuizApiListItem[]>([]);
  /** Starts true so `?quiz=` is not rejected before the first API fetch. */
  const [adminLoading, setAdminLoading] = useState(true);
  const [adminError, setAdminError] = useState<string | null>(null);

  const loadAdminQuizzes = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent ?? false;
      if (!silent) {
        setAdminLoading(true);
      }
      setAdminError(null);

      try {
        const quizzes = await getAllAdminQuizzes();
        setAdminQuizzes(quizzes);
      } catch (error) {
        if (
          error instanceof AdminQuizApiError &&
          (error.status === 401 || error.status === 403)
        ) {
          onSessionInvalid();
          return;
        }
        setAdminError(toUiErrorMessage(error));
        setAdminQuizzes([]);
      } finally {
        if (!silent) {
          setAdminLoading(false);
        }
      }
    },
    [onSessionInvalid],
  );

  const adminListHydratedRef = useRef(false);
  useEffect(() => {
    const silent = adminListHydratedRef.current;
    adminListHydratedRef.current = true;
    void loadAdminQuizzes(silent ? { silent: true } : undefined);
  }, [adminView, quizIdFromUrl, loadAdminQuizzes]);

  useEffect(() => {
    if (adminLoading || wantsNew || !quizIdFromUrl) {
      return;
    }
    if (viewParam === 'results') {
      return;
    }

    if (adminError) {
      router.replace(adminBase);
      return;
    }

    const known =
      adminQuizzes.length > 0 &&
      adminQuizzes.some((quiz) => quiz.id === quizIdFromUrl);

    if (adminQuizzes.length === 0 || !known) {
      router.replace(adminBase);
    }
  }, [
    adminLoading,
    wantsNew,
    quizIdFromUrl,
    adminError,
    adminQuizzes,
    router,
    adminBase,
    viewParam,
  ]);

  const adminCards = useMemo(
    () => adminQuizzes.map(mapApiQuizToCard),
    [adminQuizzes],
  );

  const adminInfos = useMemo(
    () => adminQuizzes.map(mapApiQuizToInfo),
    [adminQuizzes],
  );

  const goDetail = useCallback(
    (quizId: string) => {
      const qs = new URLSearchParams({ quiz: quizId });
      router.push(`${adminBase}?${qs.toString()}`);
    },
    [router, adminBase],
  );

  const goEditorNew = useCallback(() => {
    router.push(`${adminBase}?new=1`);
  }, [router, adminBase]);

  const goEditorEdit = useCallback(
    (quizId: string) => {
      const qs = new URLSearchParams({ quiz: quizId, edit: '1' });
      router.push(`${adminBase}?${qs.toString()}`);
    },
    [router, adminBase],
  );

  const handleCreateQuiz = useCallback(() => {
    goEditorNew();
  }, [goEditorNew]);

  const handleEditQuiz = useCallback(
    (quizId: string) => {
      goEditorEdit(quizId);
    },
    [goEditorEdit],
  );

  const handleQuizSaved = useCallback(
    (quizId: string) => {
      const qs = new URLSearchParams({ quiz: quizId });
      router.push(`${adminBase}?${qs.toString()}`);
      void loadAdminQuizzes();
    },
    [loadAdminQuizzes, router, adminBase],
  );

  const handleEditorCancel = useCallback(() => {
    if (wantsNew) {
      router.push(adminBase);
      return;
    }
    if (quizIdFromUrl) {
      const qs = new URLSearchParams({ quiz: quizIdFromUrl });
      router.push(`${adminBase}?${qs.toString()}`);
      return;
    }
    router.push(adminBase);
  }, [wantsNew, quizIdFromUrl, router, adminBase]);

  const resultsQs = useCallback(
    (extra: Record<string, string>) => {
      const p = new URLSearchParams({ view: 'results', ...extra });
      if (quizFilter) {
        p.set('quizFilter', quizFilter);
      }
      return p.toString();
    },
    [quizFilter],
  );

  const menuActiveItem = useMemo(() => {
    if (adminView === 'results') {
      return 'statystyki';
    }
    if (adminView === 'panel') {
      return 'quizy';
    }
    if (adminView === 'detail' || adminView === 'details') {
      return 'details';
    }
    if (adminView === 'tutorials') {
      return 'samouczki';
    }
    if (adminView === 'settings') {
      return 'ustawienia';
    }
    return '';
  }, [adminView]);

  const handleMenuNavigate = useCallback(
    (itemId: string) => {
      if (itemId === 'statystyki') {
        router.push(`${adminBase}?view=results`);
        return;
      }
      if (itemId === 'details') {
        router.push(`${adminBase}?view=details`);
        return;
      }
      if (itemId === 'samouczki') {
        router.push(`${adminBase}?view=tutorials`);
        return;
      }
      if (itemId === 'ustawienia') {
        router.push(`${adminBase}?view=settings`);
        return;
      }
      if (itemId === 'quizy') {
        router.push(adminBase);
      }
    },
    [router, adminBase],
  );

  return (
    <div className="flex h-screen min-h-0 w-full flex-col overflow-hidden bg-[var(--page-bg)]">
      <div className="flex min-h-0 flex-1 flex-col">
        {adminView === 'panel' && (
          <AdminPanel
            quizzes={adminCards}
            isLoading={adminLoading}
            error={adminError}
            logoHref={adminBase}
            menuActiveItem={menuActiveItem}
            onMenuNavigate={handleMenuNavigate}
            onRefresh={loadAdminQuizzes}
            onCreateQuiz={handleCreateQuiz}
            onOpenQuiz={handleEditQuiz}
            onLogout={onLogout}
            onImportedQuiz={(quizId) => {
              void loadAdminQuizzes();
              goDetail(quizId);
            }}
          />
        )}

        {(adminView === 'detail' || adminView === 'details') && (
          <QuizDetail
            quizzes={adminInfos}
            adminBase={adminBase}
            menuActiveItem={menuActiveItem}
            onMenuNavigate={handleMenuNavigate}
            onSelectQuiz={goEditorEdit}
            onEditQuiz={handleEditQuiz}
            onLogout={onLogout}
            onQuizDeleted={loadAdminQuizzes}
          />
        )}

        {adminView === 'running' && quizIdFromUrl && (
          <RunningQuizView
            quizId={quizIdFromUrl}
            logoHref={adminBase}
            menuActiveItem={menuActiveItem}
            onMenuNavigate={handleMenuNavigate}
            onStopped={(date, file) => {
              const p = new URLSearchParams({
                view: 'results',
                date,
                file,
              });
              router.replace(`${adminBase}?${p.toString()}`);
            }}
            onBack={() => {
              const p = new URLSearchParams({ quiz: quizIdFromUrl });
              router.push(`${adminBase}?${p.toString()}`);
            }}
            onLogout={onLogout}
          />
        )}

        {adminView === 'results' &&
          (resultsDate && resultsFile ? (
            <ResultDetailView
              adminBase={adminBase}
              date={resultsDate}
              file={resultsFile}
              quizFilter={quizFilter}
              menuActiveItem={menuActiveItem}
              onMenuNavigate={handleMenuNavigate}
              onBack={() => {
                router.push(`${adminBase}?${resultsQs({ date: resultsDate })}`);
              }}
              onLogout={onLogout}
            />
          ) : resultsDate ? (
            <ResultsDayView
              adminBase={adminBase}
              date={resultsDate}
              quizFilter={quizFilter}
              menuActiveItem={menuActiveItem}
              onMenuNavigate={handleMenuNavigate}
              onBack={() => {
                router.push(`${adminBase}?${resultsQs({})}`);
              }}
              onLogout={onLogout}
            />
          ) : (
            <ResultsBrowserView
              adminBase={adminBase}
              quizFilter={quizFilter}
              menuActiveItem={menuActiveItem}
              onMenuNavigate={handleMenuNavigate}
              onBack={() => {
                router.push(adminBase);
              }}
              onLogout={onLogout}
            />
          ))}

        {adminView === 'tutorials' && (
          <TutorialsView
            adminBase={adminBase}
            menuActiveItem={menuActiveItem}
            onMenuNavigate={handleMenuNavigate}
            onLogout={onLogout}
          />
        )}

        {adminView === 'settings' && (
          <SettingsView
            adminBase={adminBase}
            menuActiveItem={menuActiveItem}
            onMenuNavigate={handleMenuNavigate}
            onLogout={onLogout}
          />
        )}

        {adminView === 'editor' && (
          <QuizEditor
            mode={editorMode}
            quizId={editorMode === 'edit' ? quizIdFromUrl : null}
            logoHref={adminBase}
            menuActiveItem={menuActiveItem}
            onMenuNavigate={handleMenuNavigate}
            onSaved={handleQuizSaved}
            onCancel={handleEditorCancel}
            onLogout={onLogout}
            onSessionInvalid={onSessionInvalid}
          />
        )}
      </div>
    </div>
  );
}
