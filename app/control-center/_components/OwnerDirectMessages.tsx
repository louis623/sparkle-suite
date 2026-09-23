'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'

import {
  formatCommunicationDate,
  readCommunicationResponse,
} from './control-center-communications'
import { createClient } from '@/lib/supabase/client'

type Recipient = {
  id: string
  name: string
  businessName: string | null
}

type Conversation = {
  id: string
  repId: string
  repName: string
  businessName: string | null
  subject: string
  latestMessagePreview: string | null
  lastMessageAt: string
  unreadCount: number
}

type Attachment = {
  id: string
  contentType: string
  byteSize: number
  width: number
  height: number
  readHref: string
}

type Message = {
  id: string
  senderType: string
  senderLabel: string
  body: string
  createdAt: string
  attachments: Attachment[]
}

const MAX_IMAGES = 3
const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function recipientLabel(recipient: Recipient) {
  return recipient.businessName
    ? `${recipient.name} · ${recipient.businessName}`
    : recipient.name
}

function attachmentError(files: File[]) {
  if (files.length > MAX_IMAGES) return 'Choose up to three images per message.'
  if (files.some((file) => !IMAGE_TYPES.has(file.type))) {
    return 'Images must be JPEG, PNG, or WebP.'
  }
  if (files.some((file) => file.size > MAX_IMAGE_BYTES)) {
    return 'Each image must be 8 MB or smaller.'
  }
  return null
}

function PrivateImage({
  attachment,
  senderLabel,
}: {
  attachment: Attachment
  senderLabel: string
}) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function refreshSignedUrl() {
      try {
        const response = await fetch(attachment.readHref, { cache: 'no-store' })
        const payload = await readCommunicationResponse(response)
        if (typeof payload.url !== 'string') throw new Error('Private image link unavailable')
        const parsed = new URL(payload.url)
        if (parsed.protocol !== 'https:') throw new Error('Private image link is not secure')
        if (!cancelled) {
          setUrl(parsed.toString())
          setError(false)
        }
      } catch {
        if (!cancelled) setError(true)
      }
    }
    void refreshSignedUrl()
    const interval = window.setInterval(() => void refreshSignedUrl(), 90_000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [attachment.readHref, retryKey])

  if (error) {
    return (
      <span className="block rounded-lg border border-rose-200 bg-white p-3 text-xs text-rose-700">
        Image unavailable.{' '}
        <button className="font-semibold underline" onClick={() => {
          setError(false)
          setUrl('')
          setRetryKey((current) => current + 1)
        }} type="button">Try again</button>
      </span>
    )
  }
  if (!url) {
    return <span className="block rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-500">Loading private image…</span>
  }
  return (
    <a className="overflow-hidden rounded-lg border border-slate-200 bg-white" href={url} rel="noopener noreferrer" target="_blank">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt={`Image shared by ${senderLabel}`} className="max-h-64 w-full object-contain" loading="lazy" onError={() => setError(true)} src={url} />
      <span className="block px-2 py-1 text-xs font-medium text-violet-700">Open image</span>
    </a>
  )
}

function DraftImagePreview({
  file,
  onRemove,
}: {
  file: File
  onRemove: () => void
}) {
  const imageRef = useRef<HTMLImageElement | null>(null)
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file)
    if (imageRef.current) imageRef.current.src = objectUrl
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])
  return (
    <li className="w-32 overflow-hidden rounded-lg border border-violet-200 bg-violet-50">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt={`Preview of ${file.name}`} className="h-24 w-full object-cover" ref={imageRef} />
      <div className="flex items-center justify-between gap-1 px-2 py-1">
        <span className="min-w-0 truncate text-xs text-violet-950" title={file.name}>{file.name}</span>
        <button aria-label={`Remove ${file.name}`} className="min-h-8 min-w-8 rounded text-sm font-bold text-violet-700 hover:bg-violet-100" onClick={onRemove} type="button">×</button>
      </div>
    </li>
  )
}

