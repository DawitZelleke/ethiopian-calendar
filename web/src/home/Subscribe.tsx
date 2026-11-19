import { useState } from 'react'
import { feedLinks } from './feedLinks'

/** Lets visitors add every fast and feast to their own calendar. */
export function Subscribe() {
  const [copied, setCopied] = useState(false)
  const links = feedLinks(window.location.host)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(links.https)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copy this link:', links.https)
    }
  }

  return (
    <section className="subscribe">
      <h2>Add to your calendar</h2>
      <p className="subscribe-note">
        Every fast and feast for the next three years, including the Wednesday and Friday fasts. Your
        calendar keeps it up to date.
      </p>
      <div className="subscribe-buttons">
        <a className="button" href={links.google} target="_blank" rel="noreferrer">
          Google Calendar
        </a>
        <a className="button" href={links.webcal}>
          Apple / Outlook
        </a>
        <button className="button secondary" type="button" onClick={copy}>
          {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>
    </section>
  )
}
