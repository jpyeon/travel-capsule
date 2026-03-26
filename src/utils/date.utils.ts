import type { ISODate } from '../types';

// Pure utility functions for date manipulation.
// No domain logic, no external libs.

/** Returns the number of days between two ISO dates (inclusive). */
export function daysBetween(start: ISODate, end: ISODate): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((Date.parse(end) - Date.parse(start)) / msPerDay) + 1;
}

/** Returns an array of all ISO dates from start to end, inclusive. */
export function dateRange(start: ISODate, end: ISODate): ISODate[] {
  const days = daysBetween(start, end);
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10) as ISODate;
  });
}

/** Formats an ISO date as a human-readable string (e.g. "Mar 11, 2026"). */
export function formatISODate(date: ISODate): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Short format: "5 Mar 2026" — for cards and lists. */
export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Long format: "Thu, 5 Mar 2026" — for detail headings. */
export function formatDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
