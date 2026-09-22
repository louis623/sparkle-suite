import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  getAmethystSkinCard,
  getAmethystSkinCardsForIds,
  normalizeAmethystSkinSelection,
  type AmethystSkinCard,
} from './skin-cards'

type SkinAccessRpcClient = Pick<SupabaseClient, 'rpc'>

function normalizeAvailableSkinIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return value
    .map((row) => {
      if (typeof row === 'string') return row
      if (row && typeof row === 'object' && 'skin_id' in row) {
        const skinId = (row as { skin_id?: unknown }).skin_id
        return typeof skinId === 'string' ? skinId : ''
      }
      return ''
    })
    .filter(Boolean)
}

export async function getAvailableAmethystSkinIdsForRep(
  supabase: SkinAccessRpcClient,
  repId: string,
): Promise<string[]> {
  const { data, error } = await supabase.rpc('list_available_amethyst_skin_ids', {
    p_rep_id: repId,
  })
  if (error) {
    throw new Error('Unable to load the customer-site themes available to this account.')
  }

  return normalizeAvailableSkinIds(data)
}

export async function getAvailableAmethystSkinCardsForRep(
  supabase: SkinAccessRpcClient,
  repId: string,
): Promise<AmethystSkinCard[]> {
  return getAmethystSkinCardsForIds(
    await getAvailableAmethystSkinIdsForRep(supabase, repId),
  )
}

export async function isAmethystSkinSelectionAvailableToRep(
  supabase: SkinAccessRpcClient,
  value: string | null | undefined,
  repId: string,
): Promise<boolean> {
  const selectedId = normalizeAmethystSkinSelection(value)
  const card = getAmethystSkinCard(selectedId)
  if (card.id !== selectedId) return false

  const { data, error } = await supabase.rpc('amethyst_skin_is_available_to_rep', {
    p_rep_id: repId,
    p_skin_id: selectedId,
  })
  if (error) {
    throw new Error('Unable to verify the customer-site theme for this account.')
  }

  return data === true
}
