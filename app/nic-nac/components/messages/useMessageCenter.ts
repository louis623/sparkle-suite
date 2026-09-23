'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  REVIEW_CONVERSATION_DETAILS,
  REVIEW_REP_DIRECTORY,
  REVIEW_TEAM_CONVERSATION_ID,
} from './review-fixtures'
import type {
  ConversationMessage,
  MessageCenterState,
  MessageCenterView,
  RepDirectoryOption,
  TeamOnboardingOption,
  RepReportInput,
  SparkleSuiteFilter,
  SupportDraft,
  SupportMessageType,
  WorkspaceConversationDetail,
  WorkspaceConversationAttachment,
  WorkspaceConversationState,
  WorkspaceConversationSummary,
  WorkspaceInboxItem,
} from './types'
import { getInboxItems, isConversationItem } from './types'

function createRequestId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `message-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function getString(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    if (typeof record[key] === 'string') return record[key] as string
  }
  return null
}

function getNumber(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    if (typeof record[key] === 'number') return record[key] as number
  }
  return 0
}

function normalizeContext(value: unknown) {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  return {
    label: getString(record, 'label', 'contextLabel', 'context_label'),
    value: getString(record, 'value', 'contextValue', 'context_value'),
    href: getString(record, 'href', 'actionUrl', 'action_url'),
    source: getString(record, 'source'),
  }
}

export function normalizeInboxItem(value: unknown): WorkspaceInboxItem | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const id = getString(record, 'id', 'conversationId', 'conversation_id')
  if (!id) return null
  const kind = getString(record, 'kind')
  const conversationType = getString(
    record,
    'conversationType',
    'conversation_type',
  )
  if (kind === 'conversation' || conversationType) {
    if (!['team_onboarding', 'support', 'rep_direct', 'owner_direct'].includes(conversationType ?? '')) {
      return null
    }
    return {
      kind: 'conversation',
      id,
      conversationId:
        getString(record, 'conversationId', 'conversation_id') ?? id,
      conversationType: conversationType as WorkspaceConversationSummary['conversationType'],
      state: (getString(record, 'state') || 'open') as WorkspaceConversationSummary['state'],
      subject: getString(record, 'subject', 'title') || 'Conversation',
      senderDisplayName:
        getString(
          record,
          'senderDisplayName',
          'sender_display_name',
          'participantDisplayName',
          'participant_display_name',
          'displayName',
          'display_name',
        ) ||
        (Array.isArray(record.participantLabels) &&
        typeof record.participantLabels[0] === 'string'
          ? record.participantLabels[0]
          : 'Conversation'),
      senderSubtitle: getString(record, 'senderSubtitle', 'sender_subtitle'),
      latestMessagePreview: getString(
        record,
        'latestMessagePreview',
        'latest_message_preview',
        'preview',
      ),
      lastMessageAt: getString(record, 'lastMessageAt', 'last_message_at'),
      createdAt: getString(record, 'createdAt', 'created_at'),
      unreadCount: getNumber(record, 'unreadCount', 'unread_count'),
      isRead:
        typeof record.isRead === 'boolean'
          ? record.isRead
          : typeof record.is_read === 'boolean'
            ? record.is_read
            : undefined,
      readAt: getString(record, 'readAt', 'read_at'),
      archivedAt:
        getString(record, 'archivedAt', 'archived_at') ||
        (record.isArchived === true
          ? getString(record, 'updatedAt', 'updated_at', 'lastMessageAt') ||
            new Date(0).toISOString()
          : null),
      mutedAt:
        getString(record, 'mutedAt', 'muted_at') ||
        (record.isMuted === true
          ? getString(record, 'updatedAt', 'updated_at', 'lastMessageAt') ||
            new Date(0).toISOString()
          : null),
      priority: getString(record, 'priority'),
      context: normalizeContext(record.context ?? record.contextSnapshot),
      requestDirection: getString(
        record,
        'requestDirection',
        'request_direction',
      ) as WorkspaceConversationSummary['requestDirection'],
      requestState: getString(
        record,
        'requestState',
        'request_state',
      ) as WorkspaceConversationSummary['requestState'],
      needsReply:
        typeof record.needsReply === 'boolean'
          ? record.needsReply
          : record.needs_reply === true,
    }
  }

  return {
    ...(record as WorkspaceInboxItem),
    kind: 'publication',
    id,
  } as WorkspaceInboxItem
}

function normalizeConversationMessage(value: unknown): ConversationMessage | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const id = getString(record, 'id')
  const body = getString(record, 'body')
  if (!id || body === null) return null
  const rawSenderType = getString(record, 'senderType', 'sender_type')
  const senderType =
    rawSenderType === 'support_queue' || rawSenderType === 'owner_queue'
      ? 'support' : rawSenderType || 'system'
  if (!['rep', 'onboarding_guest', 'support', 'system'].includes(senderType)) {
    return null
  }
  return {
    id,
    body,
    kind: (getString(record, 'kind') || 'message') as ConversationMessage['kind'],
    senderType: senderType as ConversationMessage['senderType'],
    senderDisplayName:
      getString(record, 'senderDisplayName', 'sender_display_name', 'senderLabel') ||
      (senderType === 'support' ? 'Sparkle Suite Support' : 'System'),
    createdAt:
      getString(record, 'createdAt', 'created_at') || new Date().toISOString(),
    isOwn:
      typeof record.isOwn === 'boolean'
        ? record.isOwn
        : typeof record.is_own === 'boolean'
          ? record.is_own
          : undefined,
    deliveryState: getString(
      record,
      'deliveryState',
      'delivery_state',
    ) as ConversationMessage['deliveryState'],
    attachments: Array.isArray(record.attachments)
      ? record.attachments.map(normalizeConversationAttachment)
          .filter((attachment): attachment is WorkspaceConversationAttachment => Boolean(attachment))
      : [],
  }
}

function normalizeConversationAttachment(
  value: unknown,
): WorkspaceConversationAttachment | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const id = getString(record, 'id')
  const contentType = getString(record, 'contentType', 'content_type')
  const signedReadHref = getString(record, 'signedReadHref', 'signed_read_href', 'readHref')
  if (
    !id ||
    !contentType?.startsWith('image/') ||
    !(signedReadHref?.startsWith('/api/nic-nac/conversations/') ||
      signedReadHref?.startsWith('/api/nic-nac/owner-direct/'))
  ) {
    return null
  }
  return {
    id,
    contentType,
    byteSize: getNumber(record, 'byteSize', 'byte_size'),
    width: getNumber(record, 'width'),
    height: getNumber(record, 'height'),
    slot: getNumber(record, 'slot', 'attachmentSlot', 'attachment_slot'),
    createdAt:
      getString(record, 'createdAt', 'created_at') || new Date().toISOString(),
    signedReadHref,
    messageId: getString(record, 'messageId', 'message_id') ?? undefined,
  }
}

export function normalizeConversationDetail(
  value: unknown,
  fallback: WorkspaceConversationSummary,
): WorkspaceConversationDetail | null {
  if (!value || typeof value !== 'object') return null
  const root = value as Record<string, unknown>
  const source =
    root.conversation && typeof root.conversation === 'object'
      ? ({ ...fallback, ...(root.conversation as object) } as Record<string, unknown>)
      : ({ ...fallback, ...root } as Record<string, unknown>)
  const normalized = normalizeInboxItem({ ...source, kind: 'conversation' })
  if (!normalized || !isConversationItem(normalized)) return null
  const rawMessages = Array.isArray(root.messages)
    ? root.messages
    : Array.isArray(source.messages)
      ? (source.messages as unknown[])
      : []
  const rawAttachments = Array.isArray(root.attachments)
    ? root.attachments
    : Array.isArray(source.attachments)
      ? (source.attachments as unknown[])
      : []
  return {
    ...normalized,
    messages: rawMessages
      .map(normalizeConversationMessage)
      .filter((message): message is ConversationMessage => Boolean(message)),
    attachments: rawAttachments
      .map(normalizeConversationAttachment)
      .filter(
        (attachment): attachment is WorkspaceConversationAttachment =>
          Boolean(attachment),
      ),
    canReply:
      typeof source.canReply === 'boolean'
        ? source.canReply
        : typeof source.can_reply === 'boolean'
          ? (source.can_reply as boolean)
          : normalized.state === 'open',
    canArchive: source.canArchive !== false && source.can_archive !== false,
    canMute:
      typeof source.canMute === 'boolean'
        ? source.canMute
        : typeof source.can_mute === 'boolean'
          ? (source.can_mute as boolean)
          : normalized.conversationType === 'rep_direct',
    canClose: source.canClose === true || source.can_close === true,
    canReport:
      source.canReport === true ||
      source.can_report === true ||
      normalized.conversationType === 'rep_direct',
  }
}

function getInitialView(): MessageCenterView {
  if (typeof window === 'undefined') return 'all'
  const view = new URLSearchParams(window.location.search).get('view')
  return ['all', 'team', 'rep-network', 'support', 'sparkle-suite', 'archived', 'needs-reply'].includes(
    view ?? '',
  )
    ? (view as MessageCenterView)
    : 'all'
}

function getInitialConversationId() {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('conversationId')
}

function getInitialCompose() {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  return params.get('compose') === 'support'
    ? {
        type: (['question', 'bug', 'idea'].includes(params.get('type') ?? '')
          ? params.get('type')
          : null) as SupportMessageType | null,
        source: params.get('source'),
      }
    : null
}

function getItemActivity(item: WorkspaceInboxItem) {
  const value = isConversationItem(item)
    ? item.lastMessageAt || item.createdAt
    : item.deliveredAt || item.createdAt
  const time = value ? new Date(value).getTime() : 0
  return Number.isNaN(time) ? 0 : time
}

function isSparkleSuiteResource(item: WorkspaceInboxItem) {
  if (isConversationItem(item)) return false
  return item.category === 'blog' || item.category === 'video'
}

function isSparkleSuiteReport(item: WorkspaceInboxItem) {
  return (
    !isConversationItem(item) &&
    (item.category === 'monthly_report' || item.category === 'birthday_report')
  )
}

export function filterInboxItems(
  items: WorkspaceInboxItem[],
  view: MessageCenterView,
  sparkleSuiteFilter: SparkleSuiteFilter,
) {
  return items
    .filter((item) => {
      const archived = Boolean(item.archivedAt)
      if (view === 'archived') return archived
      if (archived) return false
      if (view === 'needs-reply') {
        return isConversationItem(item) && item.needsReply === true
      }
      if (view === 'team') {
        return isConversationItem(item) && item.conversationType === 'team_onboarding'
      }
      if (view === 'rep-network') {
        return isConversationItem(item) && item.conversationType === 'rep_direct'
      }
      if (view === 'support') {
        return isConversationItem(item) && item.conversationType === 'support'
      }
      if (view === 'sparkle-suite') {
        if (isConversationItem(item)) return false
        if (sparkleSuiteFilter === 'reports') return isSparkleSuiteReport(item)
        if (sparkleSuiteFilter === 'resources') return isSparkleSuiteResource(item)
        if (sparkleSuiteFilter === 'updates') {
          return !isSparkleSuiteReport(item) && !isSparkleSuiteResource(item)
        }
      }
      return true
    })
    .toSorted((left, right) => {
      const activityDifference = getItemActivity(right) - getItemActivity(left)
      if (activityDifference !== 0) return activityDifference
      return `${left.kind ?? 'publication'}:${left.id}`.localeCompare(
        `${right.kind ?? 'publication'}:${right.id}`,
      )
    })
}

function updateMessageCenterUrl(input: {
  view: MessageCenterView
  conversationId?: string | null
  composeSupport?: boolean
  supportType?: SupportMessageType | null
  source?: string | null
}) {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  url.searchParams.set('section', 'messages')
  if (input.view === 'all') url.searchParams.delete('view')
  else url.searchParams.set('view', input.view)
  if (input.conversationId) {
    url.searchParams.set('conversationId', input.conversationId)
  } else {
    url.searchParams.delete('conversationId')
  }
  if (input.composeSupport) {
    url.searchParams.set('compose', 'support')
    if (input.source) url.searchParams.set('source', input.source)
    else url.searchParams.delete('source')
    if (input.supportType) url.searchParams.set('type', input.supportType)
    else url.searchParams.delete('type')
  } else {
    url.searchParams.delete('compose')
    url.searchParams.delete('source')
    url.searchParams.delete('type')
  }
  window.history.replaceState(window.history.state, '', url)
}

export function useMessageCenter({
  state,
  reviewMode,
  supportOnly = false,
  onRefresh,
  onUpdatePublication,
  onUpdateConversation,
}: {
  state: MessageCenterState
  reviewMode: boolean
  supportOnly?: boolean
  onRefresh: () => void
  onUpdatePublication: (
    item: WorkspaceInboxItem,
    patch: { read?: boolean; archived?: boolean },
  ) => void
  onUpdateConversation?: (
    item: WorkspaceConversationSummary,
    patch: Pick<WorkspaceConversationSummary, 'unreadCount'> &
      Partial<Pick<WorkspaceConversationSummary, 'archivedAt' | 'mutedAt'>>,
  ) => void
}) {
  const [items, setItems] = useState<WorkspaceInboxItem[]>(() =>
    getInboxItems(state.inbox).map(normalizeInboxItem).filter(Boolean) as WorkspaceInboxItem[],
  )
  const [remoteItems, setRemoteItems] = useState<WorkspaceInboxItem[] | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(state.inbox?.nextCursor ?? null)
  const [loadingPage, setLoadingPage] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [view, setViewState] = useState<MessageCenterView>(() =>
    supportOnly ? 'support' : getInitialView(),
  )
  const [sparkleSuiteFilter, setSparkleSuiteFilter] =
    useState<SparkleSuiteFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(getInitialConversationId)
  const [supportCompose, setSupportCompose] = useState(getInitialCompose)
  const [supportNavigationRevision, setSupportNavigationRevision] = useState(0)
  const [mode, setMode] = useState<'inbox' | 'thread' | 'support'>(() =>
    supportCompose ? 'support' : selectedId ? 'thread' : 'inbox',
  )
  const [replyFocusToken, setReplyFocusToken] = useState(0)
  const [newMessageOpen, setNewMessageOpen] = useState(false)
  const [detail, setDetail] = useState<WorkspaceConversationDetail | null>(null)
  const [detailStatus, setDetailStatus] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle')
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [repDirectory, setRepDirectory] = useState<RepDirectoryOption[]>(
    reviewMode ? REVIEW_REP_DIRECTORY : [],
  )
  const [repDirectoryStatus, setRepDirectoryStatus] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >(reviewMode ? 'ready' : 'idle')
  const [teamDirectory, setTeamDirectory] = useState<TeamOnboardingOption[]>(reviewMode
    ? [{ id: 'review-team-participant', displayName: 'Taylor Brooks', status: 'active', workspaceConversationId: REVIEW_TEAM_CONVERSATION_ID }]
    : [])
  const [teamDirectoryStatus, setTeamDirectoryStatus] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >(reviewMode ? 'ready' : 'idle')
  const teamRequestKeysRef = useRef(new Map<string, string>())
  const sendRequestKeysRef = useRef(new Map<string, string>())
  const supportRequestKeysRef = useRef(new Map<string, string>())
  const repRequestKeysRef = useRef(new Map<string, string>())

  useEffect(() => {
    const nextItems = getInboxItems(state.inbox)
      .map(normalizeInboxItem)
      .filter((item): item is WorkspaceInboxItem => Boolean(item))
    setItems((current) => {
      const freshIds = new Set(nextItems.map((item) => item.id))
      return [...nextItems, ...current.filter((item) => !freshIds.has(item.id))]
    })
    if (view === 'all' && !searchQuery) setNextCursor(state.inbox?.nextCursor ?? null)
  }, [state.inbox, view, searchQuery])

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchQuery(searchInput.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const loadInboxPage = useCallback(async (cursor?: string | null, signal?: AbortSignal) => {
    if (reviewMode) return
    setLoadingPage(true)
    setListError(null)
    try {
      const params = new URLSearchParams({ limit: '50' })
      const apiView = view === 'rep-network' ? 'rep_network'
        : view === 'sparkle-suite' ? 'sparkle_suite'
        : view === 'needs-reply' ? 'needs_reply' : view
      params.set('view', apiView)
      if (searchQuery.length >= 2) params.set('search', searchQuery)
      if (cursor) params.set('cursor', cursor)
      const response = await fetch(`/api/nic-nac/messages?${params}`, {
        credentials: 'include', signal,
      })
      const payload = (await response.json().catch(() => null)) as MessageCenterState['inbox'] | null
      if (!response.ok || !payload) throw new Error('Messages could not load. Try again.')
      const page = getInboxItems(payload)
        .map(normalizeInboxItem)
        .filter((item): item is WorkspaceInboxItem => Boolean(item))
      if (signal?.aborted) return
      if (view === 'all' && searchQuery.length < 2) {
        setItems((current) => {
          const incoming = new Map(page.map((item) => [item.id, item]))
          return [...current.map((item) => incoming.get(item.id) ?? item),
            ...page.filter((item) => !current.some((existing) => existing.id === item.id))]
        })
      } else {
        setRemoteItems((current) => cursor
          ? [...(current ?? []), ...page.filter((item) => !(current ?? []).some((existing) => existing.id === item.id))]
          : page)
      }
      setNextCursor(payload.nextCursor ?? null)
    } catch (error) {
      if (signal?.aborted) return
      setListError(error instanceof Error ? error.message : 'Messages could not load.')
    } finally {
      if (!signal?.aborted) setLoadingPage(false)
    }
  }, [reviewMode, searchQuery, view])

  useEffect(() => {
    if (reviewMode) return
    if (view === 'all' && searchQuery.length < 2) {
      setRemoteItems(null)
      return
    }
    const controller = new AbortController()
    setRemoteItems([])
    setNextCursor(null)
    void loadInboxPage(null, controller.signal)
    return () => controller.abort()
  }, [loadInboxPage, reviewMode, searchQuery, view])

  useEffect(() => {
    function navigateFromHeader() {
      const compose = getInitialCompose()
      setNewMessageOpen(false)
      if (compose) {
        setSupportCompose(compose)
        setSupportNavigationRevision((revision) => revision + 1)
        setViewState('support')
        setMode('support')
      } else {
        setSupportCompose(null)
        setViewState(getInitialView())
        setMode(getInitialConversationId() ? 'thread' : 'inbox')
      }
      setSelectedId(compose ? null : getInitialConversationId())
    }
    window.addEventListener('workspace:message-center-navigate', navigateFromHeader)
    return () => window.removeEventListener('workspace:message-center-navigate', navigateFromHeader)
  }, [])

  const availableItems = useMemo(
    () =>
      supportOnly
        ? (remoteItems ?? items).filter(
            (item) =>
              isConversationItem(item) && item.conversationType === 'support',
          )
        : remoteItems ?? items,
    [items, remoteItems, supportOnly],
  )

  const selectedItem = useMemo(
    () => availableItems.find((item) => item.id === selectedId)
      ?? items.find((item) => item.id === selectedId) ?? null,
    [availableItems, items, selectedId],
  )

  useEffect(() => {
    if (reviewMode || mode !== 'thread' || !selectedId || selectedItem) return
    let active = true
    void fetch(`/api/nic-nac/conversations/${selectedId}`, { credentials: 'include' })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null
        if (!response.ok || !payload) throw new Error('Conversation could not load.')
        const normalized = normalizeInboxItem(payload.conversation ?? payload)
        if (!normalized || !isConversationItem(normalized)) throw new Error('Conversation could not load.')
        if (active) setItems((current) => [normalized, ...current.filter((item) => item.id !== normalized.id)])
      })
      .catch(() => { if (active) setActionError('Conversation could not load. Try opening it from your inbox.') })
    return () => { active = false }
  }, [mode, reviewMode, selectedId, selectedItem])

  const visibleItems = useMemo(
    () => filterInboxItems(availableItems, view, sparkleSuiteFilter),
    [availableItems, sparkleSuiteFilter, view],
  )

  const counts = useMemo(() => {
    const views: MessageCenterView[] = [
      'all',
      'needs-reply',
      'team',
      'rep-network',
      'support',
      'sparkle-suite',
      'archived',
    ]
    return Object.fromEntries(
      views.map((targetView) => [
        targetView,
        filterInboxItems(availableItems, targetView, 'all').length,
      ]),
    ) as Record<MessageCenterView, number>
  }, [availableItems])

  const loadDetail = useCallback(
    async (item: WorkspaceConversationSummary) => {
      setDetailStatus('loading')
      setActionError(null)
      if (reviewMode && REVIEW_CONVERSATION_DETAILS[item.id]) {
        setDetail(REVIEW_CONVERSATION_DETAILS[item.id])
        setDetailStatus('ready')
        return
      }
      try {
        const response = await fetch(`/api/nic-nac/conversations/${item.id}`, {
          credentials: 'include',
        })
        const payload = (await response.json().catch(() => null)) as unknown
        if (!response.ok) throw new Error('Conversation could not load.')
        const nextDetail = normalizeConversationDetail(payload, item)
        if (!nextDetail) throw new Error('Conversation could not load.')
        setDetail(nextDetail)
        setDetailStatus('ready')
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : 'Conversation could not load.',
        )
        setDetailStatus('error')
      }
    },
    [reviewMode],
  )

  useEffect(() => {
    if (mode !== 'thread' || !selectedItem || !isConversationItem(selectedItem)) {
      setDetail(null)
      setDetailStatus('idle')
      return
    }
    void loadDetail(selectedItem)
  }, [loadDetail, mode, selectedItem])

  const setView = useCallback((nextView: MessageCenterView) => {
    const allowedView = supportOnly ? 'support' : nextView
    setSearchInput('')
    setSearchQuery('')
    setRemoteItems(null)
    setViewState(allowedView)
    setMode('inbox')
    setSelectedId(null)
    updateMessageCenterUrl({ view: allowedView })
  }, [supportOnly])

  const openItem = useCallback((item: WorkspaceInboxItem, focusReply = false) => {
    setSelectedId(item.id)
    setMode('thread')
    if (focusReply) setReplyFocusToken((value) => value + 1)
    if (isConversationItem(item) && item.unreadCount > 0) {
      setItems((current) =>
        current.map((candidate) =>
          candidate.id === item.id && isConversationItem(candidate)
            ? { ...candidate, unreadCount: 0, isRead: true }
            : candidate,
        ),
      )
      setRemoteItems((current) => current?.map((candidate) =>
        candidate.id === item.id && isConversationItem(candidate)
          ? { ...candidate, unreadCount: 0, isRead: true }
          : candidate) ?? null)
      onUpdateConversation?.(item, { unreadCount: 0 })
      if (!reviewMode) {
        void fetch(`/api/nic-nac/conversations/${item.id}/state`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ read: true }),
        })
      }
    } else if (!isConversationItem(item) && !item.isRead) {
      onUpdatePublication(item, { read: true })
      setRemoteItems((current) => current?.map((candidate) =>
        candidate.id === item.id && !isConversationItem(candidate)
          ? { ...candidate, isRead: true }
          : candidate) ?? null)
    }
    updateMessageCenterUrl({ view, conversationId: item.id })
  }, [onUpdateConversation, onUpdatePublication, reviewMode, view])

  const backToInbox = useCallback(() => {
    setMode('inbox')
    setSelectedId(null)
    setDetail(null)
    updateMessageCenterUrl({ view })
  }, [view])

  const openSupportComposer = useCallback((source?: string | null) => {
    setSupportCompose({ type: null, source: source ?? null })
    setNewMessageOpen(false)
    setMode('support')
    setSelectedId(null)
    setViewState('support')
    updateMessageCenterUrl({ view: 'support', composeSupport: true, source })
  }, [])

  const sendReply = useCallback(
    async (body: string) => {
      if (!selectedItem || !isConversationItem(selectedItem)) return
      const requestFingerprint = `${selectedItem.id}:${body}`
      const requestId =
        sendRequestKeysRef.current.get(requestFingerprint) ?? createRequestId()
      sendRequestKeysRef.current.set(requestFingerprint, requestId)
      setPendingKey(`send:${selectedItem.id}`)
      setActionError(null)
      try {
        let message: ConversationMessage
        if (reviewMode) {
          message = {
            id: requestId,
            body,
            kind: 'message',
            senderType: 'rep',
            senderDisplayName: 'You',
            createdAt: new Date().toISOString(),
            isOwn: true,
            deliveryState: 'sent',
          }
        } else {
          const response = await fetch(
            `/api/nic-nac/conversations/${selectedItem.id}/messages`,
            {
              method: 'POST',
              credentials: 'include',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ body, clientRequestId: requestId }),
            },
          )
          const payload = (await response.json().catch(() => null)) as
            | Record<string, unknown>
            | null
          if (!response.ok) {
            throw new Error(
              getString(payload ?? {}, 'error') || 'Message could not be sent.',
            )
          }
          message =
            normalizeConversationMessage(payload?.message ?? payload) ?? {
              id: requestId,
              body,
              kind: 'message',
              senderType: 'rep',
              senderDisplayName: 'You',
              createdAt: new Date().toISOString(),
              isOwn: true,
              deliveryState: 'sent',
            }
        }
        setDetail((current) =>
          current ? { ...current, messages: [...current.messages, message] } : current,
        )
        setItems((current) =>
          current.map((item) =>
            item.id === selectedItem.id && isConversationItem(item)
              ? {
                  ...item,
                  latestMessagePreview: body,
                  lastMessageAt: message.createdAt,
                  needsReply: false,
                }
              : item,
          ),
        )
        setRemoteItems((current) => current?.map((item) =>
          item.id === selectedItem.id && isConversationItem(item)
            ? { ...item, latestMessagePreview: body, lastMessageAt: message.createdAt, needsReply: false }
            : item) ?? null)
        sendRequestKeysRef.current.delete(requestFingerprint)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Message could not be sent.'
        setActionError(message)
        throw error
      } finally {
        setPendingKey(null)
      }
    },
    [reviewMode, selectedItem],
  )

  const submitSupport = useCallback(
    async (draft: SupportDraft) => {
      const requestFingerprint = JSON.stringify({
        type: draft.type,
        summary: draft.summary,
        details: draft.details,
        expectedResult: draft.expectedResult,
        actualResult: draft.actualResult,
        urgency: draft.urgency,
        source: draft.source,
        screenshots: draft.screenshots.map((file) => ({
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
        })),
      })
      const requestId =
        supportRequestKeysRef.current.get(requestFingerprint) ?? createRequestId()
      supportRequestKeysRef.current.set(requestFingerprint, requestId)
      setPendingKey('support:create')
      setActionError(null)
      try {
        let nextItem: WorkspaceConversationSummary
        let nextDetail: WorkspaceConversationDetail
        if (reviewMode) {
          const id = createRequestId()
          const createdAt = new Date().toISOString()
          nextItem = {
            kind: 'conversation',
            id,
            conversationId: id,
            conversationType: 'support',
            state: 'open',
            subject: draft.summary,
            senderDisplayName: 'Sparkle Suite Support',
            senderSubtitle: 'Support',
            latestMessagePreview: 'Received by Sparkle Suite Support',
            lastMessageAt: createdAt,
            unreadCount: 0,
            context: {
              label: 'Received',
              value: draft.source || 'Workspace',
            },
          }
          nextDetail = {
            ...nextItem,
            canReply: true,
            canArchive: true,
            attachments: [],
            messages: [
              {
                id: `${id}:request`,
                body: draft.details,
                kind: 'message',
                senderType: 'rep',
                senderDisplayName: 'You',
                createdAt,
                isOwn: true,
              },
              {
                id: `${id}:received`,
                body: 'Received by Sparkle Suite Support',
                kind: 'system_status',
                senderType: 'system',
                senderDisplayName: 'Sparkle Suite Support',
                createdAt,
              },
            ],
          }
        } else {
          const response = await fetch('/api/nic-nac/conversations/support', {
            method: 'POST',
            credentials: 'include',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              type:
                draft.type === 'idea'
                  ? 'suggested_upgrade'
                  : draft.type === 'bug'
                    ? 'bug'
                    : 'help_question',
              summary: draft.summary,
              details: draft.details,
              expectedResult: draft.expectedResult,
              actualResult: draft.actualResult,
              urgency: draft.urgency,
              source: draft.source || 'message_center',
              clientRequestId: requestId,
            }),
          })
          const payload = (await response.json().catch(() => null)) as unknown
          if (!response.ok) {
            throw new Error(
              payload && typeof payload === 'object'
                ? getString(payload as Record<string, unknown>, 'error') ||
                    'Support message could not be sent.'
                : 'Support message could not be sent.',
            )
          }
          const payloadRecord = payload as Record<string, unknown>
          const rawConversation =
            payloadRecord.conversation ?? payloadRecord.item ?? payloadRecord
          const normalizedCandidate = normalizeInboxItem(rawConversation)
          const returnedConversationId = getString(
            payloadRecord,
            'conversationId',
            'conversation_id',
          )
          const normalized =
            normalizedCandidate && isConversationItem(normalizedCandidate)
              ? normalizedCandidate
              : returnedConversationId
                ? ({
                    kind: 'conversation',
                    id: returnedConversationId,
                    conversationId: returnedConversationId,
                    conversationType: 'support',
                    state: 'open',
                    subject: draft.summary,
                    senderDisplayName: 'Sparkle Suite Support',
                    senderSubtitle: 'Support',
                    latestMessagePreview: 'Received by Sparkle Suite Support',
                    lastMessageAt: new Date().toISOString(),
                    unreadCount: 0,
                    context: {
                      label: getString(payloadRecord, 'status') || 'Received',
                      value: draft.source || 'Workspace',
                    },
                  } satisfies WorkspaceConversationSummary)
                : null
          if (!normalized) {
            throw new Error('Support saved, but the conversation could not be opened.')
          }
          nextItem = normalized
          nextDetail =
            normalizeConversationDetail(payload, normalized) ?? {
              ...normalized,
              canReply: true,
              canArchive: true,
              attachments: [],
              messages: [
                {
                  id: getString(payloadRecord, 'messageId', 'message_id') || requestId,
                  body: draft.details,
                  kind: 'message',
                  senderType: 'rep',
                  senderDisplayName: 'You',
                  createdAt: new Date().toISOString(),
                  isOwn: true,
                },
                {
                  id: `${requestId}:received`,
                  body: 'Received by Sparkle Suite Support',
                  kind: 'system_status',
                  senderType: 'system',
                  senderDisplayName: 'Sparkle Suite Support',
                  createdAt: new Date().toISOString(),
                },
              ],
            }

          if (draft.screenshots.length > 0) {
            const failedUploads: string[] = []
            for (const file of draft.screenshots) {
              const attachment = new FormData()
              attachment.set('file', file)
              const uploadResponse = await fetch(
                `/api/nic-nac/conversations/${normalized.id}/attachments`,
                {
                  method: 'POST',
                  credentials: 'include',
                  body: attachment,
                },
              )
              if (!uploadResponse.ok) failedUploads.push(file.name)
            }
            if (failedUploads.length > 0) {
              const uploadMessage = `${failedUploads.length} screenshot${
                failedUploads.length === 1 ? '' : 's'
              } could not upload. Your Support message was still received.`
              setActionError(uploadMessage)
              nextDetail = {
                ...nextDetail,
                messages: [
                  ...nextDetail.messages,
                  {
                    id: `${requestId}:attachment-warning`,
                    body: uploadMessage,
                    kind: 'system_status',
                    senderType: 'system',
                    senderDisplayName: 'Sparkle Suite Support',
                    createdAt: new Date().toISOString(),
                  },
                ],
              }
            }
          }
        }
        setItems((current) => [
          nextItem,
          ...current.filter((item) => item.id !== nextItem.id),
        ])
        setSelectedId(nextItem.id)
        setDetail(nextDetail)
        setDetailStatus('ready')
        setMode('thread')
        setViewState('support')
        updateMessageCenterUrl({
          view: 'support',
          conversationId: nextItem.id,
        })
        supportRequestKeysRef.current.delete(requestFingerprint)
      } catch (error) {
        setActionError(
          error instanceof Error
            ? error.message
            : 'Support message could not be sent.',
        )
        throw error
      } finally {
        setPendingKey(null)
      }
    },
    [reviewMode],
  )

  const loadRepDirectory = useCallback(async () => {
    if (reviewMode || repDirectoryStatus !== 'idle') return
    setRepDirectoryStatus('loading')
    try {
      const response = await fetch('/api/nic-nac/conversations/rep-directory?limit=25', {
        credentials: 'include',
      })
      const payload = (await response.json().catch(() => null)) as
        | Record<string, unknown>
        | null
      if (!response.ok) throw new Error('Eligible reps could not load.')
      const rawOptions = Array.isArray(payload?.reps)
        ? payload.reps
        : Array.isArray(payload?.items)
          ? payload.items
          : []
      const options = rawOptions.flatMap((value): RepDirectoryOption[] => {
        if (!value || typeof value !== 'object') return []
        const record = value as Record<string, unknown>
        const repId = getString(record, 'repId', 'rep_id', 'id')
        const displayName = getString(record, 'displayName', 'display_name')
        const businessName = getString(record, 'businessName', 'business_name')
        if (!repId || !displayName || !businessName) return []
        return [
          {
            repId,
            displayName,
            businessName,
            contextLabel: getString(record, 'contextLabel', 'context_label'),
          },
        ]
      })
      setRepDirectory(options)
      setRepDirectoryStatus('ready')
    } catch {
      setRepDirectoryStatus('error')
    }
  }, [repDirectoryStatus, reviewMode])

  const loadTeamDirectory = useCallback(async () => {
    if (reviewMode || teamDirectoryStatus === 'loading') return
    setTeamDirectoryStatus('loading')
    try {
      const response = await fetch('/api/nic-nac/team-onboarding/participants', {
        credentials: 'include',
      })
      const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null
      if (!response.ok) throw new Error('Team participants could not load.')
      const options = (Array.isArray(payload?.participants) ? payload.participants : [])
        .flatMap((value): TeamOnboardingOption[] => {
          if (!value || typeof value !== 'object') return []
          const record = value as Record<string, unknown>
          const id = getString(record, 'id')
          const displayName = getString(record, 'displayName', 'display_name')
          const status = getString(record, 'status')
          if (!id || !displayName || !status || status === 'archived' || record.archivedAt || record.archived_at) return []
          return [{ id, displayName, status, workspaceConversationId:
            getString(record, 'workspaceConversationId', 'workspace_conversation_id') }]
        })
      setTeamDirectory(options)
      setTeamDirectoryStatus('ready')
    } catch {
      setTeamDirectoryStatus('error')
    }
  }, [reviewMode, teamDirectoryStatus])

  const openTeamConversation = useCallback((option: TeamOnboardingOption) => {
    if (!option.workspaceConversationId) return
    const existing = [...(remoteItems ?? []), ...items].find((item) =>
      item.id === option.workspaceConversationId && isConversationItem(item))
    if (existing) openItem(existing, true)
    else if (!reviewMode) {
      void fetch(`/api/nic-nac/conversations/${option.workspaceConversationId}/state`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ read: true }),
      })
    }
    setNewMessageOpen(false)
    setViewState('team')
    setSelectedId(option.workspaceConversationId)
    setMode('thread')
    setReplyFocusToken((value) => value + 1)
    updateMessageCenterUrl({ view: 'team', conversationId: option.workspaceConversationId })
  }, [items, openItem, remoteItems, reviewMode])

  const sendTeamFirstMessage = useCallback(async (participantId: string, body: string) => {
    const recipient = teamDirectory.find((option) => option.id === participantId)
    if (!recipient || recipient.workspaceConversationId) {
      throw new Error('Choose a team member without an existing conversation.')
    }
    const fingerprint = `${participantId}:${body}`
    const requestId = teamRequestKeysRef.current.get(fingerprint) ?? createRequestId()
    teamRequestKeysRef.current.set(fingerprint, requestId)
    if (reviewMode) throw new Error('This reviewer conversation already exists.')
    const response = await fetch(`/api/nic-nac/team-onboarding/participants/${participantId}/messages`, {
      method: 'POST', credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ body, clientRequestId: requestId }),
    })
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null
    if (!response.ok) throw new Error(getString(payload ?? {}, 'error') || 'Team message could not be sent.')
    const message = payload?.message && typeof payload.message === 'object'
      ? payload.message as Record<string, unknown> : payload ?? {}
    const conversationId = getString(message, 'workspaceConversationId', 'conversationId')
    if (!conversationId) throw new Error('Message saved, but the conversation could not be opened.')
    const item: WorkspaceConversationSummary = {
      kind: 'conversation', id: conversationId, conversationId,
      conversationType: 'team_onboarding', state: 'open',
      subject: `New Rep Onboarding: ${recipient.displayName}`,
      senderDisplayName: recipient.displayName, senderSubtitle: 'New Rep Onboarding',
      latestMessagePreview: body, lastMessageAt: getString(message, 'createdAt') ?? new Date().toISOString(),
      unreadCount: 0, needsReply: false,
    }
    setItems((current) => [item, ...current.filter((existing) => existing.id !== conversationId)])
    setTeamDirectory((current) => current.map((option) => option.id === participantId
      ? { ...option, workspaceConversationId: conversationId } : option))
    setNewMessageOpen(false)
    setViewState('team')
    setSelectedId(conversationId)
    setMode('thread')
    updateMessageCenterUrl({ view: 'team', conversationId })
    teamRequestKeysRef.current.delete(fingerprint)
  }, [reviewMode, teamDirectory])

  const openNewMessage = useCallback(() => {
    if (supportOnly) {
      openSupportComposer('message_center')
      return
    }
    setNewMessageOpen(true)
    void loadRepDirectory()
  }, [loadRepDirectory, openSupportComposer, supportOnly])

  const sendRepRequest = useCallback(
    async (input: { recipientRepId: string; subject: string; body: string }) => {
      const requestFingerprint = `${input.recipientRepId}:${input.subject}:${input.body}`
      const requestId =
        repRequestKeysRef.current.get(requestFingerprint) ?? createRequestId()
      repRequestKeysRef.current.set(requestFingerprint, requestId)
      let nextItem: WorkspaceConversationSummary
      if (reviewMode) {
        const createdAt = new Date().toISOString()
        nextItem = {
          kind: 'conversation',
          id: requestId,
          conversationId: requestId,
          conversationType: 'rep_direct',
          state: 'pending',
          subject: input.subject,
          senderDisplayName:
            repDirectory.find((rep) => rep.repId === input.recipientRepId)
              ?.businessName || 'Sparkle Suite rep',
          senderSubtitle: 'Rep Network',
          latestMessagePreview: input.body,
          lastMessageAt: createdAt,
          unreadCount: 0,
          requestDirection: 'outgoing',
          requestState: 'pending',
        }
      } else {
        const response = await fetch('/api/nic-nac/conversations/rep-requests', {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ...input, clientRequestId: requestId }),
        })
        const payload = (await response.json().catch(() => null)) as unknown
        if (!response.ok) {
          throw new Error(
            payload && typeof payload === 'object'
              ? getString(payload as Record<string, unknown>, 'error') ||
                  'Message request could not be sent.'
              : 'Message request could not be sent.',
          )
        }
        const normalized = normalizeInboxItem(
          (payload as Record<string, unknown>)?.conversation ?? payload,
        )
        if (normalized && isConversationItem(normalized)) {
          nextItem = normalized
        } else {
          const payloadRecord =
            payload && typeof payload === 'object'
              ? (payload as Record<string, unknown>)
              : {}
          const conversationId = getString(
            payloadRecord,
            'conversationId',
            'conversation_id',
          )
          if (!conversationId) {
            throw new Error('Request saved, but the conversation could not be opened.')
          }
          const recipient = repDirectory.find(
            (rep) => rep.repId === input.recipientRepId,
          )
          const createdAt = new Date().toISOString()
          nextItem = {
            kind: 'conversation',
            id: conversationId,
            conversationId,
            conversationType: 'rep_direct',
            state: 'pending',
            subject: input.subject,
            senderDisplayName:
              recipient?.businessName || recipient?.displayName || 'Sparkle Suite rep',
            senderSubtitle: 'Rep Network',
            latestMessagePreview: input.body,
            lastMessageAt: createdAt,
            createdAt,
            unreadCount: 0,
            requestDirection: 'outgoing',
            requestState: 'pending',
          }
        }
      }
      setItems((current) => [
        nextItem,
        ...current.filter((item) => item.id !== nextItem.id),
      ])
      setNewMessageOpen(false)
      setViewState('rep-network')
      setSelectedId(nextItem.id)
      setMode('thread')
      updateMessageCenterUrl({
        view: 'rep-network',
        conversationId: nextItem.id,
      })
      repRequestKeysRef.current.delete(requestFingerprint)
    },
    [repDirectory, reviewMode],
  )

  const requestDecision = useCallback(
    async (decision: 'accept' | 'decline' | 'decline_and_block') => {
      if (!selectedItem || !isConversationItem(selectedItem)) return
      setPendingKey(`decision:${selectedItem.id}`)
      try {
        if (!reviewMode) {
          const response = await fetch(
            `/api/nic-nac/conversations/${selectedItem.id}/request-decision`,
            {
              method: 'POST',
              credentials: 'include',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ decision, clientRequestId: createRequestId() }),
            },
          )
          const payload = (await response.json().catch(() => null)) as
            | Record<string, unknown>
            | null
          if (!response.ok) {
            throw new Error(getString(payload ?? {}, 'error') || 'Choice could not be saved.')
          }
        }
        const nextState: WorkspaceConversationState =
          decision === 'accept'
            ? 'open'
            : decision === 'decline'
              ? 'closed'
              : 'blocked'
        const nextRequestState: NonNullable<
          WorkspaceConversationSummary['requestState']
        > =
          decision === 'accept'
            ? 'accepted'
            : decision === 'decline'
              ? 'declined'
              : 'blocked'
        setItems((current) =>
          current.map((item) =>
            item.id === selectedItem.id && isConversationItem(item)
              ? {
                  ...item,
                  state: nextState,
                  requestState: nextRequestState,
                }
              : item,
          ),
        )
        setDetail((current) =>
          current
            ? {
                ...current,
                state: nextState,
                canReply: decision === 'accept',
                requestState: nextRequestState,
              }
            : current,
        )
      } finally {
        setPendingKey(null)
      }
    },
    [reviewMode, selectedItem],
  )

  const reportConversation = useCallback(
    async (input: RepReportInput) => {
      if (!selectedItem || !isConversationItem(selectedItem)) return
      setPendingKey(`report:${selectedItem.id}`)
      try {
        if (!reviewMode) {
          const response = await fetch(
            `/api/nic-nac/conversations/${selectedItem.id}/report`,
            {
              method: 'POST',
              credentials: 'include',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                reason: input.reason,
                ...(input.details ? { details: input.details } : {}),
              }),
            },
          )
          const payload = (await response.json().catch(() => null)) as
            | Record<string, unknown>
            | null
          if (!response.ok) {
            throw new Error(getString(payload ?? {}, 'error') || 'Report could not be sent.')
          }
        }
      } finally {
        setPendingKey(null)
      }
    },
    [reviewMode, selectedItem],
  )

  const blockConversation = useCallback(async () => {
    if (!selectedItem || !isConversationItem(selectedItem)) return
    setPendingKey(`block:${selectedItem.id}`)
    try {
      if (!reviewMode) {
        const response = await fetch(
          `/api/nic-nac/conversations/${selectedItem.id}/block`,
          {
            method: 'POST',
            credentials: 'include',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ reason: 'Blocked from the Message Center.' }),
          },
        )
        const payload = (await response.json().catch(() => null)) as
          | Record<string, unknown>
          | null
        if (!response.ok) {
          throw new Error(getString(payload ?? {}, 'error') || 'Rep could not be blocked.')
        }
      }
      setItems((current) =>
        current.map((item) =>
          item.id === selectedItem.id && isConversationItem(item)
            ? ({
                ...item,
                state: 'blocked',
                requestState: 'blocked',
              } satisfies WorkspaceConversationSummary)
            : item,
        ),
      )
      setDetail((current) =>
        current
          ? { ...current, state: 'blocked', requestState: 'blocked', canReply: false }
          : current,
      )
    } finally {
      setPendingKey(null)
    }
  }, [reviewMode, selectedItem])

  const updateConversationState = useCallback(
    async (patch: { archived?: boolean; muted?: boolean }) => {
      if (!selectedItem) return
      if (!isConversationItem(selectedItem)) {
        onUpdatePublication(selectedItem, { archived: patch.archived })
        return
      }
      setPendingKey(`state:${selectedItem.id}`)
      try {
        if (!reviewMode) {
          const response = await fetch(
            `/api/nic-nac/conversations/${selectedItem.id}/state`,
            {
              method: 'PATCH',
              credentials: 'include',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(patch),
            },
          )
          if (!response.ok) throw new Error('Conversation could not be updated.')
        }
        const now = new Date().toISOString()
        setItems((current) =>
          current.map((item) =>
            item.id === selectedItem.id
              ? {
                  ...item,
                  ...(patch.archived !== undefined
                    ? { archivedAt: patch.archived ? now : null }
                    : {}),
                  ...(patch.muted !== undefined
                    ? { mutedAt: patch.muted ? now : null }
                    : {}),
                }
              : item,
          ),
        )
        onUpdateConversation?.(selectedItem, {
          unreadCount: selectedItem.unreadCount,
          ...(patch.archived !== undefined
            ? { archivedAt: patch.archived ? now : null }
            : {}),
          ...(patch.muted !== undefined
            ? { mutedAt: patch.muted ? now : null }
            : {}),
        })
        setRemoteItems((current) => current?.map((item) =>
          item.id === selectedItem.id
            ? {
                ...item,
                ...(patch.archived !== undefined ? { archivedAt: patch.archived ? now : null } : {}),
                ...(patch.muted !== undefined ? { mutedAt: patch.muted ? now : null } : {}),
              }
            : item) ?? null)
      } finally {
        setPendingKey(null)
      }
    },
    [onUpdateConversation, onUpdatePublication, reviewMode, selectedItem],
  )

  return {
    items: availableItems,
    visibleItems,
    searchInput,
    setSearchInput,
    loadingPage,
    listError,
    nextCursor,
    loadMore: () => { if (nextCursor && !loadingPage) void loadInboxPage(nextCursor) },
    retryList: () => { if (!loadingPage) void loadInboxPage(nextCursor) },
    replyFocusToken,
    counts,
    view,
    sparkleSuiteFilter,
    selectedItem,
    detail,
    detailStatus,
    mode,
    newMessageOpen,
    pendingKey,
    actionError,
    repDirectory,
    repDirectoryStatus,
    teamDirectory,
    teamDirectoryStatus,
    initialSupportType: supportCompose?.type ?? null,
    initialSupportSource: supportCompose?.source ?? null,
    supportNavigationRevision,
    setView,
    setSparkleSuiteFilter,
    openItem,
    backToInbox,
    openSupportComposer,
    openNewMessage,
    closeNewMessage: () => setNewMessageOpen(false),
    openTeam: () => { void loadTeamDirectory() },
    openTeamConversation,
    sendTeamFirstMessage,
    sendReply,
    submitSupport,
    sendRepRequest,
    requestDecision,
    reportConversation,
    blockConversation,
    archiveSelected: () =>
      updateConversationState({ archived: !selectedItem?.archivedAt }),
    muteSelected: () =>
      updateConversationState({
        muted:
          selectedItem && isConversationItem(selectedItem)
            ? !selectedItem.mutedAt
            : false,
      }),
    retryDetail: () => {
      if (selectedItem && isConversationItem(selectedItem)) void loadDetail(selectedItem)
    },
    retryInbox: onRefresh,
  }
}
