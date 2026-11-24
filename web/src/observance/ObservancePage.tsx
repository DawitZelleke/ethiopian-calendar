import { useEffect, useState } from 'react'
import { fetchNextOccurrence, formatGregorian, todayIso, type Occurrence } from '../api'
import { entries } from '../content'
import '../home/home.css'
import './observance.css'

/** A shareable page for one fast or feast, e.g. /tsome-nebiyat. This is where videos send viewers. */
export function ObservancePage({ id }: { id: string }) {
  const entry = entries[id]
  const [occurrence, setOccurrence] = useState<Occurrence>()
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetchNextOccurrence(id, todayIso()).then(setOccurrence, () => setNotFound(true))
  }, [id])

  // Hooks must run on every render, so this comes before the early return below.
  useDocumentTitle(entry ? `${entry.transliteration} (${entry.nameEnglish})` : occurrence?.name)

  if (notFound) {
    return (
      <main className="home">
        <h1>Not found</h1>
        <p className="gregorian">
          There is no fast or feast called "{id}". <a href="/">See what's coming up</a>.
        </p>
      </main>
    )
  }

  const title = entry?.transliteration ?? occurrence?.name ?? '…'

  return (
    <main className="home observance">

      <header>
        {entry && <p className="eyebrow">{typeLabel(entry.type)}</p>}
        {entry && <p className="name-geez geez">{entry.nameGeez}</p>}
        <h1>{title}</h1>
        {entry && <p className="gregorian">{entry.nameEnglish}</p>}
        {entry?.alsoKnownAs && entry.alsoKnownAs.length > 0 && (
          <p className="also-known">Also called {entry.alsoKnownAs.join(', ')}</p>
        )}
      </header>

      {occurrence && <When occurrence={occurrence} />}

      {entry ? (
        <>
          {!entry.review.reviewed && (
            <p className="draft-note">
              Draft: I'm still learning this one, and the text hasn't been reviewed yet.
            </p>
          )}
          {entry.verse && (
            <blockquote className="verse">
              <p>{entry.verse.text}</p>
              {entry.verse.translation && <p>{entry.verse.translation}</p>}
              <cite>{entry.verse.reference}</cite>
            </blockquote>
          )}
          <section>
            <h2>What it is</h2>
            <p>{entry.whatItIs}</p>
          </section>
          <section>
            <h2>Why it matters</h2>
            <p>{entry.whyItMatters}</p>
          </section>
          {entry.whatPeopleDo.length > 0 && (
            <section>
              <h2>What people do</h2>
              <ul className="practices">
                {entry.whatPeopleDo.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}
          {entry.abstainFrom && (
            <section>
              <h2>Abstain from</h2>
              <p>{entry.abstainFrom}</p>
            </section>
          )}
          {entry.sources.length > 0 && (
            <section>
              <h2>Sources</h2>
              <ul className="practices">
                {entry.sources.map((s) => (
                  <li key={s.title}>{s.url ? <a href={s.url}>{s.title}</a> : s.title}</li>
                ))}
              </ul>
            </section>
          )}
        </>
      ) : (
        occurrence && <p className="draft-note">I haven't written about this one yet.</p>
      )}

    </main>
  )
}

function When({ occurrence: o }: { occurrence: Occurrence }) {
  const isFast = o.lengthInDays > 1
  return (
    <section className="today-card">
      {o.inProgress && isFast ? (
        <>
          <p className="status fast">Happening now</p>
          <p className="fast-name">
            Day {o.dayNumber} of {o.lengthInDays}
          </p>
          <p className="progress">Ends {formatGregorian(o.end.gregorian)}</p>
        </>
      ) : o.inProgress ? (
        <>
          <p className="status fast">Today</p>
          <p className="fast-name">{o.start.display}</p>
        </>
      ) : (
        <>
          <p className="status">{isFast ? 'Next begins' : 'Next'}</p>
          <p className="fast-name">{formatGregorian(o.start.gregorian)}</p>
          <p className="progress">
            {o.start.display}
            {isFast && ` · ${o.lengthInDays} days, until ${formatGregorian(o.end.gregorian)}`}
          </p>
        </>
      )}
    </section>
  )
}

function typeLabel(type: string) {
  return type === 'fast' ? 'Fast' : type === 'feast' ? 'Feast' : "Saint's day"
}

function useDocumentTitle(title?: string) {
  useEffect(() => {
    if (title) document.title = `${title} · 13th Month`
  }, [title])
}
