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

import { useState, useCallback } from 'react';
import { generateCapsuleWardrobe } from '../algorithms/capsule/capsuleGenerator';
import { generateDailyOutfits } from '../algorithms/outfit/outfitGenerator';
import { generatePackingList } from '../features/packing/services/packingService';
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
  generating: boolean;
  error: string | null;
  generate: () => void;
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCapsuleWardrobe(
  trip: Trip,
  closetItems: ClosetItem[],
): UseCapsuleWardrobeReturn {
  const [capsule, setCapsule]         = useState<CapsuleWardrobe | null>(null);
  const [outfits, setOutfits]         = useState<DailyOutfit[]>([]);
  const [packingList, setPackingList] = useState<PackingList | null>(null);
  const [generating, setGenerating]   = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const generate = useCallback(() => {
    setGenerating(true);
    setError(null);

    try {
      // --- Step 1: Capsule wardrobe ---
      const generatedCapsule = generateCapsuleWardrobe(
        closetItems,
        trip.weatherForecast,
        trip.activities,
        trip.vibe,
      );

      // --- Step 2: Daily outfits ---
      // Build TripDay[] from the trip's date range and activities.
      // Each day gets one outfit slot per activity; each slot is matched
      // to its WeatherForecast by date.
      const forecastByDate = buildForecastIndex(trip.weatherForecast);
      const tripDays = buildTripDays(trip, forecastByDate);
      const generatedOutfits = generateDailyOutfits(generatedCapsule.items, tripDays);

      // --- Step 3: Packing list ---
      const generatedPackingList = generatePackingList(generatedOutfits);

      setCapsule(generatedCapsule);
      setOutfits(generatedOutfits);
      setPackingList(generatedPackingList);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  }, [trip, closetItems]);

  const reset = useCallback(() => {
    setCapsule(null);
    setOutfits([]);
    setPackingList(null);
    setError(null);
  }, []);

  return { capsule, outfits, packingList, generating, error, generate, reset };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Index weather forecasts by date string for O(1) lookup. */
function buildForecastIndex(forecasts: WeatherForecast[]): Map<string, WeatherForecast> {
  return new Map(forecasts.map((f) => [f.date, f]));
}

/**
 * Build one TripDay per date in the trip's date range.
 * Each day gets one outfit slot per activity in trip.activities.
 * If no forecast exists for a date (trip > 16 days out, or weather fetch
 * failed), a mild default is used so the pipeline can still run.
 */
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
      items: [], // filled in by generateDailyOutfits
    }));

    return { date, tripId: trip.id, outfits: slots };
  });
}

/** Mild, dry default used when Open-Meteo has no data for a specific date. */
function defaultForecast(date: string): WeatherForecast {
  return { date, temperatureHigh: 20, temperatureLow: 12, rainProbability: 10 };
}
