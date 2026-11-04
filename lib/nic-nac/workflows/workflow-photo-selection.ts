import type { TradeBoardIntakeSessionState } from './trade-board-intake-types'
import {
  normalizeJewelryMainStoneKey,
  normalizeJewelryMaterialKey,
} from '@/lib/services/jewelry-database'
import {
  isAcceptedCustomerFacingWorkflowPhoto,
  stampSoleReadinessJewelryFrontCandidate,
} from './workflow-photo-roles'

export interface WorkflowJewelryPhoto {
  id?: string
  attachmentIndex: number
  declaredRole: string
  visualRole: string
  quality: string
  imageUrl?: string
  notes?: string[]
  qualityIssues?: string[]
}

export function selectWorkflowJewelryPhoto(
  photos: WorkflowJewelryPhoto[] | null | undefined,
  selection: { selectedPhotoId?: string; modelIndex?: number },
): WorkflowJewelryPhoto | null {
  const allPhotos = stampSoleReadinessJewelryFrontCandidate(photos)
  const accepted = allPhotos.filter(isAcceptedCustomerFacingWorkflowPhoto)
  if (selection.selectedPhotoId) {
    return accepted.find((photo) => photo.id === selection.selectedPhotoId) ?? null
  }
  if (selection.modelIndex !== undefined) {
    const modelIndexed = allPhotos[selection.modelIndex - 1]
    if (isAcceptedCustomerFacingWorkflowPhoto(modelIndexed)) return modelIndexed
    return null
  }
  return null
}

export function resolveWorkflowCustomerFacingPhoto(
  photos: WorkflowJewelryPhoto[] | null | undefined,
  selection: { selectedPhotoId?: string; modelIndex?: number } = {},
): WorkflowJewelryPhoto | null {
  return selectWorkflowJewelryPhoto(photos, selection)
}

export function workflowPieceKey(workflow: TradeBoardIntakeSessionState): string {
  return workflow.catalogMode === 'non_item_number'
    ? `NON_ITEM:${workflow.id}`
    : workflow.known.itemNumber?.trim().toUpperCase() ?? ''
}

/** Bindings survive changes of item number within a conversation. Never rebind old photos. */
export function getCurrentPiecePhotos(
  workflow: TradeBoardIntakeSessionState,
  itemNumber = workflowPieceKey(workflow),
): TradeBoardIntakeSessionState['photos'] {
  const key = itemNumber.trim().toUpperCase()
  if (!key || key !== workflowPieceKey(workflow).toUpperCase()) return []
  const bindings = (workflow.metadata.photoBindings ?? {}) as Record<string, string>
  return workflow.photos.filter((photo) =>
    photo.id && bindings[photo.id]
      ? bindings[photo.id].toUpperCase() === key
      : true,
  )
}

export function hasUsableWorkflowJewelryPhoto(
  photos: WorkflowJewelryPhoto[] | null | undefined,
  selection: { selectedPhotoId?: string; modelIndex?: number } = {},
): boolean {
  if (!selection.selectedPhotoId && selection.modelIndex === undefined)
    return stampSoleReadinessJewelryFrontCandidate(photos).some(isAcceptedCustomerFacingWorkflowPhoto)
  return Boolean(resolveWorkflowCustomerFacingPhoto(photos, selection)?.imageUrl)
}

/**
 * Jewelry-over-label gate on top of the June/August catalog matcher.
 *
 * Shared pipeline for every current and future Dance Floor. There is no
 * per-rep branch. Variant identity is still `resolveItemNumber` /
 * `jewelry_designs.id` (`f1e225a9` June 27 plating, `720cdd74` August 23
 * main stone, August 25 `designId`). This helper does not choose a variant.
 * It only allows THAT already-resolved design's canonical when this listing
 * has no jewelry-front of its own.
 *
 * Non-item-number dancers (`listing_source = 'non_item_number'`,
 * `design_id` null) never pass `resolvedDesignId`, so they cannot fall
 * back into the master catalog.
 */
export function shouldFallBackToCatalogCanonicalPhoto(args: {
  listingPhotoUrl?: string | null
  hasWorkflowJewelryPhoto: boolean
  catalogHasCanonicalPhoto: boolean
  resolvedDesignId?: string | null
}): boolean {
  if (!args.resolvedDesignId?.trim()) return false
  if (!args.catalogHasCanonicalPhoto) return false
  if (args.listingPhotoUrl?.trim()) return false
  if (args.hasWorkflowJewelryPhoto) return false
  return true
}

/**
 * PhotoRoom cache identity for a variant already chosen by June/August
 * matching. Prefer `designId`. If the design does not exist yet, reuse
 * `normalizeJewelryMaterialKey` / `normalizeJewelryMainStoneKey` — do not
 * invent a second slugger.
 */
export function catalogVariantPhotoAssetKey(args: {
  designId?: string | null
  material?: string | null
  mainStone?: string | null
}): string | undefined {
  const designId = args.designId?.trim()
  if (designId) return designId
  const material = normalizeJewelryMaterialKey(args.material)
  const mainStone = normalizeJewelryMainStoneKey(args.mainStone)
  const variant = [material, mainStone].filter(Boolean).join('|')
  return variant || undefined
}
