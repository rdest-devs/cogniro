'use client';

type Props = { value: boolean | undefined; onChange: (v: boolean) => void };

export function TrueFalseQuestion({ value, onChange }: Props) {
  return (
    <div className="flex gap-3">
      {[true, false].map((v) => (
        <button
          key={String(v)}
          type="button"
          onClick={() => onChange(v)}
          className={`rounded border px-4 py-2 ${value === v ? 'bg-black text-white' : ''}`}
        >
          {v ? 'Prawda' : 'Fałsz'}
        </button>
      ))}
    </div>
  );
}
