import type { UIMessage } from 'ai'
import {
  decidePieceClose,
  freshChatNotice,
  itemNumberFromResumeAsk,
} from '@/lib/nic-nac/piece-task'
import { extractKnownFieldsFromText } from '@/lib/nic-nac/workflows/trade-board-known-fields'

export const LOST_PHOTO_NOTE = 'That earlier photo was not brought into this chat.'

export const NIC_NAC_ROLLOVER_TAIL_MESSAGES = 12

export type NicNacConversationRunHealth = {
  rolloverRecommended?: boolean | null
  rolloverReasons?: string[] | null
} | null | undefined

export function shouldStartNicNacRollover(
  runHealth: NicNacConversationRunHealth,
): boolean {
  if (runHealth?.rolloverRecommended !== true) return false

  // Latency is operational telemetry, not evidence that conversation context
  // needs replacement. Requiring a concrete context/token reason also keeps
  // historical latency-only health rows from triggering a late rollover.
  return (runHealth.rolloverReasons ?? []).some(
    (reason) => reason !== 'slow_response',
  )
}

function isImageFilePart(part: unknown): boolean {
  if (!part || typeof part !== 'object') return false
  const file = part as { type?: string; mediaType?: string }
  return (
    file.type === 'file' &&
    typeof file.mediaType === 'string' &&
    file.mediaType.startsWith('image/')
  )
}

function withoutCarriedPhotoFiles(message: UIMessage): UIMessage {
  const parts = (message.parts ?? []).filter((part) => !isImageFilePart(part))
  if (parts.length > 0) return { ...message, parts }
  return {
    ...message,
    parts: [
      {
        type: 'text',
        text: 'Earlier photo not brought over. Send it again if this piece needs it.',
      },
    ],
  }
}

export function shouldCarryTradeBoardIntakeOnRollover(
  _session:
    | {
        status?: string | null
        metadata?: Record<string, unknown> | null
      }
    | null
    | undefined,
): boolean {
  // A fresh chat never inherits photos, labels, or confirmation state.
  // An unfinished piece is asked about in plain text instead.
  return false
}

function isPendingPhotoConfirmationPart(part: unknown): boolean {
  if (!part || typeof part !== 'object') return false
  const output = (part as { output?: { needsAction?: string; code?: string } }).output
  if (!output) return false
  if (output.needsAction === 'confirm_main_photo') return true
  return output.code === 'PHOTO_REUSED_ON_OTHER_ITEM'
}

function messageText(message: UIMessage): string {
  return (message.parts ?? [])
    .filter((part) => (part as { type?: string }).type === 'text')
    .map((part) => (part as { text?: string }).text ?? '')
    .join('\n')
}

function assistantClaimsLostPhoto(message: UIMessage): boolean {
  if (message.role !== 'assistant') return false
  if ((message.parts ?? []).some((part) => isPendingPhotoConfirmationPart(part))) {
    return true
  }
  return /main photo I will save|belongs with that set|recent photos in this add flow|couldn't use photo|I (?:have|got|see|received) (?:the |your )?(?:photo|picture|image)|photo you sent/i.test(
    messageText(message),
  )
}

function withoutLostPhotoClaims(message: UIMessage): UIMessage {
  if (!assistantClaimsLostPhoto(message)) return message
  const parts = (message.parts ?? []).filter(
    (part) =>
      !isImageFilePart(part) &&
      !isPendingPhotoConfirmationPart(part) &&
      (part as { type?: string }).type !== 'text',
  )
  return {
    ...message,
    parts: [{ type: 'text', text: LOST_PHOTO_NOTE }, ...parts],
  }
}

function photoOnlyMessage(message: UIMessage): boolean {
  const parts = message.parts ?? []
  if (parts.length === 0) return false
  return parts.every((part) => isImageFilePart(part))
}

function isStandaloneLostPhotoNotice(message: UIMessage): boolean {
  return messageText(message).trim() === LOST_PHOTO_NOTE
}

export type RolloverCarryDetails = {
  itemNumber: string
  ringSize?: string | null
  rarity?: string | null
  material?: string | null
  mainStone?: string | null
  designName?: string | null
  collectionName?: string | null
  jewelryType?: string | null
}

export type RolloverKnownFields = {
  itemNumber?: string | null
  ringSize?: string | null
  rarityClassification?: string | null
  material?: string | null
  mainStone?: string | null
  designName?: string | null
  collectionName?: string | null
  jewelryType?: string | null
}

function itemNumbersIn(text: string): string[] {
  return (text.match(/\b[A-Za-z]{1,4}\d{3,}\b/g) ?? []).map((value) => value.toUpperCase())
}

/**
 * The newest piece that was started and not saved or skipped.
 * A saved Dance Floor line closes only that item. Photos are irrelevant.
 */
