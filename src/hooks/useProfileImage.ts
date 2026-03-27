// Manages profile image state for the ProfilePage.
//
// On mount: loads the current profile image URL from Supabase.
// upload(): accepts a File, posts to the normalize+upload API route, updates state.

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { UserImageRepository } from '../features/userImages';

export interface UseProfileImageReturn {
  imageUrl: string | null;
  loading: boolean;
  uploading: boolean;
  error: string | null;
  upload: (file: File) => Promise<void>;
}

export function useProfileImage(userId: string): UseProfileImageReturn {
  const [imageUrl, setImageUrl]   = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const [repo] = useState(() => new UserImageRepository(supabase));

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const profile = await repo.getProfile(userId);
        if (!cancelled) setImageUrl(profile?.profileImageUrl ?? null);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [repo, userId]);

  const upload = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const formData = new FormData();
      formData.append('photo', file);

      const res = await fetch('/api/images/upload-profile-photo', {
        method: 'POST',
        headers: {
          ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
        },
        body: formData,
      });

      const data = await res.json() as { imageUrl?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');

      if (data.imageUrl) setImageUrl(data.imageUrl);
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setUploading(false);
    }
  }, []);

  return { imageUrl, loading, uploading, error, upload };
}
