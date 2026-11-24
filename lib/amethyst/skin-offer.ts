import { AMETHYST_SKIN_CARDS } from '@/lib/amethyst/skin-cards'

export interface SkinOfferRow {
  skin_id: string
  visibility: string
  owner_rep_id: string | null
}

const PRIVATE_THEME_IDS = new Set(
  AMETHYST_SKIN_CARDS.filter((card) => card.visibility === 'private').map((card) => card.id),
)

/** A private theme is offered only to the rep that owns it. */
export function skinsOfferedToRep(input: {
  repId: string
  availableIds: readonly string[]
  catalog: readonly SkinOfferRow[]
}) {
  const owners = new Map(input.catalog.map((row) => [row.skin_id, row]))
  const ownedPrivateSkinIds: string[] = []
  const skinIds = input.availableIds.filter((id) => {
    const row = owners.get(id)
    const markedPrivate = PRIVATE_THEME_IDS.has(id) || row?.visibility === 'private'
    if (!markedPrivate) return true
    if (row?.owner_rep_id && row.owner_rep_id === input.repId) {
      ownedPrivateSkinIds.push(id)
      return true
    }
    return false
  })
  return { skinIds, ownedPrivateSkinIds }
}
