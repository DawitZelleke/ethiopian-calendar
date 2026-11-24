import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchDay, type Day } from '../api'
import { entries } from '../content'
import { lessonFor } from '../lessons'
import { buildScenes, next, pickFocus, previous, type Focus, type Position, type Scene } from './scenes'
import './record.css'

const CANVAS_WIDTH = 1080
const CANVAS_HEIGHT = 1920

/**
 * A fixed 1080x1920 (9:16) canvas built for screen recording.
 * Controls: → / Space / click = next beat, ← = back, R = restart, G = safe-zone guides.
 */
export function RecordMode({ isoDate, focusId, lessonId }: { isoDate: string; focusId?: string; lessonId?: string }) {
  const [day, setDay] = useState<Day>()
  const [error, setError] = useState<string>()
  const [pos, setPos] = useState<Position>({ scene: 0, step: 0 })
  const [showGuides, setShowGuides] = useState(false)
  const scale = useCanvasScale()

  useEffect(() => {
    fetchDay(isoDate).then(setDay, (e: Error) => setError(e.message))
  }, [isoDate])

  const lesson = useMemo(() => lessonFor(isoDate, lessonId), [isoDate, lessonId])
  const focus = useMemo(
    () => (day ? pickFocus(day, entries, focusId ?? lesson?.observance) : undefined),
    [day, focusId, lesson],
  )
  const scenes = useMemo(
    () => (day ? buildScenes(day, focus, import.meta.env.VITE_SITE_URL ?? window.location.host, lesson) : []),
    [day, focus, lesson],
  )

  const forward = useCallback(() => setPos((p) => next(scenes, p)), [scenes])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        forward()
      } else if (e.key === 'ArrowLeft') {
        setPos((p) => previous(scenes, p))
      } else if (e.key === 'r') {
        setPos({ scene: 0, step: 0 })
      } else if (e.key === 'g') {
        setShowGuides((g) => !g)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [forward, scenes])

  const scene = scenes[pos.scene]

  return (
    <div className="record-stage" onClick={forward}>
      <div
        className="record-canvas"
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      >
        <div className="safe-area">
          {error && <p className="record-error">Could not load {isoDate}: {error}</p>}
          {scene && pos.scene > 0 && focus && <SceneHeader focus={focus} day={day!} />}
          {scene && <SceneView key={pos.scene} scene={scene} step={pos.step} />}
        </div>
        {showGuides && <Guides focus={focus} />}
      </div>
    </div>
  )
}

/** Scale the 1080x1920 canvas down to fit the window, keeping 9:16. */
function useCanvasScale(): number {
  const compute = () => Math.min(window.innerWidth / CANVAS_WIDTH, window.innerHeight / CANVAS_HEIGHT)
  const [scale, setScale] = useState(compute)
  useEffect(() => {
    const onResize = () => setScale(compute())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return scale
}

/** Splits "Tsome Nebiyat (Fast of the Prophets)" into its two parts when there is no written entry. */
function names(focus: Focus) {
  if (focus.entry) {
    return { geez: focus.entry.nameGeez, main: focus.entry.transliteration, english: focus.entry.nameEnglish }
  }
  const match = /^(.*?)\s*\((.*)\)$/.exec(focus.name)
  return { geez: undefined, main: match ? match[1] : focus.name, english: match ? match[2] : undefined }
}

function SceneHeader({ focus, day }: { focus: Focus; day: Day }) {
  const n = names(focus)
  return (
    <div className="scene-header">
      {n.geez && <span className="geez">{n.geez}</span>}
      <span>
        {n.main} · {day.date.monthName} {day.date.day}
      </span>
    </div>
  )
}

function Reveal({ show, children, className = '' }: { show: boolean; children: React.ReactNode; className?: string }) {
  return <div className={`reveal ${show ? 'in' : ''} ${className}`}>{children}</div>
}

function SceneView({ scene, step }: { scene: Scene; step: number }) {
  switch (scene.type) {
    case 'title': {
      const n = scene.focus ? names(scene.focus) : undefined
      const progress = scene.focus?.progress
      return (
        <div className="scene scene-title">
          <Reveal show={step >= 0}>
            <div className="eth-date">{scene.ethiopianDate}</div>
            <div className="eth-year">{scene.ethiopianYear}</div>
          </Reveal>
          <Reveal show={step >= 1}>
            <div className="greg-date">{scene.gregorianDate}</div>
          </Reveal>
          {scene.focus && n && (
            <Reveal show={step >= 2} className="name-block">
              <div className="kind-label">{scene.focus.kindLabel}</div>
              {n.geez && <div className="name-geez geez">{n.geez}</div>}
              <div className="name-main">{n.main}</div>
              {n.english && <div className="name-english">{n.english}</div>}
            </Reveal>
          )}
          {progress && (
            <Reveal show={step >= 3} className="progress-block">
              <div className="progress-text">
                Day <strong>{progress.day}</strong> of {progress.total}
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: step >= 3 ? `${Math.max(2, (progress.day / progress.total) * 100)}%` : '0%' }}
                />
              </div>
            </Reveal>
          )}
          {!scene.focus && (
            <Reveal show={step >= 1}>
              <div className="name-english">No fast or feast today.</div>
            </Reveal>
          )}
        </div>
      )
    }
    case 'verse':
      return (
        <div className="scene scene-text">
          {scene.text && <p className="verse-text geez reveal in">{scene.text}</p>}
          {scene.translation && (
            // Without the original text, the translation is the main line.
            <p className={`${scene.text ? 'verse-translation' : 'verse-text'} reveal in`}>{scene.translation}</p>
          )}
          <p className="verse-ref reveal in">{scene.reference}</p>
        </div>
      )
    case 'text':
      return (
        <div className="scene scene-text">
          <div className="kind-label reveal in">{scene.label}</div>
          <p className="body-text reveal in">{scene.text}</p>
        </div>
      )
    case 'list':
      return (
        <div className="scene scene-text">
          <div className="kind-label reveal in">{scene.label}</div>
          <ul className="body-list">
            {scene.items.map((item, i) => (
              <li key={item} className={`reveal ${step >= i ? 'in' : ''}`}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )
    case 'close':
      return (
        <div className="scene scene-close">
          <p className="close-line reveal in">{scene.line}</p>
          <p className="close-url reveal in">
            {/* Site and page on separate lines, so the URL never breaks mid-word. */}
            {splitUrl(scene.url).map((part) => (
              <span key={part}>{part}</span>
            ))}
          </p>
        </div>
      )
  }
}

/** "site.com/tsome-nebiyat" -> ["site.com", "/tsome-nebiyat"] */
function splitUrl(url: string): string[] {
  const slash = url.indexOf('/')
  return slash === -1 ? [url] : [url.slice(0, slash), url.slice(slash)]
}

/** Safe-zone overlay (press G). Shows where platform UI covers the video. Never record with it on. */
function Guides({ focus }: { focus?: Focus }) {
  const review = focus?.entry?.review
  return (
    <div className="guides">
      <div className="guide guide-top">Top 12%: platform UI</div>
      <div className="guide guide-bottom">Bottom 20%: captions, username</div>
      <div className="guide guide-right">Buttons</div>
      {review && !review.reviewed && <div className="guide-draft">DRAFT: content not reviewed</div>}
    </div>
  )
}
