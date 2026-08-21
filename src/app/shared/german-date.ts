/**
 * Date helpers for the German `dd.MM.yyyy` inputs used across the app.
 * Pure functions — shared by the license table and the statistics view so both
 * interpret a typed range in exactly the same way.
 */

/** Parse `dd.MM.yyyy` into a local Date at 00:00. Returns null if invalid. */
export function parseGermanDate(value: string): Date | null {
  const match = value.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!match) return null;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const year = parseInt(match[3], 10);
  const date = new Date(year, month, day);

  // new Date(2026, 1, 31) silently rolls over to 03.03. — reject that
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }
  return date;
}

/** Format a Date as `dd.MM.yyyy` */
export function formatGermanDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${day}.${month}.${date.getFullYear()}`;
}

/** Format a Date as `MM.yyyy` */
export function formatGermanMonth(date: Date): string {
  return `${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
}

/**
 * Same day of month, `months` months earlier. Clamped to the last day of the
 * target month so 31.03. minus one month becomes 28./29.02. instead of 02./03.03.
 */
export function monthsBefore(date: Date, months: number): Date {
  const target = new Date(date.getFullYear(), date.getMonth() - months, 1);
  const lastDayOfTargetMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(date.getDate(), lastDayOfTargetMonth));
  return target;
}

/** Copy of the date with the time set to 23:59:59.999, so range ends include the whole day */
export function endOfDay(date: Date): Date {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

/** Copy of the date with the time set to 00:00:00.000 */
export function startOfDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}
