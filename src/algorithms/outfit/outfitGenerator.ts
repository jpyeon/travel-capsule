/**
 * Daily Outfit Generator
 *
 * Pure algorithm — no DB, no HTTP, no React.
 *
 * Takes a capsule wardrobe (a pre-filtered set of ClosetItems) and a list of
 * TripDays (each of which already carries one or more outfit slots with an
 * activity and weather context), then fills each slot with a compatible set
 * of clothing items.
 *
 * Pipeline per outfit slot:
 *   1. Enforce category coverage  — every outfit must have a top, bottom,
 *                                    and footwear at minimum
 *   2. Filter by activity         — respect formality requirements
 *   3. Filter by streak           — avoid wearing any item more than
 *                                    2 consecutive days
 *   4. Rank by color compatibility — prefer neutral / well-pairing colors
 *   5. Pick best candidates        — greedy category fill
 */

import type { ClosetItem, ClothingCategory, TripActivity, FormalityLevel } from '../../types';
import type { DailyOutfit, TripDay, WeatherForecast } from '../../types';
import type { ISODate } from '../../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of consecutive days an item can be worn before a rest day. */
const MAX_CONSECUTIVE_DAYS = 2;

/**
 * Each activity maps to an acceptable formality window [min, max].
 * Items whose formalityScore falls outside this window are excluded.
 *
 * FormalityLevel scale: 1 (very casual) → 5 (black tie)
 *
 * TODO: expand this map as new TripActivity values are added
 */
const ACTIVITY_FORMALITY: Record<TripActivity, { min: FormalityLevel; max: FormalityLevel }> = {
  beach:       { min: 1, max: 2 },
  hiking:      { min: 1, max: 2 },
  casual:      { min: 1, max: 3 },
  sightseeing: { min: 1, max: 3 },
  dining:      { min: 2, max: 4 },
  nightlife:   { min: 3, max: 5 },
  business:    { min: 3, max: 5 },
  skiing:      { min: 1, max: 2 },
};

/**
 * Colors considered "neutral" — they pair well with almost anything and
 * score highest in color-compatibility ranking.
 *
 * TODO: replace with a full compatibility matrix once a color taxonomy is defined
 */
const NEUTRAL_COLORS = new Set([
  'black', 'white', 'grey', 'gray', 'navy', 'beige', 'cream', 'brown', 'tan', 'ivory',
]);

/** Minimum categories required for a complete outfit. */
const REQUIRED_CATEGORIES: ClothingCategory[] = ['tops', 'bottoms', 'footwear'];

// ---------------------------------------------------------------------------
// Streak tracking
// ---------------------------------------------------------------------------

/**
 * Tracks how many consecutive days each item has been worn.
 * Keyed by ClosetItem.id.
 */
type StreakMap = Map<string, number>;

function buildEmptyStreakMap(): StreakMap {
  return new Map();
}

/** Record that `itemId` was worn today; increment or start its streak. */
function recordWorn(streak: StreakMap, itemId: string): void {
  streak.set(itemId, (streak.get(itemId) ?? 0) + 1);
}

/** Record that `itemId` was NOT worn today; reset its streak to 0. */
function recordRested(streak: StreakMap, itemId: string): void {
  streak.set(itemId, 0);
}

/**
 * Return true if the item has already been worn the maximum allowed
 * consecutive days and must rest today.
 */
