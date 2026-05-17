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
    </section>
  );
}
