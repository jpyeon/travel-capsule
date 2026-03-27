// Manages the packing visualization state and API call.
//
// Does not auto-run — the user triggers generate() explicitly.
// Persists generated images via the onSave callback (fire-and-forget to DB).

import { useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { PackingList } from '../features/packing';
import type { CapsuleWardrobe } from '../features/capsule';

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface UsePackingVisualizationReturn {
  imageData: string | null;
  generating: boolean;
  error: string | null;
  generate: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePackingVisualization(
  packingList: PackingList | null,
  capsule: CapsuleWardrobe | null,
  destination: string,
  vibe: string,
  initialUrl: string | null,
  onSave: (url: string) => void,
): UsePackingVisualizationReturn {
  const [imageData, setImageData] = useState<string | null>(initialUrl);
  const [generating, setGenerating] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const generatingRef = useRef(false);

  const generate = useCallback(async () => {
    if (generatingRef.current || !packingList || !capsule) return;
    generatingRef.current = true;
    setGenerating(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const itemById = new Map(capsule.items.map((i) => [i.id, i]));
      const clothingItems = packingList.clothing
        .map((entry) => itemById.get(entry.itemId)?.name)
        .filter((name): name is string => name !== undefined);

      const res = await fetch('/api/gemini/generate-packing-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify({
          clothingItems,
          accessories:  packingList.accessories,
          suitcaseSize: 'carry-on',
          destination,
          vibe,
        }),
      });

      const data = await res.json() as { imageData?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate image');

      const url = data.imageData ?? null;
      if (url) {
        setImageData(url);
        onSave(url);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      generatingRef.current = false;
      setGenerating(false);
    }
  }, [packingList, capsule, destination, vibe, onSave]);

  return { imageData, generating, error, generate };
}
