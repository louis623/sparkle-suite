import {
  AMETHYST_APPEARANCE_PRESETS,
  type AmethystAppearancePresetId,
} from '@/lib/amethyst/appearance-presets'

export const CARD_QR_FLYER_WIDTH = 1080
export const CARD_QR_FLYER_HEIGHT = 1920
export const CARD_QR_FLYER_QR_SIZE = 560
export const FLYER_SAFE_TOP = 250
export const FLYER_SAFE_BOTTOM = 385
export const FLYER_CONTENT_BOTTOM = CARD_QR_FLYER_HEIGHT - FLYER_SAFE_BOTTOM
export const FLYER_MARGIN_LEFT = 72
export const FLYER_MARGIN_RIGHT = 1008
export const FLYER_TEXT_MAX_WIDTH = 860
export const FLYER_QR_FRAME = 16
export const FLYER_SCAN_LABEL = 'SCAN TO SHOP'
export const FLYER_INSTRUCTION =
  'Screenshot this flyer and open it in Photos. Then press and hold the QR code.'

export type FlyerTextRole = 'heading' | 'body'

export type FlyerMeasure = (
  text: string,
  role: FlyerTextRole,
  size: number,
) => number

export interface FlyerBox {
  x: number
  y: number
  width: number
  height: number
}

export interface FlyerTextBlock {
  lines: string[]
  size: number
  top: number
  lineHeight: number
}

export type FlyerPanelKind = 'glass' | 'parchment' | 'paper'

export interface FlyerLayout {
  showTitle: FlyerTextBlock | null
  tagline: FlyerTextBlock | null
  panel: FlyerBox | null
  pill: FlyerBox
  pillSize: number
  qr: FlyerBox
  qrFrame: FlyerBox
  instructions: FlyerTextBlock
  website: FlyerTextBlock | null
  signOff: FlyerTextBlock | null
  contentTop: number
  contentBottom: number
}

export function flyerPanelKind(theme: AmethystAppearancePresetId): FlyerPanelKind {
  const surface = AMETHYST_APPEARANCE_PRESETS[theme].values.cardSurface
  if (surface.includes('glass') || surface === 'holographic') return 'glass'
  if (surface.includes('parchment')) return 'parchment'
  return 'paper'
}

function wrapToWidth(
  text: string,
  role: FlyerTextRole,
  size: number,
  maxWidth: number,
  measure: FlyerMeasure,
) {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (measure(candidate, role, size) <= maxWidth) {
      current = candidate
      continue
    }
    if (current) lines.push(current)
    current = word
  }
  if (current) lines.push(current)
  return lines
}

function fitBlock(
  text: string,
  role: FlyerTextRole,
  options: { maxSize: number; minSize: number; maxLines: number; maxWidth: number },
  measure: FlyerMeasure,
) {
  const cleaned = text.trim()
  if (!cleaned) return { lines: [] as string[], size: options.maxSize }
  for (let size = options.maxSize; size >= options.minSize; size -= 2) {
    const lines = wrapToWidth(cleaned, role, size, options.maxWidth, measure)
    const tooWide = lines.some((line) => measure(line, role, size) > options.maxWidth)
    if (!tooWide && lines.length > 0 && lines.length <= options.maxLines) {
      return { lines, size }
    }
  }
  let size = options.minSize
  let lines = wrapToWidth(cleaned, role, size, options.maxWidth, measure)
  while (
    lines.some((line) => measure(line, role, size) > options.maxWidth) &&
    size > 16
  ) {
    size -= 2
    lines = wrapToWidth(cleaned, role, size, options.maxWidth, measure)
  }
  return { lines, size }
}

function blockHeight(block: { lines: string[]; lineHeight: number }) {
  return block.lines.length * block.lineHeight
}

export function layoutCardQrFlyer(input: {
  showTitle: string
  tagline: string
  firstName: string
  website: string | null
  measure: FlyerMeasure
}): FlyerLayout {
  const attempts = [
    { titleMax: 104, gap: 22, tagMax: 40, instMax: 30 },
    { titleMax: 88, gap: 16, tagMax: 36, instMax: 28 },
    { titleMax: 72, gap: 12, tagMax: 34, instMax: 26 },
    { titleMax: 64, gap: 10, tagMax: 32, instMax: 24 },
  ]
  let chosen: FlyerLayout | null = null
  for (const attempt of attempts) {
    const layout = placeFlyer(input, attempt)
    chosen = layout
    if (
      layout.contentTop >= FLYER_SAFE_TOP &&
      layout.contentBottom <= FLYER_CONTENT_BOTTOM &&
      layout.qr.x >= FLYER_MARGIN_LEFT &&
      layout.qr.x + layout.qr.width <= FLYER_MARGIN_RIGHT
    ) {
      return layout
    }
  }
  return chosen as FlyerLayout
}

