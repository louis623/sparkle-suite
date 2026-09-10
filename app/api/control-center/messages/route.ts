import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { ServiceError } from '@/lib/services/errors'
import { listOperatorCustomerProfiles } from '@/lib/services/client-account-profiles'
import { previewWorkspaceMessageAudience } from '@/lib/services/workspace-message-audience'
import {
  normalizeWorkspaceMessageActionUrl,
  normalizeWorkspaceMessageBody,
  normalizeWorkspaceMessageText,
} from '@/lib/services/workspace-message-permissions'
import {
  createWorkspaceMessageDraft,
  listWorkspaceMessagePublications,
  publishWorkspaceMessage,
} from '@/lib/services/workspace-messages'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  AuthError,
  getControlCenterAccess,
  OperatorAuthError,
} from '@/lib/supabase/operator-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const categories = [
  'announcement',
  'business_update',
  'customer_activity',
  'monthly_report',
  'platform_update',
  'help_update',
  'blog',
  'video',
] as const

const priorities = ['normal', 'important', 'action_required'] as const

const audienceSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('all_active') }),
  z.object({
    kind: z.literal('selected'),
    repIds: z.array(z.string().trim().min(1)).min(1).max(500),
  }),
])

const contentSchema = z.object({
  publicationId: z.string().trim().min(1).max(100).optional(),
  // Sender identity is an operator-owned choice. Keep this closed rather than
  // accepting an arbitrary database sender key from the browser.
  senderKey: z.enum(['owner', 'nic_nac']).default('owner'),
  title: z.string().trim().min(3).max(160),
  summary: z.string().trim().max(500).optional(),
  body: z.string().trim().min(3).max(20_000),
  category: z.enum(categories),
  priority: z.enum(priorities).default('normal'),
  actionUrl: z.string().trim().max(2_000).optional(),
  audience: audienceSchema,
})

const requestSchema = z.discriminatedUnion('operation', [
  contentSchema.extend({ operation: z.literal('preview') }),
  contentSchema.extend({ operation: z.literal('save_draft') }),
  contentSchema.extend({
    operation: z.literal('publish'),
    audienceToken: z.string().trim().min(16).max(128),
    expectedRecipientCount: z.number().int().min(1).max(10_000),
    confirmed: z.boolean(),
  }),
])

type RawPublication = Record<string, unknown>

function stringValue(row: RawPublication, ...keys: string[]) {
  for (const key of keys) {
    if (typeof row[key] === 'string') return row[key] as string
  }
  return null
}

function numberValue(row: RawPublication, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
  }
  return 0
}

function normalizePublication(value: unknown) {
  const row =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as RawPublication)
      : {}
  const rawBody = row.body
  const body = Array.isArray(rawBody)
    ? rawBody
        .map((block) => {
          if (!block || typeof block !== 'object' || Array.isArray(block)) return ''
          const content = block as Record<string, unknown>
          if (typeof content.text === 'string') return content.text
          if (content.type === 'metric') {
            return [content.label, content.value]
              .filter((part) => typeof part === 'string' || typeof part === 'number')
              .join(': ')
          }
          if (Array.isArray(content.items)) {
            return content.items
              .filter((item): item is string => typeof item === 'string')
              .map((item) => `• ${item}`)
              .join('\n')
          }
          return ''
        })
        .filter(Boolean)
        .join('\n\n')
    : typeof rawBody === 'string'
      ? rawBody
      : ''
  const rawAudience =
    row.audienceRule &&
    typeof row.audienceRule === 'object' &&
    !Array.isArray(row.audienceRule)
      ? (row.audienceRule as Record<string, unknown>)
      : row.audience_rule &&
          typeof row.audience_rule === 'object' &&
          !Array.isArray(row.audience_rule)
        ? (row.audience_rule as Record<string, unknown>)
        : {}
  const rawSnapshot = Array.isArray(row.audienceSnapshot)
    ? row.audienceSnapshot
    : Array.isArray(row.audience_snapshot)
      ? row.audience_snapshot
      : []
  const snapshotRepIds = rawSnapshot
    .map((member) =>
      member && typeof member === 'object' && !Array.isArray(member)
        ? stringValue(member as RawPublication, 'repId', 'rep_id')
        : null,
    )
    .filter((repId): repId is string => Boolean(repId))
  const ruleRepIds = Array.isArray(rawAudience.repIds)
    ? rawAudience.repIds.filter((repId): repId is string => typeof repId === 'string')
    : []
  return {
    id: stringValue(row, 'id') ?? 'unknown',
    title: stringValue(row, 'title') ?? 'Untitled message',
    summary: stringValue(row, 'summary'),
    category: stringValue(row, 'category') ?? 'announcement',
    priority: stringValue(row, 'priority') ?? 'normal',
    status: stringValue(row, 'status') ?? 'draft',
    recipientCount: numberValue(
      row,
      'audienceCount',
      'audience_count',
      'deliveryCount',
      'recipientCount',
      'delivery_count',
      'recipient_count',
    ),
    deliveredCount: numberValue(
      row,
      'deliveredCount',
      'deliveryCount',
      'delivered_count',
      'delivery_count',
    ),
    readCount: numberValue(row, 'readCount', 'read_count'),
    publishedAt: stringValue(row, 'publishedAt', 'published_at'),
    senderLabel:
      stringValue(
        row,
        'senderDisplayName',
        'senderLabel',
        'sender_display_name',
      ) ?? 'Sparkle Suite',
    senderKey: stringValue(row, 'senderKey', 'sender_key'),
    body,
    actionUrl: stringValue(row, 'actionUrl', 'action_url'),
    audienceKind:
      rawAudience.kind === 'selected' ? ('selected' as const) : ('all_active' as const),
    audienceRepIds: ruleRepIds.length > 0 ? ruleRepIds : snapshotRepIds,
    sourceType: stringValue(row, 'sourceType', 'source_type'),
    sourceId: stringValue(row, 'sourceId', 'source_id'),
  }
}

