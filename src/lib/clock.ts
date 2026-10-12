/**
 * Server-calibrated clock. Challenge windows are decided by the server's
 * `now()` (e.g. `end_challenge` closes a window at the server's current
 * time), so a device whose clock trails the server would still call a
 * just-ended challenge active. Any server response that carries a
 * timestamp taken "now" feeds `calibrate`; `serverNow` then approximates
 * the server's clock from the device's.
 */

let offsetMs = 0

/** Device time shifted by the last known server offset. */
export function serverNow(): number {
  return Date.now() + offsetMs
}

/** Record that the server's clock read `serverIso` a moment ago. */
export function calibrate(serverIso: string | null | undefined): void {
  if (!serverIso) return
  const t = Date.parse(serverIso)
  if (!Number.isFinite(t)) return
  // Response latency makes the device read slightly later than the server
  // did, so this errs towards "server is a little behind", never ahead.
  offsetMs = t - Date.now()
}

/** Test hook. */
export function resetClock(): void {
  offsetMs = 0
}
