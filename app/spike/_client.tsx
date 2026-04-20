'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useChat } from '@ai-sdk/react'
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  type UIMessage,
} from 'ai'

const STORAGE_KEY = 'thumper_spike_last_conversation'

function newConversationId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export default function ThumperSpikeClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Resolve conversationId from URL, else localStorage, else create fresh.
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [repEmail, setRepEmail] = useState<string | null>(null)
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(null)
  const [initLoadError, setInitLoadError] = useState<string | null>(null)

  useEffect(() => {
    const urlId = searchParams.get('c')
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    const id = urlId || stored || newConversationId()
    setConversationId(id)
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, id)
    if (!urlId) {
      const qs = new URLSearchParams(Array.from(searchParams.entries()))
      qs.set('c', id)
      router.replace(`/spike?${qs.toString()}`)
    }
  }, [router, searchParams])

  // Load persisted history + current rep email on mount (once conversationId known).
  useEffect(() => {
    if (!conversationId) return
    let cancelled = false
    ;(async () => {
      try {
        const [historyRes, meRes] = await Promise.all([
          fetch(`/api/thumper/spike/conversation/${conversationId}`, {
            credentials: 'include',
          }),
          fetch('/api/thumper/spike/me', { credentials: 'include' }).catch(() => null),
        ])
        if (historyRes.status === 401) {
          setInitLoadError('Not signed in — visit /login and come back.')
          return
        }
        if (historyRes.status === 403) {
          setInitLoadError('This conversation belongs to another rep.')
          return
        }
        const body = await historyRes.json()
        if (cancelled) return
        setInitialMessages((body.messages ?? []) as UIMessage[])
        if (meRes && meRes.ok) {
          const meBody = await meRes.json()
          setRepEmail(meBody?.rep?.email ?? null)
        }
      } catch (err) {
        setInitLoadError(`Failed to load conversation: ${(err as Error).message}`)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [conversationId])

  // ChatTransport reshapes outgoing body to match the server's STRICT contract:
  // only the conversationId + the new user message, no historical messages.
  const transport = useMemo(() => {
    if (!conversationId) return null
    return new DefaultChatTransport({
      api: '/api/thumper/spike',
      prepareSendMessagesRequest: ({ messages }) => ({
        body: {
          conversationId,
          messages,
        },
      }),
    })
  }, [conversationId])

  const isReady = conversationId && transport && initialMessages !== null

  return (
    <div
      style={{
        fontFamily: 'ui-sans-serif, system-ui, -apple-system',
        maxWidth: 860,
        margin: '0 auto',
        padding: 24,
        color: '#111',
      }}
    >
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>Thumper spike</h1>
        <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>
          <strong>rep:</strong> {repEmail ?? '…'} &nbsp;•&nbsp;
          <strong>conversationId:</strong>{' '}
          <code style={{ fontSize: 12 }}>{conversationId ?? '…'}</code>
        </div>
        {initLoadError && (
          <div style={{ color: '#b00020', marginTop: 8, fontSize: 13 }}>{initLoadError}</div>
        )}
      </header>
      {isReady ? (
        <ChatUi
          key={conversationId}
          conversationId={conversationId!}
          transport={transport!}
          initialMessages={initialMessages!}
        />
      ) : (
        <div style={{ color: '#888' }}>Loading…</div>
      )}
    </div>
  )
}

function ChatUi({
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
  } = useChat({
    transport,
    messages: initialMessages,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  })

  const [draft, setDraft] = useState('')
  const disabled = status === 'streaming' || status === 'submitted'

  return (
    <div>
      <div
        style={{
          border: '1px solid #e5e5e5',
          borderRadius: 6,
          padding: 16,
          minHeight: 360,
          background: '#fafafa',
          marginBottom: 12,
        }}
      >
        {messages.length === 0 && (
          <div style={{ color: '#888' }}>Start by asking Thumper to list your board.</div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} onApprove={addToolApprovalResponse} />
        ))}
        {error && (
          <div style={{ color: '#b00020', marginTop: 8 }}>
            error: {String(error.message ?? error)}
          </div>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!draft.trim() || disabled) return
          sendMessage({ text: draft })
          setDraft('')
        }}
        style={{ display: 'flex', gap: 8 }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={disabled ? 'Streaming…' : 'Ask Thumper…'}
          style={{
            flex: 1,
            padding: '8px 10px',
            border: '1px solid #ccc',
            borderRadius: 4,
          }}
          disabled={disabled}
        />
        <button
          type="submit"
          disabled={disabled || !draft.trim()}
          style={{
            padding: '8px 16px',
            background: disabled ? '#ccc' : '#111',
            color: 'white',
            border: 0,
            borderRadius: 4,
            cursor: disabled ? 'default' : 'pointer',
          }}
        >
          Send
        </button>
      </form>
      <div style={{ fontSize: 11, color: '#999', marginTop: 8 }}>
        conversationId: <code>{conversationId}</code>
      </div>
    </div>
  )
}

function MessageBubble({
  message,
  onApprove,
}: {
  message: UIMessage
  onApprove: (args: { id: string; approved: boolean; reason?: string }) => void
}) {
  const isAssistant = message.role === 'assistant'
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isAssistant ? 'flex-start' : 'flex-end',
        margin: '8px 0',
      }}
    >
      <div
        style={{
          maxWidth: '85%',
          padding: '8px 12px',
          borderRadius: 8,
          background: isAssistant ? '#fff' : '#0a84ff',
          color: isAssistant ? '#111' : 'white',
          border: isAssistant ? '1px solid #eee' : 'none',
          whiteSpace: 'pre-wrap',
          fontSize: 14,
        }}
      >
        <strong style={{ fontSize: 11, opacity: 0.6 }}>
          {isAssistant ? 'Thumper' : 'You'}
        </strong>
        <div style={{ marginTop: 4 }}>
          {(message.parts ?? []).map((part, idx) => (
            <PartRenderer key={idx} part={part} onApprove={onApprove} />
          ))}
        </div>
      </div>
    </div>
  )
}

