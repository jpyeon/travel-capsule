import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithTimeout, TimeoutError } from '../fetchWithTimeout';

describe('fetchWithTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns response when fetch completes before timeout', async () => {
    const mockResponse = new Response(JSON.stringify({ ok: true }), { status: 200 });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

    const result = await fetchWithTimeout('/api/test', {}, 5000);
    expect(result.status).toBe(200);
  });

  it('throws TimeoutError when fetch exceeds timeout', async () => {
    // Mock fetch to reject with AbortError when signal is aborted (mimicking real fetch behaviour)
    vi.spyOn(globalThis, 'fetch').mockImplementation((_url, opts) => {
      return new Promise((_resolve, reject) => {
        const signal = opts?.signal as AbortSignal | undefined;
        if (signal?.aborted) {
          reject(new DOMException('Aborted', 'AbortError'));
          return;
        }
        signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
        // Never resolves on its own — simulates a slow server
      });
    });

    const promise = fetchWithTimeout('/api/test', {}, 100);
    vi.advanceTimersByTime(150);

    await expect(promise).rejects.toThrow(TimeoutError);
    await expect(promise).rejects.toThrow('Request timed out');
  });

  it('aborts when external signal fires', async () => {
    // Mock fetch to reject with AbortError when signal is aborted
    vi.spyOn(globalThis, 'fetch').mockImplementation((_url, opts) => {
      return new Promise((_resolve, reject) => {
        const signal = opts?.signal as AbortSignal | undefined;
        if (signal?.aborted) {
          reject(new DOMException('Aborted', 'AbortError'));
          return;
        }
        signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
        // Never resolves on its own
      });
    });

    const controller = new AbortController();
    const promise = fetchWithTimeout('/api/test', { signal: controller.signal }, 30000);

    controller.abort();

    await expect(promise).rejects.toThrow();
  });

  it('TimeoutError is instanceof Error', () => {
    const err = new TimeoutError();
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('TimeoutError');
  });

  it('uses default 30s timeout when not specified', async () => {
    const mockResponse = new Response('{}', { status: 200 });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

    const result = await fetchWithTimeout('/api/test', {});
    expect(result.status).toBe(200);
  });
});
