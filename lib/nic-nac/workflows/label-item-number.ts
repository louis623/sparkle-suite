import sharp from 'sharp'

const ITEM_NUMBER = /^[A-Z]{1,4}\d{3,}$/

/** 5×7 glyphs, low 5 bits, bit 4 is the left pixel. */
const FONT: Record<string, number[]> = {
  A: [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  B: [0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110],
  C: [0b01110, 0b10001, 0b10000, 0b10000, 0b10000, 0b10001, 0b01110],
  D: [0b11110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b11110],
  E: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
  F: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000],
  G: [0b01110, 0b10001, 0b10000, 0b10111, 0b10001, 0b10001, 0b01110],
  H: [0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  I: [0b01110, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  J: [0b00111, 0b00010, 0b00010, 0b00010, 0b10010, 0b10010, 0b01100],
  K: [0b10001, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010, 0b10001],
  L: [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
  M: [0b10001, 0b11011, 0b10101, 0b10101, 0b10001, 0b10001, 0b10001],
  N: [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001],
  O: [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  P: [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000],
  Q: [0b01110, 0b10001, 0b10001, 0b10001, 0b10101, 0b10010, 0b01101],
  R: [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001],
  S: [0b01111, 0b10000, 0b10000, 0b01110, 0b00001, 0b00001, 0b11110],
  T: [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
  U: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  V: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
  W: [0b10001, 0b10001, 0b10001, 0b10101, 0b10101, 0b10101, 0b01010],
  X: [0b10001, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001, 0b10001],
  Y: [0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100],
  Z: [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b11111],
  '0': [0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110],
  '1': [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  '2': [0b01110, 0b10001, 0b00001, 0b00010, 0b00100, 0b01000, 0b11111],
  '3': [0b11110, 0b00001, 0b00001, 0b01110, 0b00001, 0b00001, 0b11110],
  '4': [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010],
  '5': [0b11111, 0b10000, 0b10000, 0b11110, 0b00001, 0b00001, 0b11110],
  '6': [0b01110, 0b10000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110],
  '7': [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000],
  '8': [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
  '9': [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00001, 0b01110],
}

const GLYPH_WIDTH = 5
const GLYPH_HEIGHT = 7
const GLYPH_GAP = 1

/**
 * NN-H7 is a no-op on real chat photos until real OCR exists.
 * This reader only matches its own 5×7 pixel template. It does not call a
 * vision model or any paid OCR service. Bytes above this cap are returned
 * unread and are not decoded.
 */
export const LABEL_TEMPLATE_MAX_BYTES = 16_000

function normalizeItemNumber(itemNumber: string): string {
  return itemNumber.trim().toUpperCase()
}

export type LabelItemNumberDecision =
  | { blocked: false }
  | { blocked: true; labelItemNumber: string; message: string }

export function decideLabelItemNumber(args: {
  itemNumber: string
  readItemNumbers: string[]
}): LabelItemNumberDecision {
  const current = normalizeItemNumber(args.itemNumber)
  if (!current) return { blocked: false }
  const labelItemNumber = args.readItemNumbers
    .map((value) => normalizeItemNumber(value))
    .find((value) => ITEM_NUMBER.test(value) && value !== current)
  if (!labelItemNumber) return { blocked: false }
  return {
    blocked: true,
    labelItemNumber,
    message: `The label says ${labelItemNumber}. I won't save it on ${current}. Send the label for ${current}.`,
  }
}

export async function renderItemNumberPng(itemNumber: string): Promise<Buffer> {
  const text = normalizeItemNumber(itemNumber)
  const pad = 2
  const width =
    pad * 2 + text.length * GLYPH_WIDTH + Math.max(0, text.length - 1) * GLYPH_GAP
  const height = pad * 2 + GLYPH_HEIGHT
  const raw = Buffer.alloc(width * height, 255)
  for (let index = 0; index < text.length; index += 1) {
    const rows = FONT[text[index] ?? '']
    if (!rows) continue
    const originX = pad + index * (GLYPH_WIDTH + GLYPH_GAP)
    for (let dy = 0; dy < GLYPH_HEIGHT; dy += 1) {
      const bits = rows[dy] ?? 0
      for (let dx = 0; dx < GLYPH_WIDTH; dx += 1) {
        if (((bits >> (GLYPH_WIDTH - 1 - dx)) & 1) !== 1) continue
        raw[(pad + dy) * width + originX + dx] = 0
      }
    }
  }
  return sharp(raw, { raw: { width, height, channels: 1 } }).png().toBuffer()
}

function isDark(value: number): boolean {
  return value < 128
}

function glyphAt(
  pixels: Uint8Array,
  width: number,
  x: number,
  y: number,
  rows: number[],
): boolean {
  if (x < 0 || y < 0) return false
  for (let dy = 0; dy < GLYPH_HEIGHT; dy += 1) {
    const bits = rows[dy] ?? 0
    for (let dx = 0; dx < GLYPH_WIDTH; dx += 1) {
      const pixel = pixels[(y + dy) * width + (x + dx)]
      if (pixel === undefined) return false
      const on = ((bits >> (GLYPH_WIDTH - 1 - dx)) & 1) === 1
      if (isDark(pixel) !== on) return false
    }
  }
  return true
}

function readRun(pixels: Uint8Array, width: number, height: number, x: number, y: number): string {
  if (y + GLYPH_HEIGHT > height) return ''
  let cursor = x
  let text = ''
  while (cursor + GLYPH_WIDTH <= width && text.length < 12) {
    const glyph = Object.entries(FONT).find(([, rows]) =>
      glyphAt(pixels, width, cursor, y, rows),
    )?.[0]
    if (!glyph) break
    text += glyph
    cursor += GLYPH_WIDTH + GLYPH_GAP
  }
  return text
}

/**
 * Template match only. Real chat photos are a no-op here: nothing is decoded
 * and no item number is read, so H7 does not block them.
 */
export async function readItemNumbersFromImageBytes(
  bytes: Buffer,
): Promise<string[]> {
  if (bytes.length === 0 || bytes.length > LABEL_TEMPLATE_MAX_BYTES) return []
  try {
    const { data, info } = await sharp(bytes)
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true })
    if (info.width * info.height > 250_000) return []
    const pixels = new Uint8Array(data)
    const found: string[] = []
    for (let y = 0; y <= info.height - GLYPH_HEIGHT; y += 1) {
      for (let x = 0; x <= info.width - GLYPH_WIDTH; x += 1) {
        const text = readRun(pixels, info.width, info.height, x, y)
        if (ITEM_NUMBER.test(text)) found.push(text)
      }
    }
    return found.filter(
      (text, index) =>
        found.indexOf(text) === index &&
        !found.some((other) => other.length > text.length && other.endsWith(text)),
    )
  } catch {
    return []
  }
}

/**
 * Same no-op as readItemNumbersFromImageBytes. A real-sized data URL is
 * rejected from its length before the bytes are allocated. Remote URLs are
 * not fetched.
 */
export async function readItemNumbersFromImageUrl(
  url: string | undefined,
): Promise<string[]> {
  if (!url) return []
  const match = /^data:[^;]+;base64,(.+)$/i.exec(url.trim())
  if (!match?.[1]) return []
  const payload = match[1].replace(/\s/g, '')
  const estimatedBytes = Math.floor((payload.length * 3) / 4)
  if (estimatedBytes === 0 || estimatedBytes > LABEL_TEMPLATE_MAX_BYTES) return []
  try {
    const bytes = Buffer.from(payload, 'base64')
    return await readItemNumbersFromImageBytes(bytes)
  } catch {
    return []
  }
}
