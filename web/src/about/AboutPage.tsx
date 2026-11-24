import { useEffect } from 'react'
import { pageTitle } from '../site'
import '../home/home.css'
import '../observance/observance.css'
import './about.css'

const WIDGET_SNIPPET = `<div class="ethiopian-calendar" data-view="month"></div>
<script src="https://dawitzelleke.github.io/ethiopian-calendar/widget.js" defer></script>`

/** What the Ethiopian calendar is, how the dates are worked out, and how they're checked. */
export function AboutPage() {
  useEffect(() => {
    document.title = pageTitle('About')
  }, [])

  return (
    <main className="home observance about">
      <header>
        <p className="eyebrow">About</p>
        <h1>Why 13 months?</h1>
        <p className="gregorian">
          The Ethiopian calendar has twelve months of thirty days, then a thirteenth month, Pagume, of five days, or
          six in a leap year. That thirteenth month gives this site its name.
        </p>
      </header>

      <section>
        <h2>A different year</h2>
        <p>
          The Ethiopian year begins on Meskerem 1, in September. The Ethiopian Orthodox Church dates the years from
          the birth of Christ by its own reckoning, so the Ethiopian year is seven or eight years behind the Gregorian
          one: Meskerem 2019 began in September 2026.
        </p>
        <p>
          Each year is dedicated to one of the four Evangelists in turn: Matthew, Mark, Luke and John. The year of
          Luke is the leap year, the one with a sixth day of Pagume.
        </p>
      </section>

      <section>
        <h2>How the dates are worked out</h2>
        <p>
          Christmas (Genna) and many feasts fall on fixed Ethiopian dates. Easter (Fasika) and the fasts and feasts
          around it move every year. The church calculates them with <strong>Bahire Hasab</strong>, a traditional
          method that follows the moon through a 19-year cycle, finds the start of the Fast of Nineveh, and counts every
          movable feast from there.
        </p>
        <p>This site does that calculation from the rules themselves, for any year.</p>
      </section>

      <section>
        <h2>How the dates are checked</h2>
        <ul className="practices">
          <li>Every day from 1900 to 2100 converts to the Ethiopian calendar and back without a mistake.</li>
          <li>Easter matches an independent Easter calculation for every year from 1900 to 2099.</li>
          <li>
            Every movable feast from 1892 to 2092 falls within the earliest and latest dates the church publishes for
            it, on the right day of the week.
          </li>
          <li>
            The results were compared with two other open-source Ethiopian calendar programs, and every difference
            was traced to its cause.
          </li>
          <li>The fasting rules were confirmed with people who keep them.</li>
        </ul>
        <p>
          The full details are in the{' '}
          <a href="https://github.com/DawitZelleke/ethiopian-calendar#how-i-know-its-correct">source code</a>.
        </p>
      </section>

      <section>
        <h2>Who's behind this</h2>
        <p>
          I grew up around the Ethiopian Orthodox calendar but never fully understood it, so I'm learning it one fast
          and feast at a time and sharing what I learn. Where something comes from a priest, a teacher or the church's
          own publications, it says so; where I'm still unsure, it's marked as not yet reviewed. If you spot a mistake,
          I'd be grateful to hear about it.
        </p>
      </section>

      <section id="parishes">
        <h2>For parishes</h2>
        <p>
          Any church website can show this calendar, updated automatically every year, by pasting two lines into a
          page (for example a WordPress "Custom HTML" block):
        </p>
        <pre className="snippet">
          <code>{WIDGET_SNIPPET}</code>
        </pre>
        <p>
          It shows the month in Amharic and English with every fast and feast, and lets members add the calendar to
          their phones in one tap. A parish's own days, such as when its tabot comes out, can be added too.{' '}
          <a href="https://dawitzelleke.github.io/ethiopian-calendar/">See it working</a>.
        </p>
      </section>

      <section>
        <h2>Sources</h2>
        <ul className="practices">
          <li>
            <a href="https://www.ethiopianorthodox.org/english/calendar.html">
              The Ethiopian Orthodox Church (Aymero W. and Joachim M., 1970)
            </a>
            , as published by the Ethiopian Orthodox Tewahedo Church
          </li>
          <li>Teachings shared in the parish community, credited on each page</li>
          <li>
            Bible quotations from the <a href="https://ebible.org/web/">World English Bible</a> (public domain)
          </li>
        </ul>
      </section>
    </main>
  )
}
