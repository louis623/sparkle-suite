'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  type FileUIPart,
  type UIMessage,
} from 'ai'
import { Bubble } from './Bubble'
import { ChatHistory } from './ChatHistory'
import { EmptyGreeting, type NicNacChatMode } from './EmptyGreeting'
import { ErrorBlock } from './ErrorBlock'
import { HITLBlock } from './HITLBlock'
import { InputRow, type InputAttachment } from './InputRow'
import { RequiredSetupLiveQueuePanel } from './RequiredSetupLiveQueuePanel'
import { RequiredSetupLookPicker } from './RequiredSetupLookPicker'
import { RequiredSetupPreviewPanel } from './RequiredSetupPreviewPanel'
import { StreamingBubble } from './StreamingBubble'
import { ThinkingIndicator } from './ThinkingIndicator'
import { TradeRequestLiveCard } from './TradeRequestLiveCard'
import { openTradeRequestReview } from './trade-request-review-events'
import { compressImage } from '@/lib/nic-nac/image-compress'
import { orderResolvedAttachments } from '@/lib/nic-nac/client-attachments'
import { buildConversationStateUrl, readJsonResponse } from '@/lib/nic-nac/client-conversation-routing'
import { findActionableApproval, type ActionableApproval } from '@/lib/nic-nac/hitl-state'
import {
  hasCompletedAssistantAfterLatestUser,
  mergeServerMessages,
} from '@/lib/nic-nac/client-message-refresh'
import {
  isTradeRequestCardPart,
  type TradeRequestCardPart,
} from '@/lib/nic-nac/trade-request-card-parts'
import type { TradeRequestStatus } from '@/lib/services/types'
import { shouldStartNicNacRollover, type NicNacConversationRunHealth } from '@/lib/nic-nac/rollover'
import {
  getWorkspaceRefreshPartKey,
  isCalendarWorkspaceMutationPart,
  isSiteWorkspaceMutationPart,
  isTradeWorkspaceMutationPart,
  NIC_NAC_WORKSPACE_REFRESH_EVENT,
} from '@/lib/nic-nac/workspace-refresh-events'
import type { RequiredSetupStepId } from '@/lib/self-serve/required-setup-contract'

const MAX_ATTACHMENTS = 10
const CONVERSATION_MESSAGE_REFRESH_MS = 15_000
const STREAM_COMPLETION_RECOVERY_MS = 12_000
const REQUIRED_SETUP_SEND_ERROR_MESSAGE =
  'Nic-Nac could not send because required setup context is missing. Refresh, then try again.'
const WORKSPACE_SEND_ERROR_MESSAGE = "Couldn't send. Try again?"

