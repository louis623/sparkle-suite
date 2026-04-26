'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useChat } from '@ai-sdk/react'
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  type UIMessage,
} from 'ai'
import { Bubble } from './components/Bubble'
import { ChatHistory } from './components/ChatHistory'
import { Chips } from './components/Chips'
import { DashboardPlaceholder } from './components/DashboardPlaceholder'
import { EmptyGreeting } from './components/EmptyGreeting'
import { ErrorBlock } from './components/ErrorBlock'
import { HITLBlock } from './components/HITLBlock'
import { InputRow } from './components/InputRow'
import { StreamingBubble } from './components/StreamingBubble'
import { ThumperColumn } from './components/ThumperColumn'
import { ThumperMobileShell } from './components/ThumperMobileShell'
import shellStyles from './_shell.module.css'

const STORAGE_KEY = 'thumper_last_conversation'

function newConversationId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
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

  // Desktop/mobile via matchMedia with change listener — devtools resize
  // reliably swaps shells.
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

  const chatContent = isReady ? (
    <ChatBody
      key={conversationId}
      conversationId={conversationId!}
      transport={transport!}
      initialMessages={initialMessages!}
    />
  ) : (
    <div className={shellStyles.loading}>
      {initLoadError ?? 'Loading…'}
    </div>
  )

  return (
    <div className={shellStyles.root}>
      <DashboardPlaceholder />
      {isDesktop ? (
        <ThumperColumn variant="desktop">{chatContent}</ThumperColumn>
      ) : (
        <ThumperMobileShell
          open={mobileOpen}
          onOpen={() => setMobileOpen(true)}
          onClose={() => setMobileOpen(false)}
        >
          <ThumperColumn variant="mobile" onClose={() => setMobileOpen(false)}>
            {chatContent}
          </ThumperColumn>
        </ThumperMobileShell>
      )}
    </div>
  )
}

function ChatBody({
  conversationId,
  transport,
  initialMessages,
}: {
  conversationId: string
  transport: DefaultChatTransport<UIMessage>
  initialMessages: UIMessage[]
}) {
  const {
    messages,
    sendMessage,
    addToolApprovalResponse,
    status,
    error,
    regenerate,
  } = useChat({
    transport,
    messages: initialMessages,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  })

  const [draft, setDraft] = useState('')

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

  const hasError = !!error
  const hasMessages = messages.length > 0

  // Chips visible per Section D state matrix:
  // IDLE-empty ✓ · IDLE-populated ✓ · STREAMING ✗ · HITL ✗ · ERROR ✓
  const chipsVisible = !isStreaming && !hasPendingApproval

  // Input visually disabled during HITL only. During streaming it's enabled
  // (sending aborts current stream, per Section E).
  const inputAriaDisabled = hasPendingApproval

  const handleSubmit = () => {
    const text = draft.trim()
    if (!text) return
    setDraft('')
    sendMessage({ text })
  }

  const handleChip = (text: string) => {
    if (hasPendingApproval || isStreaming) return
    sendMessage({ text })
  }

  // Used by ChatHistory to retrigger auto-scroll on new content.
  const scrollKey = `${messages.length}:${isStreaming ? '1' : '0'}`

  return (
    <>
      <ChatHistory scrollKey={scrollKey}>
        {!hasMessages ? <EmptyGreeting /> : null}
        {messages.map((m, idx) =>
          m.role === 'user' ? (
            <UserMessage key={m.id} message={m} />
          ) : (
            <AssistantMessage
              key={m.id}
              message={m}
              isFirstInRun={isFirstThumperInRun(messages, idx)}
              isStreamingTail={isStreaming && idx === messages.length - 1}
              onApprove={addToolApprovalResponse}
            />
          )
        )}
        {hasError ? (
          <ErrorBlock
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
        value={draft}
        onChange={setDraft}
        onSubmit={handleSubmit}
        disabled={inputAriaDisabled}
        placeholder={hasPendingApproval ? 'Approve or cancel above…' : 'Ask Thumper…'}
      />
    </>
  )
}

// "First in run" = first thumper message in a contiguous sequence of thumper
// messages with no intervening user message. Used to render the 22px glyph
// only on the first message of each run.
function isFirstThumperInRun(messages: UIMessage[], idx: number): boolean {
  if (messages[idx]?.role !== 'assistant') return false
  if (idx === 0) return true
  return messages[idx - 1]?.role === 'user'
}

function UserMessage({ message }: { message: UIMessage }) {
  const text = (message.parts ?? [])
    .map((p) => {
      const pt = p as { type?: string; text?: string }
      return pt.type === 'text' ? pt.text ?? '' : ''
    })
    .join('')
  if (!text) return null
  return (
    <Bubble variant="rep">
      {text}
    </Bubble>
  )
}

function AssistantMessage({
  message,
  isFirstInRun,
  isStreamingTail,
  onApprove,
}: {
  message: UIMessage
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
          <StreamingBubble text={text} showGlyph={isFirstInRun} />
        ) : (
          <Bubble variant="thumper" showGlyph={isFirstInRun}>
            {text}
          </Bubble>
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
