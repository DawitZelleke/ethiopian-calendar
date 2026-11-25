// node render_ep.js <ep> <out.mp4> <audio.wav>
const { chromium } = require('playwright'); const path = require('path'); const { spawn } = require('child_process')
;(async () => {
  const [ep, out, audio] = process.argv.slice(2), FPS = 30
  const b = await chromium.launch({ args: ['--allow-file-access-from-files'] })
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } })
  p.on('pageerror', (e) => { console.log('ERR', e.message); process.exit(1) })
  await p.goto('file://' + path.resolve('engine.html') + '?ep=' + ep); await p.evaluate(() => window.ready)
  const dur = await p.evaluate(() => window.DURATION), frames = Math.round(dur * FPS)
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-i', audio, '-vf', 'hqdn3d=2:2:6:6',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '25', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] })
  for (let i = 0; i < frames; i++) {
    const d = await p.evaluate((t) => { window.render(t); return document.getElementById('c').toDataURL('image/jpeg', 0.93) }, i / FPS)
    if (!ff.stdin.write(Buffer.from(d.split(',')[1], 'base64'))) await new Promise((r) => ff.stdin.once('drain', r))
  }
  ff.stdin.end(); await new Promise((r) => ff.on('close', r)); await b.close(); console.log(ep, 'rendered', frames, 'frames')
})()
