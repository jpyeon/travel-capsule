import type { ClosetItem, CapsuleWardrobe } from '../../types';
import type { Trip } from '../../features/trips/types/trip';
import { generateCapsuleWardrobe as _generate } from './capsuleGenerator';

export function generateCapsuleWardrobe(trip: Trip, closet: ClosetItem[]): CapsuleWardrobe {
  const result = _generate(closet, trip.weatherForecast, trip.activities, trip.vibe);
  return {
    tripId: trip.id,
    items: result.items,
    generatedAt: new Date().toISOString(),
  };
}
