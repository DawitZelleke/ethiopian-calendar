import { describe, expect, it } from 'vitest'
import { feedLinks } from './feedLinks'

describe('feedLinks', () => {
  it('builds https, webcal and Google subscribe links', () => {
    const links = feedLinks('example.com', false)

    expect(links.https).toBe('https://example.com/calendar.ics')
    expect(links.webcal).toBe('webcal://example.com/calendar.ics')
    expect(links.google).toBe(
      'https://calendar.google.com/calendar/r?cid=webcal%3A%2F%2Fexample.com%2Fcalendar.ics',
    )
  })

  it('adds the weekly option to every link', () => {
    const links = feedLinks('example.com', true)

    expect(links.https).toBe('https://example.com/calendar.ics?weekly=true')
    expect(decodeURIComponent(links.google)).toContain('calendar.ics?weekly=true')
  })
})
