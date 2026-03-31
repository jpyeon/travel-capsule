// Fetches destination-specific travel advice for a trip.
// Manual trigger — does not auto-fetch on mount to avoid burning Gemini quota.
// Not persisted — refetch as needed.

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { dateRange } from '../utils/date.utils';
import type { Trip } from '../features/trips/types/trip';

export interface TravelInfo {
  savings: string[];
  considerations: string[];
}

export interface UseTravelInfoReturn {
  info: TravelInfo | null;
  loading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
}

export function useTravelInfo(trip: Trip): UseTravelInfoReturn {
  const [info, setInfo]       = useState<TravelInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const tripDays = dateRange(trip.startDate, trip.endDate).length;

      const res = await globalThis.fetch('/api/gemini/travel-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify({
          destination: trip.destination,
          activities:  trip.activities,
          tripDays,
        }),
      });

      const data = await res.json() as { savings?: string[]; considerations?: string[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to load travel info');

      setInfo({
        savings:        data.savings        ?? [],
        considerations: data.considerations ?? [],
      });
    } catch (err) {
      const msg = (err as Error).message ?? 'Failed to load travel info';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [trip]);

  return { info, loading, error, fetch };
}
