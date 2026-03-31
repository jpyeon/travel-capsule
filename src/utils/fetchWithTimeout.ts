export class TimeoutError extends Error {
  constructor(message = 'Request timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Fetch wrapper that aborts after `timeoutMs` milliseconds.
 *
 * Merges an optional external AbortSignal (e.g. from component unmount) with
 * an internal timeout signal using AbortSignal.any().
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 30_000,
): Promise<Response> {
  const timeoutController = new AbortController();
  const timer = setTimeout(() => timeoutController.abort(), timeoutMs);

  // Merge external signal (if any) with timeout signal
  const signals = [timeoutController.signal];
  if (options.signal) signals.push(options.signal as AbortSignal);
  const mergedSignal = signals.length === 1 ? signals[0] : AbortSignal.any(signals);

  try {
    const response = await fetch(url, { ...options, signal: mergedSignal });
    return response;
  } catch (err) {
    if (timeoutController.signal.aborted) {
      throw new TimeoutError();
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
