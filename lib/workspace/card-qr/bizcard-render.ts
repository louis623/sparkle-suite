// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./opentype-js.d.ts" />
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { deflateSync } from 'node:zlib'
import { Resvg } from '@resvg/resvg-js'
import { parse as parseFont } from 'opentype.js'
import sharp from 'sharp'
import type { CardQrIcon } from '@/lib/workspace/card-qr/design'
import { qrModuleColor } from '@/lib/workspace/card-qr/flyer-contrast'
import { BIZCARD_FONT_FILES } from '@/lib/workspace/card-qr/bizcard-font-map'
import { BIZCARD_THEMES, type BizcardKey, type BizcardTheme } from '@/lib/workspace/card-qr/bizcard-themes'
import { resolveCardQrPalette } from '@/lib/workspace/card-qr/palette'
import { CARD_QR_DARK, cardQrSvg } from '@/lib/workspace/card-qr/render'

/** 3.5 x 2 in + 0.125 in bleed each side at 300 dpi. */
export const BIZCARD_W = 1125
export const BIZCARD_H = 675
export const BIZCARD_DPI = 300
export const BIZCARD_BLEED = 37.5
const SAFE = BIZCARD_BLEED + 45 // 0.15 in inside trim
const SX0 = Math.floor(SAFE) + 1
const SY0 = Math.floor(SAFE) + 1
const SX1 = BIZCARD_W - Math.floor(SAFE) - 1
const SY1 = BIZCARD_H - Math.floor(SAFE) - 1
/** 8 pt at 300 dpi. */
const MINPX = 34
const W = BIZCARD_W
const H = BIZCARD_H
export const BIZCARD_SAFE_BOX = { x0: SX0, y0: SY0, x1: SX1, y1: SY1 }
export const BIZCARD_ROLE = 'Independent Bomb Party Representative'
export const BIZCARD_SCAN_LINES = ['SCAN HERE', 'TO ORDER'] as const

const ROOT = path.join(process.cwd(), 'lib', 'workspace', 'card-qr')
const FONT_DIR = path.join(ROOT, 'fonts', 'card')
const PLATE_DIR = path.join(ROOT, 'card-plates')

// ---------- fonts ----------
interface OtCommand { type: string; x?: number; y?: number; x1?: number; y1?: number; x2?: number; y2?: number }
interface OtPath {
  commands: OtCommand[]
  getBoundingBox(): { x1: number; y1: number; x2: number; y2: number }
}
interface OtGlyph {
  index: number
  advanceWidth?: number
  getPath(x: number, y: number, size: number): OtPath
}
interface OtFont {
  unitsPerEm: number
  charToGlyph(char: string): OtGlyph
  getKerningValue(left: OtGlyph, right: OtGlyph): number
}
const n2 = (v: number | undefined) => (Number.isFinite(v) ? (v as number).toFixed(2) : '0')
/** Own serializer: opentype.js toPathData can emit NaN when it optimizes. */
function pathData(commands: OtCommand[]) {
  let d = ''
  for (const c of commands) {
    if (c.type === 'M' || c.type === 'L') d += `${c.type}${n2(c.x)} ${n2(c.y)}`
    else if (c.type === 'Q') d += `Q${n2(c.x1)} ${n2(c.y1)} ${n2(c.x)} ${n2(c.y)}`
    else if (c.type === 'C') d += `C${n2(c.x1)} ${n2(c.y1)} ${n2(c.x2)} ${n2(c.y2)} ${n2(c.x)} ${n2(c.y)}`
    else if (c.type === 'Z') d += 'Z'
  }
  return d
}
/** Simple left-to-right layout with pair kerning (no GSUB, which opentype.js can't run on every font). */
function layoutPath(f: OtFont, text: string, x: number, y: number, size: number) {
  const scale = size / f.unitsPerEm
  let pen = x
  let d = ''
  const box = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity }
  let prev: OtGlyph | null = null
  for (const ch of text) {
    const g = f.charToGlyph(ch)
    if (prev) {
      try {
        const kern = Number(f.getKerningValue(prev, g))
        if (Number.isFinite(kern)) pen += kern * scale
      } catch { /* no kerning data */ }
    }
    const p = g.getPath(pen, y, size)
    const pd = pathData(p.commands)
    if (pd) {
      d += pd
      const b = p.getBoundingBox()
      if (Number.isFinite(b.x1)) {
        box.x1 = Math.min(box.x1, b.x1); box.y1 = Math.min(box.y1, b.y1)
        box.x2 = Math.max(box.x2, b.x2); box.y2 = Math.max(box.y2, b.y2)
      }
    }
    const adv = Number(g.advanceWidth)
    pen += (Number.isFinite(adv) ? adv : 0) * scale
    prev = g
  }
  return { d, box }
}
const fonts = new Map<string, OtFont>()
function font(file: string): OtFont {
  let f = fonts.get(file)
  if (!f) {
    const bytes = readFileSync(path.join(FONT_DIR, file))
    f = parseFont(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)) as unknown as OtFont
    fonts.set(file, f)
  }
  return f
}
interface Face { file: string; size: number }
type Role = 'head' | 'script' | 'body' | 'body600' | 'body700' | 'ownTitle' | 'ownWith'
function face(key: BizcardKey, role: Role, size: number): Face {
  const files = BIZCARD_FONT_FILES[key] as Record<string, string>
  return { file: files[role], size: Math.floor(size) }
}
interface Ink { x1: number; y1: number; x2: number; y2: number }
const inkCache = new Map<string, Ink>()
/** Ink box relative to the pen origin on the baseline (y down). */
function ink(f: Face, text: string): Ink {
  const k = `${f.file}|${f.size}|${text}`
  let b = inkCache.get(k)
  if (!b) {
    const bb = layoutPath(font(f.file), text, 0, 0, f.size).box
    b = Number.isFinite(bb.x1)
      ? { x1: Math.floor(bb.x1), y1: Math.floor(bb.y1), x2: Math.ceil(bb.x2), y2: Math.ceil(bb.y2) }
      : { x1: 0, y1: 0, x2: 0, y2: 0 }
    inkCache.set(k, b)
  }
  return b
}
export function bizcardTextWidth(f: Face, text: string) {
  const b = ink(f, text)
  return b.x2 - b.x1
}
const tw = bizcardTextWidth
function inkHeight(f: Face, text: string) {
  const b = ink(f, text)
  return b.y2 - b.y1
}
function capHeight(f: Face) {
  return -ink(f, 'H').y1
}
/** Path with ink-left at x and the cap top (of 'H') at y. */
function capPath(f: Face, text: string, x: number, y: number) {
  const b = ink(f, text)
  return layoutPath(font(f.file), text, x - b.x1, y + capHeight(f), f.size).d
}
/** Path with its own ink box top-left at x,y. */
function inkPath(f: Face, text: string, x: number, y: number) {
  const b = ink(f, text)
  return layoutPath(font(f.file), text, x - b.x1, y - b.y1, f.size).d
}

