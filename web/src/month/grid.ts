// Pure logic for the month view, kept out of React so it can be unit-tested.

import type { Day } from '../api'

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const weekdayIndex: Record<string, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6,
}

/**
 * Lays a month out in weeks (Sunday first). Empty cells (null) pad the first week
 * so day 1 lands under its weekday, and the last week so every row has 7 cells.
 */
export function weeks(days: Day[]): (Day | null)[][] {
  if (days.length === 0) return []

  const cells: (Day | null)[] = [...Array(weekdayIndex[days[0].dayOfWeek]).fill(null), ...days]
  while (cells.length % 7 !== 0) cells.push(null)

  const rows: (Day | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
  return rows
}

/** The Ethiopian month before or after, across the 13-month year boundary. */
export function adjacentMonth(year: number, month: number, delta: -1 | 1): { year: number; month: number } {
  const index = (month - 1 + delta + 13) % 13
  const yearChange = delta === 1 && month === 13 ? 1 : delta === -1 && month === 1 ? -1 : 0
  return { year: year + yearChange, month: index + 1 }
}

/** "Nov 10 – Dec 9, 2026" or "Dec 10, 2026 – Jan 8, 2027". */
export function gregorianRange(days: Day[]): string {
  if (days.length === 0) return ''
  const parse = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  const first = parse(days[0].date.gregorian)
  const last = parse(days[days.length - 1].date.gregorian)
  const short = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return first.getFullYear() === last.getFullYear()
    ? `${short(first)} – ${short(last)}, ${last.getFullYear()}`
    : `${short(first)}, ${first.getFullYear()} – ${short(last)}, ${last.getFullYear()}`
}
