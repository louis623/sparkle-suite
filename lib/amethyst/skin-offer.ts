export interface SkinOfferRow {
  skin_id: string
  visibility: string
  owner_rep_id: string | null
}

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
    if (!row || row.visibility !== 'private') return true
    if (row.owner_rep_id === input.repId) {
      ownedPrivateSkinIds.push(id)
      return true
    }
    return false
  })
  return { skinIds, ownedPrivateSkinIds }
}
