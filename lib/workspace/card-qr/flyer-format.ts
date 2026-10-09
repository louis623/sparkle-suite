import type { CardQrIcon } from '@/lib/workspace/card-qr/design'

export const CARD_QR_FLYER_FORMATS = ['png', 'jpg'] as const

export type CardQrFlyerFormat = (typeof CARD_QR_FLYER_FORMATS)[number]

/** JPG is the default file. PNG is full quality. Plan section 3. */
export const DEFAULT_CARD_QR_FLYER_FORMAT: CardQrFlyerFormat = 'jpg'

export const CARD_QR_FLYER_JPG_QUALITY = 94

export function parseCardQrFlyerFormat(value: unknown): CardQrFlyerFormat | null {
  if (value == null || value === '') return DEFAULT_CARD_QR_FLYER_FORMAT
  if (value === 'png') return 'png'
  if (value === 'jpg' || value === 'jpeg') return 'jpg'
  return null
}

/** One key for the preview and the download of that same file. */
export function flyerPreviewCacheKey(
  format: CardQrFlyerFormat,
  destinationUrl: string,
  icon: CardQrIcon = 'none',
) {
  return `${format}:${icon}:${destinationUrl}`
}

export function flyerDownloadBytes<T>(
  cached: { key: string; bytes: T } | null,
  key: string,
) {
  if (!cached || cached.key !== key) return null
  return cached.bytes
}
