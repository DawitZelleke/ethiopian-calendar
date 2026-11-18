import { Home } from './home/Home'
import { RecordMode } from './record/RecordMode'
import { todayIso } from './api'

/**
 * Two pages, so a router library would be overkill:
 *   /                                  home: today and what's coming up
 *   /record/2026-11-24?focus=<id>      Record Mode for a date (focus is optional)
 *   /record                            Record Mode for today
 */
export default function App() {
  const match = /^\/record(?:\/(\d{4}-\d{2}-\d{2}))?\/?$/.exec(window.location.pathname)
  if (match) {
    const focus = new URLSearchParams(window.location.search).get('focus') ?? undefined
    return <RecordMode isoDate={match[1] ?? todayIso()} focusId={focus} />
  }
  return <Home />
}
