// Manages outfit visualization state for a single outfit card.
//
// One instance per OutfitCard — each card manages its own image independently.
// Manual trigger only — never auto-generates on mount.
// Persists generated images via the onSave callback (fire-and-forget to DB).

import { useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { DailyOutfit, ClosetItem } from '../types';
import type { WeatherForecast } from '../features/trips/types/trip';
import type { OutfitVisualizationInput } from '../services/outfitVisualization/types';

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface UseOutfitVisualizationReturn {
  imageData: string | null;
  generating: boolean;
  error: string | null;
  generate: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Outfit key — stable identifier for a specific outfit slot
// ---------------------------------------------------------------------------

export function outfitKey(date: string, activity: string): string {
  return `${date}::${activity}`;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useOutfitVisualization(
  outfit: DailyOutfit,
  itemById: Map<string, ClosetItem>,
  destination: string,
  vibe: string,
  initialUrl: string | null,
  onSave: (key: string, url: string) => void,
): UseOutfitVisualizationReturn {
  const [imageData, setImageData] = useState<string | null>(initialUrl);
  const [generating, setGenerating] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const generatingRef = useRef(false);

  const generate = useCallback(async () => {
    if (generatingRef.current || outfit.items.length === 0) return;
    generatingRef.current = true;
    setGenerating(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const items: OutfitVisualizationInput['items'] = outfit.items
        .map((item) => {
          const full = itemById.get(item.id);
          if (!full) return null;
          return {
            name:     full.name,
            category: full.category,
            color:    full.color,
            material: full.material,
          };
        })
        .filter((i): i is NonNullable<typeof i> => i !== null);

      if (items.length === 0) throw new Error('No closet data found for these outfit items.');

      const weatherDescription = describeWeather(outfit.weatherContext);

      const body: OutfitVisualizationInput = {
        items,
        activity: outfit.activity,
        vibe,
        destination,
        weatherDescription,
      };

      const res = await fetch('/api/ai/generate-outfit-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify(body),
      });

      const data = await res.json() as { imageData?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate image');

      const url = data.imageData ?? null;
      if (url) {
        setImageData(url);
        onSave(outfitKey(outfit.date, outfit.activity), url);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      generatingRef.current = false;
      setGenerating(false);
    }
  }, [outfit, itemById, destination, vibe, onSave]);

  return { imageData, generating, error, generate };
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function describeWeather(forecast: WeatherForecast): string {
  const temp = forecast.temperatureHigh;
  const rain = forecast.rainProbability;
  const tempDesc = temp >= 25 ? 'hot' : temp >= 18 ? 'warm' : temp >= 10 ? 'mild' : 'cold';
  const rainDesc = rain >= 60 ? 'rainy' : rain >= 30 ? 'chance of rain' : 'dry';
  return `${tempDesc}, ${temp}°C, ${rainDesc}`;
}
