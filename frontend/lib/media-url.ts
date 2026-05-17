import { BACKEND_BASE_URL, joinApiUrl } from '@/lib/backend-url';

const DEFAULT_MEDIA_PUBLIC_PREFIX = '/media/quiz-assets';

function toOrigin(raw: string | undefined): string {
  if (!raw?.trim()) {
    return '';
  }

  try {
    return new URL(raw.trim()).origin;
  } catch {
    return '';
  }
}

const configuredMediaPrefix =
  process.env.NEXT_PUBLIC_MEDIA_PUBLIC_PREFIX ?? DEFAULT_MEDIA_PUBLIC_PREFIX;
const MEDIA_PUBLIC_PREFIX = configuredMediaPrefix.endsWith('/')
  ? configuredMediaPrefix.slice(0, -1)
  : configuredMediaPrefix;

const BACKEND_ORIGIN =
  toOrigin(process.env.NEXT_PUBLIC_BACKEND_URL) ||
  toOrigin(process.env.NEXT_PUBLIC_API_BASE_URL);

export function resolveMediaUrl(url: string): string {
  if (!url) {
    return url;
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  const isMediaPath =
    url === MEDIA_PUBLIC_PREFIX || url.startsWith(`${MEDIA_PUBLIC_PREFIX}/`);
  if (!isMediaPath) {
    return url;
  }

  if (!BACKEND_ORIGIN) {
    return url;
  }

  return `${BACKEND_ORIGIN}${url}`;
}

/**
 * Play image URLs: join yields an **asset directory** (last path segment has no
 * ``.``). Append ``/image.webp`` and ``/thumb.webp`` once. If the value is
 * already a concrete file (last segment contains ``.``), use the same URL for
 * full and thumb (no progressive pair).
 */
export function resolveKqfPlayImageUrls(src: string): {
  fullUrl: string;
  thumbUrl: string;
} {
  const t = src.trim();
  if (!t) {
    return { fullUrl: t, thumbUrl: t };
  }
  const resolved = resolveMediaUrl(t);
  const base = resolved.replace(/\/+$/, '');
  const last = base.split('/').pop() ?? '';
  if (last.includes('.')) {
    return { fullUrl: base, thumbUrl: base };
  }
  return {
    fullUrl: `${base}/image.webp`,
    thumbUrl: `${base}/thumb.webp`,
  };
}

const _ASSET_ID_TAIL = /(asset_[0-9a-f]{32})$/i;

/**
 * KQF / edytor: ścieżka do obrazka pytania to katalog ``./media/{asset_…}``,
 * bez ``/image.webp`` ani ``/thumb.webp``. Upload API zwraca URL z plikiem —
 * ta funkcja skraca do formy katalogu; inne URL-e zwraca bez zmian.
 */
export function normalizeKqfQuestionImageToDirectoryPath(
  image: string | null | undefined,
): string | null {
  const raw = image?.trim() ?? '';
  if (!raw) {
    return null;
  }

  let path = raw;
  try {
    if (/^https?:\/\//i.test(raw)) {
      path = new URL(raw).pathname;
    }
  } catch {
    path = raw;
  }

  const withoutWebp = path
    .replace(/\/image\.webp$/i, '')
    .replace(/\/thumb\.webp$/i, '');
  const trimmed = withoutWebp.replace(/\/+$/, '');
  const m = trimmed.match(_ASSET_ID_TAIL);
  if (m) {
    return `./media/${m[1]}`;
  }

  return raw;
}

/** True when the URL targets admin-only quiz media (Bearer required; plain `<img src>` will not work). */
export function isAdminQuizMediaFetchUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname;
    return /\/admin\/quiz\/[^/]+\/media\//.test(path);
  } catch {
    return false;
  }
}

/** Editor `./media/...` images → `GET /admin/quiz/{quiz_id}/media/...` (admin Bearer). Public `/media/{quiz_id}/...` is for play during an active session. */
export function resolveEditorQuestionImageUrl(
  url: string,
  quizId: string | null | undefined,
): string | null {
  const t = url.trim();
  if (!t) {
    return null;
  }
  let tail: string | null = null;
  if (t.startsWith('./media/')) {
    tail = t.slice('./media/'.length);
  } else if (t.startsWith('media/')) {
    tail = t.slice('media/'.length);
  }
  if (tail === null) {
    return resolveMediaUrl(t);
  }
  const id = quizId?.trim();
  if (!id) {
    return null;
  }
  return joinApiUrl(BACKEND_BASE_URL, `admin/quiz/${id}/media/${tail}`);
}

/** Same pairing as play (`resolveKqfPlayImageUrls`) after editor/admin URL resolution. */
export function resolveEditorQuestionPlayImageUrls(
  rawUrl: string,
  quizId: string | null | undefined,
): { fullUrl: string; thumbUrl: string } | null {
  const base = resolveEditorQuestionImageUrl(rawUrl, quizId);
  if (!base) {
    return null;
  }
  return resolveKqfPlayImageUrls(base);
}
