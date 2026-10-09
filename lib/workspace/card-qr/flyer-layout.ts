import {
  AMETHYST_APPEARANCE_PRESETS,
  type AmethystAppearancePresetId,
} from '@/lib/amethyst/appearance-presets'

export const CARD_QR_FLYER_WIDTH = 1080
export const CARD_QR_FLYER_HEIGHT = 1920
/** Preferred QR pad. The layout stays between 560 and 600 so the art and title keep the page. */
export const CARD_QR_FLYER_QR_SIZE = 580
export const FLYER_SAFE_TOP = 250
export const FLYER_SAFE_BOTTOM = 385
export const FLYER_CONTENT_BOTTOM = CARD_QR_FLYER_HEIGHT - FLYER_SAFE_BOTTOM
export const FLYER_MARGIN_LEFT = 72
export const FLYER_MARGIN_RIGHT = 1008
export const FLYER_TEXT_MAX_WIDTH = 860
export const FLYER_QR_FRAME = 22
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
  lowerPanel: FlyerBox
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
  while (lines.some((line) => measure(line, role, size) > options.maxWidth) && size > 16) {
    size -= 2
    lines = wrapToWidth(cleaned, role, size, options.maxWidth, measure)
  }
  return { lines, size }
}

function blockHeight(block: { lines: string[]; lineHeight: number }) {
  return block.lines.length * block.lineHeight
}

function shiftBlock(block: FlyerTextBlock | null, dy: number) {
  if (!block) return null
  return { ...block, top: block.top + dy }
}

function shiftBox(box: FlyerBox | null, dy: number) {
  if (!box) return null
  return { ...box, y: box.y + dy }
}

export function layoutCardQrFlyer(input: {
  showTitle: string
  tagline: string
  firstName: string
  website: string | null
  measure: FlyerMeasure
}): FlyerLayout {
  const room = FLYER_CONTENT_BOTTOM - FLYER_SAFE_TOP - 16
  const attempts: Array<{ titleMax: number; qr: number; gap: number }> = []
  for (const titleMax of [156, 144, 132, 122, 112]) {
    for (const qr of [600, 580, 560]) {
      for (const gap of [26, 16]) {
        attempts.push({ titleMax, qr, gap })
      }
    }
  }
  for (const titleMax of [100, 88, 76]) {
    attempts.push({ titleMax, qr: 560, gap: 12 })
  }

  let chosen: FlyerLayout | null = null
  for (const attempt of attempts) {
    const layout = placeFlyer(input, attempt)
    chosen = layout
    const height = layout.contentBottom - layout.contentTop
    const qrRight = layout.qr.x + layout.qr.width
    if (
      height <= room &&
      layout.qr.x >= FLYER_MARGIN_LEFT &&
      qrRight <= FLYER_MARGIN_RIGHT &&
      layout.qrFrame.x >= FLYER_MARGIN_LEFT &&
      layout.qrFrame.x + layout.qrFrame.width <= FLYER_MARGIN_RIGHT
    ) {
      break
    }
  }
  const layout = chosen as FlyerLayout
  const height = layout.contentBottom - layout.contentTop
  const offset = FLYER_SAFE_TOP + 8 + Math.max(0, Math.round((room - height) / 2))
  return shiftLayout(layout, offset - layout.contentTop)
}

function shiftLayout(layout: FlyerLayout, dy: number): FlyerLayout {
  return {
    showTitle: shiftBlock(layout.showTitle, dy),
    tagline: shiftBlock(layout.tagline, dy),
    panel: shiftBox(layout.panel, dy),
    pill: shiftBox(layout.pill, dy) as FlyerBox,
    pillSize: layout.pillSize,
    qr: shiftBox(layout.qr, dy) as FlyerBox,
    qrFrame: shiftBox(layout.qrFrame, dy) as FlyerBox,
    lowerPanel: shiftBox(layout.lowerPanel, dy) as FlyerBox,
    instructions: shiftBlock(layout.instructions, dy) as FlyerTextBlock,
    website: shiftBlock(layout.website, dy),
    signOff: shiftBlock(layout.signOff, dy),
    contentTop: layout.contentTop + dy,
    contentBottom: layout.contentBottom + dy,
  }
}

