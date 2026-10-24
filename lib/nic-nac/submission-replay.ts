import type { UIMessage } from 'ai'

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
  const dropIds: string[] = []
  const latestUser = [...args.incoming].reverse().find((message) => message.role === 'user')
  const latestIndex = latestUser
    ? args.stored.findIndex((message) => message.id === latestUser.id)
    : -1
  const assistantAfter =
    latestIndex >= 0
      ? args.stored.slice(latestIndex + 1).find((message) => message.role === 'assistant')
      : undefined
  const replayedLatest = Boolean(latestUser && storedIds.has(latestUser.id) && assistantAfter)

  return {
    dropIds,
    suppressNewTurn: replayedLatest,
    storedAssistantId: assistantAfter?.id ?? null,
    storedAssistantText: assistantAfter ? textFromParts(assistantAfter.parts) : null,
  }
}