function PartRenderer({
  part,
  onApprove,
}: {
  part: unknown
  onApprove: (args: { id: string; approved: boolean; reason?: string }) => void
}) {
  const p = part as {
    type?: string
    state?: string
    text?: string
    toolName?: string
    input?: unknown
    output?: unknown
    approval?: { id?: string; approved?: boolean; reason?: string }
    errorText?: string
  }

  if (p.type === 'text' && p.text != null) {
    return <div>{p.text}</div>
  }

  if (p.type === 'step-start') return null

  // Tool-call variants — UIMessage represents them as dynamic-tool or tool-<name> parts.
  if (p.type?.startsWith('tool-') || p.type === 'dynamic-tool') {
    const tname = p.toolName ?? (p.type?.startsWith('tool-') ? p.type.slice('tool-'.length) : 'tool')
    const state = p.state ?? 'unknown'

    if (state === 'approval-requested' && p.approval?.id) {
      return (
        <div
          style={{
            marginTop: 8,
            padding: 10,
            border: '1px dashed #f0a000',
            borderRadius: 6,
            background: '#fff7e6',
            color: '#111',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600 }}>
            {tname} needs your approval
          </div>
          <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
            approvalId: <code>{p.approval.id}</code>
          </div>
          <pre
            style={{
              fontSize: 11,
              background: '#f5f5f5',
              padding: 6,
              borderRadius: 4,
              marginTop: 6,
              overflowX: 'auto',
            }}
          >
            {JSON.stringify(p.input, null, 2)}
          </pre>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              onClick={() => onApprove({ id: p.approval!.id!, approved: true })}
              style={{
                padding: '6px 12px',
                background: '#148a3e',
                color: 'white',
                border: 0,
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              Approve
            </button>
            <button
              onClick={() => onApprove({ id: p.approval!.id!, approved: false })}
              style={{
                padding: '6px 12px',
                background: '#b00020',
                color: 'white',
                border: 0,
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              Reject
            </button>
          </div>
        </div>
      )
    }

    return (
      <div style={{ marginTop: 6, fontSize: 12, color: '#555' }}>
        [{tname} · {state}]
        {p.output != null && (
          <pre
            style={{
              fontSize: 11,
              background: '#f5f5f5',
              padding: 6,
              borderRadius: 4,
              marginTop: 4,
              overflowX: 'auto',
              color: '#111',
            }}
          >
            {JSON.stringify(p.output, null, 2)}
          </pre>
        )}
        {p.errorText && <span style={{ color: '#b00020' }}> · {p.errorText}</span>}
      </div>
    )
  }

  return null
}
