// Manages the packing visualization state and API call.
//
// Does not auto-run — the user triggers generate() explicitly.
// Persists generated images via the onSave callback (fire-and-forget to DB).

import { useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { PackingList } from '../features/packing';
import type { CapsuleWardrobe } from '../features/capsule';
import type { BagType } from '../services/packingVisualization/packingVisualizationService';

export type { BagType } from '../services/packingVisualization/packingVisualizationService';

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface UsePackingVisualizationReturn {
  imageData: string | null;
  generating: boolean;
  error: string | null;
  /** True when the bag type changed since the last generated image. */
  stale: boolean;
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
  bagType: BagType,
  initialUrl: string | null,
  onSave: (url: string) => void,
): UsePackingVisualizationReturn {
  const [imageData, setImageData] = useState<string | null>(initialUrl);
  const [generating, setGenerating] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // Track which bagType the current image was generated for
  const lastBagTypeRef = useRef<BagType | null>(initialUrl ? bagType : null);
  const generatingRef = useRef(false);

  // Clear cached image when bagType changes (user picks a different bag)
  const stale = lastBagTypeRef.current !== null && lastBagTypeRef.current !== bagType;

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
          accessories: packingList.accessories,
          bagType,
          destination,
          vibe,
        }),
      });

      const data = await res.json() as { imageData?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate image');

      const url = data.imageData ?? null;
      if (url) {
        setImageData(url);
        lastBagTypeRef.current = bagType;
        onSave(url);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      generatingRef.current = false;
      setGenerating(false);
    }
  }, [packingList, capsule, destination, vibe, bagType, onSave]);

  return { imageData, generating, error, generate, stale };
}
