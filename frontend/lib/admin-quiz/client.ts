import type { z } from 'zod';

import type {
  AdminAssetUploadResponse,
  AdminQuizApiDetails,
  AdminQuizApiListItem,
  AdminQuizSaveResponse,
  AdminQuizUpsertPayload,
} from '@/app/types';
import {
  getStoredAdminToken,
  refreshAdminToken,
} from '@/lib/admin-auth/client';
import { BACKEND_BASE_URL, joinApiUrl } from '@/lib/backend-url';

import {
  adminAssetUploadResponseSchema,
  adminQuizApiDetailsSchema,
  adminQuizApiListSchema,
  adminQuizSaveResponseSchema,
} from './schemas';

interface ApiErrorBody {
  error?: string;
  reason?: string;
  detail?: string | Array<{ msg?: string }>;
}

export class AdminQuizApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errorCode?: string,
    public readonly reason?: string,
  ) {
    super(message);
    this.name = 'AdminQuizApiError';
  }
}

function unwrapResponsePayload(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  if ('data' in payload) {
    return (payload as { data: unknown }).data;
  }

  if ('quiz' in payload) {
    return (payload as { quiz: unknown }).quiz;
  }

  if ('items' in payload) {
    return (payload as { items: unknown }).items;
  }

  return payload;
}

async function tryParseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function toApiErrorMessage(status: number): string {
  if (status === 401 || status === 403) {
    return 'Sesja administratora wygasła. Zaloguj się ponownie.';
  }

  if (status >= 500) {
    return 'Wystąpił błąd serwera podczas komunikacji z API quizów.';
  }

  return 'Nie udało się wykonać żądania do API quizów.';
}

function toAssetUploadErrorMessage(status: number): string {
  if (status === 400) {
    return 'Nieprawidłowy typ pliku. Wybierz JPEG, PNG lub WebP.';
  }

  if (status === 413) {
    return 'Plik jest za duży. Maksymalny rozmiar to 5 MB.';
  }

  if (status >= 500) {
    return 'Serwer nie mógł przetworzyć obrazu.';
  }

  return 'Nie udało się przesłać obrazu.';
}

function getErrorMessage(errorBody: ApiErrorBody, fallback: string): string {
  if (typeof errorBody.reason === 'string' && errorBody.reason.trim()) {
    return errorBody.reason;
  }

  if (typeof errorBody.error === 'string' && errorBody.error.trim()) {
    return errorBody.error;
  }

  if (typeof errorBody.detail === 'string' && errorBody.detail.trim()) {
    return errorBody.detail;
  }

  if (Array.isArray(errorBody.detail)) {
    const firstDetail = errorBody.detail.find(
      (detail) => typeof detail.msg === 'string' && detail.msg.trim(),
    )?.msg;

    if (firstDetail) {
      return firstDetail;
    }
  }

  return fallback;
}

async function requestWithSchema<T>(
  path: string,
  schema: z.ZodSchema<T>,
  init?: RequestInit,
  hasRetried = false,
): Promise<T> {
  const token = getStoredAdminToken();
  const headers = new Headers(init?.headers);

  if (init?.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(joinApiUrl(BACKEND_BASE_URL, path), {
    ...init,
    headers,
  });

  const payload = await tryParseJson(response);
  const unwrappedPayload = unwrapResponsePayload(payload);

  if (!response.ok) {
    const errorBody = (payload ?? {}) as ApiErrorBody;
    const detailCode =
      typeof errorBody.detail === 'string' ? errorBody.detail : undefined;
    if (
      response.status === 401 &&
      errorBody.detail === 'token_expired' &&
      !hasRetried
    ) {
      try {
        await refreshAdminToken();
      } catch {
        // fall through to regular auth error
      }
      const refreshedToken = getStoredAdminToken();
      if (refreshedToken) {
        return requestWithSchema(path, schema, init, true);
      }
    }

    throw new AdminQuizApiError(
      getErrorMessage(errorBody, toApiErrorMessage(response.status)),
      response.status,
      detailCode ?? errorBody.error,
      errorBody.reason ?? detailCode,
    );
  }

  const parsed = schema.safeParse(unwrappedPayload);
  if (!parsed.success) {
    throw new AdminQuizApiError(
      `Niepoprawny format odpowiedzi API: ${parsed.error.message}`,
      500,
    );
  }

  return parsed.data;
}

export async function getAllAdminQuizzes(): Promise<AdminQuizApiListItem[]> {
  return requestWithSchema('admin/quiz/all', adminQuizApiListSchema, {
    method: 'GET',
  });
}

export async function getAdminQuiz(
  quizId: string,
): Promise<AdminQuizApiDetails> {
  return requestWithSchema(
    `admin/quiz/${encodeURIComponent(quizId)}`,
    adminQuizApiDetailsSchema,
    {
      method: 'GET',
    },
  );
}

export async function createAdminQuiz(
  payload: AdminQuizUpsertPayload,
): Promise<AdminQuizSaveResponse> {
  return requestWithSchema('admin/quiz', adminQuizSaveResponseSchema, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAdminQuiz(
  quizId: string,
  payload: AdminQuizUpsertPayload,
): Promise<AdminQuizSaveResponse> {
  return requestWithSchema(
    `admin/quiz/${encodeURIComponent(quizId)}`,
    adminQuizSaveResponseSchema,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  );
}

export async function uploadAdminAsset(
  file: File,
): Promise<AdminAssetUploadResponse> {
  const token = getStoredAdminToken();
  const formData = new FormData();
  formData.append('file', file);

  const headers = new Headers();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(joinApiUrl(BACKEND_BASE_URL, 'admin/assets'), {
    method: 'POST',
    body: formData,
    headers,
  });

  const payload = await tryParseJson(response);
  const unwrappedPayload = unwrapResponsePayload(payload);

  if (!response.ok) {
    const errorBody = (payload ?? {}) as ApiErrorBody;
    throw new AdminQuizApiError(
      getErrorMessage(errorBody, toAssetUploadErrorMessage(response.status)),
      response.status,
      errorBody.error,
      errorBody.reason,
    );
  }

  const parsed = adminAssetUploadResponseSchema.safeParse(unwrappedPayload);
  if (!parsed.success) {
    throw new AdminQuizApiError(
      `Niepoprawny format odpowiedzi API: ${parsed.error.message}`,
      500,
    );
  }

  return parsed.data;
}
