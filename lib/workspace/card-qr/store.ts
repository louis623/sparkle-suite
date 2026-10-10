import type { SupabaseClient } from '@supabase/supabase-js'
import { ServiceError } from '@/lib/services/errors'
import {
  parseCardQrDesign,
  type CardQrDesign,
} from '@/lib/workspace/card-qr/design'
import { CARD_QR_FULFILLMENT_COPY, type CardQrPackQuantity } from '@/lib/workspace/card-qr/pricing'

export interface CardQrProfileRecord {
  destinationUrl: string
  appearancePreset: string
  design: CardQrDesign
  updatedAt: string | null
  persistence: 'database'
}

interface ProfileRow {
  destination_url: string
  template_id: string
  show_name: boolean
  show_email: boolean
  show_qr: boolean
  show_discount: boolean
  discount_code: string | null
  show_social: boolean
  appearance_preset: string | null
  updated_at: string | null
  qr_icon?: string | null
  show_website?: boolean | null
  show_text_link?: boolean | null
  text_link_number?: string | null
}

const CARD_COLUMNS = 'qr_icon, show_website, show_text_link, text_link_number'

/** The 2026-10-09 business card columns are missing (migration not applied yet). */
export function isMissingCardColumn(error: { code?: string; message?: string } | null) {
  if (!error) return false
  const message = error.message ?? ''
  if (!/show_website|show_text_link|text_link_number/i.test(message)) return false
  return error.code === '42703' || error.code === 'PGRST204' || /column|schema cache/i.test(message)
}

const PROFILE_COLUMNS =
  'destination_url, template_id, show_name, show_email, show_qr, show_discount, discount_code, show_social, appearance_preset, updated_at'

export function isMissingQrIconColumn(error: { code?: string; message?: string } | null) {
  if (!error) return false
  const message = error.message ?? ''
  if (!/qr_icon/i.test(message)) return false
  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    /column|schema cache/i.test(message)
  )
}

function isMissingRelation(error: { code?: string; message?: string } | null) {
  if (!error || isMissingQrIconColumn(error) || isMissingCardColumn(error)) return false
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    /rep_card_qr_profiles|rep_card_print_orders|schema cache/i.test(error.message ?? '')
  )
}

function rowToProfile(row: ProfileRow): CardQrProfileRecord {
  return {
    destinationUrl: row.destination_url,
    appearancePreset: row.appearance_preset ?? 'sparkle_suite_morganite',
    design: parseCardQrDesign({
      templateId: row.template_id,
      discountCode: row.discount_code ?? '',
      fields: {
        name: row.show_name,
        email: row.show_email,
        qr: row.show_qr,
        discount: row.show_discount,
        social: row.show_social,
        website: row.show_website ?? undefined,
        textLink: row.show_text_link ?? undefined,
      },
      qrIcon: row.qr_icon,
      textLinkNumber: row.text_link_number ?? '',
    }),
    updatedAt: row.updated_at,
    persistence: 'database',
  }
}

export async function readCardQrProfile(
  supabase: SupabaseClient,
  repId: string,
): Promise<{ profile: CardQrProfileRecord | null; persistence: 'database' | 'unavailable' }> {
  const full = await supabase
    .from('rep_card_qr_profiles')
    .select(`${PROFILE_COLUMNS}, ${CARD_COLUMNS}`)
    .eq('rep_id', repId)
    .maybeSingle()
  const first = isMissingCardColumn(full.error)
    ? await supabase
        .from('rep_card_qr_profiles')
        .select(`${PROFILE_COLUMNS}, qr_icon`)
        .eq('rep_id', repId)
        .maybeSingle()
    : full
  const loaded = isMissingQrIconColumn(first.error)
    ? await supabase
        .from('rep_card_qr_profiles')
        .select(PROFILE_COLUMNS)
        .eq('rep_id', repId)
        .maybeSingle()
    : first
  const { data, error } = loaded

  if (isMissingRelation(error)) return { profile: null, persistence: 'unavailable' }
  if (error) {
    throw new ServiceError({
      code: 'CARD_QR_PROFILE_READ_FAILED',
      message: error.message,
      userMessage: 'Could not load the saved QR right now.',
      statusCode: 500,
    })
  }
  return {
    profile: data ? rowToProfile(data as ProfileRow) : null,
    persistence: 'database',
  }
}

