import type { TradeBoardIntakePhotoState } from './trade-board-intake-types'
import { photoIsLabel } from './workflow-photo-roles'

/** App-owned uploaded photos, never typed fields, tool URLs or catalog media. */
export function requiredPiecePhotos(photos: readonly TradeBoardIntakePhotoState[] = []) {
  const labels = photos.filter((photo) => Boolean(photo.imageUrl?.trim()) && photoIsLabel(photo) && photo.quality !== 'blocked')
  const jewelry = photos.some((photo) => Boolean(photo.imageUrl?.trim()) && !photoIsLabel(photo) &&
    !labels.some((label) => label.imageUrl === photo.imageUrl))
  return { label: labels.length > 0, jewelry }
}

export function requiredPiecePhotoRequest(
  photos: readonly TradeBoardIntakePhotoState[] = [],
  itemNumber?: string,
  workflowItemNumber?: string,
) {
  // An earlier piece's uploads cannot authorize a typed-only batch item.
  const otherPiece = itemNumber && workflowItemNumber &&
    itemNumber.trim().toUpperCase() !== workflowItemNumber.trim().toUpperCase()
  const present = requiredPiecePhotos(otherPiece ? [] : photos)
  if (present.label && present.jewelry) return null
  return {
    needsAction: 'provide_photos' as const,
    code: present.label ? 'JEWELRY_PHOTO_REQUIRED' : 'LABEL_PHOTO_REQUIRED',
    message: !present.label && !present.jewelry
      ? 'Thanks for those details! Please send a photo of the Bomb Party label and a front photo of the jewelry. You can send them in either order.'
      : !present.label
        ? 'Thanks! I have the jewelry photo. Please send a photo of the Bomb Party label before I save this piece.'
        : 'Thanks! I have the label. Please send a front photo of the jewelry before I save this piece.',
  }
}
