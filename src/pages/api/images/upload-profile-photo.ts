// POST /api/images/upload-profile-photo
//
// Accepts a multipart/form-data request with a single "photo" field.
// Normalizes the image server-side (rotate, crop, strip EXIF) via sharp,
// uploads to Supabase Storage, and persists the URL in user_profiles.
//
// Request:  multipart/form-data  { photo: File }
// Response: { imageUrl: string }

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';
import { getAuthUser } from '../../../lib/apiAuth';
import { validateImageUpload, normalizeProfilePhoto } from '../../../services/imageNormalization/imageNormalizationService';
import { UserImageRepository } from '../../../features/userImages';

// Disable Next.js body parsing — formidable handles the multipart stream
export const config = { api: { bodyParser: false } };

type SuccessResponse = { imageUrl: string };
type ErrorResponse   = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // Parse multipart upload
  const form = formidable({ maxFileSize: 10 * 1024 * 1024 });
  let fields: formidable.Fields;
  let files: formidable.Files;
  try {
    [fields, files] = await form.parse(req);
    void fields; // unused
  } catch {
    return res.status(400).json({ error: 'Failed to parse upload' });
  }

  const fileField = files['photo'];
  const file = Array.isArray(fileField) ? fileField[0] : fileField;
  if (!file) return res.status(400).json({ error: 'No photo provided' });

  const mimeType = file.mimetype ?? '';
  const rawBuffer = fs.readFileSync(file.filepath);

  // Validate
  const validation = validateImageUpload(rawBuffer, mimeType, 200, 300);
  if (!validation.valid) {
    return res.status(422).json({ error: validation.error! });
  }

  // Normalize
  let normalized: Buffer;
  try {
    normalized = await normalizeProfilePhoto(rawBuffer);
  } catch (err) {
    return res.status(422).json({ error: (err as Error).message });
  }

  // Upload to Supabase Storage + save URL
  const token = req.headers.authorization?.replace('Bearer ', '') ?? '';
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const repo = new UserImageRepository(supabase);
  let imageUrl: string;
  try {
    imageUrl = await repo.uploadProfileImage(user.id, normalized);
    await repo.upsertProfileImageUrl(user.id, imageUrl);
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }

  return res.status(200).json({ imageUrl });
}
