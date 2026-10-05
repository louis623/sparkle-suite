import { SOCIAL_HERO_LABELS, SOCIAL_HERO_ORDER } from '@/lib/public-site/social-hero'

export const CARD_QR_TEMPLATE_IDS = [
  'match-site',
  'halloween',
  'classic-ivory',
] as const

export type CardQrTemplateId = (typeof CARD_QR_TEMPLATE_IDS)[number]

export const CARD_QR_TEMPLATES: Array<{
  id: CardQrTemplateId
  label: string
  description: string
}> = [
  {
    id: 'match-site',
    label: 'Match my site',
    description: 'Uses the colors from your current customer-site theme.',
  },
  {
    id: 'halloween',
    label: 'Halloween',
    description: 'Seasonal pumpkin night look. Your QR stays the same.',
  },
  {
    id: 'classic-ivory',
    label: 'Classic ivory',
    description: 'A quiet ivory card that still uses your saved QR.',
  },
]

export interface CardQrFields {
  name: boolean
  email: boolean
  qr: boolean
  discount: boolean
  social: boolean
}

export interface CardQrDesign {
  templateId: CardQrTemplateId
  fields: CardQrFields
  discountCode: string
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
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function cleanDiscountCode(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 40)
}

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
  design: CardQrDesign
}

export function buildCardQrCopyLines(input: CardQrCopyInput) {
  const lines: string[] = []
  const name = input.displayName?.trim() || ''
  const business = input.businessName?.trim() || ''
  if (input.design.fields.name) {
    if (business) lines.push(business)
    if (name && name.localeCompare(business, undefined, { sensitivity: 'base' }) !== 0) {
      lines.push(name)
    }
  }
  const email = input.email?.trim() || ''
  if (input.design.fields.email && email) lines.push(email)
  if (input.design.fields.discount && input.design.discountCode) {
    lines.push(`Discount ${input.design.discountCode}`)
  }
  if (input.design.fields.social) {
    const social = formatCardQrSocialLine(input.socialHandles)
    if (social) lines.push(social)
  }
  return lines
}
