import { describe, expect, it } from 'vitest'
import type { Observance } from '../api'
import { nextOfEach } from './nextOfEach'

const o = (id: string, gregorian: string): Observance => ({
  id,
  name: id,
  kind: 'Feast',
  date: { year: 2019, month: 1, day: 1, monthName: '', display: '', gregorian },
})

describe('nextOfEach', () => {
  it('keeps the next occurrence of each id on or after the date, in date order', () => {
    const events = [o('genna', '2027-01-07'), o('genna', '2028-01-07'), o('meskel', '2026-09-27'), o('meskel', '2027-09-27'), o('fasika', '2027-05-02')]

    const result = nextOfEach(events, '2026-11-24')

    expect(result.map((e) => `${e.id} ${e.date.gregorian}`)).toEqual([
      'genna 2027-01-07',
      'fasika 2027-05-02',
      'meskel 2027-09-27', // this year's Meskel has passed, so next year's
    ])
  })

  it('includes something happening today', () => {
    expect(nextOfEach([o('tsome-nebiyat', '2026-11-24')], '2026-11-24')).toHaveLength(1)
  })
})
