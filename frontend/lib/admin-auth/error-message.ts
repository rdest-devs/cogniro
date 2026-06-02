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

const CHANGE_PASSWORD_FALLBACK_MESSAGE =
  'Nie udało się zmienić hasła. Spróbuj ponownie później.';

const CHANGE_PASSWORD_MESSAGES: Record<string, string> = {
  invalid_current_password: 'Obecne hasło jest nieprawidłowe.',
  password_mismatch: 'Nowe hasło i potwierdzenie nie są takie same.',
};

export function getChangePasswordErrorMessage(error: unknown): string {
  if (!isErrorLike(error)) {
    return CHANGE_PASSWORD_FALLBACK_MESSAGE;
  }

  const message =
    typeof error.message === 'string' && error.message.trim()
      ? error.message
      : undefined;

  if (message && message in CHANGE_PASSWORD_MESSAGES) {
    return CHANGE_PASSWORD_MESSAGES[message];
  }

  return CHANGE_PASSWORD_FALLBACK_MESSAGE;
}
