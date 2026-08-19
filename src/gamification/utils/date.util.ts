// ─────────────────────────────────────────────────────────────────────────────
// Date Utility — Pure helpers for date comparison used in gamification logic.
// These functions have no side effects and are safe to call from any service.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a Date object representing the start of the current day (midnight).
 */
export function startOfToday(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

/**
 * Returns a Date object representing the start of tomorrow (midnight).
 */
export function startOfTomorrow(): Date {
  const d = startOfToday();
  d.setDate(d.getDate() + 1);
  return d;
}

/**
 * Returns a Date object representing the start of yesterday (midnight).
 */
export function startOfYesterday(): Date {
  const d = startOfToday();
  d.setDate(d.getDate() - 1);
  return d;
}

/**
 * Returns true if two Date values fall on the same calendar day.
 */
export function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Normalizes a Firestore Timestamp or a raw Date/string value to a plain Date.
 * Returns null if the value is null or undefined.
 */
export function toDate(value: any): Date | null {
  if (!value) return null;
  if (value.toDate && typeof value.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  return new Date(value);
}

/**
 * Determines whether a completedAt timestamp was recorded today.
 * Accepts Firestore Timestamps, Dates, and ISO strings.
 */
export function isCompletedToday(completedAt: any): boolean {
  const date = toDate(completedAt);
  if (!date) return false;
  return isSameCalendarDay(date, new Date());
}
