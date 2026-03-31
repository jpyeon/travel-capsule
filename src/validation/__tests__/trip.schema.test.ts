import { describe, it, expect } from 'vitest';
import { tripSchema, tripUpdateSchema } from '../trip.schema';

const validInput = {
  destination: 'Paris',
  startDate: '2026-06-01',
  endDate: '2026-06-07',
  activities: ['sightseeing', 'dining'],
  vibe: 'relaxed' as const,
  latitude: 48.8566,
  longitude: 2.3522,
  luggageSize: 'carry-on' as const,
  hasLaundryAccess: false,
};

describe('tripSchema', () => {
  it('accepts valid input', () => {
    const result = tripSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('rejects empty destination', () => {
    const result = tripSchema.safeParse({ ...validInput, destination: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing startDate', () => {
    const { startDate: _startDate, ...rest } = validInput;
    const result = tripSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects endDate before startDate', () => {
    const result = tripSchema.safeParse({ ...validInput, endDate: '2026-05-30' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const endDateIssue = result.error.issues.find((i) => i.path.includes('endDate'));
      expect(endDateIssue).toBeDefined();
    }
  });

  it('accepts same start and end date', () => {
    const result = tripSchema.safeParse({ ...validInput, endDate: '2026-06-01' });
    expect(result.success).toBe(true);
  });

  it('rejects empty activities array', () => {
    const result = tripSchema.safeParse({ ...validInput, activities: [] });
    expect(result.success).toBe(false);
  });

  it('rejects invalid vibe', () => {
    const result = tripSchema.safeParse({ ...validInput, vibe: 'party' });
    expect(result.success).toBe(false);
  });

  it('rejects latitude below -90', () => {
    const result = tripSchema.safeParse({ ...validInput, latitude: -91 });
    expect(result.success).toBe(false);
  });

  it('rejects latitude above 90', () => {
    const result = tripSchema.safeParse({ ...validInput, latitude: 91 });
    expect(result.success).toBe(false);
  });

  it('rejects longitude below -180', () => {
    const result = tripSchema.safeParse({ ...validInput, longitude: -181 });
    expect(result.success).toBe(false);
  });

  it('rejects longitude above 180', () => {
    const result = tripSchema.safeParse({ ...validInput, longitude: 181 });
    expect(result.success).toBe(false);
  });

  it('rejects invalid luggageSize', () => {
    const result = tripSchema.safeParse({ ...validInput, luggageSize: 'trunk' });
    expect(result.success).toBe(false);
  });
});

describe('tripUpdateSchema', () => {
  it('accepts partial input', () => {
    const result = tripUpdateSchema.safeParse({ destination: 'Tokyo' });
    expect(result.success).toBe(true);
  });

  it('accepts empty object', () => {
    const result = tripUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects empty destination when provided', () => {
    const result = tripUpdateSchema.safeParse({ destination: '' });
    expect(result.success).toBe(false);
  });
});