function audienceToken(repIds: string[]) {
  return createHash('sha256')
    .update([...repIds].sort().join('\n'))
    .digest('hex')
}

function validateContent(input: z.infer<typeof contentSchema>) {
  const text = normalizeWorkspaceMessageText({
    title: input.title,
    summary: input.summary,
    actionLabel: input.actionUrl ? 'Open update' : null,
  })
  const body = normalizeWorkspaceMessageBody(input.body)
  const actionUrl = normalizeWorkspaceMessageActionUrl(input.actionUrl)
  return { text, body, actionUrl }
}

function authErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  if (error instanceof OperatorAuthError) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  return null
}

function requestErrorResponse(error: unknown) {
  const authResponse = authErrorResponse(error)
  if (authResponse) return authResponse
  if (error instanceof SyntaxError || error instanceof z.ZodError) {
    return NextResponse.json(
      { error: 'Check the message content and audience, then try again.' },
      { status: 400 },
    )
  }
  if (error instanceof ServiceError) {
    return NextResponse.json(
      { error: error.userMessage, code: error.code },
      { status: error.statusCode },
    )
  }
  return null
}

export async function GET() {
  try {
    await getControlCenterAccess()
    const admin = createAdminClient()
    const [profiles, publicationResult] = await Promise.all([
      listOperatorCustomerProfiles(admin, { limit: 500 }),
      listWorkspaceMessagePublications(admin, { limit: 50 }),
    ])
    const publications = publicationResult

    return NextResponse.json({
      ok: true,
      recipients: profiles
        .filter((profile) => profile.accountStatus === 'active')
        .map((profile) => ({
          id: profile.repId,
          name: profile.primaryContactName ?? profile.clientName,
          showName: profile.showName,
          email: profile.email,
        }))
        .sort((left, right) => left.name.localeCompare(right.name)),
      publications: publications.map(normalizePublication),
    })
  } catch (error) {
    const response = requestErrorResponse(error)
    if (response) return response
    console.error('[control-center/messages] list failed', error)
    return NextResponse.json(
      { error: 'Message history could not be loaded right now.' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    await getControlCenterAccess()
    const input = requestSchema.parse(await request.json())
    const admin = createAdminClient()
    const validated = validateContent(input)
    const audiencePreview = await previewWorkspaceMessageAudience(
      admin,
      input.audience,
    )
    const token = audienceToken(
      audiencePreview.members.map((member) => member.repId),
    )

    if (input.operation === 'preview') {
      return NextResponse.json({
        ok: true,
        preview: {
          audienceToken: token,
          recipientCount: audiencePreview.count,
          recipientSample: audiencePreview.members.slice(0, 5).map((member) => ({
            id: member.repId,
            name: member.displayName,
            showName: member.businessName,
            email: '',
          })),
        },
      })
    }

    const publicationInput = {
      publicationId: input.publicationId,
      senderKey: input.senderKey,
      title: validated.text.title,
      summary: validated.text.summary,
      body: validated.body,
      category: input.category,
      priority: input.priority,
      actionLabel: validated.actionUrl ? 'Open update' : null,
      actionUrl: validated.actionUrl,
      audience: input.audience,
    }

    if (input.operation === 'save_draft') {
      const publication = await createWorkspaceMessageDraft(
        admin,
        publicationInput,
      )
      return NextResponse.json({ ok: true, publication }, { status: 201 })
    }

    if (
      input.expectedRecipientCount !== audiencePreview.count ||
      input.audienceToken !== token
    ) {
      return NextResponse.json(
        {
          error:
            'The active recipient audience changed after preview. Review the audience again before publishing.',
          code: 'WORKSPACE_MESSAGE_AUDIENCE_CHANGED',
        },
        { status: 409 },
      )
    }
    if (audiencePreview.count > 1 && !input.confirmed) {
      return NextResponse.json(
        {
          error: `Confirm publication to all ${audiencePreview.count} recipients before sending.`,
          code: 'WORKSPACE_MESSAGE_CONFIRMATION_REQUIRED',
        },
        { status: 409 },
      )
    }

    const publication = await publishWorkspaceMessage(admin, {
      ...publicationInput,
      expectedRecipientCount: input.expectedRecipientCount,
      expectedRecipientIds: audiencePreview.members.map((member) => member.repId),
    })
    return NextResponse.json({
      ok: true,
      publication,
      recipientCount: audiencePreview.count,
    })
  } catch (error) {
    const response = requestErrorResponse(error)
    if (response) return response
    console.error('[control-center/messages] operation failed', error)
    return NextResponse.json(
      { error: 'The message operation could not be completed right now.' },
      { status: 500 },
    )
  }
}
