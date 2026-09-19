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
 * Shared catalog canonical photos are a last-resort fallback for ONE matched
 * catalog variant (design id = item number + finish/material + main stone).
 * A confirmed jewelry-front workflow photo, or an explicit listing photo URL,
 * always wins for that listing. Never treat "same item number" as permission
 * to copy another variant's or listing's photo.
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

/** PhotoRoom / upload identity for one catalog variant. Item number alone is not enough. */
export function catalogVariantPhotoAssetKey(args: {
  designId?: string | null
  material?: string | null
  mainStone?: string | null
}): string | undefined {
  const designId = args.designId?.trim()
  if (designId) return designId
  const material = args.material?.trim().toLowerCase().replace(/\s+/g, '-')
  const mainStone = args.mainStone?.trim().toLowerCase().replace(/\s+/g, '-')
  const variant = [material, mainStone].filter(Boolean).join('--')
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
