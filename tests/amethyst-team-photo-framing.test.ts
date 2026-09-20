import { describe, expect, it } from 'vitest'

import {
  DEFAULT_TEAM_PHOTO_FRAMING,
  frameTeamPhotoFace,
  parseTeamPhotoFraming,
  serializeTeamPhotoFraming,
  suggestTeamPhotoFramingFromFace,
  teamPhotoFramingStyle,
} from '@/lib/amethyst/team-photo-framing'

describe('Join Team portrait framing', () => {
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

  it('emits the same framing variables for the public card and workspace preview', () => {
    expect(teamPhotoFramingStyle({ focusX: 36, focusY: 42, zoom: 1.1, rotation: 8 })).toEqual({
      '--jp-team-photo-focus-x': '36%',
      '--jp-team-photo-focus-y': '42%',
      '--jp-team-photo-zoom': '1.1',
      '--jp-team-photo-rotation': '8deg',
      '--jp-team-photo-fit': 'cover',
    })
  })

  it('round-trips whole-photo framing without zoom or tilt cropping the source', () => {
    const token = serializeTeamPhotoFraming({ focusX: 50, focusY: 38, zoom: 1.2, rotation: 8, fit: 'contain' })
    expect(token).toBe('ss-frame:50,38,1.00,0 ss-fit:contain')
    expect(parseTeamPhotoFraming(token)).toMatchObject({ fit: 'contain', zoom: 1, rotation: 0 })
    expect(teamPhotoFramingStyle(parseTeamPhotoFraming(token))['--jp-team-photo-fit']).toBe('contain')
  })

  it('converts a portrait face location to cover positioning, rather than using its source percentage', () => {
    const frame = frameTeamPhotoFace({ imageWidth: 800, imageHeight: 1200, face: { x: 0.35, y: 0.32, width: 0.3, height: 0.24 } })
    // Cover makes this source 12/7 panel-heights. Positioning must put the
    // source face center (44%) at approximately 43% of the visible panel.
    const visibleCenter = 0.44 * (12 / 7) + (1 - 12 / 7) * frame.focusY / 100
    expect(visibleCenter).toBeCloseTo(0.43, 2)
    expect(frame.fit).not.toBe('contain')
    expect(frame.zoom).toBe(1)
  })

  it('preserves the full photo when a safe face crop cannot be determined', () => {
    expect(frameTeamPhotoFace({ imageWidth: 800, imageHeight: 1200 }).fit).toBe('contain')
    expect(frameTeamPhotoFace({ imageWidth: 800, imageHeight: 1200, face: { x: 0.1, y: 0.01, width: 0.8, height: 0.85 } }).fit).toBe('contain')
    expect(frameTeamPhotoFace({ imageWidth: 0, imageHeight: 1200, face: { x: 0.3, y: 0.3, width: 0.3, height: 0.3 } }).fit).toBe('contain')
  })
})