function placeFlyer(
  input: {
    showTitle: string
    tagline: string
    firstName: string
    website: string | null
    measure: FlyerMeasure
  },
  attempt: { titleMax: number; gap: number; tagMax: number; instMax: number },
): FlyerLayout {
  const measure = input.measure
  const maxWidth = FLYER_TEXT_MAX_WIDTH
  let y = 286

  const titleFit = fitBlock(
    input.showTitle,
    'heading',
    { maxSize: attempt.titleMax, minSize: 48, maxLines: 2, maxWidth },
    measure,
  )
  const showTitle = titleFit.lines.length
    ? {
        lines: titleFit.lines,
        size: titleFit.size,
        top: y,
        lineHeight: Math.round(titleFit.size * 1.08),
      }
    : null
  if (showTitle) y += blockHeight(showTitle)

  let tagline: FlyerTextBlock | null = null
  if (input.tagline.trim()) {
    y += showTitle ? 12 : 0
    const tagFit = fitBlock(
      input.tagline,
      'body',
      { maxSize: attempt.tagMax, minSize: 26, maxLines: 2, maxWidth },
      measure,
    )
    if (tagFit.lines.length) {
      tagline = {
        lines: tagFit.lines,
        size: tagFit.size,
        top: y,
        lineHeight: Math.round(tagFit.size * 1.28),
      }
      y += blockHeight(tagline)
    }
  }

  const textTop = showTitle?.top ?? tagline?.top ?? y
  const textBottom = y
  const panel =
    showTitle || tagline
      ? {
          x: 96,
          y: textTop - 26,
          width: CARD_QR_FLYER_WIDTH - 192,
          height: textBottom - textTop + 52,
        }
      : null
  if (panel) y = panel.y + panel.height

  y += attempt.gap
  const pillSize = 26
  const pillTextWidth = measure(FLYER_SCAN_LABEL, 'body', pillSize)
  const pillWidth = Math.min(maxWidth, Math.ceil(pillTextWidth + 64))
  const pill: FlyerBox = {
    x: Math.round((CARD_QR_FLYER_WIDTH - pillWidth) / 2),
    y,
    width: pillWidth,
    height: 58,
  }
  y += pill.height + attempt.gap

  const qr: FlyerBox = {
    x: Math.round((CARD_QR_FLYER_WIDTH - CARD_QR_FLYER_QR_SIZE) / 2),
    y: y + FLYER_QR_FRAME,
    width: CARD_QR_FLYER_QR_SIZE,
    height: CARD_QR_FLYER_QR_SIZE,
  }
  const qrFrame: FlyerBox = {
    x: qr.x - FLYER_QR_FRAME,
    y,
    width: CARD_QR_FLYER_QR_SIZE + FLYER_QR_FRAME * 2,
    height: CARD_QR_FLYER_QR_SIZE + FLYER_QR_FRAME * 2,
  }
  y += qrFrame.height + attempt.gap

  const instructionFit = fitBlock(
    FLYER_INSTRUCTION,
    'body',
    { maxSize: attempt.instMax, minSize: 20, maxLines: 3, maxWidth },
    measure,
  )
  const instructions: FlyerTextBlock = {
    lines: instructionFit.lines,
    size: instructionFit.size,
    top: y,
    lineHeight: Math.round(instructionFit.size * 1.32),
  }
  y += blockHeight(instructions)

  let website: FlyerTextBlock | null = null
  if (input.website?.trim()) {
    y += 14
    const webFit = fitBlock(
      input.website.trim(),
      'body',
      { maxSize: 32, minSize: 18, maxLines: 2, maxWidth },
      measure,
    )
    website = {
      lines: webFit.lines,
      size: webFit.size,
      top: y,
      lineHeight: Math.round(webFit.size * 1.2),
    }
    y += blockHeight(website)
  }

  let signOff: FlyerTextBlock | null = null
  const firstName = input.firstName.trim()
  if (firstName) {
    y += website ? 8 : 14
    const signFit = fitBlock(
      `Shop with ${firstName} anytime`,
      'body',
      { maxSize: 28, minSize: 18, maxLines: 2, maxWidth },
      measure,
    )
    signOff = {
      lines: signFit.lines,
      size: signFit.size,
      top: y,
      lineHeight: Math.round(signFit.size * 1.25),
    }
    y += blockHeight(signOff)
  }

  const contentTop = panel?.y ?? pill.y
  return {
    showTitle,
    tagline,
    panel,
    pill,
    pillSize,
    qr,
    qrFrame,
    instructions,
    website,
    signOff,
    contentTop,
    contentBottom: y,
  }
}
