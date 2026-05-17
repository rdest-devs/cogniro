import { z } from 'zod';

export const resultArchivePayloadSchema = z.object({
  quiz_id: z.string(),
  quiz_title: z.string(),
  session_started_at: z.string().optional(),
  session_stopped_at: z.string().optional(),
  max_score: z.number().int().nonnegative().optional(),
  scores: z.array(
    z.object({
      nickname: z.string(),
      score: z.number(),
      submitted_at: z.string(),
    }),
  ),
});

export type ResultArchivePayload = z.infer<typeof resultArchivePayloadSchema>;

export function formatArchivedScore(score: number, maxScore: number): string {
  if (maxScore <= 0) {
    return String(score);
  }
  return `${score} / ${maxScore}`;
}

/** Etykieta bez rozszerzenia `.json` (URL i API nadal używają pełnej nazwy). */
export function resultFileDisplayName(filename: string): string {
  return filename.toLowerCase().endsWith('.json')
    ? filename.slice(0, -'.json'.length)
    : filename;
}
