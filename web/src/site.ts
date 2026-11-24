/** The site's public address, shown on screen (e.g. the last screen of every video). */
export const SITE_HOST = '13thmonth.ca'

export const SITE_NAME = '13th Month'
export const SITE_TAGLINE = 'The Ethiopian Orthodox calendar, one lesson at a time'

/** Sets the browser tab title: "Page · 13th Month". */
export function pageTitle(title?: string): string {
  return title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} · Ethiopian Orthodox Calendar`
}
