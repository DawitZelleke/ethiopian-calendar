/** Calendar feed URLs for a host, e.g. "ethiopian-calendar.onrender.com". */
export function feedLinks(host: string) {
  const path = `${host}/calendar.ics`
  const webcal = `webcal://${path}`
  return {
    https: `https://${path}`,
    // webcal:// opens the subscribe dialog in Apple Calendar, Outlook and most phone calendars.
    webcal,
    // Google Calendar subscribes from its own page, given the feed as "cid".
    google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`,
  }
}
