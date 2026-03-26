import { describe, it, expect } from 'vitest';
import { generatePackingList } from '../services/packingService';
import type { PackingContext } from '../services/packingService';
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
    name: 'Test item',
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
  return { date, activity: 'casual', weatherContext: makeWeather(), items, warnings: [] };
}

/** Default mild 5-day context — used for non-toiletry tests. */
function defaultContext(overrides: Partial<PackingContext> = {}): PackingContext {
  return { tripDays: 5, avgTemp: 20, rainRisk: 10, activities: ['casual'], ...overrides };
}

// ---------------------------------------------------------------------------
// 1. Clothing aggregation
// ---------------------------------------------------------------------------

describe('clothing aggregation', () => {
  it('counts each item once when it appears in a single outfit', () => {
    const top    = makeItem('top-1',  { category: 'tops' });
    const bottom = makeItem('btm-1',  { category: 'bottoms' });
    const shoe   = makeItem('shoe-1', { category: 'footwear' });

    const { clothing } = generatePackingList([makeOutfit('2026-04-01', [top, bottom, shoe])], defaultContext());

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

    const { clothing } = generatePackingList(outfits, defaultContext());

    expect(clothing.find((e) => e.itemId === 'top-1')?.count).toBe(3);
    expect(clothing.find((e) => e.itemId === 'btm-1')?.count).toBe(3);
    expect(clothing.find((e) => e.itemId === 'shoe-1')?.count).toBe(3);
  });

  it('sorts clothing entries by wear-count descending', () => {
    const topA = makeItem('top-A', { category: 'tops' });
    const topB = makeItem('top-B', { category: 'tops' });

    const outfits = [
      makeOutfit('2026-04-01', [topA, topB]),
      makeOutfit('2026-04-02', [topA]),
      makeOutfit('2026-04-03', [topA]),
    ];

    const { clothing } = generatePackingList(outfits, defaultContext());

    expect(clothing[0].itemId).toBe('top-A');
    expect(clothing[0].count).toBe(3);
    expect(clothing[1].itemId).toBe('top-B');
    expect(clothing[1].count).toBe(1);
  });

  it('excludes accessories from the clothing list', () => {
    const top = makeItem('top-1',  { category: 'tops' });
    const acc = makeItem('acc-1',  { category: 'accessories' });

    const { clothing } = generatePackingList([makeOutfit('2026-04-01', [top, acc])], defaultContext());

    expect(clothing.every((e) => e.itemId !== 'acc-1')).toBe(true);
    expect(clothing).toHaveLength(1);
  });

  it('returns an empty clothing list when all outfits have no items', () => {
    const { clothing } = generatePackingList([makeOutfit('2026-04-01', [])], defaultContext());
    expect(clothing).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Accessory collection
// ---------------------------------------------------------------------------

describe('accessory collection', () => {
  it('collects accessories using item name', () => {
    const acc = makeItem('acc-1', { category: 'accessories', name: 'Black belt' });
    const { accessories } = generatePackingList([makeOutfit('2026-04-01', [acc])], defaultContext());

    expect(accessories).toContain('Black belt');
  });

  it('deduplicates accessories by item ID across multiple outfits', () => {
    const acc = makeItem('acc-1', { category: 'accessories', name: 'Wool scarf' });

    const outfits = [
      makeOutfit('2026-04-01', [acc]),
      makeOutfit('2026-04-02', [acc]),
      makeOutfit('2026-04-03', [acc]),
    ];

    const { accessories } = generatePackingList(outfits, defaultContext());

    expect(accessories).toHaveLength(1);
    expect(accessories[0]).toBe('Wool scarf');
  });

  it('includes distinct accessories as separate entries', () => {
    const scarf      = makeItem('acc-scarf',    { category: 'accessories', name: 'Red scarf' });
    const sunglasses = makeItem('acc-sunglass', { category: 'accessories', name: 'Sunglasses' });

    const { accessories } = generatePackingList([
      makeOutfit('2026-04-01', [scarf, sunglasses]),
    ], defaultContext());

    expect(accessories).toHaveLength(2);
    expect(accessories).toContain('Red scarf');
    expect(accessories).toContain('Sunglasses');
  });

  it('returns accessories sorted alphabetically', () => {
    const red   = makeItem('acc-red',   { category: 'accessories', name: 'Sunglasses' });
    const black = makeItem('acc-black', { category: 'accessories', name: 'Belt' });
    const white = makeItem('acc-white', { category: 'accessories', name: 'Hat' });

    const { accessories } = generatePackingList([makeOutfit('2026-04-01', [red, black, white])], defaultContext());

    expect(accessories).toEqual([...accessories].sort());
  });

  it('returns an empty accessories list when no outfits contain accessories', () => {
    const { accessories } = generatePackingList([
      makeOutfit('2026-04-01', [makeItem('top-1', { category: 'tops' })]),
    ], defaultContext());

    expect(accessories).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Toiletries — dynamic rules
// ---------------------------------------------------------------------------

describe('toiletries', () => {
  it('always includes core items regardless of context', () => {
    const { toiletries } = generatePackingList([], defaultContext());

    expect(toiletries).toContain('Toothbrush & toothpaste');
    expect(toiletries).toContain('Deodorant');
    expect(toiletries).toContain('Body wash / soap');
    expect(toiletries).toContain('Any prescription medications');
    expect(toiletries).toContain('Pain reliever (e.g. ibuprofen)');
    expect(toiletries).toContain('Bandages / first-aid essentials');
  });

  it('adds shampoo, moisturiser, razor for trips of 3+ days', () => {
    const { toiletries } = generatePackingList([], defaultContext({ tripDays: 3 }));
    expect(toiletries).toContain('Shampoo & conditioner');
    expect(toiletries).toContain('Moisturiser');
    expect(toiletries).toContain('Razor');
  });

  it('does not add shampoo for 1-day trips', () => {
    const { toiletries } = generatePackingList([], defaultContext({ tripDays: 1 }));
    expect(toiletries).not.toContain('Shampoo & conditioner');
  });

  it('adds laundry pods and nail clippers for 7+ day trips', () => {
    const { toiletries } = generatePackingList([], defaultContext({ tripDays: 7 }));
    expect(toiletries).toContain('Laundry detergent pods');
    expect(toiletries).toContain('Nail clippers');
  });

  it('adds sunscreen and after-sun for hot trips (avgTemp > 21)', () => {
    const { toiletries } = generatePackingList([], defaultContext({ avgTemp: 30 }));
    expect(toiletries).toContain('Sunscreen (SPF 50+)');
    expect(toiletries).toContain('After-sun lotion');
  });

  it('adds sunscreen for beach trips regardless of temperature', () => {
    const { toiletries } = generatePackingList([], defaultContext({ avgTemp: 15, activities: ['beach'] }));
    expect(toiletries).toContain('Sunscreen (SPF 50+)');
  });

  it('adds lip balm and hand cream for cold trips (avgTemp < 10)', () => {
    const { toiletries } = generatePackingList([], defaultContext({ avgTemp: 5 }));
    expect(toiletries).toContain('Lip balm');
    expect(toiletries).toContain('Hand cream');
  });

  it('adds lip balm only (no hand cream) for mild trips', () => {
    const { toiletries } = generatePackingList([], defaultContext({ avgTemp: 15 }));
    expect(toiletries).toContain('Lip balm');
    expect(toiletries).not.toContain('Hand cream');
  });

  it('adds umbrella for rainy trips (rainRisk > 40)', () => {
    const { toiletries } = generatePackingList([], defaultContext({ rainRisk: 60 }));
    expect(toiletries).toContain('Compact umbrella / rain poncho');
  });

  it('adds blister care and hand sanitizer for hiking trips', () => {
    const { toiletries } = generatePackingList([], defaultContext({ activities: ['hiking'] }));
    expect(toiletries).toContain('Blister care (plasters)');
    expect(toiletries).toContain('Hand sanitizer');
  });

  it('adds waterproof bag for beach trips', () => {
    const { toiletries } = generatePackingList([], defaultContext({ activities: ['beach'] }));
    expect(toiletries).toContain('Waterproof bag (for wet swimwear)');
  });

  it('deduplicates items added by multiple rules', () => {
    // cold + skiing both add lip balm — should appear only once
    const { toiletries } = generatePackingList([], defaultContext({ avgTemp: 5, activities: ['skiing'] }));
    const lipBalmCount = toiletries.filter((t) => t === 'Lip balm').length;
    expect(lipBalmCount).toBe(1);
  });

  it('returns a new toiletries array each call (not a shared reference)', () => {
    const ctx = defaultContext();
    const result1 = generatePackingList([], ctx);
    const result2 = generatePackingList([], ctx);
    expect(result1.toiletries).not.toBe(result2.toiletries);
  });
});

// ---------------------------------------------------------------------------
// 4. Full pipeline integration
// ---------------------------------------------------------------------------

describe('full packing list', () => {
  it('correctly separates clothing, accessories, and toiletries in one call', () => {
    const top = makeItem('top-1',  { category: 'tops' });
    const acc = makeItem('acc-1',  { category: 'accessories', name: 'Black belt' });

    const outfits = [
      makeOutfit('2026-04-01', [top, acc]),
      makeOutfit('2026-04-02', [top, acc]),
    ];

    const { clothing, accessories, toiletries } = generatePackingList(outfits, defaultContext());

    expect(clothing).toHaveLength(1);
    expect(clothing[0]).toEqual({ itemId: 'top-1', count: 2 });
    expect(accessories).toEqual(['Black belt']);
    expect(toiletries).toContain('Toothbrush & toothpaste');
  });
});
