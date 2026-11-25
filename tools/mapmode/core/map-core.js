// Map Mode engine. An episode is a story file (camera, layers, words); this file draws any of them.
// Times in a story are written against the narration, e.g. 'L2' (line 2 starts), 'L2e' (line 2 ends),
// 'W1:spices' (the moment that word is spoken), 'END', with optional '+0.4' / '-0.4'.
;(function () {
  const W = 1080, H = 1920, COS = Math.cos(28 * Math.PI / 180), RAD = Math.PI / 180
  const GOLD = '#e8b33a', RED = '#ff5a3c'
  const cv = document.getElementById('c'), ctx = cv.getContext('2d')
  let S, T, cam, tiles, pyramid = [], wide, geo, grain

  // ---------- maths ----------
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x))
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
  const prog = (t, a, b) => clamp((t - a) / (b - a))
  const fade = (t, a, d = 0.6) => ease(prog(t, a, a + d))
  const window2 = (t, a, b, d = 0.6) => fade(t, a, d) * (1 - fade(t, b, d))

  // ---------- timing ----------
  const norm = (w) => w.toLowerCase().replace(/[^a-z0-9ሀ-፿]/g, '')
  function at(x) {
    if (typeof x === 'number') return x
    const m = String(x).match(/^([A-Z]+)([^+-]*)([+-][\d.]+)?$/)
    if (!m) throw new Error('bad time ' + x)
    const off = m[3] ? parseFloat(m[3]) : 0, kind = m[1], arg = m[2]
    if (kind === 'END') return T.duration + off
    if (kind === 'L') { const e = arg.endsWith('e'), i = parseInt(arg); return (e ? T.lines[i].t1 : T.lines[i].t0) + off }
    if (kind === 'W') {
      const [li, word] = arg.split(':'), ws = T.lines[parseInt(li)].words, k = ws.findIndex((w) => norm(w.w) === norm(word))
      if (k < 0) throw new Error(`word "${word}" not in line ${li}`)
      return ws[k].t0 + off
    }
    throw new Error('bad time ' + x)
  }
  function resolve(o) {
    // every field named in/out/t/from/to/drawIn/drawOut that is a time gets resolved once, up front
    if (Array.isArray(o)) return o.forEach(resolve)
    if (!o || typeof o !== 'object') return
    for (const k of Object.keys(o)) {
      if (['in', 'out', 't', 'drawIn', 'drawOut', 'answer', 'stopsOut'].includes(k) && (typeof o[k] === 'string' || typeof o[k] === 'number')) o[k] = at(o[k])
      else resolve(o[k])
    }
  }

  // ---------- camera ----------
  function camAt(t) {
    const k = S.camera; let i = 0
    while (i < k.length - 2 && t > k[i + 1].t) i++
    const a = k[i], b = k[i + 1], p = ease(prog(t, a.t, b.t))
    const span = Math.exp(Math.log(a.span) + (Math.log(b.span) - Math.log(a.span)) * p)
    return { lon: a.lon + (b.lon - a.lon) * p, lat: a.lat + (b.lat - a.lat) * p, span }
  }
  const scale = () => W / (cam.span * COS)
  const P = (lon, lat) => [W / 2 + (lon - cam.lon) * scale() * COS, H / 2 - (lat - cam.lat) * scale()]
  const place = (p) => (typeof p === 'string' ? S.places[p] : p)

  // ---------- geometry ----------
  function smooth(pts, n = 12) {
    const out = []
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2
      for (let j = 0; j < n; j++) {
        const t = j / n, t2 = t * t, t3 = t2 * t
        out.push([0, 1].map((d) => 0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3)))
      }
    }
    out.push(pts[pts.length - 1]); return out
  }
  function partial(pts, f) {
    const seg = []; let total = 0
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); total += d }
    let want = total * f; const out = [pts[0]]
    for (let i = 1; i < pts.length; i++) {
      if (want >= seg[i - 1]) { out.push(pts[i]); want -= seg[i - 1]; continue }
      const r = want / seg[i - 1]; out.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * r, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * r]); break
    }
    return out
  }
  function fractionAlong(sm, target) {
    let total = 0, best = 1e9, atLen = 0; const acc = [0]
    for (let i = 1; i < sm.length; i++) { total += Math.hypot(sm[i][0] - sm[i - 1][0], sm[i][1] - sm[i - 1][1]); acc.push(total) }
    sm.forEach((p, i) => { const d = Math.hypot(p[0] - target[0], p[1] - target[1]); if (d < best) { best = d; atLen = acc[i] } })
    return atLen / total
  }
  const hav = (a, b) => { const h = Math.sin((b[1] - a[1]) * RAD / 2) ** 2 + Math.cos(a[1] * RAD) * Math.cos(b[1] * RAD) * Math.sin((b[0] - a[0]) * RAD / 2) ** 2; return 2 * 6371 * Math.asin(Math.sqrt(h)) }
  const lengthKm = (pts) => pts.slice(1).reduce((s, p, i) => s + hav(pts[i], p), 0)
  function path(lonlats) { ctx.beginPath(); lonlats.forEach(([lo, la], i) => { const [x, y] = P(lo, la); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y) }) }

  // ---------- base map ----------
  function base() {
    ctx.fillStyle = '#06121c'; ctx.fillRect(0, 0, W, H)
    ctx.save(); ctx.filter = 'saturate(1.18) contrast(1.08) brightness(0.93)'
    { const [x0, y0] = P(-2, 62), [x1, y1] = P(72, -32); ctx.drawImage(wide, x0, y0, x1 - x0, y1 - y0) }
    const pxPerDeg = scale() * COS; let L = tiles.levels.length - 1
    while (L > 0 && tiles.levels[L].w / (tiles.lon1 - tiles.lon0) < pxPerDeg * 1.05) L--
    const lv = tiles.levels[L], dLon = (tiles.lon1 - tiles.lon0) / lv.w, dLat = (tiles.lat1 - tiles.lat0) / lv.h
    for (let cx = 0; cx < lv.cols; cx++) for (let cy = 0; cy < lv.rows; cy++) {
      const im = pyramid[L][cx][cy], lo0 = tiles.lon0 + cx * tiles.tile * dLon, la1 = tiles.lat1 - cy * tiles.tile * dLat
      const [x0, y0] = P(lo0, la1), [x1, y1] = P(lo0 + im.width * dLon, la1 - im.height * dLat)
      if (x1 < 0 || y1 < 0 || x0 > W || y0 > H) continue
      ctx.drawImage(im, Math.floor(x0), Math.floor(y0), Math.ceil(x1 - x0) + 1, Math.ceil(y1 - y0) + 1)
    }
    ctx.restore()
    const g = ctx.createRadialGradient(W / 2, H * 0.46, H * 0.18, W / 2, H * 0.5, H * 0.75)
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.6)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  }
  function vectors() {
    const z = clamp(12 / cam.span, 0.6, 2.2)
    ctx.lineJoin = ctx.lineCap = 'round'
    ctx.strokeStyle = 'rgba(255,255,255,0.09)'; ctx.lineWidth = 1.2 * z; ctx.setLineDash([6 * z, 6 * z])
    geo.borders.forEach((l) => { path(l); ctx.stroke() }); ctx.setLineDash([])
    ctx.strokeStyle = 'rgba(235,245,255,0.38)'; ctx.lineWidth = 1.5 * z; geo.coast.forEach((l) => { path(l); ctx.stroke() })
    ctx.save(); ctx.shadowColor = 'rgba(80,170,255,0.9)'; ctx.shadowBlur = 10; ctx.strokeStyle = 'rgba(120,190,255,0.8)'; ctx.lineWidth = 2.4 * z
    geo.rivers.forEach((l) => { path(l); ctx.stroke() }); ctx.restore()
  }

  // ---------- text ----------
  function textAt(text, lon, lat, { font, color = '#fff', alpha = 1, spacing = 6, angle = 0, sub, subFont, shadow = 14, dy = 0, subColor }) {
    if (alpha <= 0.01) return
    const [x, y0] = P(lon, lat), y = y0 + dy
    ctx.save(); ctx.font = font; ctx.letterSpacing = spacing + 'px'
    // fade a label before any part of it would leave the screen (rotated labels use their full length)
    const half = ctx.measureText(text).width / 2, hx = Math.abs(Math.cos(angle * RAD)) * half + 30, hy = Math.abs(Math.sin(angle * RAD)) * half + 30
    alpha *= clamp((Math.min(x - hx, W - x - hx)) / 60) * clamp(Math.min(y - hy - 170, H - 110 - y - hy) / 60)
    if (alpha <= 0.01) { ctx.restore(); return }
    ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(angle * RAD)
    ctx.textAlign = 'center'; ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = shadow
    ctx.fillStyle = color; ctx.fillText(text, 0, 0)
    if (sub) { ctx.font = subFont; ctx.letterSpacing = '1px'; ctx.fillStyle = subColor || 'rgba(255,255,255,0.9)'; ctx.fillText(sub, 0, parseInt(subFont.match(/(\d+)px/)[1]) * 1.3) }
    ctx.restore()
  }
  const big = (text, lon, lat, a, o = {}) => textAt(text, lon, lat, { font: `800 ${o.size || 54}px PS`, spacing: o.spacing ?? 14, alpha: a, sub: o.sub, subFont: `600 ${Math.round((o.size || 54) * 0.5)}px SP`, dy: o.dy || 0, color: o.color || '#fff' })

  const zoomFade = (min, max) => clamp((cam.span - min) / (min * 0.25)) * clamp((max - cam.span) / (max * 0.15))
  function waterLabels(t) {
    ;(S.water || []).forEach((w) => {
      const hide = w.hide ? 1 - window2(t, w.hide[0], w.hide[1], 0.5) : 1
      textAt(w.text, ...w.at, { font: 'italic 600 30px SP', color: 'rgba(190,225,255,0.95)', alpha: 0.85 * zoomFade(w.min, w.max) * fade(t, 0.8, 1.2) * hide, spacing: 9, angle: w.angle || 0, sub: w.sub, subFont: 'italic 600 22px SP' })
    })
  }
  function modernLabels(t) {
    let a = 0.42 * clamp((cam.span - 11) / 4) * (1 - fade(t, at('END-6.2'), 0.6))
    ;(S.modernHide || []).forEach(([a0, b0]) => { a *= 1 - window2(t, a0, b0, 0.6) })
    ;(S.modern || []).forEach((m) => textAt(m.text, ...m.at, { font: '700 24px PS', alpha: a, spacing: 7, sub: 'today', subFont: 'italic 600 18px SP', shadow: 8 }))
  }

  // ---------- glyphs ----------
  function cityGlyph(x, y, color) {
    const w = 34, h = 18, top = y - 40
    ctx.beginPath(); ctx.moveTo(x - w / 2, top + h)
    for (let i = 0; i < 5; i++) { const x0 = x - w / 2 + (i * w) / 5; ctx.lineTo(x0, top); ctx.lineTo(x0 + w / 10, top); ctx.lineTo(x0 + w / 10, top + 5); ctx.lineTo(x0 + w / 5, top + 5) }
    ctx.lineTo(x + w / 2, top); ctx.lineTo(x + w / 2, top + h); ctx.closePath(); ctx.fillStyle = color; ctx.fill()
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x - 4, top + h - 9, 8, 9)
  }
  function crownGlyph(x, y, s, color) {
    ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x - s, y - s * 0.9); ctx.lineTo(x - s * 0.5, y - s * 0.4); ctx.lineTo(x, y - s * 1.1)
    ctx.lineTo(x + s * 0.5, y - s * 0.4); ctx.lineTo(x + s, y - s * 0.9); ctx.lineTo(x + s, y); ctx.closePath(); ctx.fillStyle = color; ctx.fill()
  }
  function crossGlyph(x, y, s, color) {
    ctx.fillStyle = color; ctx.fillRect(x - s * 0.16, y - s, s * 0.32, s * 2); ctx.fillRect(x - s * 0.7, y - s * 0.45, s * 1.4, s * 0.32)
  }

  // ---------- layers ----------
  const L = {}
  L.kingdom = (o, t) => {
    const a = window2(t, o.in, o.out, 0.9); if (a <= 0) return
    const c = o.color || '232,200,140'
    ctx.save(); ctx.globalAlpha = a; path(smooth([...o.poly, o.poly[0]], 6)); ctx.closePath()
    ctx.fillStyle = `rgba(${c},0.15)`; ctx.fill(); ctx.setLineDash([14, 10]); ctx.lineWidth = 3; ctx.strokeStyle = `rgba(${c},0.9)`; ctx.shadowColor = `rgba(${c},0.9)`; ctx.shadowBlur = 12; ctx.stroke(); ctx.restore()
    textAt(o.name, ...o.labelAt, { font: '800 30px PS', color: `rgb(${c})`, alpha: a, spacing: 8, sub: o.sub, subFont: 'italic 600 21px SP' })
  }
  L.region = (o, t) => {
    const a = window2(t, o.in, o.out ?? 1e9, 0.9); if (a <= 0) return
    const c = o.color || '70,205,120'
    ctx.save(); ctx.globalAlpha = a; path(smooth([...o.poly, o.poly[0]], 8)); ctx.closePath()
    ctx.fillStyle = `rgba(${c},0.36)`; ctx.fill(); ctx.shadowColor = `rgba(${c},1)`; ctx.shadowBlur = 28; ctx.strokeStyle = `rgba(${c},0.95)`; ctx.lineWidth = 3.5; ctx.stroke(); ctx.restore()
    if (o.name) big(o.name, ...o.labelAt, fade(t, o.in + 0.3) * (1 - fade(t, o.out ?? 1e9, 0.6)), { size: o.size || 56, sub: o.sub, spacing: 16 })
  }
  L.route = (o, t) => {
    const sm = o._sm || (o._sm = smooth(o.points)), f = ease(prog(t, o.drawIn, o.drawOut))
    const vis = 1 - fade(t, o.out ?? 1e9, 0.7)
    if (f <= 0 || vis <= 0) return
    const part = partial(sm, f), color = o.color || GOLD, width = o.width || 6
    ctx.save(); ctx.globalAlpha = vis; ctx.lineCap = ctx.lineJoin = 'round'
    if (o.dashed) ctx.setLineDash([18, 14])
    ctx.shadowColor = color; ctx.shadowBlur = 24; ctx.strokeStyle = color; ctx.lineWidth = width; path(part); ctx.stroke()
    ctx.setLineDash([]); ctx.shadowBlur = 0
    if (!o.dashed) { ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = width * 0.28; path(part); ctx.stroke() }
    const [hx, hy] = P(...part[part.length - 1])
    if (o.arrow && part.length > 1) {
      const [px, py] = P(...part[Math.max(0, part.length - 3)]), ang = Math.atan2(hy - py, hx - px)
      ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 20; ctx.beginPath(); ctx.moveTo(hx + Math.cos(ang) * 26, hy + Math.sin(ang) * 26)
      ctx.lineTo(hx + Math.cos(ang + 2.5) * 22, hy + Math.sin(ang + 2.5) * 22); ctx.lineTo(hx + Math.cos(ang - 2.5) * 22, hy + Math.sin(ang - 2.5) * 22); ctx.fill()
    }
    if (o.convoy && f > 0 && f < 1) {
      ;[0, 0.012, 0.026, 0.04].forEach((gap, i) => {
        const p = partial(sm, Math.max(0, f - gap)); const [x, y] = P(...p[p.length - 1])
        ctx.fillStyle = i ? 'rgba(255,240,200,0.85)' : '#fff'; ctx.shadowColor = color; ctx.shadowBlur = 18; ctx.beginPath(); ctx.arc(x, y, i ? 7 - i : 10, 0, 7); ctx.fill()
      })
    }
    if (o.army) {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3
      for (let k = 0; k < 9; k++) {
        const u = ((k / 9 + t * 0.12) % 1) * f; if (u < 0.02) continue
        const p = partial(sm, u), q = partial(sm, Math.max(0, u - 0.01)); const [x, y] = P(...p[p.length - 1]), [x2, y2] = P(...q[q.length - 1]), ang = Math.atan2(y - y2, x - x2)
        ctx.beginPath(); ctx.moveTo(x + Math.cos(ang + 2.4) * 11, y + Math.sin(ang + 2.4) * 11); ctx.lineTo(x, y); ctx.lineTo(x + Math.cos(ang - 2.4) * 11, y + Math.sin(ang - 2.4) * 11); ctx.stroke()
      }
    }
    ctx.restore()
    // places along the way light up as the head passes them
    ;(o.stops || []).forEach(([name, lon, lat]) => {
      const fs = fractionAlong(sm, [lon, lat]), ts = o.drawIn + fs * (o.drawOut - o.drawIn)
      const a = fade(t, ts - 0.1, 0.4) * vis * (1 - fade(t, o.stopsOut ?? o.out ?? 1e9, 0.5)) * clamp((30 - cam.span) / 4); if (a <= 0) return
      const [x, y] = P(lon, lat); ctx.save(); ctx.globalAlpha = a * clamp(Math.min(x, W - x) / 170); ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fill(); ctx.restore()
      textAt(name, lon, lat, { font: '700 27px PS', alpha: a, spacing: 2, shadow: 10, dy: -16 })
    })
    if (o.label) textAt(o.label.text, ...o.label.at, { font: 'italic 600 30px SP', color: o.label.color || '#ffe3a0', alpha: window2(t, o.label.in, o.label.out, 0.5), spacing: 3, angle: o.label.angle || 0 })
    if (o.distance) {
      const d = o.distance, a = window2(t, d.in, d.out, 0.5); if (a <= 0) return
      const km = Math.round(lengthKm(o.points) / 100) * 100, text = `≈ ${km.toLocaleString('en-US')} km${d.suffix ? ' ' + d.suffix : ''}`
      const [x, y] = P(...d.at); ctx.save(); ctx.globalAlpha = a; ctx.font = '800 30px PS'; const w = ctx.measureText(text).width + 40
      ctx.fillStyle = 'rgba(10,10,12,0.78)'; ctx.beginPath(); ctx.roundRect(x - w / 2, y - 26, w, 52, 26); ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke()
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y + 1); ctx.restore()
    }
  }
  L.marker = (o, t) => {
    const a = window2(t, o.in, o.out ?? 1e9, 0.6); if (a <= 0) return
    const [lon, lat] = place(o.at), [x, y] = P(lon, lat), color = o.color || GOLD
    ctx.save(); ctx.globalAlpha = a
    for (let k = 0; k < 2; k++) { const ph = ((t - o.in) * 0.7 + k * 0.5) % 1; ctx.strokeStyle = color; ctx.globalAlpha = a * (1 - ph) * 0.8; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 14 + ph * 60, 0, 7); ctx.stroke() }
    ctx.globalAlpha = a; ctx.shadowColor = color; ctx.shadowBlur = 20; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, 11, 0, 7); ctx.fill()
    ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 10
    if (o.glyph === 'city') cityGlyph(x, y, color)
    if (o.glyph === 'crown') crownGlyph(x, y - 30, 20, color)
    if (o.glyph === 'cross') crossGlyph(x, y - 44, 18, color)
    ctx.restore()
    if (o.label) big(o.label, lon, lat, a * fade(t, o.in + 0.2), { size: o.size || 40, spacing: 8, dy: o.labelDy ?? -66, sub: o.sub })
  }
  L.pill = (o, t) => {
    const a = window2(t, o.in, o.out, 0.35); if (a <= 0) return
    const [x0, y0] = P(...place(o.at)), x = x0 + (o.dx || 0), y = y0 + (o.dy || 0) - (1 - a) * 16
    ctx.save(); ctx.globalAlpha = a; ctx.font = '800 32px PS'; const w = ctx.measureText(o.text).width + 44
    ctx.fillStyle = 'rgba(10,10,12,0.8)'; ctx.beginPath(); ctx.roundRect(x - w / 2, y - 28, w, 56, 28); ctx.fill(); ctx.strokeStyle = o.color || GOLD; ctx.lineWidth = 2.5; ctx.stroke()
    ctx.fillStyle = o.color || GOLD; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.text, x, y + 1); ctx.restore()
  }
  L.questions = (o, t) => {
    const [x, y] = P(...place(o.at))
    ;[[-90, -110, 0], [70, -150, 0.25], [-20, -200, 0.5], [110, -60, 0.7]].forEach(([dx, dy, d]) => {
      const a = window2(t, o.in + d, o.out, 0.3); if (a <= 0) return
      ctx.save(); ctx.globalAlpha = a; ctx.font = '800 64px PS'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.shadowColor = GOLD; ctx.shadowBlur = 22
      ctx.fillText('?', x + dx, y + dy - (1 - a) * 20); ctx.restore()
    })
    if (o.answer == null) return
    const f = window2(t, o.answer, o.out, 0.4); if (f <= 0) return
    const g = ctx.createRadialGradient(x, y - 80, 0, x, y - 80, 220); g.addColorStop(0, `rgba(255,220,130,${0.5 * f})`); g.addColorStop(1, 'rgba(255,220,130,0)')
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - 80, 220, 0, 7); ctx.fill(); ctx.restore()
  }
  L.ripple = (o, t) => {
    const a = window2(t, o.in, o.out, 0.4); if (a <= 0) return
    const [x, y] = P(...place(o.at))
    ctx.save()
    for (let k = 0; k < 4; k++) { const ph = ((t - o.in) * 0.55 + k * 0.25) % 1; ctx.globalAlpha = a * (1 - ph) * 0.9; ctx.strokeStyle = '#8fd3ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, 20 + ph * 120, (20 + ph * 120) * 0.45, 0, 0, 7); ctx.stroke() }
    ctx.globalAlpha = a; ctx.fillStyle = '#bfe8ff'; ctx.shadowColor = '#8fd3ff'; ctx.shadowBlur = 30; ctx.beginPath(); ctx.arc(x, y, 10, 0, 7); ctx.fill(); ctx.restore()
  }
  L.fire = (o, t) => {
    const a = window2(t, o.in, o.out, 0.5); if (a <= 0) return
    const [x, y] = P(...place(o.at)); ctx.save(); ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 6; i++) { const fl = 0.75 + 0.25 * Math.sin(t * (9 + i) + i * 1.7), r = (60 + i * 26) * fl, g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(255,${180 - i * 18},60,${0.35 * a})`); g.addColorStop(1, 'rgba(255,60,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + Math.sin(t * 3 + i) * 6, y - i * 4, r, 0, 7); ctx.fill() }
    ctx.restore()
  }
  L.glow = (o, t) => {
    // a warm sunrise-like bloom over a place (a kingdom turning to the faith, a promise kept)
    const a = window2(t, o.in, o.out, 0.8); if (a <= 0) return
    const [x, y] = P(...place(o.at)), r = (o.r || 260) * (0.9 + 0.1 * Math.sin(t * 2))
    const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(255,225,150,${0.55 * a})`); g.addColorStop(0.5, `rgba(255,190,90,${0.2 * a})`); g.addColorStop(1, 'rgba(255,190,90,0)')
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.restore()
  }
  L.arc = (o, t) => {
    const f = ease(prog(t, o.drawIn, o.drawOut)), vis = 1 - fade(t, o.out ?? 1e9, 0.6); if (f <= 0 || vis <= 0) return
    const a = place(o.from), b = place(o.to), mid = [(a[0] + b[0]) / 2 + (o.bend || -3.5), (a[1] + b[1]) / 2], pts = []
    for (let i = 0; i <= 60; i++) { const u = i / 60; pts.push([(1 - u) ** 2 * a[0] + 2 * (1 - u) * u * mid[0] + u * u * b[0], (1 - u) ** 2 * a[1] + 2 * (1 - u) * u * mid[1] + u * u * b[1]]) }
    ctx.save(); ctx.globalAlpha = vis; ctx.setLineDash([2, 16]); ctx.lineCap = 'round'; ctx.strokeStyle = o.color || GOLD; ctx.lineWidth = 6; ctx.shadowColor = o.color || GOLD; ctx.shadowBlur = 16
    path(partial(pts, f)); ctx.stroke(); ctx.restore()
  }
  L.pit = (o, t) => {
    // the cistern: a dark well opens, then a golden rope pulls a light up out of it
    const a = window2(t, o.in, o.out, 0.8); if (a <= 0) return
    const [x, y] = P(...place(o.at)); ctx.save(); ctx.globalAlpha = a
    const r = 70 * (0.7 + 0.3 * a), g = ctx.createRadialGradient(x, y + 40, 4, x, y + 40, r)
    g.addColorStop(0, 'rgba(0,0,0,0.95)'); g.addColorStop(0.7, 'rgba(25,15,5,0.85)'); g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y + 40, r * 1.2, r * 0.6, 0, 0, 7); ctx.fill()
    const rp = ease(prog(t, o.ropeIn, o.ropeOut))
    if (rp > 0) {
      const top = y - 160, depth = Math.max(top, y + 50 - rp * 200)
      ctx.strokeStyle = GOLD; ctx.lineWidth = 4; ctx.shadowColor = GOLD; ctx.shadowBlur = 16; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, depth); ctx.stroke()
      ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 30; ctx.beginPath(); ctx.arc(x, depth, 12, 0, 7); ctx.fill()
    }
    ctx.restore()
  }
  L.label = (o, t) => big(o.text, ...place(o.at), window2(t, o.in, o.out ?? 1e9, 0.6), o)

  // ---------- captions, header, end card, film ----------
  // Amharic subtitles: the English voice keeps going, each line's translation appears in natural chunks
  // (split at ፣ ፤ ። ? and quotes), each chunk shown for its share of the spoken line.
  function chunks(text) {
    const parts = text.match(/[^፡።፣፤?!]+[፡።፣፤?!]*\s*/g) || [text]
    const out = []
    parts.forEach((p) => { p = p.trim(); if (!p) return; if (out.length && (out[out.length - 1].length + p.length < 34)) out[out.length - 1] += ' ' + p; else out.push(p) })
    return out
  }
  function subtitles(t) {
    const i = T.lines.findIndex((l) => t >= l.t0 - 0.1 && t <= l.t1 + 0.3); if (i < 0) return
    const line = T.lines[i], cs = S._chunks[i], total = cs.reduce((s, c) => s + c.length, 0)
    let acc = line.t0, k = 0
    for (; k < cs.length; k++) { const d = (line.t1 - line.t0) * cs[k].length / total; if (t < acc + d || k === cs.length - 1) break; acc += d }
    const d = (line.t1 - line.t0) * cs[k].length / total
    const a = fade(t, acc - 0.08, 0.18) * (1 - fade(t, (k === cs.length - 1 ? line.t1 + 0.1 : acc + d - 0.12), 0.12))
    if (a <= 0) return
    ctx.save(); ctx.globalAlpha = a; ctx.font = '800 64px ET'; ctx.textAlign = 'center'
    const words = cs[k].split(' '), rows = []; let row = ''
    words.forEach((w) => { const t2 = row ? row + ' ' + w : w; if (ctx.measureText(t2).width > 930 && row) { rows.push(row); row = w } else row = t2 }); rows.push(row)
    const lh = 92, y0 = H * 0.72 - (rows.length - 1) * lh / 2 + (1 - a) * 14
    rows.forEach((r, j) => {
      ctx.lineWidth = 13; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineJoin = 'round'; ctx.strokeText(r, W / 2, y0 + j * lh)
      ctx.fillStyle = '#fff'; ctx.fillText(r, W / 2, y0 + j * lh)
    })
    // a thin gold bar under the subtitle fills as the narrator speaks the line
    const p = prog(t, line.t0, line.t1), bw = 260
    ctx.globalAlpha = a * 0.9; ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(W / 2 - bw / 2, y0 + (rows.length - 1) * lh + 34, bw, 5)
    ctx.fillStyle = GOLD; ctx.fillRect(W / 2 - bw / 2, y0 + (rows.length - 1) * lh + 34, bw * p, 5)
    ctx.restore()
  }
  function captions(t) {
    if (S.subtitles) return subtitles(t)
    const i = T.lines.findIndex((l) => t >= l.t0 - 0.05 && t <= l.t1 + 0.25); if (i < 0) return
    const line = T.lines[i], words = S.captions[i].split(' ')
    const out = 1 - fade(t, line.t1, 0.25)
    ctx.save(); ctx.font = '800 66px PS'
    const space = ctx.measureText(' ').width, lines = [[]]; let w = 0
    words.forEach((wd, k) => { const ww = ctx.measureText(wd).width; if (w + ww > 900 && lines[lines.length - 1].length) { lines.push([]); w = 0 } lines[lines.length - 1].push(k); w += ww + space })
    const lh = 82, y0 = H * 0.72 - (lines.length - 1) * lh / 2
    lines.forEach((ln, li) => {
      const lw = ln.reduce((s, k) => s + ctx.measureText(words[k]).width + space, -space); let x = (W - lw) / 2
      ln.forEach((k) => {
        const ts = line.words[k].t0, te = line.words[k + 1] ? line.words[k + 1].t0 : line.t1, a = fade(t, ts - 0.05, 0.16) * out, active = t >= ts && t < te
        if (a > 0) {
          const pop = 1 + (active ? 0.06 * (1 - prog(t, ts, ts + 0.2)) : 0)
          ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y0 + li * lh + (1 - a) * 18); ctx.scale(pop, pop)
          ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineJoin = 'round'; ctx.strokeText(words[k], 0, 0)
          ctx.fillStyle = active ? GOLD : '#fff'; ctx.fillText(words[k], 0, 0); ctx.restore()
        }
        x += ctx.measureText(words[k]).width + space
      })
    })
    ctx.restore()
  }
  function header() {
    ctx.save(); ctx.globalAlpha = 0.85; ctx.font = '700 30px PS'; ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 10
    ctx.fillText(S.header, 60, 120); ctx.textAlign = 'right'; ctx.fillStyle = GOLD; ctx.fillText('13thmonth.ca', W - 60, 120); ctx.restore()
  }
  function wrap(text, x, y, max, lh) {
    let line = '', yy = y
    text.split(' ').forEach((w) => { const t2 = line ? line + ' ' + w : w; if (ctx.measureText(t2).width > max) { ctx.fillText(line, x, yy); line = w; yy += lh } else line = t2 })
    ctx.fillText(line, x, yy); return yy
  }
  function endCard(t) {
    const a = fade(t, at('END-6.0'), 0.8); if (a <= 0) return
    ctx.save(); ctx.globalAlpha = a; ctx.font = '600 46px SP'
    // measure the verse first so the card fits it
    const lines = []; let line = ''
    S.verse.text.split(' ').forEach((w) => { const t2 = line ? line + ' ' + w : w; if (ctx.measureText(t2).width > W - 250) { lines.push(line); line = w } else line = t2 }); lines.push(line)
    const hgt = 170 + lines.length * 60, y = H * 0.9 - hgt
    ctx.fillStyle = 'rgba(8,8,10,0.8)'; ctx.beginPath(); ctx.roundRect(70, y, W - 140, hgt, 32); ctx.fill(); ctx.strokeStyle = 'rgba(232,179,58,0.5)'; ctx.lineWidth = 2; ctx.stroke()
    ctx.fillStyle = GOLD; ctx.fillRect(110, y + 60, 6, lines.length * 60 - 10)
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; lines.forEach((l, i) => ctx.fillText(l, 140, y + 105 + i * 60))
    ctx.font = '700 32px PS'; ctx.fillStyle = 'rgba(255,255,255,0.72)'; ctx.fillText(S.verse.ref, 140, y + hgt - 45)
    ctx.textAlign = 'right'; ctx.fillStyle = GOLD; ctx.font = '800 36px PS'; ctx.fillText('13thmonth.ca', W - 110, y + hgt - 45)
    ctx.restore()
  }
  function film(t) {
    ctx.save(); ctx.globalAlpha = 0.07; ctx.globalCompositeOperation = 'overlay'
    const o = Math.floor(t * 30) % 8; ctx.drawImage(grain, -(o * 37) % 256, -(o * 61) % 256, W + 512, H + 512); ctx.restore()
    const fi = 1 - fade(t, 0, 0.6), fo = fade(t, T.duration - 0.6, 0.6)
    if (fi + fo > 0) { ctx.fillStyle = `rgba(0,0,0,${Math.max(fi, fo)})`; ctx.fillRect(0, 0, W, H) }
  }

  window.render = function (t) {
    cam = camAt(t)
    base(); vectors(); waterLabels(t); modernLabels(t)
    S.layers.forEach((o) => L[o.type](o, t))
    captions(t); endCard(t); header(); film(t)
  }

  window.ready = (async () => {
    const q = new URLSearchParams(location.search), ep = q.get('ep')
    const script = (src) => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('missing ' + src)); document.head.appendChild(s) })
    await script(`episodes/${ep}/story.js`)
    S = window.STORY
    try { await script(`episodes/${ep}/timing.js`); T = window.TIMING } catch (e) { T = null }
    if (!T) throw new Error('no narration timing yet: run narrate.py ' + ep)
    resolve(S.layers); S.camera.forEach((k) => (k.t = at(k.t))); resolve(S.water || [])
    if (S.subtitles) S._chunks = S.subtitles.map(chunks)
    S.modernHide = (S.modernHide || []).map(([a, b]) => [at(a), at(b)])
    window.DURATION = T.duration
    const load = (src) => { const im = new Image(); im.src = src; return im.decode().then(() => im) }
    tiles = await (await fetch('data/tiles/tiles.json')).json(); wide = await load('data/wide.jpg'); geo = await (await fetch('data/region.json')).json()
    for (let l = 0; l < tiles.levels.length; l++) { const lv = tiles.levels[l]; pyramid[l] = []; for (let cx = 0; cx < lv.cols; cx++) { pyramid[l][cx] = []; for (let cy = 0; cy < lv.rows; cy++) pyramid[l][cx][cy] = await load(`data/tiles/${l}/${cx}_${cy}.jpg`) } }
    grain = document.createElement('canvas'); grain.width = grain.height = 256
    const gx = grain.getContext('2d'), id = gx.createImageData(256, 256); let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < id.data.length; i += 4) { const v = rnd() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255 }
    gx.putImageData(id, 0, 0)
    for (const f of ['800 64px ET', '800 66px PS', '700 30px PS', '600 46px SP', 'italic 600 30px SP', '700 27px PS']) await document.fonts.load(f)
    return true
  })()
  window.CORE = { at: (x) => at(x) }
})()
