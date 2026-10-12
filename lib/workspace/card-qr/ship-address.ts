/** Saved US shipping address for printed business cards (Louis, Oct 11). Client and server safe. */
export interface CardQrShipAddress {
  name: string
  street1: string
  street2: string
  city: string
  state: string
  zip: string
  phone: string
}

export const EMPTY_CARD_QR_SHIP_ADDRESS: CardQrShipAddress = { name: '', street1: '', street2: '', city: '', state: '', zip: '', phone: '' }

/** 50 states, DC, territories and military (APO/FPO) codes. */
export const US_STATE_CODES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC', 'PR', 'VI', 'GU', 'AS', 'MP', 'AA', 'AE', 'AP',
] as const

export type CardQrShipAddressErrors = Partial<Record<keyof CardQrShipAddress, string>>

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '')

/** Normalizes and validates. Returns the cleaned address and any field errors. */
export function validateCardQrShipAddress(input: unknown): { address: CardQrShipAddress; errors: CardQrShipAddressErrors } {
  const r = input && typeof input === 'object' ? (input as Record<string, unknown>) : {}
  const address: CardQrShipAddress = {
    name: clean(r.name, 80),
    street1: clean(r.street1, 100),
    street2: clean(r.street2, 100),
    city: clean(r.city, 60),
    state: clean(r.state, 2).toUpperCase(),
    zip: clean(r.zip, 10),
    phone: clean(r.phone, 24),
  }
  const errors: CardQrShipAddressErrors = {}
  if (address.name.length < 2) errors.name = 'Enter the name to ship to.'
  if (address.street1.length < 3) errors.street1 = 'Enter a street address.'
  if (address.city.length < 2) errors.city = 'Enter a city.'
  if (!(US_STATE_CODES as readonly string[]).includes(address.state)) errors.state = 'Use a 2-letter US state, like TX.'
  const zipDigits = address.zip.replace(/\D/g, '')
  if (/^\d{5}(-?\d{4})?$/.test(address.zip)) {
    address.zip = zipDigits.length === 9 ? `${zipDigits.slice(0, 5)}-${zipDigits.slice(5)}` : zipDigits
  } else {
    errors.zip = 'Use a 5-digit ZIP or ZIP+4, like 78701 or 78701-1234.'
  }
  if (address.phone) {
    const d = address.phone.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '')
    if (d.length !== 10) errors.phone = 'Use a 10-digit US phone number, or leave it empty.'
    else address.phone = `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
  }
  return { address, errors }
}

export function isCompleteCardQrShipAddress(input: unknown): input is CardQrShipAddress {
  return Object.keys(validateCardQrShipAddress(input).errors).length === 0
}

/** One-line "Ship to" summary. */
export function cardQrShipAddressSummary(a: CardQrShipAddress) {
  return [a.name, [a.street1, a.street2].filter(Boolean).join(', '), `${a.city}, ${a.state} ${a.zip}`].filter(Boolean).join(' · ')
}

/** Proof approval the rep gives above the order button. Both must be true to order. */
export interface CardQrProofApproval {
  detailsConfirmed: boolean
  qrScanned: boolean
  detailsConfirmedAt: string | null
  qrScannedAt: string | null
}

export function readCardQrProofApproval(input: unknown): CardQrProofApproval {
  const r = input && typeof input === 'object' ? (input as Record<string, unknown>) : {}
  const at = (v: unknown) => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : null)
  return {
    detailsConfirmed: r.detailsConfirmed === true,
    qrScanned: r.qrScanned === true,
    detailsConfirmedAt: at(r.detailsConfirmedAt),
    qrScannedAt: at(r.qrScannedAt),
  }
}

/** What still blocks the order button, in the order the rep should fix it. */
export function cardQrOrderBlockers(input: { addressSaved: boolean; detailsConfirmed: boolean; qrScanned: boolean }) {
  const missing: string[] = []
  if (!input.addressSaved) missing.push('save your shipping address')
  if (!input.detailsConfirmed) missing.push('confirm your card details')
  if (!input.qrScanned) missing.push('confirm you scanned the QR')
  return missing
}
