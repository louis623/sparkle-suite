import { ServiceError } from '@/lib/services/errors'
import {
  buildCardQrDestinationForRep,
  isReadyCardQrDestination,
} from '@/lib/workspace/card-qr/destination'

/** 0-9, then A-Z, then a-z. Case-sensitive. 62^6 covers every 32-bit prefix. */
export const CARD_QR_SHORT_ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

/** Six characters. Five cannot hold every 32-bit prefix (62^5 < 2^32). */
export const CARD_QR_SHORT_CODE_LENGTH = 6

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const CODE_PATTERN = new RegExp(`^[${CARD_QR_SHORT_ALPHABET}]{${CARD_QR_SHORT_CODE_LENGTH}}$`)

export interface CardQrShortLinkRep {
  id: string
  public_site_slug?: string | null
  custom_domain?: string | null
}

function encodeBase62(value: number) {
  let remaining = value
  let code = ''
  for (let index = 0; index < CARD_QR_SHORT_CODE_LENGTH; index += 1) {
    code = CARD_QR_SHORT_ALPHABET[remaining % 62] + code
    remaining = Math.floor(remaining / 62)
  }
  return code
}

function decodeBase62(code: string) {
  let value = 0
  for (const char of code) {
    const index = CARD_QR_SHORT_ALPHABET.indexOf(char)
    if (index < 0) return null
    value = value * 62 + index
  }
  return value
}

/**
 * Six-character code from the first 32 bits of a rep UUID.
 * No lookup table: the redirect searches reps whose id starts with those bits.
 */
export function cardQrShortCode(repId: string | null | undefined) {
  const id = repId?.trim().toLowerCase() ?? ''
  if (!UUID_PATTERN.test(id)) return null
  const prefix = Number.parseInt(id.slice(0, 8), 16)
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 0xffffffff) return null
  return encodeBase62(prefix)
}

/** First eight hex characters of the rep UUID, or null when the code is not one of ours. */
export function cardQrUuidPrefixFromCode(code: string | null | undefined) {
  const trimmed = code?.trim() ?? ''
  if (!CODE_PATTERN.test(trimmed)) return null
  const value = decodeBase62(trimmed)
  if (value == null || value > 0xffffffff) return null
  return value.toString(16).padStart(8, '0')
}

/** Inclusive UUID text bounds for `id >= from AND id <= to`. Matches the first 32 bits. */
export function cardQrUuidPrefixBounds(prefix: string) {
  return {
    from: `${prefix}-0000-0000-0000-000000000000`,
    to: `${prefix}-ffff-ffff-ffff-ffffffffffff`,
  }
}

export function buildCardQrShortUrl(origin: string, repId: string | null | undefined) {
  const code = cardQrShortCode(repId)
  const base = origin.trim().replace(/\/$/, '')
  if (!code || !base) return null
  return `${base}/q/${code}`
}

export function requireCardQrShortUrl(origin: string, repId: string | null | undefined) {
  const url = buildCardQrShortUrl(origin, repId)
  if (!url) {
    throw new ServiceError({
      code: 'CARD_QR_SHORT_LINK_UNAVAILABLE',
      message: 'Rep id is not a UUID, so a short QR code cannot be derived.',
      userMessage: 'This QR needs a site id before it can be made.',
      statusCode: 409,
    })
  }
  return url
}

/**
 * One matching rep redirects. Zero matches, or two reps that share the prefix, do not.
 * The caller already limited the rows to that prefix.
 */
export function resolveCardQrShortLinkTarget(
  code: string,
  rows: CardQrShortLinkRep[],
  origin: string,
): { status: 302; location: string } | { status: 404 } {
  const prefix = cardQrUuidPrefixFromCode(code)
  if (!prefix) return { status: 404 }
  const matches = rows.filter((row) => row.id.trim().toLowerCase().startsWith(prefix))
  if (matches.length !== 1) return { status: 404 }
  const row = matches[0]
  const location = buildCardQrDestinationForRep(
    {
      repId: row.id,
      publicSiteSlug: row.public_site_slug,
      customDomain: row.custom_domain,
    },
    origin,
  )
  if (!location || !isReadyCardQrDestination(location)) return { status: 404 }
  return { status: 302, location }
}
