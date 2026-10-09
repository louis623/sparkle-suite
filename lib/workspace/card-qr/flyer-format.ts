export const CARD_QR_FLYER_FORMATS = ['png', 'jpg'] as const

export type CardQrFlyerFormat = (typeof CARD_QR_FLYER_FORMATS)[number]

/** PNG is the default file. JPG is the other choice. */
export const DEFAULT_CARD_QR_FLYER_FORMAT: CardQrFlyerFormat = 'png'

export const CARD_QR_FLYER_JPG_QUALITY = 94

export function parseCardQrFlyerFormat(value: unknown): CardQrFlyerFormat | null {
  if (value == null || value === '') return DEFAULT_CARD_QR_FLYER_FORMAT
  if (value === 'png') return 'png'
  if (value === 'jpg' || value === 'jpeg') return 'jpg'
  return null
}

/** One key for the preview and the download of that same file. */
export function flyerPreviewCacheKey(format: CardQrFlyerFormat, destinationUrl: string) {
  return `${format}:${destinationUrl}`
}

export function flyerDownloadBytes<T>(
  cached: { key: string; bytes: T } | null,
  key: string,
) {
  if (!cached || cached.key !== key) return null
  return cached.bytes
}