export function unfinishedPieceFromMessages(messages: UIMessage[]): string | null {
  let open: string | null = null
  for (const message of messages) {
    const text = messageText(message)
    const items = itemNumbersIn(text)
    if (!text.trim() || items.length === 0) continue
    if (message.role === 'assistant' && /dance floor/i.test(text)) {
      if (open && items.includes(open)) open = null
      continue
    }
    if (message.role === 'user' && decidePieceClose(text)) {
      const item = items[0]
      if (!open || !item || item === open) open = null
      continue
    }
    if (
      message.role === 'assistant' &&
      /main photo I will save|want to finish/i.test(text)
    ) {
      open = itemNumberFromResumeAsk(text) || items[0] || open
      continue
    }
    if (message.role === 'user') open = items[0] ?? open
  }
  return open
}

/** Stored intake wins when it is the open piece. Otherwise the messages decide. */
export function carryForNicNacRollover(args: {
  messages: UIMessage[]
  known?: RolloverKnownFields | null
}): RolloverCarryDetails | null {
  const fromMessages = unfinishedPieceFromMessages(args.messages)
  const stored = args.known?.itemNumber?.trim().toUpperCase() || null
  const item = fromMessages || stored
  if (!item) return null
  const text = args.messages
    .filter((message) => message.role === 'user')
    .map((message) => messageText(message))
    .filter((line) => line.toUpperCase().includes(item))
    .join('\n')
  const extracted = text.trim() ? extractKnownFieldsFromText(text) : {}
  const storedKnown = stored === item ? args.known : null
  return {
    itemNumber: item,
    ringSize: storedKnown?.ringSize || extracted.ringSize || null,
    rarity: storedKnown?.rarityClassification || extracted.rarityClassification || null,
    material: storedKnown?.material || extracted.material || null,
    mainStone: storedKnown?.mainStone || extracted.mainStone || null,
    designName: storedKnown?.designName || extracted.designName || null,
    collectionName: storedKnown?.collectionName || extracted.collectionName || null,
    jewelryType: storedKnown?.jewelryType || extracted.jewelryType || null,
  }
}

export function prepareNicNacRolloverMessages(
  messages: UIMessage[],
  known?: RolloverKnownFields | null,
): { messages: UIMessage[]; carry: RolloverCarryDetails | null } {
  const carry = carryForNicNacRollover({ messages, known })
  return {
    carry,
    messages: buildNicNacRolloverMessages(messages, undefined, {
      dropPendingPiece: true,
      ...(carry
        ? {
            unfinishedItemNumber: carry.itemNumber,
            carriedDetails: {
              ringSize: carry.ringSize,
              rarity: carry.rarity,
              material: carry.material,
              mainStone: carry.mainStone,
              designName: carry.designName,
              collectionName: carry.collectionName,
            },
          }
        : {}),
    }),
  }
}

export function buildNicNacRolloverMessages(
  messages: UIMessage[],
  limit = NIC_NAC_ROLLOVER_TAIL_MESSAGES,
  options?: {
    dropPendingPiece?: boolean
    unfinishedItemNumber?: string | null
    carriedDetails?: {
      ringSize?: string | null
      rarity?: string | null
      material?: string | null
      mainStone?: string | null
      designName?: string | null
      collectionName?: string | null
    }
  },
): UIMessage[] {
  const tail = messages.slice(-Math.max(1, limit))
  const keepClaims = options?.dropPendingPiece === false
  const rolled = tail.flatMap((message, index) => {
    if (
      !keepClaims &&
      (assistantClaimsLostPhoto(message) ||
        photoOnlyMessage(message) ||
        isStandaloneLostPhotoNotice(message))
    ) {
      return []
    }
    const carried = withoutCarriedPhotoFiles(message)
    return [
      {
        ...carried,
        id: `rollover-${index}-${message.id.slice(-64)}`,
      },
    ]
  })
  const mentionFreshChat =
    !keepClaims &&
    (Boolean(options && 'unfinishedItemNumber' in options) ||
      rolled.length !== tail.length)
  const details = options?.carriedDetails
  const ordered = mentionFreshChat
    ? [
        ...rolled,
        {
          id: 'rollover-finish-ask',
          role: 'assistant' as const,
          parts: [
            {
              type: 'text' as const,
              text: freshChatNotice({
                itemNumber: options?.unfinishedItemNumber,
                ringSize: details?.ringSize,
                rarity: details?.rarity,
                material: details?.material,
                mainStone: details?.mainStone,
                designName: details?.designName,
                collectionName: details?.collectionName,
              }),
            },
          ],
        },
      ]
    : rolled
  return stampRolloverOrder(ordered)
}

/** The fresh-chat notice is strictly newest, so a later yes cannot land on an older reply. */
function stampRolloverOrder(messages: UIMessage[]): UIMessage[] {
  const base = Date.now()
  return messages.map((message, index) => ({
    ...message,
    metadata: {
      ...((message.metadata as Record<string, unknown> | undefined) ?? {}),
      created_at: new Date(base + index).toISOString(),
    },
  }))
}
