import { describe, expect, it } from 'vitest'
import { feedLinks } from './feedLinks'

describe('feedLinks', () => {
  it('builds https, webcal and Google subscribe links', () => {
    const links = feedLinks('example.com')

    expect(links.https).toBe('https://example.com/calendar.ics')
    expect(links.webcal).toBe('webcal://example.com/calendar.ics')
    expect(links.google).toBe(
      'https://calendar.google.com/calendar/r?cid=webcal%3A%2F%2Fexample.com%2Fcalendar.ics',
    )
  })
})
