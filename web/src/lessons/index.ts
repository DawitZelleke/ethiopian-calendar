// Lessons: one per video. Each is a short history lesson anchored on a Bible verse,
// tied to a date and the fast or feast of that day. Separate from the observance
// entries (src/content), which describe the fast itself.

import type { Source } from '../content'

export interface Lesson {
  id: string
  /** The Gregorian date the lesson is for, yyyy-MM-dd. */
  date: string
  /** The fast or feast it belongs to, e.g. "tsome-nebiyat". */
  observance: string
  /** One sentence that makes anyone stop scrolling. */
  hook: string
  verse: {
    /** The verse in the original Ge'ez/Amharic, only if taken from a printed Amharic Bible. */
    text?: string
    translation: string
    reference: string
  }
  /** The history behind the verse: two to four short beats, one per screen. */
  story: string[]
  /** How it connects to the fast or feast, for anyone. */
  meaning: string
  sources: Source[]
  review: { reviewed: boolean; reviewedBy?: string; notes?: string }
}

const files = import.meta.glob<Lesson>('./*.json', { eager: true, import: 'default' })

export const lessons: Lesson[] = Object.values(files)

/** The lesson asked for by id, or else the lesson for this date. */
export function lessonFor(isoDate: string, id?: string): Lesson | undefined {
  return (id ? lessons.find((l) => l.id === id) : undefined) ?? lessons.find((l) => l.date === isoDate)
}
