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

export type PackingPriority = 'essential' | 'recommended' | 'optional';

/** How many times a single clothing item appears across all planned outfits. */
export interface ClothingPackEntry {
  itemId: string;
  /** Number of outfit days this item is scheduled to be worn. */
  count: number;
  priority: PackingPriority;
}

export interface PackingList {
  /** One entry per unique clothing item, sorted by wear-count descending. */
  clothing: ClothingPackEntry[];
  /** Deduplicated list of accessory labels derived from accessory items in outfits. */
  accessories: string[];
  /** Toiletries tailored to trip length, climate, and activities, each with a priority tier. */
  toiletries: ToiletryEntry[];
}

export interface ToiletryEntry {
  label: string;
  priority: PackingPriority;
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
  /** Whether the user has access to laundry during the trip. */
  hasLaundryAccess?: boolean;
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
const ESSENTIAL_CATEGORIES = new Set<ClothingCategory>(['tops', 'bottoms', 'footwear']);
const RECOMMENDED_CATEGORIES = new Set<ClothingCategory>(['outerwear']);

function clothingPriority(category: ClothingCategory): PackingPriority {
  if (ESSENTIAL_CATEGORIES.has(category)) return 'essential';
  if (RECOMMENDED_CATEGORIES.has(category)) return 'recommended';
  return 'optional';
}

function aggregateClothing(outfits: DailyOutfit[]): ClothingPackEntry[] {
  const countById = new Map<string, number>();
  const categoryById = new Map<string, ClothingCategory>();

  for (const outfit of outfits) {
    for (const item of outfit.items) {
      if (ACCESSORY_CATEGORIES.has(item.category)) continue;
      countById.set(item.id, (countById.get(item.id) ?? 0) + 1);
      categoryById.set(item.id, item.category);
    }
  }

  return [...countById.entries()]
    .map(([itemId, count]) => ({
      itemId,
      count,
      priority: clothingPriority(categoryById.get(itemId)!),
    }))
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

function buildToiletries(ctx: PackingContext): ToiletryEntry[] {
  // Map label → priority; first-add wins (dedup). Essential items added first.
  const items = new Map<string, PackingPriority>();
  const add = (priority: PackingPriority, ...labels: string[]) => {
    for (const label of labels) {
      if (!items.has(label)) items.set(label, priority);
    }
  };
  const has = (activity: TripActivity) => ctx.activities.includes(activity);

  // Core — always included (essential)
  add('essential',
    'Toothbrush & toothpaste',
    'Deodorant',
    'Body wash / soap',
    'Any prescription medications',
    'Pain reliever (e.g. ibuprofen)',
    'Bandages / first-aid essentials',
  );

  // Trip length: 3+ days (essential — basic hygiene)
  if (ctx.tripDays >= 3) {
    add('essential', 'Shampoo & conditioner', 'Moisturiser', 'Razor');
  }

  // Trip length: 7+ days (recommended — nice to have)
  if (ctx.tripDays >= 7) {
    add('recommended', 'Nail clippers');
    add('recommended', 'Laundry detergent pods');
  } else if (ctx.hasLaundryAccess && ctx.tripDays >= 4) {
    add('recommended', 'Laundry detergent pods');
  }

  // Climate: hot or beach (recommended)
  if (ctx.avgTemp > HOT_THRESHOLD || has('beach')) {
    add('recommended', 'Sunscreen (SPF 50+)', 'After-sun lotion');
  }

  // Climate: cold or skiing (recommended)
  if (ctx.avgTemp < COLD_THRESHOLD || has('skiing')) {
    add('recommended', 'Lip balm', 'Hand cream');
  } else {
    add('optional', 'Lip balm');
  }

  // Rain (recommended)
  if (ctx.rainRisk > RAIN_THRESHOLD) {
    add('recommended', 'Compact umbrella / rain poncho');
  }

  // Activity: hiking (recommended)
  if (has('hiking')) {
    add('recommended', 'Blister care (plasters)', 'Hand sanitizer');
  }

  // Activity: beach (recommended)
  if (has('beach')) {
    add('recommended', 'Waterproof bag (for wet swimwear)');
  }

  return [...items.entries()].map(([label, priority]) => ({ label, priority }));
}
