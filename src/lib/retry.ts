/**
 * How long to wait before retrying a failed load: 2 s after the first
 * failure, then 4 s, 8 s, … never longer than `maxMs`.
 */
export function retryDelay(failures: number, maxMs: number): number {
  return Math.min(maxMs, 1000 * 2 ** Math.max(1, failures))
}
