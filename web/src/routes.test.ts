import { describe, expect, it } from 'vitest'
import { matchRoute } from './routes'

describe('matchRoute', () => {
  it.each([
    ['/', { page: 'home' }],
    ['/month', { page: 'month', year: undefined, month: undefined }],
    ['/month/2019/3', { page: 'month', year: 2019, month: 3 }],
    ['/record/2026-11-24', { page: 'record', date: '2026-11-24' }],
    ['/feasts', { page: 'feasts' }],
    ['/lessons', { page: 'lessons' }],
    ['/lessons/ethiopian-reading-isaiah', { page: 'lesson', id: 'ethiopian-reading-isaiah' }],
    ['/about', { page: 'about' }],
    ['/tsome-nebiyat', { page: 'observance', id: 'tsome-nebiyat' }],
    ['/tsome-nebiyat/', { page: 'observance', id: 'tsome-nebiyat' }],
  ])('%s', (path, expected) => {
    expect(matchRoute(path)).toEqual(expected)
  })

  it('checks the named pages before the fast-and-feast pattern', () => {
    // "feasts", "lessons" and "about" are lowercase words, so the observance rule would also match them.
    for (const page of ['feasts', 'lessons', 'about', 'month', 'record']) {
      expect(matchRoute(`/${page}`).page).toBe(page)
    }
  })
})
