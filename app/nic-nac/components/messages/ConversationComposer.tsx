'use client'

import { Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import styles from './MessageCenter.module.css'

function getDraftStorageKey(scope: string, conversationId: string) {
  return `sparkle-suite:message-draft:v1:${scope}:${conversationId}`
}

export function ConversationComposer({
  conversationId,
  recipientName,
  draftScope,
  disabled = false,
  error,
  replyFocusToken = 0,
  onSend,
}: {
  conversationId: string
  recipientName: string
  draftScope?: string | null
  disabled?: boolean
  error?: string | null
  replyFocusToken?: number
  onSend: (body: string) => Promise<void>
}) {
  const storageKey = draftScope
    ? getDraftStorageKey(draftScope, conversationId)
    : null
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (!storageKey) {
      setDraft('')
      return
    }
    setDraft(window.sessionStorage.getItem(storageKey) ?? '')
  }, [storageKey])

  useEffect(() => {
    if (replyFocusToken > 0) textareaRef.current?.focus()
  }, [replyFocusToken])

  function updateDraft(value: string) {
    setDraft(value)
    if (!storageKey) return
    if (value) window.sessionStorage.setItem(storageKey, value)
    else window.sessionStorage.removeItem(storageKey)
  }

  async function submit() {
    const body = draft.trim()
    if (!body || sending || disabled) return
    setSending(true)
    setStatus(`Sending message to ${recipientName}.`)
    try {
      await onSend(body)
      updateDraft('')
      setStatus('Message sent.')
      textareaRef.current?.focus()
    } catch {
      setStatus('Message was not sent. Your draft is still here. Try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={styles.composer}>
      <label htmlFor={`message-reply-${conversationId}`}>
        Reply to {recipientName}
      </label>
      <textarea
        ref={textareaRef}
        id={`message-reply-${conversationId}`}
        className="ph-no-capture"
        value={draft}
        rows={3}
        maxLength={4000}
        disabled={disabled || sending}
        placeholder="Write a message"
        onChange={(event) => updateDraft(event.target.value)}
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault()
            void submit()
          }
        }}
      />
      <div className={styles.composerFooter}>
        <span className={styles.composerHint}>Ctrl or ⌘ + Enter to send</span>
        <button
          type="button"
          className={styles.primaryButton}
          disabled={disabled || sending || draft.trim().length === 0}
          onClick={() => void submit()}
        >
          <Send aria-hidden="true" />
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
      <div
        className={error ? styles.errorMessage : styles.srStatus}
        role={error ? 'alert' : 'status'}
        aria-live={error ? 'assertive' : 'polite'}
      >
        {error || status}
      </div>
    </div>
  )
}
