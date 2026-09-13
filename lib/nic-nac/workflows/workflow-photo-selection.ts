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
  const isAccepted = (photo: WorkflowJewelryPhoto | undefined): photo is WorkflowJewelryPhoto =>
    Boolean(photo &&
      photo.declaredRole === 'jewelry_front' &&
      photo.quality !== 'blocked' &&
      photo.imageUrl)
  const accepted = allPhotos.filter(
    (photo) =>
      isAccepted(photo),
  )
  if (selection.selectedPhotoId) {
    return accepted.find((photo) => photo.id === selection.selectedPhotoId) ?? null
  }
  if (selection.modelIndex !== undefined) {
    const modelIndexed = allPhotos[selection.modelIndex - 1]
    if (isAccepted(modelIndexed)) return modelIndexed
    return accepted.find((photo) => photo.attachmentIndex === selection.modelIndex) ?? null
  }
  return accepted[accepted.length - 1] ?? null
}
