const ADMIN_LOCALE = 'pl-PL';

export type AdminDateFormat = 'datetime' | 'date' | 'time' | 'folder-date';

type FormatOptions = {
  timeZone?: string;
};

function parseFolderDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function parseDate(value: string, format: AdminDateFormat): Date | null {
  if (format === 'folder-date') {
    return parseFolderDate(value);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getIntlOptions(
  format: AdminDateFormat,
  timeZone?: string,
): Intl.DateTimeFormatOptions {
  const base = timeZone ? { timeZone } : {};

  if (format === 'date' || format === 'folder-date') {
    return {
      ...base,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    };
  }

  if (format === 'time') {
    return {
      ...base,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    };
  }

  return {
    ...base,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  };
}

export function formatAdminDate(
  value: string,
  format: AdminDateFormat = 'datetime',
  options: FormatOptions = {},
): string | null {
  const parsed = parseDate(value, format);
  if (!parsed) {
    return null;
  }
  return new Intl.DateTimeFormat(
    ADMIN_LOCALE,
    getIntlOptions(format, options.timeZone),
  ).format(parsed);
}
