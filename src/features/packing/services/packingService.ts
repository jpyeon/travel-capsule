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
 *   - Append a base set of travel toiletries that apply to every trip
 *
 * This is a pure service — no DB, no HTTP calls.  All inputs are passed in;
 * nothing is imported from repositories or external APIs.
 */

import type { DailyOutfit, ClothingCategory } from '../../../types';

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
  /**
   * Deduplicated list of accessory labels derived from accessory items in the
   * outfits.  Uses the item's `color + category` as a human-readable label
   * until a `name` field is added to ClosetItem.
   *
   * TODO: replace generated labels with ClosetItem.name once that field exists.
   */
  accessories: string[];
  /** Standard travel toiletries included on every packing list. */
  toiletries: string[];
}

// ---------------------------------------------------------------------------
// Base essentials
// ---------------------------------------------------------------------------

/**
 * Toiletries that should appear on every packing list regardless of
 * destination or trip length.
 *
 * TODO: make this dynamic — longer trips may need more toiletry quantity
 *       hints; tropical destinations may warrant sunscreen, etc.
 */
const BASE_TOILETRIES: readonly string[] = [
  'Toothbrush & toothpaste',
  'Deodorant',
  'Shampoo & conditioner',
  'Body wash / soap',
  'Moisturiser',
  'Sunscreen',
  'Lip balm',
  'Razor',
  'Nail clippers',
  'Any prescription medications',
  'Pain reliever (e.g. ibuprofen)',
  'Bandages / first-aid essentials',
];

/** Categories whose items are folded into `accessories` rather than `clothing`. */
const ACCESSORY_CATEGORIES = new Set<ClothingCategory>(['accessories']);

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Build a `PackingList` from a set of generated daily outfits.
 *
 * @param outfits  The full trip's `DailyOutfit[]` produced by the outfit generator.
 */
export function generatePackingList(outfits: DailyOutfit[]): PackingList {
  const clothing  = aggregateClothing(outfits);
  const accessories = collectAccessories(outfits);

  return {
    clothing,
    accessories,
    toiletries: [...BASE_TOILETRIES],
  };
}

// ---------------------------------------------------------------------------
// Clothing aggregation
// ---------------------------------------------------------------------------

/**
 * Count how many times each non-accessory clothing item appears across all
 * outfits, then return entries sorted by count descending (most-worn first).
 *
 * Items that appear more than once represent pieces that are re-worn on
 * multiple days — useful for the user to understand laundry planning.
 */
function aggregateClothing(outfits: DailyOutfit[]): ClothingPackEntry[] {
  // Map<itemId, wearCount>
  const countById = new Map<string, number>();

  for (const outfit of outfits) {
    for (const item of outfit.items) {
      // Accessories are handled separately
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

/**
 * Collect a deduplicated list of human-readable accessory labels from outfits.
 *
 * Two accessory items with the same ID are de-duped (the user only needs to
 * pack it once even if it appears across multiple days).
 *
 * TODO: once ClosetItem gains a `name` field, use that instead of the
 *       synthesised `"<color> <category>"` label.
 */
function collectAccessories(outfits: DailyOutfit[]): string[] {
  const seenIds  = new Set<string>();
  const labels: string[] = [];

  for (const outfit of outfits) {
    for (const item of outfit.items) {
      if (!ACCESSORY_CATEGORIES.has(item.category)) continue;
      if (seenIds.has(item.id)) continue;

      seenIds.add(item.id);

      // Synthesise a readable label from available fields
      const label = `${capitalise(item.color)} ${item.category}`;
      labels.push(label);
    }
  }

  return labels.sort();
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function capitalise(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
