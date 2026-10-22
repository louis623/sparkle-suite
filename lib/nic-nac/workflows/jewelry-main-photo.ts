import { readLabelPhoto } from '@/lib/nic-nac/workflows/label-item-number'
import { TURNED_DOWN_MAIN_PHOTO_NOTE } from '@/lib/nic-nac/workflows/workflow-photo-roles'

type RolePhoto = {
  imageUrl?: string
  declaredRole: string
  visualRole: string
  notes?: string[]
  quality?: string
}

/**
 * A photo that prints an item number is the label when another photo is in
 * the same turn. The other photo is the jewelry shot, even if the visual
 * classifier swapped them. Every photo that prints a number stays a label.
 */
export async function correctJewelryVersusLabelPhotos<T extends RolePhoto>(
  photos: T[],
): Promise<T[]> {
  if (photos.length < 2) return photos
  const reads = await Promise.all(
    photos.map(async (photo) => {
      try {
        return await readLabelPhoto(photo.imageUrl)
      } catch {
        return { outcome: 'not_attempted' as const, itemNumbers: [] as string[] }
      }
    }),
  )
  const printsItemNumber = reads.map(
    (read) => read.outcome === 'read' && read.itemNumbers.length > 0,
  )
  if (!printsItemNumber.some(Boolean)) return photos
  return photos.map((photo, index) => {
    if (printsItemNumber[index]) {
      return {
        ...photo,
        declaredRole: 'label_details',
        visualRole: 'label_or_packaging',
      }
    }
    if (printsItemNumber.every(Boolean)) return photo
    if (photo.quality === 'blocked') return photo
    if (photo.notes?.includes(TURNED_DOWN_MAIN_PHOTO_NOTE)) return photo
    if (photo.declaredRole === 'jewelry_front') return photo
    return {
      ...photo,
      declaredRole: 'jewelry_front',
      visualRole: 'jewelry',
    }
  })
}

/**
 * A photo sent again after "send the photo again" is this piece's photo.
 * A printed label stays a label. A blurry photo stays blocked.
 */
export function acceptResentProductPhoto<
  T extends {
    declaredRole: string
    visualRole: string
    quality?: string
    qualityIssues?: string[]
    roleConfirmed?: boolean
    notes?: string[]
  },
>(photo: T): T {
  if (
    photo.visualRole === 'label_or_packaging' ||
    photo.declaredRole === 'label_details'
  ) {
    return photo
  }
  const blurry = (photo.qualityIssues ?? []).includes('blur_risk')
  if (blurry) {
    return {
      ...photo,
      declaredRole: 'jewelry_front',
      roleConfirmed: true,
      quality: 'blocked',
    }
  }
  return {
    ...photo,
    declaredRole: 'jewelry_front',
    visualRole: photo.visualRole === 'uncertain' ? 'jewelry' : photo.visualRole,
    roleConfirmed: true,
    quality: photo.quality === 'blocked' || !photo.quality ? 'usable' : photo.quality,
    notes: [...(photo.notes ?? []), 'resent jewelry photo'],
  }
}

/** Prefer a photo that did not read as a label. A lone photo stays usable. */
export function pickNonLabelImageUrl(
  urls: string[],
  labelUrls: ReadonlySet<string>,
): string | undefined {
  const jewelry = urls.find((url) => url && !labelUrls.has(url))
  if (jewelry) return jewelry
  return urls.length === 1 ? urls[0] : undefined
}
