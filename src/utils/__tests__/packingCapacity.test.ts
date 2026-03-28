import { describe, it, expect } from 'vitest';
import { estimatePackingCapacity } from '../packingCapacity';
import type { PackingList, ClothingPackEntry, ToiletryEntry } from '../../features/packing';
import type { LuggageSize } from '../../features/trips/types/trip';

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makeClothing(
  itemId: string,
  overrides: Partial<ClothingPackEntry> = {},
): ClothingPackEntry {
  return { itemId, count: 1, priority: 'essential', ...overrides };
}

function makeToiletry(label: string, priority: ToiletryEntry['priority'] = 'essential'): ToiletryEntry {
  return { label, priority };
}

function makeList(overrides: Partial<PackingList> = {}): PackingList {
  return {
    clothing: [],
    accessories: [],
    toiletries: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Status thresholds
// ---------------------------------------------------------------------------

describe('estimatePackingCapacity', () => {
  it('returns underpacked for an empty packing list', () => {
    const result = estimatePackingCapacity(makeList(), 'carry-on');
    expect(result.status).toBe('underpacked');
    expect(result.percentageUsed).toBe(0);
  });

  it('returns optimal for a moderately packed carry-on', () => {
    // carry-on capacity = 22 units
    // 6 tops (6×1) + 3 bottoms (3×1.5) + 2 accessories (2×0.5) + 4 toiletries (4×0.3)
    // = 6 + 4.5 + 1 + 1.2 = 12.7 → 12.7/22 = 58% → optimal
    const list = makeList({
      clothing: [
        ...Array.from({ length: 6 }, (_, i) => makeClothing(`top-${i}`)),
        ...Array.from({ length: 3 }, (_, i) => makeClothing(`btm-${i}`)),
      ],
      accessories: ['Belt', 'Sunglasses'],
      toiletries: [
        makeToiletry('Toothbrush'),
        makeToiletry('Deodorant'),
        makeToiletry('Shampoo'),
        makeToiletry('Soap'),
      ],
    });

    const categoryById = new Map<string, string>();
    for (let i = 0; i < 6; i++) categoryById.set(`top-${i}`, 'tops');
    for (let i = 0; i < 3; i++) categoryById.set(`btm-${i}`, 'bottoms');

    const result = estimatePackingCapacity(list, 'carry-on', categoryById);
    expect(result.status).toBe('optimal');
    expect(result.percentageUsed).toBeGreaterThanOrEqual(40);
    expect(result.percentageUsed).toBeLessThanOrEqual(90);
  });

  it('returns overpacked when items exceed bag capacity', () => {
    // backpack capacity = 12 units
    // 8 tops (8×1) + 2 outerwear (2×2.5) + 1 footwear (3) = 8 + 5 + 3 = 16 → 133%
    const list = makeList({
      clothing: [
        ...Array.from({ length: 8 }, (_, i) => makeClothing(`top-${i}`)),
        makeClothing('jacket-1'),
        makeClothing('jacket-2'),
        makeClothing('shoe-1'),
      ],
    });

    const categoryById = new Map<string, string>();
    for (let i = 0; i < 8; i++) categoryById.set(`top-${i}`, 'tops');
    categoryById.set('jacket-1', 'outerwear');
    categoryById.set('jacket-2', 'outerwear');
    categoryById.set('shoe-1', 'footwear');

    const result = estimatePackingCapacity(list, 'backpack', categoryById);
    expect(result.status).toBe('overpacked');
    expect(result.percentageUsed).toBeGreaterThan(90);
    expect(result.suggestion).toBeDefined();
  });

  it('percentageUsed scales with bag size', () => {
    // Same list in different bags should produce different percentages
    const list = makeList({
      clothing: Array.from({ length: 5 }, (_, i) => makeClothing(`item-${i}`)),
      accessories: ['Belt'],
      toiletries: [makeToiletry('Toothbrush'), makeToiletry('Soap')],
    });

    const backpackResult = estimatePackingCapacity(list, 'backpack');
    const checkedResult = estimatePackingCapacity(list, 'checked');

    expect(backpackResult.percentageUsed).toBeGreaterThan(checkedResult.percentageUsed);
  });

  it('uses default weight when categoryById is not provided', () => {
    const list = makeList({
      clothing: [makeClothing('item-1'), makeClothing('item-2')],
    });

    // Without categoryById, each item = 1 unit. 2/22 = 9% → underpacked
    const result = estimatePackingCapacity(list, 'carry-on');
    expect(result.percentageUsed).toBe(Math.round((2 / 22) * 100));
  });

  it('includes accessories and toiletries in capacity calculation', () => {
    const listNoExtras = makeList({ clothing: [makeClothing('top-1')] });
    const listWithExtras = makeList({
      clothing: [makeClothing('top-1')],
      accessories: ['Belt', 'Watch', 'Scarf', 'Hat'],
      toiletries: Array.from({ length: 10 }, (_, i) => makeToiletry(`item-${i}`)),
    });

    const r1 = estimatePackingCapacity(listNoExtras, 'carry-on');
    const r2 = estimatePackingCapacity(listWithExtras, 'carry-on');

    expect(r2.percentageUsed).toBeGreaterThan(r1.percentageUsed);
  });

  it('returns optimal at exactly 40% (lower boundary)', () => {
    // backpack capacity = 12 units. 40% of 12 = 4.8 units.
    // 5 clothing items × 1 unit = 5 → 5/12 = 42% → optimal
    const list = makeList({
      clothing: Array.from({ length: 5 }, (_, i) => makeClothing(`item-${i}`)),
    });
    const result = estimatePackingCapacity(list, 'backpack');
    expect(result.status).toBe('optimal');
  });

  it('returns overpacked at exactly 91% (upper boundary)', () => {
    // carry-on capacity = 22 units. 91% = 20.02 units.
    // 20 clothing items × 1 unit = 20 → 20/22 = 91% → overpacked
    const list = makeList({
      clothing: Array.from({ length: 20 }, (_, i) => makeClothing(`item-${i}`)),
    });
    const result = estimatePackingCapacity(list, 'carry-on');
    expect(result.status).toBe('overpacked');
    expect(result.suggestion).toBeDefined();
  });

  it('uses category weight from categoryById when provided', () => {
    // 1 footwear item = 3 units (vs 1 unit default)
    const list = makeList({ clothing: [makeClothing('shoe-1')] });

    const withCategory = new Map([['shoe-1', 'footwear']]);
    const withCat = estimatePackingCapacity(list, 'carry-on', withCategory);
    const withoutCat = estimatePackingCapacity(list, 'carry-on');

    // 3/22 = 14% vs 1/22 = 5%
    expect(withCat.percentageUsed).toBeGreaterThan(withoutCat.percentageUsed);
  });

  it('handles no suggestion field when status is optimal', () => {
    const list = makeList({
      clothing: Array.from({ length: 10 }, (_, i) => makeClothing(`item-${i}`)),
    });
    const result = estimatePackingCapacity(list, 'carry-on');
    expect(result.status).toBe('optimal');
    expect(result.suggestion).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Suggestion logic
// ---------------------------------------------------------------------------

describe('overpacked suggestion', () => {
  it('suggests removing optional items when available', () => {
    // backpack = 12 units, load it past 90%
    const list = makeList({
      clothing: [
        ...Array.from({ length: 8 }, (_, i) => makeClothing(`top-${i}`, { priority: 'essential' })),
        makeClothing('dress-1', { priority: 'optional', count: 1 }),
        makeClothing('dress-2', { priority: 'optional', count: 1 }),
        makeClothing('extra-1', { priority: 'optional', count: 1 }),
      ],
    });

    const result = estimatePackingCapacity(list, 'backpack');
    expect(result.status).toBe('overpacked');
    expect(result.suggestion).toMatch(/removing.*optional/i);
  });

  it('suggests larger bag when no optional items exist', () => {
    // All essential, over capacity
    const list = makeList({
      clothing: Array.from({ length: 14 }, (_, i) =>
        makeClothing(`item-${i}`, { priority: 'essential' }),
      ),
    });

    const result = estimatePackingCapacity(list, 'backpack');
    expect(result.status).toBe('overpacked');
    expect(result.suggestion).toMatch(/larger bag/i);
  });
});
