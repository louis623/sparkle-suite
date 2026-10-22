import type { UIMessage } from 'ai'
import {
  decidePieceClose,
  itemNumberFromResumeAsk,
  MOVED_ON_MESSAGE,
  sendPhotoAgainMessage,
  statedItemNumber,
} from '@/lib/nic-nac/piece-task'

export { MOVED_ON_MESSAGE }
import {
  isNegativePhotoConfirmation,
  isPositiveConfirmation,
} from '@/lib/nic-nac/workflows/trade-board-intake-context'

const LOST_PHOTO_YES =
  /want to finish\b|send the photo for\b|not brought into this chat|that earlier photo was not brought|I started a fresh chat/i

const REFUSED_PHOTO =
  /already on\b|belongs with that set|main photo I will save|won'?t use (?:it|that|this)|cannot reuse|can'?t use (?:it|that|this)/i

const DUPLICATE_REFUSAL =
  /already on\b|won'?t use (?:it|that|this)|cannot reuse|can'?t reuse|can'?t use (?:it|that|this)|separate (?:clear[, ]+)?customer-facing photo|own (?:accurate )?jewelry photo/i

const INSIST_ON_PHOTO =
  /\b(yes|yeah|yep|yup|use that photo|use this photo|use the photo)\b/i

const SKIP_AFTER_SAVE =
  /\b(?:don'?t|do not|won'?t|will not)\s+save\b/i

export type KeptPieceDetails = {
  itemNumber?: string | null
  designName?: string | null
  collectionName?: string | null
  material?: string | null
  mainStone?: string | null
  ringSize?: string | null
  rarityClassification?: string | null
}

function previousAssistantText(messages: UIMessage[]): string {
  const latestUser = [...messages].reverse().find((message) => message.role === 'user')
  const latestUserIndex = latestUser ? messages.lastIndexOf(latestUser) : messages.length
  for (let index = latestUserIndex - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message?.role !== 'assistant') continue
    return (
      message.parts
        ?.filter((part) => (part as { type?: string }).type === 'text')
        .map((part) => (part as { text?: string }).text ?? '')
        .join('\n') ?? ''
    )
  }
  return ''
}

function pieceLabel(itemNumber?: string | null): string {
  const item = itemNumber?.trim()
  return item || 'This piece'
}

export function alreadySavedReply(itemNumber?: string | null): string {
  return `${pieceLabel(itemNumber)} is already on your Dance Floor. If you want it removed, say remove it and I'll ask you to confirm.`
}

export function refusedPhotoReply(previousAssistant: string): string {
  const other = previousAssistant.match(/\balready on\s+([A-Za-z]{1,4}\d{3,})\b/i)?.[1]
  if (other) {
    return `I won't use that photo. It's already on ${other.toUpperCase()}. Send a different photo of this piece.`
  }
  return `I won't use that photo. Send a different photo of this piece.`
}

function keptDetailList(known?: KeptPieceDetails | null): string[] {
  return [
    known?.itemNumber?.trim(),
    known?.designName?.trim(),
    known?.collectionName?.trim() ? `${known.collectionName.trim()} collection` : '',
    known?.material?.trim(),
    known?.mainStone?.trim(),
    known?.ringSize?.trim() ? `size ${known.ringSize.trim()}` : '',
    known?.rarityClassification?.trim(),
  ].filter((value): value is string => Boolean(value))
}

export function keptDetailsReply(known?: KeptPieceDetails | null): string {
  const details = keptDetailList(known)
  if (details.length === 0) return 'Send a different photo of this piece.'
  return `I'll keep ${details.join(', ')}. Send a different photo of this piece.`
}

/** The rep replaced a refused photo. Stored details stay, then the new photo is previewed. */
export function acceptedReplacementPhotoReply(known?: KeptPieceDetails | null): string {
  const details = keptDetailList(known)
  const item = known?.itemNumber?.trim() || 'this piece'
  const kept = details.length
    ? `I'll keep ${details.join(', ')}.`
    : `I'll keep the details you already gave.`
  return `${kept} This is the main photo I will save for ${item}. If this is the right piece, reply yes.`
}

export function labelMismatchSentence(labelItemNumber: string, itemNumber: string): string {
  const label = labelItemNumber.trim().toUpperCase()
  const item = itemNumber.trim().toUpperCase()
  return `The label says ${label}. I won't save it on ${item}. Send the label for ${item}.`
}

/**
 * Answers that must not depend on the model. A bare yes to a real photo
 * preview is left alone so that save can still happen.
 */
function labelNamedInText(text: string): string | null {
  const match = text.match(
    /\blabel\s+(?:says|reads|shows|said|is)\s+([A-Za-z]{1,4}\d{3,})\b/i,
  )
  return match?.[1] ? match[1].toUpperCase() : null
}

function insistsSavedLabelIsFine(text: string): boolean {
  return (
    /\blabel is fine\b/i.test(text) ||
    (/\bsave it\b/i.test(text) && Boolean(statedItemNumber(text)))
  )
}

