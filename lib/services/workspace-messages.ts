import type { SupabaseClient } from '@supabase/supabase-js'
import { ServiceError } from '@/lib/services/errors'
import {
  assertWorkspaceMessageCategory,
  assertWorkspaceMessagePriority,
  assertWorkspaceMessageSenderCanPublish,
  mapWorkspaceMessageSender,
  normalizeWorkspaceMessageActionLabel,
  normalizeWorkspaceMessageActionUrl,
  normalizeWorkspaceMessageBody,
  normalizeWorkspaceMessageText,
  requireAutomationIdempotencyKey,
  type WorkspaceMessageBody,
  type WorkspaceMessageCategory,
  type WorkspaceMessagePriority,
  type WorkspaceMessageSenderRecord,
} from '@/lib/services/workspace-message-permissions'
import {
  resolveWorkspaceMessageAudience,
  serializeWorkspaceMessageAudienceSnapshot,
  type WorkspaceMessageAudience,
} from '@/lib/services/workspace-message-audience'

export type WorkspaceMessagePublicationStatus =
  | 'draft'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'cancelled'
  | 'failed'

export interface WorkspaceMessagePublicationInput {
  publicationId?: string
  senderKey: string
  title: string
  summary?: string | null
  body: WorkspaceMessageBody | string
  category: WorkspaceMessageCategory
  priority?: WorkspaceMessagePriority
  actionLabel?: string | null
  actionUrl?: string | null
  secondaryActionLabel?: string | null
  secondaryActionUrl?: string | null
  audience: WorkspaceMessageAudience
  expectedRecipientCount?: number
  expectedRecipientIds?: string[]
  idempotencyKey?: string | null
  sourceType?: string | null
  sourceId?: string | null
}

export interface WorkspaceMessagePublicationSummary {
  id: string
  senderKey: string
  senderDisplayName: string
  category: WorkspaceMessageCategory
  priority: WorkspaceMessagePriority
  title: string
  summary: string | null
  body: WorkspaceMessageBody
  actionLabel: string | null
  actionUrl: string | null
  secondaryActionLabel: string | null
  secondaryActionUrl: string | null
  status: WorkspaceMessagePublicationStatus
  audienceRule: WorkspaceMessageAudience
  audienceSnapshot: Array<{
    repId: string
    displayName?: string
    businessName?: string
  }>
  audienceCount: number
  deliveryCount: number
  readCount: number
  archivedCount: number
  sourceType: string | null
  sourceId: string | null
  idempotencyKey: string | null
  scheduledAt: string | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface RepWorkspaceMessage {
  id: string
  deliveryId: string
  publicationId: string
  senderDisplayName: string
  category: WorkspaceMessageCategory
  priority: WorkspaceMessagePriority
  title: string
  summary: string | null
  body: WorkspaceMessageBody
  actionLabel: string | null
  actionUrl: string | null
  secondaryActionLabel: string | null
  secondaryActionUrl: string | null
  deliveredAt: string
  readAt: string | null
  archivedAt: string | null
  isRead: boolean
  isArchived: boolean
}

export interface RepWorkspaceMessagesResult {
  messages: RepWorkspaceMessage[]
  unreadCount: number
  nextCursor: string | null
}

export interface ListRepWorkspaceMessageFilters {
  limit?: number
  cursor?: string
  beforeDeliveredAt?: string
  beforeId?: string
  equalTimestampMode?: 'include_all' | 'same_kind' | 'exclude_all'
  category?: WorkspaceMessageCategory
  unreadOnly?: boolean
  archived?: boolean
}

type SenderRow = {
  id: string
  sender_key: string
  display_name: string
  sender_type: WorkspaceMessageSenderRecord['senderType']
  capabilities: unknown
  is_active: boolean
}

type PublicationRow = {
  id: string
  sender_id: string
  sender_key: string
  sender_display_name: string
  category: WorkspaceMessageCategory
  priority: WorkspaceMessagePriority
  title: string
  summary: string | null
  body: WorkspaceMessageBody
  action_label: string | null
  action_url: string | null
  secondary_action_label: string | null
  secondary_action_url: string | null
  status: WorkspaceMessagePublicationStatus
  audience_rule: WorkspaceMessageAudience
  audience_snapshot: WorkspaceMessagePublicationSummary['audienceSnapshot']
  audience_count: number
  source_type: string | null
  source_id: string | null
  idempotency_key: string | null
  scheduled_at: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

type RepPublicationRow = Pick<
  PublicationRow,
  | 'id'
  | 'sender_key'
  | 'sender_display_name'
  | 'category'
  | 'priority'
  | 'title'
  | 'summary'
  | 'body'
  | 'action_label'
  | 'action_url'
  | 'secondary_action_label'
  | 'secondary_action_url'
  | 'status'
  | 'published_at'
  | 'created_at'
>

type DeliveryWithPublicationRow = {
  id: string
  publication_id: string
  delivered_at: string
  read_at: string | null
  archived_at: string | null
  workspace_message_publications: RepPublicationRow | RepPublicationRow[]
}

const PUBLICATION_SELECT =
  'id, sender_id, sender_key, sender_display_name, category, priority, title, summary, body, action_label, action_url, secondary_action_label, secondary_action_url, status, audience_rule, audience_snapshot, audience_count, source_type, source_id, idempotency_key, scheduled_at, published_at, created_at, updated_at'

const REP_PUBLICATION_SELECT =
  'id, sender_key, sender_display_name, category, priority, title, summary, body, action_label, action_url, secondary_action_label, secondary_action_url, status, published_at, created_at'

function workspaceMessageError(
  code: string,
  message: string,
  statusCode = 400,
) {
  return new ServiceError({ code, message, userMessage: message, statusCode })
}

function normalizeOptionalKey(value?: string | null) {
  const normalized = value?.trim() ?? ''
  return normalized || null
}

function isUniqueViolation(error: unknown) {
  return (
    error !== null &&
    error !== undefined &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: unknown }).code === '23505'
  )
}

