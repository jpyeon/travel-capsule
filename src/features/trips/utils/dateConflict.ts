import type { Trip } from '../types/trip';

/**
 * Returns true if [startDate, endDate] overlaps any existing trip's date range.
 *
 * @param excludeId - Pass the trip's own ID when editing so it doesn't
 *                    conflict with itself.
 *
 * Two date ranges [a, b] and [c, d] overlap when a <= d && b >= c.
 * All dates are ISO strings (YYYY-MM-DD), so lexicographic comparison works.
 */
export function hasDateConflict(
  trips: Trip[],
  startDate: string,
  endDate: string,
  excludeId?: string,
): boolean {
  return trips
    .filter((t) => t.id !== excludeId)
    .some((t) => startDate <= t.endDate && endDate >= t.startDate);
}
