export const CARD_QR_PACK_QUANTITIES = [500, 1000] as const

export type CardQrPackQuantity = (typeof CARD_QR_PACK_QUANTITIES)[number]

export interface CardQrPack {
  quantity: CardQrPackQuantity
  amountCents: number
  label: string
  priceLabel: string
}

/** Locked all-in Smoke prices: print + tax + cheapest UPS Ground + margin. */
export const CARD_QR_PACKS: Record<CardQrPackQuantity, CardQrPack> = {
  500: {
    quantity: 500,
    amountCents: 10_000,
    label: '500 cards',
    priceLabel: '$100',
  },
  1000: {
    quantity: 1000,
    amountCents: 12_000,
    label: '1,000 cards',
    priceLabel: '$120',
  },
}

export const CARD_QR_TURNAROUND_COPY =
  'Up to about 2 weeks (about 14 business days) from a paid order to your door.'

export const CARD_QR_SHIPPING_COPY =
  'Shipping is the cheapest option only: UPS Ground. No air and no rush.'

export const CARD_QR_PRICE_COPY =
  'All-in price covers print, tax, and UPS Ground.'

export const CARD_QR_REGION_COPY =
  'Hawaii and Alaska shipping is not available in this version.'

export const CARD_QR_PRINT_SPEC = {
  trim: '3.5 × 2 in',
  bleed: '0.125 in',
  safe: '0.125 in',
  stock: '14pt C1S, UV coating on the front, uncoated back',
} as const

export const CARD_QR_FULFILLMENT_COPY =
  'Order received. Sparkle Suite will place the print job by hand for this Smoke version. Expect the cards in up to about 2 weeks (about 14 business days).'

export function isCardQrPackQuantity(value: unknown): value is CardQrPackQuantity {
  return value === 500 || value === 1000
}

export function getCardQrPack(quantity: CardQrPackQuantity): CardQrPack {
  return CARD_QR_PACKS[quantity]
}

export function formatCardQrPrice(amountCents: number) {
  return `$${(amountCents / 100).toFixed(0)}`
}
