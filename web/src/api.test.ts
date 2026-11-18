import { describe, expect, it } from 'vitest'
import { calendarEvents, type EthiopianDate, type Year } from './api'

const date = (gregorian: string): EthiopianDate => ({
  year: 2019, month: 1, day: 1, monthName: 'Meskerem', display: '', gregorian,
})

describe('calendarEvents', () => {
  const year: Year = {
    year: 2019,
    observances: [
      { id: 'abiy-tsom', name: 'Abiy Tsom (Great Lent)', kind: 'FastBegins', date: date('2027-03-08') },
      { id: 'genna', name: 'Genna (Christmas)', kind: 'Feast', date: date('2027-01-07') },
    ],
    fastPeriods: [
      { id: 'tsome-nebiyat', name: 'Tsome Nebiyat', start: date('2026-11-24'), end: date('2027-01-06'), lengthInDays: 44 },
      { id: 'abiy-tsom', name: 'Abiy Tsom', start: date('2027-03-08'), end: date('2027-05-01'), lengthInDays: 55 },
      { id: 'gehad-timkat', name: 'Gehad of Timkat', start: date('2027-01-18'), end: date('2027-01-18'), lengthInDays: 1 },
    ],
  }

  it('adds fixed fast starts, skips duplicates and one-day fasts, sorts by date', () => {
    const events = calendarEvents(year)
    expect(events.map((e) => e.id)).toEqual(['tsome-nebiyat', 'genna', 'abiy-tsom'])
    expect(events[0].name).toBe('Tsome Nebiyat begins (44 days)')
  })
})