// ---------- text fitting (same rules as the approved mock) ----------
function combos(n: number, k: number): number[][] {
  const out: number[][] = []
  const rec = (start: number, acc: number[]) => {
    if (acc.length === k) return void out.push([...acc])
    for (let i = start; i < n; i += 1) rec(i + 1, [...acc, i])
  }
  rec(1, [])
  return out
}
/** Fewest lines that fit, then the most balanced split. */
export function balancedLines(text: string, f: Face, maxWidth: number, maxLines: number) {
  const words = text.split(/\s+/).filter(Boolean)
  for (let n = 1; n <= maxLines && n <= words.length; n += 1) {
    let best: { m: number; lines: string[] } | null = null
    for (const cut of combos(words.length, n - 1)) {
      const idx = [0, ...cut, words.length]
      const lines = Array.from({ length: n }, (_, i) => words.slice(idx[i], idx[i + 1]).join(' '))
      const m = Math.max(...lines.map((l) => tw(f, l)))
      if (m <= maxWidth && (!best || m < best.m)) best = { m, lines }
    }
    if (best) return best.lines
  }
  return null
}
function wrap(text: string, f: Face, width: number) {
  const lines = ['']
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const trial = `${lines[lines.length - 1]} ${word}`.trim()
    if (tw(f, trial) <= width || !lines[lines.length - 1]) lines[lines.length - 1] = trial
    else lines.push(word)
  }
  return lines
}

