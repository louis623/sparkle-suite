import type { UIMessage } from 'ai'

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

export function buildNicNacRolloverMessages(
  messages: UIMessage[],
  limit = NIC_NAC_ROLLOVER_TAIL_MESSAGES,
): UIMessage[] {
  const tail = messages.slice(-Math.max(1, limit))
  return tail.map((message, index) => {
    const carried = withoutCarriedPhotoFiles(message)
    return {
      ...carried,
      id: `rollover-${index}-${message.id.slice(-64)}`,
    }
  })
}
