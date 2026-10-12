import { readFileSync } from 'node:fs'
import path from 'node:path'

import type { SupabaseClient } from '@supabase/supabase-js'

import { ServiceError } from '@/lib/services/errors'
import { getResendConfig } from '@/lib/resend/config'
import {
  createSupabaseNoticeLedger,
  type NoticeLedger,
  type NoticeLedgerRow,
} from '@/lib/services/notice-send-ledger'

export const SUITE_LIST_SEGMENT_ID = 'f16adf30-8cb6-4bef-952b-b1f45d800fc1'
export const SUITE_LIST_TOPIC_ID = '0c6d1c9e-3d0a-45b0-8f7e-bc976b2d9cd4'
export const SUITE_OFFICIAL_NOTICE_TEMPLATE_ID = 'd6b0cb08-93ba-4c84-ae12-d577491c8c9a'
export const SUITE_LIST_FROM = 'Sparkle Suite <notifications@yoursparklesuite.com>'
export const SUITE_LIST_REPLY_TO = 'louis@neonrabbit.net'
export const SUITE_OWNER_EMAIL = 'louis@neonrabbit.net'
export const SUITE_NOTICE_TEMPLATE_PATH = path.join(
  process.cwd(),
  'brand-assets/email/official-notices/suite-official-notice.html',
)

const TEMPLATE_VARS = [
  'PREHEADER',
  'HEADLINE',
  'MESSAGE',
  'CTA_LABEL',
  'CTA_URL',
  'THUMBNAIL_HTML',
] as const

export type SuiteNoticeContent = {
  preheader: string
  headline: string
  message: string
  ctaLabel: string
  ctaUrl: string
  thumbnailUrl: string | null
}

export type SuiteNoticeVariables = {
  PREHEADER: string
  HEADLINE: string
  MESSAGE: string
  CTA_LABEL: string
  CTA_URL: string
  THUMBNAIL_HTML: string
}

export type SuiteListDelivery = {
  status: 'sent' | 'failed' | 'blocked' | 'in_progress'
  idempotencyKey: string
  broadcastId: string | null
  error: string | null
  replayed: boolean
}

type FetchImpl = typeof fetch

function noticeError(code: string, message: string, statusCode = 400) {
  return new ServiceError({ code, message, userMessage: message, statusCode })
}

export function escapeNoticeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function isSmokeEnvironment() {
  return (
    process.env.SPARKLE_ENVIRONMENT === 'smoke' ||
    process.env.NEXT_PUBLIC_SPARKLE_ENVIRONMENT === 'smoke'
  )
}

export function publicAppOrigin() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://www.yoursparklesuite.com'
  try {
    const url = new URL(configured)
    if (url.protocol !== 'https:') return 'https://www.yoursparklesuite.com'
    return url.origin
  } catch {
    return 'https://www.yoursparklesuite.com'
  }
}

export function assertHttpsUrl(value: string, field = 'Link') {
  let url: URL
  try {
    url = new URL(value.trim())
  } catch {
    throw noticeError('SUITE_NOTICE_INVALID_URL', `${field} must be a secure https URL.`)
  }
  if (url.protocol !== 'https:' || url.username || url.password || /[\s"<>]/.test(url.toString())) {
    throw noticeError('SUITE_NOTICE_INVALID_URL', `${field} must be a secure https URL.`)
  }
  return url.toString()
}

export function absoluteNoticeUrl(value: string | null | undefined, field = 'Link') {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return 'https://www.yoursparklesuite.com/'
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return `${publicAppOrigin()}${trimmed}`
  }
  return assertHttpsUrl(trimmed, field)
}

function plainMessage(value: string) {
  const text = value.replace(/\r\n/g, '\n').trim()
  const clipped = text.length > 4000 ? `${text.slice(0, 3999).trimEnd()}…` : text
  return escapeNoticeHtml(clipped).replace(/\n/g, '<br>')
}

export function thumbnailHtml(url: string | null, alt: string) {
  if (!url?.trim()) return ''
  const safe = assertHttpsUrl(url, 'Thumbnail')
  return `<img src="${escapeNoticeHtml(safe)}" width="536" height="302" alt="${escapeNoticeHtml(alt).slice(0, 140)}" border="0" style="display:block;width:100%;max-width:536px;height:auto;border:0;outline:none;text-decoration:none;margin:0 0 16px;">`
}

export function youtubeThumbnailUrl(videoUrl: string | null | undefined) {
  if (!videoUrl?.trim()) return null
  let url: URL
  try {
    url = new URL(videoUrl.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'https:' || url.username || url.password) return null
  const host = url.hostname.toLowerCase()
  let id: string | null = null
  if (host === 'youtu.be') id = url.pathname.split('/').filter(Boolean)[0] ?? null
  else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(host)) {
    if (url.pathname === '/watch') id = url.searchParams.get('v')
    else {
      const parts = url.pathname.split('/').filter(Boolean)
      if (parts[0] === 'shorts' || parts[0] === 'embed' || parts[0] === 'live') id = parts[1] ?? null
    }
  }
  if (!id || !/^[A-Za-z0-9_-]{6,20}$/.test(id)) return null
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
}

