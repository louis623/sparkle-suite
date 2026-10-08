declare module 'opentype.js' {
  interface Glyph {
    index: number
  }

  interface Font {
    charToGlyph(char: string): Glyph
  }

  export function parse(buffer: ArrayBuffer | Buffer): Font
}
