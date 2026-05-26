const PRESENTER_PIN_RE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

export type PresenterSession = {
  pin: string;
  playHref: string;
};

function normalizePresenterPin(rawPin: string | null): string | null {
  if (rawPin == null) {
    return null;
  }

  const pin = rawPin.trim().toUpperCase();
  return PRESENTER_PIN_RE.test(pin) ? pin : null;
}

function normalizePresenterPlayHref(
  rawHref: string | null | undefined,
  pin: string,
): string | null {
  if (!rawHref) {
    return null;
  }

  const trimmed = rawHref.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }
    const code = normalizePresenterPin(url.searchParams.get('code'));
    return code === pin ? url.toString() : null;
  } catch {
    try {
      const url = new URL(trimmed, 'https://presenter.invalid');
      const code = normalizePresenterPin(url.searchParams.get('code'));
      if (code !== pin) {
        return null;
      }
      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return null;
    }
  }
}

function normalizePresenterOrigin(
  rawOrigin: string | null | undefined,
): string | null {
  if (!rawOrigin) {
    return null;
  }

  const trimmed = rawOrigin.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    if (
      (url.protocol !== 'http:' && url.protocol !== 'https:') ||
      url.pathname !== '/' ||
      url.search !== '' ||
      url.hash !== ''
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

export function presenterPlayHref(pin: string, origin?: string | null): string {
  const playPath = `/play/?code=${encodeURIComponent(pin)}`;
  if (!origin) {
    return playPath;
  }
  try {
    return new URL(playPath, origin).toString();
  } catch {
    return playPath;
  }
}

export function resolvePresenterSession(
  rawPin: string | null,
  playHrefOrOrigin?: string | null,
): PresenterSession | null {
  const pin = normalizePresenterPin(rawPin);
  if (!pin) {
    return null;
  }

  const directPlayHref = normalizePresenterPlayHref(playHrefOrOrigin, pin);
  if (directPlayHref) {
    return {
      pin,
      playHref: directPlayHref,
    };
  }

  return {
    pin,
    playHref: presenterPlayHref(
      pin,
      normalizePresenterOrigin(playHrefOrOrigin),
    ),
  };
}
