import { lastShownMainPhotoPreview } from './main-photo-preview'
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

/** A remove or delete question is not a photo preview. A yes does not answer it. */
export function assistantAsksToRemove(text: string): boolean {
  return /remove those|remove these|delete those|delete these|want me to remove|listed dance floor items/i.test(
    text,
  )
}

export function confirmationAlreadyUsed(args: {
  submittedMessageId?: string | null
  previewPhotoId?: string | null
  usedMessageIds?: unknown
  committedPreviewPhotoId?: unknown
}): boolean {
  const submitted = args.submittedMessageId?.trim() ?? ''
  const preview = args.previewPhotoId?.trim() ?? ''
  const used = Array.isArray(args.usedMessageIds)
    ? args.usedMessageIds.filter((id): id is string => typeof id === 'string')
    : []
  if (submitted && used.includes(submitted)) return true
  const committed =
    typeof args.committedPreviewPhotoId === 'string'
      ? args.committedPreviewPhotoId.trim()
      : ''
  return Boolean(preview && committed && preview === committed)
}

/**
 * A bare yes after a shown preview commits the stored piece.
 * When the route passes the client message id, that id must be the message
 * the rep just submitted. A replay, an automatic continuation, or a remove
 * question does not commit. Callers that omit the id keep the older check.
 */
export function yesCommitsPreviewedPhoto(args: {
  latestUserText?: string | null
  latestUserHasImage?: boolean
  previewPhotoId?: string | null
  previousAssistantText?: string | null
  submittedMessageId?: string | null
  latestUserMessageId?: string | null
}): boolean {
  if (args.latestUserHasImage) return false
  if (!args.previewPhotoId?.trim()) return false
  if (
    args.submittedMessageId !== undefined ||
    args.latestUserMessageId !== undefined
  ) {
    const submitted = args.submittedMessageId?.trim() ?? ''
    const latest = args.latestUserMessageId?.trim() ?? ''
    if (!submitted || !latest || submitted !== latest) return false
  }
  const previous = args.previousAssistantText ?? ''
  if (assistantAsksToRemove(previous)) return false
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
  photos: Array<{ id?: string; imageUrl?: string }> = [],
): string | null {
  return lastShownMainPhotoPreview(messages, photos).id
}
