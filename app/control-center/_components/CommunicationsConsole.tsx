'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type MessageConsoleRecipient = {
  id: string
  name: string
  showName: string
  email: string
}

export type MessageConsolePublication = {
  id: string
  title: string
  summary: string | null
  category: string
  priority: string
  status: string
  recipientCount: number
  deliveredCount: number
  readCount: number
  publishedAt: string | null
  senderLabel: string
  senderKey: string | null
  body: string
  actionUrl: string | null
  audienceKind: 'all_active' | 'selected'
  audienceRepIds: string[]
  sourceType: string | null
  sourceId: string | null
}

type ConsoleSnapshot = {
  recipients: MessageConsoleRecipient[]
  publications: MessageConsolePublication[]
}

type Audience =
  | { kind: 'all_active' }
  | { kind: 'selected'; repIds: string[] }

type Preview = {
  audienceToken: string
  recipientCount: number
  recipientSample: MessageConsoleRecipient[]
}

const categories = [
  ['announcement', 'Announcement'],
  ['business_update', 'Business update'],
  ['customer_activity', 'Customer activity'],
  ['monthly_report', 'Monthly report'],
  ['platform_update', 'Platform update'],
  ['help_update', 'Help update'],
  ['blog', 'Blog'],
  ['video', 'Video'],
] as const

const priorities = [
  ['normal', 'Normal'],
  ['important', 'Important'],
  ['action_required', 'Action required'],
] as const

