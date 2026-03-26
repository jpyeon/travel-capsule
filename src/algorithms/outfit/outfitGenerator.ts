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
 *   4. Rank by color compatibility — context-aware pair scoring
 *   5. Pick best candidates        — greedy category fill
 *   6. Fallback                   — if a required category is still missing,
 *                                    retry without streak restriction
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

/** Minimum categories required for a complete outfit. */
const REQUIRED_CATEGORIES: ClothingCategory[] = ['tops', 'bottoms', 'footwear'];

// ---------------------------------------------------------------------------
// Color compatibility
// ---------------------------------------------------------------------------

type ColorGroup = 'neutral' | 'earth' | 'cool' | 'warm' | 'bright';

const COLOR_GROUPS: Record<ColorGroup, Set<string>> = {
  neutral: new Set([
    'black', 'white', 'grey', 'gray', 'charcoal', 'navy', 'slate', 'beige',
    'cream', 'ivory', 'tan', 'taupe', 'stone', 'sand', 'khaki', 'camel', 'brown',
  ]),
  earth: new Set([
    'olive', 'rust', 'terracotta', 'burgundy', 'wine', 'forest', 'moss',
    'sage', 'sienna', 'ochre', 'amber',
  ]),
  cool: new Set([
    'blue', 'teal', 'mint', 'lavender', 'purple', 'lilac', 'turquoise',
    'sky', 'indigo', 'violet', 'aqua', 'cyan',
  ]),
  warm: new Set([
    'red', 'orange', 'yellow', 'pink', 'coral', 'peach', 'gold',
    'mustard', 'salmon', 'magenta', 'rose',
  ]),
  // 'bright' is the catch-all for unclassified colors
  bright: new Set(),
};

/**
 * Pair compatibility scores between color groups (symmetric matrix).
 * 1.0 = perfect match, 0.0 = strong clash.
 */
const PAIR_SCORES: Record<ColorGroup, Record<ColorGroup, number>> = {
  neutral: { neutral: 1.0, earth: 0.9, cool: 0.9, warm: 0.9, bright: 0.8 },
  earth:   { neutral: 0.9, earth: 0.8, cool: 0.5, warm: 0.6, bright: 0.4 },
  cool:    { neutral: 0.9, earth: 0.5, cool: 0.7, warm: 0.3, bright: 0.5 },
  warm:    { neutral: 0.9, earth: 0.6, cool: 0.3, warm: 0.4, bright: 0.4 },
  bright:  { neutral: 0.8, earth: 0.4, cool: 0.5, warm: 0.4, bright: 0.2 },
};

/** Base score when no items are selected yet — rewards neutral/earthy tones. */
const BASE_GROUP_SCORE: Record<ColorGroup, number> = {
  neutral: 1.0,
  earth:   0.8,
  cool:    0.6,
  warm:    0.6,
  bright:  0.4,
};

function colorGroup(color: string): ColorGroup {
  const c = color.toLowerCase().trim();
  for (const [group, colors] of Object.entries(COLOR_GROUPS) as [ColorGroup, Set<string>][]) {
    if (group === 'bright') continue; // catch-all, checked last
    if (colors.has(c)) return group;
  }
  return 'bright';
}

/**
 * Score a candidate item's color compatibility against already-selected items.
 * Returns a value in [0, 1] — higher is better.
 */
