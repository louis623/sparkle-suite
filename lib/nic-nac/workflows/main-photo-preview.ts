const MAX_SHORT_PREVIEW_URL_CHARS = 500
const SAFE_PHOTO_ID = /^[A-Za-z0-9_-]{1,80}$/
const INTAKE_PHOTO_PATH = /^\/api\/nic-nac\/intake-photos\/([A-Za-z0-9_-]{1,80})$/

function projectStorageHosts(): string[] {
  const hosts: string[] = []
  for (const raw of [process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_URL]) {
    const trimmed = raw?.trim()
    if (!trimmed) continue
    try {
      const host = new URL(trimmed).host
      if (host && !hosts.includes(host)) hosts.push(host)
    } catch {
      // Ignore a malformed env value and keep the other host, if any.
    }
  }
  return hosts
}

/** A preview image may be this project's storage object, and nothing else on the public web. */
function isProjectStorageObjectUrl(url: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  if (parsed.protocol !== 'https:') return false
  if (parsed.username !== '' || parsed.password !== '') return false
  if (!projectStorageHosts().includes(parsed.host)) return false
  return parsed.pathname.startsWith('/storage/v1/object/')
}

function intakePhotoPreviewPath(url: string | null | undefined): string | null {
  if (!url) return null
  const match = INTAKE_PHOTO_PATH.exec(url.trim())
  if (!match) return null
  return `/api/nic-nac/intake-photos/${match[1]}`
}

export function isShortHttpsPreviewUrl(url: string | null | undefined): url is string {
  if (!url) return false
  const trimmed = url.trim()
  if (!trimmed || trimmed.length > MAX_SHORT_PREVIEW_URL_CHARS) return false
  if (/^data:/i.test(trimmed)) return false
  return isProjectStorageObjectUrl(trimmed)
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
  if (isShortHttpsPreviewUrl(output.previewImageUrl)) {
    return new URL(output.previewImageUrl.trim()).href
  }
  const intakePath = intakePhotoPreviewPath(output.previewImageUrl)
  if (intakePath) return intakePath
  const id = output.previewPhotoId?.trim()
  if (id && SAFE_PHOTO_ID.test(id)) {
    return `/api/nic-nac/intake-photos/${encodeURIComponent(id)}`
  }
  return null
}

/** Last visible preview in the assistant turn immediately before the submitted user turn.
 * Tool state and prose can occupy separate assistant messages. Never cross a user turn.
 */
export function lastShownMainPhotoPreview(
  messages: Array<{ role?: string; parts?: unknown[] | null }>,
  photos: Array<{ id?: string; imageUrl?: string }> = [],
): { shown: boolean; id: string | null } {
  const latestUser = messages.findLastIndex(message => message.role === 'user')
  for (let index = latestUser - 1; index >= 0; index--) {
    const message = messages[index]
    if (message.role === 'user') break
    if (message.role !== 'assistant') continue
    for (const part of [...(message.parts ?? [])].reverse()) {
      const output = (part as { output?: { needsAction?: string; code?: string; previewPhotoId?: string; previewImageUrl?: string } } | null)?.output
      if (!output || (output.needsAction !== 'confirm_main_photo' &&
        !(output.code === 'PHOTO_REUSED_ON_OTHER_ITEM' && (output.previewPhotoId || output.previewImageUrl)))) continue
      const id = typeof output.previewPhotoId === 'string' ? output.previewPhotoId.trim() : ''
      const url = typeof output.previewImageUrl === 'string' ? output.previewImageUrl.trim() : ''
      // URL-only previews must identify an actual stored upload, never an arbitrary URL.
      const stored = !id && url ? photos.find(photo => photo.imageUrl === url ||
        (photo.id && url === '/api/nic-nac/intake-photos/' + photo.id)) : undefined
      return { shown: true, id: id || stored?.id || null }
    }
  }
  return { shown: false, id: null }
}
