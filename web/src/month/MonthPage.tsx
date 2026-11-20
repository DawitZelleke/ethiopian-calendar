import { useEffect, useState } from 'react'
import { fetchDay, fetchMonth, todayIso, type Day, type Month } from '../api'
import { entries } from '../content'
import '../home/home.css'
import './month.css'
import { WEEKDAYS, adjacentMonth, gregorianRange, weeks } from './grid'

/** A month of the Ethiopian calendar: /month/2019/3, or /month for the current month. */
export function MonthPage({ year, month }: { year?: number; month?: number }) {
  const [data, setData] = useState<Month>()
  const [error, setError] = useState<string>()
  const today = todayIso()

  useEffect(() => {
    // Without a year and month in the URL, show the month that contains today.
    const target = year && month ? Promise.resolve({ year, month }) : fetchDay(todayIso()).then((d) => d.date)
    target
      .then((t) => fetchMonth(t.year, t.month))
      .then(setData)
      .catch((e: Error) => setError(e.message))
  }, [year, month])

  useEffect(() => {
    if (data) document.title = `${data.monthName} ${data.year} · Ethiopian Orthodox Calendar`
  }, [data])

  if (error) {
    return (
      <main className="home">
        <h1>Could not load this month</h1>
        <p className="gregorian">
          {error}. <a href="/month">Go to the current month</a>.
        </p>
      </main>
    )
  }

  if (!data) {
    return (
      <main className="home">
        <h1>Loading…</h1>
      </main>
    )
  }

  const previous = adjacentMonth(data.year, data.month, -1)
  const next = adjacentMonth(data.year, data.month, 1)
  const events = data.days.flatMap((d) => [
    ...d.observances.map((o) => ({ day: d, id: o.id, name: o.name })),
    ...d.fasts
      .filter((f) => f.dayNumber === 1 && f.totalDays > 1)
      .map((f) => ({ day: d, id: f.id, name: `${f.name} begins (${f.totalDays} days)` })),
  ])

  return (
    <main className="home month-page">
      <a className="back" href="/">
        ← Ethiopian Orthodox Calendar
      </a>

      <header className="month-header">
        <a className="month-nav" href={`/month/${previous.year}/${previous.month}`} aria-label="Previous month">
          ‹
        </a>
        <div>
          <h1>
            {data.monthName} {data.year}
          </h1>
          <p className="gregorian">{gregorianRange(data.days)}</p>
        </div>
        <a className="month-nav" href={`/month/${next.year}/${next.month}`} aria-label="Next month">
          ›
        </a>
      </header>

      <div className="month-grid" role="grid">
        {WEEKDAYS.map((w) => (
          <div key={w} className="weekday" role="columnheader">
            {w}
          </div>
        ))}
        {weeks(data.days)
          .flat()
          .map((day, i) => (day ? <DayCell key={day.date.gregorian} day={day} isToday={day.date.gregorian === today} /> : <div key={`empty-${i}`} />))}
      </div>

      <p className="legend">
        <span className="legend-fast" /> Fast day <span className="legend-feast" /> Feast
      </p>

      {events.length > 0 && (
        <section>
          <h2>This month</h2>
          <ul className="upcoming">
            {events.map((e) => (
              <li key={`${e.id}-${e.day.date.gregorian}`}>
                <span className="when">
                  {e.day.date.monthName} {e.day.date.day} · {e.day.dayOfWeek}
                </span>
                <a className="what" href={`/${e.id}`}>
                  {entries[e.id]?.nameGeez && <span className="geez">{entries[e.id].nameGeez} </span>}
                  {e.name}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}

function DayCell({ day, isToday }: { day: Day; isToday: boolean }) {
  const [, m, d] = day.date.gregorian.split('-').map(Number)
  const isFeast = day.observances.length > 0
  const label = [
    `${day.date.display}, ${day.dayOfWeek}`,
    ...day.fasts.map((f) => f.name),
    ...day.observances.map((o) => o.name),
  ].join('. ')

  const classes = ['day', day.isFastDay && 'fast', isFeast && 'feast', isToday && 'today'].filter(Boolean).join(' ')
  const link = day.observances[0]?.id ?? (day.fasts.length > 0 ? day.fasts[0].id : undefined)
  const content = (
    <>
      <span className="eth-day">{day.date.day}</span>
      <span className="greg-day">{d === 1 || day.date.day === 1 ? `${monthShort(m)} ${d}` : d}</span>
    </>
  )

  return link ? (
    <a className={classes} href={`/${link}`} title={label} aria-label={label} role="gridcell">
      {content}
    </a>
  ) : (
    <div className={classes} title={label} aria-label={label} role="gridcell">
      {content}
    </div>
  )
}

function monthShort(month: number) {
  return new Date(2000, month - 1, 1).toLocaleDateString('en-US', { month: 'short' })
}
