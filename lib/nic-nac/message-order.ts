/** Created time stamped on a message, when the server or a rollover set one. */
export function messageCreatedAt(message: { metadata?: unknown }): string | null {
  const metadata = message.metadata
  if (!metadata || typeof metadata !== 'object') return null
  const value = (metadata as { created_at?: unknown }).created_at
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

/**
 * Oldest first. Messages that already have a created time stay in that order.
 * A message with no time yet (the one the rep just sent) stays after them.
 */
export function sortMessagesByCreatedAt<T extends { metadata?: unknown }>(
  messages: T[],
): T[] {
  return messages
    .map((message, index) => ({ message, index, at: messageCreatedAt(message) }))
    .sort((left, right) => {
      if (left.at && right.at && left.at !== right.at) return left.at < right.at ? -1 : 1
      if (left.at && !right.at) return -1
      if (!left.at && right.at) return 1
      return left.index - right.index
    })
    .map((entry) => entry.message)
}
