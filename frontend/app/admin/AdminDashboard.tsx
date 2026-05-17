'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  AdminQuizApiError,
  getAllAdminQuizzes,
  mapApiQuizStatusToLabel,
} from '@/lib/admin-quiz';

import { AdminPanel, QuizDetail, QuizEditor } from '../components/admin';
import { adminPanelDemo, quizDetailDemo } from '../data/demo';
import type {
  AdminQuizApiListItem,
  QuizCard,
  QuizInfo,
  ResultRow,
} from '../types';

type AdminView = 'panel' | 'detail' | 'editor';
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
    responsesCount: quiz.participants_count,
    createdAt: formatDate(quiz.created_at),
    status: mapApiQuizStatusToLabel(quiz.status) as QuizCard['status'],
  };
}

function mapApiQuizToInfo(quiz: AdminQuizApiListItem): QuizInfo {
  const quizInfo: QuizInfo = {
    id: quiz.id,
    title: quiz.title,
    status: mapApiQuizStatusToLabel(quiz.status) as QuizInfo['status'],
    date: formatDate(quiz.created_at),
    participants: quiz.participants_count,
  };

  return quizInfo;
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

  const adminView: AdminView = useMemo(() => {
    if (wantsNew) return 'editor';
    if (quizIdFromUrl && wantsEdit) return 'editor';
    if (quizIdFromUrl) return 'detail';
    return 'panel';
  }, [wantsNew, quizIdFromUrl, wantsEdit]);

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

  return (
    <div className="h-screen w-full bg-[var(--page-bg)]">
      {adminView === 'panel' && (
        <AdminPanel
          quizzes={adminCards}
          isLoading={adminLoading}
          error={adminError}
          onRefresh={loadAdminQuizzes}
          onCreateQuiz={handleCreateQuiz}
          onOpenQuiz={handleOpenQuizDetail}
          onLogout={onLogout}
        />
      )}

      {adminView === 'detail' && (
        <QuizDetail
          quizzes={adminInfos}
          selectedQuizId={resolvedSelectedQuizId}
          resultsForQuiz={resultsForSelectedQuiz}
          onCreateQuiz={handleCreateQuiz}
          onSelectQuiz={goDetail}
          onEditQuiz={handleEditQuiz}
          onLogout={onLogout}
        />
      )}

      {adminView === 'editor' && (
        <QuizEditor
          mode={editorMode}
          quizId={editorMode === 'edit' ? quizIdFromUrl : null}
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
