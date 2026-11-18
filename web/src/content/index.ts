// Written content for each fast and feast. The engine computes the dates;
// these files hold the words. One JSON file per observance, named by its id.

export interface Source {
  title: string
  url?: string
}

export interface Entry {
  id: string
  nameEnglish: string
  nameGeez: string
  transliteration: string
  type: 'fast' | 'feast' | 'saints-day'
  movable: boolean
  abstainFrom?: string
  /** One or two sentences, readable aloud in about 10 seconds. */
  whatItIs: string
  whyItMatters: string
  whatPeopleDo: string[]
  sources: Source[]
  review: {
    reviewed: boolean
    reviewedBy?: string
    notes?: string
  }
}

const files = import.meta.glob<Entry>('./*.json', { eager: true, import: 'default' })

export const entries: Record<string, Entry> = Object.fromEntries(
  Object.values(files).map((entry) => [entry.id, entry]),
)
