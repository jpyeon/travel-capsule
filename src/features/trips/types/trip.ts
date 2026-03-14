// Domain type and DTOs for the trips feature module.
// TripActivity and TripVibe are re-exported from global types to avoid duplication.

import type { ISODate, ISODateTime } from '../../../types/shared.types';

export type { TripActivity, TripVibe } from '../../../types/trip.types';
import type { TripActivity, TripVibe } from '../../../types/trip.types';

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
}

export interface UpdateTripInput {
  destination?: string;
  startDate?: ISODate;
  endDate?: ISODate;
  activities?: TripActivity[];
  vibe?: TripVibe;
}
