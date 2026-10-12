import type { SupabaseClient } from '@supabase/supabase-js'
import { ServiceError } from '@/lib/services/errors'
import { validateCardQrShipAddress, type CardQrShipAddress } from '@/lib/workspace/card-qr/ship-address'

const COLUMNS = 'name, street1, street2, city, state, zip, phone, updated_at'

function missingTable(error: { message?: string; code?: string } | null) {
  return Boolean(error && (error.code === '42P01' || /rep_card_ship_addresses|schema cache/i.test(error.message ?? '')))
}

/** Reads with the rep's own session; RLS limits it to her row. */
export async function readCardQrShipAddress(supabase: SupabaseClient, repId: string) {
  const { data, error } = await supabase.from('rep_card_ship_addresses').select(COLUMNS).eq('rep_id', repId).maybeSingle()
  if (missingTable(error)) return { address: null, updatedAt: null, persistence: 'unavailable' as const }
  if (error) throw new ServiceError({ code: 'CARD_QR_ADDRESS_READ_FAILED', message: error.message, userMessage: 'Could not load your shipping address.', statusCode: 500 })
  if (!data) return { address: null, updatedAt: null, persistence: 'database' as const }
  const { updated_at, ...rest } = data as CardQrShipAddress & { updated_at: string }
  const address = { ...rest, street2: rest.street2 ?? '', phone: rest.phone ?? '' }
  return { address, updatedAt: updated_at, persistence: 'database' as const }
}

export async function saveCardQrShipAddress(supabase: SupabaseClient, repId: string, input: unknown) {
  const { address, errors } = validateCardQrShipAddress(input)
  if (Object.keys(errors).length) {
    throw Object.assign(
      new ServiceError({ code: 'CARD_QR_ADDRESS_INVALID', message: 'Invalid shipping address.', userMessage: Object.values(errors)[0]!, statusCode: 400 }),
      { fields: errors },
    )
  }
  const { data, error } = await supabase
    .from('rep_card_ship_addresses')
    .upsert({ rep_id: repId, ...address, updated_at: new Date().toISOString() }, { onConflict: 'rep_id' })
    .select(COLUMNS)
    .single()
  if (missingTable(error)) {
    throw new ServiceError({ code: 'CARD_QR_ADDRESS_UNAVAILABLE', message: error!.message, userMessage: 'Address saving is not set up on this database yet.', statusCode: 503 })
  }
  if (error) throw new ServiceError({ code: 'CARD_QR_ADDRESS_SAVE_FAILED', message: error.message, userMessage: 'Could not save your shipping address.', statusCode: 500 })
  return { address, updatedAt: (data as { updated_at: string }).updated_at }
}