// ---------- svg helpers ----------
const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
function svgDoc(body: string, defs = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defs}</defs>${body}</svg>`
}
function blurFilter(id: string, sd: number) {
  return `<filter id="${id}" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="${sd}"/></filter>`
}
function renderSvg(svg: string) {
  return Buffer.from(new Resvg(svg, { font: { loadSystemFonts: false }, shapeRendering: 2 }).render().asPng())
}
function hexRgb(hex: string) {
  const h = hex.replace('#', '')
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) }
}

// ---------- front ----------
export interface BizcardFrontInput {
  key: BizcardKey
  showTitle: string
  firstName: string
}
export interface BizcardBox { x: number; y: number; x2: number; y2: number }

function frontPlate(key: BizcardKey) {
  return readFileSync(path.join(PLATE_DIR, `${key}.jpg`))
}

function layoutSharedFront(c: BizcardTheme, show: string, first: string) {
  const script = first ? `with ${first}` : ''
  let maxw: number
  let maxh: number
  let maxl: number
  if (c.maxw) { maxw = c.maxw; maxh = c.cmaxh ?? 215; maxl = 2 }
  else if (c.align === 'left') { maxw = Math.floor((SX1 - SX0) * (c.tw ?? 0.45)); maxh = SY1 - SY0 - 40; maxl = 3 }
  else if (c.align === 'top') { maxw = SX1 - SX0 - 40; maxh = Math.floor(H * 0.52); maxl = 2 }
  else { maxw = SX1 - SX0 - 140; maxh = c.cmaxh ?? 215; maxl = 2 }
  type Fit = { ts: number; tf: Face; tl: string[]; sf: Face; lh: number; gap: number; th: number; block: number }
  let found: Fit | null = null
  let last: Fit | null = null
  for (let ts = c.hmax ?? 112; ts > 44; ts -= 2) {
    const tf = face(c.key, 'head', ts)
    const tl = balancedLines(show, tf, maxw, maxl)
    if (!tl) continue
    const sf = face(c.key, 'script', Math.max(Math.floor(ts * 0.82), 60))
    const lh = Math.floor(ts * 1.1)
    const sh = script ? inkHeight(sf, script) : 0
    const gap = script ? Math.floor(ts * 0.16) : 0
    const th = lh * (tl.length - 1) + Math.floor(ts * 0.78)
    const block = th + gap + sh
    last = { ts, tf, tl, sf, lh, gap, th, block }
    if (block <= maxh && (!script || tw(sf, script) <= maxw)) { found = last; break }
  }
  if (!found) {
    // Title too long for the approved range: smallest size, greedy wrap.
    const ts = 46
    const tf = face(c.key, 'head', ts)
    const tl = (last as Fit | null)?.tl ?? wrap(show, tf, maxw)
    const sf = face(c.key, 'script', 60)
    const lh = Math.floor(ts * 1.1)
    const gap = script ? Math.floor(ts * 0.16) : 0
    const th = lh * (tl.length - 1) + Math.floor(ts * 0.78)
    found = { ts, tf, tl, sf, lh, gap, th, block: th + gap + (script ? inkHeight(sf, script) : 0) }
  }
  const { block } = found
  let y0: number
  if (c.ytop) y0 = c.ytop + Math.max(0, Math.floor(((c.cmaxh ?? 215) - block) / 2))
  else if (c.align === 'top') y0 = SY0 + 20
  else if (c.align === 'center') y0 = Math.floor((H - block) / 2) - 6
  else y0 = Math.floor((H - block) / 2)
  return { ...found, script, y0 }
}

async function sharedFront(c: BizcardTheme, show: string, first: string) {
  const L = layoutSharedFront(c, show, first)
  const layers: sharp.OverlayOptions[] = []
  const plate = frontPlate(c.key)
  if (c.panel) {
    const [op, bl] = c.frost ?? [0.84, 18]
    const box = { x: SX0 + 10, y: L.y0 - 44, x2: SX1 - 10, y2: L.y0 + L.block + 48 }
    const bw = box.x2 - box.x
    const bh = box.y2 - box.y
    const shadow = svgDoc(
      `<rect x="${box.x}" y="${box.y + 6}" width="${bw}" height="${bh}" rx="24" fill="rgb(60,30,10)" fill-opacity="${(90 / 255).toFixed(3)}" filter="url(#ps)"/>`,
      blurFilter('ps', 14),
    )
    layers.push({ input: renderSvg(shadow), left: 0, top: 0 })
    const { r, g, b } = hexRgb(c.panel)
    const frosted = await sharp(plate)
      .extract({ left: box.x, top: box.y, width: bw, height: bh })
      .blur(bl)
      .composite([{ input: { create: { width: bw, height: bh, channels: 4, background: { r, g, b, alpha: op } } } }])
      .png()
      .toBuffer()
    const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${bw}" height="${bh}"><rect width="${bw}" height="${bh}" rx="24" fill="#fff"/></svg>`)
    const rounded = await sharp(frosted).ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer()
    layers.push({ input: rounded, left: box.x, top: box.y })
  }
  const boxes: BizcardBox[] = []
  const xFor = (w: number) => (c.align === 'left' ? SX0 + 14 + (c.panel ? 6 : 0) : Math.floor((W - w) / 2))
  let shadows = ''
  let text = ''
  L.tl.forEach((line, i) => {
    const w = tw(L.tf, line)
    const x = xFor(w)
    const capy = L.y0 + i * L.lh
    const d = capPath(L.tf, line, x, capy)
    if (c.shadow) shadows += `<path d="${d}" fill="#000" fill-opacity="0.667" filter="url(#ts)"/>`
    text += `<path d="${d}" fill="${c.title}"/>`
    boxes.push({ x, y: capy, x2: x + w, y2: capy + Math.floor(L.ts * 0.78) })
  })
  if (L.script) {
    const w = tw(L.sf, L.script)
    const x = xFor(w)
    const y = L.y0 + L.th + L.gap
    const d = inkPath(L.sf, L.script, x, y)
    if (c.shadow) shadows += `<path d="${d}" fill="#000" fill-opacity="0.667" filter="url(#ts)"/>`
    text += `<path d="${d}" fill="${c.script}"/>`
    boxes.push({ x, y, x2: x + w, y2: y + inkHeight(L.sf, L.script) })
  }
  layers.push({ input: renderSvg(svgDoc(shadows + text, blurFilter('ts', 7))), left: 0, top: 0 })
  const png = await sharp(plate).composite(layers).removeAlpha().png().toBuffer()
  return { png, boxes }
}

