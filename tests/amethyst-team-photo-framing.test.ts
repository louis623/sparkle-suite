import { describe, expect, it } from 'vitest'

import {
  DEFAULT_TEAM_PHOTO_FRAMING,
  parseTeamPhotoFraming,
  serializeTeamPhotoFraming,
  suggestTeamPhotoFramingFromFace,
  teamPhotoFramingStyle,
} from '@/lib/amethyst/team-photo-framing'

describe('Join Team circular photo framing', () => {
  it('defaults to a generous centered head-and-shoulders frame', () => {
    expect(parseTeamPhotoFraming('')).toEqual(DEFAULT_TEAM_PHOTO_FRAMING)
    expect(DEFAULT_TEAM_PHOTO_FRAMING).toEqual({
      focusX: 50,
      focusY: 38,
      zoom: 1,
      rotation: 0,
    })
  })

  it('round-trips the stored Smart Frame token', () => {
    const token = serializeTeamPhotoFraming({
      focusX: 36,
      focusY: 42,
      zoom: 1.08,
      rotation: -6,
    })

    expect(token).toBe('ss-frame:36,42,1.08,-6')
    expect(parseTeamPhotoFraming(token)).toEqual({
      focusX: 36,
      focusY: 42,
      zoom: 1.08,
      rotation: -6,
    })
  })

  it('maps leftover left/top crop classes without applying the old tilt hack', () => {
    expect(parseTeamPhotoFraming('object-left')).toMatchObject({
      focusX: 28,
      focusY: 38,
      rotation: 0,
    })
    expect(parseTeamPhotoFraming('object-top')).toMatchObject({
      focusX: 50,
      focusY: 18,
      rotation: 0,
    })
    expect(parseTeamPhotoFraming('object-left rotate-left')).toMatchObject({
      focusX: 28,
      rotation: 0,
    })
  })

  it('suggests a face-centered frame that stays short of a face stamp', () => {
    const dara = suggestTeamPhotoFramingFromFace({
      faceCenterX: 36,
      faceCenterY: 44,
      faceWidthRatio: 0.42,
    })
    const kelly = suggestTeamPhotoFramingFromFace({
      faceCenterX: 50,
      faceCenterY: 32,
      faceWidthRatio: 0.28,
    })

    expect(dara.focusX).toBe(36)
    expect(dara.focusY).toBe(38)
    expect(dara.zoom).toBeGreaterThanOrEqual(1)
    expect(dara.zoom).toBeLessThanOrEqual(1.22)
    expect(kelly.zoom).toBe(1.22)
    expect(kelly.focusY).toBe(26)
  })

  it('emits CSS variables the public circle crop consumes', () => {
    expect(teamPhotoFramingStyle({ focusX: 36, focusY: 42, zoom: 1.1, rotation: 8 })).toEqual({
      '--jp-team-photo-focus-x': '36%',
      '--jp-team-photo-focus-y': '42%',
      '--jp-team-photo-zoom': '1.1',
      '--jp-team-photo-rotation': '8deg',
    })
  })
})
