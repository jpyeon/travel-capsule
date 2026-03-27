// Manages user profile image URLs in the user_profiles table.
// Images are normalized and uploaded server-side before calling these methods.

import { SupabaseClient } from '@supabase/supabase-js';

const TABLE = 'user_profiles';
const BUCKET = 'profile-images';

// ---------------------------------------------------------------------------
// Domain type
// ---------------------------------------------------------------------------

export interface UserProfile {
  userId: string;
  profileImageUrl: string | null;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class UserImageRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await this.supabase
      .from(TABLE)
      .select('user_id, profile_image_url, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw new Error(`Failed to fetch profile: ${error.message}`);
    if (!data) return null;

    return {
      userId: data.user_id as string,
      profileImageUrl: data.profile_image_url as string | null,
      updatedAt: data.updated_at as string,
    };
  }

  async upsertProfileImageUrl(userId: string, imageUrl: string): Promise<void> {
    const { error } = await this.supabase
      .from(TABLE)
      .upsert(
        { user_id: userId, profile_image_url: imageUrl, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      );

    if (error) throw new Error(`Failed to save profile image: ${error.message}`);
  }

  /** Upload a normalized image buffer to Supabase Storage and return the public URL. */
  async uploadProfileImage(userId: string, buffer: Buffer): Promise<string> {
    const path = `${userId}/profile.jpg`;

    const { error: uploadError } = await this.supabase.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) throw new Error(`Failed to upload image: ${uploadError.message}`);

    const { data } = this.supabase.storage.from(BUCKET).getPublicUrl(path);
    // Append cache-busting timestamp so the browser re-fetches after re-upload
    return `${data.publicUrl}?t=${Date.now()}`;
  }
}
