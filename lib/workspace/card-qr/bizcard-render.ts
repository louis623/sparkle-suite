// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./opentype-js.d.ts" />
import { readFileSync } from 'node:fs'
import path from 'node:path'
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
}

const ICONS: Record<string, string> = {
  mail: '<path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"/><rect x="2" y="4" width="20" height="16" rx="2"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  msg: '<path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"/>',
  tag: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
  at: '<circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/>',
}
function icon(name: string, color: string, x: number, y: number, size: number) {
  return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" color="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name].replace('currentColor', color)}</svg>`
}

/** QR tile placement on the back, for decode checks. */
export interface BizcardBackLayout { tile: { x: number; y: number; size: number } }

export function bizcardQrDark(key: BizcardKey) {
  const palette = resolveCardQrPalette({ templateId: 'match-site', appearancePreset: BIZCARD_THEMES[key].qrTheme })
  return qrModuleColor(palette.qrDark, CARD_QR_DARK)
}

export async function renderBizcardBack(input: BizcardBackInput) {
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
    social: input.fields.social && Boolean(input.social),
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
  out += `<rect x="${tx}" y="${ty}" width="${tile}" height="${tile}" rx="28" fill="#ffffff"/>`
  const qs = tile - 10
  const qr = cardQrSvg({ url: input.qrUrl, icon: input.qrIcon, dark: bizcardQrDark(k), width: qs })
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
  type Item = { kind: 'row' | 'rule' | 'code'; h: number; draw?: (y: number) => void }
  const items: Item[] = []
  if (fields.name) {
    let nf = HEAD(ns)
    // Very long names: keep shrinking under the approved floor rather than overflow.
    while (tw(nf, input.name) > CW && nf.size > 30) nf = HEAD(nf.size - 1)
    items.push({ kind: 'row', h: Math.floor(ns * 0.98), draw: (yy) => { out += `<path d="${capPath(nf, input.name, X0, yy + 2)}" fill="${c.name}"/>` } })
    const rf = BODY(n > 3 ? MINPX : 37)
    const rl = wrap(BIZCARD_ROLE, rf, CW)
    const rlh = Math.floor(rf.size * 1.22)
    items.push({
      kind: 'row',
      h: rlh * (rl.length - 1) + Math.floor(rf.size * 0.9),
      draw: (yy) => rl.forEach((l, i) => { out += `<path d="${capPath(rf, l, X0, yy + i * rlh + 4)}" fill="${c.sub}"/>` }),
    })
    items.push({ kind: 'rule', h: 0 })
  }
  const bf = BODY(body)
  const rowh = body
  const line = (yy: number, ico: string, txt: string, x = X0, f = bf) => {
    out += icon(ico, c.name, x, yy + Math.floor((rowh - ic) / 2) - 1, ic)
    out += `<path d="${capPath(f, txt, x + ic + icg, yy + Math.floor((rowh - Math.floor(f.size * 0.72)) / 2))}" fill="${c.ink}"/>`
  }
  const fitf = (txt: string, avail: number) => {
    let s = body
    while (s > MINPX && ic + icg + tw(BODY(s), txt) > avail) s -= 1
    // Past the 8 pt floor only to stay inside the safe area.
    while (s > 24 && ic + icg + tw(BODY(s), txt) > avail) s -= 1
    return BODY(s)
  }
  if (fields.email) items.push({ kind: 'row', h: rowh, draw: (yy) => line(yy, 'mail', input.email, X0, fitf(input.email, CW)) })
  if (fields.web) items.push({ kind: 'row', h: rowh, draw: (yy) => line(yy, 'globe', input.website, X0, fitf(input.website, CW)) })
  if (fields.phone && fields.social) {
    const w1 = ic + icg + tw(bf, textLine)
    const w2 = ic + icg + tw(bf, input.social)
    if (w1 + w2 + 24 <= CW) {
      items.push({ kind: 'row', h: rowh, draw: (yy) => { line(yy, 'msg', textLine); line(yy, 'at', input.social, X0 + CW - w2 - 4) } })
    } else {
      items.push({ kind: 'row', h: rowh, draw: (yy) => line(yy, 'msg', textLine, X0, fitf(textLine, CW)) })
      items.push({ kind: 'row', h: rowh, draw: (yy) => line(yy, 'at', input.social, X0, fitf(input.social, CW)) })
    }
  } else {
    if (fields.phone) items.push({ kind: 'row', h: rowh, draw: (yy) => line(yy, 'msg', textLine, X0, fitf(textLine, CW)) })
    if (fields.social) items.push({ kind: 'row', h: rowh, draw: (yy) => line(yy, 'at', input.social, X0, fitf(input.social, CW)) })
  }
  const CODEH = 78
  if (fields.code) {
    items.push({
      kind: 'code',
      h: CODEH,
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
  for (const item of items) {
    if (item.kind === 'rule') {
      y += ruleSp
      out += `<rect x="${X0}" y="${y - 1}" width="70" height="3" fill="${c.name}"/>`
      y += ruleSp
      prev = 'rule'
      continue
    }
    if (prev && prev !== 'rule') y += gap + (item.kind === 'code' ? EXTRA : 0)
    item.draw?.(y)
    y += item.h
    prev = item.kind
  }
  const png = await sharp(renderSvg(svgDoc(out))).removeAlpha().png().toBuffer()
  const layout: BizcardBackLayout = { tile: { x: tx, y: ty, size: tile } }
  return { png, layout, info: { total, avail: SY1 - SY0, gap, nameSize: ns, body, tile } }
}

// ---------- print PDF ----------
/** 0.25 in slug around the bleed for crop marks. */
const SLUG = 75

function pdfPage(jpeg: Buffer, label: string, imgName: string) {
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
  const safeLabel = label.replace(/[()\\]/g, '')
  const content = [
    'q',
    `${iw.toFixed(3)} 0 0 ${ih.toFixed(3)} ${s.toFixed(3)} ${s.toFixed(3)} cm`,
    `/${imgName} Do`,
    'Q',
    '0 0 0 1 K 0.25 w',
    ...marks,
    `BT /F1 4.3 Tf 0 0 0 1 k ${(s + pt(60)).toFixed(2)} ${(s / 2 - 2).toFixed(2)} Td (${safeLabel}) Tj ET`,
  ].join('\n')
  return {
    pw, ph, content,
    bleed: [s, s, s + iw, s + ih],
    trim: [t0, Y(ty1), tx1, Y(t0)],
  }
}

/** Two-page CMYK print PDF: front, back. Trim/Bleed boxes plus crop marks. */
export async function buildBizcardPrintPdf(input: { front: Buffer; back: Buffer; label: string }) {
  const toCmyk = (png: Buffer) => sharp(png).toColourspace('cmyk').jpeg({ quality: 95, chromaSubsampling: '4:4:4' }).toBuffer()
  const jpegs = [await toCmyk(input.front), await toCmyk(input.back)]
  const pages = [
    pdfPage(jpegs[0], `${input.label} FRONT  3.5x2 in trim, 0.125 in bleed, 300 dpi CMYK`, 'Im0'),
    pdfPage(jpegs[1], `${input.label} BACK  3.5x2 in trim, 0.125 in bleed, 300 dpi CMYK`, 'Im1'),
  ]
  const objects: Buffer[] = []
  const add = (b: Buffer | string) => { objects.push(typeof b === 'string' ? Buffer.from(b, 'latin1') : b); return objects.length }
  // 1 catalog, 2 pages, 3 font, then per page: image, content, page
  add('<< /Type /Catalog /Pages 2 0 R >>')
  add('') // placeholder for pages
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  const kids: number[] = []
  pages.forEach((p, i) => {
    const jpg = jpegs[i]
    // libvips writes Adobe CMYK JPEGs inverted; Decode flips them back.
    const img = add(Buffer.concat([
      Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${W} /Height ${H} /ColorSpace /DeviceCMYK /BitsPerComponent 8 /Filter /DCTDecode /Decode [1 0 1 0 1 0 1 0] /Length ${jpg.length} >>\nstream\n`, 'latin1'),
      jpg,
      Buffer.from('\nendstream', 'latin1'),
    ]))
    const content = add(`<< /Length ${Buffer.byteLength(p.content, 'latin1')} >>\nstream\n${p.content}\nendstream`)
    const box = (a: number[]) => `[${a.map((v) => v.toFixed(3)).join(' ')}]`
    kids.push(add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${p.pw.toFixed(3)} ${p.ph.toFixed(3)}] /BleedBox ${box(p.bleed)} /TrimBox ${box(p.trim)} /Resources << /XObject << /Im${i} ${img} 0 R >> /Font << /F1 3 0 R >> >> /Contents ${content} 0 R >>`))
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
