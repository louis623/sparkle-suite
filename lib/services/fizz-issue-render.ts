import { readFileSync } from 'node:fs'
import path from 'node:path'

import { ServiceError } from '@/lib/services/errors'
import { assertHttpsUrl, escapeNoticeHtml, youtubeThumbnailUrl } from '@/lib/services/suite-official-notice'

export const FIZZ_TEMPLATE_PATH = path.join(
  process.cwd(),
  'brand-assets/email/weekly-fizz-report/weekly-fizz-report.resend-template.html',
)

export const FIZZ_UNSUBSCRIBE_VAR = '{{{RESEND_UNSUBSCRIBE_URL}}}'
export const FIZZ_LATEST_LABEL = 'Latest from Sparkle Suite'

export type FizzIssueItem = {
  headline: string
  summary: string
  whatItMeans: string
  sourceLabel: string
  sourceUrl: string
}

export type FizzIssueContent = {
  issueDate: string
  /** Opener + rundown. Must start with "Good morning". Blank lines split paragraphs. */
  weekNote: string
  items: FizzIssueItem[]
  latest: {
    kind: 'blog' | 'video'
    title: string
    summary: string
    url: string
    thumbnailUrl?: string | null
  }
  cta?: { label: string; url: string } | null
}

function renderError(message: string) {
  return new ServiceError({ code: 'FIZZ_ISSUE_INVALID_CONTENT', message, userMessage: message, statusCode: 400 })
}

function text(value: unknown, field: string, min: number, max: number) {
  const trimmed = typeof value === 'string' ? value.replace(/\r\n/g, '\n').trim() : ''
  if (trimmed.length < min || trimmed.length > max) {
    throw renderError(`${field} must be ${min} to ${max} characters.`)
  }
  if (/<[a-z!/]/i.test(trimmed)) {
    throw renderError(`${field} must be plain text. HTML is not accepted; the server renders the email.`)
  }
  return trimmed
}

const P_INK = "font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#402924;"
const P_MUTED = "font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#775d57;"
export const FIZZ_ITEM_SUMMARY_MAX = 2_000
const LEAD_LABEL_MAX = 40

function escapeWithBreaks(value: string) {
  return escapeNoticeHtml(value).replace(/\n/g, '<br>')
}

function emphasizeLeadLabel(paragraph: string) {
  if (/^(?:https?:\/\/|www\.)/i.test(paragraph)) return escapeWithBreaks(paragraph)
  const lineEnd = paragraph.indexOf('\n')
  const firstLine = lineEnd === -1 ? paragraph : paragraph.slice(0, lineEnd)
  const colon = firstLine.indexOf(':')
  if (colon <= 0 || paragraph.startsWith('//', colon + 1)) return escapeWithBreaks(paragraph)
  const label = firstLine.slice(0, colon).trim()
  if (label.length < 1 || label.length > LEAD_LABEL_MAX) return escapeWithBreaks(paragraph)
  if (/https?:\/\/|www\./i.test(label)) return escapeWithBreaks(paragraph)
  return `<strong>${escapeNoticeHtml(label)}:</strong>${escapeWithBreaks(paragraph.slice(colon + 1))}`
}

function paragraphs(value: string) {
  return value
    .split(/\n\s*\n/)
    .map((para) => `<p style="margin:0 0 16px;${P_INK}">${escapeWithBreaks(para.trim())}</p>`)
    .join('\n')
}

function itemParagraphs(value: string, style: string) {
  return value
    .split(/\n\s*\n/)
    .map((para) => para.trim())
    .filter((para) => para.length > 0)
    .map((para) => `    <p style="margin:0 0 12px;${style}">${emphasizeLeadLabel(para)}</p>`)
    .join('\n')
}

function itemHtml(item: FizzIssueItem, index: number, count: number) {
  const top = index === 0 ? 16 : 24
  const bottom = index === count - 1 ? 32 : 24
  const block = `<tr>
  <td class="pad" bgcolor="#fff6fa" style="background:#fff6fa;padding:${top}px 32px ${bottom}px;">
    <p style="margin:0 0 8px;font-family:'Playfair Display',Georgia,'Times New Roman',serif;font-size:22px;line-height:28px;font-weight:600;color:#402924;">${escapeNoticeHtml(item.headline)}</p>
${itemParagraphs(item.summary, P_INK)}
    <p style="margin:0 0 4px;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;font-weight:700;color:#402924;">What this means for you</p>
${itemParagraphs(item.whatItMeans, P_MUTED)}
    <a href="${escapeNoticeHtml(item.sourceUrl)}" style="font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;font-weight:600;color:#ee2c9b;text-decoration:underline;">${escapeNoticeHtml(item.sourceLabel)}</a>
  </td>
</tr>`
  const divider = index < count - 1
    ? `\n<tr>\n  <td height="16" bgcolor="#fbf5f2" style="height:16px;background:#fbf5f2;font-size:0;line-height:16px;">&nbsp;</td>\n</tr>`
    : ''
  return block + divider
}

