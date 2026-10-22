import type { UIMessage } from 'ai'

const SHORT_CONFIRMATION =
  /^\s*(?:yes|yep|yeah|yup|no|nope|skip|ok|okay)\s*[.!]?\s*$/i

function textFromParts(parts: unknown): string {
  if (!Array.isArray(parts)) return ''
  return parts
    .filter(
      (part): part is { type?: string; text?: string } =>
        Boolean(part) && typeof part === 'object',
    )
    .filter((part) => part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text ?? '')
    .join('\n')
    .replace(/\s+/g, ' ')
    .trim()
}

function fileCount(parts: unknown): number {
  if (!Array.isArray(parts)) return 0
  return parts.filter((part) => {
    if (!part || typeof part !== 'object') return false
    const record = part as { type?: string; mediaType?: string }
    return record.type === 'file' && Boolean(record.mediaType?.startsWith('image/'))
  }).length
}

/** Same words and the same number of photos. Short yes/no/skip answers stay distinct. */
export function userMessageFingerprint(message: { parts?: unknown }): string {
  const text = textFromParts(message.parts)
  return `${text.toLowerCase()}|files:${fileCount(message.parts)}`
}

export function classifySubmissionReplay(args: {
  incoming: UIMessage[]
  stored: UIMessage[]
}): {
  dropIds: string[]
  suppressNewTurn: boolean
  storedAssistantId: string | null
  storedAssistantText: string | null
} {
  const storedIds = new Set(args.stored.map((message) => message.id))
  const lastStoredUser = [...args.stored].reverse().find((message) => message.role === 'user')
  const lastStoredFingerprint = lastStoredUser ? userMessageFingerprint(lastStoredUser) : ''
  const dropIds: string[] = []
  for (const message of args.incoming) {
    if (message.role !== 'user' || storedIds.has(message.id) || !lastStoredUser) continue
    const text = textFromParts(message.parts)
    if (!text || SHORT_CONFIRMATION.test(text) || text.length < 12) continue
    if (userMessageFingerprint(message) === lastStoredFingerprint) dropIds.push(message.id)
  }

  const latestUser = [...args.incoming].reverse().find((message) => message.role === 'user')
  const latestIndex = latestUser
    ? args.stored.findIndex((message) => message.id === latestUser.id)
    : -1
  const assistantAfter =
    latestIndex >= 0
      ? args.stored.slice(latestIndex + 1).find((message) => message.role === 'assistant')
      : undefined
  const replayedLatest = Boolean(latestUser && storedIds.has(latestUser.id) && assistantAfter)
  const droppedAllNewUsers =
    args.incoming.some((message) => message.role === 'user' && !storedIds.has(message.id)) &&
    args.incoming
      .filter((message) => message.role === 'user' && !storedIds.has(message.id))
      .every((message) => dropIds.includes(message.id))

  return {
    dropIds,
    suppressNewTurn: replayedLatest || droppedAllNewUsers,
    storedAssistantId: assistantAfter?.id ?? null,
    storedAssistantText: assistantAfter ? textFromParts(assistantAfter.parts) : null,
  }
}
