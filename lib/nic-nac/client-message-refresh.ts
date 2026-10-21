import type { UIMessage } from 'ai'

export function mergeServerMessages(
  current: UIMessage[],
  incoming: UIMessage[],
): UIMessage[] {
  const incomingById = new Map(incoming.map((message) => [message.id, message]))
  const seen = new Set<string>()
  let changed = false

  const merged = current.map((message) => {
    const serverMessage = incomingById.get(message.id)
    if (!serverMessage) return message
    seen.add(message.id)
    if (serverMessage === message) return message
    changed = true
    return serverMessage
  })

  const appended = incoming.filter((message) => {
    if (seen.has(message.id)) return false
    seen.add(message.id)
    return true
  })

  if (appended.length > 0) changed = true
  return changed ? [...merged, ...appended] : current
}

export function shouldClearSendErrorAfterServerReply(args: {
  status: string
  currentMessages: UIMessage[]
  serverMessages: UIMessage[] | null | undefined
}): boolean {
  if (args.status !== 'error' || !args.serverMessages?.length) return false
  return hasCompletedAssistantAfterLatestUser(
    args.currentMessages,
    args.serverMessages,
  )
}

export function hasCompletedAssistantAfterLatestUser(
  current: UIMessage[],
  incoming: UIMessage[],
) {
  for (let currentIndex = current.length - 1; currentIndex >= 0; currentIndex--) {
    const latestUser = current[currentIndex]
    if (latestUser.role !== 'user') continue

    const incomingUserIndex = incoming.findIndex(
      (message) => message.id === latestUser.id && message.role === 'user',
    )
    if (incomingUserIndex === -1) return false

    return incoming
      .slice(incomingUserIndex + 1)
      .some(
        (message) =>
          message.role === 'assistant' && (message.parts?.length ?? 0) > 0,
      )
  }

  return false
}
