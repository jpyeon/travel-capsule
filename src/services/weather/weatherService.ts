// Weather integration using Open-Meteo (https://open-meteo.com/).
// Open-Meteo is a free, no-auth forecast API — no API key required.

import type { WeatherForecast } from '../../features/trips/types/trip';

// Re-export so existing imports from this file (e.g. capsule algorithm) continue to resolve.
export type { WeatherForecast };

// ---------------------------------------------------------------------------
// Open-Meteo API contract
// ---------------------------------------------------------------------------

const OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1/forecast';

// Shape of the "daily" object returned by Open-Meteo when the query params
// daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max are sent.
interface OpenMeteoDailyResponse {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_probability_max: number[];
}

interface OpenMeteoApiResponse {
  daily: OpenMeteoDailyResponse;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch a daily weather forecast from Open-Meteo for the given coordinates.
 *
 * Open-Meteo returns up to 16 days of forecast by default; the result is not
 * sliced here so callers can filter by trip date range if needed.
 *
 * @param latitude  Decimal degrees, e.g. 48.8566 (Paris)
 * @param longitude Decimal degrees, e.g. 2.3522 (Paris)
 * @returns         Array of WeatherForecast, one entry per forecasted day.
 *
 * @throws          If the HTTP request fails or the response shape is invalid.
 *
 * TODO: Add a caching layer here (e.g. in-memory LRU or Redis) keyed on
 *       `${latitude},${longitude}` with a 30-minute TTL to avoid redundant
 *       network calls when multiple users plan trips to the same destination.
 */
export async function getWeatherForecast(
  latitude: number,
  longitude: number,
): Promise<WeatherForecast[]> {
  // --- Build request URL ---
  // Open-Meteo requires lat/lon plus the specific daily variables to include.
  const url = new URL(OPEN_METEO_BASE_URL);
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set(
    'daily',
    'temperature_2m_max,temperature_2m_min,precipitation_probability_max',
  );
  // timezone=auto tells Open-Meteo to infer the timezone from the coordinates,
  // which keeps dates aligned to local time at the destination.
  url.searchParams.set('timezone', 'auto');

  // --- Fetch from Open-Meteo ---
  let response: Response;
  try {
    response = await fetch(url.toString());
  } catch (networkError) {
    throw new Error(
      `Failed to reach Open-Meteo API: ${(networkError as Error).message}`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `Open-Meteo API returned ${response.status} ${response.statusText}`,
    );
  }

  const json: OpenMeteoApiResponse = await response.json();

  // --- Map response to domain type ---
  // Open-Meteo returns parallel arrays under `daily`; we zip them by index.
  return parseOpenMeteoResponse(json);
}

// ---------------------------------------------------------------------------
// Response mapping (internal)
// ---------------------------------------------------------------------------

/**
 * Convert the Open-Meteo API response into our domain WeatherForecast[].
 *
 * Mapping:
 *   daily.time[i]                          → date
 *   daily.temperature_2m_max[i]            → temperatureHigh
 *   daily.temperature_2m_min[i]            → temperatureLow
 *   daily.precipitation_probability_max[i] → rainProbability
 */
function parseOpenMeteoResponse(json: OpenMeteoApiResponse): WeatherForecast[] {
  const { time, temperature_2m_max, temperature_2m_min, precipitation_probability_max } =
    json.daily;

  if (!Array.isArray(time) || time.length === 0) {
    throw new Error('Open-Meteo response contained no forecast days');
  }

  return time.map((date, i) => ({
    date,
    temperatureHigh: temperature_2m_max[i],
    temperatureLow: temperature_2m_min[i],
    rainProbability: precipitation_probability_max[i],
  }));
}
