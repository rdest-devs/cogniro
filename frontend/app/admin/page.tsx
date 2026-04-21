'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { getAllAdminQuizzes, mapApiQuizStatusToLabel } from '@/lib/admin-quiz';

import { AdminPanel, QuizDetail, QuizEditor } from '../components/admin';
import { adminPanelDemo, quizDetailDemo } from '../data/demo';
import type {
  AdminQuizApiListItem,
  QuizCard,
  QuizInfo,
  ResultRow,
} from '../types';

type AdminScreen = 'panel' | 'detail' | 'editor';
type EditorMode = 'create' | 'edit';

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
    questionsCount: 0,
    responsesCount: quiz.participants_count,
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
    participants: quiz.participants_count,
    avgScore: 0,
  };
}

function toUiErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Nie udało się pobrać quizów administracyjnych.';
}

export default function AdminPage() {
  const [screen, setScreen] = useState<AdminScreen>('panel');
  const [editorMode, setEditorMode] = useState<EditorMode>('create');
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);

  const [adminQuizzes, setAdminQuizzes] = useState<AdminQuizApiListItem[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  const loadAdminQuizzes = useCallback(async () => {
    setAdminLoading(true);
    setAdminError(null);

    try {
      const quizzes = await getAllAdminQuizzes();
      setAdminQuizzes(quizzes);
      setSelectedQuizId((previousId) => previousId ?? quizzes[0]?.id ?? null);
    } catch (error) {
      setAdminError(toUiErrorMessage(error));
      setAdminQuizzes([]);
      setSelectedQuizId(
        (previousId) => previousId ?? adminPanelDemo.quizzes[0]?.id ?? null,
      );
    } finally {
      setAdminLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAdminQuizzes();
  }, [loadAdminQuizzes]);

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

  const resolvedSelectedQuizId = selectedQuizId ?? adminInfos[0]?.id ?? null;

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

  const handleCreateQuiz = () => {
    setEditorMode('create');
    setSelectedQuizId(null);
    setScreen('editor');
  };

  const handleOpenQuizDetail = (quizId: string) => {
    setSelectedQuizId(quizId);
    setScreen('detail');
  };

  const handleEditQuiz = (quizId: string) => {
    setEditorMode('edit');
    setSelectedQuizId(quizId);
    setScreen('editor');
  };

  const handleQuizSaved = (quizId: string) => {
    setSelectedQuizId(quizId);
    setEditorMode('edit');
    setScreen('detail');
    void loadAdminQuizzes();
  };

  return (
    <div className="h-screen w-full bg-[var(--page-bg)]">
      {screen === 'panel' && (
        <AdminPanel
          quizzes={adminCards}
          isLoading={adminLoading}
          error={adminError}
          onRefresh={loadAdminQuizzes}
          onCreateQuiz={handleCreateQuiz}
          onOpenQuiz={handleOpenQuizDetail}
        />
      )}

      {screen === 'detail' && (
        <QuizDetail
          quizzes={adminInfos}
          selectedQuizId={resolvedSelectedQuizId}
          resultsForQuiz={resultsForSelectedQuiz}
          onCreateQuiz={handleCreateQuiz}
          onSelectQuiz={setSelectedQuizId}
          onEditQuiz={handleEditQuiz}
        />
      )}

      {screen === 'editor' && (
        <QuizEditor
          mode={editorMode}
          quizId={editorMode === 'edit' ? resolvedSelectedQuizId : null}
          onSaved={handleQuizSaved}
          onCancel={() => setScreen(editorMode === 'edit' ? 'detail' : 'panel')}
          onCreateQuiz={handleCreateQuiz}
        />
      )}
    </div>
  );
}
