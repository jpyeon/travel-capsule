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

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { generateCapsuleWardrobe, CapsuleRepository } from '../features/capsule';
import { generateDailyOutfits } from '../algorithms/outfit/outfitGenerator';
import { generatePackingList } from '../features/packing';
import { dateRange } from '../utils/date.utils';
import { assessWeather } from '../utils/weatherUtils';
import type { CapsuleWardrobe } from '../features/capsule';
import type { PackingList } from '../features/packing';
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
  /** Persisted packing visualization image URL (null if not yet generated). */
  packingVisualizationUrl: string | null;
  /** Map of outfitKey ("date::activity") → persisted image URL. */
  outfitVisualizationUrls: Record<string, string>;
  generate: () => void;
  /** Toggle a packing list item checked/unchecked. Optimistic — fires DB call async. */
  togglePacked: (key: string) => void;
  /** Persist a newly generated packing visualization URL. Fire-and-forget. */
  savePackingVisualizationUrl: (url: string) => void;
  /** Persist a newly generated outfit visualization URL. Fire-and-forget. */
  saveOutfitVisualizationUrl: (outfitKey: string, url: string) => void;
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
  const [packingVisualizationUrl, setPackingVisualizationUrl] = useState<string | null>(null);
  const [outfitVisualizationUrls, setOutfitVisualizationUrls] = useState<Record<string, string>>({});

  const [repo] = useState(() => new CapsuleRepository(supabase));
  const generatingRef = useRef(false);

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
      setPackingVisualizationUrl(null);
      setOutfitVisualizationUrls({});

      try {
        const saved = await repo.findByTripId(trip.id);
        if (!cancelled && saved) {
          setCapsule(saved.capsule);
          setOutfits(saved.outfits);
          setPackingList(saved.packingList);
          setPackedItems(new Set(saved.packedItems));
          setSavedAt(saved.generatedAt);
          setPackingVisualizationUrl(saved.packingVisualizationUrl);
          setOutfitVisualizationUrls(saved.outfitVisualizationUrls);
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
    if (generatingRef.current) return;
    generatingRef.current = true;
    setGenerating(true);
    setError(null);

    try {
      const generatedCapsule = generateCapsuleWardrobe(
        closetItems,
        trip.weatherForecast,
        trip.activities,
        trip.vibe,
        trip.luggageSize,
        trip.hasLaundryAccess,
      );

      const forecastByDate = buildForecastIndex(trip.weatherForecast);
      const tripDays = buildTripDays(trip, forecastByDate);
      const generatedOutfits = generateDailyOutfits(generatedCapsule.items, tripDays);

      const numTripDays = dateRange(trip.startDate, trip.endDate).length;
      const { avgTemp, rainRisk } = assessWeather(trip.weatherForecast);
      const generatedPackingList = generatePackingList(generatedOutfits, {
        tripDays: numTripDays,
        avgTemp,
        rainRisk,
        activities: trip.activities,
        hasLaundryAccess: trip.hasLaundryAccess,
      });
      const generatedAt = new Date().toISOString();

      await repo.upsert({
        tripId: trip.id,
        userId,
        capsule: generatedCapsule,
        outfits: generatedOutfits,
        packingList: generatedPackingList,
        generatedAt,
        packedItems: [],             // reset on regenerate
        packingVisualizationUrl: null,  // reset on regenerate
        outfitVisualizationUrls: {},    // reset on regenerate
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
      generatingRef.current = false;
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

  const savePackingVisualizationUrl = useCallback((url: string) => {
    setPackingVisualizationUrl(url);
    void repo.updatePackingVisualizationUrl(trip.id, url);
  }, [repo, trip.id]);

  const saveOutfitVisualizationUrl = useCallback((outfitKey: string, url: string) => {
    setOutfitVisualizationUrls((prev) => ({ ...prev, [outfitKey]: url }));
    void repo.updateOutfitVisualizationUrl(trip.id, outfitKey, url);
  }, [repo, trip.id]);

  const reset = useCallback(() => {
    setCapsule(null);
    setOutfits([]);
    setPackingList(null);
    setPackedItems(new Set());
    setSavedAt(null);
    setPackingVisualizationUrl(null);
    setOutfitVisualizationUrls({});
    setError(null);
  }, []);

  return {
    capsule, outfits, packingList, packedItems,
    loading, generating, error, savedAt,
    packingVisualizationUrl, outfitVisualizationUrls,
    generate, togglePacked, savePackingVisualizationUrl, saveOutfitVisualizationUrl, reset,
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
      warnings: [],
    }));

    return { date, tripId: trip.id, outfits: slots };
  });
}

function defaultForecast(date: string): WeatherForecast {
  return { date, temperatureHigh: 20, temperatureLow: 12, rainProbability: 10 };
}
