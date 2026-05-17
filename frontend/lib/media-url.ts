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

/** True when the URL targets admin-only quiz media (Bearer required; plain `<img src>` will not work). */
export function isAdminQuizMediaFetchUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname;
    return /\/admin\/quiz\/[^/]+\/media\//.test(path);
  } catch {
    return false;
  }
}

/** Obrazy z `./media/...` w edytorze — `GET /admin/quiz/{quiz_id}/media/...` (zawsze z tokenem admina). Publiczny `/media/{quiz_id}/...` służy grze przy aktywnej sesji. */
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
