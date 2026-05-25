'use client';

import { useEffect, useState } from 'react';

type Props = { value: string; size?: number };

export function QrCode({ value, size = 280 }: Props) {
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setSvg(null);
    setFailed(false);
    let cancelled = false;
    void (async () => {
      try {
        const QRCode = (await import('qrcode')).default;
        const out = await QRCode.toString(value, {
          type: 'svg',
          width: size,
          margin: 1,
        });
        if (!cancelled) {
          setSvg(out);
        }
      } catch (err) {
        console.error('QR code generation failed', err);
        if (!cancelled) {
          setFailed(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [value, size]);
  if (failed) {
    return (
      <div
        className="flex items-center justify-center rounded border border-[var(--border)] bg-[var(--card-bg)] p-3 text-center text-sm text-[var(--text-muted)]"
        style={{ width: size, minHeight: size }}
        role="alert"
        aria-label="Nie udało się wygenerować kodu QR"
      >
        Nie udało się wygenerować kodu QR.
      </div>
    );
  }
  if (!svg) {
    return (
      <div
        style={{ width: size, height: size }}
        aria-label="Generowanie kodu QR…"
      />
    );
  }
  return (
    <div
      dangerouslySetInnerHTML={{ __html: svg }}
      aria-label={`Kod QR dla: ${value}`}
    />
  );
}
