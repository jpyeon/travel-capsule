/**
 * Packing List Service
 *
 * Derives a structured packing checklist from a trip's generated daily outfits.
 *
 * Responsibilities:
 *   - Aggregate clothing items across all outfits, counting how many times
 *     each distinct item appears (i.e. how many times it needs to be packed /
 *     worn before laundry)
 *   - Collect accessory labels mentioned across outfits
 *   - Build a dynamic toiletries list based on trip length, climate, and activities
 *
 * This is a pure service — no DB, no HTTP calls.  All inputs are passed in;
 * nothing is imported from repositories or external APIs.
 */

import type { DailyOutfit, ClothingCategory, TripActivity } from '../../../types';

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

/** How many times a single clothing item appears across all planned outfits. */
export interface ClothingPackEntry {
  itemId: string;
  /** Number of outfit days this item is scheduled to be worn. */
  count: number;
}

export interface PackingList {
  /** One entry per unique clothing item, sorted by wear-count descending. */
  clothing: ClothingPackEntry[];
  /** Deduplicated list of accessory labels derived from accessory items in outfits. */
  accessories: string[];
  /** Toiletries tailored to trip length, climate, and activities. */
  toiletries: string[];
}

// ---------------------------------------------------------------------------
// Packing context
// ---------------------------------------------------------------------------

export interface PackingContext {
  /** Number of calendar days in the trip. */
  tripDays: number;
  /** Average of daily high temperatures across the forecast (°C). */
  avgTemp: number;
  /** Average rain probability across the forecast (0–100). */
  rainRisk: number;
  /** Activities planned for the trip. */
  activities: TripActivity[];
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function generatePackingList(outfits: DailyOutfit[], context: PackingContext): PackingList {
  return {
    clothing:    aggregateClothing(outfits),
    accessories: collectAccessories(outfits),
    toiletries:  buildToiletries(context),
  };
}

// ---------------------------------------------------------------------------
// Clothing aggregation
// ---------------------------------------------------------------------------

const ACCESSORY_CATEGORIES = new Set<ClothingCategory>(['accessories']);

function aggregateClothing(outfits: DailyOutfit[]): ClothingPackEntry[] {
  const countById = new Map<string, number>();

  for (const outfit of outfits) {
    for (const item of outfit.items) {
      if (ACCESSORY_CATEGORIES.has(item.category)) continue;
      countById.set(item.id, (countById.get(item.id) ?? 0) + 1);
    }
  }

  return [...countById.entries()]
    .map(([itemId, count]) => ({ itemId, count }))
    .sort((a, b) => b.count - a.count);
}

// ---------------------------------------------------------------------------
// Accessory collection
// ---------------------------------------------------------------------------

function collectAccessories(outfits: DailyOutfit[]): string[] {
  const seenIds = new Set<string>();
  const labels: string[] = [];

  for (const outfit of outfits) {
    for (const item of outfit.items) {
      if (!ACCESSORY_CATEGORIES.has(item.category)) continue;
      if (seenIds.has(item.id)) continue;
      seenIds.add(item.id);
      labels.push(item.name);
    }
  }

  return labels.sort();
}

// ---------------------------------------------------------------------------
// Dynamic toiletries
// ---------------------------------------------------------------------------

const HOT_THRESHOLD   = 21; // °C
const COLD_THRESHOLD  = 10; // °C
const RAIN_THRESHOLD  = 40; // %

function buildToiletries(ctx: PackingContext): string[] {
  // Use a Set to deduplicate items added by multiple rules
  const items = new Set<string>();
  const add = (...entries: string[]) => entries.forEach((e) => items.add(e));
  const has = (activity: TripActivity) => ctx.activities.includes(activity);

  // Core — always included
  add(
    'Toothbrush & toothpaste',
    'Deodorant',
    'Body wash / soap',
    'Any prescription medications',
    'Pain reliever (e.g. ibuprofen)',
    'Bandages / first-aid essentials',
  );

  // Trip length: 3+ days
  if (ctx.tripDays >= 3) {
    add('Shampoo & conditioner', 'Moisturiser', 'Razor');
  }

  // Trip length: 7+ days
  if (ctx.tripDays >= 7) {
    add('Nail clippers', 'Laundry detergent pods');
  }

  // Climate: hot or beach
  if (ctx.avgTemp > HOT_THRESHOLD || has('beach')) {
    add('Sunscreen (SPF 50+)', 'After-sun lotion');
  }

  // Climate: cold or skiing
  if (ctx.avgTemp < COLD_THRESHOLD || has('skiing')) {
    add('Lip balm', 'Hand cream');
  } else {
    // Mild — just lip balm
    add('Lip balm');
  }

  // Rain
  if (ctx.rainRisk > RAIN_THRESHOLD) {
    add('Compact umbrella / rain poncho');
  }

  // Activity: hiking
  if (has('hiking')) {
    add('Blister care (plasters)', 'Hand sanitizer');
  }

  // Activity: beach
  if (has('beach')) {
    add('Waterproof bag (for wet swimwear)');
  }

  return [...items];
}
