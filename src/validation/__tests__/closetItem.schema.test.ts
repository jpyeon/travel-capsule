import { describe, it, expect } from 'vitest';
import { closetItemSchema, closetItemUpdateSchema } from '../closetItem.schema';

const validInput = {
  name: 'Blue T-Shirt',
  category: 'tops' as const,
  color: 'blue',
  material: 'cotton',
  warmth: 2,
  formality: 1,
  imageUrl: 'https://example.com/shirt.jpg',
  tags: ['casual', 'summer'],
};

describe('closetItemSchema', () => {
  it('accepts valid input', () => {
    const result = closetItemSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = closetItemSchema.safeParse({ ...validInput, name: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Name is required');
    }
  });

  it('rejects whitespace-only name', () => {
    const result = closetItemSchema.safeParse({ ...validInput, name: '   ' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Name is required');
    }
  });

  it('rejects missing category', () => {
    const { category: _category, ...rest } = validInput;
    const result = closetItemSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects invalid category', () => {
    const result = closetItemSchema.safeParse({ ...validInput, category: 'hats' });
    expect(result.success).toBe(false);
  });

  it('rejects warmth below 1', () => {
    const result = closetItemSchema.safeParse({ ...validInput, warmth: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects warmth above 5', () => {
    const result = closetItemSchema.safeParse({ ...validInput, warmth: 6 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer warmth', () => {
    const result = closetItemSchema.safeParse({ ...validInput, warmth: 2.5 });
    expect(result.success).toBe(false);
  });

  it('rejects formality below 1', () => {
    const result = closetItemSchema.safeParse({ ...validInput, formality: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects formality above 5', () => {
    const result = closetItemSchema.safeParse({ ...validInput, formality: 6 });
    expect(result.success).toBe(false);
  });

  it('defaults tags to empty array when omitted', () => {
    const { tags: _tags, ...rest } = validInput;
    const result = closetItemSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual([]);
    }
  });

  it('trims name', () => {
    const result = closetItemSchema.safeParse({ ...validInput, name: '  Blue T-Shirt  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Blue T-Shirt');
    }
  });
});

describe('closetItemUpdateSchema', () => {
  it('accepts partial input', () => {
    const result = closetItemUpdateSchema.safeParse({ name: 'Updated Name' });
    expect(result.success).toBe(true);
  });

  it('accepts empty object', () => {
    const result = closetItemUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects empty name when provided', () => {
    const result = closetItemUpdateSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Name is required');
    }
  });

  it('rejects invalid warmth when provided', () => {
    const result = closetItemUpdateSchema.safeParse({ warmth: 10 });
    expect(result.success).toBe(false);
  });
});
