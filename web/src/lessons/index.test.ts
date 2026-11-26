import { describe, expect, it } from 'vitest'
import { lessons, publishedLessons, type Lesson } from '.'

const lesson = (date: string): Lesson => ({
  id: date,
  date,
  observance: 'tsome-nebiyat',
  hook: '',
  verse: { translation: '', reference: '' },
  story: [],
  meaning: '',
  sources: [],
  review: { reviewed: false },
})

describe('publishedLessons', () => {
  it('shows lessons up to and including today, newest first', () => {
    const all = [lesson('2026-11-26'), lesson('2026-11-28'), lesson('2026-11-27')]
    expect(publishedLessons('2026-11-27', all).map((l) => l.date)).toEqual(['2026-11-27', '2026-11-26'])
  })
})

describe('lesson files', () => {
  it('have one lesson per date and unique ids', () => {
    expect(new Set(lessons.map((l) => l.date)).size).toBe(lessons.length)
    expect(new Set(lessons.map((l) => l.id)).size).toBe(lessons.length)
  })

  it('tell the story in two to four beats', () => {
    for (const l of lessons) {
      expect(l.story.length, l.id).toBeGreaterThanOrEqual(2)
      expect(l.story.length, l.id).toBeLessThanOrEqual(4)
    }
  })
})
