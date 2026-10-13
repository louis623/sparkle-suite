import type { SupabaseClient } from '@supabase/supabase-js'

import { ServiceError } from '@/lib/services/errors'
import {
  createSupabaseNoticeLedger,
  type NoticeLedger,
} from '@/lib/services/notice-send-ledger'
import {
  SUITE_LIST_FROM,
  SUITE_LIST_REPLY_TO,
  SUITE_LIST_SEGMENT_ID,
  SUITE_LIST_TOPIC_ID,
  SUITE_OWNER_EMAIL,
  assertFizzEmailHtml,
  publicAppOrigin,
  assertHttpsUrl,
  deliverSingleOwnerEmail,
  isSmokeEnvironment,
} from '@/lib/services/suite-official-notice'
import {
  assertRenderedFizzHtml,
  normalizeFizzContent,
  ownerTestHtml,
  renderFizzIssueHtml,
  type FizzIssueContent,
} from '@/lib/services/fizz-issue-render'
import { publishWorkspaceMessage } from '@/lib/services/workspace-messages'

const ISSUE_ID = /^[0-9]{4}-W(?:0[1-9]|[1-4][0-9]|5[0-3])$/

export type FizzIssueMode = 'test' | 'live'

export type FizzStageInput = {
  issueId: string
  subject: string
  preheader: string
  /** Structured issue content. Raw HTML is rejected; the server renders the Weekly Fizz template. */
  content: FizzIssueContent | Record<string, unknown>
  workspaceTitle: string
  workspaceSummary: string
  workspaceBody: string
  actionUrl?: string | null
  stagedBy: string
}

type ChannelResult = {
  status: 'sent' | 'failed' | 'blocked' | 'in_progress'
  idempotencyKey: string
  error: string | null
  replayed: boolean
  broadcastId?: string | null
  publicationId?: string | null
}

function fizzError(code: string, message: string, statusCode = 400) {
  return new ServiceError({ code, message, userMessage: message, statusCode })
}

export function assertFizzIssueId(issueId: string) {
  const normalized = issueId.trim()
  if (!ISSUE_ID.test(normalized)) {
    throw fizzError('FIZZ_ISSUE_INVALID_ID', 'Issue id must look like 2026-W42.')
  }
  return normalized
}

export function fizzIdempotencyKey(issueId: string, mode: FizzIssueMode, channel: 'email' | 'broadcast') {
  return `fizz-${issueId}-${mode}-${channel}`
}

function mapStage(row: Record<string, unknown>) {
  return {
    issueId: String(row.issue_id),
    subject: String(row.subject),
    preheader: String(row.preheader),
    emailHtml: String(row.email_html),
    workspaceTitle: String(row.workspace_title),
    workspaceSummary: String(row.workspace_summary),
    workspaceBody: String(row.workspace_body),
    actionUrl: typeof row.action_url === 'string' ? row.action_url : null,
    stagedBy: String(row.staged_by),
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : null,
  }
}

