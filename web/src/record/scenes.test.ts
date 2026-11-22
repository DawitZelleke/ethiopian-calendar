import { describe, expect, it } from 'vitest'
import type { Day } from '../api'
import type { Entry } from '../content'
import { buildScenes, next, pickFocus, previous, stepCount } from './scenes'

const nebiyatDay: Day = {
  date: { year: 2019, month: 3, day: 15, monthName: 'Hidar', display: 'Hidar 15, 2019', gregorian: '2026-11-24' },
  dayOfWeek: 'Tuesday',
  isFastDay: true,
  fasts: [{ id: 'tsome-nebiyat', name: 'Tsome Nebiyat (Fast of the Prophets)', dayNumber: 1, totalDays: 44 }],
  observances: [],
  commemorations: [],
}

const hidarTsionDay: Day = {
  ...nebiyatDay,
  date: { ...nebiyatDay.date, day: 21, display: 'Hidar 21, 2019', gregorian: '2026-11-30' },
  fasts: [{ id: 'tsome-nebiyat', name: 'Tsome Nebiyat (Fast of the Prophets)', dayNumber: 7, totalDays: 44 }],
  observances: [
    { id: 'hidar-tsion', name: 'Hidar Tsion (St. Mary of Zion)', kind: 'SaintsDay', date: nebiyatDay.date },
  ],
}

const entry = (id: string): Entry => ({
  id,
  nameEnglish: id,
  nameGeez: 'ጾመ',
  transliteration: id,
  type: 'fast',
  movable: false,
  whatItIs: 'what',
  whyItMatters: 'why',
  whatPeopleDo: ['one', 'two', 'three'],
  sources: [],
  review: { reviewed: false },
})

const entries = { 'tsome-nebiyat': entry('tsome-nebiyat'), 'hidar-tsion': entry('hidar-tsion') }

describe('pickFocus', () => {
  it('shows fast progress as Day X of Y', () => {
    const focus = pickFocus(nebiyatDay, entries)
    expect(focus?.id).toBe('tsome-nebiyat')
    expect(focus?.progress).toEqual({ day: 1, total: 44 })
  })

  it('prefers a feast over the fast it falls inside', () => {
    expect(pickFocus(hidarTsionDay, entries)?.id).toBe('hidar-tsion')
  })

  it('honours the id requested in the URL', () => {
    expect(pickFocus(hidarTsionDay, entries, 'tsome-nebiyat')?.id).toBe('tsome-nebiyat')
  })

  it('prefers anything with written content', () => {
    expect(pickFocus(hidarTsionDay, { 'tsome-nebiyat': entries['tsome-nebiyat'] })?.id).toBe('tsome-nebiyat')
  })

  it('returns nothing on an ordinary day', () => {
    expect(pickFocus({ ...nebiyatDay, fasts: [], isFastDay: false }, entries)).toBeUndefined()
  })
})

describe('buildScenes', () => {
  it('builds title, what, why, list and close scenes when there is content', () => {
    const scenes = buildScenes(nebiyatDay, pickFocus(nebiyatDay, entries), 'example.com')
    expect(scenes.map((s) => s.type)).toEqual(['title', 'text', 'text', 'list', 'close'])
    expect(stepCount(scenes[0])).toBe(4) // date, Gregorian date, name, progress
    expect(stepCount(scenes[3])).toBe(3) // one step per list item
  })

  it('ends by pointing viewers at the page for this fast', () => {
    const scenes = buildScenes(nebiyatDay, pickFocus(nebiyatDay, entries), 'example.com')
    expect(scenes.at(-1)).toMatchObject({ type: 'close', url: 'example.com/tsome-nebiyat' })
  })

  it('builds only title and close without content', () => {
    const scenes = buildScenes(nebiyatDay, pickFocus(nebiyatDay, {}), 'example.com')
    expect(scenes.map((s) => s.type)).toEqual(['title', 'close'])
  })
})

describe('navigation', () => {
  const scenes = buildScenes(nebiyatDay, pickFocus(nebiyatDay, entries), 'example.com')

  it('steps through every beat in order and stops at the end', () => {
    let pos = { scene: 0, step: 0 }
    const total = scenes.reduce((sum, s) => sum + stepCount(s), 0)
    for (let i = 1; i < total; i++) pos = next(scenes, pos)
    expect(pos).toEqual({ scene: scenes.length - 1, step: 0 })
    expect(next(scenes, pos)).toEqual(pos)
  })

  it('going back from a scene start lands on the last step of the previous scene', () => {
    expect(previous(scenes, { scene: 1, step: 0 })).toEqual({ scene: 0, step: 3 })
    expect(previous(scenes, { scene: 0, step: 0 })).toEqual({ scene: 0, step: 0 })
  })
})
