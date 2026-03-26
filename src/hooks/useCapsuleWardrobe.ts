// Bridges the capsule wardrobe pipeline ↔ React component state.
//
// Receives a Trip and ClosetItem[] from the parent page (which already has
// useTrip and useCloset running) and exposes a manual `generate` trigger
// that runs all three algorithms in sequence.
//
// Pipeline:
//   generateCapsuleWardrobe()  →  CapsuleWardrobe
//   generateDailyOutfits()     →  DailyOutfit[]
//   generatePackingList()      →  PackingList
//
// Persistence:
//   On mount  — loads a previously saved capsule for the trip from Supabase.
//   On generate — saves results to Supabase (upsert) before updating state.
//   On togglePacked — optimistically updates local state, then patches DB.

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { generateCapsuleWardrobe } from '../algorithms/capsule/capsuleGenerator';
import { generateDailyOutfits } from '../algorithms/outfit/outfitGenerator';
import { generatePackingList } from '../features/packing/services/packingService';
import { CapsuleRepository } from '../features/capsule/repository/capsuleRepository';
import { dateRange } from '../utils/date.utils';
import type { CapsuleWardrobe } from '../algorithms/capsule/capsuleGenerator';
import type { PackingList } from '../features/packing/services/packingService';
import type { Trip, WeatherForecast } from '../features/trips/types/trip';
import type { ClosetItem, DailyOutfit, TripDay } from '../types';

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface UseCapsuleWardrobeReturn {
  capsule: CapsuleWardrobe | null;
  outfits: DailyOutfit[];
  packingList: PackingList | null;
  /** Items checked off in the packing list (itemIds + label strings). */
  packedItems: Set<string>;
  /** True while loading a previously saved capsule from the DB on mount. */
  loading: boolean;
  generating: boolean;
  error: string | null;
  /** ISO timestamp of when the current capsule was generated (null if none). */
  savedAt: string | null;
  generate: () => void;
  /** Toggle a packing list item checked/unchecked. Optimistic — fires DB call async. */
  togglePacked: (key: string) => void;
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCapsuleWardrobe(
  trip: Trip,
  closetItems: ClosetItem[],
  userId: string,
): UseCapsuleWardrobeReturn {
  const [capsule, setCapsule]         = useState<CapsuleWardrobe | null>(null);
  const [outfits, setOutfits]         = useState<DailyOutfit[]>([]);
  const [packingList, setPackingList] = useState<PackingList | null>(null);
  const [packedItems, setPackedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading]         = useState(true);
  const [generating, setGenerating]   = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [savedAt, setSavedAt]         = useState<string | null>(null);

  const [repo] = useState(() => new CapsuleRepository(supabase));

  // --- Load saved capsule on mount / when trip changes ---

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setCapsule(null);
      setOutfits([]);
      setPackingList(null);
      setPackedItems(new Set());
      setSavedAt(null);

      try {
        const saved = await repo.findByTripId(trip.id);
        if (!cancelled && saved) {
          setCapsule(saved.capsule);
          setOutfits(saved.outfits);
          setPackingList(saved.packingList);
          setPackedItems(new Set(saved.packedItems));
          setSavedAt(saved.generatedAt);
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [repo, trip.id]);

  // --- Generate & persist ---

  const generate = useCallback(async () => {
    setGenerating(true);
    setError(null);

    try {
      const generatedCapsule = generateCapsuleWardrobe(
        closetItems,
        trip.weatherForecast,
        trip.activities,
        trip.vibe,
      );

      const forecastByDate = buildForecastIndex(trip.weatherForecast);
      const tripDays = buildTripDays(trip, forecastByDate);
      const generatedOutfits = generateDailyOutfits(generatedCapsule.items, tripDays);
      const generatedPackingList = generatePackingList(generatedOutfits);
      const generatedAt = new Date().toISOString();

      await repo.upsert({
        tripId: trip.id,
        userId,
        capsule: generatedCapsule,
        outfits: generatedOutfits,
        packingList: generatedPackingList,
        generatedAt,
        packedItems: [], // reset on regenerate
      });

      setCapsule(generatedCapsule);
      setOutfits(generatedOutfits);
      setPackingList(generatedPackingList);
      setPackedItems(new Set());
      setSavedAt(generatedAt);
      toast.success('Capsule generated');
    } catch (err) {
      setError((err as Error).message);
      toast.error((err as Error).message);
    } finally {
      setGenerating(false);
    }
  }, [trip, closetItems, userId, repo]);

  // --- Toggle packing progress (optimistic) ---

  const togglePacked = useCallback((key: string) => {
    setPackedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      // Fire-and-forget DB patch — low stakes, no error surfaced
      void repo.updatePackingProgress(trip.id, [...next]);
      return next;
    });
  }, [repo, trip.id]);

  const reset = useCallback(() => {
    setCapsule(null);
    setOutfits([]);
    setPackingList(null);
    setPackedItems(new Set());
    setSavedAt(null);
    setError(null);
  }, []);

  return {
    capsule, outfits, packingList, packedItems,
    loading, generating, error, savedAt,
    generate, togglePacked, reset,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildForecastIndex(forecasts: WeatherForecast[]): Map<string, WeatherForecast> {
  return new Map(forecasts.map((f) => [f.date, f]));
}

function buildTripDays(
  trip: Trip,
  forecastByDate: Map<string, WeatherForecast>,
): TripDay[] {
  const dates = dateRange(trip.startDate, trip.endDate);

  return dates.map((date) => {
    const forecast = forecastByDate.get(date) ?? defaultForecast(date);

    const slots: DailyOutfit[] = trip.activities.map((activity) => ({
      date,
      activity,
      weatherContext: forecast,
      items: [],
    }));

    return { date, tripId: trip.id, outfits: slots };
  });
}

function defaultForecast(date: string): WeatherForecast {
  return { date, temperatureHigh: 20, temperatureLow: 12, rainProbability: 10 };
}