export async function saveCardQrProfile(
  supabase: SupabaseClient,
  input: {
    repId: string
    destinationUrl: string
    appearancePreset: string
    design: CardQrDesign
  },
): Promise<{
  profile: CardQrProfileRecord | null
  persistence: 'database' | 'unavailable'
  iconStored: boolean
  cardStored: boolean
}> {
  const baseRow = {
    rep_id: input.repId,
    destination_url: input.destinationUrl,
    template_id: input.design.templateId,
    show_name: input.design.fields.name,
    show_email: input.design.fields.email,
    show_qr: input.design.fields.qr,
    show_discount: input.design.fields.discount,
    discount_code: input.design.discountCode,
    show_social: input.design.fields.social,
    appearance_preset: input.appearancePreset,
    updated_at: new Date().toISOString(),
  }
  const withCard = await supabase
    .from('rep_card_qr_profiles')
    .upsert(
      {
        ...baseRow,
        qr_icon: input.design.qrIcon,
        show_website: input.design.fields.website,
        show_text_link: input.design.fields.textLink,
        text_link_number: input.design.textLinkNumber || null,
      },
      { onConflict: 'rep_id' },
    )
    .select(`${PROFILE_COLUMNS}, ${CARD_COLUMNS}`)
    .single()
  const cardStored = !isMissingCardColumn(withCard.error)
  const withIcon = cardStored
    ? withCard
    : await supabase
        .from('rep_card_qr_profiles')
        .upsert({ ...baseRow, qr_icon: input.design.qrIcon }, { onConflict: 'rep_id' })
        .select(`${PROFILE_COLUMNS}, qr_icon`)
        .single()
  const iconStored = !isMissingQrIconColumn(withIcon.error)
  const saved = iconStored
    ? withIcon
    : await supabase.from('rep_card_qr_profiles').upsert(baseRow, { onConflict: 'rep_id' }).select(PROFILE_COLUMNS).single()
  const { data, error } = saved

  if (isMissingRelation(error)) {
    return { profile: null, persistence: 'unavailable', iconStored: false, cardStored: false }
  }
  if (error || !data) {
    throw new ServiceError({
      code: 'CARD_QR_PROFILE_SAVE_FAILED',
      message: error?.message ?? 'QR profile save returned no row.',
      userMessage: 'Could not save this QR to the profile right now.',
      statusCode: 500,
    })
  }
  return {
    profile: rowToProfile(data as ProfileRow),
    persistence: 'database',
    iconStored,
    cardStored: cardStored && iconStored,
  }
}

export async function recordPaidCardQrOrder(
  supabase: SupabaseClient,
  input: {
    repId: string
    quantity: CardQrPackQuantity
    amountCents: number
    checkoutSessionId: string
    paymentIntentId: string | null
    destinationUrl: string
    design: CardQrDesign
  },
) {
  const { error } = await supabase.from('rep_card_print_orders').upsert(
    {
      rep_id: input.repId,
      quantity: input.quantity,
      amount_cents: input.amountCents,
      currency: 'usd',
      stripe_checkout_session_id: input.checkoutSessionId,
      stripe_payment_intent_id: input.paymentIntentId,
      status: 'paid',
      livemode: false,
      destination_url: input.destinationUrl,
      design_snapshot: input.design,
      fulfillment_note: CARD_QR_FULFILLMENT_COPY,
      paid_at: new Date().toISOString(),
    },
    { onConflict: 'stripe_checkout_session_id' },
  )

  if (isMissingRelation(error)) return { persistence: 'unavailable' as const }
  if (error) {
    throw new ServiceError({
      code: 'CARD_QR_ORDER_SAVE_FAILED',
      message: error.message,
      userMessage: 'Payment was received, but the Smoke order record could not be saved.',
      statusCode: 500,
    })
  }
  return { persistence: 'database' as const }
}
