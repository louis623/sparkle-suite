import type { UIMessage } from 'ai'
import { unfinishedPieceQuestion } from '@/lib/nic-nac/piece-task'

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

function withoutPendingPiece(message: UIMessage): UIMessage {
  const parts = (message.parts ?? []).filter(
    (part) => !isPendingPhotoConfirmationPart(part),
  )
  if (parts.length > 0) return { ...message, parts }
  return {
    ...message,
    parts: [
      {
        type: 'text',
        text: 'The unfinished piece was not brought into this chat.',
      },
    ],
  }
}

export function buildNicNacRolloverMessages(
  messages: UIMessage[],
  limit = NIC_NAC_ROLLOVER_TAIL_MESSAGES,
  options?: { dropPendingPiece?: boolean; unfinishedItemNumber?: string | null },
): UIMessage[] {
  const tail = messages.slice(-Math.max(1, limit))
  const rolled = tail.map((message, index) => {
    const carried = withoutCarriedPhotoFiles(message)
    const visible = options?.dropPendingPiece
      ? withoutPendingPiece(carried)
      : carried
    return {
      ...visible,
      id: `rollover-${index}-${message.id.slice(-64)}`,
    }
  })
  if (!options || !('unfinishedItemNumber' in options)) return rolled
  return [
    {
      id: 'rollover-finish-ask',
      role: 'assistant',
      parts: [
        {
          type: 'text',
          text: unfinishedPieceQuestion(options.unfinishedItemNumber),
        },
      ],
    },
    ...rolled,
  ]
}
