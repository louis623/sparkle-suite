declare module 'opentype.js' {
  interface Glyph {
    index: number
    advanceWidth: number
  }

  interface Font {
    unitsPerEm: number
    charToGlyph(char: string): Glyph
    getAdvanceWidth(text: string, fontSize: number): number
  }

  export function parse(buffer: ArrayBuffer | Buffer): Font
}
