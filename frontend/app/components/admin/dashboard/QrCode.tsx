'use client';

import { useEffect, useState } from 'react';

type Props = { value: string; size?: number };

export function QrCode({ value, size = 280 }: Props) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    setSvg(null);
    let cancelled = false;
    void (async () => {
      const QRCode = (await import('qrcode')).default;
      const out = await QRCode.toString(value, {
        type: 'svg',
        width: size,
        margin: 1,
      });
      if (!cancelled) {
        setSvg(out);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [value, size]);
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
