import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { entries } from './content'

const sitemap = readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8')
const robots = readFileSync(new URL('../public/robots.txt', import.meta.url), 'utf8')

describe('sitemap.xml', () => {
  it('lists every fast and feast page', () => {
    for (const id of Object.keys(entries)) {
      expect(sitemap, id).toContain(`<loc>https://13thmonth.ca/${id}</loc>`)
    }
  })

  it('is pointed to by robots.txt', () => {
    expect(robots).toContain('Sitemap: https://13thmonth.ca/sitemap.xml')
  })
})
