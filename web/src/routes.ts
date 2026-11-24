// Which page a path shows. A pure function so the order of the rules can be tested:
// "/feasts", "/lessons", "/about", "/month" and "/record" would all also match the
// fast-and-feast pattern ("/tsome-nebiyat"), so they must be checked first.

export type Route =
  | { page: 'home' }
  | { page: 'month'; year?: number; month?: number }
  | { page: 'record'; date?: string }
  | { page: 'feasts' }
  | { page: 'lessons' }
  | { page: 'lesson'; id: string }
  | { page: 'about' }
  | { page: 'observance'; id: string }

export function matchRoute(path: string): Route {
  const p = path.replace(/\/+$/, '') || '/'

  const month = /^\/month(?:\/(\d{1,4})\/(\d{1,2}))?$/.exec(p)
  if (month) return { page: 'month', year: month[1] ? Number(month[1]) : undefined, month: month[2] ? Number(month[2]) : undefined }

  const record = /^\/record(?:\/(\d{4}-\d{2}-\d{2}))?$/.exec(p)
  if (record) return { page: 'record', date: record[1] }

  if (p === '/feasts') return { page: 'feasts' }
  if (p === '/lessons') return { page: 'lessons' }
  if (p === '/about') return { page: 'about' }

  const lesson = /^\/lessons\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(p)
  if (lesson) return { page: 'lesson', id: lesson[1] }

  const observance = /^\/([a-z]+(?:-[a-z]+)*)$/.exec(p)
  if (observance) return { page: 'observance', id: observance[1] }

  return { page: 'home' }
}