export function suiteNoticeVariables(content: SuiteNoticeContent): SuiteNoticeVariables {
  const headline = content.headline.trim()
  const ctaLabel = content.ctaLabel.trim()
  if (!headline || !ctaLabel) {
    throw noticeError('SUITE_NOTICE_INVALID_CONTENT', 'A headline and button label are required.')
  }
  const ctaUrl = assertHttpsUrl(content.ctaUrl, 'Button link')
  return {
    PREHEADER: escapeNoticeHtml(content.preheader.trim().slice(0, 180)),
    HEADLINE: escapeNoticeHtml(headline.slice(0, 160)),
    MESSAGE: plainMessage(content.message || headline),
    CTA_LABEL: escapeNoticeHtml(ctaLabel.slice(0, 40)),
    CTA_URL: ctaUrl,
    THUMBNAIL_HTML: thumbnailHtml(content.thumbnailUrl, headline),
  }
}

let templateCache: string | null = null

export function loadSuiteOfficialNoticeTemplate() {
  if (templateCache) return templateCache
  templateCache = readFileSync(SUITE_NOTICE_TEMPLATE_PATH, 'utf8')
  return templateCache
}

export function renderSuiteOfficialNoticeHtml(content: SuiteNoticeContent) {
  const variables = suiteNoticeVariables(content)
  let html = loadSuiteOfficialNoticeTemplate()
  for (const key of TEMPLATE_VARS) {
    html = html.split(`{{{${key}}}}`).join(variables[key])
  }
  return { html, variables }
}

export function publicationNoticeContent(input: {
  title: string
  summary?: string | null
  body: string
  actionUrl?: string | null
}): SuiteNoticeContent {
  const headline = input.title.trim() || 'A note from Sparkle Suite'
  const message = input.body.trim() || input.summary?.trim() || headline
  const preheader = (input.summary?.trim() || message).replace(/\s+/g, ' ').slice(0, 140)
  const hasAction = Boolean(input.actionUrl?.trim())
  return {
    preheader,
    headline,
    message,
    ctaLabel: hasAction ? 'Open update' : 'Open Sparkle Suite',
    ctaUrl: absoluteNoticeUrl(hasAction ? input.actionUrl : 'https://www.yoursparklesuite.com/'),
    thumbnailUrl: null,
  }
}

export function resourceNoticeContent(input: {
  resourceType: string
  title: string
  summary?: string | null
  body?: string | null
  thumbnailUrl?: string | null
  videoUrl?: string | null
  actionUrl?: string | null
}): SuiteNoticeContent {
  const video = input.resourceType === 'video'
  const headline = input.title.trim() || (video ? 'Untitled video' : 'Untitled blog')
  const message = (input.summary?.trim() || input.body?.trim() || headline).slice(0, 4000)
  const candidate = input.thumbnailUrl?.trim() || youtubeThumbnailUrl(input.videoUrl) || ''
  let thumbnailUrl: string | null = null
  if (candidate) {
    try {
      thumbnailUrl = assertHttpsUrl(candidate, 'Thumbnail')
    } catch {
      thumbnailUrl = null
    }
  }
  const watchUrl = video ? input.videoUrl?.trim() || input.actionUrl : input.actionUrl
  return {
    preheader: message.replace(/\s+/g, ' ').slice(0, 140),
    headline,
    message,
    ctaLabel: video ? 'Watch' : 'Read',
    ctaUrl: absoluteNoticeUrl(watchUrl || '/nic-nac?section=resources'),
    thumbnailUrl,
  }
}

type ResendPost = {
  ok: true
  id: string | null
} | {
  ok: false
  error: string
}

