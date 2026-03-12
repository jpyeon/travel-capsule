import type { ISODate } from '../../types/shared.types';

export interface WeatherForecast {
  date: ISODate;
  temperatureHigh: number; // °C
  temperatureLow: number;  // °C
  rainProbability: number; // 0–100
  windSpeed: number;       // km/h
}

export interface IWeatherService {
  getWeatherForecast(
    destination: string,
    startDate: ISODate,
    endDate: ISODate,
  ): Promise<WeatherForecast[]>;
}

// --- Cache placeholder ---
// TODO: replace with a real caching layer (e.g. Redis, Vercel KV, or in-memory LRU)
// Cache key: `${destination}:${startDate}:${endDate}`
const cache = new Map<string, { forecasts: WeatherForecast[]; cachedAt: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

export class WeatherService implements IWeatherService {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor() {
    const apiKey = process.env.WEATHER_API_KEY;
    if (!apiKey) throw new Error('WEATHER_API_KEY environment variable is not set');
    this.apiKey = apiKey;

    // TODO: move base URL to an environment variable (e.g. WEATHER_API_BASE_URL)
    // TODO: decide which weather provider to use (e.g. Open-Meteo, WeatherAPI, Tomorrow.io)
    this.baseUrl = 'https://api.example-weather-provider.com/v1';
  }

  async getWeatherForecast(
    destination: string,
    startDate: ISODate,
    endDate: ISODate,
  ): Promise<WeatherForecast[]> {
    validateInput(destination, startDate, endDate);

    const cacheKey = `${destination}:${startDate}:${endDate}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return cached.forecasts;
    }

    const forecasts = await fetchWithRetry(
      () => this.fetchForecast(destination, startDate, endDate),
      MAX_RETRIES,
      RETRY_DELAY_MS,
    );

    // TODO: persist to a durable cache instead of in-memory Map
    cache.set(cacheKey, { forecasts, cachedAt: Date.now() });

    return forecasts;
  }

  private async fetchForecast(
    destination: string,
    startDate: ISODate,
    endDate: ISODate,
  ): Promise<WeatherForecast[]> {
    // TODO: geocode `destination` string → lat/lon before calling the forecast endpoint
    // TODO: replace query param names with the chosen provider's actual API contract
    const url = new URL(`${this.baseUrl}/forecast`);
    url.searchParams.set('location', destination);
    url.searchParams.set('start_date', startDate);
    url.searchParams.set('end_date', endDate);
    url.searchParams.set('apikey', this.apiKey);

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Weather API request failed: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();

    // TODO: replace with real response-shape mapping once provider is chosen
    return parseApiResponse(json);
  }
}

// --- Retry logic ---

async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  retries: number,
  delayMs: number,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(delayMs * attempt); // linear back-off
      }
    }
  }

  throw new Error(
    `Failed to fetch weather forecast after ${retries} attempts: ${(lastError as Error).message}`,
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Validation ---

function validateInput(destination: string, startDate: ISODate, endDate: ISODate): void {
  if (!destination?.trim()) throw new Error('destination is required');
  if (!startDate) throw new Error('startDate is required');
  if (!endDate) throw new Error('endDate is required');
  if (endDate < startDate) throw new Error('endDate must be on or after startDate');
}

// --- Response parsing ---

// TODO: implement once the weather provider's response shape is known
// Expected fields to map: daily high/low temps, precipitation probability, wind speed
function parseApiResponse(_json: unknown): WeatherForecast[] {
  throw new Error('parseApiResponse is not yet implemented — awaiting provider selection');
}
