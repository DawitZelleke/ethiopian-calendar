import { useEffect, useState } from 'react'
import { calendarEvents, fetchDay, fetchYear, formatGregorian, todayIso, type Day, type Observance } from '../api'
import { entries } from '../content'
import './home.css'
import { Subscribe } from './Subscribe'

export function Home() {
  const [today, setToday] = useState<Day>()
  const [upcoming, setUpcoming] = useState<Observance[]>([])
  const [error, setError] = useState<string>()

  useEffect(() => {
    const iso = todayIso()
    fetchDay(iso)
      .then(async (day) => {
        setToday(day)
        // The next few observances may fall in the next Ethiopian year.
        const years = await Promise.all([fetchYear(day.date.year), fetchYear(day.date.year + 1)])
        const all = years.flatMap(calendarEvents)
        setUpcoming(all.filter((o) => o.date.gregorian >= iso).slice(0, 8))
      })
      .catch((e: Error) => setError(e.message))
  }, [])

  return (
    <main className="home">
      <header>
        <p className="eyebrow">Ethiopian Orthodox Calendar</p>
        {today ? (
          <>
            <h1>
              {today.date.monthName} {today.date.day}, {today.date.year}
            </h1>
            <p className="gregorian">{formatGregorian(today.date.gregorian)}</p>
            <p className="month-link">
              <a href="/month">View {today.date.monthName} {today.date.year} →</a>
            </p>
          </>
        ) : (
          <h1>{error ? 'Could not load the calendar' : 'Loading…'}</h1>
        )}
      </header>

      {today && (
        <section className="today-card">
          {today.fasts.length > 0 ? (
            today.fasts.map((fast) => (
              <div key={fast.id}>
                <p className="status fast">Fast day</p>
                <p className="fast-name">{entries[fast.id]?.transliteration ?? fast.name}</p>
                {fast.totalDays > 1 && (
                  <p className="progress">
                    Day {fast.dayNumber} of {fast.totalDays}
                  </p>
                )}
              </div>
            ))
          ) : (
            <p className="status">Not a fast day</p>
          )}
          {today.observances.map((o) => (
            <p key={o.id} className="fast-name">
              {o.name}
            </p>
          ))}
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <h2>Coming up</h2>
          <ul className="upcoming">
            {upcoming.map((o) => {
              const entry = entries[o.id]
              return (
                <li key={`${o.id}-${o.date.gregorian}`}>
                  <span className="when">{formatGregorian(o.date.gregorian)}</span>
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
      )}

      <Subscribe />

      <footer>
        Dates are computed with Bahire Hasab, the church's traditional calculation.{' '}
        <a href="https://github.com/DawitZelleke/ethiopian-calendar">Source code</a>
      </footer>
    </main>
  )
}
