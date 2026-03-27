// Domain type and DTOs for the trips feature module.
// TripActivity and TripVibe are defined here (canonical source) and re-exported
// via src/types/trip.types.ts → src/types/index.ts for global consumers.

import type { ISODate, ISODateTime } from '../../../types/shared.types';

// Preset values used for formality matching and AI parsing.
// Widened to string so users can add custom activities.
export type TripActivity = string;

export type TripVibe =
  | 'relaxed'
  | 'adventurous'
  | 'formal'
  | 'romantic'
  | 'family'
  | 'backpacker';

export type LuggageSize = 'backpack' | 'carry-on' | 'checked';

// One day's weather data as returned by the Open-Meteo forecast API and
// attached to a Trip at creation time.
export interface WeatherForecast {
  date: ISODate;          // YYYY-MM-DD
  temperatureHigh: number; // °C — daily maximum temperature at 2 m
  temperatureLow: number;  // °C — daily minimum temperature at 2 m
  rainProbability: number; // 0–100 — maximum precipitation probability for the day
}

export interface Trip {
  id: string;
  userId: string;
  destination: string;
  startDate: ISODate;
  endDate: ISODate;
  activities: TripActivity[];
  vibe: TripVibe;
  // Weather fetched from Open-Meteo at trip creation time; empty array if the
  // API call failed (the trip is still created).
  weatherForecast: WeatherForecast[];
  luggageSize: LuggageSize;
  hasLaundryAccess: boolean;
  createdAt: ISODateTime;
}

export interface CreateTripInput {
  destination: string;
  startDate: ISODate;
  endDate: ISODate;
  activities: TripActivity[];
  vibe: TripVibe;
  // Geographic coordinates used to call the weather API.
  // Required so Open-Meteo can return a forecast without server-side geocoding.
  latitude: number;
  longitude: number;
  luggageSize: LuggageSize;
  hasLaundryAccess: boolean;
}

export interface UpdateTripInput {
  destination?: string;
  startDate?: ISODate;
  endDate?: ISODate;
  activities?: TripActivity[];
  vibe?: TripVibe;
  luggageSize?: LuggageSize;
  hasLaundryAccess?: boolean;
}