function placeFlyer(
  input: {
    showTitle: string
    tagline: string
    firstName: string
    website: string | null
    measure: FlyerMeasure
  },
  attempt: { titleMax: number; gap: number; qr: number },
): FlyerLayout {
  const measure = input.measure
  const maxWidth = FLYER_TEXT_MAX_WIDTH
  const panelX = 84
  const panelWidth = CARD_QR_FLYER_WIDTH - panelX * 2
  let y = 0

  const titleFit = fitBlock(
    input.showTitle,
    'heading',
    { maxSize: attempt.titleMax, minSize: 64, maxLines: 2, maxWidth },
    measure,
  )
  const showTitle = titleFit.lines.length
    ? {
        lines: titleFit.lines,
        size: titleFit.size,
        top: y + 32,
        lineHeight: Math.round(titleFit.size * 1.02),
      }
    : null
  if (showTitle) y = showTitle.top + blockHeight(showTitle)

  let tagline: FlyerTextBlock | null = null
  if (input.tagline.trim()) {
    y += showTitle ? 10 : 32
    const tagFit = fitBlock(
      input.tagline,
      'body',
      { maxSize: 38, minSize: 28, maxLines: 2, maxWidth },
      measure,
    )
    if (tagFit.lines.length) {
      tagline = {
        lines: tagFit.lines,
        size: tagFit.size,
        top: y,
        lineHeight: Math.round(tagFit.size * 1.22),
      }
      y += blockHeight(tagline)
    }
  }

  const textTop = showTitle?.top ?? tagline?.top ?? y
  const panel =
    showTitle || tagline
      ? {
          x: panelX,
          y: textTop - 28,
          width: panelWidth,
          height: y - textTop + 56,
        }
      : null
  if (panel) y = panel.y + panel.height

  y += attempt.gap
  const pillSize = 36
  const pillTextWidth = measure(FLYER_SCAN_LABEL, 'body', pillSize)
  const pillWidth = Math.min(maxWidth, Math.ceil(pillTextWidth * 1.16 + 132))
  const pill: FlyerBox = {
    x: Math.round((CARD_QR_FLYER_WIDTH - pillWidth) / 2),
    y,
    width: pillWidth,
    height: 78,
  }
  y += pill.height + attempt.gap

  const qrFrame: FlyerBox = {
    x: Math.round((CARD_QR_FLYER_WIDTH - (attempt.qr + FLYER_QR_FRAME * 2)) / 2),
    y,
    width: attempt.qr + FLYER_QR_FRAME * 2,
    height: attempt.qr + FLYER_QR_FRAME * 2,
  }
  const qr: FlyerBox = {
    x: qrFrame.x + FLYER_QR_FRAME,
    y: qrFrame.y + FLYER_QR_FRAME,
    width: attempt.qr,
    height: attempt.qr,
  }
  y += qrFrame.height + attempt.gap

  const lowerTop = y
  y += 28
  const instructionFit = fitBlock(
    FLYER_INSTRUCTION,
    'body',
    { maxSize: 36, minSize: 34, maxLines: 3, maxWidth },
    measure,
  )
  const instructions: FlyerTextBlock = {
    lines: instructionFit.lines,
    size: instructionFit.size,
    top: y,
    lineHeight: Math.round(instructionFit.size * 1.28),
  }
  y += blockHeight(instructions)

  let website: FlyerTextBlock | null = null
  if (input.website?.trim()) {
    y += 16
    const webFit = fitBlock(
      input.website.trim(),
      'body',
      { maxSize: 42, minSize: 30, maxLines: 2, maxWidth },
      measure,
    )
    website = {
      lines: webFit.lines,
      size: webFit.size,
      top: y,
      lineHeight: Math.round(webFit.size * 1.16),
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
      { maxSize: 30, minSize: 24, maxLines: 2, maxWidth },
      measure,
    )
    signOff = {
      lines: signFit.lines,
      size: signFit.size,
      top: y,
      lineHeight: Math.round(signFit.size * 1.22),
    }
    y += blockHeight(signOff)
  }

  y += 26
  const lowerPanel: FlyerBox = {
    x: panelX,
    y: lowerTop,
    width: panelWidth,
    height: y - lowerTop,
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
    lowerPanel,
    instructions,
    website,
    signOff,
    contentTop,
    contentBottom: lowerPanel.y + lowerPanel.height,
  }
}
