// node ep-stills.js <ep> <out.png> t1 t2 ...   (times may be 'L3+1' style too)
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs')
;(async () => {
  const [ep, out, ...ts] = process.argv.slice(2)
  const b = await chromium.launch({ args: ['--allow-file-access-from-files'] })
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } })
  p.on('pageerror', (e) => console.log('ERR', e.message)); p.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text()))
  await p.goto('file://' + path.resolve('engine.html') + '?ep=' + ep); await p.evaluate(() => window.ready)
  const shots = []
  for (const t of ts) {
    const d = await p.evaluate((t) => { const s = isNaN(+t) ? window.CORE.at(t) : +t; window.render(s); return [s, document.getElementById('c').toDataURL('image/jpeg', 0.8)] }, t)
    shots.push(d)
  }
  // contact sheet
  await p.setViewportSize({ width: 380 * Math.min(5, shots.length), height: 700 * Math.ceil(shots.length / 5) })
  await p.setContent(`<body style="margin:0;display:flex;flex-wrap:wrap;background:#fff">${shots.map(([s, d]) => `<div style="position:relative"><img src="${d}" style="width:370px;margin:0 10px 10px 0"><b style="position:absolute;left:6px;top:4px;color:#ff0;font:700 20px sans-serif;background:#000">${s.toFixed(1)}s</b></div>`).join('')}</body>`)
  await p.screenshot({ path: out, fullPage: true }); await b.close()
})()
