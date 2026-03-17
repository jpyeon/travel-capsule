import { describe, it, expect } from 'vitest';
import { generatePackingList } from '../services/packingService';
import type { DailyOutfit, ClosetItem } from '../../../types';
import type { WeatherForecast } from '../../../types';

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makeItem(
  id: string,
  overrides: Partial<ClosetItem> = {},
): ClosetItem {
  return {
    id,
    userId: 'user-test',
    category: 'tops',
    color: 'black',
    material: 'cotton',
    warmthScore: 3,
    formalityScore: 3,
    imageUrl: null,
    tags: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeWeather(): WeatherForecast {
  return { date: '2026-04-01', temperatureHigh: 20, temperatureLow: 12, rainProbability: 10 };
}

function makeOutfit(date: string, items: ClosetItem[]): DailyOutfit {
  return { date, activity: 'casual', weatherContext: makeWeather(), items };
}

// ---------------------------------------------------------------------------
// 1. Clothing aggregation
// ---------------------------------------------------------------------------

describe('clothing aggregation', () => {
  it('counts each item once when it appears in a single outfit', () => {
    const top    = makeItem('top-1',  { category: 'tops' });
    const bottom = makeItem('btm-1',  { category: 'bottoms' });
    const shoe   = makeItem('shoe-1', { category: 'footwear' });

    const { clothing } = generatePackingList([makeOutfit('2026-04-01', [top, bottom, shoe])]);

    expect(clothing).toHaveLength(3);
    expect(clothing.find((e) => e.itemId === 'top-1')?.count).toBe(1);
    expect(clothing.find((e) => e.itemId === 'btm-1')?.count).toBe(1);
    expect(clothing.find((e) => e.itemId === 'shoe-1')?.count).toBe(1);
  });

  it('increments count when the same item appears across multiple outfits', () => {
    const top = makeItem('top-1', { category: 'tops' });
    const bottom = makeItem('btm-1', { category: 'bottoms' });
    const shoe = makeItem('shoe-1', { category: 'footwear' });

    const outfits = [
      makeOutfit('2026-04-01', [top, bottom, shoe]),
      makeOutfit('2026-04-02', [top, bottom, shoe]),
      makeOutfit('2026-04-03', [top, bottom, shoe]),
    ];

    const { clothing } = generatePackingList(outfits);

    expect(clothing.find((e) => e.itemId === 'top-1')?.count).toBe(3);
    expect(clothing.find((e) => e.itemId === 'btm-1')?.count).toBe(3);
    expect(clothing.find((e) => e.itemId === 'shoe-1')?.count).toBe(3);
  });

  it('sorts clothing entries by wear-count descending', () => {
    const topA = makeItem('top-A', { category: 'tops' });
    const topB = makeItem('top-B', { category: 'tops' });

    // top-A worn 3 times, top-B worn 1 time
    const outfits = [
      makeOutfit('2026-04-01', [topA, topB]),
      makeOutfit('2026-04-02', [topA]),
      makeOutfit('2026-04-03', [topA]),
    ];

    const { clothing } = generatePackingList(outfits);

    expect(clothing[0].itemId).toBe('top-A');
    expect(clothing[0].count).toBe(3);
    expect(clothing[1].itemId).toBe('top-B');
    expect(clothing[1].count).toBe(1);
  });

  it('excludes accessories from the clothing list', () => {
    const top = makeItem('top-1',  { category: 'tops' });
    const acc = makeItem('acc-1',  { category: 'accessories' });

    const { clothing } = generatePackingList([makeOutfit('2026-04-01', [top, acc])]);

    expect(clothing.every((e) => e.itemId !== 'acc-1')).toBe(true);
    expect(clothing).toHaveLength(1);
  });

  it('returns an empty clothing list when all outfits have no items', () => {
    const { clothing } = generatePackingList([makeOutfit('2026-04-01', [])]);
    expect(clothing).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Accessory collection
// ---------------------------------------------------------------------------

describe('accessory collection', () => {
  it('collects accessories as human-readable labels', () => {
    const acc = makeItem('acc-1', { category: 'accessories', color: 'black' });
    const { accessories } = generatePackingList([makeOutfit('2026-04-01', [acc])]);

    expect(accessories).toContain('Black accessories');
  });

  it('capitalises the color correctly in the label', () => {
    const acc = makeItem('acc-1', { category: 'accessories', color: 'navy' });
    const { accessories } = generatePackingList([makeOutfit('2026-04-01', [acc])]);

    expect(accessories).toContain('Navy accessories');
  });

  it('deduplicates accessories by item ID across multiple outfits', () => {
    const acc = makeItem('acc-1', { category: 'accessories', color: 'black' });

    const outfits = [
      makeOutfit('2026-04-01', [acc]),
      makeOutfit('2026-04-02', [acc]),
      makeOutfit('2026-04-03', [acc]),
    ];

    const { accessories } = generatePackingList(outfits);

    // Same item worn 3 days — should appear once in the accessories list
    expect(accessories).toHaveLength(1);
    expect(accessories[0]).toBe('Black accessories');
  });

  it('includes distinct accessories as separate entries', () => {
    const scarf     = makeItem('acc-scarf',   { category: 'accessories', color: 'red' });
    const sunglasses = makeItem('acc-sunglass', { category: 'accessories', color: 'black' });

    const { accessories } = generatePackingList([
      makeOutfit('2026-04-01', [scarf, sunglasses]),
    ]);

    expect(accessories).toHaveLength(2);
    expect(accessories).toContain('Red accessories');
    expect(accessories).toContain('Black accessories');
  });

  it('returns accessories sorted alphabetically', () => {
    const red   = makeItem('acc-red',   { category: 'accessories', color: 'red' });
    const black = makeItem('acc-black', { category: 'accessories', color: 'black' });
    const white = makeItem('acc-white', { category: 'accessories', color: 'white' });

    const { accessories } = generatePackingList([makeOutfit('2026-04-01', [red, black, white])]);

    expect(accessories).toEqual([...accessories].sort());
  });

  it('returns an empty accessories list when no outfits contain accessories', () => {
    const { accessories } = generatePackingList([
      makeOutfit('2026-04-01', [makeItem('top-1', { category: 'tops' })]),
    ]);

    expect(accessories).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Toiletries
// ---------------------------------------------------------------------------

describe('toiletries', () => {
  it('always includes the base toiletries list', () => {
    const { toiletries } = generatePackingList([makeOutfit('2026-04-01', [])]);

    expect(toiletries.length).toBeGreaterThan(0);
    expect(toiletries).toContain('Toothbrush & toothpaste');
    expect(toiletries).toContain('Deodorant');
    expect(toiletries).toContain('Sunscreen');
  });

  it('includes toiletries even when given an empty outfits array', () => {
    const { toiletries } = generatePackingList([]);
    expect(toiletries.length).toBeGreaterThan(0);
  });

  it('returns a new toiletries array each call (not a shared reference)', () => {
    const result1 = generatePackingList([]);
    const result2 = generatePackingList([]);

    expect(result1.toiletries).not.toBe(result2.toiletries);
  });
});

// ---------------------------------------------------------------------------
// 4. Full pipeline integration
// ---------------------------------------------------------------------------

describe('full packing list', () => {
  it('correctly separates clothing, accessories, and toiletries in one call', () => {
    const top = makeItem('top-1',  { category: 'tops',        color: 'white' });
    const acc = makeItem('acc-1',  { category: 'accessories', color: 'black' });

    const outfits = [
      makeOutfit('2026-04-01', [top, acc]),
      makeOutfit('2026-04-02', [top, acc]),
    ];

    const { clothing, accessories, toiletries } = generatePackingList(outfits);

    // Clothing: top appears twice
    expect(clothing).toHaveLength(1);
    expect(clothing[0]).toEqual({ itemId: 'top-1', count: 2 });

    // Accessories: acc deduped to one label
    expect(accessories).toEqual(['Black accessories']);

    // Toiletries: base list present
    expect(toiletries).toContain('Toothbrush & toothpaste');
  });
});
