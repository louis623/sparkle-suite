import {
  normalizeJewelryMainStoneKey,
  normalizeJewelryMaterialKey,
} from '@/lib/services/jewelry-database'
import {
  isAcceptedCustomerFacingWorkflowPhoto,
  photoRefusedAsMainPhoto,
  stampSoleReadinessJewelryFrontCandidate,
} from './workflow-photo-roles'

export type PiecePhotoNumberDecision =
  | { status: 'use'; photo: WorkflowJewelryPhoto }
  | { status: 'confirmed-front' }
  | { status: 'ask'; photoCount: number; message: string }

export interface WorkflowJewelryPhoto {
  id?: string
  intakeSessionId?: string
  attachmentIndex: number
  declaredRole: string
  visualRole: string
  quality: string
  imageUrl?: string
  notes?: string[]
}

export interface WorkflowPhotoSelection {
  selectedPhotoId?: string
  modelIndex?: number
  intakeSessionId?: string
}

/**
 * A photo belongs to the piece whose intake recorded it. Chat position is
 * not identity. Photos that have not been stamped yet stay eligible so older
 * in-memory fixtures keep working.
 */
export function scopeWorkflowPhotosToIntake<T extends { intakeSessionId?: string }>(
  photos: T[] | null | undefined,
  intakeSessionId?: string,
): T[] {
  const allPhotos = photos ?? []
  if (!intakeSessionId) return allPhotos
  return allPhotos.filter(
    (photo) => !photo.intakeSessionId || photo.intakeSessionId === intakeSessionId,
  )
}

export function conversationImagesForIntake<T extends { url?: string }>(
  images: T[],
  intakePhotos: Array<{ imageUrl?: string; intakeSessionId?: string }> | null | undefined,
  intakeSessionId?: string,
): T[] {
  if (!intakeSessionId) return images
  const urls = new Set(
    scopeWorkflowPhotosToIntake(intakePhotos, intakeSessionId)
      .map((photo) => photo.imageUrl)
      .filter((url): url is string => Boolean(url)),
  )
  return images.filter((image) => Boolean(image.url && urls.has(image.url)))
}

export function selectWorkflowJewelryPhoto(
  photos: WorkflowJewelryPhoto[] | null | undefined,
  selection: WorkflowPhotoSelection,
): WorkflowJewelryPhoto | null {
  const scoped = scopeWorkflowPhotosToIntake(photos, selection.intakeSessionId)
  const allPhotos = stampSoleReadinessJewelryFrontCandidate(scoped)
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
  selection: WorkflowPhotoSelection = {},
): WorkflowJewelryPhoto | null {
  if (selection.selectedPhotoId) {
    const refused = scopeWorkflowPhotosToIntake(photos, selection.intakeSessionId).find(
      (photo) =>
        photo.id === selection.selectedPhotoId &&
        photoRefusedAsMainPhoto(photo),
    )
    if (refused) return null
  }
  const selected = selectWorkflowJewelryPhoto(photos, selection)
  if (selected) return selected
  // Stay on this intake. A bad id or an in-range number that is not the
  // jewelry photo falls back to the confirmed front. An out-of-range number
  // never reaches this helper.
  if (selection.selectedPhotoId || selection.modelIndex !== undefined) {
    return selectWorkflowJewelryPhoto(photos, {
      intakeSessionId: selection.intakeSessionId,
    })
  }
  return null
}

export function resolvePiecePhotoNumber(
  photos: WorkflowJewelryPhoto[] | null | undefined,
  photoNumber: number,
  intakeSessionId?: string,
): PiecePhotoNumberDecision {
  const piecePhotos = scopeWorkflowPhotosToIntake(photos, intakeSessionId)
  const photo = piecePhotos[photoNumber - 1]
  if (!photo) {
    return {
      status: 'ask',
      photoCount: piecePhotos.length,
      message: piecePhotoNumberAsk(photoNumber, piecePhotos.length),
    }
  }
  if (isAcceptedCustomerFacingWorkflowPhoto(photo)) {
    return { status: 'use', photo }
  }
  return { status: 'confirmed-front' }
}

function piecePhotoNumberAsk(photoNumber: number, count: number): string {
  const noun = count === 1 ? 'photo' : 'photos'
  return `I have ${count} ${noun} for this piece, so photo ${photoNumber} doesn't match. Which one should be the main photo?`
}

export function hasUsableWorkflowJewelryPhoto(
  photos: WorkflowJewelryPhoto[] | null | undefined,
  selection: WorkflowPhotoSelection = {},
): boolean {
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

function pickPreferredCustomerFacingPhoto(
  accepted: WorkflowJewelryPhoto[],
): WorkflowJewelryPhoto | null {
  const preferredJewelry = [...accepted]
    .reverse()
    .find((photo) => photo.visualRole === 'jewelry')
  return preferredJewelry ?? accepted[accepted.length - 1] ?? null
}
