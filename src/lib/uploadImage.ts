import type { SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'closet-images';
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Upload a closet item image to Supabase Storage and return its public URL.
 *
 * File path: {userId}/{uuid}.{ext}
 *
 * Prerequisites (manual Supabase setup):
 *   1. Create a public bucket named "closet-images"
 *   2. Add storage policy: authenticated users can INSERT/DELETE objects
 *      where (storage.foldername(name))[1] = auth.uid()::text
 */
export async function uploadClosetImage(
  supabase: SupabaseClient,
  userId: string,
  file: File,
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are supported.');
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('Image must be smaller than 5 MB.');
  }

  const ext = (file.name.split('.').pop() ?? 'jpg').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10) || 'jpg';
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file);
  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
