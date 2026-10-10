/// <reference path="./opentype-js.d.ts" />
import { readFileSync } from 'node:fs'
import { parse as parseFont } from 'opentype.js'

interface LoadedFont {
  unitsPerEm: number
  charToGlyph(char: string): { index: number; advanceWidth: number }
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

function glyphWidth(font: LoadedFont, char: string, fontSize: number) {
  const glyph = font.charToGlyph(char)
  const units = font.unitsPerEm || 1000
  const advance = glyph.advanceWidth > 0 ? glyph.advanceWidth : units * 0.5
  // Slightly wider than the raw advance so wrapping stays inside the side margins
  // when the drawer's kerning does not match this sum.
  return (advance * fontSize) / units * 1.06
}

/** Width of text the flyer will actually draw, in CSS pixels at fontSize. */
export function measureTextWidth(
  text: string,
  primaryFile: string,
  fallbackFile: string,
  fontSize: number,
) {
  const primary = loadFont(primaryFile)
  const fallback = primaryFile === fallbackFile ? primary : loadFont(fallbackFile)
  const covered = retainCoveredGlyphs(text, primaryFile, fallbackFile)
  let width = 0
  for (const char of covered) {
    const font = fontCovers(primary, char) ? primary : fallback
    width += glyphWidth(font, char, fontSize)
  }
  return width
}
