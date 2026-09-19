export const TEAM_PHOTO_FRAME_TOKEN_PREFIX = 'ss-frame:'

export interface TeamPhotoFraming {
  /** Horizontal focal point, 0–100. 50 is centered. */
  focusX: number
  /**
   * Vertical focal point, 0–100. Team circles default slightly above center
   * so a typical head-and-shoulders photo keeps hair in frame and shows
   * more of the person than a tight face stamp.
   */
  focusY: number
  /**
   * Cover-scale. 1 keeps the uploaded frame; values above 1 crop in around
   * the focal point. Team cards stay near 1 so the circle is generous.
   */
  zoom: number
  /** Clockwise degrees. Used to straighten a tilted selfie, not as decoration. */
  rotation: number
}

export const DEFAULT_TEAM_PHOTO_FRAMING: TeamPhotoFraming = {
  focusX: 50,
  focusY: 38,
  zoom: 1,
  rotation: 0,
}

const FOCUS_MIN = 0
const FOCUS_MAX = 100
const TEAM_ZOOM_MIN = 1
const TEAM_ZOOM_MAX = 1.22
const ROTATION_MIN = -20
const ROTATION_MAX = 20

export function clampTeamPhotoFocus(value: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback
  return Math.min(FOCUS_MAX, Math.max(FOCUS_MIN, Math.round(value)))
}

export function clampTeamPhotoZoom(value: number, fallback = DEFAULT_TEAM_PHOTO_FRAMING.zoom) {
  if (!Number.isFinite(value)) return fallback
  return Math.round(Math.min(TEAM_ZOOM_MAX, Math.max(TEAM_ZOOM_MIN, value)) * 100) / 100
}

export function clampTeamPhotoRotation(
  value: number,
  fallback = DEFAULT_TEAM_PHOTO_FRAMING.rotation,
) {
  if (!Number.isFinite(value)) return fallback
  return Math.round(Math.min(ROTATION_MAX, Math.max(ROTATION_MIN, value)))
}

export function normalizeTeamPhotoFraming(
  value?: Partial<TeamPhotoFraming> | null,
): TeamPhotoFraming {
  return {
    focusX: clampTeamPhotoFocus(
      value?.focusX ?? DEFAULT_TEAM_PHOTO_FRAMING.focusX,
      DEFAULT_TEAM_PHOTO_FRAMING.focusX,
    ),
    focusY: clampTeamPhotoFocus(
      value?.focusY ?? DEFAULT_TEAM_PHOTO_FRAMING.focusY,
      DEFAULT_TEAM_PHOTO_FRAMING.focusY,
    ),
    zoom: clampTeamPhotoZoom(value?.zoom ?? DEFAULT_TEAM_PHOTO_FRAMING.zoom),
    rotation: clampTeamPhotoRotation(
      value?.rotation ?? DEFAULT_TEAM_PHOTO_FRAMING.rotation,
    ),
  }
}

function framingFromLegacyClasses(imageClassName: string): Partial<TeamPhotoFraming> {
  const tokens = imageClassName.split(/\s+/).filter(Boolean)
  const next: Partial<TeamPhotoFraming> = {}

  if (tokens.includes('object-left')) {
    next.focusX = 28
  }
  if (tokens.includes('object-top')) {
    next.focusY = 18
  }
  // `rotate-left` was a -25deg presentation hack that shipped tilted faces.
  // Ignore it so public cards stay upright unless an operator sets rotation.

  return next
}

function parseFrameToken(imageClassName: string): Partial<TeamPhotoFraming> | null {
  const match = imageClassName.match(
    /ss-frame:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
  )
  if (!match) return null

  return {
    focusX: Number(match[1]),
    focusY: Number(match[2]),
    zoom: Number(match[3]),
    rotation: Number(match[4]),
  }
}

export function parseTeamPhotoFraming(
  imageClassName?: string | null,
  explicit?: Partial<TeamPhotoFraming> | null,
): TeamPhotoFraming {
  if (explicit && Object.keys(explicit).length > 0) {
    return normalizeTeamPhotoFraming(explicit)
  }

  const raw = imageClassName?.trim() ?? ''
  if (!raw) return { ...DEFAULT_TEAM_PHOTO_FRAMING }

  const fromToken = parseFrameToken(raw)
  if (fromToken) return normalizeTeamPhotoFraming(fromToken)

  return normalizeTeamPhotoFraming(framingFromLegacyClasses(raw))
}

export function serializeTeamPhotoFraming(
  value?: Partial<TeamPhotoFraming> | null,
): string {
  const framing = normalizeTeamPhotoFraming(value)
  return `${TEAM_PHOTO_FRAME_TOKEN_PREFIX}${framing.focusX},${framing.focusY},${framing.zoom.toFixed(2)},${framing.rotation}`
}

export function suggestTeamPhotoFramingFromFace(input: {
  faceCenterX: number
  faceCenterY: number
  faceWidthRatio: number
}): TeamPhotoFraming {
  const faceWidth = Number.isFinite(input.faceWidthRatio)
    ? Math.min(1, Math.max(0.08, input.faceWidthRatio))
    : 0.35
  // Keep the face near half the circle, never a tight stamp (cap 1.22).
  const zoom = clampTeamPhotoZoom(0.48 / faceWidth)

  return normalizeTeamPhotoFraming({
    focusX: clampTeamPhotoFocus(input.faceCenterX, DEFAULT_TEAM_PHOTO_FRAMING.focusX),
    focusY: clampTeamPhotoFocus(
      input.faceCenterY - 6,
      DEFAULT_TEAM_PHOTO_FRAMING.focusY,
    ),
    zoom,
    rotation: 0,
  })
}

export function teamPhotoFramingStyle(
  value?: Partial<TeamPhotoFraming> | null,
): Record<
  | '--jp-team-photo-focus-x'
  | '--jp-team-photo-focus-y'
  | '--jp-team-photo-zoom'
  | '--jp-team-photo-rotation',
  string
> {
  const framing = normalizeTeamPhotoFraming(value)
  return {
    '--jp-team-photo-focus-x': `${framing.focusX}%`,
    '--jp-team-photo-focus-y': `${framing.focusY}%`,
    '--jp-team-photo-zoom': String(framing.zoom),
    '--jp-team-photo-rotation': `${framing.rotation}deg`,
  }
}
