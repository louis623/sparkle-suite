import { beforeEach, describe, expect, it, vi } from 'vitest'
import sharp from 'sharp'

const jsQR = vi.hoisted(() => vi.fn())

vi.mock('jsqr', () => ({
  default: jsQR,
}))

import {
  FlyerQrDecodeError,
  assertFlyerQrDecodes,
  decodeFlyerQr,
} from '@/lib/workspace/card-qr/flyer-decode'

const URL = 'https://sparkle-suite-smoke.vercel.app/fizzfest'
const window = { x: 240, y: 700, width: 600, height: 600 }

async function canvas() {
  return sharp({
    create: {
      width: 1080,
      height: 1920,
      channels: 4,
      background: { r: 20, g: 10, b: 30, alpha: 1 },
    },
  })
    .png()
    .toBuffer()
}

describe('flyer QR window fallback', () => {
  beforeEach(() => {
    jsQR.mockReset()
  })

  it('keeps the full-image scan when it finds the URL', async () => {
    jsQR.mockReturnValue({ data: URL })
    await expect(decodeFlyerQr(await canvas(), window)).resolves.toBe(URL)
    expect(jsQR).toHaveBeenCalledTimes(1)
    expect(jsQR.mock.calls[0]?.[1]).toBe(1080)
  })

  it('crops the known QR window when the full scan returns nothing', async () => {
    jsQR.mockImplementation((_data: Uint8ClampedArray, width: number) => {
      if (width === 1080) return null
      return { data: URL }
    })
    await expect(assertFlyerQrDecodes(await canvas(), URL, window)).resolves.toBeUndefined()
    const widths = jsQR.mock.calls.map((call) => call[1] as number)
    expect(widths[0]).toBe(1080)
    expect(widths[1]).toBeGreaterThan(600)
    expect(widths[1]).toBeLessThan(700)
    expect(widths).toHaveLength(2)
  })

  it('retries that crop at half size when the native crop returns nothing', async () => {
    jsQR.mockImplementation((_data: Uint8ClampedArray, width: number) => {
      if (width > 400) return null
      return { data: URL }
    })
    await expect(decodeFlyerQr(await canvas(), window)).resolves.toBe(URL)
    const widths = jsQR.mock.calls.map((call) => call[1] as number)
    expect(widths).toHaveLength(3)
    expect(widths[2]).toBeGreaterThan(250)
    expect(widths[2]).toBeLessThan(400)
  })

  it('still rejects a window that decodes a different URL', async () => {
    jsQR.mockImplementation((_data: Uint8ClampedArray, width: number) =>
      width === 1080 ? null : { data: 'https://wrong.example' },
    )
    await expect(assertFlyerQrDecodes(await canvas(), URL, window)).rejects.toBeInstanceOf(
      FlyerQrDecodeError,
    )
  })
})
