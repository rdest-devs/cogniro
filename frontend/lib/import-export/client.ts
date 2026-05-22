import { getStoredAdminToken } from '@/lib/admin-auth/client';
import { BACKEND_BASE_URL, joinApiUrl } from '@/lib/backend-url';

export async function downloadExport(quizId: string): Promise<void> {
  const url = joinApiUrl(
    BACKEND_BASE_URL,
    `admin/quiz/${encodeURIComponent(quizId)}/export`,
  );
  const token = getStoredAdminToken();
  const r = await fetch(url, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!r.ok) {
    throw new Error(`Eksport nie powiódł się (${r.status})`);
  }
  const blob = await r.blob();
  const cd = r.headers.get('content-disposition') ?? '';
  const match = /filename="([^"]+)"/.exec(cd);
  const name = match?.[1] ?? `${quizId}.zip`;
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = name;
  a.click();
  // Defer revoke so the browser has time to start the download —
  // revoking synchronously after click() aborts the request in some browsers.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

export type ImportResult = {
  id: string;
  /** Archive members dropped because they exceeded the per-file size cap.
   * The editor renders broken-media placeholders so the user can re-upload them. */
  skipped: string[];
};

function parseImportResult(body: unknown): ImportResult {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('Import zwrócił nieprawidłową odpowiedź.');
  }
  const record = body as Record<string, unknown>;
  const { id, skipped } = record;
  if (typeof id !== 'string' || id.length === 0) {
    throw new Error('Import zwrócił nieprawidłowy identyfikator quizu.');
  }
  if (skipped === undefined) {
    return { id, skipped: [] };
  }
  if (
    !Array.isArray(skipped) ||
    !skipped.every((entry) => typeof entry === 'string')
  ) {
    throw new Error('Import zwrócił nieprawidłową listę pominiętych plików.');
  }
  return { id, skipped };
}

export async function uploadImport(file: File): Promise<ImportResult> {
  const url = joinApiUrl(BACKEND_BASE_URL, 'admin/quiz/import');
  const token = getStoredAdminToken();
  const fd = new FormData();
  fd.append('file', file);
  const r = await fetch(url, {
    method: 'POST',
    body: fd,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!r.ok) {
    throw new Error(`Import nie powiódł się (${r.status})`);
  }
  return parseImportResult(await r.json());
}
