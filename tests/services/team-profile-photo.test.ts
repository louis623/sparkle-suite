import { describe, expect, it } from 'vitest'
import sharp from 'sharp'

import { normalizeTeamProfilePhoto } from '@/lib/services/team-profile-photo'

describe('normalizeTeamProfilePhoto', () => {
  it('bakes EXIF orientation into upright pixels and writes JPEG without a rotate tag', async () => {
    const landscape = await sharp({
      create: {
        width: 40,
        height: 20,
        channels: 3,
        background: { r: 220, g: 40, b: 80 },
      },
    })
      .jpeg()
      .toBuffer()

    const sideways = await sharp(landscape)
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer()

    const normalized = await normalizeTeamProfilePhoto(sideways)
    const metadata = await sharp(normalized.buffer).metadata()

    expect(normalized.contentType).toBe('image/jpeg')
    expect(metadata.format).toBe('jpeg')
    expect(metadata.orientation === undefined || metadata.orientation === 1).toBe(
      true,
    )
    expect(metadata.width).toBe(20)
    expect(metadata.height).toBe(40)
  })
})