function humanize(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatDate(value: string | null) {
  if (!value) return 'Not published'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not published'
  return date.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function isSafeActionUrl(value: string) {
  if (!value) return true
  if (value.startsWith('/') && !value.startsWith('//')) return true
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

async function readJson(response: Response) {
  const body = (await response.json().catch(() => null)) as
    | Record<string, unknown>
    | null
  if (!response.ok) {
    throw new Error(
      typeof body?.error === 'string'
        ? body.error
        : 'The message request could not be completed.',
    )
  }
  return body ?? {}
}

function MessagePreviewCard({
  body,
  category,
  compact = false,
  priority,
  summary,
  title,
  actionUrl,
}: {
  body: string
  category: string
  compact?: boolean
  priority: string
  summary: string
  title: string
  actionUrl: string
}) {
  return (
    <article
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${
        compact ? 'mx-auto max-w-sm p-4' : 'p-5'
      }`}
    >
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">
          {humanize(category)}
        </span>
        {priority !== 'normal' ? (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
            {humanize(priority)}
          </span>
        ) : null}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-950">
        {title || 'Your message title'}
      </h3>
      {summary ? (
        <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
          {summary}
        </p>
      ) : null}
      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
        {body || 'Your message will appear here.'}
      </p>
      {actionUrl ? (
        <span className="mt-5 inline-flex rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white">
          Open update
        </span>
      ) : null}
    </article>
  )
}

export function CommunicationsConsole() {
  const [snapshot, setSnapshot] = useState<ConsoleSnapshot>({
    recipients: [],
    publications: [],
  })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<'draft' | 'preview' | 'publish' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [publicationId, setPublicationId] = useState<string | null>(null)
  const [senderKey, setSenderKey] = useState<'owner' | 'nic_nac'>('owner')
  const [summary, setSummary] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState('announcement')
  const [priority, setPriority] = useState('normal')
  const [actionUrl, setActionUrl] = useState('')
  const [audienceKind, setAudienceKind] = useState<'all_active' | 'selected'>(
    'all_active',
  )
  const [selectedRepIds, setSelectedRepIds] = useState<string[]>([])
  const [recipientSearch, setRecipientSearch] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const publishPreviewRef = useRef<HTMLElement>(null)

  const loadSnapshot = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/control-center/messages', {
        cache: 'no-store',
      })
      const result = await readJson(response)
      setSnapshot({
        recipients: Array.isArray(result.recipients)
          ? (result.recipients as MessageConsoleRecipient[])
          : [],
        publications: Array.isArray(result.publications)
          ? (result.publications as MessageConsolePublication[])
          : [],
      })
      setError(null)
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Messages could not be loaded.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSnapshot()
  }, [loadSnapshot])

  useEffect(() => {
    if (!preview) return
    window.requestAnimationFrame(() => {
      publishPreviewRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }, [preview])

  const audience: Audience =
    audienceKind === 'all_active'
      ? { kind: 'all_active' }
      : { kind: 'selected', repIds: selectedRepIds }

  const filteredRecipients = useMemo(() => {
    const query = recipientSearch.trim().toLowerCase()
    if (!query) return snapshot.recipients
    return snapshot.recipients.filter((recipient) =>
      [recipient.name, recipient.showName, recipient.email]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [recipientSearch, snapshot.recipients])

  const messagePayload = {
    publicationId: publicationId || undefined,
    senderKey,
    title,
    summary: summary || undefined,
    body,
    category,
    priority,
    actionUrl: actionUrl || undefined,
    audience,
  }

  function validateForm() {
    if (title.trim().length < 3) return 'Add a clear message title.'
    if (body.trim().length < 3) return 'Add the message body.'
    if (audience.kind === 'selected' && audience.repIds.length === 0) {
      return 'Choose at least one active rep.'
    }
    if (!isSafeActionUrl(actionUrl.trim())) {
      return 'Action links must be an internal /path or a secure https:// URL.'
    }
    return null
  }

  async function postOperation(operation: string, extra = {}) {
    const response = await fetch('/api/control-center/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ operation, ...messagePayload, ...extra }),
    })
    return readJson(response)
  }

  async function saveDraft() {
    const formError = validateForm()
    if (formError) {
      setError(formError)
      return
    }
    setBusy('draft')
    setError(null)
    setNotice(null)
    try {
      const wasEditing = Boolean(publicationId)
      const result = await postOperation('save_draft')
      const savedPublication =
        result.publication &&
        typeof result.publication === 'object' &&
        !Array.isArray(result.publication)
          ? (result.publication as Record<string, unknown>)
          : null
      if (typeof savedPublication?.id === 'string') {
        setPublicationId(savedPublication.id)
      }
      setNotice(
        wasEditing
          ? 'Draft updated. No rep received this message.'
          : 'Draft saved. No rep received this message.',
      )
      await loadSnapshot()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Draft failed.')
    } finally {
      setBusy(null)
    }
  }

  async function preparePreview() {
    const formError = validateForm()
    if (formError) {
      setError(formError)
      return
    }
    setBusy('preview')
    setError(null)
    setNotice(null)
    try {
      const result = await postOperation('preview')
      setPreview(result.preview as Preview)
      setConfirming(false)
      setConfirmed(false)
    } catch (previewError) {
      setError(
        previewError instanceof Error ? previewError.message : 'Preview failed.',
      )
    } finally {
      setBusy(null)
    }
  }

  async function publishNow() {
    if (!preview) return
    if (preview.recipientCount > 1 && (!confirming || !confirmed)) {
      setConfirming(true)
      return
    }
    setBusy('publish')
    setError(null)
    setNotice(null)
    try {
      const result = await postOperation('publish', {
        audienceToken: preview.audienceToken,
        expectedRecipientCount: preview.recipientCount,
        confirmed: preview.recipientCount <= 1 || confirmed,
      })
      const sentCount =
        typeof result.recipientCount === 'number'
          ? result.recipientCount
          : preview.recipientCount
      setNotice(
        `Published successfully to ${sentCount} ${
          sentCount === 1 ? 'rep' : 'reps'
        }.`,
      )
      setPreview(null)
      setConfirming(false)
      setConfirmed(false)
      setTitle('')
      setPublicationId(null)
      setSenderKey('owner')
      setSummary('')
      setBody('')
      setActionUrl('')
      setCategory('announcement')
      setPriority('normal')
      setAudienceKind('all_active')
      setSelectedRepIds([])
      setRecipientSearch('')
      await loadSnapshot()
    } catch (publishError) {
      setError(
        publishError instanceof Error
          ? publishError.message
          : 'Publication failed.',
      )
    } finally {
      setBusy(null)
    }
  }

  function toggleRecipient(repId: string) {
    setSelectedRepIds((current) =>
      current.includes(repId)
        ? current.filter((candidate) => candidate !== repId)
        : [...current, repId],
    )
    setPreview(null)
  }

  function continueDraft(publication: MessageConsolePublication) {
    setPublicationId(publication.id)
    setSenderKey(publication.senderKey === 'nic_nac' ? 'nic_nac' : 'owner')
    setTitle(publication.title)
    setSummary(publication.summary ?? '')
    setBody(publication.body)
    setCategory(publication.category)
    setPriority(publication.priority)
    setActionUrl(publication.actionUrl ?? '')
    setAudienceKind(publication.audienceKind)
    setSelectedRepIds(publication.audienceRepIds)
    setPreview(null)
    setConfirming(false)
    setConfirmed(false)
    setError(null)
    setNotice('Draft loaded. Review it before saving or publishing.')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <main className="control-center-surface min-h-screen bg-slate-50 px-5 py-8 text-slate-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-violet-600">
              Sparkle Suite Control Center
            </p>
            <h1 className="mt-1 text-3xl font-semibold">Broadcasts</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Create official Sparkle Suite updates for one or more reps.
              Broadcasts are read-only so they remain distinct from Support and
              Rep Network conversations.
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
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800" role="alert">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800" role="status">
            {notice}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Compose message</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Drafts never notify reps. Preview the frozen audience before publishing.
                </p>
                {publicationId ? (
                  <p className="mt-2 text-xs font-bold uppercase tracking-wide text-violet-700">
                    Editing saved draft
                  </p>
                ) : null}
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                In-app only
              </span>
            </div>

            <div className="mt-6 grid gap-5">
              <label className="grid gap-2 text-sm font-semibold text-slate-800">
                Title
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                  maxLength={140}
                  onChange={(event) => {
                    setTitle(event.target.value)
                    setPreview(null)
                  }}
                  placeholder="What should reps know?"
                  value={title}
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-slate-800">
                Short summary <span className="font-normal text-slate-500">(optional)</span>
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                  maxLength={280}
                  onChange={(event) => {
                    setSummary(event.target.value)
                    setPreview(null)
                  }}
                  placeholder="One-line context shown in the inbox"
                  value={summary}
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-slate-800">
                Post as
                <select
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal"
                  onChange={(event) => {
                    setSenderKey(event.target.value as 'owner' | 'nic_nac')
                    setPreview(null)
                  }}
                  value={senderKey}
                >
                  <option value="owner">Sparkle Suite</option>
                  <option value="nic_nac">Nic-Nac</option>
                </select>
                <span className="text-xs font-normal text-slate-500">
                  The selected sender is recorded with the publication and shown to every recipient.
                </span>
              </label>

              <label className="grid gap-2 text-sm font-semibold text-slate-800">
                Message
                <textarea
                  className="min-h-40 resize-y rounded-lg border border-slate-300 px-3 py-2.5 font-normal leading-6 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                  maxLength={10000}
                  onChange={(event) => {
                    setBody(event.target.value)
                    setPreview(null)
                  }}
                  placeholder="Write the complete update in plain language."
                  value={body}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-slate-800">
                  Category
                  <select
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal"
                    onChange={(event) => {
                      setCategory(event.target.value)
                      setPreview(null)
                    }}
                    value={category}
                  >
                    {categories.map(([value, name]) => (
                      <option key={value} value={value}>{name}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-800">
                  Priority
                  <select
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal"
                    onChange={(event) => {
                      setPriority(event.target.value)
                      setPreview(null)
                    }}
                    value={priority}
                  >
                    {priorities.map(([value, name]) => (
                      <option key={value} value={value}>{name}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="grid gap-2 text-sm font-semibold text-slate-800">
                Action link <span className="font-normal text-slate-500">(optional)</span>
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                  onChange={(event) => {
                    setActionUrl(event.target.value)
                    setPreview(null)
                  }}
                  placeholder="/nic-nac?section=customer-list or https://..."
                  type="url"
                  value={actionUrl}
                />
                <span className="text-xs font-normal text-slate-500">
                  Only internal Sparkle Suite paths and secure HTTPS links are accepted.
                </span>
              </label>

              <fieldset className="rounded-xl border border-slate-200 p-4">
                <legend className="px-1 text-sm font-semibold text-slate-800">Recipients</legend>
                <div className="mt-1 grid gap-3 sm:grid-cols-2">
                  <label className="flex cursor-pointer gap-3 rounded-lg border border-slate-200 p-3">
                    <input
                      checked={audienceKind === 'all_active'}
                      name="audience"
                      onChange={() => {
                        setAudienceKind('all_active')
                        setPreview(null)
                      }}
                      type="radio"
                    />
                    <span>
                      <span className="block text-sm font-semibold">All active reps</span>
                      <span className="mt-1 block text-xs text-slate-500">
                        Currently {snapshot.recipients.length} eligible
                      </span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer gap-3 rounded-lg border border-slate-200 p-3">
                    <input
                      checked={audienceKind === 'selected'}
                      name="audience"
                      onChange={() => {
                        setAudienceKind('selected')
                        setPreview(null)
                      }}
                      type="radio"
                    />
                    <span>
                      <span className="block text-sm font-semibold">Selected reps</span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {selectedRepIds.length} selected
                      </span>
                    </span>
                  </label>
                </div>

                {audienceKind === 'selected' ? (
                  <div className="mt-4">
                    <label className="sr-only" htmlFor="recipient-search">Search active reps</label>
                    <input
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      id="recipient-search"
                      onChange={(event) => setRecipientSearch(event.target.value)}
                      placeholder="Search name, show, or email"
                      type="search"
                      value={recipientSearch}
                    />
                    <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-slate-200">
                      {filteredRecipients.length === 0 ? (
                        <p className="p-4 text-sm text-slate-500">No active reps match that search.</p>
                      ) : filteredRecipients.map((recipient) => (
                        <label className="flex cursor-pointer items-start gap-3 border-b border-slate-100 p-3 last:border-b-0 hover:bg-slate-50" key={recipient.id}>
                          <input
                            checked={selectedRepIds.includes(recipient.id)}
                            className="mt-1"
                            onChange={() => toggleRecipient(recipient.id)}
                            type="checkbox"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-slate-900">{recipient.name}</span>
                            <span className="block truncate text-xs text-slate-500">{recipient.showName} · {recipient.email}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}
              </fieldset>

              <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5">
                <button
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                  disabled={busy !== null}
                  onClick={() => void saveDraft()}
                  type="button"
                >
                  {busy === 'draft' ? 'Saving…' : 'Save draft'}
                </button>
                <button
                  aria-describedby="publish-next-step"
                  className="rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-50"
                  disabled={busy !== null}
                  onClick={() => void preparePreview()}
                  type="button"
                >
                  {busy === 'preview' ? 'Preparing…' : 'Review & publish'}
                </button>
                <p className="basis-full text-xs text-slate-500" id="publish-next-step">
                  Review the frozen audience, then use <strong>Publish now</strong> in the final review.
                </p>
              </div>
            </div>
          </section>

          <aside className="rounded-2xl border border-slate-200 bg-slate-100/70 p-5 shadow-sm xl:sticky xl:top-6 xl:self-start">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Safe preview</h2>
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">No HTML</span>
            </div>
            <div className="mt-4">
              <MessagePreviewCard
                actionUrl={actionUrl}
                body={body}
                category={category}
                priority={priority}
                summary={summary}
                title={title}
              />
            </div>
          </aside>
        </div>

        {preview ? (
          <section aria-labelledby="publish-preview-heading" className="rounded-2xl border-2 border-violet-200 bg-violet-50/40 p-5 shadow-sm md:p-7" ref={publishPreviewRef} tabIndex={-1}>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-violet-700">Audience checked</p>
                <h2 className="mt-1 text-xl font-semibold" id="publish-preview-heading">Final publication preview</h2>
                <p className="mt-2 text-sm text-slate-600">
                  This message will be delivered to <strong>{preview.recipientCount} {preview.recipientCount === 1 ? 'rep' : 'reps'}</strong> in Sparkle Suite.
                </p>
                {preview.recipientSample.length > 0 ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Sample: {preview.recipientSample.map((recipient) => recipient.name).join(', ')}
                  </p>
                ) : null}
              </div>
              <button className="text-sm font-semibold text-slate-600 hover:text-slate-950" onClick={() => setPreview(null)} type="button">Close preview</button>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Desktop</p>
                <MessagePreviewCard actionUrl={actionUrl} body={body} category={category} priority={priority} summary={summary} title={title} />
              </div>
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Mobile</p>
                <MessagePreviewCard actionUrl={actionUrl} body={body} category={category} compact priority={priority} summary={summary} title={title} />
              </div>
            </div>

            {confirming && preview.recipientCount > 1 ? (
              <label className="mt-6 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
                <input checked={confirmed} className="mt-1" onChange={(event) => setConfirmed(event.target.checked)} type="checkbox" />
                <span>
                  <strong>Confirm mass publication.</strong> I reviewed the content and audience and intend to send this in-app message to {preview.recipientCount} reps.
                </span>
              </label>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                className="rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                disabled={busy !== null || (confirming && preview.recipientCount > 1 && !confirmed)}
                onClick={() => void publishNow()}
                type="button"
              >
                {busy === 'publish'
                  ? 'Publishing…'
                  : confirming && preview.recipientCount > 1
                    ? `Confirm and publish to ${preview.recipientCount} reps`
                    : 'Publish now'}
              </button>
              <p className="text-xs text-slate-500">Standalone in-app delivery only. No email or SMS is sent.</p>
            </div>
          </section>
        ) : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Publication history</h2>
              <p className="mt-1 text-sm text-slate-600">Audit recent drafts and published messages, including delivery and read totals.</p>
            </div>
            <button className="text-sm font-semibold text-violet-700 disabled:opacity-50" disabled={loading} onClick={() => void loadSnapshot()} type="button">Refresh</button>
          </div>

          {loading ? (
            <p className="mt-6 text-sm text-slate-500" role="status">Loading message history…</p>
          ) : snapshot.publications.length === 0 ? (
            <p className="mt-6 rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">No drafts or publications yet.</p>
          ) : (
            <div className="mt-5 grid gap-3">
              {snapshot.publications.map((publication) => (
                <article className="grid gap-4 rounded-xl border border-slate-200 p-4 md:grid-cols-[minmax(0,1fr)_auto]" key={publication.id}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{humanize(publication.status)}</span>
                      <span className="text-xs font-semibold text-violet-700">{humanize(publication.category)}</span>
                      {publication.priority !== 'normal' ? <span className="text-xs font-semibold text-amber-700">{humanize(publication.priority)}</span> : null}
                    </div>
                    <h3 className="mt-2 truncate text-base font-semibold">{publication.title}</h3>
                    {publication.summary ? <p className="mt-1 line-clamp-2 text-sm text-slate-600">{publication.summary}</p> : null}
                    <p className="mt-2 text-xs text-slate-500">
                      {publication.senderLabel}
                      {publication.senderKey ? ` (${publication.senderKey})` : ''}
                      {' · '}{formatDate(publication.publishedAt)}
                    </p>
                    {publication.sourceType || publication.sourceId ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Source: {publication.sourceType ?? 'operator'}{publication.sourceId ? ` · ${publication.sourceId}` : ''}
                      </p>
                    ) : null}
                    {publication.status === 'draft' ? (
                      <button
                        className="mt-3 rounded-lg border border-violet-200 px-3 py-2 text-xs font-semibold text-violet-800 hover:bg-violet-50"
                        onClick={() => continueDraft(publication)}
                        type="button"
                      >
                        Continue draft
                      </button>
                    ) : null}
                  </div>
                  <dl className="grid grid-cols-3 gap-4 text-center md:min-w-64">
                    <div><dt className="text-xs text-slate-500">Recipients</dt><dd className="mt-1 text-lg font-semibold">{publication.recipientCount}</dd></div>
                    <div><dt className="text-xs text-slate-500">Delivered</dt><dd className="mt-1 text-lg font-semibold">{publication.deliveredCount}</dd></div>
                    <div><dt className="text-xs text-slate-500">Read</dt><dd className="mt-1 text-lg font-semibold">{publication.readCount}</dd></div>
                  </dl>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
