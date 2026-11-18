// Types mirror the DTOs in EthiopianCalendar.Api/Dtos.cs.

export interface EthiopianDate {
  year: number
  month: number
  day: number
  monthName: string
  display: string
  gregorian: string // yyyy-MM-dd
}

export type ObservanceKind = 'Feast' | 'FastBegins' | 'SaintsDay'

export interface Observance {
  id: string
  name: string
  kind: ObservanceKind
  date: EthiopianDate
}

export interface FastDay {
  id: string
  name: string
  dayNumber: number
  totalDays: number
}

export interface Day {
  date: EthiopianDate
  dayOfWeek: string
  isFastDay: boolean
  fasts: FastDay[]
  observances: Observance[]
}

export interface FastPeriod {
  id: string
  name: string
  start: EthiopianDate
  end: EthiopianDate
  lengthInDays: number
}

export interface Year {
  year: number
  observances: Observance[]
  fastPeriods: FastPeriod[]
}

/**
 * Feasts plus the first day of every fast, in date order. Movable fasts already
 * appear as observances (e.g. Abiy Tsom), so duplicates are dropped by id and date.
 */
export function calendarEvents(year: Year): Observance[] {
  const fastStarts: Observance[] = year.fastPeriods
    .filter((p) => p.lengthInDays > 1)
    .map((p) => ({ id: p.id, name: `${p.name} begins (${p.lengthInDays} days)`, kind: 'FastBegins', date: p.start }))

  const seen = new Set(year.observances.map((o) => `${o.id}|${o.date.gregorian}`))
  return [...year.observances, ...fastStarts.filter((f) => !seen.has(`${f.id}|${f.date.gregorian}`))].sort((a, b) =>
    a.date.gregorian.localeCompare(b.date.gregorian),
  )
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`)
  }
  return (await response.json()) as T
}

export const fetchDay = (isoDate: string) => getJson<Day>(`/api/days/${isoDate}`)
export const fetchYear = (year: number) => getJson<Year>(`/api/years/${year}`)

/** Today's date in the viewer's own time zone, as yyyy-MM-dd. */
export function todayIso(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function formatGregorian(isoDate: string): string {
  // Parse as a local date; new Date('2026-11-24') would be UTC midnight and can show the previous day.
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}