async function postResendBroadcast(args: {
  idempotencyKey: string
  subject: string
  html: string
  fetchImpl: typeof fetch
}) {
  const { getResendConfig } = await import('@/lib/resend/config')
  const config = getResendConfig()
  if (!config) return { ok: false as const, error: 'Resend is not configured.', id: null }
  const response = await args.fetchImpl('https://api.resend.com/broadcasts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `${args.idempotencyKey}:create`.slice(0, 256),
    },
    body: JSON.stringify({
      segment_id: SUITE_LIST_SEGMENT_ID,
      topic_id: SUITE_LIST_TOPIC_ID,
      from: SUITE_LIST_FROM,
      reply_to: SUITE_LIST_REPLY_TO,
      subject: args.subject.slice(0, 160),
      html: args.html,
    }),
  })
  const payload = (await response.json().catch(() => null)) as { id?: unknown; message?: unknown } | null
  if (!response.ok || typeof payload?.id !== 'string') {
    const message = typeof payload?.message === 'string' ? payload.message : `Resend returned ${response.status}.`
    return { ok: false as const, error: message.slice(0, 500), id: null }
  }
  const send = await args.fetchImpl(`https://api.resend.com/broadcasts/${payload.id}/send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `${args.idempotencyKey}:send`.slice(0, 256),
    },
    body: '{}',
  })
  if (!send.ok) {
    const sendPayload = (await send.json().catch(() => null)) as { message?: unknown } | null
    const message = typeof sendPayload?.message === 'string' ? sendPayload.message : `Resend returned ${send.status}.`
    return { ok: false as const, error: message.slice(0, 500), id: payload.id }
  }
  return { ok: true as const, error: null, id: payload.id }
}

async function resolveOwnerRepId(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('reps')
    .select('id, email, status')
    .eq('status', 'active')
    .ilike('email', SUITE_OWNER_EMAIL)
  if (error) throw error
  const matches = (data ?? []).filter(
    (row) => String((row as { email?: string }).email ?? '').trim().toLowerCase() === SUITE_OWNER_EMAIL,
  )
  if (matches.length !== 1) {
    throw fizzError(
      'FIZZ_OWNER_REP_UNAVAILABLE',
      'Test mode could not find exactly one active owner rep, so no Workspace post was sent.',
      409,
    )
  }
  return String((matches[0] as { id: string }).id)
}

export async function stageFizzIssue(supabase: SupabaseClient, input: FizzStageInput) {
  const issueId = assertFizzIssueId(input.issueId)
  const subject = input.subject.trim()
  const preheader = input.preheader.trim()
  const workspaceTitle = input.workspaceTitle.trim()
  const workspaceSummary = input.workspaceSummary.trim()
  const workspaceBody = input.workspaceBody.trim()
  if ('emailHtml' in (input as Record<string, unknown>)) {
    throw fizzError('FIZZ_ISSUE_RAW_HTML_REJECTED', 'Raw email HTML is not accepted. Send structured content; the server renders the Weekly Fizz template.')
  }
  const content = normalizeFizzContent(input.content)
  if (subject.length < 3 || subject.length > 160) {
    throw fizzError('FIZZ_ISSUE_INVALID_CONTENT', 'Subject must be 3 to 160 characters.')
  }
  if (!preheader || preheader.length > 180) {
    throw fizzError('FIZZ_ISSUE_INVALID_CONTENT', 'Preheader must be 1 to 180 characters.')
  }
  if (workspaceTitle.length < 3 || workspaceTitle.length > 160) {
    throw fizzError('FIZZ_ISSUE_INVALID_CONTENT', 'Workspace title must be 3 to 160 characters.')
  }
  if (!workspaceSummary || workspaceSummary.length > 500) {
    throw fizzError('FIZZ_ISSUE_INVALID_CONTENT', 'Workspace summary must be 1 to 500 characters.')
  }
  if (workspaceBody.length < 3 || workspaceBody.length > 20_000) {
    throw fizzError('FIZZ_ISSUE_INVALID_CONTENT', 'Workspace body must be 3 to 20000 characters.')
  }
  const emailHtml = assertFizzEmailHtml(renderFizzIssueHtml(content, preheader))
  const actionUrl = input.actionUrl?.trim() ? assertHttpsUrl(input.actionUrl, 'Action link') : null
  const sent = await supabase
    .from('fizz_issue_results')
    .select('idempotency_key')
    .eq('issue_id', issueId)
    .eq('status', 'sent')
    .limit(1)
  if (sent.error) throw sent.error
  if ((sent.data ?? []).length > 0) {
    throw fizzError('FIZZ_ISSUE_ALREADY_SENT', 'This issue already has a sent result and cannot be restaged.', 409)
  }
  const now = new Date().toISOString()
  const payload = {
    issue_id: issueId,
    subject,
    preheader,
    email_html: emailHtml,
    workspace_title: workspaceTitle,
    workspace_summary: workspaceSummary,
    workspace_body: workspaceBody,
    action_url: actionUrl,
    staged_by: input.stagedBy.slice(0, 160),
    updated_at: now,
  }
  const existing = await supabase.from('fizz_staged_issues').select('issue_id').eq('issue_id', issueId).maybeSingle()
  if (existing.error) throw existing.error
  const write = existing.data
    ? supabase.from('fizz_staged_issues').update(payload).eq('issue_id', issueId)
    : supabase.from('fizz_staged_issues').insert(payload)
  const saved = await write.select('*').single()
  if (saved.error || !saved.data) throw saved.error ?? fizzError('FIZZ_ISSUE_STAGE_FAILED', 'The issue could not be staged.', 500)
  return { issue: mapStage(saved.data as Record<string, unknown>) }
}

export async function getFizzIssue(supabase: SupabaseClient, issueIdInput: string) {
  const issueId = assertFizzIssueId(issueIdInput)
  const issue = await supabase.from('fizz_staged_issues').select('*').eq('issue_id', issueId).maybeSingle()
  if (issue.error) throw issue.error
  const results = await supabase
    .from('fizz_issue_results')
    .select('idempotency_key, mode, channel, status, error_message, broadcast_id, result, updated_at')
    .eq('issue_id', issueId)
  if (results.error) throw results.error
  return {
    found: Boolean(issue.data),
    issue: issue.data ? mapStage(issue.data as Record<string, unknown>) : null,
    results: results.data ?? [],
  }
}

async function runChannel(args: {
  ledger: NoticeLedger
  key: string
  seed: Record<string, unknown>
  work: (broadcastId: string | null) => Promise<{ result: Record<string, unknown>; broadcastId?: string | null }>
}): Promise<ChannelResult> {
  const claim = await args.ledger.claim(args.key, args.seed)
  if (claim.action === 'replay') {
    const status = claim.row.status === 'sent' ? 'sent' : claim.row.status === 'failed' ? 'failed' : 'in_progress'
    return {
      status,
      idempotencyKey: args.key,
      error: claim.row.error_message,
      replayed: true,
      broadcastId: claim.row.broadcast_id,
      publicationId: typeof claim.row.result.publicationId === 'string' ? claim.row.result.publicationId : null,
    }
  }
  try {
    const outcome = await args.work(claim.row.broadcast_id)
    if (outcome.broadcastId) await args.ledger.saveBroadcastId(args.key, outcome.broadcastId)
    await args.ledger.markSent(args.key, outcome.result)
    return {
      status: 'sent',
      idempotencyKey: args.key,
      error: null,
      replayed: false,
      broadcastId: outcome.broadcastId ?? null,
      publicationId: typeof outcome.result.publicationId === 'string' ? outcome.result.publicationId : null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Fizz delivery failed.'
    await args.ledger.markFailed(args.key, message)
    return {
      status: 'failed',
      idempotencyKey: args.key,
      error: message.slice(0, 500),
      replayed: false,
    }
  }
}

export async function approveFizzIssue(args: {
  supabase: SupabaseClient
  issueId: string
  mode: FizzIssueMode
  ledger?: NoticeLedger
  fetchImpl?: typeof fetch
  publish?: typeof publishWorkspaceMessage
}) {
  const issueId = assertFizzIssueId(args.issueId)
  if (args.mode !== 'test' && args.mode !== 'live') {
    throw fizzError('FIZZ_ISSUE_INVALID_MODE', 'Mode must be test or live.')
  }
  if (args.mode === 'live' && isSmokeEnvironment()) {
    throw fizzError('FIZZ_LIVE_BLOCKED_ON_SMOKE', 'Live Fizz approval is disabled on Smoke.', 409)
  }
  const loaded = await getFizzIssue(args.supabase, issueId)
  if (!loaded.issue) throw fizzError('FIZZ_ISSUE_NOT_FOUND', 'Stage this issue before approving it.', 404)
  const issue = loaded.issue
  assertRenderedFizzHtml(issue.emailHtml)
  const ledger = args.ledger ?? createSupabaseNoticeLedger(args.supabase, 'fizz_issue_results')
  const fetchImpl = args.fetchImpl ?? fetch
  const publish = args.publish ?? publishWorkspaceMessage
  const emailKey = fizzIdempotencyKey(issueId, args.mode, 'email')
  const broadcastKey = fizzIdempotencyKey(issueId, args.mode, 'broadcast')

  const [email, broadcast] = await Promise.all([
    runChannel({
      ledger,
      key: emailKey,
      seed: { issue_id: issueId, mode: args.mode, channel: 'email' },
      work: async () => {
        if (args.mode === 'test') {
          const sent = await deliverSingleOwnerEmail({
            idempotencyKey: emailKey,
            subject: issue.subject,
            html: ownerTestHtml(issue.emailHtml, `${publicAppOrigin()}/?unsubscribe-preview=fizz-test`),
            fetchImpl,
          })
          if (!sent.ok) throw new Error(sent.error)
          return { result: { recipient: SUITE_OWNER_EMAIL, resendId: sent.id }, broadcastId: sent.id }
        }
        const sent = await postResendBroadcast({
          idempotencyKey: emailKey,
          subject: issue.subject,
          html: issue.emailHtml,
          fetchImpl,
        })
        if (!sent.ok) throw new Error(sent.error)
        return {
          result: { segmentId: SUITE_LIST_SEGMENT_ID, topicId: SUITE_LIST_TOPIC_ID, resendId: sent.id },
          broadcastId: sent.id,
        }
      },
    }),
    runChannel({
      ledger,
      key: broadcastKey,
      seed: { issue_id: issueId, mode: args.mode, channel: 'broadcast' },
      work: async () => {
        const audience =
          args.mode === 'test'
            ? { kind: 'selected' as const, repIds: [await resolveOwnerRepId(args.supabase)] }
            : { kind: 'all_active' as const }
        if (args.mode === 'test' && (audience.kind !== 'selected' || audience.repIds.length !== 1)) {
          throw new Error('Test mode refused an all-rep Workspace post.')
        }
        const publication = await publish(args.supabase, {
          senderKey: 'owner',
          title: issue.workspaceTitle,
          summary: issue.workspaceSummary,
          body: issue.workspaceBody,
          category: 'platform_update',
          priority: 'normal',
          actionLabel: issue.actionUrl ? 'Open update' : null,
          actionUrl: issue.actionUrl,
          audience,
          idempotencyKey: broadcastKey,
          sourceType: 'fizz_issue',
          sourceId: issueId,
        })
        if (args.mode === 'test' && publication.audienceRule.kind !== 'selected') {
          throw new Error('Test mode refused an all-rep Workspace post.')
        }
        if (args.mode === 'test' && publication.audienceCount > 1) {
          throw new Error('Test mode refused a Workspace post with more than the owner rep.')
        }
        return { result: { publicationId: publication.id, audienceKind: publication.audienceRule.kind } }
      },
    }),
  ])

  return {
    issueId,
    mode: args.mode,
    email,
    broadcast,
  }
}
