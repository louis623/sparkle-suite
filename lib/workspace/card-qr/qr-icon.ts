import type { CardQrIcon } from '@/lib/workspace/card-qr/design'
import { CARD_QR_ICON_ART } from '@/lib/workspace/card-qr/qr-icon-art'

/**
 * Badge diameter as a fraction of the module grid (the code, not the quiet zone).
 * Modules under the badge (plus about half a module of clearance) are left out whole.
 */
export const CARD_QR_ICON_COVERAGE = 0.2
/** Extra clearance around the badge, in modules. */
export const CARD_QR_ICON_CLEARANCE = 0.55
/** Codes bigger than this are drawn without a badge so they stay easy to scan. */
export const CARD_QR_ICON_MAX_VERSION = 6

/**
 * Third-party icon licenses (MIT). Shapes are recolored to the site theme.
 *
 * Microsoft Fluent Emoji and Fluent UI System Icons. Copyright (c) Microsoft Corporation.
 * Phosphor Icons. Copyright (c) 2020 Phosphor Icons.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons
 * to whom the Software is furnished to do so, subject to the following conditions: The above
 * copyright notice and this permission notice shall be included in all copies or substantial
 * portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
 */
export const THIRD_PARTY_NOTICES = [
  'Microsoft Fluent Emoji (MIT) - unicorn marks',
  'Microsoft Fluent UI System Icons (MIT) - heart',
  'Phosphor Icons (MIT) - smiley, crown, butterfly',
] as const

export function cardQrBadgeModules(modules: number) {
  return modules * CARD_QR_ICON_COVERAGE
}

export function cardQrBadgeHitsFinders(modules: number, badgeModules: number) {
  // Finder patterns plus separators fill the 8x8 corners. Measure to their inner corner.
  const radius = badgeModules / 2 + CARD_QR_ICON_CLEARANCE
  const toFinderCorner = Math.SQRT2 * (modules / 2 - 8)
  return toFinderCorner <= radius
}

/** t = 0 keeps the color, t = 1 is white. */
export function mixToWhite(hex: string, t: number) {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16)
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * t))
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('')
}

// Diamond drawn for Sparkle Suite (original), brilliant cut in a 24 box.
const A = [7.0, 4.6], B = [17.0, 4.6], L = [2.2, 9.6], R = [21.8, 9.6]
const P1 = [8.6, 9.6], Q = [12, 9.6], P2 = [15.4, 9.6], K = [12, 21.2]
const pts = (...p: number[][]) => p.map((q) => q.join(',')).join(' ')
const SILHOUETTE = `M${A} L${B} L${R} L${K} L${L} Z`
const FACET_LINES = [[A, P1], [A, Q], [B, Q], [B, P2], [P1, K], [P2, K], [L, R]]

function diamondSolid(dark: string, gap: number) {
  return `<path d="${SILHOUETTE}" fill="${dark}" stroke="${dark}" stroke-width="1.1" stroke-linejoin="round"/>${FACET_LINES.map(
    ([a, b]) => `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#FFFFFF" stroke-width="${gap}" stroke-linecap="round"/>`,
  ).join('')}`
}

function diamondTwoTone(dark: string) {
  const facets: Array<[number[][], number]> = [
    [[A, L, P1], 0.42], [[A, P1, Q], 0.7], [[A, Q, B], 0.86], [[B, Q, P2], 0.62], [[B, P2, R], 0.3],
    [[L, P1, K], 0.12], [[P1, P2, K], 0.45], [[P2, R, K], 0],
  ]
  return `${facets.map(([p, t]) => `<polygon points="${pts(...p)}" fill="${mixToWhite(dark, t)}" stroke="${mixToWhite(dark, t)}" stroke-width="0.15" stroke-linejoin="round"/>`).join('')}${FACET_LINES.map(
    ([a, b]) => `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#FFFFFF" stroke-opacity="0.85" stroke-width="0.45" stroke-linecap="round"/>`,
  ).join('')}<path d="${SILHOUETTE}" fill="none" stroke="${dark}" stroke-width="1.1" stroke-linejoin="round"/><path d="M19.6 1.2 Q19.9 2.9 21.6 3.2 Q19.9 3.5 19.6 5.2 Q19.3 3.5 17.6 3.2 Q19.3 2.9 19.6 1.2Z" fill="${dark}"/>`
}

function gemRing(dark: string) {
  return `<circle cx="12" cy="15.6" r="6.2" fill="none" stroke="${dark}" stroke-width="1.8"/><g transform="translate(12 0.6) scale(0.46) translate(-12 -4.6)">${diamondSolid(dark, 1.4)}</g><path d="M10.2 9.6 L13.8 9.6 L12.9 10.8 L11.1 10.8 Z" fill="${dark}" stroke="${dark}" stroke-width="0.5" stroke-linejoin="round"/>`
}

function fromArt(key: keyof typeof CARD_QR_ICON_ART, dark: string) {
  const art = CARD_QR_ICON_ART[key]
  const inner = art.inner
    .replaceAll('__DARK__', dark)
    .replace(/__T([\d.]+)__/g, (_m, t: string) => mixToWhite(dark, Number(t)))
  return { viewBox: art.vb, inner }
}

/** Icon box as a fraction of the badge diameter. */
const ICON_SCALE: Record<Exclude<CardQrIcon, 'none'>, number> = {
  'diamond-solid': 0.64,
  'diamond-two-tone': 0.66,
  'unicorn-line': 0.64,
  'unicorn-two-tone': 0.66,
  heart: 0.56,
  smiley: 0.6,
  'gem-ring': 0.62,
  crown: 0.6,
  butterfly: 0.62,
}

/** Vector art for a center mark, in its own viewBox. Diamond and ring are original drawings. */
export function cardQrIconArt(icon: CardQrIcon, dark: string) {
  if (icon === 'none') return null
  const scale = ICON_SCALE[icon]
  switch (icon) {
    case 'diamond-solid':
      return { viewBox: '0 0 24 24', inner: diamondSolid(dark, 1.05), scale }
    case 'diamond-two-tone':
      return { viewBox: '0 0 24 24', inner: diamondTwoTone(dark), scale }
    case 'gem-ring':
      return { viewBox: '0 0 24 24', inner: gemRing(dark), scale }
    default:
      return { ...fromArt(icon, dark), scale }
  }
}

/** Badge (white disc + theme ring) and icon, in module units centered at c. */
export function cardQrBadgeMarkup(icon: CardQrIcon, dark: string, c: number, diameter: number) {
  const art = cardQrIconArt(icon, dark)
  if (!art) return ''
  const r = diameter / 2
  const ring = diameter * 0.047
  const s = diameter * art.scale
  return `<circle cx="${c}" cy="${c}" r="${r}" fill="#FFFFFF"/><circle cx="${c}" cy="${c}" r="${r - ring / 2}" fill="none" stroke="${dark}" stroke-width="${ring}"/><svg x="${c - s / 2}" y="${c - s / 2}" width="${s}" height="${s}" viewBox="${art.viewBox}" overflow="visible">${art.inner}</svg>`
}