const OWN = {
  lindsey: {
    stops: ['#f472d0', '#bd7cff', '#60a5fa'], offsets: [0, 0.52, 1],
    withText: (first: string) => `WITH ${first.toUpperCase()}`, withSize: 46, withColor: '#ffffff', glow: null as string | null,
    lhk: 1.25, start: 118,
  },
  brittany: {
    stops: ['#d4af37', '#eedfaf', '#00d9ff'], offsets: [0, 0.5, 1],
    withText: (first: string) => `with ${first}`, withSize: 64, withColor: '#00d9ff', glow: '#00d9ff' as string | null,
    lhk: 1.08, start: 124,
  },
}

async function ownFront(c: BizcardTheme, show: string, first: string) {
  const o = OWN[c.own as 'lindsey' | 'brittany']
  const maxw = SX1 - SX0 - 80
  let ts = o.start
  let tl: string[] | null = null
  for (ts = o.start; ts > 86; ts -= 2) {
    tl = balancedLines(show, face(c.key, 'ownTitle', ts), maxw, 1)
    if (tl) break
  }
  if (!tl) {
    for (ts = o.start; ts > 50; ts -= 2) {
      tl = balancedLines(show, face(c.key, 'ownTitle', ts), maxw, 2)
      if (tl && tl.length * ts * o.lhk <= 300) break
    }
    if (!tl) { ts = 52; tl = wrap(show, face(c.key, 'ownTitle', ts), maxw) }
  }
  const f = face(c.key, 'ownTitle', ts)
  const wf = face(c.key, 'ownWith', o.withSize)
  const wtxt = first ? o.withText(first) : ''
  const lh = Math.floor(ts * o.lhk)
  const capH = inkHeight(f, 'H')
  const wcap = inkHeight(wf, 'H')
  const gap = Math.floor(ts * 0.36)
  const block = lh * (tl.length - 1) + capH + (wtxt ? gap + wcap : 0)
  let y = Math.floor((H - block) / 2)
  let defs = blurFilter('sh', 8) + blurFilter('gl', 14)
  let body = ''
  const boxes: BizcardBox[] = []
  tl.forEach((line, i) => {
    const w = tw(f, line)
    const x = Math.floor((W - w) / 2)
    const d = capPath(f, line, x, y)
    defs += `<linearGradient id="g${i}" gradientUnits="userSpaceOnUse" x1="${x}" y1="0" x2="${x + w}" y2="0">${o.stops
      .map((s, k) => `<stop offset="${o.offsets[k]}" stop-color="${s}"/>`)
      .join('')}</linearGradient>`
    body += `<path d="${d}" fill="#000" fill-opacity="0.667" filter="url(#sh)"/><path d="${d}" fill="url(#g${i})"/>`
    boxes.push({ x, y, x2: x + w, y2: y + capH })
    y += lh
  })
  if (wtxt) {
    y += capH - lh + gap
    const w = tw(wf, wtxt)
    const x = Math.floor((W - w) / 2)
    const d = capPath(wf, wtxt, x, y)
    if (o.glow) body += `<path d="${d}" fill="${o.glow}" fill-opacity="0.55" filter="url(#gl)"/>`
    body += `<path d="${d}" fill="#000" fill-opacity="0.667" filter="url(#sh)"/><path d="${d}" fill="${o.withColor}"/>`
    boxes.push({ x, y, x2: x + w, y2: y + wcap })
  }
  const png = await sharp(frontPlate(c.key))
    .composite([{ input: renderSvg(svgDoc(body, defs)), left: 0, top: 0 }])
    .removeAlpha()
    .png()
    .toBuffer()
  return { png, boxes }
}

export async function renderBizcardFront(input: BizcardFrontInput) {
  const c = BIZCARD_THEMES[input.key]
  const show = input.showTitle.trim() || input.firstName.trim() || 'My Bomb Party Shop'
  const first = input.firstName.trim()
  return c.own ? ownFront(c, show, first) : sharedFront(c, show, first)
}

// ---------- back ----------
export interface BizcardBackFields {
  name: boolean
  email: boolean
  website: boolean
  textLink: boolean
  social: boolean
  discount: boolean
}
export interface BizcardBackInput {
  key: BizcardKey
  qrUrl: string
  qrIcon: CardQrIcon
  fields: BizcardBackFields
  name: string
  email: string
  website: string
  textLinkNumber: string
  social: string
  /** Platform of the handle; its brand mark replaces the generic @ icon. */
  socialPlatform?: string
}

const ICONS: Record<string, string> = {
  mail: '<path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"/><rect x="2" y="4" width="20" height="16" rx="2"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  msg: '<path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"/>',
  tag: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
  at: '<circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/>',
}
/**
 * Monochrome brand marks from Simple Icons (CC0-1.0), filled, inset a little so their
 * visual weight matches the stroked contact icons. See lib/workspace/card-qr/glyphs/LICENSE-simple-icons.md.
 */