async function postResend(
  pathname: string,
  body: Record<string, unknown>,
  idempotencyKey: string,
  fetchImpl: FetchImpl,
): Promise<ResendPost> {
  const config = getResendConfig()
  if (!config) return { ok: false, error: 'Resend is not configured.' }
  const response = await fetchImpl(`https://api.resend.com${pathname}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey.slice(0, 256),
    },
    body: JSON.stringify(body),
  })
  const payload = (await response.json().catch(() => null)) as { id?: unknown; message?: unknown } | null
  if (!response.ok) {
    const message = typeof payload?.message === 'string' ? payload.message : `Resend returned ${response.status}.`
    return { ok: false, error: message.slice(0, 500) }
  }
  return { ok: true, id: typeof payload?.id === 'string' ? payload.id : null }
}

function deliveryFromRow(row: NoticeLedgerRow, idempotencyKey: string, replayed: boolean): SuiteListDelivery {
  const status = row.status === 'sent' ? 'sent' : row.status === 'failed' ? 'failed' : 'in_progress'
  return {
    status,
    idempotencyKey,
    broadcastId: row.broadcast_id,
    error: row.error_message,
    replayed,
  }
}

export async function deliverSuiteListNotice(args: {
  supabase?: SupabaseClient
  ledger?: NoticeLedger
  idempotencyKey: string
  sourceKind: 'workspace_publication' | 'workspace_resource'
  sourceId: string
  content: SuiteNoticeContent
  fetchImpl?: FetchImpl
}): Promise<SuiteListDelivery> {
  const ledger = args.ledger ?? createSupabaseNoticeLedger(args.supabase as SupabaseClient, 'suite_official_notice_sends')
  const rendered = renderSuiteOfficialNoticeHtml(args.content)
  if (isSmokeEnvironment()) {
    return {
      status: 'blocked',
      idempotencyKey: args.idempotencyKey,
      broadcastId: null,
      error: 'Suite list broadcasts stay off on Smoke.',
      replayed: false,
    }
  }
  const claim = await ledger.claim(args.idempotencyKey, {
    source_kind: args.sourceKind,
    source_id: args.sourceId,
  })
  if (claim.action === 'replay') {
    return deliveryFromRow(claim.row, args.idempotencyKey, true)
  }
  const fetchImpl = args.fetchImpl ?? fetch
  let broadcastId = claim.row.broadcast_id
  try {
    if (!broadcastId) {
      const created = await postResend(
        '/broadcasts',
        {
          segment_id: SUITE_LIST_SEGMENT_ID,
          topic_id: SUITE_LIST_TOPIC_ID,
          from: SUITE_LIST_FROM,
          reply_to: SUITE_LIST_REPLY_TO,
          subject: args.content.headline.trim().slice(0, 160),
          template: {
            id: SUITE_OFFICIAL_NOTICE_TEMPLATE_ID,
            variables: rendered.variables,
          },
        },
        `${args.idempotencyKey}:create`,
        fetchImpl,
      )
      if (!created.ok || !created.id) {
        const error = created.ok ? 'Resend did not return a broadcast id.' : created.error
        await ledger.markFailed(args.idempotencyKey, error)
        return {
          status: 'failed',
          idempotencyKey: args.idempotencyKey,
          broadcastId: null,
          error,
          replayed: false,
        }
      }
      broadcastId = created.id
      await ledger.saveBroadcastId(args.idempotencyKey, broadcastId)
    }
    const sent = await postResend(
      `/broadcasts/${broadcastId}/send`,
      {},
      `${args.idempotencyKey}:send`,
      fetchImpl,
    )
    if (!sent.ok) {
      await ledger.markFailed(args.idempotencyKey, sent.error, broadcastId)
      return {
        status: 'failed',
        idempotencyKey: args.idempotencyKey,
        broadcastId,
        error: sent.error,
        replayed: false,
      }
    }
    const result = {
      broadcastId,
      templateId: SUITE_OFFICIAL_NOTICE_TEMPLATE_ID,
      segmentId: SUITE_LIST_SEGMENT_ID,
      topicId: SUITE_LIST_TOPIC_ID,
    }
    await ledger.markSent(args.idempotencyKey, result)
    return {
      status: 'sent',
      idempotencyKey: args.idempotencyKey,
      broadcastId,
      error: null,
      replayed: false,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Suite list send failed.'
    await ledger.markFailed(args.idempotencyKey, message, broadcastId)
    return {
      status: 'failed',
      idempotencyKey: args.idempotencyKey,
      broadcastId,
      error: message.slice(0, 500),
      replayed: false,
    }
  }
}

export async function deliverSingleOwnerEmail(args: {
  idempotencyKey: string
  subject: string
  html: string
  fetchImpl?: FetchImpl
}) {
  if (isSmokeEnvironment() && process.env.SPARKLE_FIZZ_TEST_SEND !== '1') {
    return {
      ok: false as const,
      error: 'Smoke will not send email unless the Fizz test send is explicitly enabled for this process.',
    }
  }
  const to = [SUITE_OWNER_EMAIL]
  const body = {
    from: SUITE_LIST_FROM,
    to,
    reply_to: SUITE_LIST_REPLY_TO,
    subject: args.subject.slice(0, 160),
    html: args.html,
  }
  if (body.to.length !== 1 || body.to[0] !== SUITE_OWNER_EMAIL || 'segment_id' in body || 'bcc' in body) {
    throw noticeError('SUITE_NOTICE_TEST_GUARD', 'The test email refused to leave the owner inbox.', 409)
  }
  const posted = await postResend('/emails', body, `${args.idempotencyKey}:email`, args.fetchImpl ?? fetch)
  if (!posted.ok) return { ok: false as const, error: posted.error }
  return { ok: true as const, id: posted.id }
}

export function assertFizzEmailHtml(html: string) {
  const trimmed = html.trim()
  if (trimmed.length < 20 || trimmed.length > 100_000) {
    throw noticeError('FIZZ_ISSUE_INVALID_HTML', 'Email HTML must be between 20 and 100000 characters.')
  }
  if (/<\s*\/?\s*(script|iframe|object|embed|form)\b/i.test(trimmed) || /\bon\w+\s*=/i.test(trimmed) || /javascript\s*:/i.test(trimmed)) {
    throw noticeError('FIZZ_ISSUE_UNSAFE_HTML', 'Email HTML cannot contain scripts or active content.', 422)
  }
  return trimmed
}
