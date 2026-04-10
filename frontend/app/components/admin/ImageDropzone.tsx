import { Upload } from 'lucide-react';

export default function ImageDropzone() {
  return (
    <div className="flex h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--card-bg)]">
      <Upload size={32} className="text-[var(--text-muted)]" />
      <p className="text-sm font-medium text-[var(--text-muted)]">
        Przeciągnij i upuść obrazek
      </p>
      <p className="text-xs text-[var(--text-muted)]">
        lub kliknij, aby wybrać plik
      </p>
      <p className="text-xs text-[var(--text-muted)]">PNG, JPG do 5MB</p>
    </div>
  );
}
