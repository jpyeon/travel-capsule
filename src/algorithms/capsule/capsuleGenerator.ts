/**
 * Capsule Wardrobe Generator
 *
 * Pure algorithm — no DB, no HTTP, no React.
 *
 * Given a user's closet, a weather forecast, and a list of trip activities,
 * selects 6–10 items optimised for the destination's forecasted conditions.
 *
 * Pipeline:
 *   1. Assess weather  — derive avgTemp (°C) and rainRisk (0–100) from the forecast
 *   2. Filter          — remove items clearly wrong for the conditions
 *   3. Score           — rank every remaining item on a versatility formula
 *   4. Minimums        — guarantee per-category floor counts (tops, bottoms, etc.)
 *   5. Fill            — append highest-scoring unused items until cap is reached
 */

import type { ClosetItem, ClothingCategory, TripActivity, TripVibe, FormalityLevel } from '../../types';
import type { WeatherForecast } from '../../services/weather/weatherService';

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export interface ItemScore {
  itemId: string;
  /** Composite score used to rank items for mandatory and filler slots. */
  versatilityScore: number;
  /** Per-dimension breakdown so callers can explain the ranking to users. */
  breakdown: {
    /** item.warmthScore × 0.3 */
    warmth: number;
    /** item.formalityScore × 0.2 */
    formality: number;
    /** item.tags.length × 0.5 — more tags → more multi-use */
    tags: number;
    /** −0.5 if trip is rainy and the item is not tagged 'waterproof', else 0 */
    rainPenalty: number;
    /** max bonus across all trip activities (category + formality match) */
    activityBonus: number;
    /** formality-match bonus derived from trip vibe, weighted 0.5× */
    vibeBonus: number;
  };
}

