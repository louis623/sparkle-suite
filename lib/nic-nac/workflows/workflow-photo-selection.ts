import {
  normalizeJewelryMainStoneKey,
  normalizeJewelryMaterialKey,
} from '@/lib/services/jewelry-database'
import { isAcceptedCustomerFacingWorkflowPhoto } from './workflow-photo-roles'

export interface WorkflowJewelryPhoto {
  id?: string
  attachmentIndex: number
  declaredRole: string
  visualRole: string
  quality: string
  imageUrl?: string
}

export function selectWorkflowJewelryPhoto(
  photos: WorkflowJewelryPhoto[] | null | undefined,
  selection: { selectedPhotoId?: string; modelIndex?: number },
): WorkflowJewelryPhoto | null {
  const allPhotos = photos ?? []
  const accepted = allPhotos.filter(isAcceptedCustomerFacingWorkflowPhoto)
  if (selection.selectedPhotoId) {
    return accepted.find((photo) => photo.id === selection.selectedPhotoId) ?? null
  }
  if (selection.modelIndex !== undefined) {
    const modelIndexed = allPhotos[selection.modelIndex - 1]
    if (isAcceptedCustomerFacingWorkflowPhoto(modelIndexed)) return modelIndexed
    return accepted.find((photo) => photo.attachmentIndex === selection.modelIndex) ?? null
  }
  return pickPreferredCustomerFacingPhoto(accepted)
}

export function resolveWorkflowCustomerFacingPhoto(
  photos: WorkflowJewelryPhoto[] | null | undefined,
  selection: { selectedPhotoId?: string; modelIndex?: number } = {},
): WorkflowJewelryPhoto | null {
  const selected = selectWorkflowJewelryPhoto(photos, selection)
  if (selected) return selected
  if (selection.selectedPhotoId || selection.modelIndex !== undefined) {
    return selectWorkflowJewelryPhoto(photos, {})
  }
  return null
}

export function hasUsableWorkflowJewelryPhoto(
  photos: WorkflowJewelryPhoto[] | null | undefined,
  selection: { selectedPhotoId?: string; modelIndex?: number } = {},
): boolean {
  return Boolean(resolveWorkflowCustomerFacingPhoto(photos, selection)?.imageUrl)
}

/**
 * Jewelry-over-label gate on top of the June/August catalog matcher.
 *
 * Variant identity is still `resolveItemNumber` / `jewelry_designs.id`
 * (`f1e225a9` June 27 plating, `720cdd74` August 23 main stone). This helper
 * does not choose a variant. It only allows THAT already-resolved design's
 * canonical when this listing has no jewelry-front of its own.
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

function pickPreferredCustomerFacingPhoto(
  accepted: WorkflowJewelryPhoto[],
): WorkflowJewelryPhoto | null {
  const preferredJewelry = [...accepted]
    .reverse()
    .find((photo) => photo.visualRole === 'jewelry')
  return preferredJewelry ?? accepted[accepted.length - 1] ?? null
}