function scoreCandidate(candidate: ClosetItem, selected: ClosetItem[]): number {
  const cg = colorGroup(candidate.color);
  if (selected.length === 0) return BASE_GROUP_SCORE[cg];

  const scores = selected.map((s) => PAIR_SCORES[cg][colorGroup(s.color)]);
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

/**
 * Sort items by color compatibility with already-selected items.
 * Re-call after each pick so ranking reflects the current selection context.
 */
function rankByColorCompatibility(items: ClosetItem[], selected: ClosetItem[]): ClosetItem[] {
  return [...items].sort((a, b) => scoreCandidate(b, selected) - scoreCandidate(a, selected));
}

// ---------------------------------------------------------------------------
// Streak tracking
// ---------------------------------------------------------------------------

type StreakMap = Map<string, number>;

function buildEmptyStreakMap(): StreakMap {
  return new Map();
}

function recordWorn(streak: StreakMap, itemId: string): void {
  streak.set(itemId, (streak.get(itemId) ?? 0) + 1);
}

function recordRested(streak: StreakMap, itemId: string): void {
  streak.set(itemId, 0);
}

function isOnStreak(streak: StreakMap, itemId: string): boolean {
  return (streak.get(itemId) ?? 0) >= MAX_CONSECUTIVE_DAYS;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function generateDailyOutfits(
  capsuleItems: ClosetItem[],
  tripDays: TripDay[],
): DailyOutfit[] {
  const sortedDays = [...tripDays].sort((a, b) => a.date.localeCompare(b.date));

  const streak = buildEmptyStreakMap();
  const results: DailyOutfit[] = [];

  for (const day of sortedDays) {
    const wornTodayIds = new Set<string>();

    for (const slot of day.outfits) {
      const outfit = buildOutfit(capsuleItems, slot.activity, slot.weatherContext, slot.date, streak);
      results.push(outfit);

      for (const item of outfit.items) {
        wornTodayIds.add(item.id);
      }
    }

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
 *   3. Greedily fill required categories; rank by color compatibility against
 *      already-selected items at each step
 *   4. Fallback: for any required category still missing, retry from the full
 *      activity pool (ignoring streak) before giving up
 *   5. Emit a warning for any category that remains unfilled after fallback
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

  // Step 2 — filter out streaked items for the primary attempt
  const freshPool = filterByStreak(activityPool, streak);

  // Steps 3–4 — pick items with color-aware ranking + streak fallback
  const { items: selected, warnings } = pickItems(freshPool, activityPool, activity);

  return { date, items: selected, activity, weatherContext, warnings };
}

// ---------------------------------------------------------------------------
// Filtering helpers
// ---------------------------------------------------------------------------

function filterByActivity(items: ClosetItem[], activity: TripActivity): ClosetItem[] {
  const rule = ACTIVITY_FORMALITY[activity];
  if (!rule) return items;
  return items.filter(
    (item) => item.formalityScore >= rule.min && item.formalityScore <= rule.max,
  );
}

function filterByStreak(items: ClosetItem[], streak: StreakMap): ClosetItem[] {
  return items.filter((item) => !isOnStreak(streak, item.id));
}

// ---------------------------------------------------------------------------
// Item selection
// ---------------------------------------------------------------------------

/**
 * Greedily fill required categories (tops, bottoms, footwear), then
 * optionally add outerwear and one accessory.
 *
 * Color ranking is context-aware: after each pick, the remaining pool is
 * re-ranked against the items already selected so that chosen pieces
 * coordinate with each other.
 *
 * If a required category is missing from `freshPool`, a second attempt is
 * made using `activityPool` (streak restriction lifted). Any category still
 * missing after the fallback is recorded in `warnings`.
 */
function pickItems(
  freshPool: ClosetItem[],
  activityPool: ClosetItem[],
  _activity: TripActivity,
): { items: ClosetItem[]; warnings: string[] } {
  const selected: ClosetItem[] = [];
  const usedIds = new Set<string>();

  const pick = (pool: ClosetItem[], category: ClothingCategory): ClosetItem | null => {
    const ranked = rankByColorCompatibility(
      pool.filter((i) => i.category === category && !usedIds.has(i.id)),
      selected,
    );
    const candidate = ranked[0] ?? null;
    if (candidate) {
      selected.push(candidate);
      usedIds.add(candidate.id);
    }
    return candidate;
  };

  // Primary pass — streak-filtered pool
  const missingAfterPrimary: ClothingCategory[] = [];
  for (const category of REQUIRED_CATEGORIES) {
    if (!pick(freshPool, category)) {
      missingAfterPrimary.push(category);
    }
  }

  // Fallback pass — full activity pool (streak ignored) for any gap
  const warnings: string[] = [];
  for (const category of missingAfterPrimary) {
    if (!pick(activityPool, category)) {
      warnings.push(
        `No ${category} available for ${_activity} — add more items to your closet.`,
      );
    }
  }

  // Optional additions (best-effort, no warnings if absent)
  pick(freshPool.length > 0 ? freshPool : activityPool, 'outerwear');
  pick(freshPool.length > 0 ? freshPool : activityPool, 'accessories');

  return { items: selected, warnings };
}
