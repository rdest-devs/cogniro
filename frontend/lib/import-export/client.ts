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
  URL.revokeObjectURL(objectUrl);
}

export async function uploadImport(file: File): Promise<{ id: string }> {
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
  return (await r.json()) as { id: string };
}