export function normalizeFizzContent(raw: unknown): FizzIssueContent {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw renderError('Issue content is required.')
  const input = raw as Record<string, unknown>
  if ('emailHtml' in input || 'html' in input) {
    throw renderError('Raw email HTML is not accepted. Send structured content; the server renders the Weekly Fizz template.')
  }
  const issueDate = text(input.issueDate, 'Issue date', 3, 60)
  const weekNote = text(input.weekNote, 'Week note', 20, 2_000)
  if (!/^good morning\b/i.test(weekNote)) {
    throw renderError('Week note must open with "Good morning".')
  }
  const rawItems = Array.isArray(input.items) ? input.items : []
  if (rawItems.length > 5) throw renderError('An issue has at most five items.')
  const items = rawItems.map((value, index) => {
    const item = (value ?? {}) as Record<string, unknown>
    const n = `Item ${index + 1}`
    return {
      headline: text(item.headline, `${n} headline`, 3, 160),
      summary: text(item.summary, `${n} summary`, 3, FIZZ_ITEM_SUMMARY_MAX),
      whatItMeans: text(item.whatItMeans, `${n} what-this-means`, 3, 800),
      sourceLabel: text(item.sourceLabel ?? 'Source', `${n} source label`, 2, 80),
      sourceUrl: assertHttpsUrl(String(item.sourceUrl ?? ''), `${n} source link`),
    }
  })
  const latestRaw = (input.latest ?? null) as Record<string, unknown> | null
  if (!latestRaw || typeof latestRaw !== 'object') throw renderError('Latest from Sparkle Suite is required.')
  const kind = latestRaw.kind === 'blog' ? 'blog' : latestRaw.kind === 'video' ? 'video' : null
  if (!kind) throw renderError('Latest kind must be blog or video.')
  const url = assertHttpsUrl(String(latestRaw.url ?? ''), 'Latest link')
  const thumbCandidate =
    (typeof latestRaw.thumbnailUrl === 'string' && latestRaw.thumbnailUrl.trim()) ||
    (kind === 'video' ? youtubeThumbnailUrl(url) : null)
  if (!thumbCandidate) throw renderError('Latest needs a thumbnail image (https).')
  const latest = {
    kind,
    title: text(latestRaw.title, 'Latest title', 3, 160),
    summary: text(latestRaw.summary, 'Latest summary', 3, 600),
    url,
    thumbnailUrl: assertHttpsUrl(thumbCandidate, 'Latest thumbnail'),
  } as FizzIssueContent['latest']
  let cta: FizzIssueContent['cta'] = null
  const ctaRaw = input.cta as Record<string, unknown> | null | undefined
  if (ctaRaw && (ctaRaw.label || ctaRaw.url)) {
    cta = { label: text(ctaRaw.label, 'CTA label', 2, 60), url: assertHttpsUrl(String(ctaRaw.url ?? ''), 'CTA link') }
  }
  return { issueDate, weekNote, items, latest, cta }
}

let templateCache: string | null = null
export function loadFizzTemplate() {
  if (templateCache) return templateCache
  templateCache = readFileSync(FIZZ_TEMPLATE_PATH, 'utf8')
  return templateCache
}

export function renderFizzIssueHtml(content: FizzIssueContent, preheader: string) {
  let html = loadFizzTemplate().replace(/<!--\s*\n\s*Resend shell[\s\S]*?-->\n?/, '')
  if (!content.cta) {
    html = html.replace(/\s*<p[^>]*><a href="\{\{\{CTA_URL\}\}\}"[^>]*>\{\{\{CTA_LABEL\}\}\}<\/a><\/p>/, '')
  }
  const items = content.items.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n${content.items
        .map((item, i) => itemHtml(item, i, content.items.length))
        .join('\n')}\n</table>`
    : ''
  const vars: Record<string, string> = {
    PREHEADER: escapeNoticeHtml(preheader),
    ISSUE_DATE: escapeNoticeHtml(content.issueDate),
    WEEK_NOTE: paragraphs(content.weekNote),
    ITEMS_HTML: items,
    LATEST_TITLE: escapeNoticeHtml(content.latest.title),
    LATEST_SUMMARY: escapeNoticeHtml(content.latest.summary),
    LATEST_THUMB_URL: escapeNoticeHtml(content.latest.thumbnailUrl ?? ''),
    LATEST_WATCH_URL: escapeNoticeHtml(content.latest.url),
    LATEST_BUTTON_LABEL: content.latest.kind === 'video' ? 'Watch' : 'Read',
    CTA_LABEL: escapeNoticeHtml(content.cta?.label ?? ''),
    CTA_URL: escapeNoticeHtml(content.cta?.url ?? ''),
  }
  for (const [key, value] of Object.entries(vars)) html = html.split(`{{{${key}}}}`).join(value)
  assertRenderedFizzHtml(html)
  return html
}

export function assertRenderedFizzHtml(html: string) {
  if (!html.includes(FIZZ_UNSUBSCRIBE_VAR)) throw renderError('Rendered Fizz email is missing the unsubscribe link.')
  if (!html.includes(FIZZ_LATEST_LABEL) || !html.includes('#36221d')) {
    throw renderError('Rendered Fizz email is missing the Latest from Sparkle Suite band.')
  }
  const leftover = html.replace(FIZZ_UNSUBSCRIBE_VAR, '').match(/\{\{\{[A-Z_]+\}\}\}/)
  if (leftover) throw renderError(`Rendered Fizz email left ${leftover[0]} unfilled.`)
  return html
}

/** The single owner test email is not a broadcast, so Resend will not fill the unsubscribe variable. */
export function ownerTestHtml(html: string, unsubscribePreviewUrl: string) {
  return html.split(FIZZ_UNSUBSCRIBE_VAR).join(escapeNoticeHtml(unsubscribePreviewUrl))
}
