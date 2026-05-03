const INVALID_PASSWORD_ERROR = 'invalid_password';
const INVALID_PASSWORD_MESSAGE = 'Nieprawidłowe hasło.';
const ADMIN_LOGIN_FALLBACK_MESSAGE =
  'Nie udało się zalogować. Spróbuj ponownie później.';

type ErrorLike = {
  code?: unknown;
  message?: unknown;
};

function isErrorLike(error: unknown): error is ErrorLike {
  return typeof error === 'object' && error !== null;
}

export function getAdminLoginErrorMessage(error: unknown): string {
  if (!isErrorLike(error)) {
    return ADMIN_LOGIN_FALLBACK_MESSAGE;
  }

  const code = typeof error.code === 'string' ? error.code : undefined;
  const message =
    typeof error.message === 'string' && error.message.trim()
      ? error.message
      : undefined;

  if (code === INVALID_PASSWORD_ERROR || message === INVALID_PASSWORD_ERROR) {
    return INVALID_PASSWORD_MESSAGE;
  }

  return message ?? ADMIN_LOGIN_FALLBACK_MESSAGE;
}
