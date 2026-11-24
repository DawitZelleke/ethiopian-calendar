import { useEffect, useState } from 'react'
import { calendarEvents, fetchDay, fetchYear, formatGregorian, todayIso, type Observance } from '../api'
import { entries } from '../content'
import { pageTitle } from '../site'
import '../home/home.css'
import { nextOfEach } from './nextOfEach'

const SECTIONS: { title: string; intro: string; kinds: Observance['kind'][] }[] = [
  { title: 'Fasts', intro: 'Seasons of fasting and prayer, with their next start date.', kinds: ['FastBegins'] },
  { title: 'Feasts', intro: 'The great feasts of the church year.', kinds: ['Feast'] },
  { title: "Saints' days", intro: 'Annual days of the saints and of St. Mary.', kinds: ['SaintsDay'] },
]

/** Every fast and feast, each with its next date and a link to its page. */
export function FeastsPage() {
  const [events, setEvents] = useState<Observance[]>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    document.title = pageTitle('Fasts & Feasts')
    const iso = todayIso()
    fetchDay(iso)
      .then((day) => Promise.all([fetchYear(day.date.year), fetchYear(day.date.year + 1)]))
      .then((years) => setEvents(nextOfEach(years.flatMap(calendarEvents), iso)))
      .catch((e: Error) => setError(e.message))
  }, [])

  return (
    <main className="home">
      <header>
        <p className="eyebrow">The church year</p>
        <h1>Fasts &amp; Feasts</h1>
        <p className="gregorian">
          Every Wednesday and Friday is also a fast day, except in the fifty days after Fasika and when Genna or
          Timkat falls on them.
        </p>
      </header>

      {error && <p className="gregorian">Could not load the calendar: {error}</p>}

      {events &&
        SECTIONS.map((section) => {
          const items = events.filter((e) => section.kinds.includes(e.kind))
          if (items.length === 0) return null
          return (
            <section key={section.title}>
              <h2>{section.title}</h2>
              <p className="gregorian">{section.intro}</p>
              <ul className="upcoming">
                {items.map((o) => {
                  const entry = entries[o.id]
                  return (
                    <li key={o.id}>
                      <span className="when">Next: {formatGregorian(o.date.gregorian)}</span>
                      <a className="what" href={`/${o.id}`}>
                        {entry?.nameGeez && <span className="geez">{entry.nameGeez} </span>}
                        {o.name}
                      </a>
                      <span className="eth">{o.date.display}</span>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
    </main>
  )
}
