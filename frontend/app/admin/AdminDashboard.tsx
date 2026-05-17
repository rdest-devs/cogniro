'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ResultDetailView } from '@/app/components/admin/results/ResultDetailView';
import { ResultsBrowserView } from '@/app/components/admin/results/ResultsBrowserView';
import { ResultsDayView } from '@/app/components/admin/results/ResultsDayView';
import { adminPanelDemo, quizDetailDemo } from '@/app/legacy/data/demo';
import {
  AdminQuizApiError,
  getAllAdminQuizzes,
  mapApiQuizStatusToLabel,
} from '@/lib/admin-quiz';

import { AdminPanel, QuizDetail, QuizEditor } from '../components/admin';
import { RunningQuizView } from '../components/admin/dashboard/RunningQuizView';
import type {
  AdminQuizApiListItem,
  QuizCard,
  QuizInfo,
  ResultRow,
} from '../types';

type AdminView = 'panel' | 'detail' | 'editor' | 'running' | 'results';
type EditorMode = 'create' | 'edit';

const demoQuizIds = new Set(
  [...adminPanelDemo.quizzes, ...quizDetailDemo.quizzes].map((q) => q.id),
);

function formatDate(dateInput: string): string {
  const parsedDate = new Date(dateInput);

  if (Number.isNaN(parsedDate.getTime())) {
    return dateInput;
  }

  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsedDate);
}

function mapApiQuizToCard(quiz: AdminQuizApiListItem): QuizCard {
  return {
    id: quiz.id,
    title: quiz.title,
    questionCount: quiz.question_count,
    lastActivatedAt: quiz.last_activated_at
      ? formatDate(quiz.last_activated_at)
      : null,
    createdAt: formatDate(quiz.created_at),
    status: mapApiQuizStatusToLabel(quiz.status) as QuizCard['status'],
  };
}

function mapApiQuizToInfo(quiz: AdminQuizApiListItem): QuizInfo {
  return {
    id: quiz.id,
    title: quiz.title,
    status: mapApiQuizStatusToLabel(quiz.status) as QuizInfo['status'],
    date: formatDate(quiz.created_at),
    questionCount: quiz.question_count,
    lastActivatedAt: quiz.last_activated_at
      ? formatDate(quiz.last_activated_at)
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
  /** Zaczyna od true, żeby nie odrzucać `?quiz=` przed pierwszym pobraniem z API. */
  const [adminLoading, setAdminLoading] = useState(true);
  const [adminError, setAdminError] = useState<string | null>(null);

  const loadAdminQuizzes = useCallback(async () => {
    setAdminLoading(true);
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
      setAdminLoading(false);
    }
  }, [onSessionInvalid]);

  useEffect(() => {
    void loadAdminQuizzes();
  }, [loadAdminQuizzes]);

  useEffect(() => {
    if (adminLoading || wantsNew || !quizIdFromUrl) {
      return;
    }
    if (viewParam === 'results') {
      return;
    }

    if (adminError) {
      if (!demoQuizIds.has(quizIdFromUrl)) {
        router.replace(adminBase);
      }
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
    () =>
      adminError ? adminPanelDemo.quizzes : adminQuizzes.map(mapApiQuizToCard),
    [adminError, adminQuizzes],
  );

  const adminInfos = useMemo(
    () =>
      adminError ? quizDetailDemo.quizzes : adminQuizzes.map(mapApiQuizToInfo),
    [adminError, adminQuizzes],
  );

  const resolvedSelectedQuizId = useMemo(() => {
    if (adminView === 'detail' || (adminView === 'editor' && wantsEdit)) {
      if (quizIdFromUrl) {
        return quizIdFromUrl;
      }
    }
    return adminInfos[0]?.id ?? null;
  }, [adminView, wantsEdit, quizIdFromUrl, adminInfos]);

  const resultsForSelectedQuiz = useMemo(() => {
    if (!resolvedSelectedQuizId) {
      return [];
    }

    const resultsByQuizId = quizDetailDemo.resultsByQuizId as Record<
      string,
      ResultRow[]
    >;

    return resultsByQuizId[resolvedSelectedQuizId] ?? [];
  }, [resolvedSelectedQuizId]);

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

  const handleOpenQuizDetail = useCallback(
    (quizId: string) => {
      goDetail(quizId);
    },
    [goDetail],
  );

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
    return '';
  }, [adminView]);

  const handleMenuNavigate = useCallback(
    (itemId: string) => {
      if (itemId === 'statystyki') {
        router.push(`${adminBase}?view=results`);
        return;
      }
      if (itemId === 'quizy') {
        router.push(adminBase);
      }
    },
    [router, adminBase],
  );

  return (
    <div className="h-screen w-full bg-[var(--page-bg)]">
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
          onOpenQuiz={handleOpenQuizDetail}
          onLogout={onLogout}
          onImportedQuiz={(quizId) => {
            void loadAdminQuizzes();
            goDetail(quizId);
          }}
        />
      )}

      {adminView === 'detail' && (
        <QuizDetail
          quizzes={adminInfos}
          selectedQuizId={resolvedSelectedQuizId}
          resultsForQuiz={resultsForSelectedQuiz}
          adminBase={adminBase}
          menuActiveItem={menuActiveItem}
          onMenuNavigate={handleMenuNavigate}
          onCreateQuiz={handleCreateQuiz}
          onSelectQuiz={goDetail}
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
          onCreateQuiz={handleCreateQuiz}
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
            onCreateQuiz={handleCreateQuiz}
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
            onCreateQuiz={handleCreateQuiz}
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
            onCreateQuiz={handleCreateQuiz}
            onLogout={onLogout}
          />
        ))}

      {adminView === 'editor' && (
        <QuizEditor
          mode={editorMode}
          quizId={editorMode === 'edit' ? quizIdFromUrl : null}
          logoHref={adminBase}
          menuActiveItem={menuActiveItem}
          onMenuNavigate={handleMenuNavigate}
          onSaved={handleQuizSaved}
          onCancel={handleEditorCancel}
          onCreateQuiz={handleCreateQuiz}
          onLogout={onLogout}
          onSessionInvalid={onSessionInvalid}
        />
      )}
    </div>
  );
}
