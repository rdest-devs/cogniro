'use client';

import { ChevronDown, Plus, Upload } from 'lucide-react';
import { useState } from 'react';

import type { Question } from '@/app/types';
import { cn } from '@/lib/cn';

import Sidebar from './Sidebar';
import TopBar from './TopBar';

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

  const typeColors: Record<string, string> = {
    Jednokrotny: 'bg-[var(--active)] text-white',
    Wielokrotny: 'bg-[var(--primary-blue)] text-white',
    Obrazkowy: 'bg-[var(--orange)] text-white',
  };

  const expandedQuestion = questions.find((q) => q.id === expandedId);

  return (
    <div className="flex h-screen w-full bg-[var(--page-bg)]">
      <Sidebar activeItem="quizy" />

      <div className="flex flex-1 flex-col">
        <TopBar />

        <div className="flex flex-1 gap-6 overflow-y-auto p-8">
          {/* Left Column */}
          <div className="flex flex-1 flex-col gap-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-[var(--text-dark)]">
                Edytor Quizu
              </h1>
              <button
                onClick={() =>
                  onSave?.({
                    quizName: nameValue,
                    timeLimit: timeLimitValue,
                    shuffleQuestions: shuffle,
                    questions: questions,
                  })
                }
                className="flex cursor-pointer items-center gap-2 rounded-2xl bg-[var(--active)] px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
              >
                Zapisz quiz
              </button>
            </div>

            {/* Quiz Settings */}
            <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5">
              <h2 className="text-base font-bold text-[var(--text-dark)]">
                Ustawienia quizu
              </h2>
              <div className="flex gap-4">
                <div className="flex flex-1 flex-col gap-1">
                  <label className="text-[13px] font-medium text-[var(--text-muted)]">
                    Nazwa Quizu
                  </label>
                  <input
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-dark)] outline-none focus:border-[var(--primary-blue)]"
                  />
                </div>
                <div className="flex w-24 flex-col gap-1">
                  <label className="text-[13px] font-medium text-[var(--text-muted)]">
                    Limit czasu (min)
                  </label>
                  <input
                    type="number"
                    value={timeLimitValue}
                    onChange={(e) => setTimeLimitValue(Number(e.target.value))}
                    className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-dark)] outline-none focus:border-[var(--primary-blue)]"
                  />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={shuffle}
                    onClick={() => setShuffle(!shuffle)}
                    className={cn(
                      'flex h-5 w-9 cursor-pointer items-center rounded-full p-0.5 transition-colors',
                      shuffle
                        ? 'bg-[var(--primary-blue)]'
                        : 'bg-[var(--border)]',
                    )}
                  >
                    <div
                      className={cn(
                        'h-4 w-4 rounded-full bg-white transition-transform',
                        shuffle && 'translate-x-4',
                      )}
                    />
                  </button>
                  <span className="text-sm text-[var(--text-dark)]">
                    Wymieszaj pytania
                  </span>
                </label>
                <span className="text-sm text-[var(--text-muted)]">
                  Dostępność:
                </span>
                <span className="rounded-lg bg-[var(--primary-blue)] px-2 py-0.5 text-xs font-semibold text-white">
                  {accessibility}
                </span>
                <span className="rounded-lg bg-[var(--page-bg)] px-2 py-0.5 text-xs font-medium text-[var(--text-muted)]">
                  QR
                </span>
              </div>
            </div>

            {/* Questions List */}
            <div className="flex flex-col gap-3">
              <h2 className="text-base font-bold text-[var(--text-dark)]">
                Pytania ({questions.length})
              </h2>

              {questions.map((q) => (
                <div key={q.id}>
                  {/* Collapsed question */}
                  <button
                    onClick={() =>
                      setExpandedId(expandedId === q.id ? null : q.id)
                    }
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-3 rounded-2xl border p-4 transition-colors',
                      expandedId === q.id
                        ? 'border-[var(--orange)] bg-[var(--selected-bg)]'
                        : 'border-[var(--border)] bg-[var(--card-bg)]',
                    )}
                  >
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--orange)]">
                      <span className="text-sm font-bold text-white">
                        {q.id}
                      </span>
                    </div>
                    <span className="flex-1 text-left text-sm font-medium text-[var(--text-dark)]">
                      {q.text}
                    </span>
                    <span
                      className={cn(
                        'rounded-md px-2 py-0.5 text-[11px] font-semibold',
                        typeColors[q.type] ||
                          'bg-[var(--card-bg)] text-[var(--text-muted)]',
                      )}
                    >
                      {q.type}
                    </span>
                  </button>

                  {/* Expanded editor */}
                  {expandedId === q.id && (
                    <div className="mt-2 flex flex-col gap-4 rounded-2xl border border-[var(--orange)] bg-[var(--selected-bg)] p-5">
                      <div className="flex flex-col gap-1">
                        <label className="text-[13px] font-medium text-[var(--text-muted)]">
                          Treść pytania
                        </label>
                        <input
                          defaultValue={q.text}
                          className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-dark)] outline-none"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[13px] font-medium text-[var(--text-muted)]">
                          Typ pytania
                        </label>
                        <div className="relative w-48">
                          <select
                            defaultValue={q.type}
                            className="w-full appearance-none rounded-xl border border-[var(--border)] bg-white px-3 py-2 pr-8 text-sm text-[var(--text-dark)] outline-none"
                          >
                            <option>Jednokrotny</option>
                            <option>Wielokrotny</option>
                            <option>Obrazkowy</option>
                            <option>Kolejność</option>
                            <option>Suwak</option>
                          </select>
                          <ChevronDown
                            size={16}
                            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[var(--text-muted)]"
                          />
                        </div>
                      </div>

                      {q.answers.length > 0 && (
                        <div className="flex flex-col gap-2">
                          <label className="text-[13px] font-medium text-[var(--text-muted)]">
                            Odpowiedzi({q.answers.length})
                          </label>
                          {q.answers.map((a, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div
                                className={cn(
                                  'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md',
                                  a.isCorrect
                                    ? 'bg-[var(--orange)]'
                                    : 'border border-[var(--border)] bg-white',
                                )}
                              >
                                {a.isCorrect && (
                                  <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 12 12"
                                    fill="none"
                                  >
                                    <path
                                      d="M2 6L5 9L10 3"
                                      stroke="white"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                )}
                              </div>
                              <input
                                defaultValue={a.text}
                                className={cn(
                                  'flex-1 rounded-xl border px-3 py-2 text-sm outline-none',
                                  a.isCorrect
                                    ? 'border-[var(--orange)] bg-[var(--selected-bg)]'
                                    : 'border-[var(--border)] bg-white',
                                )}
                              />
                              {a.isCorrect && (
                                <span className="text-[11px] font-medium text-[var(--active)]">
                                  Poprawna
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              <button
                onClick={onAddQuestion}
                className="flex cursor-pointer items-center justify-center gap-2 py-3 text-sm font-semibold text-[var(--primary-blue)] hover:underline"
              >
                <Plus size={16} />
                Dodaj pytanie
              </button>
            </div>
          </div>

          {/* Right Column - Preview */}
          <div className="flex w-[420px] flex-col gap-5">
            <h2 className="text-base font-bold text-[var(--text-dark)]">
              Podgląd obrazka
            </h2>

            {/* Image Dropzone */}
            <div className="flex h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--card-bg)]">
              <Upload size={32} className="text-[var(--text-muted)]" />
              <p className="text-sm font-medium text-[var(--text-muted)]">
                Przeciągnij i upuść obrazek
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                lub kliknij, aby wybrać plik
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                PNG, JPG do 5MB
              </p>
            </div>

            {/* Question Preview */}
            {expandedQuestion && (
              <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4">
                <h3 className="text-sm font-bold text-[var(--text-dark)]">
                  Podgląd pytania
                </h3>
                <p className="text-sm text-[var(--text-dark)]">
                  {expandedQuestion.text}
                </p>
                {expandedQuestion.answers.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {expandedQuestion.answers.map((a, i) => (
                      <div
                        key={i}
                        className={cn(
                          'rounded-xl px-3 py-2 text-sm',
                          a.isCorrect
                            ? 'border border-[var(--orange)] bg-[var(--selected-bg)] font-semibold'
                            : 'border border-[var(--border)] bg-white',
                        )}
                      >
                        {a.text}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
