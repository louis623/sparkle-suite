import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveItemNumber } from '@/lib/services/jewelry-database'
import type { TradeBoardIntakeSessionState } from './trade-board-intake-types'
type Identity = { itemNumber?: string; material?: string; mainStone?: string; catalogMode?: string }
type Resolution = Awaited<ReturnType<typeof resolveItemNumber>>
const resolutions = new WeakMap<Record<string, unknown>, { identity: string; designId: string; result: Resolution }>()
export function catalogAddIdentity(input: Identity): string {
  return JSON.stringify([input.itemNumber?.trim().toUpperCase() ?? '', input.material?.trim().toLowerCase() ?? '', input.mainStone?.trim().toLowerCase() ?? ''])
}
export function rememberCatalogAddResolution(state: TradeBoardIntakeSessionState | null | undefined, input: Identity, result: Resolution | null) {
  if (!state) return
  resolutions.delete(state.metadata)
  if (state.catalogMode !== 'non_item_number' && input.catalogMode !== 'non_item_number' && result?.found)
    resolutions.set(state.metadata, { identity: catalogAddIdentity(input), designId: result.design.id, result })
}
export function existingCatalogAddResolution(state: TradeBoardIntakeSessionState | null | undefined, input?: Identity): Resolution | null {
  if (!state || state.catalogMode === 'non_item_number' || input?.catalogMode === 'non_item_number') return null
  const saved = resolutions.get(state.metadata)
  const identity = catalogAddIdentity(input ?? state.known)
  if (!saved || saved.identity !== identity || !saved.result.found || saved.designId !== saved.result.design.id) return null
  return saved.result
}
export async function refreshCatalogAddResolution(supabase: SupabaseClient, state: TradeBoardIntakeSessionState) {
  resolutions.delete(state.metadata)
  if (state.catalogMode === 'non_item_number' || !state.known.itemNumber) return null
  const result = await resolveItemNumber(supabase, state.known.itemNumber, { material: state.known.material, mainStone: state.known.mainStone })
  rememberCatalogAddResolution(state, state.known, result)
  return result
}
