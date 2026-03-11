import type { ClosetItem, Trip, WeatherForecast } from '../../types';

// Pure function: no DB, no HTTP, no React.
// Generates a packing list of items required for a trip given weather forecasts.

// TODO: implement packing list generation logic

export interface PackingList {
  tripId: string;
  items: ClosetItem[];
  generatedAt: string;
}

export function generatePackingList(
  _trip: Trip,
  _forecasts: WeatherForecast[],
  _closet: ClosetItem[]
): PackingList {
  throw new Error('Not implemented');
}