export const BRAND_ICONS: Record<string, string> = {
  tiktok: "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
  instagram: "M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077",
  facebook: "M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z",
  youtube: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
}
export function socialIconName(platform: string | undefined) {
  return platform && platform in BRAND_ICONS ? platform : 'at'
}
function icon(name: string, color: string, x: number, y: number, size: number) {
  if (name in BRAND_ICONS) {
    return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="-0.6 -0.6 25.2 25.2"><path d="${BRAND_ICONS[name]}" fill="${color}"/></svg>`
  }
  return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" color="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name].replace('currentColor', color)}</svg>`
}

export type BizcardFieldId = 'name' | 'role' | 'email' | 'website' | 'text' | 'social' | 'discount'

/** One contact or info block. x is the shared left edge; y increases down the card. */
export interface BizcardFieldBox {
  id: BizcardFieldId
  x: number
  y: number
  x2: number
  y2: number
}

/** QR tile placement on the back, for decode checks, plus each info block. */
export interface BizcardBackLayout {
  tile: { x: number; y: number; size: number }
  fields: BizcardFieldBox[]
}

export function bizcardQrDark(key: BizcardKey) {
  const palette = resolveCardQrPalette({ templateId: 'match-site', appearancePreset: BIZCARD_THEMES[key].qrTheme })
  return qrModuleColor(palette.qrDark, CARD_QR_DARK)
}

/** Rep-facing notes when details had to be wrapped, dropped, or left off to stay at 8 pt. */
export type BizcardWarning = string

/**
 * Never below 34 px (8.2 pt, Minuteman's 8 pt floor). Each info field is its own
 * row. Long email, website, and social values wrap to two lines; if the stack still
 * overflows, the social block is dropped; anything that cannot fit at 8 pt is left
 * off with a warning.
 */
export async function renderBizcardBack(input: BizcardBackInput) {
  const first = await renderBackAttempt(input, false)
  if (!first.overflow || !(input.fields.social && input.social)) return finishBack(first)
  const second = await renderBackAttempt(input, true)
  second.warnings.unshift('Your social handle was left off the card so everything else stays readable.')
  return finishBack(second)
}

function finishBack(r: Awaited<ReturnType<typeof renderBackAttempt>>) {
  if (r.overflow) r.warnings.push('Some details are too long for the card. Turn one off so the rest stay readable.')
  return { png: r.png, layout: r.layout, info: r.info, warnings: r.warnings, overflow: r.overflow }
}

async function renderBackAttempt(input: BizcardBackInput, dropSocial: boolean) {
  const warnings: BizcardWarning[] = []
  const c = BIZCARD_THEMES[input.key]
  const k = input.key
  const BODY = (s: number, w: 'body' | 'body600' | 'body700' = 'body') => face(k, w, s)
  const HEAD = (s: number) => face(k, 'head', s)
  const textLine = input.fields.textLink && input.textLinkNumber ? `Text ${input.textLinkNumber}` : ''
  const fields = {
    name: input.fields.name && Boolean(input.name),
    email: input.fields.email && Boolean(input.email),
    web: input.fields.website && Boolean(input.website),
    phone: Boolean(textLine),
    social: input.fields.social && Boolean(input.social) && !dropSocial,
    code: input.fields.discount,
  }
  const n = [fields.email, fields.web, fields.phone, fields.social, fields.code].filter(Boolean).length
  const tile = n <= 3 ? 356 : 330
  const capf = BODY(36, 'body700')
  const caplh = 42
  const capH = 2 * caplh
  const lw = tile
  const tx = SX0
  const ty = Math.floor((H - (tile + 18 + capH)) / 2)
  let out = `<rect width="${W}" height="${H}" fill="${c.back}"/>`
  if (c.backGradient) {
    const [from, middle, to] = c.backGradient
    if (![from, middle, to].every((color) => /^#[0-9a-f]{6}$/i.test(color))) throw new Error('Card gradient stops must be six-digit hex colors.')
    // Matches CSS linear-gradient(105deg, from, middle 55%, to) on this canvas.
    out = `<defs><linearGradient id="card-back-gradient" gradientUnits="userSpaceOnUse" x1="-48" y1="174" x2="1173" y2="501"><stop stop-color="${from}"/><stop offset=".55" stop-color="${middle}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#card-back-gradient)"/>`
  }
  out += `<rect x="${tx}" y="${ty}" width="${tile}" height="${tile}" rx="28" fill="#ffffff"/>`
  const qs = tile - 10
  const qr = cardQrSvg({ url: input.qrUrl, icon: input.qrIcon, dark: bizcardQrDark(k), width: qs, gradient: c.qrGradient })
  out += qr.svg.replace('<svg ', `<svg x="${tx + 5}" y="${ty + 5}" `)
  let y = ty + tile + 18
  for (const l of BIZCARD_SCAN_LINES) {
    out += `<path d="${capPath(capf, l, tx + Math.floor((tile - tw(capf, l)) / 2), y)}" fill="${c.name}"/>`
    y += caplh
  }
  const rx = SX0 + lw + 22
  out += `<rect x="${rx - 1}" y="${SY0 + 24}" width="3" height="${SY1 - SY0 - 48}" fill="${c.rule}"/>`
  const X0 = rx + 22
  const CW = SX1 - X0
  let ns = Math.floor((n <= 3 ? 66 : 62) * (c.nscale ?? 1))
  while (input.name && tw(HEAD(ns), input.name) > CW && ns > 50) ns -= 1
  const body = n <= 3 ? 38 : 34
  const ic = Math.floor(body * 0.9)
  const icg = Math.floor(body * 0.32)
  type Item = {
    kind: 'row' | 'rule' | 'code'
    h: number
    draw?: (y: number) => void
    bounds?: (y: number) => BizcardFieldBox
  }
  const items: Item[] = []
  const block = (id: BizcardFieldId, h: number, x2: number) => (yy: number): BizcardFieldBox => ({
    id, x: X0, y: yy - 1, x2, y2: yy + h,
  })
  if (fields.name) {
    let nf = HEAD(ns)
    while (tw(nf, input.name) > CW && nf.size > MINPX) nf = HEAD(nf.size - 1)
    let nameLines = [input.name]
    if (tw(nf, input.name) > CW) {
      // Two lines by words at the largest size that fits; never under 8 pt.
      nameLines = []
      for (let s2 = ns; s2 >= MINPX && !nameLines.length; s2 -= 1) {
        const l = balancedLines(input.name, HEAD(s2), CW, 2)
        if (l) { nameLines = l; nf = HEAD(s2) }
      }
    }
    if (!nameLines.length) {
      warnings.push('Your name is too long for the card at a readable size, so it was left off.')
    } else {
      const nlh = Math.floor(nf.size * 1.1)
      const h = Math.floor(ns * 0.98) + nlh * (nameLines.length - 1)
      const x2 = X0 + Math.max(...nameLines.map((l) => tw(nf, l)))
      items.push({
        kind: 'row',
        h,
        bounds: block('name', h, x2),
        draw: (yy) => nameLines.forEach((l, i) => { out += `<path d="${capPath(nf, l, X0, yy + 2 + i * nlh)}" fill="${c.name}"/>` }),
      })
    }
    const rf = BODY(n > 3 ? MINPX : 37)
    const rl = wrap(BIZCARD_ROLE, rf, CW)
    const rlh = Math.floor(rf.size * 1.22)
    const rh = rlh * (rl.length - 1) + Math.floor(rf.size * 0.9)
    items.push({
      kind: 'row',
      h: rh,
      bounds: block('role', rh, X0 + Math.max(...rl.map((l) => tw(rf, l)))),
      draw: (yy) => rl.forEach((l, i) => { out += `<path d="${capPath(rf, l, X0, yy + i * rlh + 4)}" fill="${c.sub}"/>` }),
    })
    items.push({ kind: 'rule', h: 0 })
  }
  const bf = BODY(body)
  const socialIco = socialIconName(input.socialPlatform)
  const rowh = body
  const line = (yy: number, ico: string, txt: string, x = X0, f = bf) => {
    out += icon(ico, c.name, x, yy + Math.floor((rowh - ic) / 2) - 1, ic)
    out += `<path d="${capPath(f, txt, x + ic + icg, yy + Math.floor((rowh - Math.floor(f.size * 0.72)) / 2))}" fill="${c.ink}"/>`
  }
  const fitf = (txt: string, avail: number) => {
    let s = body
    while (s > MINPX && ic + icg + tw(BODY(s), txt) > avail) s -= 1
    return BODY(s)
  }
  const fits = (txt: string, f: Face) => ic + icg + tw(f, txt) <= CW
  /**
   * One line at body..34 px, else two lines. Email and website break before @ or
   * after . - _ /. A social handle with no break character splits near the middle.
   */
  const wrapRow = (txt: string, midpoint = false): { f: Face; lines: string[] } | null => {
    const one = fitf(txt, CW)
    if (fits(txt, one)) return { f: one, lines: [txt] }
    for (let s2 = body; s2 >= MINPX; s2 -= 1) {
      const f = BODY(s2)
      let best = null as { m: number; lines: string[] } | null
      const consider = (a: string, b: string) => {
        if (!a || !b || !fits(a, f) || !fits(b, f)) return
        const m = Math.max(tw(f, a), tw(f, b))
        if (!best || m < best.m) best = { m, lines: [a, b] }
      }
      for (let i = 1; i < txt.length; i += 1) {
        // Break before @ or after . - _ /
        if (!(txt[i] === '@' || '.-_/'.includes(txt[i - 1]))) continue
        consider(txt.slice(0, i), txt.slice(i))
      }
      if (!best && midpoint) {
        const start = Math.max(2, Math.floor(txt.length * 0.4))
        const end = Math.min(txt.length - 2, Math.ceil(txt.length * 0.6))
        for (let i = start; i <= end; i += 1) consider(txt.slice(0, i), txt.slice(i))
      }
      if (best) return { f, lines: best.lines }
    }
    return null
  }
  const addWrapped = (id: BizcardFieldId, txt: string, ico: string, label: string, midpoint = false) => {
    const w = wrapRow(txt, midpoint)
    if (!w) {
      warnings.push(`Your ${label} is too long for the card at a readable size, so it was left off.`)
      return
    }
    const lh = Math.floor(w.f.size * 1.18)
    const h = rowh + lh * (w.lines.length - 1)
    const x2 = X0 + ic + icg + Math.max(...w.lines.map((l) => tw(w.f, l)))
    items.push({
      kind: 'row',
      h,
      bounds: block(id, h, x2),
      draw: (yy) => {
        line(yy, ico, w.lines[0], X0, w.f)
        for (let i = 1; i < w.lines.length; i += 1) {
          out += `<path d="${capPath(w.f, w.lines[i], X0 + ic + icg, yy + i * lh + Math.floor((rowh - Math.floor(w.f.size * 0.72)) / 2))}" fill="${c.ink}"/>`
        }
      },
    })
  }
  if (fields.email) addWrapped('email', input.email, 'mail', 'email')
  if (fields.web) addWrapped('website', input.website, 'globe', 'website')
  if (fields.phone) addWrapped('text', textLine, 'msg', 'text-to-link number')
  if (fields.social) addWrapped('social', input.social, socialIco, 'social handle', true)
  const CODEH = 78
  if (fields.code) {
    items.push({
      kind: 'code',
      h: CODEH,
      bounds: block('discount', CODEH, SX1 - 4),
      draw: (yy) => {
        const lf = BODY(body)
        const lab = 'Discount code'
        const x = X0 + ic + icg
        const ly = yy + CODEH - 3
        const capTop = ly - 6 - Math.floor(body * 0.72)
        out += icon('tag', c.name, X0, capTop + Math.floor((Math.floor(body * 0.72) - ic) / 2), ic)
        out += `<path d="${capPath(lf, lab, x, capTop)}" fill="${c.sub}"/>`
        const lx = x + tw(lf, lab) + 16
        out += `<rect x="${lx}" y="${ly - 1}" width="${SX1 - 4 - lx}" height="2" fill="${c.sub}"/>`
      },
    })
  }
  const EXTRA = fields.code ? 10 : 0
  const hasRule = items.some((i) => i.kind === 'rule')
  const nb = items.filter((i) => i.kind !== 'rule').length
  const avail = SY1 - SY0 - 14 - EXTRA
  let gap = 30
  let ruleSp = 42
  let total = 0
  for (gap = 30; gap > 9; gap -= 1) {
    ruleSp = gap + 12
    total = items.reduce((s, i) => s + (i.kind === 'rule' ? 0 : i.h), 0) + gap * (nb - 1 - (hasRule ? 1 : 0)) + (hasRule ? 2 * ruleSp : 0) + EXTRA
    if (total <= avail) break
  }
  if (gap === 9) gap = 10
  y = Math.floor((H - total) / 2)
  let prev: Item['kind'] | null = null
  const placed: BizcardFieldBox[] = []
  for (const item of items) {
    if (item.kind === 'rule') {
      y += ruleSp
      out += `<rect x="${X0}" y="${y - 1}" width="70" height="3" fill="${c.name}"/>`
      y += ruleSp
      prev = 'rule'
      continue
    }
    if (prev && prev !== 'rule') y += gap + (item.kind === 'code' ? EXTRA : 0)
    if (item.bounds) placed.push(item.bounds(y))
    item.draw?.(y)
    y += item.h
    prev = item.kind
  }
  const overflow = total > avail
  const png = await sharp(renderSvg(svgDoc(out))).removeAlpha().png().toBuffer()
  const layout: BizcardBackLayout = { tile: { x: tx, y: ty, size: tile }, fields: placed }
  return { png, layout, overflow, warnings, info: { total, avail: SY1 - SY0, gap, nameSize: ns, body, tile } }
}

// ---------- print PDF ----------
/** 0.25 in slug around the bleed for crop marks. */
const SLUG = 75

function pdfPage(imgName: string) {
  const pw = ((W + 2 * SLUG) * 72) / BIZCARD_DPI
  const ph = ((H + 2 * SLUG) * 72) / BIZCARD_DPI
  const pt = (px: number) => (px * 72) / BIZCARD_DPI
  const iw = pt(W)
  const ih = pt(H)
  const s = pt(SLUG)
  const t0 = pt(SLUG + BIZCARD_BLEED)
  const tx1 = pt(SLUG + W - BIZCARD_BLEED)
  const ty1 = pt(SLUG + H - BIZCARD_BLEED)
  const gapPt = pt(12)
  const marks: string[] = []
  // PDF y runs up from the bottom.
  const Y = (v: number) => ph - v
  for (const x of [t0, tx1]) {
    marks.push(`${x.toFixed(2)} ${Y(0).toFixed(2)} m ${x.toFixed(2)} ${Y(s - gapPt).toFixed(2)} l S`)
    marks.push(`${x.toFixed(2)} ${Y(ph - s + gapPt).toFixed(2)} m ${x.toFixed(2)} ${Y(ph).toFixed(2)} l S`)
  }
  for (const y of [t0, ty1]) {
    marks.push(`0 ${Y(y).toFixed(2)} m ${(s - gapPt).toFixed(2)} ${Y(y).toFixed(2)} l S`)
    marks.push(`${(pw - s + gapPt).toFixed(2)} ${Y(y).toFixed(2)} m ${pw.toFixed(2)} ${Y(y).toFixed(2)} l S`)
  }
  const content = [
    'q',
    `${iw.toFixed(3)} 0 0 ${ih.toFixed(3)} ${s.toFixed(3)} ${s.toFixed(3)} cm`,
    `/${imgName} Do`,
    'Q',
    '0 0 0 1 K 0.25 w',
    ...marks,
  ].join('\n')
  return {
    pw, ph, content,
    bleed: [s, s, s + iw, s + ih],
    trim: [t0, Y(ty1), tx1, Y(t0)],
  }
}

/** Source pixels this dark print as rich black (Minuteman: 100/100/100/100). */
export const BIZCARD_RICH_BLACK_MAX_RGB = 24
/** Total ink cap for everything else, in percent. */
export const BIZCARD_TAC_LIMIT = 300

/**
 * sRGB -> CMYK for press. Near-black becomes 100/100/100/100; every other pixel is
 * held to 300% total ink by pulling C, M and Y down evenly (K is kept for detail).
 */
export async function toPressCmyk(png: Buffer) {
  const rgb = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const cmyk = await sharp(png).removeAlpha().toColourspace('cmyk').raw().toBuffer({ resolveWithObject: true })
  const src = rgb.data
  const d = Buffer.from(cmyk.data)
  const cap = (BIZCARD_TAC_LIMIT / 100) * 255
  for (let i = 0, j = 0; i < src.length; i += 3, j += 4) {
    if (src[i] <= BIZCARD_RICH_BLACK_MAX_RGB && src[i + 1] <= BIZCARD_RICH_BLACK_MAX_RGB && src[i + 2] <= BIZCARD_RICH_BLACK_MAX_RGB) {
      d[j] = 255; d[j + 1] = 255; d[j + 2] = 255; d[j + 3] = 255
      continue
    }
    const total = d[j] + d[j + 1] + d[j + 2] + d[j + 3]
    if (total > cap) {
      const cmy = d[j] + d[j + 1] + d[j + 2]
      const f = Math.max(0, (cap - d[j + 3]) / cmy)
      d[j] = Math.floor(d[j] * f); d[j + 1] = Math.floor(d[j + 1] * f); d[j + 2] = Math.floor(d[j + 2] * f)
    }
  }
  return { data: d, width: cmyk.info.width, height: cmyk.info.height }
}

/** Lossless DeviceCMYK plate (Flate), so rich black and the ink cap land exactly as computed. */
async function pressPlate(png: Buffer) {
  const c = await toPressCmyk(png)
  return deflateSync(c.data, { level: 9 })
}

/** Two-page CMYK print PDF: front, back. Trim/Bleed boxes plus crop marks; no text in the file. */
export async function buildBizcardPrintPdf(input: { front: Buffer; back: Buffer }) {
  const jpegs = [await pressPlate(input.front), await pressPlate(input.back)]
  const pages = [pdfPage('Im0'), pdfPage('Im1')]
  const objects: Buffer[] = []
  const add = (b: Buffer | string) => { objects.push(typeof b === 'string' ? Buffer.from(b, 'latin1') : b); return objects.length }
  // 1 catalog, 2 pages, 3 font, then per page: image, content, page
  add('<< /Type /Catalog /Pages 2 0 R >>')
  add('') // placeholder for pages
  add('<< /Producer (Sparkle Suite) >>') // object 3 kept so numbering stays stable
  const kids: number[] = []
  pages.forEach((p, i) => {
    const jpg = jpegs[i]
    // Raw ink values (0 = none, 255 = 100%), deflated.
    const img = add(Buffer.concat([
      Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${W} /Height ${H} /ColorSpace /DeviceCMYK /BitsPerComponent 8 /Filter /FlateDecode /Length ${jpg.length} >>\nstream\n`, 'latin1'),
      jpg,
      Buffer.from('\nendstream', 'latin1'),
    ]))
    const content = add(`<< /Length ${Buffer.byteLength(p.content, 'latin1')} >>\nstream\n${p.content}\nendstream`)
    const box = (a: number[]) => `[${a.map((v) => v.toFixed(3)).join(' ')}]`
    kids.push(add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${p.pw.toFixed(3)} ${p.ph.toFixed(3)}] /BleedBox ${box(p.bleed)} /TrimBox ${box(p.trim)} /Resources << /XObject << /Im${i} ${img} 0 R >> >> /Contents ${content} 0 R >>`))
  })
  objects[1] = Buffer.from(`<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`, 'latin1')
  const chunks: Buffer[] = [Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n', 'latin1')]
  const offsets: number[] = []
  let pos = chunks[0].length
  objects.forEach((o, i) => {
    offsets.push(pos)
    const b = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`, 'latin1'), o, Buffer.from('\nendobj\n', 'latin1')])
    chunks.push(b)
    pos += b.length
  })
  const xref = [`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`, ...offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`)].join('')
  chunks.push(Buffer.from(`${xref}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${pos}\n%%EOF\n`, 'latin1'))
  return Buffer.concat(chunks)
}

export { esc as escapeBizcardXml }
