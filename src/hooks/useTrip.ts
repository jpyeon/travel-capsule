// Bridges TripService ↔ React component state.
//
// TripService takes a SupabaseClient directly (no separate repository layer),
// so this hook instantiates the service with the Supabase singleton.

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { TripService } from '../features/trips/services/tripService';
import type { Trip, CreateTripInput, UpdateTripInput } from '../features/trips/types/trip';

// ---------------------------------------------------------------------------
// Service singleton
// ---------------------------------------------------------------------------

function buildService(): TripService {
  return new TripService(supabase);
}

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface UseTripReturn {
  trips: Trip[];
  loading: boolean;
  error: string | null;
  createTrip: (input: CreateTripInput) => Promise<Trip>;
  updateTrip: (tripId: string, input: UpdateTripInput) => Promise<void>;
  deleteTrip: (tripId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTrip(userId: string): UseTripReturn {
  const [trips, setTrips]     = useState<Trip[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError]     = useState<string | null>(null);

  const [service] = useState<TripService>(buildService);

  // --- Fetch ---

  const refresh = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const fetched = await service.getTrips(userId);
      setTrips(fetched);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [service, userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // --- Mutations ---

  // createTrip is NOT optimistic: the service fetches weather from Open-Meteo
  // before inserting, so we don't know the final Trip shape until the server
  // responds. We wait for the full response, then append to local state.
  const createTrip = useCallback(async (input: CreateTripInput): Promise<Trip> => {
    setError(null);
    try {
      const created = await service.createTrip(userId, input);
      // Trips are ordered by start_date ascending — insert in sorted position
      setTrips((prev) =>
        [...prev, created].sort((a, b) => a.startDate.localeCompare(b.startDate)),
      );
      return created;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  }, [service, userId]);

  // updateTrip is optimistic: we know all the fields being changed, so we can
  // update local state immediately and replace with the server response.
  const updateTrip = useCallback(async (
    tripId: string,
    input: UpdateTripInput,
  ): Promise<void> => {
    setError(null);
    try {
      const updated = await service.updateTrip(tripId, input);
      setTrips((prev) =>
        prev
          .map((trip) => (trip.id === tripId ? updated : trip))
          .sort((a, b) => a.startDate.localeCompare(b.startDate)),
      );
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  }, [service]);

  const deleteTrip = useCallback(async (tripId: string): Promise<void> => {
    setError(null);
    try {
      await service.deleteTrip(tripId);
      setTrips((prev) => prev.filter((trip) => trip.id !== tripId));
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  }, [service]);

  return { trips, loading, error, createTrip, updateTrip, deleteTrip, refresh };
}