function isOnStreak(streak: StreakMap, itemId: string): boolean {
  return (streak.get(itemId) ?? 0) >= MAX_CONSECUTIVE_DAYS;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Generate a complete `DailyOutfit` for every outfit slot across all trip days.
 *
 * `TripDay.outfits` is treated as a list of pre-defined slots — each slot
 * already knows its `activity` and `weatherContext`; this function fills in
 * the `items`.  Days are processed in chronological order so that the streak
 * tracker stays consistent.
 *
 * @param capsuleItems  Items selected by the capsule wardrobe generator.
 * @param tripDays      Trip days sorted ascending by date.
 */
export function generateDailyOutfits(
  capsuleItems: ClosetItem[],
  tripDays: TripDay[],
): DailyOutfit[] {
  // Sort days ascending so streak tracking is deterministic
  const sortedDays = [...tripDays].sort((a, b) => a.date.localeCompare(b.date));

  const streak = buildEmptyStreakMap();
  const results: DailyOutfit[] = [];

  for (const day of sortedDays) {
    // Track which items were actually worn on this day (across all slots)
    const wornTodayIds = new Set<string>();

    for (const slot of day.outfits) {
      const outfit = buildOutfit(capsuleItems, slot.activity, slot.weatherContext, slot.date, streak);
      results.push(outfit);

      for (const item of outfit.items) {
        wornTodayIds.add(item.id);
      }
    }

    // Update streaks: worn → increment, rested → reset
    for (const item of capsuleItems) {
      if (wornTodayIds.has(item.id)) {
        recordWorn(streak, item.id);
      } else {
        recordRested(streak, item.id);
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Per-slot outfit construction
// ---------------------------------------------------------------------------

/**
 * Build a single outfit for one activity slot.
 *
 * Strategy:
 *   1. Narrow the pool to items suitable for this activity (formality check)
 *   2. Remove items currently on a streak (worn too many days in a row)
 *   3. Sort remaining items by color-compatibility score (neutral-first)
 *   4. Greedily fill required categories, then optionally add accessories
 */
function buildOutfit(
  capsuleItems: ClosetItem[],
  activity: TripActivity,
  weatherContext: WeatherForecast,
  date: ISODate,
  streak: StreakMap,
): DailyOutfit {
  // Step 1 — filter by activity formality
  const activityPool = filterByActivity(capsuleItems, activity);

  // Step 2 — filter out streaked items
  const freshPool = filterByStreak(activityPool, streak);

  // Step 3 — rank by color compatibility
  const rankedPool = rankByColorCompatibility(freshPool);

  // Step 4 — pick items to cover required categories
  const selected = pickItems(rankedPool, activity);

  // TODO: if selected is missing a required category, fall back to streaked items
  //       rather than returning an incomplete outfit.

  return {
    date,
    items: selected,
    activity,
    weatherContext,
  };
}

// ---------------------------------------------------------------------------
// Filtering helpers
// ---------------------------------------------------------------------------

/**
 * Keep only items whose formalityScore is within the activity's acceptable
 * window.  Items without a matching activity rule are kept by default.
 */
function filterByActivity(items: ClosetItem[], activity: TripActivity): ClosetItem[] {
  const rule = ACTIVITY_FORMALITY[activity];
  if (!rule) return items;

  return items.filter(
    (item) => item.formalityScore >= rule.min && item.formalityScore <= rule.max,
  );
}

/**
 * Remove items that have been worn the maximum consecutive days and need
 * to be rested.
 *
 * If filtering leaves a category without any candidates, the caller may
 * choose to re-include streaked items as a last resort (not done here —
 * see TODO in buildOutfit).
 */
function filterByStreak(items: ClosetItem[], streak: StreakMap): ClosetItem[] {
  return items.filter((item) => !isOnStreak(streak, item.id));
}

// ---------------------------------------------------------------------------
// Ranking helpers
// ---------------------------------------------------------------------------

/**
 * Sort items so that neutral / highly-compatible colors appear first.
 *
 * Current implementation is intentionally simple:
 *   - Neutral colors → score 1.0
 *   - All others     → score 0.5
 *
 * TODO: replace with a proper compatibility matrix that scores item pairs
 *       rather than individual items.  Ideally this would consider the full
 *       set of already-selected items and penalise clashing combinations.
 */
function rankByColorCompatibility(items: ClosetItem[]): ClosetItem[] {
  const colorScore = (item: ClosetItem): number =>
    NEUTRAL_COLORS.has(item.color.toLowerCase()) ? 1.0 : 0.5;

  return [...items].sort((a, b) => colorScore(b) - colorScore(a));
}

// ---------------------------------------------------------------------------
// Item selection
// ---------------------------------------------------------------------------

/**
 * Greedily fill required categories first (tops, bottoms, footwear), then
 * add an optional outerwear and one accessory if available.
 *
 * Items are already sorted by color-compatibility score, so the first
 * candidate in each category is always the best available choice.
 */
function pickItems(rankedPool: ClosetItem[], _activity: TripActivity): ClosetItem[] {
  const selected: ClosetItem[] = [];
  const usedIds = new Set<string>();

  // Helper: pick the first available item in the given category
  const pickCategory = (category: ClothingCategory): void => {
    const candidate = rankedPool.find(
      (item) => item.category === category && !usedIds.has(item.id),
    );
    if (candidate) {
      selected.push(candidate);
      usedIds.add(candidate.id);
    }
    // TODO: if no candidate found, log a warning — the capsule may be missing
    //       this category entirely for this activity + formality combination.
  };

  // Required: every outfit needs these three
  for (const category of REQUIRED_CATEGORIES) {
    pickCategory(category);
  }

  // Optional: add outerwear if the capsule includes it (e.g. for cold/rainy days)
  pickCategory('outerwear');

  // Optional: add one accessory for completeness
  // TODO: only add accessories when activity context calls for them
  //       (e.g. sunglasses for beach, scarf for cold weather)
  pickCategory('accessories');

  return selected;
}
