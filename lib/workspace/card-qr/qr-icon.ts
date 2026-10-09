import type { CardQrIcon } from '@/lib/workspace/card-qr/design'

/**
 * Badge width as a fraction of the module grid (the code, not the quiet zone).
 * Finder patterns are 7 modules in each corner. Stay inside that with a 1-module gap.
 */
export const CARD_QR_ICON_COVERAGE = 0.18

export function cardQrBadgeModules(modules: number) {
  const clearOfFinders = modules - 16
  return Math.min(modules * CARD_QR_ICON_COVERAGE, Math.max(0, clearOfFinders))
}

export function cardQrBadgeHitsFinders(modules: number, badgeModules: number) {
  const half = badgeModules / 2
  const left = modules / 2 - half
  const right = modules / 2 + half
  return left < 8 || right > modules - 8
}

/** Simple drawn marks. No licensed artwork. Coordinates are a 24×24 box. */
export function cardQrIconMarkup(icon: CardQrIcon, dark: string) {
  if (icon === 'diamond') {
    return `
      <polygon points="12,2.4 21.4,12 12,21.6 2.6,12" fill="${dark}"/>
      <polygon points="12,7.6 16.2,12 12,16.4 7.8,12" fill="#FFFFFF"/>
    `
  }
  if (icon === 'unicorn') {
    return `
      <polygon points="13.2,11 15.6,1.4 18,11" fill="${dark}"/>
      <polygon points="7.2,11.4 9.6,4.6 12.6,11.2" fill="${dark}"/>
      <path d="M8 12.4 C8 10.6 10.6 9.8 13.2 10.8 L16.8 11.6 C19.4 12.2 21.4 13.4 21 15 C20.6 16.6 17.8 17.2 16.2 16.6 L16.6 19.8 C16.7 21.2 14.8 21.8 14 20.8 L12.6 17.8 C10 18.8 7.2 17.6 6.6 15.4 C6.2 14.2 6.8 13 8 12.4 Z" fill="${dark}"/>
      <circle cx="14.8" cy="13.6" r="0.95" fill="#FFFFFF"/>
    `
  }
  return ''
}
