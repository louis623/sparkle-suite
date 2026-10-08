/// <reference path="./opentype-js.d.ts" />
import { readFileSync } from 'node:fs'
import { parse as parseFont } from 'opentype.js'

interface LoadedFont {
  charToGlyph(char: string): { index: number }
}

const fontCache = new Map<string, LoadedFont>()

function loadFont(file: string) {
  const cached = fontCache.get(file)
  if (cached) return cached
  const bytes = readFileSync(file)
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  )
  const font = parseFont(buffer)
  fontCache.set(file, font)
  return font
}

function fontCovers(font: LoadedFont, char: string) {
  if (char === '\n' || char === '\r' || char === '\t') return true
  return font.charToGlyph(char).index > 0
}

/** Keep characters the chosen font or Noto Sans can draw. Drop the rest. */
export function retainCoveredGlyphs(
  text: string,
  primaryFile: string,
  fallbackFile: string,
) {
  const primary = loadFont(primaryFile)
  const fallback = primaryFile === fallbackFile ? primary : loadFont(fallbackFile)
  let covered = ''
  for (const char of text) {
    if (fontCovers(primary, char) || fontCovers(fallback, char)) {
      covered += char
    }
  }
  return covered
}
