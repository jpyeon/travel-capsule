import type { ClosetItem, Trip, CapsuleWardrobe } from '../../types';

// Pure function: no DB, no HTTP, no React.
// Selects a minimal set of closet items that covers all activities and weather for a trip.

// TODO: implement capsule wardrobe generation logic

export function generateCapsuleWardrobe(
  _trip: Trip,
  _closet: ClosetItem[]
): CapsuleWardrobe {
  throw new Error('Not implemented');
}
