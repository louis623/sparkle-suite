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
}

function isMissingRelation(error: { code?: string; message?: string } | null) {
  if (!error) return false
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
      },
    }),
    updatedAt: row.updated_at,
    persistence: 'database',
  }
}

export async function readCardQrProfile(
  supabase: SupabaseClient,
  repId: string,
): Promise<{ profile: CardQrProfileRecord | null; persistence: 'database' | 'unavailable' }> {
  const { data, error } = await supabase
    .from('rep_card_qr_profiles')
    .select(
      'destination_url, template_id, show_name, show_email, show_qr, show_discount, discount_code, show_social, appearance_preset, updated_at',
    )
    .eq('rep_id', repId)
    .maybeSingle()

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
): Promise<{ profile: CardQrProfileRecord | null; persistence: 'database' | 'unavailable' }> {
  const { data, error } = await supabase
    .from('rep_card_qr_profiles')
    .upsert(
      {
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
      },
      { onConflict: 'rep_id' },
    )
    .select(
      'destination_url, template_id, show_name, show_email, show_qr, show_discount, discount_code, show_social, appearance_preset, updated_at',
    )
    .single()

  if (isMissingRelation(error)) {
    return { profile: null, persistence: 'unavailable' }
  }
  if (error || !data) {
    throw new ServiceError({
      code: 'CARD_QR_PROFILE_SAVE_FAILED',
      message: error?.message ?? 'QR profile save returned no row.',
      userMessage: 'Could not save this QR to the profile right now.',
      statusCode: 500,
    })
  }
  return { profile: rowToProfile(data as ProfileRow), persistence: 'database' }
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
