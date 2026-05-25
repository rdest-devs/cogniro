'use client';

interface QuizSettingsFormProps {
  title: string;
  onTitleChange: (value: string) => void;
  titleError?: string;
  description: string;
  onDescriptionChange: (value: string) => void;
  author: string;
  onAuthorChange: (value: string) => void;
  tagsText: string;
  onTagsTextChange: (value: string) => void;
  showAnswerReview: boolean;
  onShowAnswerReviewChange: (value: boolean) => void;
}

export default function QuizSettingsForm({
  title,
  onTitleChange,
  titleError,
  description,
  onDescriptionChange,
  author,
  onAuthorChange,
  tagsText,
  onTagsTextChange,
  showAnswerReview,
  onShowAnswerReviewChange,
}: QuizSettingsFormProps) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5">
      <h2 className="text-base font-bold text-[var(--text-dark)]">
        Ustawienia quizu
      </h2>

      <label className="flex flex-col gap-1">
        <span className="text-[13px] font-medium text-[var(--text-muted)]">
          Tytuł quizu
        </span>
        <input
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-dark)] outline-none focus:border-[var(--primary-blue)]"
        />
        {titleError && (
          <span className="text-xs text-[var(--wrong-fg)]">{titleError}</span>
        )}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[13px] font-medium text-[var(--text-muted)]">
          Opis (opcjonalnie)
        </span>
        <textarea
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          rows={3}
          className="resize-y rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-dark)] outline-none focus:border-[var(--primary-blue)]"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[13px] font-medium text-[var(--text-muted)]">
          Autor (opcjonalnie)
        </span>
        <input
          value={author}
          onChange={(event) => onAuthorChange(event.target.value)}
          className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-dark)] outline-none focus:border-[var(--primary-blue)]"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[13px] font-medium text-[var(--text-muted)]">
          Tagi (po przecinku, opcjonalnie)
        </span>
        <input
          value={tagsText}
          onChange={(event) => onTagsTextChange(event.target.value)}
          placeholder="np. informatyka, egzamin"
          className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-dark)] outline-none focus:border-[var(--primary-blue)]"
        />
      </label>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] bg-white px-3 py-3">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--primary-blue)]"
          checked={showAnswerReview}
          onChange={(e) => onShowAnswerReviewChange(e.target.checked)}
        />
        <span className="text-sm leading-snug text-[var(--text-dark)]">
          <span className="font-semibold">
            Pokaż przegląd odpowiedzi po quizie
          </span>
          <span className="mt-0.5 block text-[13px] font-normal text-[var(--text-muted)]">
            Wyłączenie ukryje uczestnikom przycisk „Przejrzyj odpowiedzi” na
            ekranie wyniku.
          </span>
        </span>
      </label>
    </section>
  );
}
