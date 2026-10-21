const MAX_SHORT_PREVIEW_URL_CHARS = 500
const SAFE_PHOTO_ID = /^[A-Za-z0-9_-]{1,80}$/

export function isShortHttpsPreviewUrl(url: string | null | undefined): url is string {
  if (!url) return false
  const trimmed = url.trim()
  if (!trimmed || trimmed.length > MAX_SHORT_PREVIEW_URL_CHARS) return false
  if (/^data:/i.test(trimmed)) return false
  return /^https:\/\//i.test(trimmed)
}

export function mainPhotoPreviewLocator(photo: {
  id?: string | null
  imageUrl?: string | null
}): { previewPhotoId?: string; previewImageUrl?: string } {
  const previewPhotoId = photo.id?.trim() || undefined
  const imageUrl = photo.imageUrl?.trim()
  const previewImageUrl = isShortHttpsPreviewUrl(imageUrl) ? imageUrl.trim() : undefined
  return {
    ...(previewPhotoId ? { previewPhotoId } : {}),
    ...(previewImageUrl ? { previewImageUrl } : {}),
  }
}

export function photoPreviewIsVisible(
  output:
    | {
        previewPhotoId?: string | null
        previewImageUrl?: string | null
      }
    | null
    | undefined,
): boolean {
  return mainPhotoPreviewSrc(output) !== null
}

export function mainPhotoPreviewSrc(
  output:
    | {
        previewPhotoId?: string | null
        previewImageUrl?: string | null
      }
    | null
    | undefined,
): string | null {
  if (!output) return null
  if (isShortHttpsPreviewUrl(output.previewImageUrl)) return output.previewImageUrl.trim()
  const id = output.previewPhotoId?.trim()
  if (id && SAFE_PHOTO_ID.test(id)) {
    return `/api/nic-nac/intake-photos/${encodeURIComponent(id)}`
  }
  return null
}
