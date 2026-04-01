import type { NextPage } from 'next';
import { useRef, useCallback, useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useProfileImage } from '../hooks/useProfileImage';
import { Button } from '../components/shared/Button';

const ProfilePage: NextPage = () => {
  const { userId } = useAuth();
  const { imageUrl, loading, uploading, error, upload } = useProfileImage(userId!);
  const inputRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset so re-selecting the same file triggers onChange
    e.target.value = '';
    try {
      await upload(file);
      toast.success('Profile photo updated');
    } catch {
      toast.error(error ?? 'Upload failed');
    }
  }, [upload, error]);

  return (
    <div className="min-h-screen bg-sand-50 dark:bg-night-300">
      <div className="mx-auto max-w-lg px-4 py-12">
        <h1 className="mb-8 text-2xl font-semibold text-gray-900 dark:text-night-50">Profile</h1>

        <div className="rounded-2xl border border-sand-200 dark:border-night-100 bg-white dark:bg-night-200 p-8 shadow-card">
          <h2 className="mb-6 text-base font-medium text-gray-700 dark:text-sand-300">Profile photo</h2>

          {/* Photo preview */}
          <div className="mb-6 flex justify-center">
            {loading ? (
              <div className="h-40 w-28 animate-pulse rounded-xl bg-sand-100 dark:bg-night-200" />
            ) : imageUrl ? (
              <img
                src={imageUrl}
                alt="Your profile photo"
                className="h-40 w-28 rounded-xl object-cover border border-sand-200 dark:border-night-100 shadow-sm"
              />
            ) : (
              <div className="flex h-40 w-28 items-center justify-center rounded-xl border-2 border-dashed border-sand-300 dark:border-night-100 bg-sand-50 dark:bg-night-200">
                <span className="text-xs text-sand-400 text-center px-2">No photo yet</span>
              </div>
            )}
          </div>

          {/* Upload button */}
          <div className="flex flex-col items-center gap-3">
            <Button
              variant="secondary"
              loading={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {imageUrl ? 'Change photo' : 'Upload photo'}
            </Button>
            <p className="text-xs text-sand-400 text-center">
              JPEG, PNG, WebP or HEIC · max 10 MB · min 200×300 px
            </p>
          </div>

          {/* Hidden file input */}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Error */}
          {error && !uploading && (
            <p className="mt-4 text-center text-sm text-red-500">{error}</p>
          )}
        </div>

        {/* Preferences */}
        <div className="mt-6 rounded-2xl border border-sand-200 dark:border-night-100 bg-white dark:bg-night-200 p-8 shadow-card">
          <h2 className="mb-6 text-base font-medium text-gray-700 dark:text-sand-300">Preferences</h2>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-sand-300">Appearance</span>
            {mounted && (
              <div className="flex gap-1 rounded-lg border border-sand-200 dark:border-night-100 p-0.5">
                {(['system', 'light', 'dark'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTheme(t)}
                    className={[
                      'rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                      theme === t
                        ? 'bg-accent-500 text-white'
                        : 'text-sand-500 hover:text-gray-700 dark:hover:text-sand-300',
                    ].join(' ')}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-sand-400">
          Your photo is stored securely and never shared.
        </p>
      </div>
    </div>
  );
};

export default ProfilePage;