export function OwnerDirectMessages() {
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedRepId, setSelectedRepId] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [query, setQuery] = useState('')
  const [recipientQuery, setRecipientQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [debouncedRecipientQuery, setDebouncedRecipientQuery] = useState('')
  const [recipientHasMore, setRecipientHasMore] = useState(false)
  const [threadHasMore, setThreadHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState<'recipients' | 'threads' | null>(null)
  const [choosingRecipient, setChoosingRecipient] = useState(false)
  const [body, setBody] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendProgress, setSendProgress] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [threadError, setThreadError] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [sentNotice, setSentNotice] = useState('')
  const requestIdRef = useRef<string | null>(null)
  const uploadedDraftRef = useRef<{ requestId: string; uploadIds: string[] } | null>(null)
  const inboxRequestRef = useRef(0)
  const threadRequestRef = useRef(0)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const selectedRecipient = recipients.find((entry) => entry.id === selectedRepId)
  const selectedConversation = conversations.find(
    (entry) => entry.repId === selectedRepId,
  )

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedRecipientQuery(recipientQuery.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [recipientQuery])

  const loadInbox = useCallback(async (quiet = false) => {
    const requestNumber = ++inboxRequestRef.current
    if (!quiet) setLoading(true)
    try {
      const params = new URLSearchParams({
        threadQuery: debouncedQuery,
        recipientQuery: debouncedRecipientQuery,
      })
      const response = await fetch(`/api/control-center/direct-messages?${params}`, {
        cache: 'no-store',
      })
      const payload = await readCommunicationResponse(response)
      if (requestNumber !== inboxRequestRef.current) return
      const nextRecipients = Array.isArray(payload.recipients)
        ? (payload.recipients as Recipient[])
        : []
      const nextConversations = Array.isArray(payload.conversations)
        ? (payload.conversations as Conversation[])
        : []
      setRecipients((current) => quiet
        ? [...nextRecipients, ...current.filter((entry) => !nextRecipients.some((next) => next.id === entry.id))]
        : nextRecipients)
      setConversations((current) => quiet
        ? [...nextConversations, ...current.filter((entry) => !nextConversations.some((next) => next.id === entry.id))]
        : nextConversations)
      if (!quiet) {
        setRecipientHasMore(payload.recipientHasMore === true)
        setThreadHasMore(payload.threadHasMore === true)
      }
      setSelectedRepId((current) => current || nextConversations[0]?.repId || '')
      setError(null)
    } catch (loadError) {
      if (requestNumber !== inboxRequestRef.current) return
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Direct messages could not be loaded.',
      )
    } finally {
      if (!quiet) setLoading(false)
    }
  }, [debouncedQuery, debouncedRecipientQuery])

  const loadMore = useCallback(async (kind: 'recipients' | 'threads') => {
    if (loadingMore) return
    const requestNumber = inboxRequestRef.current
    setLoadingMore(kind)
    try {
      const params = new URLSearchParams({
        threadQuery: debouncedQuery,
        recipientQuery: debouncedRecipientQuery,
        recipientOffset: kind === 'recipients' ? String(recipients.length) : '0',
        threadOffset: kind === 'threads' ? String(conversations.length) : '0',
      })
      const response = await fetch(`/api/control-center/direct-messages?${params}`, {
        cache: 'no-store',
      })
      const payload = await readCommunicationResponse(response)
      if (requestNumber !== inboxRequestRef.current) return
      if (kind === 'recipients') {
        const page = Array.isArray(payload.recipients) ? payload.recipients as Recipient[] : []
        setRecipients((current) => [...current, ...page.filter((entry) => !current.some((existing) => existing.id === entry.id))])
        setRecipientHasMore(payload.recipientHasMore === true)
      } else {
        const page = Array.isArray(payload.conversations) ? payload.conversations as Conversation[] : []
        setConversations((current) => [...current, ...page.filter((entry) => !current.some((existing) => existing.id === entry.id))])
        setThreadHasMore(payload.threadHasMore === true)
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'More direct messages could not be loaded.')
    } finally {
      setLoadingMore(null)
    }
  }, [loadingMore, debouncedQuery, debouncedRecipientQuery, recipients.length, conversations.length])

  const loadThread = useCallback(async (conversationId: string) => {
    const requestNumber = ++threadRequestRef.current
    if (!conversationId) {
      setMessages([])
      setThreadError(null)
      setLoadingThread(false)
      return
    }
    setLoadingThread(true)
    try {
      const response = await fetch(
        `/api/control-center/direct-messages/${encodeURIComponent(conversationId)}`,
        { cache: 'no-store' },
      )
      const payload = await readCommunicationResponse(response)
      if (requestNumber !== threadRequestRef.current) return
      setMessages(Array.isArray(payload.messages) ? (payload.messages as Message[]) : [])
      setThreadError(null)
      setConversations((current) =>
        current.map((entry) =>
          entry.id === conversationId ? { ...entry, unreadCount: 0 } : entry,
        ),
      )
    } catch (loadError) {
      if (requestNumber !== threadRequestRef.current) return
      setThreadError(
        loadError instanceof Error
          ? loadError.message
          : 'This conversation could not be loaded.',
      )
    } finally {
      if (requestNumber === threadRequestRef.current) setLoadingThread(false)
    }
  }, [])

  useEffect(() => {
    void loadInbox()
    const interval = window.setInterval(() => void loadInbox(true), 30_000)
    return () => window.clearInterval(interval)
  }, [loadInbox])

  useEffect(() => {
    void loadThread(selectedConversation?.id ?? '')
  }, [selectedConversation?.id, loadThread])

  useEffect(() => {
    if (!selectedConversation?.id) return
    const interval = window.setInterval(
      () => void loadThread(selectedConversation.id),
      30_000,
    )
    return () => window.clearInterval(interval)
  }, [selectedConversation?.id, loadThread])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' })
  }, [messages.length, selectedRepId])

  function chooseRep(repId: string) {
    if (selectedRepId !== repId) {
      setBody('')
      setImages([])
      setSendError(null)
      setSentNotice('')
      requestIdRef.current = null
      uploadedDraftRef.current = null
    }
    setSelectedRepId(repId)
    setQuery('')
    setChoosingRecipient(false)
  }

  function updateImages(files: FileList | null) {
    const next = files ? [...files] : []
    const invalid = attachmentError(next)
    if (invalid) {
      setSendError(invalid)
      return
    }
    setImages(next)
    setSendError(null)
    setSentNotice('')
    requestIdRef.current = null
    uploadedDraftRef.current = null
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedRepId || sending) return
    const trimmed = body.trim()
    if (!trimmed || trimmed.length > 10_000) {
      setSendError('Write a message of 1–10,000 characters.')
      return
    }
    const invalid = attachmentError(images)
    if (invalid) {
      setSendError(invalid)
      return
    }
    setSending(true)
    setSendProgress(images.length ? 'Preparing private images…' : 'Sending message…')
    setSendError(null)
    setSentNotice('')
    try {
      const requestId = requestIdRef.current ?? crypto.randomUUID()
      requestIdRef.current = requestId
      if (uploadedDraftRef.current?.requestId !== requestId) {
        uploadedDraftRef.current = { requestId, uploadIds: [] }
      }
      const uploadIds = uploadedDraftRef.current.uploadIds
      if (images.length) {
        const storage = createClient().storage
        for (let index = uploadIds.length; index < images.length; index += 1) {
          const image = images[index]
          setSendProgress(`Uploading private image ${index + 1} of ${images.length}…`)
          const ticketResponse = await fetch('/api/control-center/direct-messages/uploads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              repId: selectedRepId,
              clientRequestId: requestId,
              contentType: image.type,
              byteSize: image.size,
            }),
          })
          const ticket = await readCommunicationResponse(ticketResponse)
          if (
            typeof ticket.uploadId !== 'string' ||
            typeof ticket.bucket !== 'string' ||
            typeof ticket.path !== 'string' ||
            typeof ticket.token !== 'string'
          ) {
            throw new Error('The private image upload could not be prepared.')
          }
          const uploaded = await storage
            .from(ticket.bucket)
            .uploadToSignedUrl(ticket.path, ticket.token, image, {
              contentType: image.type,
            })
          if (uploaded.error) throw new Error('The private image upload failed. Please retry.')
          uploadIds.push(ticket.uploadId)
        }
      }
      setSendProgress('Sending message…')
      const response = await fetch('/api/control-center/direct-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repId: selectedRepId,
          body: trimmed,
          clientRequestId: requestId,
          uploadIds,
        }),
      })
      const payload = await readCommunicationResponse(response)
      const sentConversation = payload.conversation as Conversation | undefined
      requestIdRef.current = null
      uploadedDraftRef.current = null
      setBody('')
      setImages([])
      setSentNotice('Message sent privately to this rep.')
      await loadInbox(true)
      if (sentConversation?.id) await loadThread(sentConversation.id)
    } catch (sendFailure) {
      setSendError(
        sendFailure instanceof Error
          ? sendFailure.message
          : 'The message was not confirmed. Retry to check and send safely.',
      )
    } finally {
      setSending(false)
      setSendProgress('')
    }
  }

  return (
    <main className="control-center-surface min-h-screen bg-slate-50 px-5 py-8 text-slate-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-violet-600">
              Sparkle Suite Control Center
            </p>
            <h1 className="mt-1 text-3xl font-semibold">Direct messages</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Private, two-way conversations with one rep at a time. You can
              attach up to three images to a message; broadcasts stay separate.
            </p>
          </div>
          <Link
            className="text-sm font-semibold text-violet-700 hover:text-violet-900"
            href="/control-center"
          >
            Back to Control Center
          </Link>
        </header>

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">
            {error}{' '}
            <button className="font-semibold underline" onClick={() => void loadInbox()} type="button">
              Retry
            </button>
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
          <section aria-label="Direct message conversations" className="h-fit overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">Conversations</h2>
                <button
                  className="rounded-lg bg-violet-700 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-800"
                  onClick={() => setChoosingRecipient((current) => !current)}
                  type="button"
                >
                  New message
                </button>
              </div>
              <label className="sr-only" htmlFor="direct-message-search">Search conversations</label>
              <input
                className="mt-3 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
                id="direct-message-search"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search rep or message"
                value={query}
              />
            </div>
            {choosingRecipient ? (
              <div className="border-b border-slate-200 bg-violet-50 p-4">
                <label className="block text-sm font-semibold" htmlFor="direct-recipient-search">
                  Choose an active rep
                </label>
                <input
                  className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                  id="direct-recipient-search"
                  onChange={(event) => setRecipientQuery(event.target.value)}
                  placeholder="Search name or business"
                  value={recipientQuery}
                />
                <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-violet-100 bg-white">
                  {recipients.length ? recipients.map((recipient) => (
                    <button
                      className="block min-h-11 w-full border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-violet-50"
                      key={recipient.id}
                      onClick={() => chooseRep(recipient.id)}
                      type="button"
                    >
                      {recipientLabel(recipient)}
                    </button>
                  )) : (
                    <p className="p-3 text-sm text-slate-600">No matching active reps.</p>
                  )}
                  {recipientHasMore ? (
                    <button className="min-h-11 w-full px-3 text-left text-sm font-semibold text-violet-700 hover:bg-violet-50" disabled={loadingMore !== null} onClick={() => void loadMore('recipients')} type="button">
                      {loadingMore === 'recipients' ? 'Loading…' : 'Load more reps'}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
            <div className="max-h-[65vh] overflow-y-auto">
              {loading ? <p className="p-5 text-sm text-slate-600" role="status">Loading conversations…</p> : null}
              {!loading && !conversations.length ? (
                <p className="p-5 text-sm text-slate-600">No matching conversations yet. Choose New message to start one.</p>
              ) : null}
              <ol className="divide-y divide-slate-100">
                {conversations.map((conversation) => (
                  <li key={conversation.id}>
                    <button
                      aria-current={selectedRepId === conversation.repId ? 'true' : undefined}
                      className={`w-full p-4 text-left transition ${selectedRepId === conversation.repId ? 'bg-violet-50' : 'hover:bg-slate-50'}`}
                      onClick={() => chooseRep(conversation.repId)}
                      type="button"
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="font-semibold">{conversation.repName}</span>
                        {conversation.unreadCount > 0 ? (
                          <span className="rounded-full bg-fuchsia-600 px-2 py-0.5 text-xs font-bold text-white">
                            {conversation.unreadCount} new
                          </span>
                        ) : null}
                      </span>
                      {conversation.businessName ? <span className="mt-1 block text-xs text-slate-500">{conversation.businessName}</span> : null}
                      <span className="mt-2 line-clamp-2 block text-sm text-slate-600">{conversation.latestMessagePreview || 'Image message'}</span>
                      <time className="mt-2 block text-xs text-slate-500" dateTime={conversation.lastMessageAt}>
                        {formatCommunicationDate(conversation.lastMessageAt)}
                      </time>
                    </button>
                  </li>
                ))}
              </ol>
              {threadHasMore ? (
                <button className="min-h-11 w-full border-t border-slate-100 px-4 text-left text-sm font-semibold text-violet-700 hover:bg-violet-50" disabled={loadingMore !== null} onClick={() => void loadMore('threads')} type="button">
                  {loadingMore === 'threads' ? 'Loading…' : 'Load older conversations'}
                </button>
              ) : null}
            </div>
          </section>

          <section aria-label="Direct message thread" className="flex min-h-[600px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {selectedRepId ? (
              <>
                <div className="border-b border-slate-200 p-5">
                  <h2 className="text-lg font-semibold">{selectedRecipient?.name || selectedConversation?.repName || 'Rep conversation'}</h2>
                  <p className="mt-1 text-sm text-slate-600">{selectedRecipient?.businessName || selectedConversation?.businessName || 'Private conversation'}</p>
                </div>
                <div className="max-h-[60vh] min-h-64 flex-1 space-y-4 overflow-y-auto bg-slate-50 p-5" aria-live="polite">
                  {loadingThread ? <p className="text-sm text-slate-500" role="status">Loading messages…</p> : null}
                  {threadError ? (
                    <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800" role="alert">
                      {threadError}{' '}
                      <button className="font-semibold underline" onClick={() => void loadThread(selectedConversation?.id ?? '')} type="button">Retry</button>
                    </div>
                  ) : null}
                  {!loadingThread && !threadError && messages.length === 0 ? (
                    <p className="text-sm text-slate-600">No messages yet. Write the first private message below.</p>
                  ) : null}
                  {messages.map((message) => {
                    const isOwner = message.senderType !== 'rep'
                    return (
                      <article className={`flex ${isOwner ? 'justify-end' : 'justify-start'}`} key={message.id}>
                        <div className={`max-w-[90%] rounded-2xl border p-4 sm:max-w-[78%] ${isOwner ? 'border-violet-200 bg-violet-50' : 'border-slate-200 bg-white'}`}>
                          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs">
                            <span className="font-bold text-slate-800">{message.senderLabel}</span>
                            <time className="text-slate-500" dateTime={message.createdAt}>{formatCommunicationDate(message.createdAt)}</time>
                          </div>
                          {message.body ? <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{message.body}</p> : null}
                          {message.attachments?.length ? (
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                              {message.attachments.map((attachment) => (
                                <PrivateImage attachment={attachment} key={attachment.id} senderLabel={message.senderLabel} />
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </article>
                    )
                  })}
                  <div ref={bottomRef} />
                </div>
                <form className="border-t border-slate-200 p-5" onSubmit={(event) => void sendMessage(event)}>
                  <label className="block text-sm font-semibold" htmlFor="owner-direct-body">Reply privately</label>
                  <textarea
                    className="mt-2 min-h-28 w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
                    id="owner-direct-body"
                    maxLength={10_000}
                    onChange={(event) => {
                      setBody(event.target.value)
                      setSendError(null)
                      setSentNotice('')
                      requestIdRef.current = null
                      uploadedDraftRef.current = null
                    }}
                    placeholder={`Write to ${selectedRecipient?.name || selectedConversation?.repName || 'this rep'}…`}
                    value={body}
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <label className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50" htmlFor="owner-direct-images">
                        Add images (up to 3)
                      </label>
                      <input
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        id="owner-direct-images"
                        multiple
                        onChange={(event) => {
                          updateImages(event.currentTarget.files)
                          event.currentTarget.value = ''
                        }}
                        type="file"
                      />
                      <p className="mt-1 text-xs text-slate-500">JPEG, PNG, or WebP · 8 MB max each</p>
                    </div>
                    <button className="min-h-11 rounded-lg bg-violet-700 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50" disabled={sending || !body.trim()} type="submit">
                      {sending ? 'Working…' : 'Send message'}
                    </button>
                  </div>
                  {images.length ? (
                    <ul className="mt-3 flex flex-wrap gap-2" aria-label="Images to send">
                      {images.map((image, index) => (
                        <DraftImagePreview file={image} key={`${image.name}-${index}`} onRemove={() => {
                            setImages((current) => current.filter((_, position) => position !== index))
                            requestIdRef.current = null
                            uploadedDraftRef.current = null
                          }} />
                      ))}
                    </ul>
                  ) : null}
                  {sendError ? <p className="mt-3 text-sm text-rose-700" role="alert">{sendError}</p> : null}
                  {sendProgress ? <p className="mt-3 text-sm text-violet-700" role="status">{sendProgress}</p> : null}
                  {sentNotice ? <p className="mt-3 text-sm text-emerald-700" role="status">{sentNotice}</p> : null}
                </form>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-slate-600">
                Choose a conversation or start a new message to an active rep.
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
