import { SOCIAL_HERO_LABELS, SOCIAL_HERO_ORDER } from '@/lib/public-site/social-hero'
import { ServiceError } from '@/lib/services/errors'

export const CARD_QR_TEMPLATE_IDS = [
  'match-site',
  'halloween',
  'classic-ivory',
] as const

export type CardQrTemplateId = (typeof CARD_QR_TEMPLATE_IDS)[number]

export interface CardQrFields {
  name: boolean
  email: boolean
  qr: boolean
  discount: boolean
  social: boolean
}

export const CARD_QR_ICONS = ['none', 'diamond', 'unicorn'] as const

export type CardQrIcon = (typeof CARD_QR_ICONS)[number]

export const CARD_QR_ICON_LABELS: Record<CardQrIcon, string> = {
  none: 'None',
  diamond: 'Diamond',
  unicorn: 'Unicorn',
}

export interface CardQrDesign {
  templateId: CardQrTemplateId
  fields: CardQrFields
  discountCode: string
  qrIcon: CardQrIcon
}

export const DEFAULT_CARD_QR_DESIGN: CardQrDesign = {
  templateId: 'match-site',
  fields: {
    name: true,
    email: true,
    qr: true,
    discount: false,
    social: true,
  },
  discountCode: '',
  qrIcon: 'none',
}

export function parseCardQrIcon(value: unknown): CardQrIcon | null {
  return CARD_QR_ICONS.includes(value as CardQrIcon) ? (value as CardQrIcon) : null
}

/** Absent means None. A present unknown value is a bad request. */
export function cardQrIconFromRequest(value: unknown): CardQrIcon {
  if (value == null || value === '') return 'none'
  const icon = parseCardQrIcon(value)
  if (!icon) {
    throw new ServiceError({
      code: 'CARD_QR_ICON_INVALID',
      message: 'QR icon must be none, diamond, or unicorn.',
      userMessage: 'Choose None, Diamond, or Unicorn.',
      statusCode: 400,
    })
  }
  return icon
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function cleanDiscountCode(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 40)
}

/**
 * Old saved templateId values still parse, including halloween and classic-ivory.
 * The flyer ignores them and follows the current site theme. No migration:
 * the template_id column stays.
 */
export function parseCardQrDesign(value: unknown): CardQrDesign {
  const record = isRecord(value) ? value : {}
  const templateId = CARD_QR_TEMPLATE_IDS.includes(record.templateId as CardQrTemplateId)
    ? (record.templateId as CardQrTemplateId)
    : DEFAULT_CARD_QR_DESIGN.templateId
  const fields = isRecord(record.fields) ? record.fields : {}
  const readFlag = (key: keyof CardQrFields, fallback: boolean) =>
    typeof fields[key] === 'boolean' ? fields[key] : fallback

  return {
    templateId,
    fields: {
      name: readFlag('name', DEFAULT_CARD_QR_DESIGN.fields.name),
      email: readFlag('email', DEFAULT_CARD_QR_DESIGN.fields.email),
      qr: readFlag('qr', DEFAULT_CARD_QR_DESIGN.fields.qr),
      discount: readFlag('discount', DEFAULT_CARD_QR_DESIGN.fields.discount),
      social: readFlag('social', DEFAULT_CARD_QR_DESIGN.fields.social),
    },
    discountCode: cleanDiscountCode(record.discountCode),
    qrIcon: parseCardQrIcon(record.qrIcon) ?? DEFAULT_CARD_QR_DESIGN.qrIcon,
  }
}

export function formatCardQrSocialLine(
  socialHandles: Record<string, string | null | undefined> | null | undefined,
) {
  const handles = socialHandles ?? {}
  const parts = SOCIAL_HERO_ORDER.flatMap((platform) => {
    const raw = handles[platform]?.trim()
    if (!raw) return []
    const handle = raw
      .replace(/^https?:\/\/(www\.)?/i, '')
      .replace(/\/$/, '')
    const short = handle.length > 42 ? `${handle.slice(0, 39)}…` : handle
    return [`${SOCIAL_HERO_LABELS[platform]} ${short.startsWith('@') || short.includes('/') ? short : `@${short}`}`]
  })
  return parts.slice(0, 3).join(' · ')
}

export interface CardQrCopyInput {
  displayName?: string | null
  businessName?: string | null
  email?: string | null
  socialHandles?: Record<string, string | null | undefined> | null
}

/** Account lines for the flyer and card. Discount stays off. QR is always drawn separately. */
export function buildCardQrCopyLines(input: CardQrCopyInput) {
  const lines: string[] = []
  const name = input.displayName?.trim() || ''
  const business = input.businessName?.trim() || ''
  if (business) lines.push(business)
  if (name && name.localeCompare(business, undefined, { sensitivity: 'base' }) !== 0) {
    lines.push(name)
  }
  const email = input.email?.trim() || ''
  if (email) lines.push(email)
  const social = formatCardQrSocialLine(input.socialHandles)
  if (social) lines.push(social)
  return lines
}