function sendingReplacementPhoto(text: string): boolean {
  return (
    /\bhere'?s the (?:right|correct) photo\b/i.test(text) ||
    (/\b(?:no|nope)\b/i.test(text) &&
      /\b(?:not right|wrong piece|wrong photo|right photo)\b/i.test(text))
  )
}

export function directPieceReply(args: {
  messages: UIMessage[]
  latestUserText: string
  latestUserHasImage: boolean
  known?: KeptPieceDetails | null
  /** True when this item number already has a Dance Floor listing. */
  listingExists?: boolean
  labelItemNumber?: string | null
}): string | null {
  const previous = previousAssistantText(args.messages)
  const text = args.latestUserText.trim()
  if (!text) return null
  if (!previous && !args.listingExists && !args.labelItemNumber) return null

  const skipping =
    decidePieceClose(text) === 'skipped' ||
    decidePieceClose(text) === 'cancelled' ||
    SKIP_AFTER_SAVE.test(text)
  if (skipping && args.listingExists) {
    return alreadySavedReply(
      statedItemNumber(text) ?? statedItemNumber(previous) ?? args.known?.itemNumber,
    )
  }

  const storedLabel = args.labelItemNumber?.trim().toUpperCase() || ''
  const namedLabel = labelNamedInText(previous)
  const label = storedLabel || namedLabel || ''
  const insistItem = statedItemNumber(text) ?? args.known?.itemNumber?.trim().toUpperCase()
  if (
    !args.latestUserHasImage &&
    label &&
    insistItem &&
    label !== insistItem &&
    insistsSavedLabelIsFine(text)
  ) {
    return labelMismatchSentence(label, insistItem)
  }

  if (
    args.latestUserHasImage &&
    (sendingReplacementPhoto(text) ||
      (DUPLICATE_REFUSAL.test(previous) && /\b(?:no|nope)\b/i.test(text)) ||
      LOST_PHOTO_YES.test(previous))
  ) {
    return acceptedReplacementPhotoReply(args.known)
  }

  if (!args.latestUserHasImage && DUPLICATE_REFUSAL.test(previous) && INSIST_ON_PHOTO.test(text)) {
    return refusedPhotoReply(previous)
  }

  if (
    !args.latestUserHasImage &&
    isPositiveConfirmation(text) &&
    LOST_PHOTO_YES.test(previous)
  ) {
    return sendPhotoAgainMessage(
      itemNumberFromResumeAsk(previous) ?? statedItemNumber(previous),
    )
  }

  if (
    !args.latestUserHasImage &&
    isNegativePhotoConfirmation(text) &&
    REFUSED_PHOTO.test(previous)
  ) {
    return keptDetailsReply(args.known)
  }

  return null
}

const SAVED_PHOTO_DISPUTE =
  /saved the wrong|wrong image was saved|you saved the wrong|that saved photo|photo you saved/i

/** Check the listing photo before agreeing a saved image was wrong. Do not confess. */
export function savedPhotoDisputeReply(args: {
  latestUserText: string
  listingPhotoUrl?: string | null
}): string | null {
  if (!SAVED_PHOTO_DISPUTE.test(args.latestUserText)) return null
  const url = args.listingPhotoUrl?.trim()
  if (!url) {
    return "I checked, and there isn't a saved Dance Floor photo to compare. I didn't change anything."
  }
  return "I checked the photo saved on your Dance Floor. It is still the photo on that listing, and I didn't change it."
}

type PreviewPart = {
  type?: string
  text?: string
  output?: {
    needsAction?: string
    message?: string
    previewImageUrl?: string
    previewPhotoId?: string
    code?: string
  }
}

function asksToConfirmSave(text: string): boolean {
  return /reply\s+["“']?yes\b|i(?:'|’)ll add it|i will add it/i.test(text)
}

/** An old chat's reply-yes card cannot save the piece after the chat moved on. */
export function retireSupersededPreviews<T extends { role?: string; parts?: unknown }>(
  messages: T[],
): T[] {
  return messages.map((message) => {
    if (message.role !== 'assistant' || !Array.isArray(message.parts)) return message
    let changed = false
    const parts = message.parts.map((part) => {
      if (!part || typeof part !== 'object') return part
      const record = part as PreviewPart
      if (record.type === 'text' && typeof record.text === 'string' && asksToConfirmSave(record.text)) {
        changed = true
        return { ...record, text: MOVED_ON_MESSAGE }
      }
      const output = record.output
      const actionable =
        output?.needsAction === 'confirm_main_photo' ||
        asksToConfirmSave(output?.message ?? '')
      if (!output || !actionable) return part
      changed = true
      return {
        ...record,
        output: {
          ...output,
          needsAction: undefined,
          previewImageUrl: undefined,
          previewPhotoId: undefined,
          message: MOVED_ON_MESSAGE,
        },
      }
    })
    if (!changed) return message
    const hasText = parts.some(
      (part) =>
        Boolean(part) &&
        typeof part === 'object' &&
        (part as PreviewPart).type === 'text',
    )
    return {
      ...message,
      parts: hasText ? parts : [...parts, { type: 'text', text: MOVED_ON_MESSAGE }],
    }
  })
}
