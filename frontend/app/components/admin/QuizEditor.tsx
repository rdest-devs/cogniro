'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';

import type { Question } from '@/app/types';

import AdminLayout from './AdminLayout';
import ImageDropzone from './ImageDropzone';
import QuestionListItem from './QuestionListItem';
import QuestionPreview from './QuestionPreview';
import QuizSettingsForm from './QuizSettingsForm';

interface QuizEditorProps {
  quizName: string;
  timeLimit: number;
  shuffleQuestions: boolean;
  accessibility: string;
  questions: Question[];
  onSave?: (data: {
    quizName: string;
    timeLimit: number;
    shuffleQuestions: boolean;
    questions: Question[];
  }) => void;
  onAddQuestion?: () => void;
}

export default function QuizEditor({
  quizName,
  timeLimit,
  shuffleQuestions,
  accessibility,
  questions,
  onSave,
  onAddQuestion,
}: QuizEditorProps) {
  const [expandedId, setExpandedId] = useState<number | null>(
    questions?.find((q) => q.expanded)?.id ?? null,
  );
  const [shuffle, setShuffle] = useState(shuffleQuestions);
  const [nameValue, setNameValue] = useState(quizName);
  const [timeLimitValue, setTimeLimitValue] = useState(timeLimit);

  const expandedQuestion = questions.find((q) => q.id === expandedId);

  return (
    <AdminLayout>
      <div className="flex gap-6">
        <div className="flex flex-1 flex-col gap-5">
          <header className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-[var(--text-dark)]">
              Edytor Quizu
            </h1>
            <button
              onClick={() =>
                onSave?.({
                  quizName: nameValue,
                  timeLimit: timeLimitValue,
                  shuffleQuestions: shuffle,
                  questions,
                })
              }
              className="flex cursor-pointer items-center gap-2 rounded-2xl bg-[var(--active)] px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              Zapisz quiz
            </button>
          </header>

          <QuizSettingsForm
            nameValue={nameValue}
            onNameChange={setNameValue}
            timeLimitValue={timeLimitValue}
            onTimeLimitChange={setTimeLimitValue}
            shuffle={shuffle}
            onShuffleToggle={() => setShuffle(!shuffle)}
            accessibility={accessibility}
          />

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-bold text-[var(--text-dark)]">
              Pytania ({questions.length})
            </h2>

            {questions.map((q) => (
              <QuestionListItem
                key={q.id}
                question={q}
                isExpanded={expandedId === q.id}
                onToggle={() =>
                  setExpandedId(expandedId === q.id ? null : q.id)
                }
              />
            ))}

            <button
              onClick={onAddQuestion}
              className="flex cursor-pointer items-center justify-center gap-2 py-3 text-sm font-semibold text-[var(--primary-blue)] hover:underline"
            >
              <Plus size={16} />
              Dodaj pytanie
            </button>
          </section>
        </div>

        <aside className="flex w-[420px] flex-col gap-5">
          <h2 className="text-base font-bold text-[var(--text-dark)]">
            Podgląd obrazka
          </h2>
          <ImageDropzone />
          {expandedQuestion && <QuestionPreview question={expandedQuestion} />}
        </aside>
      </div>
    </AdminLayout>
  );
}
