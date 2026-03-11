import type { ClosetItem, DailyOutfit, WeatherForecast, TripActivity } from '../../types';

// Pure function: no DB, no HTTP, no React.
// Recommends a daily outfit from available items given weather and activity context.

// TODO: implement daily outfit recommendation logic

export function recommendDailyOutfit(
  _date: string,
  _activity: TripActivity,
  _weather: WeatherForecast,
  _availableItems: ClosetItem[]
): DailyOutfit {
  throw new Error('Not implemented');
}
