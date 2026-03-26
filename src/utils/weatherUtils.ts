/**
 * Shared weather assessment utilities.
 *
 * Centralises the temperature thresholds and the forecast → scalar logic so
 * capsuleGenerator, packingService, and the capsule hook all use the same
 * numbers and the same derivation.
 */

import type { WeatherForecast } from '../features/trips/types/trip';

// ---------------------------------------------------------------------------
// Thresholds (°C)
// ---------------------------------------------------------------------------

/** Below this, trips are considered cold (prefer insulating items, add cold-weather toiletries). */
export const COLD_THRESHOLD_C = 10; // ≈ 50 °F

/** Above this, trips are considered hot (avoid heavy items, add sunscreen). */
export const HOT_THRESHOLD_C = 21; // ≈ 70 °F

/** Rain probability % above which waterproof preference / umbrella rule kicks in. */
export const RAIN_RISK_THRESHOLD = 40;

// ---------------------------------------------------------------------------
// Assessment
// ---------------------------------------------------------------------------

export interface WeatherAssessment {
  /** Mean of daily temperature-high values across the forecast window (°C). */
  avgTemp: number;
  /** Mean of daily rain-probability values (0–100). */
  rainRisk: number;
}

/**
 * Derive scalar weather conditions from a daily forecast array.
 *
 * Uses temperature *highs* for avgTemp — the high is what the user experiences
 * for most of the day.  Falls back to mild/dry defaults when no forecast data
 * is present so downstream logic can still run.
 */
export function assessWeather(forecasts: WeatherForecast[]): WeatherAssessment {
  if (forecasts.length === 0) {
    return { avgTemp: 20, rainRisk: 0 };
  }

  const avgTemp  = mean(forecasts.map((f) => f.temperatureHigh));
  const rainRisk = mean(forecasts.map((f) => f.rainProbability));

  return { avgTemp, rainRisk };
}

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
