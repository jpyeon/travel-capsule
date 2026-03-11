import type { ISODate, ISODateTime } from './shared.types';
import type { ClosetItem } from './wardrobe.types';

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

export interface WeatherForecast {
  date: ISODate;
  location: string;
  tempHighC: number;
  tempLowC: number;
  condition: WeatherCondition;
  precipitationChance: number;
}

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
}

export interface TripDay {
  date: ISODate;
  tripId: string;
  outfits: DailyOutfit[];
  notes?: string;
}

export interface CapsuleWardrobe {
  tripId: string;
  items: ClosetItem[];
  generatedAt: ISODateTime;
}
