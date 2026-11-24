import type { ReactNode } from 'react'
import { SITE_NAME, SITE_TAGLINE } from '../site'
import './layout.css'

const NAV = [
  { href: '/', label: 'Today', match: (p: string) => p === '/' },
  { href: '/month', label: 'Calendar', match: (p: string) => p.startsWith('/month') },
  { href: '/feasts', label: 'Feasts', match: (p: string) => p === '/feasts' },
  { href: '/lessons', label: 'Lessons', match: (p: string) => p.startsWith('/lessons') },
  { href: '/about', label: 'About', match: (p: string) => p === '/about' },
]

/** The header, menu and footer around every page except Record Mode. */
export function Layout({ children }: { children: ReactNode }) {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'

  return (
    <>
      <header className="site-header">
        <div className="site-header-inner">
          <a className="wordmark" href="/">
            <span className="wordmark-13">13</span>
            <span>
              <strong>{SITE_NAME}</strong>
              <small>{SITE_TAGLINE}</small>
            </span>
          </a>
          <nav className="site-nav" aria-label="Main">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} aria-current={item.match(path) ? 'page' : undefined}>
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      {children}

      <footer className="site-footer">
        <div className="site-footer-inner">
          <p>
            Dates are calculated with Bahire Hasab, the Ethiopian Orthodox Church's traditional reckoning, and
            checked against the church's own published rules. <a href="/about">How it works</a>
          </p>
          <p>
            <a href="/calendar.ics">Calendar feed</a> · <a href="/about#parishes">For parishes</a> ·{' '}
            <a href="https://github.com/DawitZelleke/ethiopian-calendar">Source code</a>
          </p>
        </div>
      </footer>
    </>
  )
}
