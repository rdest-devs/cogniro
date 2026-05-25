'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useReducer, useRef } from 'react';

import { getStoredAdminToken } from '@/lib/admin-auth/client';

type State = {
  displaySrc: string | null;
  phase: 'loading' | 'ready' | 'error';
};

type Action =
  | { type: 'reset' }
  | { type: 'showSrc'; payload: string }
  | { type: 'error' };

function reducer(_state: State, action: Action): State {
  switch (action.type) {
    case 'reset':
      return { displaySrc: null, phase: 'loading' };
    case 'showSrc':
      return { displaySrc: action.payload, phase: 'ready' };
    case 'error':
      return { displaySrc: null, phase: 'error' };
  }
}

type AdminProgressiveBearerImageProps = {
  thumbFetchUrl: string;
  fullFetchUrl: string;
  alt: string;
  className?: string;
  onLoadError?: () => void;
};

async function fetchAuthorizedBlob(url: string, token: string): Promise<Blob> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`media_${response.status}`);
  }
  return response.blob();
}

/**
 * Admin quiz media with Bearer: show thumbnail first, then swap to full image
 * after a second authorized fetch (same idea as play `ProgressiveQuizImage`).
 */
export default function AdminProgressiveBearerImage({
  thumbFetchUrl,
  fullFetchUrl,
  alt,
  className,
  onLoadError,
}: AdminProgressiveBearerImageProps) {
  const objectUrlRef = useRef<string | null>(null);
  const onLoadErrorRef = useRef(onLoadError);
  useEffect(() => {
    onLoadErrorRef.current = onLoadError;
  }, [onLoadError]);

  const [state, dispatch] = useReducer(reducer, {
    displaySrc: null,
    phase: 'loading',
  });

  const revokeObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  useEffect(() => {
    let cancelled = false;
    revokeObjectUrl();
    dispatch({ type: 'reset' });

    const token = getStoredAdminToken();
    if (!token) {
      dispatch({ type: 'error' });
      onLoadErrorRef.current?.();
      return () => {
        cancelled = true;
      };
    }

    const progressive = thumbFetchUrl.trim() !== fullFetchUrl.trim();

    void (async () => {
      try {
        if (!progressive) {
          const blob = await fetchAuthorizedBlob(fullFetchUrl, token);
          if (cancelled) {
            return;
          }
          const objectUrl = URL.createObjectURL(blob);
          if (cancelled) {
            URL.revokeObjectURL(objectUrl);
            return;
          }
          objectUrlRef.current = objectUrl;
          dispatch({ type: 'showSrc', payload: objectUrl });
          return;
        }

        const thumbBlob = await fetchAuthorizedBlob(thumbFetchUrl, token);
        if (cancelled) {
          return;
        }
        const thumbObjectUrl = URL.createObjectURL(thumbBlob);
        if (cancelled) {
          URL.revokeObjectURL(thumbObjectUrl);
          return;
        }
        objectUrlRef.current = thumbObjectUrl;
        dispatch({ type: 'showSrc', payload: thumbObjectUrl });

        try {
          const fullBlob = await fetchAuthorizedBlob(fullFetchUrl, token);
          if (cancelled) {
            return;
          }
          const fullObjectUrl = URL.createObjectURL(fullBlob);
          if (cancelled) {
            URL.revokeObjectURL(fullObjectUrl);
            return;
          }
          revokeObjectUrl();
          objectUrlRef.current = fullObjectUrl;
          dispatch({ type: 'showSrc', payload: fullObjectUrl });
        } catch {
          /* keep thumbnail */
        }
      } catch {
        if (!cancelled) {
          revokeObjectUrl();
          dispatch({ type: 'error' });
          onLoadErrorRef.current?.();
        }
      }
    })();

    return () => {
      cancelled = true;
      revokeObjectUrl();
    };
  }, [thumbFetchUrl, fullFetchUrl]);

  if (state.phase === 'error') {
    return null;
  }

  if (state.phase === 'loading' || !state.displaySrc) {
    return (
      <div className={className} role="status" aria-label="Ładowanie obrazu">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={state.displaySrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
    />
  );
}
