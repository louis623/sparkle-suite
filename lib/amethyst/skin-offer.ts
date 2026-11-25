import { AMETHYST_SKIN_CARDS } from '@/lib/amethyst/skin-cards'

export interface SkinOfferRow {
  skin_id: string
  visibility: string
  owner_rep_id: string | null
  allow_internal_demo?: boolean | null
}

export interface InternalDemoRep {
  status?: string | null
  account_classification?: string | null
  finder_directory_visible?: boolean | null
  custom_domain?: string | null
}

/** Same row shape the catalog function uses for internal demo access. */
export function repQualifiesForInternalDemo(rep: InternalDemoRep | null | undefined) {
  return rep?.status === 'active'
    && rep.account_classification === 'demo'
    && rep.finder_directory_visible === false
    && (rep.custom_domain ?? null) === null
}

const PRIVATE_THEME_IDS: ReadonlySet<string> = new Set<string>(
  AMETHYST_SKIN_CARDS.filter((card) => card.visibility === 'private').map((card) => card.id),
)

/**
 * A private theme is offered to its owner, and to a real internal-demo rep when
 * the catalog allows that. Reviewer identities are not internal demos here.
 */
export function skinsOfferedToRep(input: {
  repId: string
  availableIds: readonly string[]
  catalog: readonly SkinOfferRow[]
  internalDemo?: boolean
  reviewer?: boolean
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
    return input.internalDemo === true && input.reviewer !== true && row?.allow_internal_demo === true
  })
  return { skinIds, ownedPrivateSkinIds }
}