function stableRepIds(audience: WorkspaceMessageAudience) {
  return audience.kind === 'selected'
    ? [...new Set(audience.repIds.map((id) => id.trim()))].sort()
    : null
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(',')}]`
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}

function assertIdempotentPublicationMatches(
  existing: PublicationRow,
  input: WorkspaceMessagePublicationInput,
  validated: ReturnType<typeof validatePublicationInput>,
  sender: WorkspaceMessageSenderRecord,
) {
  const existingSelected = stableRepIds(existing.audience_rule)
  const requestedSelected = stableRepIds(input.audience)
  const matches =
    existing.sender_id === sender.id &&
    existing.category === input.category &&
    existing.priority === validated.priority &&
    existing.title === validated.title &&
    existing.summary === validated.summary &&
    canonicalJson(existing.body) === canonicalJson(validated.body) &&
    existing.action_label === validated.actionLabel &&
    existing.action_url === validated.actionUrl &&
    existing.secondary_action_label === validated.secondaryActionLabel &&
    existing.secondary_action_url === validated.secondaryActionUrl &&
    existing.source_type === validated.sourceType &&
    existing.source_id === validated.sourceId &&
    existing.audience_rule.kind === input.audience.kind &&
    JSON.stringify(existingSelected) === JSON.stringify(requestedSelected)
  if (!matches) {
    throw workspaceMessageError(
      'WORKSPACE_MESSAGE_IDEMPOTENCY_CONFLICT',
      'That idempotency key was already used for different message content or recipients.',
      409,
    )
  }
}

function validatePublicationInput(input: WorkspaceMessagePublicationInput) {
  assertWorkspaceMessageCategory(input.category)
  const priority = input.priority ?? 'normal'
  assertWorkspaceMessagePriority(priority)
  const text = normalizeWorkspaceMessageText(input)
  const body = normalizeWorkspaceMessageBody(input.body)
  const actionUrl = normalizeWorkspaceMessageActionUrl(input.actionUrl)
  const secondaryActionLabel = normalizeWorkspaceMessageActionLabel(input.secondaryActionLabel)
  const secondaryActionUrl = normalizeWorkspaceMessageActionUrl(input.secondaryActionUrl)
  if (Boolean(text.actionLabel) !== Boolean(actionUrl)) {
    throw workspaceMessageError(
      'WORKSPACE_MESSAGE_INVALID_ACTION',
      'Action label and action URL must be provided together.',
    )
  }
  if (Boolean(secondaryActionLabel) !== Boolean(secondaryActionUrl)) {
    throw workspaceMessageError(
      'WORKSPACE_MESSAGE_INVALID_SECONDARY_ACTION',
      'Secondary action label and URL must be provided together.',
    )
  }
  if (
    input.expectedRecipientCount !== undefined &&
    (!Number.isInteger(input.expectedRecipientCount) || input.expectedRecipientCount < 1)
  ) {
    throw workspaceMessageError(
      'WORKSPACE_MESSAGE_INVALID_RECIPIENT_COUNT',
      'Expected recipient count must be a positive whole number.',
    )
  }
  if (input.expectedRecipientIds !== undefined) {
    if (
      !Array.isArray(input.expectedRecipientIds) ||
      input.expectedRecipientIds.length === 0 ||
      input.expectedRecipientIds.some((id) => typeof id !== 'string' || !id.trim())
    ) {
      throw workspaceMessageError(
        'WORKSPACE_MESSAGE_INVALID_RECIPIENT_IDS',
        'Expected recipient IDs must contain at least one valid rep ID.',
      )
    }
  }
  return {
    title: text.title,
    summary: text.summary,
    body,
    priority,
    actionLabel: text.actionLabel,
    actionUrl,
    secondaryActionLabel,
    secondaryActionUrl,
    idempotencyKey: normalizeOptionalKey(input.idempotencyKey),
    sourceType: normalizeOptionalKey(input.sourceType),
    sourceId: normalizeOptionalKey(input.sourceId),
  }
}

function assertFrozenAudienceMatches(
  input: WorkspaceMessagePublicationInput,
  actualRepIds: string[],
) {
  if (
    input.expectedRecipientCount !== undefined &&
    input.expectedRecipientCount !== actualRepIds.length
  ) {
    throw workspaceMessageError(
      'WORKSPACE_MESSAGE_AUDIENCE_CHANGED',
      `Audience changed from ${input.expectedRecipientCount} to ${actualRepIds.length} recipients. Preview it again before publishing.`,
      409,
    )
  }
  if (input.expectedRecipientIds !== undefined) {
    const expected = [...new Set(input.expectedRecipientIds.map((id) => id.trim()))].sort()
    const actual = [...actualRepIds].sort()
    if (
      expected.length !== actual.length ||
      expected.some((repId, index) => repId !== actual[index])
    ) {
      throw workspaceMessageError(
        'WORKSPACE_MESSAGE_AUDIENCE_CHANGED',
        'Audience membership changed after preview. Preview it again before publishing.',
        409,
      )
    }
  }
}

async function getSender(
  supabase: SupabaseClient,
  senderKey: string,
): Promise<WorkspaceMessageSenderRecord> {
  const normalized = senderKey.trim()
  if (!normalized) {
    throw workspaceMessageError(
      'WORKSPACE_MESSAGE_SENDER_REQUIRED',
      'A Message Center sender is required.',
    )
  }
  const { data, error } = await supabase
    .from('workspace_message_senders')
    .select('id, sender_key, display_name, sender_type, capabilities, is_active')
    .eq('sender_key', normalized)
    .maybeSingle()
  if (error) throw error
  if (!data) {
    throw workspaceMessageError(
      'WORKSPACE_MESSAGE_SENDER_NOT_FOUND',
      'Message Center sender was not found.',
      404,
    )
  }
  return mapWorkspaceMessageSender(data as SenderRow)
}

function publicationPayload(
  input: WorkspaceMessagePublicationInput,
  validated: ReturnType<typeof validatePublicationInput>,
  sender: WorkspaceMessageSenderRecord,
  status: WorkspaceMessagePublicationStatus,
) {
  return {
    sender_id: sender.id,
    sender_key: sender.senderKey,
    sender_display_name: sender.displayName,
    category: input.category,
    priority: validated.priority,
    title: validated.title,
    summary: validated.summary,
    body: validated.body,
    action_label: validated.actionLabel,
    action_url: validated.actionUrl,
    secondary_action_label: validated.secondaryActionLabel,
    secondary_action_url: validated.secondaryActionUrl,
    status,
    audience_rule: input.audience,
    source_type: validated.sourceType,
    source_id: validated.sourceId,
    idempotency_key: validated.idempotencyKey,
    updated_at: new Date().toISOString(),
  }
}

function mapPublication(
  row: PublicationRow,
  metrics: { deliveryCount: number; readCount: number; archivedCount: number },
  senderKey?: string,
): WorkspaceMessagePublicationSummary {
  return {
    id: row.id,
    senderKey: senderKey ?? row.sender_key,
    senderDisplayName: row.sender_display_name,
    category: row.category,
    priority: row.priority,
    title: row.title,
    summary: row.summary,
    body: row.body,
    actionLabel: row.action_label,
    actionUrl: row.action_url,
    secondaryActionLabel: row.secondary_action_label,
    secondaryActionUrl: row.secondary_action_url,
    status: row.status,
    audienceRule: row.audience_rule,
    audienceSnapshot: row.audience_snapshot,
    audienceCount: row.audience_count,
    deliveryCount: metrics.deliveryCount,
    readCount: metrics.readCount,
    archivedCount: metrics.archivedCount,
    sourceType: row.source_type,
    sourceId: row.source_id,
    idempotencyKey: row.idempotency_key,
    scheduledAt: row.scheduled_at,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function getPublicationMetrics(
  supabase: SupabaseClient,
  publicationIds: string[],
) {
  const metrics = new Map<
    string,
    { deliveryCount: number; readCount: number; archivedCount: number }
  >()
  for (const id of publicationIds) {
    metrics.set(id, { deliveryCount: 0, readCount: 0, archivedCount: 0 })
  }
  if (publicationIds.length === 0) return metrics

  const { data, error } = await supabase
    .from('workspace_message_deliveries')
    .select('publication_id, read_at, archived_at')
    .in('publication_id', publicationIds)
  if (error) throw error
  for (const row of (data ?? []) as Array<{
    publication_id: string
    read_at: string | null
    archived_at: string | null
  }>) {
    const current = metrics.get(row.publication_id)
    if (!current) continue
    current.deliveryCount += 1
    if (row.read_at) current.readCount += 1
    if (row.archived_at) current.archivedCount += 1
  }
  return metrics
}

async function insertAuditEvent(
  supabase: SupabaseClient,
  args: {
    publicationId: string
    actorType: WorkspaceMessageSenderRecord['senderType'] | 'system'
    actorId: string
    eventType: string
    details?: Record<string, unknown>
  },
) {
  const { error } = await supabase.from('workspace_message_audit_events').insert({
    publication_id: args.publicationId,
    actor_type: args.actorType,
    actor_id: args.actorId,
    event_type: args.eventType,
    details: args.details ?? {},
  })
  if (error) throw error
}

export async function createWorkspaceMessageDraft(
  supabase: SupabaseClient,
  input: WorkspaceMessagePublicationInput,
): Promise<WorkspaceMessagePublicationSummary> {
  const validated = validatePublicationInput(input)
  const sender = await getSender(supabase, input.senderKey)
  assertWorkspaceMessageSenderCanPublish(sender, input.category, input.audience.kind)
  requireAutomationIdempotencyKey(sender, validated.idempotencyKey)

  if (validated.idempotencyKey) {
    const { data: existing, error: existingError } = await supabase
      .from('workspace_message_publications')
      .select(PUBLICATION_SELECT)
      .eq('idempotency_key', validated.idempotencyKey)
      .maybeSingle()
    if (existingError) throw existingError
    if (existing) {
      const row = existing as PublicationRow
      assertIdempotentPublicationMatches(row, input, validated, sender)
      const metrics = await getPublicationMetrics(supabase, [row.id])
      return mapPublication(
        row,
        metrics.get(row.id) ?? { deliveryCount: 0, readCount: 0, archivedCount: 0 },
        sender.senderKey,
      )
    }
  }

  const draftPayload = {
    ...publicationPayload(input, validated, sender, 'draft'),
    audience_snapshot: [],
    audience_count: 0,
    scheduled_at: null,
    cancelled_at: null,
  }
  const query = input.publicationId
    ? supabase
        .from('workspace_message_publications')
        .update(draftPayload)
        .eq('id', input.publicationId)
        .eq('status', 'draft')
    : supabase.from('workspace_message_publications').insert(draftPayload)
  const { data, error } = await query.select(PUBLICATION_SELECT).maybeSingle()
  if (error) throw error
  if (!data) {
    throw workspaceMessageError(
      'WORKSPACE_MESSAGE_DRAFT_NOT_EDITABLE',
      'Only an existing draft can be updated.',
      409,
    )
  }
  const row = data as PublicationRow
  await insertAuditEvent(supabase, {
    publicationId: row.id,
    actorType: sender.senderType,
    actorId: sender.senderKey,
    eventType: input.publicationId ? 'draft_updated' : 'draft_created',
  })
  return mapPublication(
    row,
    { deliveryCount: 0, readCount: 0, archivedCount: 0 },
    sender.senderKey,
  )
}

export async function updateWorkspaceMessageDraft(
  supabase: SupabaseClient,
  input: WorkspaceMessagePublicationInput & { publicationId: string },
) {
  return createWorkspaceMessageDraft(supabase, input)
}

export async function publishWorkspaceMessage(
  supabase: SupabaseClient,
  input: WorkspaceMessagePublicationInput,
): Promise<WorkspaceMessagePublicationSummary> {
  const validated = validatePublicationInput(input)
  const sender = await getSender(supabase, input.senderKey)
  assertWorkspaceMessageSenderCanPublish(sender, input.category, input.audience.kind)
  requireAutomationIdempotencyKey(sender, validated.idempotencyKey)

  if (validated.idempotencyKey) {
    const { data: existing, error: existingError } = await supabase
      .from('workspace_message_publications')
      .select(PUBLICATION_SELECT)
      .eq('idempotency_key', validated.idempotencyKey)
      .maybeSingle()
    if (existingError) throw existingError
    if (existing?.status === 'published') {
      const row = existing as PublicationRow
      assertIdempotentPublicationMatches(row, input, validated, sender)
      const metrics = await getPublicationMetrics(supabase, [row.id])
      return mapPublication(
        row,
        metrics.get(row.id) ?? { deliveryCount: 0, readCount: 0, archivedCount: 0 },
        sender.senderKey,
      )
    }
    if (existing) {
      assertIdempotentPublicationMatches(
        existing as PublicationRow,
        input,
        validated,
        sender,
      )
    }
    if (existing && input.publicationId && existing.id !== input.publicationId) {
      throw workspaceMessageError(
        'WORKSPACE_MESSAGE_IDEMPOTENCY_CONFLICT',
        'That idempotency key belongs to a different publication.',
        409,
      )
    }
    if (existing && !input.publicationId) input = { ...input, publicationId: existing.id }
  }

  const audience = await resolveWorkspaceMessageAudience(supabase, input.audience)
  assertFrozenAudienceMatches(
    input,
    audience.members.map((member) => member.repId),
  )

  const now = new Date().toISOString()
  let publication: PublicationRow
  if (input.publicationId) {
    const { data, error } = await supabase
      .from('workspace_message_publications')
      .update({
        ...publicationPayload(input, validated, sender, 'publishing'),
        audience_rule: audience.rule,
        audience_snapshot: serializeWorkspaceMessageAudienceSnapshot(audience),
        audience_count: audience.count,
        scheduled_at: null,
        cancelled_at: null,
      })
      .eq('id', input.publicationId)
      .in('status', ['draft', 'scheduled', 'failed', 'publishing'])
      .select(PUBLICATION_SELECT)
      .maybeSingle()
    if (error) throw error
    if (!data) {
      throw workspaceMessageError(
        'WORKSPACE_MESSAGE_NOT_PUBLISHABLE',
        'Only a draft, scheduled, or retryable publication can be published.',
        409,
      )
    }
    publication = data as PublicationRow
  } else {
    const { data, error } = await supabase
      .from('workspace_message_publications')
      .insert({
        ...publicationPayload(input, validated, sender, 'publishing'),
        audience_rule: audience.rule,
        audience_snapshot: serializeWorkspaceMessageAudienceSnapshot(audience),
        audience_count: audience.count,
      })
      .select(PUBLICATION_SELECT)
      .single()
    if (error || !data) {
      if (!isUniqueViolation(error) || !validated.idempotencyKey) {
        throw error ?? new Error('Message Center publication insert failed')
      }
      const { data: concurrent, error: concurrentError } = await supabase
        .from('workspace_message_publications')
        .select(PUBLICATION_SELECT)
        .eq('idempotency_key', validated.idempotencyKey)
        .single()
      if (concurrentError || !concurrent) {
        throw concurrentError ?? error
      }
      publication = concurrent as PublicationRow
      assertIdempotentPublicationMatches(publication, input, validated, sender)
      const frozenRepIds = publication.audience_snapshot
        .map((member) => member.repId)
        .sort()
      const resolvedRepIds = audience.members.map((member) => member.repId).sort()
      if (JSON.stringify(frozenRepIds) !== JSON.stringify(resolvedRepIds)) {
        throw workspaceMessageError(
          'WORKSPACE_MESSAGE_AUDIENCE_CHANGED',
          'The concurrent publication froze a different audience.',
          409,
        )
      }
      if (publication.status === 'published') {
        const metrics = await getPublicationMetrics(supabase, [publication.id])
        return mapPublication(
          publication,
          metrics.get(publication.id) ?? {
            deliveryCount: 0,
            readCount: 0,
            archivedCount: 0,
          },
          sender.senderKey,
        )
      }
      if (publication.status !== 'publishing' && publication.status !== 'failed') {
        throw workspaceMessageError(
          'WORKSPACE_MESSAGE_IDEMPOTENCY_CONFLICT',
          'The concurrent publication is not retryable.',
          409,
        )
      }
      if (publication.status === 'failed') {
        const { data: reclaimed, error: reclaimError } = await supabase
          .from('workspace_message_publications')
          .update({ status: 'publishing', updated_at: now })
          .eq('id', publication.id)
          .eq('status', 'failed')
          .select(PUBLICATION_SELECT)
          .maybeSingle()
        if (reclaimError) throw reclaimError
        if (reclaimed) publication = reclaimed as PublicationRow
      }
    } else {
      publication = data as PublicationRow
    }
  }

  try {
    const { error: deliveryError } = await supabase
      .from('workspace_message_deliveries')
      .upsert(
        audience.members.map((member) => ({
          publication_id: publication.id,
          rep_id: member.repId,
          delivered_at: now,
        })),
        {
          onConflict: 'publication_id,rep_id',
          ignoreDuplicates: true,
        },
      )
    if (deliveryError) throw deliveryError

    const { data: published, error: publishError } = await supabase
      .from('workspace_message_publications')
      .update({ status: 'published', published_at: now, updated_at: now })
      .eq('id', publication.id)
      .eq('status', 'publishing')
      .select(PUBLICATION_SELECT)
      .single()
    if (publishError || !published) {
      const { data: concurrentlyPublished, error: concurrentReadError } = await supabase
        .from('workspace_message_publications')
        .select(PUBLICATION_SELECT)
        .eq('id', publication.id)
        .maybeSingle()
      if (concurrentReadError) throw concurrentReadError
      if (concurrentlyPublished?.status === 'published') {
        const metrics = await getPublicationMetrics(supabase, [publication.id])
        return mapPublication(
          concurrentlyPublished as PublicationRow,
          metrics.get(publication.id) ?? {
            deliveryCount: audience.count,
            readCount: 0,
            archivedCount: 0,
          },
          sender.senderKey,
        )
      }
      throw publishError ?? new Error('Message Center publication finalization failed')
    }

    await insertAuditEvent(supabase, {
      publicationId: publication.id,
      actorType: sender.senderType,
      actorId: sender.senderKey,
      eventType: 'publication_published',
      details: {
        audienceKind: audience.rule.kind,
        recipientCount: audience.count,
        idempotencyKey: validated.idempotencyKey,
      },
    })
    return mapPublication(
      published as PublicationRow,
      { deliveryCount: audience.count, readCount: 0, archivedCount: 0 },
      sender.senderKey,
    )
  } catch (error) {
    await supabase
      .from('workspace_message_publications')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', publication.id)
      .eq('status', 'publishing')
    throw error
  }
}

export async function scheduleWorkspaceMessage(
  supabase: SupabaseClient,
  input: WorkspaceMessagePublicationInput & { scheduledAt: string },
) {
  const scheduledAt = new Date(input.scheduledAt)
  if (!Number.isFinite(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
    throw workspaceMessageError(
      'WORKSPACE_MESSAGE_INVALID_SCHEDULE',
      'Scheduled time must be a valid future date.',
    )
  }
  const validated = validatePublicationInput(input)
  const sender = await getSender(supabase, input.senderKey)
  assertWorkspaceMessageSenderCanPublish(sender, input.category, input.audience.kind)
  requireAutomationIdempotencyKey(sender, validated.idempotencyKey)
  const audience = await resolveWorkspaceMessageAudience(supabase, input.audience)
  assertFrozenAudienceMatches(
    input,
    audience.members.map((member) => member.repId),
  )

  const payload = {
    ...publicationPayload(input, validated, sender, 'scheduled'),
    audience_rule: audience.rule,
    audience_snapshot: serializeWorkspaceMessageAudienceSnapshot(audience),
    audience_count: audience.count,
    scheduled_at: scheduledAt.toISOString(),
  }
  const query = input.publicationId
    ? supabase
        .from('workspace_message_publications')
        .update(payload)
        .eq('id', input.publicationId)
        .eq('status', 'draft')
    : supabase.from('workspace_message_publications').insert(payload)
  const { data, error } = await query.select(PUBLICATION_SELECT).maybeSingle()
  if (error) throw error
  if (!data) {
    throw workspaceMessageError(
      'WORKSPACE_MESSAGE_NOT_SCHEDULABLE',
      'Only a draft can be scheduled.',
      409,
    )
  }
  const row = data as PublicationRow
  await insertAuditEvent(supabase, {
    publicationId: row.id,
    actorType: sender.senderType,
    actorId: sender.senderKey,
    eventType: 'publication_scheduled',
    details: { scheduledAt: scheduledAt.toISOString(), recipientCount: audience.count },
  })
  return mapPublication(
    row,
    { deliveryCount: 0, readCount: 0, archivedCount: 0 },
    sender.senderKey,
  )
}

export async function cancelWorkspaceMessage(
  supabase: SupabaseClient,
  publicationId: string,
) {
  const normalized = publicationId.trim()
  if (!normalized) {
    throw workspaceMessageError(
      'WORKSPACE_MESSAGE_PUBLICATION_REQUIRED',
      'Publication ID is required.',
    )
  }
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('workspace_message_publications')
    .update({ status: 'cancelled', cancelled_at: now, updated_at: now })
    .eq('id', normalized)
    .in('status', ['draft', 'scheduled'])
    .select(PUBLICATION_SELECT)
    .maybeSingle()
  if (error) throw error
  if (!data) {
    throw workspaceMessageError(
      'WORKSPACE_MESSAGE_NOT_CANCELLABLE',
      'Only draft or scheduled publications can be cancelled.',
      409,
    )
  }
  await insertAuditEvent(supabase, {
    publicationId: normalized,
    actorType: 'system',
    actorId: 'operator',
    eventType: 'publication_cancelled',
  })
  return mapPublication(
    data as PublicationRow,
    { deliveryCount: 0, readCount: 0, archivedCount: 0 },
  )
}

export async function listWorkspaceMessagePublications(
  supabase: SupabaseClient,
  filters: { limit?: number; status?: WorkspaceMessagePublicationStatus } = {},
): Promise<WorkspaceMessagePublicationSummary[]> {
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200)
  let query = supabase
    .from('workspace_message_publications')
    .select(PUBLICATION_SELECT)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (filters.status) query = query.eq('status', filters.status)
  const { data, error } = await query
  if (error) throw error
  const rows = (data ?? []) as PublicationRow[]
  const metrics = await getPublicationMetrics(
    supabase,
    rows.map((row) => row.id),
  )
  return rows.map((row) =>
    mapPublication(
      row,
      metrics.get(row.id) ?? { deliveryCount: 0, readCount: 0, archivedCount: 0 },
    ),
  )
}

function decodeCursor(cursor?: string) {
  if (!cursor) return 0
  try {
    const value = Number.parseInt(
      Buffer.from(cursor, 'base64url').toString('utf8'),
      10,
    )
    if (!Number.isSafeInteger(value) || value < 0) throw new Error('bad cursor')
    return value
  } catch {
    throw workspaceMessageError(
      'WORKSPACE_MESSAGE_INVALID_CURSOR',
      'Message cursor is invalid.',
    )
  }
}

function encodeCursor(offset: number) {
  return Buffer.from(String(offset), 'utf8').toString('base64url')
}

export async function listRepWorkspaceMessages(
  supabase: SupabaseClient,
  repId: string,
  filters: ListRepWorkspaceMessageFilters = {},
): Promise<RepWorkspaceMessagesResult> {
  if (!repId.trim()) {
    throw workspaceMessageError(
      'WORKSPACE_MESSAGE_UNAUTHORIZED',
      'Rep identity is required.',
      403,
    )
  }
  // The route still caps the user-visible page at 100. Inbox merging may need
  // a larger internal prefix to paginate accurately across both source types.
  const limit = Math.min(Math.max(filters.limit ?? 25, 1), 1000)
  const usesKeyset = Boolean(filters.beforeDeliveredAt)
  const offset = usesKeyset ? 0 : decodeCursor(filters.cursor)
  let query = supabase
    .from('workspace_message_deliveries')
    .select(
      `id, publication_id, delivered_at, read_at, archived_at, workspace_message_publications!inner(${REP_PUBLICATION_SELECT})`,
    )
    .eq('rep_id', repId)
    .order('delivered_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + limit)

  if (filters.category) {
    assertWorkspaceMessageCategory(filters.category)
    query = query.eq('workspace_message_publications.category', filters.category)
  }
  if (filters.unreadOnly) query = query.is('read_at', null)
  if (filters.beforeDeliveredAt) {
    if (filters.equalTimestampMode === 'include_all') {
      query = query.lte('delivered_at', filters.beforeDeliveredAt)
    } else if (filters.equalTimestampMode === 'same_kind') {
      if (!filters.beforeId) {
        throw workspaceMessageError(
          'WORKSPACE_MESSAGE_INVALID_CURSOR',
          'Message cursor is invalid.',
        )
      }
      query = query.or(
        `delivered_at.lt.${filters.beforeDeliveredAt},and(delivered_at.eq.${filters.beforeDeliveredAt},id.lt.${filters.beforeId})`,
      )
    } else {
      query = query.lt('delivered_at', filters.beforeDeliveredAt)
    }
  }
  query = filters.archived
    ? query.not('archived_at', 'is', null)
    : query.is('archived_at', null)

  const [{ data, error }, unreadResult] = await Promise.all([
    query,
    supabase
      .from('workspace_message_deliveries')
      .select('id', { head: true, count: 'exact' })
      .eq('rep_id', repId)
      .is('read_at', null)
      .is('archived_at', null),
  ])
  if (error) throw error
  if (unreadResult.error) throw unreadResult.error

  const rows = (data ?? []) as DeliveryWithPublicationRow[]
  const hasMore = rows.length > limit
  const visibleRows = hasMore ? rows.slice(0, limit) : rows
  const messages = visibleRows.map((row) => {
    const publication = Array.isArray(row.workspace_message_publications)
      ? row.workspace_message_publications[0]
      : row.workspace_message_publications
    if (!publication) {
      throw new Error(`Publication missing for delivery ${row.id}`)
    }
    return {
      id: row.id,
      deliveryId: row.id,
      publicationId: row.publication_id,
      senderDisplayName: publication.sender_display_name,
      category: publication.category,
      priority: publication.priority,
      title: publication.title,
      summary: publication.summary,
      body: publication.body,
      actionLabel: publication.action_label,
      actionUrl: publication.action_url,
      secondaryActionLabel: publication.secondary_action_label,
      secondaryActionUrl: publication.secondary_action_url,
      deliveredAt: row.delivered_at,
      readAt: row.read_at,
      archivedAt: row.archived_at,
      isRead: Boolean(row.read_at),
      isArchived: Boolean(row.archived_at),
    }
  })
  return {
    messages,
    unreadCount: unreadResult.count ?? 0,
    nextCursor: hasMore ? encodeCursor(offset + limit) : null,
  }
}

export async function updateRepWorkspaceMessageDelivery(
  supabase: SupabaseClient,
  repId: string,
  input: { deliveryId: string; read?: boolean; archived?: boolean },
) {
  if (!repId.trim()) {
    throw workspaceMessageError(
      'WORKSPACE_MESSAGE_UNAUTHORIZED',
      'Rep identity is required.',
      403,
    )
  }
  const deliveryId = input.deliveryId.trim()
  if (!deliveryId) {
    throw workspaceMessageError(
      'WORKSPACE_MESSAGE_DELIVERY_REQUIRED',
      'Delivery ID is required.',
    )
  }
  if (input.read === undefined && input.archived === undefined) {
    throw workspaceMessageError(
      'WORKSPACE_MESSAGE_STATE_REQUIRED',
      'Choose a read or archive state to update.',
    )
  }
  if (
    (input.read !== undefined && typeof input.read !== 'boolean') ||
    (input.archived !== undefined && typeof input.archived !== 'boolean')
  ) {
    throw workspaceMessageError(
      'WORKSPACE_MESSAGE_INVALID_STATE',
      'Read and archived states must be true or false.',
    )
  }
  const now = new Date().toISOString()
  const patch: { read_at?: string | null; archived_at?: string | null } = {}
  if (input.read !== undefined) patch.read_at = input.read ? now : null
  if (input.archived !== undefined) patch.archived_at = input.archived ? now : null

  const { data, error } = await supabase
    .from('workspace_message_deliveries')
    .update(patch)
    .eq('id', deliveryId)
    .eq('rep_id', repId)
    .select('id, publication_id, delivered_at, read_at, archived_at')
    .maybeSingle()
  if (error) throw error
  if (!data) {
    throw workspaceMessageError(
      'WORKSPACE_MESSAGE_DELIVERY_NOT_FOUND',
      'Message delivery was not found.',
      404,
    )
  }
  return {
    id: data.id as string,
    deliveryId: data.id as string,
    publicationId: data.publication_id as string,
    deliveredAt: data.delivered_at as string,
    readAt: data.read_at as string | null,
    archivedAt: data.archived_at as string | null,
    isRead: Boolean(data.read_at),
    isArchived: Boolean(data.archived_at),
  }
}
