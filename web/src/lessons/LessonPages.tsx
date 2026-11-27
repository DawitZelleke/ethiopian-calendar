import { useEffect } from 'react'
import { formatGregorian, todayIso } from '../api'
import { entries } from '../content'
import { pageTitle } from '../site'
import { lessons, publishedLessons, type Lesson } from '.'
import '../home/home.css'
import '../observance/observance.css'
import './lessons.css'

function observanceName(lesson: Lesson) {
  const entry = entries[lesson.observance]
  return entry ? `${entry.nameGeez} · ${entry.transliteration}` : lesson.observance
}

/** All lessons: what viewers look for after a video. */
export function LessonsPage() {
  useEffect(() => {
    document.title = pageTitle('Lessons')
  }, [])

  return (
    <main className="home">
      <header>
        <p className="eyebrow">Lessons</p>
        <h1>One verse, one story</h1>
        <p className="gregorian">
          Short history lessons, each built around a Bible verse and the fast or feast of its day. I'm learning these
          one by one; follow along.
        </p>
      </header>

      <ul className="lesson-list">
        {publishedLessons(todayIso()).map((lesson) => (
          <li key={lesson.id}>
            <a href={`/lessons/${lesson.id}`}>
              <span className="when">
                {formatGregorian(lesson.date)} · <span className="geez">{observanceName(lesson)}</span>
              </span>
              <strong>{lesson.hook}</strong>
              <span className="ref">{lesson.verse.reference}</span>
            </a>
          </li>
        ))}
      </ul>
    </main>
  )
}

/** One lesson, in full: the page a video points to. */
export function LessonPage({ id }: { id: string }) {
  const lesson = lessons.find((l) => l.id === id)

  useEffect(() => {
    document.title = pageTitle(lesson ? lesson.hook : 'Lesson not found')
  }, [lesson])

  if (!lesson) {
    return (
      <main className="home">
        <h1>Lesson not found</h1>
        <p className="gregorian">
          <a href="/lessons">See all lessons</a>.
        </p>
      </main>
    )
  }

  return (
    <main className="home observance">
      <header>
        <p className="eyebrow">
          {formatGregorian(lesson.date)} · <a href={`/${lesson.observance}`}>{observanceName(lesson)}</a>
        </p>
        <h1>{lesson.hook}</h1>
      </header>

      {!lesson.review.reviewed && (
        <p className="draft-note">I'm still learning this one, and it hasn't been reviewed yet.</p>
      )}

      <blockquote className="verse">
        {lesson.verse.text && <p>{lesson.verse.text}</p>}
        <p>{lesson.verse.translation}</p>
        <cite>{lesson.verse.reference}</cite>
      </blockquote>

      <section>
        <h2>The story</h2>
        {lesson.story.map((beat) => (
          <p key={beat} className="story-beat">
            {beat}
          </p>
        ))}
      </section>

      <section>
        <h2>Why it matters</h2>
        <p>{lesson.meaning}</p>
      </section>

      {lesson.sources.length > 0 && (
        <section>
          <h2>Sources</h2>
          <ul className="practices">
            {lesson.sources.map((s) => (
              <li key={s.title}>{s.url ? <a href={s.url}>{s.title}</a> : s.title}</li>
            ))}
          </ul>
        </section>
      )}

      <p className="gregorian">
        <a href={`/${lesson.observance}`}>More about {observanceName(lesson)} →</a>
      </p>
    </main>
  )
}
