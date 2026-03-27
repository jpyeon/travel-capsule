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

/** Helper: extract toiletry labels for backward-compat assertions. */
function toiletryLabels(ctx: Partial<PackingContext> = {}) {
  return generatePackingList([], defaultContext(ctx)).toiletries.map((t) => t.label);
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
    const labels = toiletryLabels();

    expect(labels).toContain('Toothbrush & toothpaste');
    expect(labels).toContain('Deodorant');
    expect(labels).toContain('Body wash / soap');
    expect(labels).toContain('Any prescription medications');
    expect(labels).toContain('Pain reliever (e.g. ibuprofen)');
    expect(labels).toContain('Bandages / first-aid essentials');
  });

  it('adds shampoo, moisturiser, razor for trips of 3+ days', () => {
    const labels = toiletryLabels({ tripDays: 3 });
    expect(labels).toContain('Shampoo & conditioner');
    expect(labels).toContain('Moisturiser');
    expect(labels).toContain('Razor');
  });

  it('does not add shampoo for 1-day trips', () => {
    const labels = toiletryLabels({ tripDays: 1 });
    expect(labels).not.toContain('Shampoo & conditioner');
  });

  it('adds laundry pods and nail clippers for 7+ day trips', () => {
    const labels = toiletryLabels({ tripDays: 7 });
    expect(labels).toContain('Laundry detergent pods');
    expect(labels).toContain('Nail clippers');
  });

  it('adds sunscreen and after-sun for hot trips (avgTemp > 21)', () => {
    const labels = toiletryLabels({ avgTemp: 30 });
    expect(labels).toContain('Sunscreen (SPF 50+)');
    expect(labels).toContain('After-sun lotion');
  });

  it('adds sunscreen for beach trips regardless of temperature', () => {
    const labels = toiletryLabels({ avgTemp: 15, activities: ['beach'] });
    expect(labels).toContain('Sunscreen (SPF 50+)');
  });

  it('adds lip balm and hand cream for cold trips (avgTemp < 10)', () => {
    const labels = toiletryLabels({ avgTemp: 5 });
    expect(labels).toContain('Lip balm');
    expect(labels).toContain('Hand cream');
  });

  it('adds lip balm only (no hand cream) for mild trips', () => {
    const labels = toiletryLabels({ avgTemp: 15 });
    expect(labels).toContain('Lip balm');
    expect(labels).not.toContain('Hand cream');
  });

  it('adds umbrella for rainy trips (rainRisk > 40)', () => {
    const labels = toiletryLabels({ rainRisk: 60 });
    expect(labels).toContain('Compact umbrella / rain poncho');
  });

  it('adds blister care and hand sanitizer for hiking trips', () => {
    const labels = toiletryLabels({ activities: ['hiking'] });
    expect(labels).toContain('Blister care (plasters)');
    expect(labels).toContain('Hand sanitizer');
  });

  it('adds waterproof bag for beach trips', () => {
    const labels = toiletryLabels({ activities: ['beach'] });
    expect(labels).toContain('Waterproof bag (for wet swimwear)');
  });

  it('deduplicates items added by multiple rules', () => {
    // cold + skiing both add lip balm — should appear only once
    const labels = toiletryLabels({ avgTemp: 5, activities: ['skiing'] });
    const lipBalmCount = labels.filter((t) => t === 'Lip balm').length;
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
// 4. Priority tiers
// ---------------------------------------------------------------------------

describe('priority tiers', () => {
  it('marks tops, bottoms, and footwear as essential', () => {
    const top    = makeItem('top-1',  { category: 'tops' });
    const bottom = makeItem('btm-1',  { category: 'bottoms' });
    const shoe   = makeItem('shoe-1', { category: 'footwear' });

    const { clothing } = generatePackingList([makeOutfit('2026-04-01', [top, bottom, shoe])], defaultContext());

    expect(clothing.find((e) => e.itemId === 'top-1')?.priority).toBe('essential');
    expect(clothing.find((e) => e.itemId === 'btm-1')?.priority).toBe('essential');
    expect(clothing.find((e) => e.itemId === 'shoe-1')?.priority).toBe('essential');
  });

  it('marks outerwear as recommended', () => {
    const jacket = makeItem('jacket-1', { category: 'outerwear' });
    const { clothing } = generatePackingList([makeOutfit('2026-04-01', [jacket])], defaultContext());

    expect(clothing.find((e) => e.itemId === 'jacket-1')?.priority).toBe('recommended');
  });

  it('marks dresses and activewear as optional', () => {
    const dress = makeItem('dress-1', { category: 'dresses' });
    const active = makeItem('active-1', { category: 'activewear' });

    const { clothing } = generatePackingList([makeOutfit('2026-04-01', [dress, active])], defaultContext());

    expect(clothing.find((e) => e.itemId === 'dress-1')?.priority).toBe('optional');
    expect(clothing.find((e) => e.itemId === 'active-1')?.priority).toBe('optional');
  });

  it('marks core toiletries as essential', () => {
    const { toiletries } = generatePackingList([], defaultContext());

    const toothbrush = toiletries.find((t) => t.label === 'Toothbrush & toothpaste');
    const deodorant  = toiletries.find((t) => t.label === 'Deodorant');
    expect(toothbrush?.priority).toBe('essential');
    expect(deodorant?.priority).toBe('essential');
  });

  it('marks climate-specific toiletries as recommended', () => {
    const { toiletries } = generatePackingList([], defaultContext({ avgTemp: 30 }));

    const sunscreen = toiletries.find((t) => t.label === 'Sunscreen (SPF 50+)');
    expect(sunscreen?.priority).toBe('recommended');
  });

  it('marks lip balm as optional in mild weather', () => {
    const { toiletries } = generatePackingList([], defaultContext({ avgTemp: 15 }));

    const lipBalm = toiletries.find((t) => t.label === 'Lip balm');
    expect(lipBalm?.priority).toBe('optional');
  });

  it('marks lip balm as recommended in cold weather', () => {
    const { toiletries } = generatePackingList([], defaultContext({ avgTemp: 5 }));

    const lipBalm = toiletries.find((t) => t.label === 'Lip balm');
    expect(lipBalm?.priority).toBe('recommended');
  });
});

// ---------------------------------------------------------------------------
// 5. Full pipeline integration
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
    expect(clothing[0]).toEqual({ itemId: 'top-1', count: 2, priority: 'essential' });
    expect(accessories).toEqual(['Black belt']);
    expect(toiletries.map((t) => t.label)).toContain('Toothbrush & toothpaste');
  });
});
