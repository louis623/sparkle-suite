/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node capture runner supports an external Playwright runtime. */
/** Record a local fixture at real elapsed time. No customer URLs or state writes. */
const fs = require('node:fs/promises')
const path = require('node:path')
const http = require('node:http')
const { execFileSync } = require('node:child_process')
const { createHash } = require('node:crypto')
const { performance } = require('node:perf_hooks')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')

async function main() {
  const id = process.argv[2] || 'mile-high-fizz'
  if (!/^[a-z0-9_-]+$/.test(id)) throw new Error('Invalid capture id')
  const root = process.cwd()
  const fixtureRoot = path.join(root, '.local/carousel-capture')
  const output = path.join(fixtureRoot, 'recordings', id)
  await fs.mkdir(output, { recursive: true })
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.mp4': 'video/mp4', '.webm': 'video/webm', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' }
  const server = http.createServer(async (req, res) => {
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return }
      const requestUrl = new URL(req.url, 'http://127.0.0.1')
      let pathname = decodeURIComponent(requestUrl.pathname)
      // The genuine renderer uses Next's image URLs. Serve the exact local
      // source bytes here; never fetch customer storage or substitute artwork.
      if (pathname === '/_next/image') {
        pathname = requestUrl.searchParams.get('url') || ''
        if (!pathname.startsWith('/') || pathname.startsWith('//')) { res.writeHead(403).end(); return }
      }
      const fixture = pathname.startsWith('/capture/')
      const base = fixture ? fixtureRoot : path.join(root, 'public')
      const file = path.resolve(base, '.' + (fixture ? pathname.slice(8) : pathname))
      if (!file.startsWith(base + path.sep)) { res.writeHead(403).end(); return }
      const body = await fs.readFile(file)
      res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' })
      res.end(req.method === 'HEAD' ? undefined : body)
    } catch { res.writeHead(404).end() }
  })
  await new Promise(resolve => server.listen(4177, '127.0.0.1', resolve))
  let browser
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.CAPTURE_CHROMIUM_PATH ? { executablePath: process.env.CAPTURE_CHROMIUM_PATH } : {}) })
    const page = await browser.newPage({ viewport: { width: 1200, height: id === 'mile-high-fizz' ? 768 : 850 }, deviceScaleFactor: 1, reducedMotion: 'no-preference' })
    const errors = []
    const blocked = []
    const assetErrors = []
    page.on('pageerror', err => errors.push(err.message))
    page.on('response', response => {
      const url = new URL(response.url())
      if (response.status() >= 400 && url.pathname !== '/favicon.ico') assetErrors.push({ url: url.origin + url.pathname, status: response.status() })
    })
    await page.route('**/*', route => {
      const request = route.request()
      const url = new URL(request.url())
      const local = url.origin === 'http://127.0.0.1:4177'
      const cdn = ['unpkg.com', 'fonts.googleapis.com', 'fonts.gstatic.com', 'api.fontshare.com', 'cdn.fontshare.com'].includes(url.hostname)
      if (request.method() !== 'GET' || (!local && !cdn) || url.pathname.startsWith('/api/')) {
        blocked.push(url.origin + url.pathname)
        return route.abort()
      }
      return route.continue()
    })
    await page.goto(`http://127.0.0.1:4177/capture/${id}.html`, { waitUntil: 'networkidle' })
    const heroSelector = id === 'mile-high-fizz' ? '.mhf-hero' : '.hp-hero'
    await page.locator(heroSelector).waitFor({ state: 'visible', timeout: 45000 })
    await page.evaluate(() => document.fonts.ready)
    await page.evaluate(async () => {
      await Promise.all([...document.images].filter(image => {
        const rect = image.getBoundingClientRect()
        return rect.width > 0 && rect.top < window.innerHeight && rect.bottom > 0
      }).map(async image => {
        image.loading = 'eager'
        await image.decode()
      }))
    })
    await page.waitForFunction(() => [...document.querySelectorAll('video')].filter(v => v.getBoundingClientRect().width > 0).every(v => v.readyState >= 2), undefined, { timeout: 30000 })
    const geometry = await page.locator(heroSelector).evaluate(el => {
      const rect = el.getBoundingClientRect()
      return { x: 0, y: 0, width: window.innerWidth, height: Math.ceil((rect.bottom + window.scrollY) / 2) * 2 }
    })
    // Preserve the genuine computed composition while extending the recording
    // viewport to its bottom. This only freezes the source's existing height;
    // it neither crops the header nor rebuilds/repositions customer content.
    const nativeHeight = await page.locator(heroSelector).evaluate(el => {
      const height = el.getBoundingClientRect().height
      el.style.height = height + 'px'
      el.style.minHeight = height + 'px'
      return height
    })
    await page.setViewportSize({ width: geometry.width, height: geometry.height })
    const finalFrame = await page.locator(heroSelector).evaluate(el => {
      const rect = el.getBoundingClientRect()
      const header = document.querySelector('header')?.getBoundingClientRect()
      return { height: rect.height, bottom: rect.bottom, header: header && { top: header.top, bottom: header.bottom, width: header.width }, viewportHeight: window.innerHeight, scrollX: window.scrollX, scrollY: window.scrollY }
    })
    const finalHeight = finalFrame.height
    if (Math.abs(finalHeight - nativeHeight) > 1) throw new Error('Capture changed the source hero geometry')
    if (finalFrame.scrollX || finalFrame.scrollY || finalFrame.bottom > finalFrame.viewportHeight + 1) throw new Error('Capture does not contain the complete hero')
    if (!finalFrame.header || finalFrame.header.top < 0 || finalFrame.header.bottom > finalFrame.viewportHeight) throw new Error('Capture does not contain the customer header')
    const source = await page.evaluate(() => ({ title: document.title, text: document.body.innerText, videos: [...document.querySelectorAll('video')].map(v => ({ src: v.currentSrc, paused: v.paused, width: v.videoWidth, height: v.videoHeight })) }))
    if (errors.length || assetErrors.length) throw new Error('Fixture errors: ' + JSON.stringify({ errors, assetErrors }))
    await page.screenshot({ path: path.join(output, 'fixture-check.png'), fullPage: false })
    console.log(JSON.stringify({ stage: 'fixture-ready', geometry, videos: source.videos, blocked }))
    const client = await page.context().newCDPSession(page)
    // Replay the theme's own entrance control when it has already ended while
    // fonts loaded. CSS animations restart at their native duration and delay.
    await page.evaluate(async () => {
      const replay = document.querySelector('.au-controls button')
      if (replay && /Play/.test(replay.textContent)) replay.click()
      for (const animation of document.getAnimations()) animation.currentTime = 0
      for (const video of document.querySelectorAll('video')) {
        if (!video.getBoundingClientRect().width) continue
        video.currentTime = 0
        video.muted = true
        await video.play()
      }
    })
    if (id === 'mile-high-fizz') await page.waitForFunction(() => {
      const video = document.querySelector('.mhf-hero-video')
      return video && video.currentSrc.endsWith('/mile-high-fizz/hero.mp4') && !video.paused && video.readyState >= 2
    }, undefined, { timeout: 10000 })
    const timings = []
    // Leave startup slack so the first compositor frame still yields >15s of media.
    const durationMs = Number(process.env.CAPTURE_DURATION_MS || 16125)
    const start = performance.now()
    let index = 0
    const frames = []
    const receive = frame => {
      const at = performance.now() - start
      const filename = `frame-${String(index++).padStart(4, '0')}.jpg`
      timings.push({ filename, at })
      frames.push({ filename, data: frame.data })
      void client.send('Page.screencastFrameAck', { sessionId: frame.sessionId })
    }
    client.on('Page.screencastFrame', receive)
    await client.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: geometry.width, maxHeight: geometry.height, everyNthFrame: 1 })
    await new Promise(resolve => setTimeout(resolve, durationMs))
    await client.send('Page.stopScreencast')
    client.off('Page.screencastFrame', receive)
    if (errors.length || assetErrors.length) throw new Error('Errors during recording: ' + JSON.stringify({ errors, assetErrors }))
    const elapsed = performance.now() - start
    if (frames.length < durationMs / 1000 * 10) throw new Error('Capture frame rate below 10 fps; do not publish')
    for (const frame of frames) await fs.writeFile(path.join(output, frame.filename), Buffer.from(frame.data, 'base64'))
    const concat = timings.map((frame, i) => `file '${frame.filename}'\nduration ${((timings[i + 1]?.at ?? elapsed) - frame.at) / 1000}`).join('\n') + `\nfile '${timings.at(-1).filename}'\n`
    await fs.writeFile(path.join(output, 'frames.txt'), concat)
    const videoPath = path.join(output, `${id}-classic-v2.mp4`)
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(output, 'frames.txt'), '-an', '-vf', 'fps=24', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', videoPath], { stdio: 'inherit' })
    const posterPath = path.join(output, `${id}-classic-v2.webp`)
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', path.join(output, timings[0].filename), '-frames:v', '1', '-quality', '90', posterPath], { stdio: 'inherit' })
    const receipt = { id, geometry, finalFrame, elapsedMs: elapsed, frames: timings.length, source, errors, assetErrors, blocked, videoPath, posterPath, sha256: createHash('sha256').update(await fs.readFile(videoPath)).digest('hex') }
    await fs.writeFile(path.join(output, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n')
    console.log(JSON.stringify({ id, geometry, frames: timings.length, videoPath, posterPath, errors, blocked }))
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)) }
}
main().catch(err => { console.error(err); process.exitCode = 1 })
