// Record Mode is a sequence of scenes. Each scene reveals its content in steps,
// one step per narration beat. This file is pure logic (no React) so it can be tested.

import type { Day, FastDay, Observance } from '../api'
import { formatGregorian } from '../api'
import type { Entry } from '../content'
import type { Lesson } from '../lessons'

export interface Focus {
  id: string
  name: string
  kindLabel: string
  progress?: { day: number; total: number }
  entry?: Entry
}

export type Scene =
  | {
      type: 'title'
      ethiopianDate: string
      ethiopianYear: string
      gregorianDate: string
      focus?: Focus
    }
  | { type: 'text'; label: string; text: string }
  | { type: 'verse'; text?: string; translation?: string; reference: string }
  | { type: 'list'; label: string; items: string[] }
  | { type: 'close'; line: string; url: string }

export interface Position {
  scene: number
  step: number
}

const kindLabels: Record<Observance['kind'], string> = {
  Feast: 'Feast',
  FastBegins: 'Fast begins',
  SaintsDay: "Saint's day",
}

function fromFast(fast: FastDay, entry?: Entry): Focus {
  return {
    id: fast.id,
    name: fast.name,
    kindLabel: 'Fast',
    progress: fast.totalDays > 1 ? { day: fast.dayNumber, total: fast.totalDays } : undefined,
    entry,
  }
}

function fromObservance(o: Observance, entry?: Entry): Focus {
  return { id: o.id, name: o.name, kindLabel: kindLabels[o.kind], entry }
}

/**
 * What the video is about. Order of preference:
 * the id asked for in the URL, then anything with written content
 * (feasts before fasts), then anything at all.
 */
export function pickFocus(day: Day, entries: Record<string, Entry>, requestedId?: string): Focus | undefined {
  const candidates: Focus[] = [
    ...day.observances.map((o) => fromObservance(o, entries[o.id])),
    ...day.fasts.map((f) => fromFast(f, entries[f.id])),
  ]

  return (
    candidates.find((c) => c.id === requestedId) ??
    candidates.find((c) => c.entry) ??
    candidates[0]
  )
}

/** Steps in the title scene: Ethiopian date, Gregorian date, name, then progress if it's a fast. */
export function stepCount(scene: Scene): number {
  switch (scene.type) {
    case 'title':
      if (!scene.focus) return 2
      return scene.focus.progress ? 4 : 3
    case 'list':
      return scene.items.length
    default:
      return 1
  }
}

/**
 * The scenes for one video. With a lesson: date, hook, verse, the story (one beat per
 * screen), why it matters, close. Without one: the fast or feast's own description.
 */
export function buildScenes(day: Day, focus: Focus | undefined, siteUrl: string, lesson?: Lesson): Scene[] {
  const scenes: Scene[] = [
    {
      type: 'title',
      ethiopianDate: `${day.date.monthName} ${day.date.day}`,
      ethiopianYear: `${day.date.year} E.C.`,
      gregorianDate: formatGregorian(day.date.gregorian),
      focus,
    },
  ]

  const entry = focus?.entry
  if (lesson) {
    scenes.push({ type: 'text', label: 'Today', text: lesson.hook })
    scenes.push({ type: 'verse', ...lesson.verse })
    for (const beat of lesson.story) scenes.push({ type: 'text', label: 'The story', text: beat })
    scenes.push({ type: 'text', label: 'Why it matters', text: lesson.meaning })
  } else if (entry) {
    if (entry.verse) {
      scenes.push({ type: 'verse', ...entry.verse })
    }
    scenes.push({ type: 'text', label: 'What it is', text: entry.whatItIs })
    scenes.push({ type: 'text', label: 'Why it matters', text: entry.whyItMatters })
    if (entry.whatPeopleDo.length > 0) {
      scenes.push({ type: 'list', label: 'What people do', items: entry.whatPeopleDo })
    }
  }

  // Point viewers at the page for this exact fast or feast.
  const pageId = lesson?.observance ?? entry?.id
  const url = pageId ? `${siteUrl}/${pageId}` : siteUrl
  scenes.push({ type: 'close', line: "I'm learning these one by one. Follow along.", url })
  return scenes
}

export function next(scenes: Scene[], pos: Position): Position {
  if (pos.step < stepCount(scenes[pos.scene]) - 1) return { ...pos, step: pos.step + 1 }
  if (pos.scene < scenes.length - 1) return { scene: pos.scene + 1, step: 0 }
  return pos
}

export function previous(scenes: Scene[], pos: Position): Position {
  if (pos.step > 0) return { ...pos, step: pos.step - 1 }
  if (pos.scene > 0) {
    const scene = pos.scene - 1
    return { scene, step: stepCount(scenes[scene]) - 1 }
  }
  return pos
}
