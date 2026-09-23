import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { listRepConversations, type WorkspaceConversationView } from '@/lib/services/workspace-conversations'
import { listRepWorkspaceMessages } from '@/lib/services/workspace-messages'
import type { WorkspaceMessageCategory } from '@/lib/services/workspace-message-permissions'

type InboxCursor =
  | { kind: 'keyset'; lastMessageAt: string; itemKind: 'conversation' | 'publication'; id: string }
  | { kind: 'legacy_offset'; offset: number }

function decodeCursor(cursor?: string): InboxCursor | null {
  if (!cursor) return null
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as Record<string, unknown>
    if (Number.isSafeInteger(parsed.offset) && (parsed.offset as number) >= 0) {
      return { kind: 'legacy_offset', offset: parsed.offset as number }
    }
    if (
      typeof parsed.lastMessageAt !== 'string' ||
      Number.isNaN(Date.parse(parsed.lastMessageAt)) ||
      (parsed.itemKind !== 'conversation' && parsed.itemKind !== 'publication') ||
      typeof parsed.id !== 'string' ||
      !parsed.id
    ) {
      throw new Error('invalid cursor')
    }
    return {
      kind: 'keyset',
      lastMessageAt: parsed.lastMessageAt,
      itemKind: parsed.itemKind,
      id: parsed.id,
    }
  } catch {
    throw new Error('Message cursor is invalid.')
  }
}

function encodeCursor(item: { lastMessageAt: string; kind: 'conversation' | 'publication'; id: string }) {
  return Buffer.from(JSON.stringify({
    lastMessageAt: item.lastMessageAt,
    itemKind: item.kind,
    id: item.id,
  }), 'utf8').toString('base64url')
}

export async function listRepWorkspaceInbox(
  supabase: SupabaseClient,
  repId: string,
  options: {
    view?: WorkspaceConversationView | 'sparkle_suite'
    limit?: number
    cursor?: string
    category?: WorkspaceMessageCategory
    unreadOnly?: boolean
    archived?: boolean
    search?: string
  } = {},
) {
  const limit = Math.min(Math.max(options.limit ?? 25, 1), 100)
  const cursor = decodeCursor(options.cursor)
  const legacyOffset = cursor?.kind === 'legacy_offset' ? cursor.offset : 0
  // New cursors are stable composite keysets. The larger prefix is retained
  // only to finish old offset cursors that may already be in a browser tab.
  const fetchLimit = cursor?.kind === 'legacy_offset'
    ? Math.min(legacyOffset + limit + 1, 1000)
    : limit + 1
  const keyset = cursor?.kind === 'keyset' ? cursor : null
  const includePublications = options.view !== 'needs_reply' && (!options.view || options.view === 'all' || options.view === 'sparkle_suite' || options.view === 'archived')
  const includeConversations = !options.view || options.view !== 'sparkle_suite'
  const [publicationResult, conversationResult] = await Promise.all([
    includePublications
      ? listRepWorkspaceMessages(supabase, repId, {
          limit: fetchLimit,
          category: options.category,
          unreadOnly: options.unreadOnly,
          archived: options.view === 'archived' || options.archived,
          beforeDeliveredAt: keyset?.lastMessageAt,
          beforeId: keyset?.id,
          equalTimestampMode: keyset
            ? keyset.itemKind === 'conversation' ? 'include_all' : 'same_kind'
            : undefined,
          search: options.search,
        })
      : Promise.resolve({ messages: [], unreadCount: 0, nextCursor: null }),
    includeConversations
      ? listRepConversations(supabase, repId, {
          view: options.view === 'sparkle_suite' ? undefined : options.view,
          limit: fetchLimit,
          archived: options.archived,
          beforeLastMessageAt: keyset?.lastMessageAt,
          beforeId: keyset?.id,
          equalTimestampMode: keyset
            ? keyset.itemKind === 'conversation' ? 'same_kind' : 'exclude_all'
            : undefined,
          search: options.search,
          needsReply: options.view === 'needs_reply',
        })
      : Promise.resolve({ messages: [], unreadCount: 0, nextCursor: null }),
  ])
  const publications = publicationResult.messages.map((message) => ({
    ...message,
    kind: 'publication' as const,
    lastMessageAt: message.deliveredAt,
    unreadCount: message.isRead ? 0 : 1,
  }))
  const combined = [...publications, ...conversationResult.messages]
    .sort((left, right) => {
      const timestamp = right.lastMessageAt.localeCompare(left.lastMessageAt)
      if (timestamp !== 0) return timestamp
      const kind = left.kind.localeCompare(right.kind)
      if (kind !== 0) return kind
      return right.id.localeCompare(left.id)
    })
  const page = cursor?.kind === 'legacy_offset'
    ? combined.slice(legacyOffset, legacyOffset + limit)
    : combined.slice(0, limit)
  const hasMore = cursor?.kind === 'legacy_offset'
    ? combined.length > legacyOffset + limit
    : combined.length > limit
  const lastItem = page.at(-1)
  return {
    unreadCount: publicationResult.unreadCount + conversationResult.unreadCount,
    messages: page,
    nextCursor: hasMore && lastItem ? encodeCursor(lastItem) : null,
  }
}