export interface CapsuleWardrobe {
  items: ClosetItem[];
  /** Score entry for each selected item, keyed by ClosetItem.id. */
  scoreBreakdown: Record<string, ItemScore>;
  generatedAt: Date;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const CAPSULE_MIN = 6;
const CAPSULE_MAX = 10;

/**
 * Temperature thresholds in °C (converted from the spec's 50 °F / 70 °F).
 *
 * < COLD_THRESHOLD_C  →  cold trip  (prefer insulating items)
 * > HOT_THRESHOLD_C   →  hot trip   (avoid heavy items)
 */
const COLD_THRESHOLD_C = 10; // ≈ 50 °F
const HOT_THRESHOLD_C  = 21; // ≈ 70 °F

/** Rain-risk % above which waterproof preference kicks in. */
const RAIN_RISK_THRESHOLD = 40;

const ACTIVITY_PREFERENCES: Record<TripActivity, { formality: 'low' | 'mid' | 'high'; categories: ClothingCategory[] }> = {
  beach:       { formality: 'low',  categories: ['activewear', 'dresses'] },
  hiking:      { formality: 'low',  categories: ['activewear', 'outerwear'] },
  skiing:      { formality: 'low',  categories: ['activewear', 'outerwear'] },
  business:    { formality: 'high', categories: ['tops', 'bottoms', 'outerwear', 'footwear', 'accessories'] },
  dining:      { formality: 'mid',  categories: ['tops', 'bottoms', 'dresses', 'footwear', 'accessories'] },
  nightlife:   { formality: 'mid',  categories: ['dresses', 'tops', 'accessories'] },
  sightseeing: { formality: 'low',  categories: ['tops', 'bottoms', 'outerwear', 'footwear'] },
  casual:      { formality: 'low',  categories: ['tops', 'bottoms', 'footwear'] },
};

const VIBE_FORMALITY_TARGET: Record<TripVibe, 'low' | 'mid' | 'high'> = {
  relaxed:     'low',
  adventurous: 'low',
  backpacker:  'low',
  family:      'low',
  romantic:    'mid',
  formal:      'high',
};

/**
 * Minimum items that must be included per category.
 * The generator will try to satisfy these before filling remaining slots.
 */
const CATEGORY_MINIMUMS: Partial<Record<ClothingCategory, number>> = {
  tops:      3,
  bottoms:   2,
  outerwear: 1,
  footwear:  1,
};

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Generate a capsule wardrobe for a trip.
 *
 * @param closetItems     All clothing items in the user's closet.
 * @param weatherForecast Day-by-day forecast for the trip destination.
 * @param activities      Activity labels for the trip (e.g. "hiking", "dining").
 *                        Reserved for future activity-based scoring; not yet used.
 */
export function generateCapsuleWardrobe(
  closetItems: ClosetItem[],
  weatherForecast: WeatherForecast[],
  activities: TripActivity[],
  vibe: TripVibe,
): CapsuleWardrobe {
  // --- Step 1: Assess weather conditions ---
  const { avgTemp, rainRisk } = assessWeather(weatherForecast);

  // --- Step 2: Filter items that are clearly unsuitable ---
  const suitable = filterByWeather(closetItems, avgTemp, rainRisk);

  // --- Step 3: Score every suitable item once ---
  // Scoring happens before selection so both the mandatory phase and the
  // filler phase always pick the best available item per category.
  const scores = scoreItems(suitable, rainRisk, activities, vibe);
  const scoreById = new Map(scores.map((s) => [s.itemId, s]));

  // --- Steps 4 & 5: Build the capsule ---
  const selected: ClosetItem[] = [];
  const usedIds  = new Set<string>();

  enforceCategoryMinimums(suitable, scoreById, selected, usedIds);
  fillByVersatility(suitable, scoreById, selected, usedIds);

  // Throw early if the closet is too sparse to hit the minimum capsule size.
  // The caller (service layer) should surface this error to the user.
  if (selected.length < CAPSULE_MIN) {
    throw new Error(
      `Cannot build a capsule wardrobe: only ${selected.length} suitable items found ` +
      `(minimum is ${CAPSULE_MIN}). Add more items to the closet or broaden the trip dates.`,
    );
  }

  // Attach score breakdown only for items that were actually selected
  const scoreBreakdown: Record<string, ItemScore> = {};
  for (const item of selected) {
    const score = scoreById.get(item.id);
    if (score) scoreBreakdown[item.id] = score;
  }

  return { items: selected, scoreBreakdown, generatedAt: new Date() };
}

// ---------------------------------------------------------------------------
// Step 1 — Assess weather
// ---------------------------------------------------------------------------

interface WeatherConditions {
  /** Mean of all daily temperature-high values across the forecast window (°C). */
  avgTemp: number;
  /** Mean of all daily rain-probability values (0–100). */
  rainRisk: number;
}

/**
 * Derive two scalar conditions from the forecast.
 *
 * Using temperature *highs* for avgTemp is intentional: the high is what the
 * user experiences for most of the day.  Falls back to mild/dry defaults when
 * no forecast data is present so the rest of the pipeline can still run.
 */
function assessWeather(forecasts: WeatherForecast[]): WeatherConditions {
  if (forecasts.length === 0) {
    // No forecast available — assume comfortable, dry conditions
    return { avgTemp: 20, rainRisk: 0 };
  }

  return {
    avgTemp:  mean(forecasts.map((f) => f.temperatureHigh)),
    rainRisk: mean(forecasts.map((f) => f.rainProbability)),
  };
}

// ---------------------------------------------------------------------------
// Step 2 — Filter by weather suitability
// ---------------------------------------------------------------------------

/**
 * Remove items that are clearly wrong for the forecasted conditions.
 *
 * WarmthScore scale:
 *   1 = very lightweight (tank tops, linen) — fine only above ~25 °C
 *   2 = light (t-shirts)
 *   3 = medium (long-sleeves, chinos)
 *   4 = warm (sweaters, fleece)
 *   5 = heavy (coats, ski gear) — only needed below ~5 °C
 *
 * Cold trip (avgTemp < 10 °C / ~50 °F):
 *   Drop warmthScore-1 items — they provide no insulation and waste a slot.
 *
 * Hot trip (avgTemp > 21 °C / ~70 °F):
 *   Drop warmthScore-5 items — heavy coats would be miserable to carry.
 *
 * Rainy trip (rainRisk > 40 %):
 *   We do NOT hard-filter non-waterproof items here because that would
 *   make it impossible to meet category minimums.  Instead the scoring
 *   step applies a penalty so waterproof items naturally surface to the
 *   top of the filler ranking.
 */
function filterByWeather(
  items: ClosetItem[],
  avgTemp: number,
  _rainRisk: number,
): ClosetItem[] {
  return items.filter((item) => {
    // Cold trip: exclude lightest items — they're useless below 10 °C
    if (avgTemp < COLD_THRESHOLD_C && item.warmthScore === 1) return false;

    // Hot trip: exclude heaviest items — nobody needs a ski jacket at 22 °C
    if (avgTemp > HOT_THRESHOLD_C && item.warmthScore === 5) return false;

    return true;
  });
}

// ---------------------------------------------------------------------------
// Step 3 — Score items
// ---------------------------------------------------------------------------

/**
 * Score each item on a composite versatility formula:
 *
 *   versatilityScore = warmthScore × 0.3
 *                    + formalityScore × 0.2
 *                    + tags.length × 0.5
 *                    − rainPenalty
 *
 * Rationale per dimension:
 *   warmthScore     — a moderately warm item covers more weather scenarios
 *                     than an extreme (score 1 or 5); weight 0.3
 *   formalityScore  — mid-range formality items work for more activities
 *                     (casual → smart-casual); weight 0.2
 *   tags.length     — tags are user-applied versatility signals ("everyday",
 *                     "layering", "multi-season"); weight 0.5
 *   rainPenalty     — −0.5 if the trip is rainy and the item lacks the
 *                     'waterproof' tag, nudging the selection toward
 *                     rain-appropriate items
 */
function formalityMatchBonus(itemFormality: FormalityLevel, target: 'low' | 'mid' | 'high'): number {
  if (target === 'low'  && itemFormality <= 2) return 0.3;
  if (target === 'mid'  && itemFormality >= 2 && itemFormality <= 4) return 0.2;
  if (target === 'high' && itemFormality >= 4) return 0.3;
  return 0;
}

function activityBonusForItem(item: ClosetItem, activities: TripActivity[]): number {
  return Math.max(0, ...activities.map((activity) => {
    const pref = ACTIVITY_PREFERENCES[activity];
    const categoryMatch = pref.categories.includes(item.category) ? 0.2 : 0;
    const formalityMatch = formalityMatchBonus(item.formalityScore, pref.formality);
    return categoryMatch + formalityMatch;
  }));
}

function vibeBonusForItem(item: ClosetItem, vibe: TripVibe): number {
  return formalityMatchBonus(item.formalityScore, VIBE_FORMALITY_TARGET[vibe]) * 0.5;
}

function scoreItems(items: ClosetItem[], rainRisk: number, activities: TripActivity[], vibe: TripVibe): ItemScore[] {
  return items.map((item) => {
    const warmth    = item.warmthScore    * 0.3;
    const formality = item.formalityScore * 0.2;
    const tags      = item.tags.length    * 0.5;

    // Apply rain penalty only when rain risk is high and item is not waterproof
    const rainPenalty =
      rainRisk > RAIN_RISK_THRESHOLD && !item.tags.includes('waterproof')
        ? 0.5
        : 0;

    const activityBonus = activityBonusForItem(item, activities);
    const vibeBonus     = vibeBonusForItem(item, vibe);

    const versatilityScore = Math.max(0, warmth + formality + tags + activityBonus + vibeBonus - rainPenalty);

    return {
      itemId: item.id,
      versatilityScore,
      breakdown: { warmth, formality, tags, rainPenalty, activityBonus, vibeBonus },
    };
  });
}

// ---------------------------------------------------------------------------
// Step 4 — Enforce category minimums
// ---------------------------------------------------------------------------

/**
 * For each category that has a minimum (tops ≥ 3, bottoms ≥ 2, etc.), pick
 * the highest-scoring available items until the minimum is met.
 *
 * Items selected here are marked in `usedIds` so the filler phase does not
 * pick them again.  If the closet doesn't have enough items in a category,
 * we take what's available and let the filler phase compensate; a warning
 * could be surfaced to the user here in a future iteration.
 */
function enforceCategoryMinimums(
  items: ClosetItem[],
  scoreById: Map<string, ItemScore>,
  selected: ClosetItem[],
  usedIds: Set<string>,
): void {
  // Sort once, highest score first, so every `.find()` below is optimal
  const sorted = sortByScore(items, scoreById);

  for (const [category, minimum] of Object.entries(CATEGORY_MINIMUMS) as [ClothingCategory, number][]) {
    let filled = 0;

    for (const item of sorted) {
      if (filled >= minimum) break;
      if (item.category !== category || usedIds.has(item.id)) continue;

      selected.push(item);
      usedIds.add(item.id);
      filled++;
    }
    // NOTE: if filled < minimum, the closet lacks enough items in this
    // category. The capsule will be undersized unless filler compensates.
  }
}

// ---------------------------------------------------------------------------
// Step 5 — Fill remaining slots
// ---------------------------------------------------------------------------

/**
 * After mandatory slots are filled, append the highest-scoring unused items
 * until the capsule reaches CAPSULE_MAX.
 *
 * This phase is category-agnostic — it just takes the best remaining items
 * regardless of type, so extra versatile pieces (e.g. a fourth top that
 * works for every activity) naturally bubble up.
 */
function fillByVersatility(
  items: ClosetItem[],
  scoreById: Map<string, ItemScore>,
  selected: ClosetItem[],
  usedIds: Set<string>,
): void {
  const fillers = sortByScore(items, scoreById).filter((item) => !usedIds.has(item.id));

  for (const item of fillers) {
    if (selected.length >= CAPSULE_MAX) break;
    selected.push(item);
    usedIds.add(item.id);
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/** Return a new array sorted by versatilityScore descending. */
function sortByScore(items: ClosetItem[], scoreById: Map<string, ItemScore>): ClosetItem[] {
  return [...items].sort(
    (a, b) =>
      (scoreById.get(b.id)?.versatilityScore ?? 0) -
      (scoreById.get(a.id)?.versatilityScore ?? 0),
  );
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
