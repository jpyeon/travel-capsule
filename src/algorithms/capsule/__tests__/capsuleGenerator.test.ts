import { describe, it, expect } from 'vitest';
import { generateCapsuleWardrobe } from '../capsuleGenerator';
import type { ClosetItem, ClothingCategory } from '../../../types';
import type { WeatherForecast } from '../../../services/weather/weatherService';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * Minimal ClosetItem factory.
 * Only `id` and `category` are required — all other fields default to safe
 * values that will not interfere with the tests unless explicitly overridden.
 */
function makeItem(
  id: string,
  category: ClothingCategory,
  overrides: Partial<ClosetItem> = {},
): ClosetItem {
  return {
    userId:         'user-test',
    id,
    name:           'Test item',
    category,
    color:          'black',
    material:       'cotton',
    warmthScore:    3,  // medium — comfortable 10–22 °C
    formalityScore: 2,
    imageUrl:       null,
    tags:           [],
    createdAt:      '2026-01-01T00:00:00Z',
    updatedAt:      '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

/** One forecast day with sensible defaults. */
function makeForecast(overrides: Partial<WeatherForecast> = {}): WeatherForecast {
  return {
    date:            '2026-04-01',
    temperatureHigh: 20,
    temperatureLow:  12,
    rainProbability: 10,
    ...overrides,
  };
}

/**
 * A closet suitable for a cold-weather trip.
 * All items use warmthScore 4 (sweater-weight, 0–15 °C) or 5 (heavy coat, <5 °C)
 * so they survive a filter derived from below-zero forecasts.
 *
 * Counts: 3 tops · 2 bottoms · 1 outerwear · 1 footwear = 7 items (≥ 6 minimum)
 */
function buildColdWeatherCloset(): ClosetItem[] {
  return [
    makeItem('top-cold-1', 'tops',      { warmthScore: 4 }),
    makeItem('top-cold-2', 'tops',      { warmthScore: 4 }),
    makeItem('top-cold-3', 'tops',      { warmthScore: 4 }),
    makeItem('btm-cold-1', 'bottoms',   { warmthScore: 4 }),
    makeItem('btm-cold-2', 'bottoms',   { warmthScore: 4 }),
    makeItem('out-cold-1', 'outerwear', { warmthScore: 5 }), // heavy coat
    makeItem('sho-cold-1', 'footwear',  { warmthScore: 4 }),
  ];
}

/**
 * A closet suitable for a mild-weather trip.
 * All items use warmthScore 3 (long-sleeve weight, 10–22 °C).
 *
 * Extra items are included so the filler pass has candidates to choose from,
 * giving the capsule a realistic size.
 */
function buildMildWeatherCloset(): ClosetItem[] {
  return [
    makeItem('top-1', 'tops'),
    makeItem('top-2', 'tops'),
    makeItem('top-3', 'tops'),
    makeItem('top-4', 'tops'),      // extra — eligible for filler
    makeItem('btm-1', 'bottoms'),
    makeItem('btm-2', 'bottoms'),
    makeItem('btm-3', 'bottoms'),   // extra — eligible for filler
    makeItem('out-1', 'outerwear'),
    makeItem('sho-1', 'footwear'),
    makeItem('sho-2', 'footwear'),  // extra — eligible for filler
    makeItem('acc-1', 'accessories'),
  ];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('generateCapsuleWardrobe', () => {

  it('cold weather trip includes outerwear', () => {
    // Forecast: highs of 2 °C, lows of -5 °C — clearly a cold trip.
    // warmthScore 4 (0–15 °C) and 5 (< 5 °C) items overlap this range;
    // lighter items (warmthScore 1–3) should be filtered out.
    const coldForecasts: WeatherForecast[] = [
      makeForecast({ date: '2026-01-10', temperatureHigh: 2,  temperatureLow: -5 }),
      makeForecast({ date: '2026-01-11', temperatureHigh: 1,  temperatureLow: -4 }),
      makeForecast({ date: '2026-01-12', temperatureHigh: 0,  temperatureLow: -6 }),
    ];

    const { items } = generateCapsuleWardrobe(
      buildColdWeatherCloset(),
      coldForecasts,
      ['sightseeing', 'dining'],
      'relaxed',
    );

    const outerwearItems = items.filter((item) => item.category === 'outerwear');
    expect(outerwearItems.length).toBeGreaterThanOrEqual(1);
  });


  it('capsule satisfies minimum items per category', () => {
    // The generator must always enforce:
    //   tops ≥ 3 · bottoms ≥ 2 · outerwear ≥ 1 · footwear ≥ 1
    const mildForecasts = [makeForecast()];

    const { items } = generateCapsuleWardrobe(
      buildMildWeatherCloset(),
      mildForecasts,
      ['casual'],
      'relaxed',
    );

    const countByCategory = (cat: ClothingCategory) =>
      items.filter((item) => item.category === cat).length;

    expect(countByCategory('tops')).toBeGreaterThanOrEqual(3);
    expect(countByCategory('bottoms')).toBeGreaterThanOrEqual(2);
    expect(countByCategory('outerwear')).toBeGreaterThanOrEqual(1);
    expect(countByCategory('footwear')).toBeGreaterThanOrEqual(1);
  });


  it('capsule size is between 6 and 10 items', () => {
    // Regardless of how many items are in the closet, the output must stay
    // within the [6, 10] range defined by CAPSULE_MIN_SIZE / CAPSULE_MAX_SIZE.
    const mildForecasts = [makeForecast()];

    const { items } = generateCapsuleWardrobe(
      buildMildWeatherCloset(),
      mildForecasts,
      ['casual', 'dining'],
      'relaxed',
    );

    expect(items.length).toBeGreaterThanOrEqual(6);
    expect(items.length).toBeLessThanOrEqual(10);
  });

});
