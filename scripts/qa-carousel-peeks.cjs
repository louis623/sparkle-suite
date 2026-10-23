/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS runner accepts an external Playwright module path. */
/** Read-only composed-page QA. Use a disposable browser, never a signed-in profile.
 * PLAYWRIGHT_MODULE_PATH=/absolute/path/to/playwright CAPTURE_CHROMIUM_PATH=/path/to/chromium
 * node scripts/qa-carousel-peeks.cjs --base-url http://127.0.0.1:3000 --mode all --viewport all
 * Remote targets are restricted to the established Smoke alias. Screenshots require human motion/art review.
 */
const fs = require('node:fs/promises')
const path = require('node:path')
const { createHash } = require('node:crypto')
const { performance } = require('node:perf_hooks')
const assert = require('node:assert/strict')

function options(argv) {
  const result = { mode: 'all', viewport: 'all', carousel: 'all', output: '.local/final-carousel-qa' }
  for (let i = 0; i < argv.length; i += 2) {
    if (argv[i] === '--help') return { help: true }
    if (!['--base-url', '--mode', '--viewport', '--carousel', '--output'].includes(argv[i]) || !argv[i + 1]) throw new Error('Unknown or incomplete option: ' + argv[i])
    result[argv[i].slice(2)] = argv[i + 1]
  }
  if (!result['base-url']) throw new Error('--base-url is required')
  const url = new URL(result['base-url'])
  const local = ['localhost', '127.0.0.1'].includes(url.hostname)
  const smoke = url.hostname === 'sparkle-suite-smoke.vercel.app' && url.protocol === 'https:' && !url.port
  if ((!local && !smoke) || !['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Only a localhost/127.0.0.1 origin or https://sparkle-suite-smoke.vercel.app is permitted')
  for (const [key, values] of Object.entries({ mode: ['all', 'home', 'portfolio', 'interactions'], viewport: ['all', 'desktop', 'mobile'], carousel: ['all', 'community-themes', 'rep-highlights'] })) {
    if (!values.includes(result[key])) throw new Error('Invalid ' + key)
  }
  result.baseUrl = url.origin
  return result
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const safe = text => text.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase()

async function centerStage(section) {
  const stage = section.locator('[data-slide-index]').first().locator('..').locator('..')
  await stage.evaluate(el => el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }))
}
async function activeIndex(section) {
  return Number(await section.locator('[data-slide-index][data-active="true"]').getAttribute('data-slide-index'))
}
async function centered(section, index) {
  await section.locator(`[data-slide-index="${index}"]`).waitFor({ state: 'visible' })
  await section.page().waitForFunction(({ id, index }) => {
    const slide = document.querySelector(`#${id} [data-slide-index="${index}"]`)
    if (!slide || slide.getAttribute('data-active') !== 'true') return false
    const rect = slide.getBoundingClientRect(), parent = slide.parentElement.getBoundingClientRect()
    return Math.abs(rect.left + rect.width / 2 - parent.left - parent.width / 2) <= 3
  }, { id: await section.getAttribute('id'), index }, { timeout: 10000 })
}
async function pauseCarousel(section) {
  const pause = section.getByRole('button', { name: /^Pause .* animation(?: and slideshow)?$/ })
  if (await pause.count()) await pause.click()
}
async function playCarousel(section) {
  const play = section.getByRole('button', { name: /^Play .* animation(?: and slideshow)?$/ })
  if (await play.count()) await play.click()
}
async function selectSlide(section, index) {
  const count = await section.locator('[data-slide-index]').count()
  for (let step = 0; step < count && await activeIndex(section) !== index; step++) {
    const next = (await activeIndex(section) + 1) % count
    await section.getByRole('button', { name: /^Next / }).click()
    await centered(section, next)
  }
  assert.equal(await activeIndex(section), index, 'Manual navigation did not select requested slide')
}
async function mediaState(video) {
  return video.evaluate(v => ({ currentTime: v.currentTime, duration: v.duration, paused: v.paused, readyState: v.readyState, width: v.videoWidth, height: v.videoHeight, src: v.currentSrc, frames: v.getVideoPlaybackQuality?.().totalVideoFrames ?? null }))
}
async function playing(video) {
  await video.waitFor({ state: 'visible', timeout: 20000 })
  await video.evaluate(v => new Promise((resolve, reject) => {
    const start = v.currentTime
    const timeout = setTimeout(() => { clearInterval(timer); reject(new Error('Recording did not decode and advance')) }, 15000)
    const timer = setInterval(() => {
      if (!v.paused && v.readyState >= 2 && v.videoWidth > 0 && v.currentSrc && Math.abs(v.currentTime - start) > .08) {
        clearTimeout(timeout); clearInterval(timer); resolve(true)
      }
    }, 50)
  }))
}
async function posterHealthy(scope) {
  const images = await scope.locator('img').evaluateAll(images => images.map(i => ({ src: i.currentSrc || i.src, complete: i.complete, width: i.naturalWidth })))
  assert.ok(images.length > 0 && images.every(i => i.complete && i.width > 0), 'Missing or undecoded recording poster: ' + JSON.stringify(images))
}
async function screenshot(page, filename, fullPage = false) {
  await page.screenshot({ path: filename, fullPage, animations: 'allow' })
  return path.basename(filename)
}
async function verifyControlGeometry(control, video, boundary) {
  const [button, frame, card] = await Promise.all([control.boundingBox(), video.boundingBox(), boundary.boundingBox()])
  assert.ok(button && frame && card, 'Control or recording is not visible')
  assert.ok(button.x >= card.x - 1 && button.x + button.width <= card.x + card.width + 1, 'Control is horizontally clipped')
  assert.ok(button.y >= frame.y + frame.height - 1, 'Standalone control overlays customer website')
  assert.ok(button.y + button.height <= card.y + card.height + 1, 'Control is clipped below card')
}
async function homeQA(page, dir, result) {
  await page.goto(result.baseUrl + '/', { waitUntil: 'domcontentloaded' })
  assert.equal(new URL(page.url()).origin, result.baseUrl, 'Home redirected away from approved origin')
  await page.locator('#customer-site-proof figure').first().waitFor()
  assert.equal(await page.locator('#customer-site-proof figure').count(), 3, 'Expected all three home customer peeks')
  result.pageTitle = await page.title()
  result.screenshots.push(await screenshot(page, path.join(dir, 'home-full.png'), true))
  const targets = [0, 1, 2].map(index => ({ id: 'home-' + index, scope: page.locator('#customer-site-proof figure').nth(index) }))
  targets.push({ id: 'home-watch', scope: page.locator('#watch [data-community-theme]').locator('..') })
  for (const { id, scope } of targets) {
    await scope.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
    const video = scope.locator('video')
    await playing(video)
    await posterHealthy(scope)
    const before = await mediaState(video)
    const firstPixels = createHash('sha256').update(await video.screenshot({ animations: 'allow' })).digest('hex')
    await sleep(3000)
    const after = await mediaState(video)
    const lastPixels = createHash('sha256').update(await video.screenshot({ animations: 'allow' })).digest('hex')
    assert.notEqual(firstPixels, lastPixels, id + ': decoded video pixels did not change')
    assert.ok(after.frames === null || after.frames > before.frames, id + ': no new decoded frames')
    const pause = scope.getByRole('button', { name: /^Pause .* animation$/ })
    await verifyControlGeometry(pause, video, scope)
    await pause.click()
    await sleep(250)
    const stopped = await mediaState(video)
    assert.ok(stopped.paused, id + ': Pause did not stop recording')
    await sleep(700)
    assert.equal((await mediaState(video)).currentTime, stopped.currentTime, id + ': time progressed while paused')
    await scope.getByRole('button', { name: /^Play .* animation$/ }).click()
    await playing(video)
    result.screenshots.push(await screenshot(page, path.join(dir, id + '.png')))
    result.checks.push({ id, status: 'pass', before, after, pixelChange: true, pauseResume: true, fullFrameControl: true, themeIdentity: 'human review required' })
  }
}
async function carouselQA(page, dir, result, selection) {
  await page.goto(result.baseUrl + '/portfolio', { waitUntil: 'domcontentloaded' })
  assert.equal(new URL(page.url()).origin, result.baseUrl, 'Portfolio redirected away from approved origin')
  await page.locator('[data-slide-index]').first().waitFor()
  result.screenshots.push(await screenshot(page, path.join(dir, 'portfolio-full.png'), true))
  for (const id of selection === 'all' ? ['community-themes', 'rep-highlights'] : [selection]) {
    const section = page.locator('#' + id)
    await section.locator('[data-slide-index]').first().waitFor()
    const count = id === 'community-themes' ? 10 : 4
    assert.equal(await section.locator('[data-slide-index]').count(), count, 'Missing portfolio slides')
    await centerStage(section)
    await pauseCarousel(section)
    await selectSlide(section, 0)
    await playCarousel(section)
    for (let index = 0; index < count; index++) {
      await centered(section, index)
      const slide = section.locator(`[data-slide-index="${index}"]`)
      const video = slide.locator('video')
      await playing(video)
      await posterHealthy(slide)
      const started = performance.now()
      const entry = { id: id + '-' + index, index, status: 'running', samples: [], themeIdentity: 'human review required', namedMotionBeat: 'human review required' }
      const expectedTitle = (await section.locator('[role="group"] button').nth(index).getAttribute('aria-label')).replace(/, slide \d+ of \d+$/, '')
      result.checks.push(entry)
      const pixelHashes = []
      for (const second of [1, 3, 8, 13]) {
        await sleep(Math.max(0, second * 1000 - (performance.now() - started)))
        assert.equal(await activeIndex(section), index, entry.id + ': advanced before complete dwell')
        await centered(section, index)
        const state = await mediaState(video)
        assert.ok(!state.paused && state.readyState >= 2 && state.width > 0, entry.id + ': playback stalled during dwell')
        assert.equal(await section.locator('video').evaluateAll(videos => videos.filter(v => !v.paused).length), 1, entry.id + ': more than one carousel video playing')
        const caption = await section.locator('h3:visible').allTextContents()
        assert.equal(caption.length, 1, 'Expected exactly one visible caption')
        assert.equal(caption[0], expectedTitle, entry.id + ': caption is not the physically centered slide')
        const pixels = await video.screenshot({ animations: 'allow' })
        pixelHashes.push(createHash('sha256').update(pixels).digest('hex'))
        const file = `${safe(id)}-${index}-${second}s.png`
        await screenshot(page, path.join(dir, file))
        entry.samples.push({ atMs: Math.round(performance.now() - started), state, caption: caption[0], screenshot: file })
      }
      assert.ok(new Set(pixelHashes).size > 1, entry.id + ': recording has no observed pixel motion')
      assert.ok(entry.samples[3].state.frames === null || entry.samples[3].state.frames > entry.samples[0].state.frames, 'No decoded frame progress')
      const next = (index + 1) % count
      await page.waitForFunction(({ id, next }) => document.querySelector(`#${id} [data-slide-index="${next}"]`)?.getAttribute('data-active') === 'true', { id, next }, { timeout: 12000 })
      entry.autoAdvancedAfterMs = Math.round(performance.now() - started)
      assert.ok(entry.autoAdvancedAfterMs >= 14000, entry.id + ': dwell was shorter than expected')
      await centered(section, next)
      entry.status = 'pass'
      await fs.writeFile(path.join(dir, 'evidence.json'), JSON.stringify(result, null, 2))
      console.log(JSON.stringify({ viewport: result.viewport, ...entry, samples: entry.samples.map(s => ({ atMs: s.atMs, time: s.state.currentTime, caption: s.caption })) }))
    }
    await pauseCarousel(section)
    assert.equal(await activeIndex(section), 0, 'Final slide did not wrap to first')
  }
}
async function interactionQA(page, dir, result) {
  await page.goto(result.baseUrl + '/portfolio', { waitUntil: 'domcontentloaded' })
  assert.equal(new URL(page.url()).origin, result.baseUrl, 'Interactions redirected away from approved origin')
  const section = page.locator('#rep-highlights')
  await centerStage(section)
  await playing(section.locator('[data-active="true"] video'))
  await pauseCarousel(section)
  const previous = await activeIndex(section)
  await section.getByRole('button', { name: /^Next / }).click()
  await centered(section, (previous + 1) % 4)
  await sleep(15500)
  assert.equal(await activeIndex(section), (previous + 1) % 4, 'Pause did not persist through manual navigation')
  assert.equal(await section.locator('video').evaluateAll(videos => videos.filter(v => !v.paused).length), 0)
  await playCarousel(section)
  await playing(section.locator('[data-active="true"] video'))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await sleep(300)
  assert.equal(await section.locator('video').evaluateAll(videos => videos.filter(v => !v.paused).length), 0, 'Dynamic reduced motion did not stop animation')
  const held = await activeIndex(section)
  await playCarousel(section)
  await playing(section.locator('[data-active="true"] video'))
  await sleep(15500)
  assert.equal(await activeIndex(section), held, 'Reduced motion must retain manual advancement after explicit Play')
  result.screenshots.push(await screenshot(page, path.join(dir, 'interactions-reduced-motion.png')))
  result.checks.push({ id: 'pause-navigation-and-reduced-motion', status: 'pass' })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const failedMedia = /\.mp4(?:\?|$)/
  await page.route(failedMedia, route => route.abort())
  await page.reload({ waitUntil: 'domcontentloaded' })
  await centerStage(section)
  const failedIndex = await activeIndex(section)
  await section.locator('[data-active="true"] [data-playback="error"]').waitFor({ timeout: 15000 })
  await page.waitForFunction(() => !document.querySelector('#rep-highlights [data-active="true"] video'), undefined, { timeout: 10000 })
  await pauseCarousel(section)
  await sleep(15500)
  assert.equal(await activeIndex(section), failedIndex, 'Failed recording poster could not pause')
  await page.unroute(failedMedia)
  await playCarousel(section)
  await playing(section.locator('[data-active="true"] video'))
  result.checks.push({ id: 'failed-media-poster-pause-and-retry', status: 'pass' })
}
async function main(argv = process.argv.slice(2)) {
  const config = options(argv)
  if (config.help) { console.log('node scripts/qa-carousel-peeks.cjs --base-url ORIGIN [--mode all|home|portfolio|interactions] [--viewport all|desktop|mobile] [--carousel all|community-themes|rep-highlights] [--output DIRECTORY]'); return }
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')
  const browser = await chromium.launch({ headless: true, ...(process.env.CAPTURE_CHROMIUM_PATH ? { executablePath: process.env.CAPTURE_CHROMIUM_PATH } : {}) })
  const runs = []
  try {
    for (const viewport of config.viewport === 'all' ? ['desktop', 'mobile'] : [config.viewport]) {
      const dir = path.resolve(config.output, viewport + '-' + config.mode + '-' + config.carousel)
      await fs.mkdir(dir, { recursive: true })
      const result = { startedAt: new Date().toISOString(), baseUrl: config.baseUrl, viewport, mode: config.mode, status: 'running', checks: [], screenshots: [], pageErrors: [], assetErrors: [], blockedNonGet: [], humanVisualReview: 'required; automated playback does not certify named theme identity or quality' }
      result.expectedCommit = process.env.QA_COMMIT_SHA || null
      result.expectedDeployment = process.env.QA_DEPLOYMENT_ID || null
      result.provenanceVerification = 'Alias and commit verification is a separate release check'
      result.blockedNavigation = []
      const context = await browser.newContext({ viewport: viewport === 'desktop' ? { width: 1440, height: 1000 } : { width: 390, height: 844 }, reducedMotion: 'no-preference', deviceScaleFactor: 1, serviceWorkers: 'block' })
      await context.route('**/*', route => {
        if (route.request().method() !== 'GET') { result.blockedNonGet.push({ method: route.request().method(), url: route.request().url().split('?')[0] }); return route.abort() }
        if (route.request().isNavigationRequest() && new URL(route.request().url()).origin !== config.baseUrl) { result.blockedNavigation.push(route.request().url().split('?')[0]); return route.abort() }
        return route.continue()
      })
      const page = await context.newPage()
      page.on('pageerror', error => result.pageErrors.push(error.message))
      page.on('response', response => { if (response.status() >= 400 && ['image', 'media', 'stylesheet', 'script'].includes(response.request().resourceType()) && !response.url().endsWith('/favicon.ico')) result.assetErrors.push({ url: response.url().split('?')[0], status: response.status() }) })
      try {
        if (['all', 'home'].includes(config.mode)) await homeQA(page, dir, result)
        if (['all', 'portfolio'].includes(config.mode)) await carouselQA(page, dir, result, config.carousel)
        if (['all', 'interactions'].includes(config.mode)) await interactionQA(page, dir, result)
        assert.equal(result.blockedNavigation.length, 0, 'Unexpected external navigation')
        assert.equal(result.pageErrors.length, 0, 'Page runtime errors: ' + JSON.stringify(result.pageErrors))
        assert.equal(result.assetErrors.length, 0, 'Failed page assets: ' + JSON.stringify(result.assetErrors))
        assert.ok(result.checks.length > 0, 'No checks completed')
        result.status = 'pass'
      } catch (error) {
        result.status = 'fail'; result.error = String(error.stack || error)
        for (const check of result.checks) if (check.status === 'running') check.status = 'fail'
        try { result.screenshots.push(await screenshot(page, path.join(dir, 'failure.png'))) } catch {}
      } finally {
        result.finishedAt = new Date().toISOString()
        await fs.writeFile(path.join(dir, 'evidence.json'), JSON.stringify(result, null, 2))
        runs.push({ viewport, status: result.status, checks: result.checks.length, evidence: path.join(dir, 'evidence.json'), error: result.error })
        await context.close()
      }
    }
  } finally { await browser.close() }
  console.log(JSON.stringify(runs, null, 2))
  if (runs.some(run => run.status !== 'pass')) process.exitCode = 1
}
module.exports = { options }
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1 })
