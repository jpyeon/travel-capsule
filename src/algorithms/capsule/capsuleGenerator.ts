/**
 * Capsule Wardrobe Generator
 *
 * Pure algorithm — no DB, no HTTP, no React.
 *
 * Given a user's closet, a weather forecast, and a list of trip activities,
 * selects 6–10 items that cover all planned days with minimal redundancy.
 *
 * Pipeline:
 *   1. Filter  — remove items unsuitable for the forecasted weather
 *   2. Score   — rank remaining items on versatility, color compatibility,
 *                and weather suitability
 *   3. Select  — enforce category minimums, then fill up to the target count
 *                with the highest-scoring remaining items
 */

import type { ClosetItem, ClothingCategory } from '../../types';
import type { WeatherForecast } from '../../services/weather/weatherService';

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export interface ItemScore {
  itemId: string;
  versatility: number;       // 0–1: how well the item works across multiple activities
  colorCompatibility: number; // 0–1: how well the item pairs with the rest of the selection
  weatherSuitability: number; // 0–1: how appropriate the item is for the forecasted temps
  total: number;              // weighted sum of the three dimensions
}

export interface CapsuleWardrobe {
  items: ClosetItem[];
  scoreBreakdown: Record<string, ItemScore>; // keyed by ClosetItem.id
  generatedAt: Date;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const CAPSULE_MIN_SIZE = 6;
const CAPSULE_MAX_SIZE = 10;

/** Minimum number of items required per category. */
const CATEGORY_MINIMUMS: Partial<Record<ClothingCategory, number>> = {
  tops:      3,
  bottoms:   2,
  outerwear: 1,
  footwear:  1,
};

/** Score weights — must sum to 1. */
const SCORE_WEIGHTS = {
  versatility:        0.4,
  colorCompatibility: 0.3,
  weatherSuitability: 0.3,
} as const;

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Generate a capsule wardrobe for a trip.
 *
 * @param closetItems     All items in the user's closet.
 * @param weatherForecast Day-by-day forecast for the trip destination.
 * @param activities      Activity labels for the trip (e.g. "hiking", "dining").
 */
export function generateCapsuleWardrobe(
  closetItems: ClosetItem[],
  weatherForecast: WeatherForecast[],
  activities: string[],
): CapsuleWardrobe {
  // --- Step 1: Filter ---
  const weatherBounds = deriveWeatherBounds(weatherForecast);
  const suitable = filterByWeather(closetItems, weatherBounds);

  // --- Step 2: Score ---
  const scores = scoreItems(suitable, weatherBounds, activities);

  // --- Step 3: Select ---
  const selected = selectItems(suitable, scores);

  const scoreBreakdown: Record<string, ItemScore> = {};
  for (const score of scores) {
    if (selected.some((item) => item.id === score.itemId)) {
      scoreBreakdown[score.itemId] = score;
    }
  }

  return {
    items: selected,
    scoreBreakdown,
    generatedAt: new Date(),
  };
}

// ---------------------------------------------------------------------------
// Step 1 — Filter
// ---------------------------------------------------------------------------

/** Min/max temperature envelope across all forecast days. */
interface WeatherBounds {
  minTempC: number; // coldest low across all days
  maxTempC: number; // warmest high across all days
  maxRainProbability: number; // worst-case rain chance (0–100)
}

function deriveWeatherBounds(forecasts: WeatherForecast[]): WeatherBounds {
  if (forecasts.length === 0) {
    // No forecast data — assume mild, dry conditions rather than throwing
    return { minTempC: 15, maxTempC: 25, maxRainProbability: 0 };
  }

  return {
    minTempC:          Math.min(...forecasts.map((f) => f.temperatureLow)),
    maxTempC:          Math.max(...forecasts.map((f) => f.temperatureHigh)),
    maxRainProbability: Math.max(...forecasts.map((f) => f.rainProbability)),
  };
}

/**
 * Map a WarmthLevel (1–5) to the rough °C range it is designed for.
 *
 * WarmthLevel scale (from shared.types):
 *   1 = very lightweight (warm weather only)
 *   2 = light
 *   3 = medium
 *   4 = warm / insulating
 *   5 = heavy / cold-weather
 */
const WARMTH_TEMP_RANGE: Record<number, { minC: number; maxC: number }> = {
  1: { minC: 25, maxC: Infinity }, // e.g. tank tops, linen shirts
  2: { minC: 18, maxC: 30 },      // e.g. t-shirts, light trousers
  3: { minC: 10, maxC: 22 },      // e.g. long-sleeves, chinos
  4: { minC: 0,  maxC: 15 },      // e.g. sweaters, fleece
  5: { minC: -Infinity, maxC: 5 }, // e.g. heavy coats, ski gear
};

/**
 * Remove items whose warmth level is entirely outside the trip's temperature
 * envelope.  An item is kept if its comfortable range overlaps with [minTempC,
 * maxTempC] — a partial overlap is enough (the user may need it for one cold
 * evening even if most days are warm).
 */
function filterByWeather(items: ClosetItem[], bounds: WeatherBounds): ClosetItem[] {
  return items.filter((item) => {
    const range = WARMTH_TEMP_RANGE[item.warmthScore];
    if (!range) return true; // unknown warmth level — keep to be safe

    const itemOverlapsTripRange =
      range.minC <= bounds.maxTempC && range.maxC >= bounds.minTempC;

    return itemOverlapsTripRange;
  });
}

// ---------------------------------------------------------------------------
// Step 2 — Score
// ---------------------------------------------------------------------------

function scoreItems(
  items: ClosetItem[],
  weatherBounds: WeatherBounds,
  activities: string[],
): ItemScore[] {
  return items.map((item) => {
    const versatility        = scoreVersatility(item, activities);
    const colorCompatibility = scoreColorCompatibility(item, items);
    const weatherSuitability = scoreWeatherSuitability(item, weatherBounds);

    const total =
      versatility        * SCORE_WEIGHTS.versatility +
      colorCompatibility * SCORE_WEIGHTS.colorCompatibility +
      weatherSuitability * SCORE_WEIGHTS.weatherSuitability;

    return { itemId: item.id, versatility, colorCompatibility, weatherSuitability, total };
  });
}

/**
 * Versatility: how well does this item span the trip's activities?
 *
 * TODO: implement activity-to-formality mapping
 *       (e.g. "business" requires formalityScore ≥ 4, "beach" ≤ 2)
 *       and score by the fraction of activities this item can cover.
 */
function scoreVersatility(_item: ClosetItem, _activities: string[]): number {
  // Placeholder: treat all items as equally versatile until activity mapping is built
  return 0.5;
}

/**
 * Color compatibility: does this item pair well with others in the filtered closet?
 *
 * TODO: implement a color palette graph — neutral colors (black, white, navy,
 *       grey, beige) score highest; bold/patterned items score lower unless
 *       they appear ≤ once in the selection.
 */
function scoreColorCompatibility(_item: ClosetItem, _pool: ClosetItem[]): number {
  // Placeholder: uniform score until palette logic is implemented
  return 0.5;
}

/**
 * Weather suitability: how close is the item's warmth level to what the
 * trip actually needs?
 *
 * A warmth level that falls squarely within the trip's temperature range
 * scores 1.0; levels at the edges of the range score proportionally lower.
 */
function scoreWeatherSuitability(item: ClosetItem, bounds: WeatherBounds): number {
  const range = WARMTH_TEMP_RANGE[item.warmthScore];
  if (!range) return 0.5; // unknown — neutral score

  // How much of the item's comfortable range overlaps with the trip range?
  const overlapMin = Math.max(range.minC, bounds.minTempC);
  const overlapMax = Math.min(range.maxC, bounds.maxTempC);

  if (overlapMax <= overlapMin) return 0; // no overlap (should have been filtered, but guard anyway)

  const overlapSpan  = overlapMax - overlapMin;
  const tripSpan     = bounds.maxTempC - bounds.minTempC || 1; // avoid divide-by-zero

  // Score = overlap / trip span, clamped to [0, 1]
  return Math.min(overlapSpan / tripSpan, 1);
}

// ---------------------------------------------------------------------------
// Step 3 — Select
// ---------------------------------------------------------------------------

/**
 * Build the final item list:
 *   1. For each category with a minimum, pick the highest-scoring items
 *      until the minimum is met.
 *   2. Fill remaining slots (up to CAPSULE_MAX_SIZE) with the highest-scoring
 *      items not yet selected, regardless of category.
 *   3. Enforce CAPSULE_MIN_SIZE — throw if the closet is too sparse to meet
 *      hard minimums (caller should surface this to the user).
 */
function selectItems(items: ClosetItem[], scores: ItemScore[]): ClosetItem[] {
  const scoreById = new Map(scores.map((s) => [s.itemId, s.total]));

  // Sort pool highest-score first so greedy picks are always optimal
  const pool = [...items].sort(
    (a, b) => (scoreById.get(b.id) ?? 0) - (scoreById.get(a.id) ?? 0),
  );

  const selected: ClosetItem[] = [];
  const usedIds = new Set<string>();

  // --- Enforce category minimums ---
  for (const [category, minimum] of Object.entries(CATEGORY_MINIMUMS) as [ClothingCategory, number][]) {
    const candidates = pool.filter(
      (item) => item.category === category && !usedIds.has(item.id),
    );

    const picks = candidates.slice(0, minimum);

    // TODO: if picks.length < minimum, warn the user that their closet is
    //       missing enough items in this category for the trip.
    for (const pick of picks) {
      selected.push(pick);
      usedIds.add(pick.id);
    }
  }

  // --- Fill remaining slots ---
  const remainingSlots = CAPSULE_MAX_SIZE - selected.length;
  const fillerCandidates = pool.filter((item) => !usedIds.has(item.id));

  for (const item of fillerCandidates) {
    if (selected.length >= CAPSULE_MAX_SIZE) break;
    selected.push(item);
    usedIds.add(item.id);
  }

  if (selected.length < CAPSULE_MIN_SIZE) {
    throw new Error(
      `Cannot generate a capsule wardrobe: only ${selected.length} suitable items found ` +
      `(minimum is ${CAPSULE_MIN_SIZE}). Add more items to the closet or broaden the trip dates.`,
    );
  }

  return selected;
}
