export type RecentConversationRow = {
  conversation_id?: string | null
  role?: string | null
  parts?: unknown
  created_at?: string | null
}

export type RecentConversationSummary = {
  conversationId: string
  title: string
  createdAt: string
  dateLabel: string
}

function firstLine(parts: unknown): string {
  if (!Array.isArray(parts)) return ''
  const text = parts
    .filter(
      (part): part is { type?: string; text?: string } =>
        Boolean(part) && typeof part === 'object',
    )
    .filter((part) => part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text ?? '')
    .join('\n')
  const line = text.split('\n').map((item) => item.trim()).find(Boolean) ?? ''
  return line.replace(/\s+/g, ' ').slice(0, 80)
}

export function formatRecentConversationDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'America/New_York',
  })
}

/** Newest conversations first. Title is the first user line, then any first line. */
export function recentConversationsFromRows(
  rows: RecentConversationRow[],
  limit = 5,
): RecentConversationSummary[] {
  const grouped = new Map<
    string,
    {
      earliest: RecentConversationRow | null
      latestAt: string
      userTitle: string
      userTitleAt: string
    }
  >()

  for (const row of rows) {
    const conversationId = row.conversation_id?.trim()
    const createdAt = row.created_at?.trim()
    if (!conversationId || !createdAt) continue
    const current = grouped.get(conversationId) ?? {
      earliest: null,
      latestAt: createdAt,
      userTitle: '',
      userTitleAt: '',
    }
    if (createdAt > current.latestAt) current.latestAt = createdAt
    const earliestAt = current.earliest?.created_at ?? ''
    if (!current.earliest || createdAt < earliestAt) current.earliest = row
    const line = row.role === 'user' ? firstLine(row.parts) : ''
    if (line && (!current.userTitleAt || createdAt < current.userTitleAt)) {
      current.userTitle = line
      current.userTitleAt = createdAt
    }
    grouped.set(conversationId, current)
  }

  return [...grouped.entries()]
    .map(([conversationId, value]) => {
      const title =
        value.userTitle || firstLine(value.earliest?.parts) || 'Conversation'
      return {
        conversationId,
        title,
        createdAt: value.latestAt,
        dateLabel: formatRecentConversationDate(value.latestAt),
      }
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, limit)
}
