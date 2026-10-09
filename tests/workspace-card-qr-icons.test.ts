import jsQR from 'jsqr'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { CARD_QR_ICONS, CARD_QR_ICON_LABELS } from '@/lib/workspace/card-qr/design'
import { cardQrSvg, inspectCardQr, renderCardQrPng } from '@/lib/workspace/card-qr/render'

const URL = 'https://www.yoursparklesuite.com/q/abc123'

async function decode(png: Buffer) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data ?? null
}

describe('QR center marks', () => {
  it('offers None plus the nine approved marks', () => {
    expect(CARD_QR_ICONS).toEqual([
      'none', 'diamond-solid', 'diamond-two-tone', 'unicorn-line', 'unicorn-two-tone',
      'heart', 'smiley', 'gem-ring', 'crown', 'butterfly',
    ])
    expect(Object.keys(CARD_QR_ICON_LABELS)).toHaveLength(10)
  })

  it.each(CARD_QR_ICONS.filter((icon) => icon !== 'none'))('%s draws a ringed badge and still scans', async (icon) => {
    const drawn = cardQrSvg({ url: URL, icon, dark: '#5b1e3b', width: 640 })
    expect(drawn.icon).toBe(icon)
    expect(drawn.svg).toContain('stroke="#5b1e3b"')
    expect(drawn.svg).not.toMatch(/__DARK__|__T[\d.]+__|currentColor/)
    const png = await renderCardQrPng(URL, { qrDark: '#5b1e3b', qrLight: '#FFFFFF' }, 640, icon)
    expect(await decode(png)).toBe(URL)
    const small = await sharp(png).resize(192).jpeg({ quality: 60 }).toBuffer()
    expect(await decode(await sharp(small).png().toBuffer())).toBe(URL)
  })

  it('drops the badge when the code is bigger than version 6', () => {
    const long = `https://www.yoursparklesuite.com/${'x'.repeat(120)}`
    const info = inspectCardQr(long, 'heart')
    expect(info.icon).toBe('none')
    expect(info.errorCorrectionLevel).toBe('M')
    expect(cardQrSvg({ url: long, icon: 'heart', dark: '#111111', width: 400 }).svg).not.toContain('<circle')
  })
})
