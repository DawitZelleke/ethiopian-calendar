// node score-times.js <score.js> <timing.js> <out.json>: turns narration-relative times into seconds.
const [scoreFile, timingFile, out] = process.argv.slice(2)
global.window = {}; require('./' + scoreFile); require('./' + timingFile)
const S = window.SCORE, T = window.TIMING
const norm = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, '')
function at(x) {
  const m = String(x).match(/^([A-Z]+)([^+-]*)([+-][\d.]+)?$/), off = m[3] ? parseFloat(m[3]) : 0
  if (m[1] === 'END') return T.duration + off
  if (m[1] === 'L') { const e = m[2].endsWith('e'), i = parseInt(m[2]); return Math.max(0, (e ? T.lines[i].t1 : T.lines[i].t0) + off) }
  const [li, w] = m[2].split(':'), ws = T.lines[+li].words, k = ws.findIndex((x) => norm(x.w) === norm(w))
  if (k < 0) throw new Error('no word ' + w); return ws[k].t0 + off
}
const res = { ...S, duration: T.duration, speech: T.lines.map((l) => [l.t0, l.t1]), sections: S.sections.map((s) => ({ ...s, t0: at(s.from), t1: at(s.to) })),
  risers: (S.risers || []).map((r) => ({ ...r, t: at(r.t) })), hits: (S.hits || []).map((h) => ({ ...h, t: at(h.t) })), whooshes: (S.whooshes || []).map((h) => ({ ...h, t: at(h.t) })) }
require('fs').writeFileSync(out, JSON.stringify(res, null, 1)); console.log(out, res.sections.map((s) => s.t0.toFixed(1) + '-' + s.t1.toFixed(1)).join(' '))
