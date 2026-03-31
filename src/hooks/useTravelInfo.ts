// Fetches destination-specific travel advice for a trip.
// Manual trigger — does not auto-fetch on mount to avoid burning Gemini quota.
// Not persisted — refetch as needed.

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { dateRange } from '../utils/date.utils';
import { fetchWithTimeout, TimeoutError } from '../utils/fetchWithTimeout';
import type { Trip } from '../features/trips/types/trip';

export interface TravelInfo {
  savings: string[];
  considerations: string[];
}

export interface UseTravelInfoReturn {
  info: TravelInfo | null;
  loading: boolean;
  error: string | null;
  timedOut: boolean;
  fetch: () => Promise<void>;
  retry: () => Promise<void>;
}

export function useTravelInfo(trip: Trip): UseTravelInfoReturn {
  const [info, setInfo]       = useState<TravelInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const fetch = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setTimedOut(false);
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const tripDays = dateRange(trip.startDate, trip.endDate).length;

      const res = await fetchWithTimeout('/api/gemini/travel-info', {
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
        signal: abortRef.current.signal,
      }, 30_000);

      const data = await res.json() as { savings?: string[]; considerations?: string[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to load travel info');

      setInfo({
        savings:        data.savings        ?? [],
        considerations: data.considerations ?? [],
      });
    } catch (err) {
      if (err instanceof TimeoutError) {
        setTimedOut(true);
        toast.error('Request timed out — try again');
      } else if ((err as Error).name !== 'AbortError') {
        setError((err as Error).message);
        toast.error((err as Error).message);
      }
    } finally {
      setLoading(false);
    }
  }, [trip]);

  return { info, loading, error, timedOut, fetch, retry: fetch };
}
