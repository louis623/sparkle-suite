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

function pickPreferredCustomerFacingPhoto(
  accepted: WorkflowJewelryPhoto[],
): WorkflowJewelryPhoto | null {
  const preferredJewelry = [...accepted]
    .reverse()
    .find((photo) => photo.visualRole === 'jewelry')
  return preferredJewelry ?? accepted[accepted.length - 1] ?? null
}
