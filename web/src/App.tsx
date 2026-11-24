import { AboutPage } from './about/AboutPage'
import { todayIso } from './api'
import { FeastsPage } from './feasts/FeastsPage'
import { Home } from './home/Home'
import { Layout } from './layout/Layout'
import { LessonPage, LessonsPage } from './lessons/LessonPages'
import { MonthPage } from './month/MonthPage'
import { ObservancePage } from './observance/ObservancePage'
import { RecordMode } from './record/RecordMode'
import { matchRoute } from './routes'

/**
 * Pages (see routes.ts for the order rules):
 *   /                                  today and what's coming up
 *   /month, /month/2019/3              a month of the Ethiopian calendar
 *   /feasts                            every fast and feast, with its next date
 *   /lessons, /lessons/<id>            history lessons, one per video
 *   /about                             the calendar explained, and how the dates are checked
 *   /tsome-nebiyat                     one fast or feast
 *   /record/2026-11-24?lesson=<id>     Record Mode (no site menu: it's a video canvas)
 */
export default function App() {
  const route = matchRoute(window.location.pathname)

  if (route.page === 'record') {
    const params = new URLSearchParams(window.location.search)
    return (
      <RecordMode
        isoDate={route.date ?? todayIso()}
        focusId={params.get('focus') ?? undefined}
        lessonId={params.get('lesson') ?? undefined}
      />
    )
  }

  return <Layout>{page(route)}</Layout>
}

function page(route: ReturnType<typeof matchRoute>) {
  switch (route.page) {
    case 'month':
      return <MonthPage year={route.year} month={route.month} />
    case 'feasts':
      return <FeastsPage />
    case 'lessons':
      return <LessonsPage />
    case 'lesson':
      return <LessonPage id={route.id} />
    case 'about':
      return <AboutPage />
    case 'observance':
      return <ObservancePage id={route.id} />
    default:
      return <Home />
  }
}
