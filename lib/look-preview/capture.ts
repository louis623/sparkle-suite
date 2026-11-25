import { assertAllowedLookPreviewUrl } from '@/lib/look-preview/policy'

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

async function freeze(page: { evaluate: (fn: () => Promise<boolean> | boolean) => Promise<boolean> }) {
  return page.evaluate(async () => {
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
    if (document.fonts?.ready) await document.fonts.ready
    const images = [...document.images]
    await Promise.all(images.map((image) => image.complete ? null : image.decode().catch(() => undefined)))
    return Boolean(document.querySelector('.hp-header') && document.querySelector('.hp-hero'))
  })
}

export async function captureLookPreviewShots(
  url: string,
  options: { allowedHosts: readonly string[]; executablePath?: string },
): Promise<LookPreviewShots | { ok: false; reason: 'page-not-ready' }> {
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
      await page.goto(target, { waitUntil: 'load', timeout: 25_000 })
      const ready = await freeze(page)
      if (!ready) return null
      return Buffer.from(await page.screenshot({
        type: 'png',
        clip: { x: 0, y: 0, width: size.width, height: size.height },
      }))
    }
    const desktopPng = await shoot(DESKTOP)
    const phonePng = desktopPng ? await shoot(PHONE) : null
    if (!desktopPng || !phonePng) return { ok: false, reason: 'page-not-ready' }
    const desktop = await encodeWebp(desktopPng, 'desktop')
    const phone = await encodeWebp(phonePng, 'phone')
    return { desktop, phone, desktopBytes: desktop.length, phoneBytes: phone.length }
  } finally {
    await browser.close()
  }
}
