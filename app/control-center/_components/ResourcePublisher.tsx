'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'

type ResourceRow = {
  id: string
  resourceKey: string
  resourceType: 'help' | 'faq' | 'blog' | 'video'
  title: string
  status: string
  version: number
  publishedAt: string | null
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120)
}

export function ResourcePublisher({ initialResources }: { initialResources: ResourceRow[] }) {
  const [resources, setResources] = useState(initialResources)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [type, setType] = useState<ResourceRow['resourceType']>('blog')
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [body, setBody] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [emailSuiteList, setEmailSuiteList] = useState(false)
  const [emailPreviewHtml, setEmailPreviewHtml] = useState<string | null>(null)

  async function refresh() {
    const response = await fetch('/api/control-center/resources', { credentials: 'include' })
    const payload = (await response.json().catch(() => null)) as
      | { resources?: ResourceRow[]; error?: string }
      | null
    if (!response.ok) throw new Error(payload?.error || 'Unable to refresh resources.')
    setResources(payload?.resources ?? [])
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setMessage(null)
    setError(null)
    try {
      const response = await fetch('/api/control-center/resources', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          resourceKey: slugify(title),
          resourceType: type,
          title,
          summary,
          body: type === 'blog' ? body : '',
          category: 'General',
          changeSummary: '',
          videoProvider: type === 'video' ? 'youtube' : null,
          videoUrl: type === 'video' ? videoUrl || null : null,
          thumbnailUrl: null,
          isFeatured: false,
          announce: true,
          emailSuiteList,
          operation: 'publish',
        }),
      })
      const payload = (await response.json().catch(() => null)) as { error?: string } | null
      if (!response.ok) throw new Error(payload?.error || 'Unable to publish resource.')
      await refresh()
      setTitle('')
      setSummary('')
      setBody('')
      setVideoUrl('')
      setMessage(
        emailSuiteList
          ? 'Published to the Resource Library. The Suite list email result is recorded with that publication.'
          : 'Published to the Resource Library and notified reps in Message Center.',
      )
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Unable to publish resource.',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 text-slate-950">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">Control Center</p>
              <h1 className="mt-1 text-2xl font-semibold">Resource Publisher</h1>
              <p className="mt-2 text-sm text-slate-600">Share a blog or a YouTube video with reps. Publishing automatically creates a receive-only rep announcement.</p>
            </div>
            <Link className="text-sm font-semibold text-violet-700" href="/control-center">Back to Control Center</Link>
          </div>

          <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
            <label className="grid gap-1 text-sm font-medium">
              Resource type
              <select className="rounded-lg border border-slate-300 px-3 py-2" value={type} onChange={(event) => setType(event.target.value as ResourceRow['resourceType'])}>
                <option value="blog">Blog</option>
                <option value="video">Video</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium">Title <span className="font-normal text-slate-500">(optional)</span><input className="rounded-lg border border-slate-300 px-3 py-2" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
            <label className="grid gap-1 text-sm font-medium">Short summary <span className="font-normal text-slate-500">(optional)</span><textarea className="min-h-20 rounded-lg border border-slate-300 px-3 py-2" value={summary} onChange={(event) => setSummary(event.target.value)} /></label>
            {type === 'blog' ? <label className="grid gap-1 text-sm font-medium">Blog content <span className="font-normal text-slate-500">(optional)</span><textarea className="min-h-44 rounded-lg border border-slate-300 px-3 py-2" value={body} onChange={(event) => setBody(event.target.value)} /></label> : null}
            {type === 'video' ? <label className="grid gap-1 text-sm font-medium">YouTube URL <span className="font-normal text-slate-500">(optional)</span><input type="url" className="rounded-lg border border-slate-300 px-3 py-2" value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} /></label> : null}
            <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <input checked={emailSuiteList} className="mt-1" onChange={(event) => setEmailSuiteList(event.target.checked)} type="checkbox" />
              <span><strong>Also email the Suite list.</strong> Off unless checked. Videos use Watch and blogs use Read when a link is available.</span>
            </label>
            <button
              className="justify-self-start rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
              disabled={pending}
              onClick={(event) => {
                event.preventDefault()
                void (async () => {
                  setError(null)
                  const response = await fetch('/api/control-center/resources', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({
                      operation: 'email_preview',
                      resourceType: type,
                      title,
                      summary,
                      body: type === 'blog' ? body : '',
                      videoUrl: type === 'video' ? videoUrl || null : null,
                    }),
                  })
                  const payload = (await response.json().catch(() => null)) as { html?: string; error?: string } | null
                  if (!response.ok) {
                    setError(payload?.error || 'Email preview failed.')
                    return
                  }
                  setEmailPreviewHtml(payload?.html ?? null)
                })()
              }}
              type="button"
            >
              Preview Suite email
            </button>
            {emailPreviewHtml ? <iframe className="h-80 w-full rounded-lg border border-slate-200" sandbox="" srcDoc={emailPreviewHtml} title="Suite email preview" /> : null}
            {error ? <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800" role="alert">{error}</p> : null}
            {message ? <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{message}</p> : null}
            <button disabled={pending} className="rounded-lg bg-violet-700 px-4 py-3 font-semibold text-white disabled:opacity-60" type="submit">{pending ? 'Publishing…' : 'Publish and notify reps'}</button>
          </form>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Published resources</h2>
          <p className="mt-1 text-sm text-slate-600">Every published version keeps a durable revision and announcement record.</p>
          <div className="mt-4 grid gap-3">
            {resources.length ? resources.map((resource) => (
              <article className="rounded-lg border border-slate-200 p-4" key={resource.id}>
                <div className="flex items-center justify-between gap-3"><strong>{resource.title}</strong><span className="rounded-full bg-violet-50 px-2 py-1 text-xs font-bold uppercase text-violet-700">{resource.resourceType}</span></div>
                <p className="mt-2 text-xs text-slate-500">Version {resource.version} · {resource.status}</p>
              </article>
            )) : <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No resources published yet.</p>}
          </div>
        </section>
      </div>
    </main>
  )
}
