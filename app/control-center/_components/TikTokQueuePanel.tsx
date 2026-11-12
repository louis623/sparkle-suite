'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TikTokQueueItem, TikTokDismissal } from '@/lib/services/tiktok-video-queue'
import { BRITT_WITH_BLING_SHOWCASE_VIDEO_URL } from '@/lib/britt-with-bling/constants'
import { getTikTokVideoId } from '@/lib/public-site/tiktok-video-id'
import {
  VIDEO_MIME, VIDEO_MAX_BYTES, POSTER_SOURCE_MAX_BYTES, VIDEO_MIN_SECONDS, VIDEO_MAX_SECONDS,
  VIDEO_MIN_DIMENSION, VIDEO_MAX_DIMENSION, VIDEO_CAP_MESSAGE, VIDEO_CODEC_MESSAGE,
} from '@/lib/public-site/tiktok-video-limits'

type QueueData = { items: TikTokQueueItem[]; dismissals: TikTokDismissal[] }
type UploadTicket = { ticketId: string; video: { path: string; token: string }; poster: { path: string; token: string } }
type Method = 'save_video' | 'screen_record'
type Completion = { ticketId: string; method: Method }

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`/api/control-center/tiktok-queue/${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  const data = await response.json()
  if (!response.ok) {
    const error = new Error(data.error ?? 'The request failed.') as Error & { status?: number }
    error.status = response.status
    throw error
  }
  return data.result as T
}

async function makePoster(file: File) {
  if (!VIDEO_MIME.includes(file.type as typeof VIDEO_MIME[number]) || !file.size || file.size > VIDEO_MAX_BYTES) throw new Error(VIDEO_CAP_MESSAGE)
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  const ready = (event: 'loadeddata' | 'seeked') => new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => finish(new Error(VIDEO_CODEC_MESSAGE)), 8000)
    const finish = (error?: Error) => {
      clearTimeout(timer)
      video.removeEventListener(event, onReady)
      video.removeEventListener('error', onError)
      if (error) reject(error)
      else resolve()
    }
    const onReady = () => finish()
    const onError = () => finish(new Error(VIDEO_CODEC_MESSAGE))
    video.addEventListener(event, onReady, { once: true })
    video.addEventListener('error', onError, { once: true })
  })
  try {
    const load = ready('loadeddata')
    video.src = url
    await load
    if (!Number.isFinite(video.duration) || video.duration < VIDEO_MIN_SECONDS || video.duration > VIDEO_MAX_SECONDS) throw new Error(VIDEO_CAP_MESSAGE)
    if (video.videoWidth < VIDEO_MIN_DIMENSION || video.videoHeight < VIDEO_MIN_DIMENSION || video.videoWidth > VIDEO_MAX_DIMENSION || video.videoHeight > VIDEO_MAX_DIMENSION) throw new Error(VIDEO_CODEC_MESSAGE)
    const seek = ready('seeked')
    video.currentTime = Math.min(1, video.duration / 2)
    await seek
    const canvas = document.createElement('canvas')
    canvas.width = Math.min(720, video.videoWidth)
    canvas.height = Math.round(video.videoHeight * canvas.width / video.videoWidth)
    canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height)
    const encode = (mime: string) => new Promise<Blob | null>(resolve => canvas.toBlob(resolve, mime, 0.82))
    const poster = await encode('image/webp') ?? await encode('image/jpeg')
    if (!poster || !['image/webp', 'image/jpeg'].includes(poster.type) || poster.size > POSTER_SOURCE_MAX_BYTES) throw new Error('The poster could not be created. Try exporting the video again.')
    return poster
  } finally {
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(url)
  }
}

function slotLabel(key: string, slug: string, videoId: string) {
  if (key === 'featured_reveal') return videoId === getTikTokVideoId(BRITT_WITH_BLING_SHOWCASE_VIDEO_URL) ? 'Brittany reveal explainer' : 'Brittany featured reveal'
  if (key === 'showcase') return slug === 'brittwithbling' ? 'What is a Bomb Party? showcase video' : 'Live reveal video'
  return `${slug === 'brittwithbling' ? 'Sparkle moment' : 'About short video'} ${Number(key.slice(-1)) - 1}`
}
function date(value: string) { return new Date(value).toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short' }) + ' ET' }

export function TikTokQueuePanel({ initialQueue, initialArchive }: { initialQueue: QueueData; initialArchive: QueueData }) {
  const [queue, setQueue] = useState(initialQueue)
  const [archive, setArchive] = useState(initialArchive)
  const [tab, setTab] = useState<'queue' | 'archive'>('queue')
  const [hideDemo, setHideDemo] = useState(true)
  const [methods, setMethods] = useState<Record<string, Method>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const retry = useRef<Completion | null>(null)
  const [retryAvailable, setRetryAvailable] = useState(false)
  async function refresh() {
    const results = await Promise.all(['queue', 'archive'].map(async name => {
      const response = await fetch(`/api/control-center/tiktok-queue?tab=${name}`, { cache: 'no-store' })
      if (!response.ok) throw new Error('The queue could not be refreshed.')
      return response.json() as Promise<QueueData>
    }))
    setQueue(results[0])
    setArchive(results[1])
  }
  async function action(id: string, work: () => Promise<unknown>) {
    setBusy(id)
    setFeedback('')
    try { await work(); await refresh() }
    catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Try again.')
      if ([409, 410].includes((error as { status?: number }).status ?? 0)) await refresh().catch(() => {})
    } finally { setBusy(null) }
  }
  async function finish(completion: Completion) {
    setFeedback('Finishing')
    try { await post('complete', completion) }
    catch (error) {
      if (!(error instanceof TypeError)) throw error
      await post('complete', completion)
    }
    retry.current = null
    setRetryAvailable(false)
    setFeedback('Video is live. The item moved to Archive.')
  }
  async function upload(item: TikTokQueueItem, file: File) {
    await action(item.id, async () => {
      const poster = await makePoster(file)
      const ticket = await post<UploadTicket>(`${item.id}/upload-ticket`, { videoContentType: file.type, videoByteSize: file.size, posterContentType: poster.type, posterByteSize: poster.size })
      const bucket = createClient().storage.from('public-site-videos')
      setFeedback('Uploading video')
      const videoResult = await bucket.uploadToSignedUrl(ticket.video.path, ticket.video.token, file, { contentType: file.type })
      if (videoResult.error) throw new Error('Video upload failed. Choose the file again for a new upload ticket.')
      setFeedback('Uploading poster')
      const posterResult = await bucket.uploadToSignedUrl(ticket.poster.path, ticket.poster.token, poster, { contentType: poster.type })
      if (posterResult.error) throw new Error('Poster upload failed. Choose the file again for a new upload ticket.')
      const completion = { ticketId: ticket.ticketId, method: methods[item.id] ?? 'save_video' }
      retry.current = completion
      setRetryAvailable(true)
      await finish(completion)
    })
  }
  const providerNames = { tiktok: 'TikTok', youtube: 'YouTube', instagram: 'Instagram', facebook: 'Facebook' }
  const visible = (rep: TikTokQueueItem['reps']) => !hideDemo || rep.account_classification !== 'demo' || rep.public_site_slug === 'dudesfizzfest'
  const items = (tab === 'queue' ? queue.items : archive.items).filter(item => visible(item.reps))
  return <>
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <button className="rounded-lg border bg-white px-4 py-2" aria-pressed={tab === 'queue'} onClick={() => setTab('queue')}>Queue ({queue.items.filter(item => visible(item.reps)).length})</button>
      <button className="rounded-lg border bg-white px-4 py-2" aria-pressed={tab === 'archive'} onClick={() => setTab('archive')}>Archive</button>
      <button className="rounded-lg border px-4 py-2" disabled={Boolean(busy)} onClick={() => action('refresh', refresh)}>Refresh</button>
      <label className="flex items-center gap-2"><input type="checkbox" checked={hideDemo} onChange={event => setHideDemo(event.target.checked)} />Hide demo/test reps</label>
    </div>
    <p role="status" className="my-4 text-violet-800">{feedback}</p>
    {retryAvailable ? <button disabled={Boolean(busy)} className="mb-4 rounded border px-4 py-2" onClick={() => action('retry', async () => { if (retry.current) await finish(retry.current) })}>Retry finishing upload</button> : null}
    <div className="grid gap-5 md:grid-cols-2">
      {items.map(item => <article key={item.id} className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">{item.reps.business_name || item.reps.display_name}</h2>
        <p>{item.reps.display_name} {item.reps.status !== 'active' ? '· Rep inactive' : ''}</p>
        <a className="text-violet-700 underline" href={`/${item.reps.public_site_slug}`} target="_blank" rel="noopener noreferrer">Open her site</a>
        <div className="my-3 flex flex-wrap gap-2">{item.slot_keys.map(key => <span key={key} className="rounded-full bg-violet-50 px-3 py-1 text-sm">{slotLabel(key, item.reps.public_site_slug, item.tiktok_video_id)}</span>)}</div>
        <p>{providerNames[item.source_provider]}</p>
        <p className="break-all text-sm">{item.source_url}</p>
        <div className="my-3 flex gap-3"><a className="text-violet-700 underline" href={item.source_url} target="_blank" rel="noopener noreferrer">Open link</a><button className="text-violet-700 underline" onClick={() => navigator.clipboard.writeText(item.source_url).then(() => setFeedback('Link copied.')).catch(() => setFeedback('Copy failed. Select and copy the link.'))}>Copy link</button></div>
        <p className="text-sm text-slate-600">Added {date(item.created_at)} · Waiting {Math.max(0, Math.floor((Date.now() - Date.parse(item.created_at)) / 86400000))} days</p>
        {tab === 'queue' ? <>
          {item.source_provider === 'tiktok' && <button className="my-3 text-violet-700 underline" disabled={Boolean(busy)} onClick={() => action(item.id, () => post(`${item.id}/thumbnail`, {}))}>Get TikTok thumbnail</button>}
          {item.thumbnail_attempted_at ? <p className="text-sm">Thumbnail {item.thumbnail_status} · {date(item.thumbnail_attempted_at)}</p> : null}
          <label className="my-3 block">Method<select className="ml-2 rounded border p-2" value={methods[item.id] ?? 'save_video'} onChange={event => setMethods(current => ({ ...current, [item.id]: event.target.value as Method }))}><option value="save_video">Saved from {providerNames[item.source_provider]}</option><option value="screen_record">Screen recording</option></select></label>
          <label className="my-4 block rounded-lg border-2 border-dashed border-violet-300 p-5" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (!busy && event.dataTransfer.files[0]) void upload(item, event.dataTransfer.files[0]) }}>Drop the MP4 here or tap to choose<input aria-label={`Upload ${item.slot_keys.join(', ')}`} className="mt-3 block w-full" type="file" accept="video/mp4,video/quicktime" disabled={Boolean(busy)} onChange={event => { const file = event.target.files?.[0]; if (file) { if (file.size > 25 * 1024 * 1024) setFeedback('Large file, it will use more data for visitors. Trim if you can.'); void upload(item, file) } event.target.value = '' }} /></label>
          <details className="my-3 text-sm"><summary>How to get the file</summary>{item.source_provider === 'tiktok' ? "Open link → Share → Save video." : `Open the ${providerNames[item.source_provider]} link and save the MP4 if the app allows it.`} Otherwise, screen-record with Snipping Tool, trim to the clip, and save as MP4.</details>
          <label className="block text-sm">Archive note<input className="my-2 w-full rounded border p-2" maxLength={500} value={notes[item.id] ?? ''} onChange={event => setNotes(current => ({ ...current, [item.id]: event.target.value }))} /></label>
          <button disabled={Boolean(busy)} className="rounded border px-3 py-2" onClick={() => action(item.id, () => post(`${item.id}/archive`, { note: notes[item.id] ?? '' }))}>Can’t get this one</button>
        </> : <div className="mt-4 space-y-2">
          <p>{item.status === 'cancelled' ? `Cancelled · ${item.cancel_reason === 'rep_inactive' ? 'Rep inactive' : 'Link removed'}` : item.status === 'completed' ? 'Completed' : 'Archived'} {item.operator_note}</p>
          {item.closed_at ? <p className="text-sm">Closed {date(item.closed_at)} · Deletes from this list on {date(new Date(Date.parse(item.closed_at) + 90 * 86400000).toISOString())}</p> : null}
          {item.videoUrl ? <a className="mr-4 text-violet-700 underline" href={item.videoUrl} target="_blank" rel="noopener noreferrer">Hosted video</a> : null}
          <button disabled={Boolean(busy)} className="rounded border px-3 py-2" onClick={() => action(item.id, () => post(`${item.id}/reopen`, {}))}>Reopen</button>
        </div>}
      </article>)}
    </div>
    {!items.length ? <p className="my-6">{tab === 'queue' ? 'No pending videos.' : 'No closed videos.'}</p> : null}
    {tab === 'archive' && archive.dismissals.length ? <section className="mt-8"><h2 className="mb-4 text-xl font-semibold">Dismissed</h2>{archive.dismissals.filter(d => visible(d.reps)).map(d => <article className="mb-4 rounded-xl border bg-white p-5" key={`${d.rep_id}/${d.source_provider}:${d.tiktok_video_id}`}><h3>{d.reps.business_name || d.reps.display_name}</h3><p>{providerNames[d.source_provider]} · Archived (record purged) · {date(d.created_at)}</p><p>{d.slot_keys.map(key => slotLabel(key, d.reps.public_site_slug, d.tiktok_video_id)).join(', ')}</p><a href={d.source_url} target="_blank" rel="noopener noreferrer" className="break-all text-violet-700 underline">{d.source_url}</a><p>{d.note}</p><button disabled={Boolean(busy)} className="mt-3 rounded border px-3 py-2" onClick={() => action(`${d.rep_id}/${d.source_provider}:${d.tiktok_video_id}`, () => post('dismissals/reopen', { repId: d.rep_id, provider: d.source_provider, tiktokVideoId: d.tiktok_video_id }))}>Reopen</button></article>)}</section> : null}
  </>
}
