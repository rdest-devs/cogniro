const INVALID_PASSWORD_ERROR = 'invalid_password';
const INVALID_PASSWORD_MESSAGE = 'Nieprawidłowe hasło.';
const ADMIN_LOGIN_FALLBACK_MESSAGE =
  'Nie udało się zalogować. Spróbuj ponownie później.';

type ErrorLike = {
  message?: unknown;
};

function isErrorLike(error: unknown): error is ErrorLike {
  return typeof error === 'object' && error !== null;
}

export function getAdminLoginErrorMessage(error: unknown): string {
  if (!isErrorLike(error)) {
    return ADMIN_LOGIN_FALLBACK_MESSAGE;
  }

  const message =
    typeof error.message === 'string' && error.message.trim()
      ? error.message
      : undefined;

  if (message === INVALID_PASSWORD_ERROR) {
    return INVALID_PASSWORD_MESSAGE;
  }

  return message ?? ADMIN_LOGIN_FALLBACK_MESSAGE;
}
