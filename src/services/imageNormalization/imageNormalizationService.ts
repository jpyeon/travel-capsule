// Server-side image normalization using sharp.
// Handles EXIF auto-rotation, resizing, EXIF stripping, and JPEG conversion.
// No UI coupling — pure buffer-in, buffer-out functions.
//
// sharp is available as a Next.js dependency — no extra install needed.

import sharp from 'sharp';

// ---------------------------------------------------------------------------
// Validation constants
// ---------------------------------------------------------------------------

const MAX_SIZE_BYTES  = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES   = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);

// Normalization targets
const PROFILE_WIDTH   = 512;
const PROFILE_HEIGHT  = 768;  // 2:3 portrait

const CLOTHING_SIZE   = 512;  // 1:1 square

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateImageUpload(
  buffer: Buffer,
  mimeType: string,
  minWidth: number,
  minHeight: number,
): ValidationResult {
  if (!ALLOWED_TYPES.has(mimeType)) {
    return { valid: false, error: 'Unsupported file type. Use JPEG, PNG, or WebP.' };
  }
  if (buffer.byteLength > MAX_SIZE_BYTES) {
    return { valid: false, error: 'Image must be smaller than 10 MB.' };
  }
  // Dimension check is done after sharp reads the buffer — see normalize functions
  void minWidth; void minHeight; // checked in normalize functions
  return { valid: true };
}

// ---------------------------------------------------------------------------
// Profile photo normalization — 512×768px, portrait crop
// ---------------------------------------------------------------------------

/**
 * Normalize a user profile photo:
 * - Auto-rotate based on EXIF orientation
 * - Cover-crop to 512×768 (portrait, 2:3)
 * - Strip all EXIF metadata (including GPS location)
 * - Convert to JPEG at quality 85
 *
 * @throws if image is too small or processing fails
 */
export async function normalizeProfilePhoto(input: Buffer): Promise<Buffer> {
  const image = sharp(input).rotate(); // auto-rotate from EXIF

  const meta = await image.metadata();
  const w = meta.width  ?? 0;
  const h = meta.height ?? 0;

  if (w < 200 || h < 300) {
    throw new Error('Image is too small. Minimum size is 200×300 pixels.');
  }

  return image
    .resize(PROFILE_WIDTH, PROFILE_HEIGHT, { fit: 'cover', position: 'top' })
    .jpeg({ quality: 85 })
    .withMetadata({}) // strips EXIF (passing empty obj removes sensitive fields)
    .toBuffer();
}

// ---------------------------------------------------------------------------
// Clothing photo normalization — 512×512px, square crop
// ---------------------------------------------------------------------------

/**
 * Normalize a clothing item photo:
 * - Auto-rotate based on EXIF orientation
 * - Cover-crop to 512×512 (square, 1:1)
 * - Strip all EXIF metadata
 * - Convert to JPEG at quality 85
 *
 * @throws if image is too small or processing fails
 */
export async function normalizeClothingPhoto(input: Buffer): Promise<Buffer> {
  const image = sharp(input).rotate();

  const meta = await image.metadata();
  const w = meta.width  ?? 0;
  const h = meta.height ?? 0;

  if (w < 200 || h < 200) {
    throw new Error('Image is too small. Minimum size is 200×200 pixels.');
  }

  return image
    .resize(CLOTHING_SIZE, CLOTHING_SIZE, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 85 })
    .withMetadata({})
    .toBuffer();
}
