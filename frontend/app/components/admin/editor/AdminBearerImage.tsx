'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { getStoredAdminToken } from '@/lib/admin-auth/client';

type AdminBearerImageProps = {
  fetchUrl: string;
  alt: string;
  className?: string;
  onLoadError?: () => void;
};

/**
 * Loads a URL that requires `Authorization: Bearer` (admin quiz media).
 * Plain `<img src>` cannot attach the in-memory admin token.
 */
export default function AdminBearerImage({
  fetchUrl,
  alt,
  className,
  onLoadError,
}: AdminBearerImageProps) {
  const objectUrlRef = useRef<string | null>(null);
  const onLoadErrorRef = useRef(onLoadError);
  onLoadErrorRef.current = onLoadError;
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    setDisplaySrc(null);
    setPhase('loading');

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    const token = getStoredAdminToken();
    if (!token) {
      setPhase('error');
      onLoadErrorRef.current?.();
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      try {
        const response = await fetch(fetchUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error(`media_${response.status}`);
        }
        const blob = await response.blob();
        if (cancelled) {
          return;
        }
        const objectUrl = URL.createObjectURL(blob);
        objectUrlRef.current = objectUrl;
        setDisplaySrc(objectUrl);
        setPhase('ready');
      } catch {
        if (!cancelled) {
          setPhase('error');
          onLoadErrorRef.current?.();
        }
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [fetchUrl]);

  if (phase === 'loading') {
    return (
      <div className={className} role="status" aria-label="Ładowanie obrazu">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  if (phase === 'error' || !displaySrc) {
    return null;
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={displaySrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
    />
  );
}
