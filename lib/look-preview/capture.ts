import {
  LOOK_PREVIEW_MARKER_WAIT_MS,
  LOOK_PREVIEW_SETTLE_MS,
  assertAllowedLookPreviewUrl,
  decideLookPreviewReady,
  type LookPreviewPageSignals,
  type LookPreviewReadyDecision,
} from '@/lib/look-preview/policy'

const DESKTOP = { width: 1440, height: 1080 }
const PHONE = { width: 390, height: 844 }
const CHROMIUM_PACK_URL = 'https://github.com/Sparticuz/chromium/releases/download/v158.0.0/chromium-v158.0.0-pack.tar'

export type LookPreviewShots = {
  desktop: Buffer
  phone: Buffer
  desktopBytes: number
  phoneBytes: number
}

async function encodeWebp(png: Buffer, kind: 'desktop' | 'phone') {
  const sharp = (await import('sharp')).default
  const target = kind === 'desktop' ? 150_000 : 80_000
  const ceiling = kind === 'desktop' ? 250_000 : 120_000
  let quality = 68
  let output = await sharp(png).webp({ quality }).toBuffer()
  while (output.length > target && quality > 42) {
    quality -= 6
    output = await sharp(png).webp({ quality }).toBuffer()
  }
  if (output.length > ceiling) {
    output = await sharp(png)
      .resize({ width: kind === 'desktop' ? 1200 : 390, withoutEnlargement: true })
      .webp({ quality: 40 })
      .toBuffer()
  }
  return output
}

async function chromePath(explicit?: string) {
  if (explicit) return explicit
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH
  if (process.env.VERCEL) {
    const chromium = (await import('@sparticuz/chromium-min')).default
    chromium.setGraphicsMode = false
    return chromium.executablePath(CHROMIUM_PACK_URL)
  }
  return '/usr/bin/google-chrome-stable'
}

type CapturePage = {
  evaluate: <T>(fn: () => T | Promise<T>) => Promise<T>
  waitForNetworkIdle: (options: { idleTime: number; timeout: number }) => Promise<void>
}

async function readPageSignals(page: CapturePage, httpStatus: number, settled: boolean): Promise<LookPreviewPageSignals> {
  const observed = await page.evaluate(async () => {
    const heroImage = document.querySelector('.hp-hero img, .hp-hero-media img, [data-hero] img, .hero img')
    let heroDecoded = true
    if (heroImage instanceof HTMLImageElement && (heroImage.currentSrc || heroImage.src)) {
      heroDecoded = heroImage.complete && heroImage.naturalWidth > 0
      if (!heroDecoded) {
        heroDecoded = await Promise.race([
          heroImage.decode().then(() => true).catch(() => heroImage.complete && heroImage.naturalWidth > 0),
          new Promise<boolean>((resolve) => setTimeout(() => resolve(heroImage.complete && heroImage.naturalWidth > 0), 4000)),
        ])
      }
    }
    if (document.fonts?.ready) {
      await Promise.race([
        document.fonts.ready,
        new Promise((resolve) => setTimeout(resolve, 4000)),
      ])
    }
    return {
      hasHpHeader: Boolean(document.querySelector('.hp-header, header.site-header, header')),
      hasHpHero: Boolean(document.querySelector('.hp-hero, [data-hero], .hero')),
      hasTemplateSrc: Boolean(document.querySelector('[data-template-src]')),
      fontsReady: !document.fonts || document.fonts.status === 'loaded',
      heroDecoded,
      textLength: (document.body?.innerText || '').replace(/\s+/g, ' ').trim().length,
    }
  })
  return { httpStatus, settled, ...observed }
}

async function freeze(page: CapturePage) {
  await page.evaluate(() => {
    const style = document.createElement('style')
    style.textContent = 'html{scrollbar-width:none} *{animation:none!important;transition:none!important}'
    document.head.append(style)
    document.querySelectorAll('video').forEach((video) => {
      video.pause()
      try { video.currentTime = 0 } catch { /* a poster frame is enough */ }
    })
    document.querySelectorAll('.ticker-track, .hp-ticker-track').forEach((node) => {
      const track = node as HTMLElement
      track.style.animation = 'none'
      track.style.transform = 'none'
    })
  })
}

async function waitUntilReady(page: CapturePage, httpStatus: number): Promise<LookPreviewReadyDecision> {
  if (httpStatus === 404 || httpStatus === 410) return decideLookPreviewReady({
    httpStatus,
    hasHpHeader: false,
    hasHpHero: false,
    hasTemplateSrc: false,
    fontsReady: false,
    heroDecoded: false,
    settled: false,
    textLength: 0,
  })
  const started = Date.now()
  let latest = await readPageSignals(page, httpStatus, false)
  while (Date.now() - started < LOOK_PREVIEW_MARKER_WAIT_MS) {
    const decision = decideLookPreviewReady(latest)
    if (decision.action !== 'wait') return decision
    await new Promise((resolve) => setTimeout(resolve, 250))
    latest = await readPageSignals(page, httpStatus, false)
  }
  await page.waitForNetworkIdle({ idleTime: 500, timeout: 8000 }).catch(() => undefined)
  await new Promise((resolve) => setTimeout(resolve, LOOK_PREVIEW_SETTLE_MS))
  return decideLookPreviewReady(await readPageSignals(page, httpStatus, true))
}

export async function captureLookPreviewShots(
  url: string,
  options: { allowedHosts: readonly string[]; executablePath?: string },
): Promise<LookPreviewShots | { ok: false; reason: 'page-missing' | 'blank' | 'page-not-ready' }> {
  const target = assertAllowedLookPreviewUrl(url, options.allowedHosts)
  const puppeteer = await import('puppeteer-core')
  const executablePath = await chromePath(options.executablePath)
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--hide-scrollbars'],
    executablePath,
    headless: true,
  })
  try {
    const page = await browser.newPage()
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
    const shoot = async (size: { width: number; height: number }) => {
      await page.setViewport({ ...size, deviceScaleFactor: 1 })
      const response = await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 25_000 })
      const decision = await waitUntilReady(page, response?.status() ?? 0)
      if (decision.action !== 'capture') return decision
      await freeze(page)
      return Buffer.from(await page.screenshot({
        type: 'png',
        clip: { x: 0, y: 0, width: size.width, height: size.height },
      }))
    }
    const desktopShot = await shoot(DESKTOP)
    if (!Buffer.isBuffer(desktopShot)) {
      return { ok: false, reason: desktopShot?.action === 'skip' ? desktopShot.reason : 'page-not-ready' }
    }
    const phoneShot = await shoot(PHONE)
    if (!Buffer.isBuffer(phoneShot)) {
      return { ok: false, reason: phoneShot?.action === 'skip' ? phoneShot.reason : 'page-not-ready' }
    }
    const desktop = await encodeWebp(desktopShot, 'desktop')
    const phone = await encodeWebp(phoneShot, 'phone')
    return { desktop, phone, desktopBytes: desktop.length, phoneBytes: phone.length }
  } finally {
    await browser.close()
  }
}
