import type { ResultArchivePayload } from '@/lib/results/archivePayload';

/** UTF-8 BOM so spreadsheet apps read Polish characters in the CSV correctly. */
const UTF8_BOM = '﻿';

export interface ScoreStats {
  count: number;
  average: number | null;
  min: number | null;
  max: number | null;
}

/** Aggregate participant scores into count / average / min / max. */
export function computeScoreStats(
  scores: readonly { score: number }[],
): ScoreStats {
  let count = 0;
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  for (const { score } of scores) {
    if (!Number.isFinite(score)) {
      continue;
    }
    count += 1;
    sum += score;
    if (score < min) {
      min = score;
    }
    if (score > max) {
      max = score;
    }
  }
  if (count === 0) {
    return { count: 0, average: null, min: null, max: null };
  }
  return {
    count,
    average: Math.round((sum / count) * 100) / 100,
    min,
    max,
  };
}

/** Quote a CSV field per RFC 4180 when it contains a delimiter, quote, or newline. */
export function csvEscape(field: string): string {
  if (/[",\r\n]/.test(field)) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

function numberCell(value: number | null): string {
  return value === null ? '' : String(value);
}

export interface StatsCsvInput {
  /** Already formatted in the admin's local timezone. */
  quizDate: string;
  quizTitle: string;
  stats: ScoreStats;
}

/**
 * Build the quiz statistics CSV: one header row + one summary row.
 * Prefixed with a UTF-8 BOM so spreadsheet apps read Polish characters correctly.
 */
export function buildStatsCsv({
  quizDate,
  quizTitle,
  stats,
}: StatsCsvInput): string {
  const header = [
    'Data quizu',
    'Nazwa quizu',
    'Liczba uczestników',
    'Średni wynik',
    'Minimalny wynik',
    'Maksymalny wynik',
  ];
  const row = [
    quizDate,
    quizTitle,
    String(stats.count),
    numberCell(stats.average),
    numberCell(stats.min),
    numberCell(stats.max),
  ];
  const lines = [header, row]
    .map((cells) => cells.map(csvEscape).join(','))
    .join('\r\n');
  return `${UTF8_BOM}${lines}\r\n`;
}

/** Format an ISO timestamp in the admin's local timezone, falling back to the raw value. */
export function formatLocalDate(iso: string | undefined): string {
  if (!iso) {
    return '';
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return d.toLocaleString('pl-PL');
}

/** Build the full statistics CSV text from a result archive payload. */
export function statsCsvFromPayload(payload: ResultArchivePayload): string {
  return buildStatsCsv({
    quizDate: formatLocalDate(payload.session_stopped_at),
    quizTitle: payload.quiz_title,
    stats: computeScoreStats(payload.scores),
  });
}
