'use client';

import { useState } from 'react';

type Props = { onSubmit: (code: string) => void };

export function EnterCode({ onSubmit }: Props) {
  const [code, setCode] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (code.trim()) {
          onSubmit(code.trim().toUpperCase());
        }
      }}
    >
      <label className="block text-lg font-semibold">Podaj kod quizu</label>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        maxLength={8}
        className="mt-2 w-full rounded border p-2 uppercase"
        autoFocus
      />
      <button
        type="submit"
        className="mt-4 rounded bg-black px-4 py-2 text-white"
      >
        Dalej
      </button>
    </form>
  );
}
