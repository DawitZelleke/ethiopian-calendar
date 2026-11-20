import { Home } from './home/Home'
import { MonthPage } from './month/MonthPage'
import { ObservancePage } from './observance/ObservancePage'
import { RecordMode } from './record/RecordMode'
import { todayIso } from './api'

/**
 * A handful of page types, so a router library would be overkill:
 *   /                                  home: today and what's coming up
 *   /month, /month/2019/3              a month of the Ethiopian calendar
 *   /record/2026-11-24?focus=<id>      Record Mode for a date (focus is optional)
 *   /record                            Record Mode for today
 *   /tsome-nebiyat                     a page for one fast or feast (any lowercase id)
 * Order matters: "/month" and "/record" would also match the fast-and-feast pattern.
 */
export default function App() {
  const path = window.location.pathname

  const month = /^\/month(?:\/(\d{1,4})\/(\d{1,2}))?\/?$/.exec(path)
  if (month) {
    return <MonthPage year={month[1] ? Number(month[1]) : undefined} month={month[2] ? Number(month[2]) : undefined} />
  }

  const record = /^\/record(?:\/(\d{4}-\d{2}-\d{2}))?\/?$/.exec(path)
  if (record) {
    const focus = new URLSearchParams(window.location.search).get('focus') ?? undefined
    return <RecordMode isoDate={record[1] ?? todayIso()} focusId={focus} />
  }

  const observance = /^\/([a-z]+(?:-[a-z]+)*)\/?$/.exec(path)
  if (observance) {
    return <ObservancePage id={observance[1]} />
  }

  return <Home />
}
