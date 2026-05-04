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

  if (!url.startsWith(MEDIA_PUBLIC_PREFIX)) {
    return url;
  }

  if (!BACKEND_ORIGIN) {
    return url;
  }

  return `${BACKEND_ORIGIN}${url}`;
}
