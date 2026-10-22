import { isPositiveConfirmation } from '@/lib/nic-nac/workflows/trade-board-intake-context'

/**
 * A save is allowed only after a previous turn showed a preview for this
 * upload and the rep's next message is an affirmative with no new photo.
 * Callers that do not pass the current turn (older tests and scripts) keep
 * the stored confirmation behavior.
 */
export function turnBlocksCustomerFacingSave(args: {
  latestUserText?: string | null
  latestUserHasImage?: boolean
  confirmedPhotoId?: string | null
  savingPhotoId?: string | null
}): boolean {
  const text = args.latestUserText?.trim() ?? ''
  if (!text && !args.latestUserHasImage) return false
  if (args.latestUserHasImage) return true
  if (!isPositiveConfirmation(text)) return true
  const confirmed = args.confirmedPhotoId?.trim() ?? ''
  const saving = args.savingPhotoId?.trim() ?? ''
  if (!confirmed || !saving || confirmed !== saving) return true
  return false
}

/** A bare yes after a shown preview commits the stored piece. A fresh-chat resume does not. */
export function yesCommitsPreviewedPhoto(args: {
  latestUserText?: string | null
  latestUserHasImage?: boolean
  previewPhotoId?: string | null
  previousAssistantText?: string | null
}): boolean {
  if (args.latestUserHasImage) return false
  if (!args.previewPhotoId?.trim()) return false
  const previous = args.previousAssistantText ?? ''
  if (
    /want to finish\b|send the photo for\b|not brought into this chat|that earlier photo was not brought|I started a fresh chat/i.test(
      previous,
    )
  ) {
    return false
  }
  return isPositiveConfirmation(args.latestUserText ?? '')
}

export function shownMainPhotoPreviewId(
  messages: Array<{ role?: string; parts?: unknown[] | null }>,
): string | null {
  const latestUserIndex = [...messages]
    .map((message, index) => ({ message, index }))
    .reverse()
    .find((entry) => entry.message.role === 'user')?.index
  if (latestUserIndex === undefined) return null
  for (let index = latestUserIndex - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message?.role !== 'assistant') continue
    for (const part of message.parts ?? []) {
      if (!part || typeof part !== 'object') continue
      const output = (part as { output?: { needsAction?: unknown; previewPhotoId?: unknown } })
        .output
      if (output?.needsAction !== 'confirm_main_photo') continue
      const id = typeof output.previewPhotoId === 'string' ? output.previewPhotoId.trim() : ''
      if (id) return id
    }
    return null
  }
  return null
}
