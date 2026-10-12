import jsQR from 'jsqr'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { CARD_QR_ICONS, CARD_QR_ICON_GROUPS, CARD_QR_ICON_LABELS } from '@/lib/workspace/card-qr/design'
import { CARD_QR_ICON_ART_V3 } from '@/lib/workspace/card-qr/qr-icon-art-v3'
import { cardQrSvg, inspectCardQr, renderCardQrPng } from '@/lib/workspace/card-qr/render'

const URL = 'https://www.yoursparklesuite.com/q/abc123'

async function decode(png: Buffer) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data ?? null
}

describe('QR center marks', () => {
  it('offers None, the nine original marks and the 23 Oct 11 marks', () => {
    expect(CARD_QR_ICONS.slice(0, 10)).toEqual([
      'none', 'diamond-solid', 'diamond-two-tone', 'unicorn-line', 'unicorn-two-tone',
      'heart', 'smiley', 'gem-ring', 'crown', 'butterfly',
    ])
    expect(CARD_QR_ICONS).toHaveLength(33)
    expect(CARD_QR_ICONS.slice(10)).toEqual(Object.keys(CARD_QR_ICON_ART_V3))
    expect(Object.keys(CARD_QR_ICON_LABELS)).toHaveLength(33)
  })

  it('puts every icon in exactly one picker group', () => {
    const grouped = CARD_QR_ICON_GROUPS.flatMap((g) => g.icons)
    expect([...grouped].sort()).toEqual([...CARD_QR_ICONS].sort())
    expect(CARD_QR_ICON_GROUPS.map((g) => g.label)).toEqual(['Everyday', 'Beach and Western', 'Halloween', 'Christmas'])
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
