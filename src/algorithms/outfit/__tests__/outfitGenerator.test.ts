import { describe, it, expect } from 'vitest';
import { generateDailyOutfits } from '../outfitGenerator';
import type { ClosetItem, ClothingCategory, TripActivity } from '../../../types';
import type { WeatherForecast, TripDay, DailyOutfit } from '../../../types';

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makeItem(
  id: string,
  category: ClothingCategory,
  overrides: Partial<ClosetItem> = {},
): ClosetItem {
  return {
    id,
    userId: 'user-test',
    name: 'Test item',
    category,
    color: 'black',       // neutral by default — won't interfere with color tests
    material: 'cotton',
    warmthScore: 3,
    formalityScore: 3,    // mid-range — passes most activity filters
    imageUrl: null,
    tags: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeWeather(overrides: Partial<WeatherForecast> = {}): WeatherForecast {
  return {
    date: '2026-04-01',
    temperatureHigh: 20,
    temperatureLow: 12,
    rainProbability: 10,
    ...overrides,
  };
}

/**
 * Build a TripDay with one outfit slot per activity entry.
 * Each slot pre-fills date and weatherContext; items are left empty because
 * generateDailyOutfits is responsible for filling them.
 */
function makeDay(
  date: string,
  activities: TripActivity[],
): TripDay {
  const slots: DailyOutfit[] = activities.map((activity) => ({
    date,
    activity,
    weatherContext: makeWeather({ date }),
    items: [],
  }));

  return { date, tripId: 'trip-test', outfits: slots };
}

/**
 * Minimal capsule for most tests — one each of the three required categories,
 * all neutral (black) and mid-formality so they pass every activity filter.
 */
function baseCloset(): ClosetItem[] {
  return [
    makeItem('top-1',      'tops'),
    makeItem('bottom-1',   'bottoms'),
    makeItem('footwear-1', 'footwear'),
  ];
}

// ---------------------------------------------------------------------------
// 1. Required category coverage
// ---------------------------------------------------------------------------

describe('required category coverage', () => {
  it('every outfit contains a top, bottom, and footwear', () => {
    const outfits = generateDailyOutfits(
      baseCloset(),
      [makeDay('2026-04-01', ['casual'])],
    );

    expect(outfits).toHaveLength(1);

    const categories = outfits[0].items.map((i) => i.category);
    expect(categories).toContain('tops');
    expect(categories).toContain('bottoms');
    expect(categories).toContain('footwear');
  });

  it('outfit only contains categories present in the capsule', () => {
    // No outerwear or accessories in the capsule — they must not appear
    const outfits = generateDailyOutfits(
      baseCloset(),
      [makeDay('2026-04-01', ['casual'])],
    );

    const categories = outfits[0].items.map((i) => i.category);
    expect(categories).not.toContain('outerwear');
    expect(categories).not.toContain('accessories');
  });

  it('includes optional outerwear when present in capsule', () => {
    const capsule = [...baseCloset(), makeItem('coat-1', 'outerwear')];
    const outfits = generateDailyOutfits(capsule, [makeDay('2026-04-01', ['casual'])]);

    const categories = outfits[0].items.map((i) => i.category);
    expect(categories).toContain('outerwear');
  });

  it('includes one accessory when present in capsule', () => {
    const capsule = [...baseCloset(), makeItem('acc-1', 'accessories')];
    const outfits = generateDailyOutfits(capsule, [makeDay('2026-04-01', ['casual'])]);

    const accessories = outfits[0].items.filter((i) => i.category === 'accessories');
    expect(accessories).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 2. Activity formality filtering
// ---------------------------------------------------------------------------

describe('activity formality filtering', () => {
  /**
   * Capsule with two tops — one casual (formality 1), one formal (formality 5).
   * The activity under test determines which one passes the filter.
   */
  const mixedFormalityCapsule = (): ClosetItem[] => [
    makeItem('top-casual',  'tops',     { formalityScore: 1 }),
    makeItem('top-formal',  'tops',     { formalityScore: 5 }),
    makeItem('bottom-1',    'bottoms',  { formalityScore: 3 }),
    makeItem('footwear-1',  'footwear', { formalityScore: 3 }),
  ];

  it('beach activity only selects casual tops (formalityScore 1–2)', () => {
    const outfits = generateDailyOutfits(
      mixedFormalityCapsule(),
      [makeDay('2026-04-01', ['beach'])],
    );

    const tops = outfits[0].items.filter((i) => i.category === 'tops');
    expect(tops).toHaveLength(1);
    expect(tops[0].id).toBe('top-casual');
  });

  it('business activity only selects formal tops (formalityScore 3–5)', () => {
    const outfits = generateDailyOutfits(
      mixedFormalityCapsule(),
      [makeDay('2026-04-01', ['business'])],
    );

    const tops = outfits[0].items.filter((i) => i.category === 'tops');
    expect(tops).toHaveLength(1);
    expect(tops[0].id).toBe('top-formal');
  });

  it('dining activity accepts mid-range formality (formalityScore 2–4)', () => {
    // formalityScore 3 is squarely in the dining window (2–4)
    const outfits = generateDailyOutfits(
      baseCloset(),
      [makeDay('2026-04-01', ['dining'])],
    );

    const tops = outfits[0].items.filter((i) => i.category === 'tops');
    expect(tops).toHaveLength(1);
  });

  it('outfit has no top when no top passes the activity formality filter', () => {
    // Only a formality-1 top in capsule; business requires 3–5
    const capsule = [
      makeItem('top-too-casual', 'tops',     { formalityScore: 1 }),
      makeItem('bottom-1',       'bottoms',  { formalityScore: 4 }),
      makeItem('footwear-1',     'footwear', { formalityScore: 4 }),
    ];

    const outfits = generateDailyOutfits(capsule, [makeDay('2026-04-01', ['business'])]);
    const tops = outfits[0].items.filter((i) => i.category === 'tops');

    // Known limitation: no fallback implemented yet — top slot is simply empty
    expect(tops).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Streak tracking
// ---------------------------------------------------------------------------

describe('streak tracking', () => {
  /**
   * Capsule designed specifically for streak tests:
   *   - Two neutral tops (A and B) so we can observe which is chosen each day
   *   - Two bottoms and two footwear pairs to prevent them from hitting the
   *     streak limit and masking the top-streak behaviour
   */
  const streakCloset = (): ClosetItem[] => [
    makeItem('top-A',      'tops',     { color: 'black' }),
    makeItem('top-B',      'tops',     { color: 'white' }),
    makeItem('bottom-1',   'bottoms',  { color: 'black' }),
    makeItem('bottom-2',   'bottoms',  { color: 'white' }),
    makeItem('footwear-1', 'footwear', { color: 'black' }),
    makeItem('footwear-2', 'footwear', { color: 'white' }),
  ];

  it('the same item can be worn on two consecutive days', () => {
    const days = [
      makeDay('2026-04-01', ['casual']),
      makeDay('2026-04-02', ['casual']),
    ];

    const outfits = generateDailyOutfits(streakCloset(), days);

    // Both days should have a top
    const topDay1 = outfits[0].items.find((i) => i.category === 'tops');
    const topDay2 = outfits[1].items.find((i) => i.category === 'tops');
    expect(topDay1).toBeDefined();
    expect(topDay2).toBeDefined();

    // The same neutral top is selected both days (top-A is black and comes first)
    expect(topDay1!.id).toBe(topDay2!.id);
  });

  it('an item worn 2 consecutive days is excluded on the 3rd day', () => {
    const days = [
      makeDay('2026-04-01', ['casual']),
      makeDay('2026-04-02', ['casual']),
      makeDay('2026-04-03', ['casual']),
    ];

    const outfits = generateDailyOutfits(streakCloset(), days);

    const topDay1 = outfits[0].items.find((i) => i.category === 'tops')!;
    const topDay2 = outfits[1].items.find((i) => i.category === 'tops')!;
    const topDay3 = outfits[2].items.find((i) => i.category === 'tops')!;

    // Days 1 and 2 use the same top
    expect(topDay1.id).toBe(topDay2.id);

    // Day 3 must use a different top — the previous one is on a streak
    expect(topDay3.id).not.toBe(topDay1.id);
  });

  it('a rested item becomes available again after one rest day', () => {
    // 4 days: top-A worn day 1+2, rested day 3, available again day 4
    const days = [
      makeDay('2026-04-01', ['casual']),
      makeDay('2026-04-02', ['casual']),
      makeDay('2026-04-03', ['casual']),
      makeDay('2026-04-04', ['casual']),
    ];

    const outfits = generateDailyOutfits(streakCloset(), days);

    const topDay1 = outfits[0].items.find((i) => i.category === 'tops')!;
    const topDay3 = outfits[2].items.find((i) => i.category === 'tops')!;
    const topDay4 = outfits[3].items.find((i) => i.category === 'tops')!;

    // Day 3 forces top-B (top-A is on streak)
    expect(topDay3.id).not.toBe(topDay1.id);

    // Day 4: top-A has rested one day — it is available and neutral-preferred,
    // so it is selected again
    expect(topDay4.id).toBe(topDay1.id);
  });

  it('days are processed chronologically regardless of input order', () => {
    // Pass days in reverse order — streak should still apply correctly
    const daysReversed = [
      makeDay('2026-04-03', ['casual']),
      makeDay('2026-04-01', ['casual']),
      makeDay('2026-04-02', ['casual']),
    ];

    const daysForward = [
      makeDay('2026-04-01', ['casual']),
      makeDay('2026-04-02', ['casual']),
      makeDay('2026-04-03', ['casual']),
    ];

    const outfitsReversed = generateDailyOutfits(streakCloset(), daysReversed);
    const outfitsForward  = generateDailyOutfits(streakCloset(), daysForward);

    // Results are always sorted by date, so top selections must match
    const topIdsFwd = outfitsForward.map(
      (o) => o.items.find((i) => i.category === 'tops')?.id,
    );
    const topIdsRev = outfitsReversed.map(
      (o) => o.items.find((i) => i.category === 'tops')?.id,
    );

    expect(topIdsRev).toEqual(topIdsFwd);
  });
});

// ---------------------------------------------------------------------------
// 4. Color compatibility ranking
// ---------------------------------------------------------------------------

describe('color compatibility ranking', () => {
  it('prefers a neutral-colored top over a non-neutral one', () => {
    const capsule = [
      makeItem('top-red',   'tops',    { color: 'red' }),   // non-neutral
      makeItem('top-black', 'tops',    { color: 'black' }), // neutral
      makeItem('bottom-1',  'bottoms'),
      makeItem('shoe-1',    'footwear'),
    ];

    const outfits = generateDailyOutfits(capsule, [makeDay('2026-04-01', ['casual'])]);
    const top = outfits[0].items.find((i) => i.category === 'tops');

    expect(top?.id).toBe('top-black');
  });

  it('color comparison is case-insensitive', () => {
    // 'Black' (capitalised) should still be treated as neutral
    const capsule = [
      makeItem('top-red',   'tops',    { color: 'Red' }),
      makeItem('top-black', 'tops',    { color: 'Black' }),
      makeItem('bottom-1',  'bottoms'),
      makeItem('shoe-1',    'footwear'),
    ];

    const outfits = generateDailyOutfits(capsule, [makeDay('2026-04-01', ['casual'])]);
    const top = outfits[0].items.find((i) => i.category === 'tops');

    expect(top?.id).toBe('top-black');
  });

  it('all recognised neutral colors are preferred', () => {
    const neutralColors = ['black', 'white', 'grey', 'gray', 'navy', 'beige', 'cream', 'brown', 'tan', 'ivory'];

    for (const color of neutralColors) {
      const capsule = [
        makeItem('top-bright',   'tops',    { color: 'red' }),
        makeItem('top-neutral',  'tops',    { color }),
        makeItem('bottom-1',     'bottoms'),
        makeItem('shoe-1',       'footwear'),
      ];

      const outfits = generateDailyOutfits(capsule, [makeDay('2026-04-01', ['casual'])]);
      const top = outfits[0].items.find((i) => i.category === 'tops');

      expect(top?.id, `expected neutral color "${color}" to be preferred`).toBe('top-neutral');
    }
  });
});

// ---------------------------------------------------------------------------
// 5. Output shape
// ---------------------------------------------------------------------------

describe('output shape', () => {
  it('returns one DailyOutfit per slot across all days', () => {
    const days = [
      makeDay('2026-04-01', ['casual', 'dining']), // 2 slots
      makeDay('2026-04-02', ['casual']),            // 1 slot
    ];

    const outfits = generateDailyOutfits(baseCloset(), days);

    expect(outfits).toHaveLength(3);
  });

  it('each outfit carries the correct date and activity', () => {
    const days = [makeDay('2026-04-01', ['hiking'])];
    const outfits = generateDailyOutfits(baseCloset(), days);

    expect(outfits[0].date).toBe('2026-04-01');
    expect(outfits[0].activity).toBe('hiking');
  });

  it('each outfit carries the weather context from the input slot', () => {
    const weather = makeWeather({ temperatureHigh: 35, rainProbability: 80 });
    const day: TripDay = {
      date: '2026-04-01',
      tripId: 'trip-test',
      outfits: [{ date: '2026-04-01', activity: 'casual', weatherContext: weather, items: [] }],
    };

    const outfits = generateDailyOutfits(baseCloset(), [day]);

    expect(outfits[0].weatherContext.temperatureHigh).toBe(35);
    expect(outfits[0].weatherContext.rainProbability).toBe(80);
  });

  it('returns an empty array when given no trip days', () => {
    const outfits = generateDailyOutfits(baseCloset(), []);
    expect(outfits).toHaveLength(0);
  });

  it('returns outfits with no items when capsule is empty', () => {
    const outfits = generateDailyOutfits([], [makeDay('2026-04-01', ['casual'])]);
    expect(outfits[0].items).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 6. Multi-slot days and streak interaction
// ---------------------------------------------------------------------------

describe('multi-slot days', () => {
  it('wearing an item in one slot does not block it in a second slot on the same day', () => {
    // Streak is updated only after ALL slots for the day are processed,
    // so the same item should be available in both slots.
    const day = makeDay('2026-04-01', ['casual', 'dining']);

    // Use mid-formality items so they pass both casual and dining filters
    const capsule = [
      makeItem('top-1',      'tops',     { formalityScore: 3 }),
      makeItem('bottom-1',   'bottoms',  { formalityScore: 3 }),
      makeItem('footwear-1', 'footwear', { formalityScore: 3 }),
    ];

    const outfits = generateDailyOutfits(capsule, [day]);

    // Both slots should have a top; the same top is valid in both
    const topSlot1 = outfits[0].items.find((i) => i.category === 'tops');
    const topSlot2 = outfits[1].items.find((i) => i.category === 'tops');
    expect(topSlot1).toBeDefined();
    expect(topSlot2).toBeDefined();
  });

  it('streak increments only once per item per day even across multiple slots', () => {
    // top-A worn in 2 slots on day 1 counts as streak = 1, not 2
    // So on day 2 it is still available (streak 1 < MAX 2)
    const days = [
      makeDay('2026-04-01', ['casual', 'casual']),
      makeDay('2026-04-02', ['casual']),
    ];

    const capsule = [
      makeItem('top-A',      'tops',     { color: 'black' }),
      makeItem('top-B',      'tops',     { color: 'white' }),
      makeItem('bottom-1',   'bottoms'),
      makeItem('footwear-1', 'footwear'),
    ];

    const outfits = generateDailyOutfits(capsule, days);

    // Day 2's single slot — top-A should still be available (not at streak limit)
    const topDay2 = outfits[2].items.find((i) => i.category === 'tops');
    expect(topDay2?.id).toBe('top-A');
  });
});
