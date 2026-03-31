import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const STORAGE_KEY = 'travel-capsule:weather-cache';

function makeOpenMeteoResponse(date = '2026-06-01') {
  return new Response(
    JSON.stringify({
      daily: {
        time: [date],
        temperature_2m_max: [25],
        temperature_2m_min: [15],
        precipitation_probability_max: [10],
      },
    }),
    { status: 200 },
  );
}

function makeLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      for (const k of Object.keys(store)) delete store[k];
    }),
    _store: store,
  };
}

describe('weatherService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('returns cached forecast within TTL without a second network call', async () => {
    const lsMock = makeLocalStorageMock();
    vi.stubGlobal('localStorage', lsMock);

    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(makeOpenMeteoResponse()),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { getWeatherForecast } = await import('../weatherService');

    await getWeatherForecast(48.86, 2.35);
    await getWeatherForecast(48.86, 2.35);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('re-fetches after TTL expires', async () => {
    const lsMock = makeLocalStorageMock();
    vi.stubGlobal('localStorage', lsMock);

    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(makeOpenMeteoResponse()),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { getWeatherForecast } = await import('../weatherService');

    await getWeatherForecast(48.86, 2.35);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Advance past the TTL
    vi.advanceTimersByTime(CACHE_TTL_MS + 1000);

    await getWeatherForecast(48.86, 2.35);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('evicts oldest entry when cache exceeds MAX_CACHE_SIZE', async () => {
    const lsMock = makeLocalStorageMock();
    vi.stubGlobal('localStorage', lsMock);

    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(makeOpenMeteoResponse()),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { getWeatherForecast } = await import('../weatherService');

    // Fill 50 entries with different coords, advancing time so they get distinct cachedAt
    for (let i = 0; i < 50; i++) {
      vi.advanceTimersByTime(1);
      await getWeatherForecast(i, 0);
    }
    expect(fetchMock).toHaveBeenCalledTimes(50);

    // Adding the 51st entry should evict the oldest (0,0) entry
    vi.advanceTimersByTime(1);
    await getWeatherForecast(50, 0);
    expect(fetchMock).toHaveBeenCalledTimes(51);

    // Re-fetch the first entry (0,0) — it should have been evicted, so another network call
    vi.advanceTimersByTime(1);
    await getWeatherForecast(0, 0);
    expect(fetchMock).toHaveBeenCalledTimes(52);
  });

  it('persists cache to localStorage on write', async () => {
    const lsMock = makeLocalStorageMock();
    vi.stubGlobal('localStorage', lsMock);

    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(makeOpenMeteoResponse()),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { getWeatherForecast } = await import('../weatherService');

    await getWeatherForecast(48.86, 2.35);

    expect(lsMock.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      expect.any(String),
    );

    const stored = lsMock._store[STORAGE_KEY];
    expect(stored).toBeDefined();
    const parsed = JSON.parse(stored);
    expect(parsed['48.86,2.35']).toBeDefined();
    expect(parsed['48.86,2.35'].forecast).toHaveLength(1);
    expect(parsed['48.86,2.35'].cachedAt).toBeTypeOf('number');
  });

  it('restores cache from localStorage on module load and skips network', async () => {
    const cachedAt = Date.now();
    const entry = {
      forecast: [
        { date: '2026-06-01', temperatureHigh: 25, temperatureLow: 15, rainProbability: 10 },
      ],
      cachedAt,
    };

    const stored = JSON.stringify({ '48.86,2.35': entry });
    const lsMock = makeLocalStorageMock();
    lsMock._store[STORAGE_KEY] = stored;
    vi.stubGlobal('localStorage', lsMock);

    const fetchMock = vi.fn().mockResolvedValue(makeOpenMeteoResponse());
    vi.stubGlobal('fetch', fetchMock);

    // Import fresh module AFTER setting up localStorage mock
    const { getWeatherForecast } = await import('../weatherService');

    const result = await getWeatherForecast(48.86, 2.35);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual(entry.forecast);
  });

  it('discards expired entries when restoring from localStorage', async () => {
    // cachedAt 31 minutes in the past
    const cachedAt = Date.now() - (CACHE_TTL_MS + 60_000);
    const entry = {
      forecast: [
        { date: '2026-06-01', temperatureHigh: 25, temperatureLow: 15, rainProbability: 10 },
      ],
      cachedAt,
    };

    const stored = JSON.stringify({ '48.86,2.35': entry });
    const lsMock = makeLocalStorageMock();
    lsMock._store[STORAGE_KEY] = stored;
    vi.stubGlobal('localStorage', lsMock);

    const fetchMock = vi.fn().mockResolvedValue(makeOpenMeteoResponse());
    vi.stubGlobal('fetch', fetchMock);

    // Import fresh module AFTER setting up localStorage mock
    const { getWeatherForecast } = await import('../weatherService');

    await getWeatherForecast(48.86, 2.35);

    // Expired entry should be discarded, so a network call must be made
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('handles localStorage errors gracefully and still fetches from network', async () => {
    const throwingStorage = {
      getItem: vi.fn(() => {
        throw new Error('localStorage unavailable');
      }),
      setItem: vi.fn(() => {
        throw new Error('localStorage unavailable');
      }),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    vi.stubGlobal('localStorage', throwingStorage);

    const fetchMock = vi.fn().mockResolvedValue(makeOpenMeteoResponse());
    vi.stubGlobal('fetch', fetchMock);

    const { getWeatherForecast } = await import('../weatherService');

    const result = await getWeatherForecast(48.86, 2.35);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2026-06-01');
  });
});
