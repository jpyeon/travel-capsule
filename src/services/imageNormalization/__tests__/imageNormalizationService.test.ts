import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import {
  validateImageUpload,
  normalizeProfilePhoto,
  normalizeClothingPhoto,
} from '../imageNormalizationService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a minimal valid JPEG buffer at the given dimensions using sharp. */
async function makeJpeg(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 128, g: 128, b: 128 } },
  })
    .jpeg()
    .toBuffer();
}

// ---------------------------------------------------------------------------
// validateImageUpload
// ---------------------------------------------------------------------------

describe('validateImageUpload', () => {
  it('accepts supported MIME types', async () => {
    const buf = await makeJpeg(300, 400);
    for (const mime of ['image/jpeg', 'image/png', 'image/webp', 'image/heic']) {
      expect(validateImageUpload(buf, mime, 100, 100).valid).toBe(true);
    }
  });

  it('rejects unsupported MIME types', async () => {
    const buf = await makeJpeg(300, 400);
    const result = validateImageUpload(buf, 'image/gif', 100, 100);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/unsupported/i);
  });

  it('rejects buffers exceeding 10 MB', async () => {
    // Fabricate an oversized buffer without generating a real image
    const oversized = Buffer.alloc(11 * 1024 * 1024);
    const result = validateImageUpload(oversized, 'image/jpeg', 100, 100);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/10 mb/i);
  });

  it('accepts a buffer right at the size limit', async () => {
    const atLimit = Buffer.alloc(10 * 1024 * 1024);
    const result = validateImageUpload(atLimit, 'image/jpeg', 100, 100);
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// normalizeProfilePhoto
// ---------------------------------------------------------------------------

describe('normalizeProfilePhoto', () => {
  it('outputs exactly 512×768 pixels', async () => {
    const input = await makeJpeg(800, 600);
    const output = await normalizeProfilePhoto(input);
    const meta = await sharp(output).metadata();
    expect(meta.width).toBe(512);
    expect(meta.height).toBe(768);
  });

  it('outputs a JPEG buffer', async () => {
    const input = await makeJpeg(400, 600);
    const output = await normalizeProfilePhoto(input);
    const meta = await sharp(output).metadata();
    expect(meta.format).toBe('jpeg');
  });

  it('works on portrait inputs', async () => {
    const input = await makeJpeg(300, 600);
    const output = await normalizeProfilePhoto(input);
    const meta = await sharp(output).metadata();
    expect(meta.width).toBe(512);
    expect(meta.height).toBe(768);
  });

  it('works on landscape inputs (cover crop)', async () => {
    const input = await makeJpeg(1200, 400);
    const output = await normalizeProfilePhoto(input);
    const meta = await sharp(output).metadata();
    expect(meta.width).toBe(512);
    expect(meta.height).toBe(768);
  });

  it('throws for images below minimum dimensions', async () => {
    const tooSmall = await makeJpeg(100, 200);
    await expect(normalizeProfilePhoto(tooSmall)).rejects.toThrow(/too small/i);
  });

  it('returns a Buffer', async () => {
    const input = await makeJpeg(400, 600);
    const output = await normalizeProfilePhoto(input);
    expect(Buffer.isBuffer(output)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// normalizeClothingPhoto
// ---------------------------------------------------------------------------

describe('normalizeClothingPhoto', () => {
  it('outputs exactly 512×512 pixels', async () => {
    const input = await makeJpeg(800, 600);
    const output = await normalizeClothingPhoto(input);
    const meta = await sharp(output).metadata();
    expect(meta.width).toBe(512);
    expect(meta.height).toBe(512);
  });

  it('outputs a JPEG buffer', async () => {
    const input = await makeJpeg(400, 400);
    const output = await normalizeClothingPhoto(input);
    const meta = await sharp(output).metadata();
    expect(meta.format).toBe('jpeg');
  });

  it('works on portrait inputs (cover crop to square)', async () => {
    const input = await makeJpeg(300, 800);
    const output = await normalizeClothingPhoto(input);
    const meta = await sharp(output).metadata();
    expect(meta.width).toBe(512);
    expect(meta.height).toBe(512);
  });

  it('works on landscape inputs (cover crop to square)', async () => {
    const input = await makeJpeg(1200, 300);
    const output = await normalizeClothingPhoto(input);
    const meta = await sharp(output).metadata();
    expect(meta.width).toBe(512);
    expect(meta.height).toBe(512);
  });

  it('throws for images below minimum dimensions', async () => {
    const tooSmall = await makeJpeg(100, 100);
    await expect(normalizeClothingPhoto(tooSmall)).rejects.toThrow(/too small/i);
  });

  it('accepts images exactly at the minimum (200×200)', async () => {
    const atMin = await makeJpeg(200, 200);
    const output = await normalizeClothingPhoto(atMin);
    const meta = await sharp(output).metadata();
    expect(meta.width).toBe(512);
    expect(meta.height).toBe(512);
  });
});
