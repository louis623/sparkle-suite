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

export type RolloverEdge = {
  sourceConversationId: string
  destinationConversationId: string
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

function lineageRoot(
  conversationId: string,
  destinationToSource: Map<string, string>,
): string {
  let current = conversationId
  const seen = new Set<string>()
  while (destinationToSource.has(current) && !seen.has(current)) {
    seen.add(current)
    current = destinationToSource.get(current) ?? current
  }
  return current
}

/** Newest conversations first. Title is the first user line, then any first line. */
export function recentConversationsFromRows(
  rows: RecentConversationRow[],
  limit = 5,
  options?: {
    excludeConversationId?: string | null
    rolloverEdges?: RolloverEdge[]
  },
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

  const destinationToSource = new Map<string, string>()
  for (const edge of options?.rolloverEdges ?? []) {
    const source = edge.sourceConversationId.trim()
    const destination = edge.destinationConversationId.trim()
    if (source && destination) destinationToSource.set(destination, source)
  }
  const excludeRoot = options?.excludeConversationId?.trim()
    ? lineageRoot(options.excludeConversationId.trim(), destinationToSource)
    : ''

  const byLineage = new Map<
    string,
    {
      conversationId: string
      earliest: RecentConversationRow | null
      latestAt: string
      userTitle: string
      userTitleAt: string
    }
  >()
  for (const [conversationId, value] of grouped) {
    const root = lineageRoot(conversationId, destinationToSource)
    if (excludeRoot && root === excludeRoot) continue
    const current = byLineage.get(root)
    if (!current) {
      byLineage.set(root, { conversationId, ...value })
      continue
    }
    if (value.latestAt > current.latestAt) current.conversationId = conversationId
    if (value.latestAt > current.latestAt) current.latestAt = value.latestAt
    if (value.userTitle && (!current.userTitleAt || value.userTitleAt < current.userTitleAt)) {
      current.userTitle = value.userTitle
      current.userTitleAt = value.userTitleAt
    }
    const earliestAt = current.earliest?.created_at ?? ''
    const nextEarliestAt = value.earliest?.created_at ?? ''
    if (value.earliest && (!current.earliest || nextEarliestAt < earliestAt)) {
      current.earliest = value.earliest
    }
  }

  return [...byLineage.values()]
    .map((value) => {
      const title =
        value.userTitle || firstLine(value.earliest?.parts) || 'Conversation'
      return {
        conversationId: value.conversationId,
        title,
        createdAt: value.latestAt,
        dateLabel: formatRecentConversationDate(value.latestAt),
      }
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, limit)
}
