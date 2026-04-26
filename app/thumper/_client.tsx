'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useChat } from '@ai-sdk/react'
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  type FileUIPart,
  type UIMessage,
} from 'ai'
import { Bubble } from './components/Bubble'
import { ChatHistory } from './components/ChatHistory'
import { Chips } from './components/Chips'
import { DashboardPlaceholder } from './components/DashboardPlaceholder'
import { EmptyGreeting } from './components/EmptyGreeting'
import { ErrorBlock } from './components/ErrorBlock'
import { HITLBlock } from './components/HITLBlock'
import { InputRow, type InputAttachment } from './components/InputRow'
import { StreamingBubble } from './components/StreamingBubble'
import { ThumperColumn } from './components/ThumperColumn'
import { ThumperGlyph } from './components/ThumperGlyph'
import { ThumperMobileShell } from './components/ThumperMobileShell'
import { compressImage } from '@/lib/thumper/image-compress'
import shellStyles from './_shell.module.css'

const STORAGE_KEY = 'thumper_last_conversation'
const MAX_ATTACHMENTS = 10

function newConversationId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function newAttachmentId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `att_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

interface ApprovalResponseFn {
  (args: { id: string; approved: boolean; reason?: string }): void
}

export default function ThumperClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [conversationId, setConversationId] = useState<string | null>(null)
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(null)
  const [initLoadError, setInitLoadError] = useState<string | null>(null)
  const [isDesktop, setIsDesktop] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [desktopOpen, setDesktopOpen] = useState(true)
  // Lifted from ChatBody so "New conversation" can disable correctly without
  // a context dance. ChatBody pushes streaming/HITL state up via a callback.
  const [chatState, setChatState] = useState<{
    isStreaming: boolean
    hasPendingApproval: boolean
  }>({ isStreaming: false, hasPendingApproval: false })

  // Resolve conversationId from URL, localStorage, or fresh.
  useEffect(() => {
    const urlId = searchParams.get('c')
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    const id = urlId || stored || newConversationId()
    setConversationId(id)
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, id)
    if (!urlId) {
      const qs = new URLSearchParams(Array.from(searchParams.entries()))
      qs.set('c', id)
      router.replace(`/thumper?${qs.toString()}`)
    }
  }, [router, searchParams])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    setIsDesktop(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Load persisted history once conversationId is known.
  useEffect(() => {
    if (!conversationId) return
    let cancelled = false
    setInitialMessages(null)
    setInitLoadError(null)
    ;(async () => {
      try {
        const res = await fetch(`/api/thumper/conversation/${conversationId}`, {
          credentials: 'include',
        })
        if (res.status === 401) {
          setInitLoadError('Not signed in — visit /login and come back.')
          return
        }
        if (res.status === 403) {
          setInitLoadError('This conversation belongs to another rep.')
          return
        }
        const body = await res.json()
        if (cancelled) return
        setInitialMessages((body.messages ?? []) as UIMessage[])
      } catch (err) {
        setInitLoadError(`Failed to load conversation: ${(err as Error).message}`)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [conversationId])

  // Desktop Escape minimizes (only if no HITL pending).
  useEffect(() => {
    if (!isDesktop || !desktopOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (chatState.hasPendingApproval) return
      // If user is typing in a textarea/input, let Escape blur instead of closing.
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) return
      e.preventDefault()
      setDesktopOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isDesktop, desktopOpen, chatState.hasPendingApproval])

  const transport = useMemo(() => {
    if (!conversationId) return null
    return new DefaultChatTransport({
      api: '/api/thumper',
      prepareSendMessagesRequest: ({ messages }) => ({
        body: { conversationId, messages },
      }),
    })
  }, [conversationId])

  const isReady = conversationId && transport && initialMessages !== null

  // "New conversation" — rotate the id, replace URL, clear local state.
  // ChatBody re-mounts via key={conversationId} so useChat resets cleanly.
  const handleNewConversation = useCallback(() => {
    if (chatState.isStreaming || chatState.hasPendingApproval) return
    const next = newConversationId()
    setConversationId(next)
    setInitialMessages(null)
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, next)
    const qs = new URLSearchParams(Array.from(searchParams.entries()))
    qs.set('c', next)
    router.replace(`/thumper?${qs.toString()}`)
  }, [chatState, router, searchParams])

  const newDisabled = chatState.isStreaming || chatState.hasPendingApproval

  const chatContent = isReady ? (
    <ChatBody
      key={conversationId}
      conversationId={conversationId!}
      transport={transport!}
      initialMessages={initialMessages!}
      onChatStateChange={setChatState}
      resetSignal={conversationId!}
    />
  ) : (
    <div className={shellStyles.loading}>{initLoadError ?? 'Loading…'}</div>
  )

  return (
    <div
      className={`${shellStyles.root} ${
        isDesktop && !desktopOpen ? shellStyles.rootMinimized : ''
      }`}
    >
      <DashboardPlaceholder />
      {isDesktop ? (
        desktopOpen ? (
          <ThumperColumn
            variant="desktop"
            onClose={() => setDesktopOpen(false)}
            onNewConversation={handleNewConversation}
            newConversationDisabled={newDisabled}
          >
            {chatContent}
          </ThumperColumn>
        ) : (
          <button
            type="button"
            className={shellStyles.desktopReopen}
            onClick={() => setDesktopOpen(true)}
            aria-label="Open Thumper"
          >
            <ThumperGlyph size={26} />
          </button>
        )
      ) : (
        <ThumperMobileShell
          open={mobileOpen}
          onOpen={() => setMobileOpen(true)}
          onClose={() => setMobileOpen(false)}
        >
          <ThumperColumn
            variant="mobile"
            onClose={() => setMobileOpen(false)}
            onNewConversation={handleNewConversation}
            newConversationDisabled={newDisabled}
          >
            {chatContent}
          </ThumperColumn>
        </ThumperMobileShell>
      )}
    </div>
  )
}

function ChatBody({
  transport,
  initialMessages,
  onChatStateChange,
}: {
  conversationId: string
  transport: DefaultChatTransport<UIMessage>
  initialMessages: UIMessage[]
  onChatStateChange: (s: { isStreaming: boolean; hasPendingApproval: boolean }) => void
  resetSignal: string
}) {
  const {
    messages,
    sendMessage,
    addToolApprovalResponse,
    status,
    error,
    regenerate,
    clearError,
  } = useChat({
    transport,
    messages: initialMessages,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
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
  // Optimistic createdAt for messages that don't yet have server metadata.
  const [optimisticCreated, setOptimisticCreated] = useState<Map<string, number>>(
    new Map()
  )
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const prevStatusRef = useRef<typeof status>(status)

  const isStreaming = status === 'streaming' || status === 'submitted'
  const hasPendingApproval = useMemo(() => {
    for (const m of messages) {
      if (m.role !== 'assistant') continue
      for (const part of m.parts ?? []) {
        const p = part as { state?: string }
        if (p.state === 'approval-requested') return true
      }
    }
    return false
  }, [messages])

  // Push streaming + HITL state up so the parent can disable the New button.
  useEffect(() => {
    onChatStateChange({ isStreaming, hasPendingApproval })
  }, [isStreaming, hasPendingApproval, onChatStateChange])

  // Auto-focus input when streaming completes (ready/error transitions).
  useEffect(() => {
    if (prevStatusRef.current !== status) {
      if (
        prevStatusRef.current === 'streaming' ||
        prevStatusRef.current === 'submitted'
      ) {
        textareaRef.current?.focus()
      }
      prevStatusRef.current = status
    }
  }, [status])

  // On error transition, mark the most recent user message without a paired
  // assistant response as failed so the inline retry surfaces.
  useEffect(() => {
    if (status !== 'error' || !error) return
    // Find the latest user message that is the last in the list (no assistant
    // reply yet) — that's the one whose send broke.
    let lastUser: UIMessage | undefined
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUser = messages[i]
        break
      }
    }
    if (!lastUser) return
    setFailedMessages((prev) => {
      if (prev.has(lastUser!.id)) return prev
      const next = new Map(prev)
      next.set(lastUser!.id, { parts: lastUser!.parts ?? [] })
      return next
    })
  }, [status, error, messages])

  const hasError = !!error
  const hasMessages = messages.length > 0
  const chipsVisible = !isStreaming && !hasPendingApproval && !hasError
  const inputAriaDisabled = hasPendingApproval

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
      } as unknown as UIMessage['parts'][number])
    }
    setDraft('')
    setAttachments([])
    setAttachmentNotice(null)
    // Mark optimistic createdAt — the AI SDK assigns the message id internally,
    // so we won't know it until messages updates. We tag the latest user msg
    // in a follow-up effect by id, but as a simpler path: stamp Date.now()
    // for the most recently appended user message inside the next render.
    const stampNow = Date.now()
    setOptimisticCreated((prev) => {
      const next = new Map(prev)
      // store under a sentinel; we'll resolve in the messages effect.
      next.set('__pending__', stampNow)
      return next
    })
    await sendWithParts(parts)
  }

  // After messages updates, resolve any __pending__ optimistic stamp onto the
  // latest user message id that doesn't already have one.
  useEffect(() => {
    setOptimisticCreated((prev) => {
      if (!prev.has('__pending__')) return prev
      const stamp = prev.get('__pending__')!
      let lastUserId: string | undefined
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          lastUserId = messages[i].id
          break
        }
      }
      if (!lastUserId || prev.has(lastUserId)) return prev
      const next = new Map(prev)
      next.delete('__pending__')
      next.set(lastUserId, stamp)
      return next
    })
  }, [messages])

  const handleChip = (text: string) => {
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
    const accepted: InputAttachment[] = []
    await Promise.all(
      slice.map(async (file) => {
        try {
          const compressed = await compressImage(file)
          accepted.push({
            id: newAttachmentId(),
            dataUrl: compressed.dataUrl,
            mediaType: 'image/jpeg',
          })
        } catch {
          failed.push(file.name || 'image')
        }
      })
    )
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
      const entry = failedMessages.get(messageId)
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
    [failedMessages, clearError, sendWithParts]
  )

  return (
    <>
      <ChatHistory>
        {!hasMessages ? <EmptyGreeting /> : null}
        {messages.map((m, idx) => {
          const ts = readCreatedAt(m, optimisticCreated)
          if (m.role === 'user') {
            const failed = failedMessages.get(m.id)
            return (
              <div key={m.id}>
                <UserMessage message={m} timestamp={ts} />
                {failed ? (
                  <ErrorBlock
                    variant="inline"
                    message="Couldn't send. Try again?"
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
              isFirstInRun={isFirstThumperInRun(messages, idx)}
              isStreamingTail={isStreaming && idx === messages.length - 1}
              onApprove={addToolApprovalResponse}
            />
          )
        })}
        {hasError && failedMessages.size === 0 ? (
          <ErrorBlock
            variant="global"
            message="Couldn't reach Thumper just now. If this keeps happening, let Louis know."
            onRetry={() => regenerate()}
          />
        ) : null}
      </ChatHistory>
      <Chips
        visible={chipsVisible}
        onPick={handleChip}
        disabled={isStreaming || hasPendingApproval}
      />
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
        placeholder={hasPendingApproval ? 'Approve or cancel above…' : 'Ask Thumper…'}
      />
    </>
  )
}

function readCreatedAt(
  m: UIMessage,
  optimistic: Map<string, number>
): string | number | undefined {
  const meta = m.metadata as { created_at?: string } | undefined
  if (meta?.created_at) return meta.created_at
  return optimistic.get(m.id)
}

function isFirstThumperInRun(messages: UIMessage[], idx: number): boolean {
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
  onApprove,
}: {
  message: UIMessage
  timestamp?: string | number
  isFirstInRun: boolean
  isStreamingTail: boolean
  onApprove: ApprovalResponseFn
}) {
  const parts = message.parts ?? []
  const text = parts
    .map((p) => {
      const pt = p as { type?: string; text?: string }
      return pt.type === 'text' ? pt.text ?? '' : ''
    })
    .join('')
  const pendingApproval = parts.find((p) => {
    const pt = p as { state?: string }
    return pt.state === 'approval-requested'
  }) as
    | {
        state?: string
        toolName?: string
        type?: string
        input?: Record<string, unknown>
        approval?: { id?: string }
      }
    | undefined

  return (
    <>
      {text ? (
        isStreamingTail ? (
          <StreamingBubble text={text} showGlyph={isFirstInRun} timestamp={timestamp} />
        ) : (
          <Bubble
            variant="thumper"
            showGlyph={isFirstInRun}
            text={text}
            renderMarkdown
            timestamp={timestamp}
          />
        )
      ) : null}
      {pendingApproval?.approval?.id ? (
        <Bubble variant="thumper" showGlyph={!text && isFirstInRun}>
          <HITLBlock
            approvalId={pendingApproval.approval.id}
            toolName={
              pendingApproval.toolName ??
              (pendingApproval.type?.startsWith('tool-')
                ? pendingApproval.type.slice('tool-'.length)
                : 'tool')
            }
            args={pendingApproval.input ?? {}}
            onRespond={(approved) =>
              onApprove({ id: pendingApproval.approval!.id!, approved })
            }
          />
        </Bubble>
      ) : null}
    </>
  )
}
