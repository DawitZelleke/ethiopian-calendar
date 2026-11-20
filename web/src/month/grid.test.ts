import { describe, expect, it } from 'vitest'
import type { Day } from '../api'
import { adjacentMonth, gregorianRange, weeks } from './grid'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** A fake month: `count` days starting on the given weekday and Gregorian date. */
function month(count: number, firstWeekday: number, firstGregorian: string): Day[] {
  const [y, m, d] = firstGregorian.split('-').map(Number)
  return Array.from({ length: count }, (_, i) => {
    const g = new Date(y, m - 1, d + i)
    const iso = `${g.getFullYear()}-${String(g.getMonth() + 1).padStart(2, '0')}-${String(g.getDate()).padStart(2, '0')}`
    return {
      date: { year: 2019, month: 3, day: i + 1, monthName: 'Hidar', display: '', gregorian: iso },
      dayOfWeek: WEEKDAYS[(firstWeekday + i) % 7],
      isFastDay: false,
      fasts: [],
      observances: [],
    }
  })
}

describe('weeks', () => {
  it('puts day 1 under its weekday and pads every row to 7 cells', () => {
    // Hidar 1, 2019 is Tuesday, November 10, 2026.
    const rows = weeks(month(30, 2, '2026-11-10'))

    expect(rows[0].slice(0, 2)).toEqual([null, null])
    expect(rows[0][2]?.date.day).toBe(1)
    expect(rows.every((row) => row.length === 7)).toBe(true)
    expect(rows.flat().filter(Boolean)).toHaveLength(30)
  })

  it('handles Pagume, which is only 5 or 6 days', () => {
    const rows = weeks(month(6, 6, '2027-09-06'))
    expect(rows.flat().filter(Boolean)).toHaveLength(6)
  })
})

describe('adjacentMonth', () => {
  it('moves within a year', () => {
    expect(adjacentMonth(2019, 3, 1)).toEqual({ year: 2019, month: 4 })
    expect(adjacentMonth(2019, 3, -1)).toEqual({ year: 2019, month: 2 })
  })

  it('wraps from Pagume to Meskerem of the next year, and back', () => {
    expect(adjacentMonth(2019, 13, 1)).toEqual({ year: 2020, month: 1 })
    expect(adjacentMonth(2020, 1, -1)).toEqual({ year: 2019, month: 13 })
  })
})

describe('gregorianRange', () => {
  it('shows one year when the month stays in one Gregorian year', () => {
    expect(gregorianRange(month(30, 2, '2026-11-10'))).toBe('Nov 10 – Dec 9, 2026')
  })

  it('shows both years when the month crosses New Year', () => {
    expect(gregorianRange(month(30, 4, '2026-12-10'))).toBe('Dec 10, 2026 – Jan 8, 2027')
  })
})
