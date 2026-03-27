// Global re-exports for Trip-related types.
//
// Canonical definitions live in src/features/trips/types/trip.ts — this file
// re-exports so that consumers importing from 'src/types' get the up-to-date
// shapes without directly coupling to the feature module.

import type { ISODate } from './shared.types';
import type { ClosetItem } from './wardrobe.types';
import type { WeatherForecast } from '../features/trips/types/trip';

// Re-export everything from the canonical source
export type { WeatherForecast, Trip, LuggageSize } from '../features/trips/types/trip';
export type { TripActivity, TripVibe } from '../features/trips/types/trip';

export type WeatherCondition =
  | 'sunny'
  | 'cloudy'
  | 'rainy'
  | 'snowy'
  | 'windy'
  | 'stormy'
  | 'foggy'
  | 'partly-cloudy';

export interface DailyOutfit {
  date: ISODate;
  items: ClosetItem[];
  activity: string;
  weatherContext: WeatherForecast;
  /** Non-empty when a required category (top/bottom/footwear) could not be filled. */
  warnings: string[];
}

export interface TripDay {
  date: ISODate;
  tripId: string;
  outfits: DailyOutfit[];
  notes?: string;
}

