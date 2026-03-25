// Geocoding using Open-Meteo's free geocoding API.
// No API key required — same provider as the weather service.
// Docs: https://open-meteo.com/en/docs/geocoding-api

const GEOCODING_BASE_URL = 'https://geocoding-api.open-meteo.com/v1/search';

export interface GeocodingResult {
  name: string;       // e.g. "Tokyo"
  country: string;    // e.g. "Japan"
  region: string;     // e.g. "Tokyo" (admin1 — state/province/prefecture)
  latitude: number;
  longitude: number;
}

interface OpenMeteoGeocodingResponse {
  results?: Array<{
    name: string;
    country: string;
    admin1?: string;
    latitude: number;
    longitude: number;
  }>;
}

/**
 * Search for a destination by name and return up to 5 matching locations.
 * Returns an empty array if the query is blank or no results are found.
 *
 * @throws if the network request fails.
 */
export async function searchDestination(
  query: string,
  signal?: AbortSignal,
): Promise<GeocodingResult[]> {
  if (!query.trim()) return [];

  const url = new URL(GEOCODING_BASE_URL);
  url.searchParams.set('name', query.trim());
  url.searchParams.set('count', '5');
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');

  const response = await fetch(url.toString(), { signal });

  if (!response.ok) {
    throw new Error(`Geocoding API returned ${response.status} ${response.statusText}`);
  }

  const json: OpenMeteoGeocodingResponse = await response.json();

  return (json.results ?? []).map((r) => ({
    name:      r.name,
    country:   r.country ?? '',
    region:    r.admin1 ?? '',
    latitude:  r.latitude,
    longitude: r.longitude,
  }));
}
