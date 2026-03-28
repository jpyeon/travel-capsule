/**
 * Estimates how full a bag is based on the packing list and luggage type.
 *
 * Pure function — no I/O, deterministic output.
 *
 * Heuristic: each item category gets a "size unit" weight. Each bag type has
 * a total capacity in size units. The ratio gives percentage used.
 */

import type { PackingList, ClothingPackEntry } from '../features/packing';
import type { LuggageSize } from '../features/trips/types/trip';

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

export type PackingStatus = 'underpacked' | 'optimal' | 'overpacked';

export interface PackingCapacityEstimate {
  /** 0–100+ (can exceed 100 if overpacked). */
  percentageUsed: number;
  status: PackingStatus;
  /** Human-readable suggestion when overpacked. */
  suggestion?: string;
}

// ---------------------------------------------------------------------------
// Size weights (arbitrary "packing units" per item)
// ---------------------------------------------------------------------------

/** Clothing items are looked up by the category stored on the ClosetItem. */
const CLOTHING_WEIGHT: Record<string, number> = {
  tops:       1,
  bottoms:    1.5,
  outerwear:  2.5,
  footwear:   3,
  dresses:    1.5,
  activewear: 1,
};
const DEFAULT_CLOTHING_WEIGHT = 1;

/** Accessories are small — flat weight per item. */
const ACCESSORY_WEIGHT = 0.5;

/** Toiletries are small — flat weight per item. */
const TOILETRY_WEIGHT = 0.3;

// ---------------------------------------------------------------------------
// Bag capacities (in the same packing units)
// ---------------------------------------------------------------------------

const BAG_CAPACITY: Record<LuggageSize, number> = {
  backpack:  12,
  'carry-on': 22,
  checked:   36,
};

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

const UNDERPACKED_THRESHOLD = 40; // % — below this the bag feels empty
const OVERPACKED_THRESHOLD  = 90; // % — above this things won't fit well

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function estimatePackingCapacity(
  packingList: PackingList,
  luggageSize: LuggageSize,
  /** Optional: map of itemId → ClothingCategory for precise clothing weights.
   *  If omitted, all clothing items default to 1 unit. */
  categoryById?: Map<string, string>,
): PackingCapacityEstimate {
  const capacity = BAG_CAPACITY[luggageSize];

  // Sum clothing
  let totalUnits = 0;
  for (const entry of packingList.clothing) {
    const cat = categoryById?.get(entry.itemId);
    const weight = cat ? (CLOTHING_WEIGHT[cat] ?? DEFAULT_CLOTHING_WEIGHT) : DEFAULT_CLOTHING_WEIGHT;
    totalUnits += weight;
  }

  // Accessories
  totalUnits += packingList.accessories.length * ACCESSORY_WEIGHT;

  // Toiletries
  totalUnits += packingList.toiletries.length * TOILETRY_WEIGHT;

  const percentageUsed = Math.round((totalUnits / capacity) * 100);

  if (percentageUsed > OVERPACKED_THRESHOLD) {
    const comfortableLimit = capacity * (OVERPACKED_THRESHOLD / 100);
    return {
      percentageUsed,
      status: 'overpacked',
      suggestion: buildOverpackedSuggestion(packingList, totalUnits, comfortableLimit),
    };
  }

  if (percentageUsed < UNDERPACKED_THRESHOLD) {
    return { percentageUsed, status: 'underpacked' };
  }

  return { percentageUsed, status: 'optimal' };
}

// ---------------------------------------------------------------------------
// Suggestion builder
// ---------------------------------------------------------------------------

function buildOverpackedSuggestion(
  packingList: PackingList,
  totalUnits: number,
  capacity: number,
): string {
  const excess = totalUnits - capacity;

  // Find optional clothing items that could be removed (least-worn first)
  const removable = packingList.clothing
    .filter((e) => e.priority === 'optional')
    .sort((a, b) => a.count - b.count);

  if (removable.length === 0) {
    return `Over capacity by ~${Math.ceil(excess)} units. Consider switching to a larger bag.`;
  }

  // Greedily remove items until we're under capacity
  let freed = 0;
  let removeCount = 0;
  for (const _entry of removable) {
    if (freed >= excess) break;
    freed += DEFAULT_CLOTHING_WEIGHT; // conservative: 1 unit per removed item
    removeCount++;
  }

  if (removeCount >= 1) {
    return `Consider removing ${removeCount} optional item${removeCount > 1 ? 's' : ''} to fit comfortably.`;
  }
  return `Over capacity by ~${Math.ceil(excess)} units. Consider switching to a larger bag.`;
}
