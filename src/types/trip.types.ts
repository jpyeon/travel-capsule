import type { ISODate } from './shared.types';
import type { ClosetItem } from './wardrobe.types';
// WeatherForecast is defined in the features/trips module (source of truth) and
// re-exported here so global-types consumers get the canonical shape.
export type { WeatherForecast } from '../features/trips/types/trip';
import type { WeatherForecast } from '../features/trips/types/trip';

export type TripActivity =
  | 'beach'
  | 'hiking'
  | 'business'
  | 'sightseeing'
  | 'dining'
  | 'nightlife'
  | 'skiing'
  | 'casual';

export type TripVibe =
  | 'relaxed'
  | 'adventurous'
  | 'formal'
  | 'romantic'
  | 'family'
  | 'backpacker';

export type WeatherCondition =
  | 'sunny'
  | 'cloudy'
  | 'rainy'
  | 'snowy'
  | 'windy'
  | 'stormy'
  | 'foggy'
  | 'partly-cloudy';

export interface Trip {
  id: string;
  userId: string;
  destination: string;
  startDate: ISODate;
  endDate: ISODate;
  activities: TripActivity[];
  vibe: TripVibe;
}

export interface DailyOutfit {
  date: ISODate;
  items: ClosetItem[];
  activity: TripActivity;
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

