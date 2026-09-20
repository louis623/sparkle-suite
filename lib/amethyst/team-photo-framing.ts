export const TEAM_PHOTO_FRAME_TOKEN_PREFIX = 'ss-frame:'
export const TEAM_PHOTO_PANEL_ASPECT_RATIO = 8 / 7

export interface TeamPhotoFraming {
  /** Horizontal focal point, 0–100. 50 is centered. */
  focusX: number
  /**
   * Vertical object-position, 0–100. Team portraits default slightly above center
   * so a typical head-and-shoulders photo keeps hair in frame and shows
   * more of the person than a tight face stamp.
   */
  focusY: number
  /**
   * Cover-scale. 1 keeps the uploaded frame; values above 1 crop in around
   * the focal point. Team cards stay near 1 so the portrait is generous.
   */
  zoom: number
  /** Clockwise degrees. Used to straighten a tilted selfie, not as decoration. */
  rotation: number
  /** Show the whole source when a cover crop cannot preserve the portrait. */
  fit?: 'cover' | 'contain'
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
    zoom: value?.fit === 'contain' ? 1 : clampTeamPhotoZoom(value?.zoom ?? DEFAULT_TEAM_PHOTO_FRAMING.zoom),
    rotation: value?.fit === 'contain' ? 0 : clampTeamPhotoRotation(
      value?.rotation ?? DEFAULT_TEAM_PHOTO_FRAMING.rotation,
    ),
    ...(value?.fit === 'contain' ? { fit: 'contain' as const } : {}),
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
  const fit = raw.split(/\s+/).includes('ss-fit:contain') ? { fit: 'contain' as const } : {}
  if (fromToken) return normalizeTeamPhotoFraming({ ...fromToken, ...fit })

  return normalizeTeamPhotoFraming({ ...framingFromLegacyClasses(raw), ...fit })
}

export function serializeTeamPhotoFraming(
  value?: Partial<TeamPhotoFraming> | null,
): string {
  const framing = normalizeTeamPhotoFraming(value)
  return `${TEAM_PHOTO_FRAME_TOKEN_PREFIX}${framing.focusX},${framing.focusY},${framing.zoom.toFixed(2)},${framing.rotation}${framing.fit === 'contain' ? ' ss-fit:contain' : ''}`
}

export function suggestTeamPhotoFramingFromFace(input: {
  faceCenterX: number
  faceCenterY: number
  faceWidthRatio: number
  imageWidth?: number
  imageHeight?: number
}): TeamPhotoFraming {
  const faceWidth = Number.isFinite(input.faceWidthRatio)
    ? Math.min(1, Math.max(0.08, input.faceWidthRatio))
    : 0.35
  // Optional dimensions let a face coordinate become an actual CSS crop
  // position. Percent object-position is not a source-image focal coordinate.
  if (input.imageWidth && input.imageHeight &&
      Number.isFinite(input.imageWidth) && Number.isFinite(input.imageHeight) &&
      input.imageWidth > 0 && input.imageHeight > 0) {
    const frameWidth = TEAM_PHOTO_PANEL_ASPECT_RATIO
    const scale = Math.max(frameWidth / input.imageWidth, 1 / input.imageHeight)
    const width = input.imageWidth * scale
    const height = input.imageHeight * scale
    const position = (source: number, extent: number, frame: number, target: number) =>
      extent - frame > 0.0001 ? ((source / 100 * extent - frame * target) / (extent - frame)) * 100 : 50
    return normalizeTeamPhotoFraming({
      focusX: position(clampTeamPhotoFocus(input.faceCenterX, 50), width, frameWidth, 0.5),
      focusY: position(clampTeamPhotoFocus(input.faceCenterY, 38), height, 1, 0.43),
      zoom: 1,
      rotation: 0,
    })
  }
  // Preserve framing behavior for existing callers without image dimensions.
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

/** Face bounds are source-image fractions (0–1), before any cropping. */
export function frameTeamPhotoFace(input: {
  imageWidth: number
  imageHeight: number
  face?: { x: number; y: number; width: number; height: number } | null
}): TeamPhotoFraming {
  const { face } = input
  if (!face || ![input.imageWidth, input.imageHeight, face.x, face.y, face.width, face.height].every(Number.isFinite) ||
      input.imageWidth <= 0 || input.imageHeight <= 0 || face.width <= 0 || face.height <= 0 ||
      face.x < 0 || face.y < 0 || face.x + face.width > 1 || face.y + face.height > 1) {
    return normalizeTeamPhotoFraming({ fit: 'contain' })
  }
  const framing = suggestTeamPhotoFramingFromFace({
    imageWidth: input.imageWidth,
    imageHeight: input.imageHeight,
    faceCenterX: (face.x + face.width / 2) * 100,
    faceCenterY: (face.y + face.height / 2) * 100,
    faceWidthRatio: face.width,
  })
  const scale = Math.max(TEAM_PHOTO_PANEL_ASPECT_RATIO / input.imageWidth, 1 / input.imageHeight)
  const width = input.imageWidth * scale
  const height = input.imageHeight * scale
  const left = (TEAM_PHOTO_PANEL_ASPECT_RATIO - width) * framing.focusX / 100
  const top = (1 - height) * framing.focusY / 100
  // Include breathing room for hair. If the source cannot cover the card
  // without cutting into that area, preserve the whole source instead.
  if ((face.x - face.width * 0.12) * width + left < 0 ||
      (face.x + face.width * 1.12) * width + left > TEAM_PHOTO_PANEL_ASPECT_RATIO ||
      (face.y - face.height * 0.25) * height + top < 0 ||
      (face.y + face.height * 1.15) * height + top > 1) {
    return normalizeTeamPhotoFraming({ fit: 'contain' })
  }
  return framing
}

export function teamPhotoFramingStyle(
  value?: Partial<TeamPhotoFraming> | null,
): Record<
  | '--jp-team-photo-focus-x'
  | '--jp-team-photo-focus-y'
  | '--jp-team-photo-zoom'
  | '--jp-team-photo-rotation'
  | '--jp-team-photo-fit',
  string
> {
  const framing = normalizeTeamPhotoFraming(value)
  return {
    '--jp-team-photo-focus-x': `${framing.focusX}%`,
    '--jp-team-photo-focus-y': `${framing.focusY}%`,
    '--jp-team-photo-zoom': String(framing.zoom),
    '--jp-team-photo-rotation': `${framing.rotation}deg`,
    '--jp-team-photo-fit': framing.fit ?? 'cover',
  }
}