function newAttachmentId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `att_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function getSendErrorMessage(mode: NicNacChatMode) {
  return mode === 'required_setup'
    ? REQUIRED_SETUP_SEND_ERROR_MESSAGE
    : WORKSPACE_SEND_ERROR_MESSAGE
}

interface ApprovalResponseFn {
  (args: { id: string; approved: boolean; reason?: string }): void
}

type TradeRequestDecision = {
  requestId: string
  action: 'approve' | 'reject'
}

type TradeRequestDecisionById = Record<string, TradeRequestDecision['action']>
type TradeRequestDecisionErrorById = Record<string, string>

export function getTradeRequestCardState({
  requestId,
  requestStatus,
  pendingTradeDecision,
  resolvedTradeDecisions,
  tradeDecisionErrors,
}: {
  requestId: string
  requestStatus?: TradeRequestStatus
  pendingTradeDecision: TradeRequestDecision | null
  resolvedTradeDecisions: TradeRequestDecisionById
  tradeDecisionErrors: TradeRequestDecisionErrorById
}): {
  pendingAction: TradeRequestDecision['action'] | null
  actionsDisabled: boolean
  terminalNote: string | null
  errorMessage: string | null
} {
  const resolvedAction = resolvedTradeDecisions[requestId]
  const terminalStatus =
    requestStatus && requestStatus !== 'pending' ? requestStatus : null
  return {
    pendingAction:
      pendingTradeDecision?.requestId === requestId
        ? pendingTradeDecision.action
        : null,
    actionsDisabled:
      pendingTradeDecision !== null ||
      resolvedAction !== undefined ||
      terminalStatus !== null,
    terminalNote:
      resolvedAction === 'approve'
        ? 'Trade approved.'
        : resolvedAction === 'reject'
          ? 'Trade denied.'
          : terminalStatus === 'approved'
            ? 'Trade approved.'
            : terminalStatus === 'denied'
              ? 'Trade denied.'
              : terminalStatus === 'cancelled'
                ? 'Trade cancelled.'
                : null,
    errorMessage: tradeDecisionErrors[requestId] ?? null,
  }
}

function unavailableTradeRequestDecision() {}

export type AssistantMessageRenderable =
  | { type: 'text'; key: string; text: string }
  | {
      type: 'data-trade-request-card'
      key: string
      request: TradeRequestCardPart['data']
    }

export function buildAssistantMessageRenderables(
  parts: readonly unknown[],
): AssistantMessageRenderable[] {
  const renderables: AssistantMessageRenderable[] = []
  let textBuffer = ''

  const flushText = (key: string) => {
    if (!textBuffer) return
    renderables.push({ type: 'text', key, text: textBuffer })
    textBuffer = ''
  }

  parts.forEach((part, index) => {
    const pt = part as { type?: string; text?: string }
    if (pt.type === 'text') {
      textBuffer += pt.text ?? ''
      return
    }
    if (isTradeRequestCardPart(part)) {
      flushText(`text-${index}`)
      renderables.push({
        type: 'data-trade-request-card',
        key: `trade-request-${part.data.requestId}-${index}`,
        request: part.data,
      })
    }
  })
  flushText('text-final')

  return renderables
}

type ConversationHydrateResponse = {
  conversationId?: string
  messages?: UIMessage[]
  runHealth?: NicNacConversationRunHealth
}
export function NicNacChatBody({
  conversationId,
  chatMode = 'workspace',
  requiredSetupStep,
  requiredSetupRepId = null,
  requiredSetupSyncCode = null,
  requiredSetupPreviewHref = '/amethyst/Homepage.html',
  transport,
  initialMessages,
  onChatStateChange,
  onRolloverRecommended,
  launchPrompt,
  onLaunchPromptConsumed,
}: {
  conversationId: string
  chatMode?: NicNacChatMode
  requiredSetupStep?: RequiredSetupStepId | null
  requiredSetupRepId?: string | null
  requiredSetupSyncCode?: string | null
  requiredSetupPreviewHref?: string
  transport: DefaultChatTransport<UIMessage>
  initialMessages: UIMessage[]
  onChatStateChange: (s: { isStreaming: boolean; hasPendingApproval: boolean }) => void
  onRolloverRecommended: (conversationId: string) => Promise<boolean>
  resetSignal: string
  launchPrompt?: string | null
  onLaunchPromptConsumed?: () => void
}) {
  // Server-owned ThinkingIndicator state machine. The server emits transient
  // `data-thinking` parts with phase: 'show' | 'confirm' | 'hide'. The client
  // only owns presentation timing (150ms provisional debounce, 800ms confirmed
  // minimum). `activeMessageIdRef` outlives provisional hides so a later
  // confirm for the same message can re-show — supports preamble→tool and
  // tool→text→tool sequences.
  const [thinkingFor, setThinkingFor] = useState<string | null>(null)
  const thinkingForRef = useRef<string | null>(null)
  useEffect(() => {
    thinkingForRef.current = thinkingFor
  }, [thinkingFor])
  const activeMessageIdRef = useRef<string | null>(null)
  const confirmedRef = useRef(false)
  const shownAtRef = useRef<number | null>(null)
  const showTimerRef = useRef<number | null>(null)
  const hideTimerRef = useRef<number | null>(null)

  const clearShowTimer = useCallback(() => {
    if (showTimerRef.current !== null) {
      window.clearTimeout(showTimerRef.current)
      showTimerRef.current = null
    }
  }, [])
  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }, [])

  const requestShow = useCallback(
    (id: string) => {
      if (activeMessageIdRef.current !== id) {
        clearShowTimer()
        clearHideTimer()
        activeMessageIdRef.current = id
        confirmedRef.current = false
        shownAtRef.current = null
        setThinkingFor(null)
      }
      if (thinkingForRef.current === id) return
      clearShowTimer()
      showTimerRef.current = window.setTimeout(() => {
        showTimerRef.current = null
        shownAtRef.current = Date.now()
        setThinkingFor(id)
      }, 150)
    },
    [clearShowTimer, clearHideTimer]
  )

  const confirmThinking = useCallback(
    (id: string) => {
      if (activeMessageIdRef.current !== id) {
        clearShowTimer()
        clearHideTimer()
        activeMessageIdRef.current = id
      }
      confirmedRef.current = true
      clearShowTimer()
      // Stamp shownAtRef so the 800ms minimum has a fresh basis when
      // upgrading from provisional → confirmed (or re-confirming after a
      // prior hide in a tool→text→tool sequence).
      shownAtRef.current = Date.now()
      if (thinkingForRef.current !== id) {
        setThinkingFor(id)
      }
    },
    [clearShowTimer, clearHideTimer]
  )

  const requestHide = useCallback(
    (id: string) => {
      if (activeMessageIdRef.current !== id) return
      clearShowTimer()
      // Not visible: cancel pending show, clear confirmation, but KEEP
      // activeMessageIdRef so a later confirm for this same id can resurrect.
      if (thinkingForRef.current !== id) {
        confirmedRef.current = false
        shownAtRef.current = null
        return
      }
      // Visible + unconfirmed: hide immediately. KEEP activeMessageIdRef.
      if (!confirmedRef.current) {
        setThinkingFor(null)
        confirmedRef.current = false
        shownAtRef.current = null
        return
      }
      // Visible + confirmed: enforce 800ms minimum from the last show.
      const elapsed = Date.now() - (shownAtRef.current ?? Date.now())
      const remaining = Math.max(0, 800 - elapsed)
      clearHideTimer()
      hideTimerRef.current = window.setTimeout(() => {
        hideTimerRef.current = null
        setThinkingFor(null)
        confirmedRef.current = false
        shownAtRef.current = null
        // activeMessageIdRef stays — supports tool-text-tool resumption.
      }, remaining)
    },
    [clearShowTimer, clearHideTimer]
  )

  const {
    messages,
    sendMessage,
    addToolApprovalResponse,
    status,
    error,
    regenerate,
    clearError,
    stop,
    setMessages,
  } = useChat({
    transport,
    messages: initialMessages,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    onData: (dataPart) => {
      if (dataPart.type !== 'data-thinking') return
      const data = dataPart.data as {
        phase: 'show' | 'confirm' | 'hide'
        messageId: string
      }
      if (data.phase === 'show') requestShow(data.messageId)
      else if (data.phase === 'confirm') confirmThinking(data.messageId)
      else if (data.phase === 'hide') requestHide(data.messageId)
    },
  })

  const [draft, setDraft] = useState('')
  const [attachments, setAttachments] = useState<InputAttachment[]>([])
  const [attachmentNotice, setAttachmentNotice] = useState<string | null>(null)
  // Per-message failure tracking for inline retry. Stores the original parts
  // so retry sends the full payload (text + images) even after attachments
  // were cleared on submit.
  const [failedMessages, setFailedMessages] = useState<
    Map<string, { parts: UIMessage['parts'] }>
  >(new Map())
  const [pendingOptimisticCreated, setPendingOptimisticCreated] = useState<{
    stamp: number
    previousLatestUserId: string | null
  } | null>(null)
  const pendingTradeDecision: TradeRequestDecision | null = null
  const resolvedTradeDecisions: TradeRequestDecisionById = {}
  const tradeDecisionErrors: TradeRequestDecisionErrorById = {}
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const prevStatusRef = useRef<typeof status>(status)
  const announcedWorkspaceRefreshPartsRef = useRef<Set<string>>(new Set())

  const isStreaming = status === 'streaming' || status === 'submitted'
  // Actionable only if the LAST assistant message has an approval-requested
  // part in its LAST step. Mirrors AI SDK's
  // `lastAssistantMessageIsCompleteWithApprovalResponses` — anything older
  // is historical and `addToolApprovalResponse` (which only mutates the
  // last message) can't even target it. Treating older approval-requested
  // parts as live would resurrect dead cards on reload and lock the input.
  const actionableApproval = useMemo(
    () => findActionableApproval(messages),
    [messages]
  )
  const hasPendingApproval = actionableApproval !== null
  const consumedLaunchPromptRef = useRef<string | null>(null)

  useEffect(() => {
    if (!launchPrompt) {
      consumedLaunchPromptRef.current = null
      return
    }
    if (consumedLaunchPromptRef.current === launchPrompt) return
    if (isStreaming || hasPendingApproval) return
    consumedLaunchPromptRef.current = launchPrompt
    void sendMessage({ text: launchPrompt })
    onLaunchPromptConsumed?.()
  }, [
    hasPendingApproval,
    isStreaming,
    launchPrompt,
    onLaunchPromptConsumed,
    sendMessage,
  ])

  const refreshConversationMessages = useCallback(async () => {
    if (!conversationId || status !== 'ready' || hasPendingApproval) return

    const res = await fetch(buildConversationStateUrl(conversationId), {
      credentials: 'include',
    })
    if (!res.ok) return

    const body = (await readJsonResponse<ConversationHydrateResponse>(
      res,
      'conversation history',
    ).catch(() => null)) as
      | ConversationHydrateResponse
      | null
    if (!body?.messages) return
    if (shouldStartNicNacRollover(body.runHealth)) {
      void onRolloverRecommended(conversationId)
      return
    }

    setMessages((current) => mergeServerMessages(current, body.messages ?? []))
  }, [conversationId, hasPendingApproval, onRolloverRecommended, setMessages, status])

  useEffect(() => {
    if (!conversationId || status !== 'ready' || hasPendingApproval) return

    const refreshIfIdle = () => {
      if (document.visibilityState === 'hidden') return
      void refreshConversationMessages()
    }
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        void refreshConversationMessages()
      }
    }

    document.addEventListener('visibilitychange', refreshWhenVisible)
    window.addEventListener('focus', refreshIfIdle)
    window.addEventListener('online', refreshIfIdle)
    const intervalId = window.setInterval(
      refreshIfIdle,
      CONVERSATION_MESSAGE_REFRESH_MS,
    )

    return () => {
      document.removeEventListener('visibilitychange', refreshWhenVisible)
      window.removeEventListener('focus', refreshIfIdle)
      window.removeEventListener('online', refreshIfIdle)
      window.clearInterval(intervalId)
    }
  }, [conversationId, hasPendingApproval, refreshConversationMessages, status])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!conversationId || hasPendingApproval) return
    if (status !== 'streaming' && status !== 'submitted') return

    let cancelled = false
    const timerId = window.setTimeout(async () => {
      if (cancelled || document.visibilityState === 'hidden') return

      let body: ConversationHydrateResponse | null = null
      try {
        const res = await fetch(buildConversationStateUrl(conversationId), {
          credentials: 'include',
        })
        if (!res.ok || cancelled) return

        body = (await readJsonResponse<ConversationHydrateResponse>(
          res,
          'conversation recovery history',
        ).catch(() => null)) as ConversationHydrateResponse | null
        if (!body?.messages || cancelled) return
        if (shouldStartNicNacRollover(body.runHealth)) {
          void onRolloverRecommended(conversationId)
          return
        }
      } catch {
        return
      }

      if (!hasCompletedAssistantAfterLatestUser(messages, body.messages)) return

      setMessages((current) => mergeServerMessages(current, body.messages ?? []))
      if (activeMessageIdRef.current) requestHide(activeMessageIdRef.current)
      await stop()
      textareaRef.current?.focus()
    }, STREAM_COMPLETION_RECOVERY_MS)

    return () => {
      cancelled = true
      window.clearTimeout(timerId)
    }
  }, [
    conversationId,
    hasPendingApproval,
    messages,
    onRolloverRecommended,
    requestHide,
    setMessages,
    status,
    stop,
  ])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const topicsToRefresh = new Set<'trade' | 'site' | 'calendar'>()
    for (const message of messages) {
      for (const [index, part] of (message.parts ?? []).entries()) {
        const shouldRefreshTrade = isTradeWorkspaceMutationPart(part as never)
        const shouldRefreshSite = isSiteWorkspaceMutationPart(part as never)
        const shouldRefreshCalendar = isCalendarWorkspaceMutationPart(part as never)
        if (!shouldRefreshTrade && !shouldRefreshSite && !shouldRefreshCalendar) continue
        const key = getWorkspaceRefreshPartKey(message, part, index)
        if (announcedWorkspaceRefreshPartsRef.current.has(key)) continue
        announcedWorkspaceRefreshPartsRef.current.add(key)
        if (shouldRefreshTrade) topicsToRefresh.add('trade')
        if (shouldRefreshSite) topicsToRefresh.add('site')
        if (shouldRefreshCalendar) topicsToRefresh.add('calendar')
      }
    }

    for (const topic of topicsToRefresh) {
      window.dispatchEvent(
        new CustomEvent(NIC_NAC_WORKSPACE_REFRESH_EVENT, {
          detail: { topic },
        }),
      )
    }
  }, [messages])

  const handleTradeRequestReview = useCallback(
    (action: 'approve' | 'reject', requestId: string) => {
      openTradeRequestReview(requestId, action)
    },
    [],
  )

  // Push streaming + HITL state up so the parent can disable the New button.
  useEffect(() => {
    onChatStateChange({ isStreaming, hasPendingApproval })
  }, [isStreaming, hasPendingApproval, onChatStateChange])

  // Auto-focus input when streaming completes (ready/error transitions), and
  // fire a terminal ThinkingIndicator hide as a safety net in case the server
  // didn't (e.g. transport-level error before the finally clause ran).
  useEffect(() => {
    if (prevStatusRef.current !== status) {
      if (
        prevStatusRef.current === 'streaming' ||
        prevStatusRef.current === 'submitted'
      ) {
        textareaRef.current?.focus()
      }
      if (
        (status === 'error' || status === 'ready') &&
        activeMessageIdRef.current
      ) {
        requestHide(activeMessageIdRef.current)
      }
      prevStatusRef.current = status
    }
  }, [status, requestHide])

  const currentFailedMessage =
    status === 'error' && error ? findLatestUserMessage(messages) : null
  const displayedFailedMessages =
    currentFailedMessage && !failedMessages.has(currentFailedMessage.id)
      ? new Map(failedMessages).set(currentFailedMessage.id, {
          parts: currentFailedMessage.parts,
        })
      : failedMessages

  const hasError = !!error
  const hasMessages = messages.length > 0
  const showLookPicker =
    chatMode === 'required_setup' && requiredSetupStep === 'site_skin'
  const showLiveQueuePanel =
    chatMode === 'required_setup' && requiredSetupStep === 'live_queue_setup'
  const showPreviewPanel =
    chatMode === 'required_setup' &&
    requiredSetupStep === 'final_preview_approval'
  const inputAriaDisabled = hasPendingApproval
  const latestUserId = findLatestUserMessageId(messages)
  const latestPendingUserId =
    pendingOptimisticCreated &&
    latestUserId &&
    latestUserId !== pendingOptimisticCreated.previousLatestUserId
      ? latestUserId
      : null

  const sendWithParts = useCallback(
    async (parts: UIMessage['parts'], replaceMessageId?: string) => {
      // Split parts into text + file payload so we hit useChat's
      // ({ text, files }) overload, which is the canonical send path.
      const textChunks: string[] = []
      const files: FileUIPart[] = []
      for (const p of parts ?? []) {
        const pt = p as {
          type?: string
          text?: string
          mediaType?: string
          url?: string
          filename?: string
        }
        if (pt.type === 'text' && typeof pt.text === 'string') {
          textChunks.push(pt.text)
        } else if (
          pt.type === 'file' &&
          typeof pt.mediaType === 'string' &&
          typeof pt.url === 'string'
        ) {
          files.push({
            type: 'file',
            mediaType: pt.mediaType,
            url: pt.url,
            ...(pt.filename ? { filename: pt.filename } : {}),
          })
        }
      }
      const text = textChunks.join('\n').trim()
      const optimisticId = replaceMessageId
      try {
        if (text && files.length > 0) {
          await sendMessage({
            text,
            files,
            ...(optimisticId ? { messageId: optimisticId } : {}),
          })
        } else if (files.length > 0) {
          await sendMessage({
            files,
            ...(optimisticId ? { messageId: optimisticId } : {}),
          })
        } else if (text) {
          await sendMessage({
            text,
            ...(optimisticId ? { messageId: optimisticId } : {}),
          })
        }
      } catch {
        // useChat surfaces error state; no rethrow needed.
      }
    },
    [sendMessage]
  )

  const handleSubmit = async () => {
    const text = draft.trim()
    if (!text && attachments.length === 0) return
    // Build canonical parts for failure-retry storage.
    const parts: UIMessage['parts'] = []
    if (text) parts.push({ type: 'text', text } as unknown as UIMessage['parts'][number])
    for (const a of attachments) {
      parts.push({
        type: 'file',
        mediaType: a.mediaType,
        url: a.dataUrl,
        width: a.width,
        height: a.height,
        blurRisk: a.blurRisk,
        lightingRisk: a.lightingRisk,
        subjectCoverage: a.subjectCoverage,
        subjectCentered: a.subjectCentered,
      } as unknown as UIMessage['parts'][number])
    }
    setDraft('')
    setAttachments([])
    setAttachmentNotice(null)
    setPendingOptimisticCreated({
      stamp: Date.now(),
      previousLatestUserId: findLatestUserMessageId(messages),
    })
    await sendWithParts(parts)
  }

  const handleLookChoice = (text: string) => {
    if (hasPendingApproval || isStreaming) return
    void sendMessage({ text })
  }

  const handlePickFiles = async (files: FileList | null, _mode: 'gallery' | 'camera') => {
    if (!files || files.length === 0) return
    const remainingSlots = MAX_ATTACHMENTS - attachments.length
    if (remainingSlots <= 0) {
      setAttachmentNotice(`Max ${MAX_ATTACHMENTS} images per message.`)
      return
    }
    const list = Array.from(files)
    let notice: string | null = null
    if (list.length > remainingSlots) {
      notice = `Kept first ${remainingSlots} — max ${MAX_ATTACHMENTS} per message.`
    }
    const slice = list.slice(0, remainingSlots)
    const failed: string[] = []
    const results = await Promise.all(
      slice.map(async (file, index) => {
        try {
          const compressed = await compressImage(file)
          return {
            index,
            attachment: {
              id: newAttachmentId(),
              dataUrl: compressed.dataUrl,
              mediaType: 'image/jpeg' as const,
              width: compressed.width,
              height: compressed.height,
              blurRisk: compressed.blurRisk,
              lightingRisk: compressed.lightingRisk,
              subjectCoverage: compressed.subjectCoverage,
              subjectCentered: compressed.subjectCentered,
            },
          }
        } catch {
          failed.push(file.name || 'image')
          return null
        }
      })
    )
    const accepted: InputAttachment[] = orderResolvedAttachments(results)
    if (accepted.length > 0) {
      setAttachments((prev) => [...prev, ...accepted].slice(0, MAX_ATTACHMENTS))
    }
    if (failed.length > 0) {
      const detail = failed.length === 1 ? `Couldn't read ${failed[0]}.` : `Couldn't read ${failed.length} files.`
      notice = notice ? `${notice} ${detail}` : detail
    }
    setAttachmentNotice(notice)
  }

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
    setAttachmentNotice(null)
  }

  const handleRetry = useCallback(
    async (messageId: string) => {
      const entry = displayedFailedMessages.get(messageId)
      if (!entry) return
      setFailedMessages((prev) => {
        const next = new Map(prev)
        next.delete(messageId)
        return next
      })
      clearError()
      // Replace the failed message in place by passing its existing id.
      await sendWithParts(entry.parts, messageId)
    },
    [displayedFailedMessages, clearError, sendWithParts]
  )

  return (
    <>
      <ChatHistory isStreaming={isStreaming}>
        {!hasMessages ? <EmptyGreeting mode={chatMode} /> : null}
        {messages.map((m, idx) => {
          const ts = readCreatedAt(
            m,
            latestPendingUserId,
            pendingOptimisticCreated?.stamp ?? null
          )
          if (m.role === 'user') {
            const failed = displayedFailedMessages.get(m.id)
            return (
              <div key={m.id}>
                <UserMessage message={m} timestamp={ts} />
                {failed ? (
                  <ErrorBlock
                    variant="inline"
                    message={getSendErrorMessage(chatMode)}
                    onRetry={() => void handleRetry(m.id)}
                  />
                ) : null}
              </div>
            )
          }
          return (
            <AssistantMessage
              key={m.id}
              message={m}
              timestamp={ts}
              isFirstInRun={isFirstNicNacInRun(messages, idx)}
              isStreamingTail={isStreaming && idx === messages.length - 1}
              isThinking={thinkingFor === m.id}
              onApprove={addToolApprovalResponse}
              onTradeRequestDecision={handleTradeRequestReview}
              pendingTradeDecision={pendingTradeDecision}
              resolvedTradeDecisions={resolvedTradeDecisions}
              tradeDecisionErrors={tradeDecisionErrors}
              actionableApproval={
                actionableApproval?.messageId === m.id
                  ? actionableApproval.approval
                  : null
              }
            />
          )
        })}
        {hasError && displayedFailedMessages.size === 0 ? (
          <ErrorBlock
            variant="global"
            message={
              chatMode === 'required_setup'
                ? REQUIRED_SETUP_SEND_ERROR_MESSAGE
                : "Couldn't reach Nic-Nac just now. If this keeps happening, let Louis know."
            }
            onRetry={() => regenerate()}
          />
        ) : null}
        {showLookPicker ? (
          <RequiredSetupLookPicker
            repId={requiredSetupRepId}
            onChoose={handleLookChoice}
            disabled={isStreaming || hasPendingApproval}
          />
        ) : null}
        {showLiveQueuePanel ? (
          <RequiredSetupLiveQueuePanel
            syncCode={requiredSetupSyncCode}
            onSend={handleLookChoice}
            disabled={isStreaming || hasPendingApproval}
          />
        ) : null}
        {showPreviewPanel ? (
          <RequiredSetupPreviewPanel
            previewHref={requiredSetupPreviewHref}
            onApprove={handleLookChoice}
            disabled={isStreaming || hasPendingApproval}
          />
        ) : null}
      </ChatHistory>
      <InputRow
        ref={textareaRef}
        value={draft}
        onChange={setDraft}
        onSubmit={() => void handleSubmit()}
        disabled={inputAriaDisabled}
        isStreaming={isStreaming}
        attachments={attachments}
        onPickFiles={handlePickFiles}
        onRemoveAttachment={handleRemoveAttachment}
        attachmentNotice={attachmentNotice}
        placeholder={
          hasPendingApproval
            ? 'Approve or cancel above…'
            : chatMode === 'required_setup'
              ? 'Reply to Nic-Nac…'
              : 'Ask Nic-Nac…'
        }
      />
    </>
  )
}

function readCreatedAt(
  m: UIMessage,
  latestPendingUserId: string | null,
  pendingStamp: number | null
): string | number | undefined {
  const meta = m.metadata as { created_at?: string } | undefined
  if (meta?.created_at) return meta.created_at
  return m.id === latestPendingUserId ? pendingStamp ?? undefined : undefined
}

function findLatestUserMessageId(messages: UIMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') return messages[i].id
  }
  return null
}

function findLatestUserMessage(
  messages: UIMessage[]
): { id: string; parts: UIMessage['parts'] } | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      return { id: messages[i].id, parts: messages[i].parts ?? [] }
    }
  }
  return null
}

function isFirstNicNacInRun(messages: UIMessage[], idx: number): boolean {
  if (messages[idx]?.role !== 'assistant') return false
  if (idx === 0) return true
  return messages[idx - 1]?.role === 'user'
}

function UserMessage({ message, timestamp }: { message: UIMessage; timestamp?: string | number }) {
  const parts = message.parts ?? []
  const text = parts
    .map((p) => {
      const pt = p as { type?: string; text?: string }
      return pt.type === 'text' ? pt.text ?? '' : ''
    })
    .join('')
  const images = parts
    .filter((p) => {
      const pt = p as { type?: string; mediaType?: string; url?: string }
      return (
        pt.type === 'file' &&
        typeof pt.mediaType === 'string' &&
        pt.mediaType.startsWith('image/') &&
        typeof pt.url === 'string'
      )
    })
    .map((p) => ({ url: (p as { url: string }).url }))
  if (!text && images.length === 0) return null
  return (
    <Bubble variant="rep" text={text || undefined} images={images} timestamp={timestamp} />
  )
}

function AssistantMessage({
  message,
  timestamp,
  isFirstInRun,
  isStreamingTail,
  isThinking,
  onApprove,
  onTradeRequestDecision,
  pendingTradeDecision,
  resolvedTradeDecisions,
  tradeDecisionErrors,
  actionableApproval,
}: {
  message: UIMessage
  timestamp?: string | number
  isFirstInRun: boolean
  isStreamingTail: boolean
  isThinking: boolean
  onApprove: ApprovalResponseFn
  onTradeRequestDecision?: (
    action: 'approve' | 'reject',
    requestId: string,
  ) => void
  pendingTradeDecision: TradeRequestDecision | null
  resolvedTradeDecisions: TradeRequestDecisionById
  tradeDecisionErrors: TradeRequestDecisionErrorById
  // Non-null only when this message is the LAST assistant message AND its
  // last step contains an approval-requested part. Stale historical
  // approval-requested parts on earlier messages render nothing — the SDK
  // can't re-target them, and the assistant's resolved reply (or the
  // normalized terminal state from loadConversationForClient) already
  // conveys the outcome.
  actionableApproval: ActionableApproval | null
}) {
  const parts = message.parts ?? []
  const renderables = buildAssistantMessageRenderables(parts)

  // Visibility is server-owned: the route emits transient `data-thinking`
  // signals (show / confirm / hide) and the parent threads `isThinking` here.
  // Approval cards always win so they're never hidden behind the rabbit.
  const showThinking = isThinking && !actionableApproval
  const hasRenderedContent = renderables.length > 0
  const lastRenderableIndex = renderables.length - 1

  return (
    <>
      {showThinking ? (
        <ThinkingIndicator showGlyph={isFirstInRun} />
      ) : (
        renderables.map((item, index) => {
          const showGlyph = isFirstInRun && index === 0
          const itemTimestamp =
            index === lastRenderableIndex ? timestamp : undefined

          if (item.type === 'text') {
            return isStreamingTail ? (
              <StreamingBubble
                key={item.key}
                text={item.text}
                showGlyph={showGlyph}
                timestamp={itemTimestamp}
              />
            ) : (
              <Bubble
                key={item.key}
                variant="nicNac"
                showGlyph={showGlyph}
                text={item.text}
                renderMarkdown
                timestamp={itemTimestamp}
              />
            )
          }

          const cardState = getTradeRequestCardState({
            requestId: item.request.requestId,
            requestStatus: item.request.status,
            pendingTradeDecision,
            resolvedTradeDecisions,
            tradeDecisionErrors,
          })

          return (
            <Bubble
              key={item.key}
              variant="nicNac"
              showGlyph={showGlyph}
              timestamp={itemTimestamp}
            >
              <TradeRequestLiveCard
                request={item.request}
                pendingAction={cardState.pendingAction}
                actionsDisabled={cardState.actionsDisabled}
                terminalNote={cardState.terminalNote}
                errorMessage={cardState.errorMessage}
                onDecision={
                  onTradeRequestDecision ?? unavailableTradeRequestDecision
                }
              />
            </Bubble>
          )
        })
      )}
      {actionableApproval ? (
        <Bubble variant="nicNac" showGlyph={!hasRenderedContent && isFirstInRun}>
          <HITLBlock
            approvalId={actionableApproval.approvalId}
            toolName={actionableApproval.toolName}
            args={actionableApproval.input}
            onRespond={(approved) =>
              onApprove({ id: actionableApproval.approvalId, approved })
            }
          />
        </Bubble>
      ) : null}
    </>
  )
}
