/**
 * Parsers that turn the pre-formatted Polish date/time strings shown in the
 * demo result rows back into sortable numbers. The demo `ResultRow` only
 * carries display strings (e.g. "4:32", "12 mar 2026"), so sorting has to
 * re-derive a numeric key from them. Invalid input returns NaN, which callers
 * sort last.
 */

/** Polish month abbreviations used in the demo result rows (e.g. "12 mar 2026"). */
const PL_MONTHS: Record<string, number> = {
  sty: 0,
  lut: 1,
  mar: 2,
  kwi: 3,
  maj: 4,
  cze: 5,
  lip: 6,
  sie: 7,
  wrz: 8,
  paź: 9,
  paz: 9,
  lis: 10,
  gru: 11,
};

/** Parses a "M:SS" / "MM:SS" / "H:MM:SS" duration into total seconds. */
export function parseTimeSeconds(value: string): number {
  const parts = value.split(':').map((p) => Number(p.trim()));
  if (parts.some((n) => Number.isNaN(n))) {
    return Number.NaN;
  }
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

/** Parses a "D mon YYYY" Polish date (e.g. "6 mar 2026") into a timestamp. */
export function parseResultDate(value: string): number {
  const match = /^(\d{1,2})\s+([^\s]+)\s+(\d{4})$/.exec(value.trim());
  if (!match) {
    const fallback = Date.parse(value);
    return Number.isNaN(fallback) ? Number.NaN : fallback;
  }
  const day = Number(match[1]);
  const month = PL_MONTHS[match[2].toLowerCase()];
  const year = Number(match[3]);
  if (month === undefined) {
    return Number.NaN;
  }
  const date = new Date(year, month, day);
  // Reject overflowed dates (e.g. "31 kwi") that Date silently normalizes.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return Number.NaN;
  }
  return date.getTime();
}
