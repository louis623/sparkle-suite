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
 * Shared catalog canonical photos are a last-resort fallback.
 * A confirmed jewelry-front workflow photo, or an explicit listing photo URL,
 * always wins. This is the path that kept Kelly's Dance Floor on a reused
 * inventory-label canonical after delete/re-upload.
 */
export function shouldFallBackToCatalogCanonicalPhoto(args: {
  listingPhotoUrl?: string | null
  hasWorkflowJewelryPhoto: boolean
  catalogHasCanonicalPhoto: boolean
}): boolean {
  if (!args.catalogHasCanonicalPhoto) return false
  if (args.listingPhotoUrl?.trim()) return false
  if (args.hasWorkflowJewelryPhoto) return false
  return true
}

function pickPreferredCustomerFacingPhoto(
  accepted: WorkflowJewelryPhoto[],
): WorkflowJewelryPhoto | null {
  const preferredJewelry = [...accepted]
    .reverse()
    .find((photo) => photo.visualRole === 'jewelry')
  return preferredJewelry ?? accepted[accepted.length - 1] ?? null
}
