// Weather integration using Open-Meteo (https://open-meteo.com/).
// Open-Meteo is a free, no-auth forecast API — no API key required.

import type { WeatherForecast } from '../../features/trips/types/trip';

// ---------------------------------------------------------------------------
// Open-Meteo API contract
// ---------------------------------------------------------------------------

const OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1/forecast';

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_CACHE_SIZE = 50;
const STORAGE_KEY = 'travel-capsule:weather-cache';

interface CacheEntry {
  forecast: WeatherForecast[];
  cachedAt: number;
}

const forecastCache = new Map<string, CacheEntry>();

/** Round lat/lon to 2 decimal places (~1 km) to absorb float precision noise. */
function cacheKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
}

function restoreFromStorage(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const entries = JSON.parse(raw) as Record<string, CacheEntry>;
    const now = Date.now();
    for (const [key, entry] of Object.entries(entries)) {
      if (now - entry.cachedAt < CACHE_TTL_MS) {
        forecastCache.set(key, entry);
      }
    }
  } catch {
    // localStorage unavailable or corrupt — start fresh
  }
}

function persistToStorage(): void {
  try {
    const obj: Record<string, CacheEntry> = {};
    for (const [key, entry] of forecastCache) {
      obj[key] = entry;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // localStorage unavailable — ignore
  }
}

function evictOldest(): void {
  let oldestKey: string | null = null;
  let oldestTime = Infinity;
  for (const [key, entry] of forecastCache) {
    if (entry.cachedAt < oldestTime) {
      oldestTime = entry.cachedAt;
      oldestKey = key;
    }
  }
  if (oldestKey) forecastCache.delete(oldestKey);
}

// Restore on module load
restoreFromStorage();

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
 * Results are cached in memory for 30 minutes keyed by rounded lat/lon, so
 * repeated calls for the same destination within a session skip the network.
 *
 * Open-Meteo returns up to 16 days of forecast by default; the result is not
 * sliced here so callers can filter by trip date range if needed.
 *
 * @param latitude  Decimal degrees, e.g. 48.8566 (Paris)
 * @param longitude Decimal degrees, e.g. 2.3522 (Paris)
 * @returns         Array of WeatherForecast, one entry per forecasted day.
 *
 * @throws          If the HTTP request fails or the response shape is invalid.
 */
export async function getWeatherForecast(
  latitude: number,
  longitude: number,
): Promise<WeatherForecast[]> {
  // --- Cache check ---
  const key = cacheKey(latitude, longitude);
  const cached = forecastCache.get(key);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.forecast;
  }

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
  const forecast = parseOpenMeteoResponse(json);

  // --- Store in cache ---
  if (forecastCache.size >= MAX_CACHE_SIZE) {
    evictOldest();
  }
  forecastCache.set(key, { forecast, cachedAt: Date.now() });
  persistToStorage();

  return forecast;
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
