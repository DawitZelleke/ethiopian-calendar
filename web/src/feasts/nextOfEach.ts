import type { Observance } from '../api'

/**
 * The next occurrence of each fast or feast on or after a date, in date order.
 * A fast already under way counts by its start date, so it isn't listed: it appears
 * again with next year's start date.
 */
export function nextOfEach(events: Observance[], fromIso: string): Observance[] {
  const next = new Map<string, Observance>()
  for (const e of events) {
    if (e.date.gregorian < fromIso) continue
    const current = next.get(e.id)
    if (!current || e.date.gregorian < current.date.gregorian) next.set(e.id, e)
  }
  return [...next.values()].sort((a, b) => a.date.gregorian.localeCompare(b.date.gregorian))
}
