import { createHash, randomBytes } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ServiceError, errors } from '@/lib/services/errors'
import {
  ensureTeamOnboardingConversation,
  listTeamOnboardingConversationMessages,
  sendTeamOnboardingConversationMessage,
} from '@/lib/services/workspace-team-conversations'
import {
  buildTeamOnboardingAccessUrl,
  createTeamOnboardingUrlSlug,
  resolveTeamOnboardingAppOrigin,
} from '@/lib/team-onboarding/invite-url'

export { createTeamOnboardingUrlSlug }

export type TeamManagementEntitlementStatus =
  | 'not_enabled'
  | 'manual_beta'
  | 'active'
  | 'past_due'
  | 'disabled'

export type TeamManagementEntitlementSource = 'manual_beta' | 'stripe_addon' | null

export type TeamOnboardingParticipantStatus =
  | 'invited'
  | 'started'
  | 'needs_help'
  | 'completed'
  | 'archived'

export type TeamOnboardingProgressStatus = 'not_started' | 'done' | 'needs_help'
export type TeamOnboardingMessageSender = 'participant' | 'team_lead'

export interface TeamOnboardingAccess {
  enabled: boolean
  status: TeamManagementEntitlementStatus
  source: TeamManagementEntitlementSource
}

export interface TeamOnboardingParticipantSummary {
  id: string
  ownerRepId: string
  joinTeamMemberId: string | null
  displayName: string
  contactEmail: string | null
  status: TeamOnboardingParticipantStatus
  accessSlug: string
  accessUrl?: string
  progress: {
    completed: number
    needsHelp: number
    total: number
  }
  unreadMessageCount: number
  lastActivityAt: string | null
  createdAt: string | null
  updatedAt: string | null
  archivedAt: string | null
  workspaceConversationId: string | null
}

export interface TeamOnboardingProgressItem {
  participantId: string
  stepId: string
  status: TeamOnboardingProgressStatus
  completedAt: string | null
  updatedAt: string | null
}

export interface TeamOnboardingMessage {
  id: string
  participantId: string
  senderType: TeamOnboardingMessageSender
  body: string
  readAt: string | null
  createdAt: string | null
}

export interface TeamOnboardingPublicAccess {
  participant: Pick<
    TeamOnboardingParticipantSummary,
    'displayName' | 'status' | 'createdAt' | 'lastActivityAt'
  >
  team: {
    displayName: string
    businessName: string
    teamName: string
  }
  progress: TeamOnboardingPublicProgressItem[]
  messages: TeamOnboardingPublicMessage[]
}

export type TeamOnboardingPublicProgressItem = Pick<
  TeamOnboardingProgressItem,
  'stepId' | 'status' | 'completedAt' | 'updatedAt'
>

export type TeamOnboardingPublicMessage = Pick<
  TeamOnboardingMessage,
  'senderType' | 'body' | 'readAt' | 'createdAt'
>

type ParticipantRow = {
  id: string
  owner_rep_id: string
  join_team_member_id: string | null
  display_name: string
  contact_email: string | null
  status: TeamOnboardingParticipantStatus
  access_slug: string
  access_token_hash?: string | null
  created_at: string | null
  updated_at: string | null
  last_activity_at: string | null
  archived_at: string | null
  workspace_conversation_id: string | null
}

type ProgressRow = {
  participant_id: string
  step_id: string
  status: TeamOnboardingProgressStatus
  completed_at: string | null
  updated_at: string | null
}

type MessageRow = {
  id: string
  participant_id: string
  sender_type: TeamOnboardingMessageSender
  body: string
  read_at: string | null
  created_at: string | null
}

const PARTICIPANT_SELECT =
  'id, owner_rep_id, join_team_member_id, display_name, contact_email, status, access_slug, created_at, updated_at, last_activity_at, archived_at, workspace_conversation_id'
const PRIVATE_PARTICIPANT_SELECT = `${PARTICIPANT_SELECT}, access_token_hash`
const PROGRESS_SELECT = 'participant_id, step_id, status, completed_at, updated_at'
const MESSAGE_SELECT = 'id, participant_id, sender_type, body, read_at, created_at'
function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeEmail(value: unknown) {
  const text = normalizeText(value).toLowerCase()
  return text || null
}

function toServiceError(
  code: string,
  message: string,
  userMessage: string,
  cause: unknown,
  statusCode = 500,
) {
  return new ServiceError({ code, message, userMessage, cause, statusCode })
}

function mapParticipantRow(row: ParticipantRow): TeamOnboardingParticipantSummary {
  return {
    id: row.id,
    ownerRepId: row.owner_rep_id,
    joinTeamMemberId: row.join_team_member_id ?? null,
    displayName: row.display_name,
    contactEmail: row.contact_email,
    status: row.status,
    accessSlug: row.access_slug,
    progress: { completed: 0, needsHelp: 0, total: 0 },
    unreadMessageCount: 0,
    lastActivityAt: row.last_activity_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
    workspaceConversationId: row.workspace_conversation_id,
  }
}

function mapProgressRow(row: ProgressRow): TeamOnboardingProgressItem {
  return {
    participantId: row.participant_id,
    stepId: row.step_id,
    status: row.status,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  }
}

function mapMessageRow(row: MessageRow): TeamOnboardingMessage {
  return {
    id: row.id,
    participantId: row.participant_id,
    senderType: row.sender_type,
    body: row.body,
    readAt: row.read_at,
    createdAt: row.created_at,
  }
}

export function toTeamOnboardingPublicProgressItem(
  item: TeamOnboardingProgressItem,
): TeamOnboardingPublicProgressItem {
  return {
    stepId: item.stepId,
    status: item.status,
    completedAt: item.completedAt,
    updatedAt: item.updatedAt,
  }
}

export function toTeamOnboardingPublicMessage(
  message: TeamOnboardingMessage,
): TeamOnboardingPublicMessage {
  return {
    senderType: message.senderType,
    body: message.body,
    readAt: message.readAt,
    createdAt: message.createdAt,
  }
}

function createAccessSlug(displayName: string) {
  const stem =
    displayName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 42) || 'rep'
  return `${stem}-${randomBytes(3).toString('hex')}`
}

export function hashTeamOnboardingToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function createTeamOnboardingToken() {
  return randomBytes(24).toString('base64url')
}

export async function getTeamOnboardingTeamName(
  supabase: SupabaseClient,
  ownerRepId: string,
) {
  const settingsResult = await supabase
    .from('site_settings')
    .select('team_name')
    .eq('rep_id', ownerRepId)
    .maybeSingle()

  if (settingsResult.error) {
    throw toServiceError(
      'TEAM_ONBOARDING_TEAM_NAME_LOOKUP_FAILED',
      'failed to load the onboarding team name',
      "I couldn't prepare that team's onboarding address right now.",
      settingsResult.error,
    )
  }

  const teamName = normalizeText(
    (settingsResult.data as { team_name?: unknown } | null)?.team_name,
  )
  return teamName
}

async function touchParticipantActivity(
  supabase: SupabaseClient,
  participantId: string,
) {
  await supabase
    .from('team_onboarding_participants')
    .update({ last_activity_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', participantId)
}

export async function getTeamOnboardingAccess(
  _supabase: SupabaseClient,
  _repId: string,
): Promise<TeamOnboardingAccess> {
  // Team Management is included with every active Sparkle Suite workspace.
  // Keep the access shape stable while no longer requiring a separate add-on row.
  return { enabled: true, status: 'active', source: null }
}

export async function createTeamOnboardingParticipant(
  supabase: SupabaseClient,
  ownerRepId: string,
  input: {
    displayName?: unknown
    contactEmail?: unknown
    joinTeamMemberId?: unknown
    appOrigin?: unknown
    leadDisplayName?: unknown
    teamName?: unknown
    tokenFactory?: () => string
  },
) {
  const appOrigin = resolveTeamOnboardingAppOrigin(input.appOrigin)
  const leadDisplayName = normalizeText(input.leadDisplayName)
  if (!leadDisplayName) {
    throw errors.INVALID_INPUT(
      'team lead identity required',
      'Add the team lead name before creating this private onboarding link.',
    )
  }

  const joinTeamMemberId = normalizeText(input.joinTeamMemberId) || null
  let displayName = normalizeText(input.displayName)

  if (joinTeamMemberId) {
    const { data: member, error: memberError } = await supabase
      .from('join_team_members')
      .select('id, display_name')
      .eq('id', joinTeamMemberId)
      .eq('rep_id', ownerRepId)
      .maybeSingle()

    if (memberError) {
      throw toServiceError(
        'TEAM_ONBOARDING_ROSTER_MEMBER_LOOKUP_FAILED',
        'failed to verify onboarding roster member ownership',
        "I couldn't verify that team member card right now.",
        memberError,
      )
    }
    if (!member) {
      throw errors.INVALID_INPUT(
        'join team member does not belong to rep',
        'Save that team member card before creating an onboarding link.',
      )
    }

    displayName = normalizeText((member as { display_name?: unknown }).display_name)
  }

  if (!displayName) {
    throw errors.INVALID_INPUT('displayName required', 'Enter the new rep name first.')
  }

  const token = input.tokenFactory?.() ?? createTeamOnboardingToken()
  const accessTokenHash = hashTeamOnboardingToken(token)
  const accessUrl = buildTeamOnboardingAccessUrl({
    appOrigin,
    token,
    participantDisplayName: displayName,
    leadDisplayName,
    teamName: input.teamName,
  })
  const { data, error } = await supabase
    .from('team_onboarding_participants')
    .insert({
      owner_rep_id: ownerRepId,
      join_team_member_id: joinTeamMemberId,
      display_name: displayName,
      contact_email: normalizeEmail(input.contactEmail),
      status: 'invited',
      access_slug: createAccessSlug(displayName),
      access_token_hash: accessTokenHash,
    })
    .select(PRIVATE_PARTICIPANT_SELECT)
    .single()

  if (error || !data) {
    throw toServiceError(
      'TEAM_ONBOARDING_PARTICIPANT_CREATE_FAILED',
      'failed to create team onboarding participant',
      "I couldn't create that onboarding link right now.",
      error ?? new Error('participant create returned no row'),
    )
  }

  if ((data as ParticipantRow).workspace_conversation_id !== undefined) {
    const conversationId = await ensureTeamOnboardingConversation(supabase, (data as ParticipantRow).id)
    ;(data as ParticipantRow).workspace_conversation_id = conversationId
  }

  return {
    participant: mapParticipantRow(data as ParticipantRow),
    accessUrl,
  }
}

export async function refreshTeamOnboardingParticipantAccess(
  supabase: SupabaseClient,
  ownerRepId: string,
  participantId: string,
  input: {
    appOrigin?: unknown
    leadDisplayName?: unknown
    teamName?: unknown
    tokenFactory?: () => string
  } = {},
) {
  const appOrigin = resolveTeamOnboardingAppOrigin(input.appOrigin)
  const leadDisplayName = normalizeText(input.leadDisplayName)
  if (!leadDisplayName) {
    throw errors.INVALID_INPUT(
      'team lead identity required',
      'Add the team lead name before creating this private onboarding link.',
    )
  }

  const normalizedId = normalizeText(participantId)
  if (!normalizedId) {
    throw errors.INVALID_INPUT('participant id required', 'Which rep is this for?')
  }

  const token = input.tokenFactory?.() ?? createTeamOnboardingToken()
  const { data: existingData, error: existingError } = await supabase
    .from('team_onboarding_participants')
    .select(PRIVATE_PARTICIPANT_SELECT)
    .eq('owner_rep_id', ownerRepId)
    .eq('id', normalizedId)
    .neq('status', 'archived')
    .single()

  if (existingError || !existingData) {
    throw toServiceError(
      'TEAM_ONBOARDING_ACCESS_REFRESH_FAILED',
      'failed to load team onboarding participant before refreshing access',
      "I couldn't create a fresh onboarding link right now.",
      existingError ?? new Error('participant lookup returned no row'),
    )
  }

  const accessUrl = buildTeamOnboardingAccessUrl({
    appOrigin,
    token,
    participantDisplayName: (existingData as ParticipantRow).display_name,
    leadDisplayName,
    teamName: input.teamName,
  })
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('team_onboarding_participants')
    .update({
      access_token_hash: hashTeamOnboardingToken(token),
      updated_at: now,
    })
    .eq('owner_rep_id', ownerRepId)
    .eq('id', normalizedId)
    .neq('status', 'archived')
    .select(PRIVATE_PARTICIPANT_SELECT)
    .single()

  if (error || !data) {
    throw toServiceError(
      'TEAM_ONBOARDING_ACCESS_REFRESH_FAILED',
      'failed to refresh team onboarding participant access',
      "I couldn't create a fresh onboarding link right now.",
      error ?? new Error('participant access refresh returned no row'),
    )
  }

  return {
    participant: mapParticipantRow(data as ParticipantRow),
    accessUrl,
  }
}

export async function listTeamOnboardingParticipants(
  supabase: SupabaseClient,
  ownerRepId: string,
): Promise<TeamOnboardingParticipantSummary[]> {
  const { data, error } = await supabase
    .from('team_onboarding_participants')
    .select(PARTICIPANT_SELECT)
    .eq('owner_rep_id', ownerRepId)
    .order('created_at', { ascending: false })

  if (error) {
    throw toServiceError(
      'TEAM_ONBOARDING_PARTICIPANTS_LOOKUP_FAILED',
      'failed to load team onboarding participants',
      'Unable to load Team Management right now.',
      error,
    )
  }

  const participants = ((data ?? []) as ParticipantRow[]).map(mapParticipantRow)
  const participantIds = participants.map((participant) => participant.id)

  if (participantIds.length === 0) return participants

  const { data: progressData, error: progressError } = await supabase
    .from('team_onboarding_progress')
    .select(PROGRESS_SELECT)
    .in('participant_id', participantIds)

  if (progressError) {
    throw toServiceError(
      'TEAM_ONBOARDING_PROGRESS_LOOKUP_FAILED',
      'failed to load team onboarding progress',
      'Unable to load Team Management right now.',
      progressError,
    )
  }

  const conversationToParticipant = new Map<string, string>()
  const legacyParticipantIds: string[] = []
  for (const participant of participants) {
    if (participant.workspaceConversationId) {
      conversationToParticipant.set(participant.workspaceConversationId, participant.id)
    } else {
      legacyParticipantIds.push(participant.id)
    }
  }

  const canonicalUnreadResult = conversationToParticipant.size
    ? await supabase
        .from('workspace_conversation_participants')
        .select('conversation_id, unread_count')
        .in('conversation_id', Array.from(conversationToParticipant.keys()))
        .eq('principal_type', 'rep')
        .eq('rep_id', ownerRepId)
    : { data: [], error: null }

  if (canonicalUnreadResult.error) {
    throw toServiceError(
      'TEAM_ONBOARDING_UNREAD_LOOKUP_FAILED',
      'failed to load canonical team conversation unread counts',
      'Unable to load Team Management right now.',
      canonicalUnreadResult.error,
    )
  }

  // Legacy rows are consulted only for an unlinked participant during rollout.
  // Once a participant has a canonical conversation, its participant row is the
  // sole unread source so new messages cannot disappear from Team Management.
  const legacyMessageResult = legacyParticipantIds.length
    ? await supabase
        .from('team_onboarding_messages')
        .select('participant_id, sender_type, read_at')
        .in('participant_id', legacyParticipantIds)
    : { data: [], error: null }

  if (legacyMessageResult.error) {
    throw toServiceError(
      'TEAM_ONBOARDING_MESSAGES_LOOKUP_FAILED',
      'failed to load legacy team onboarding unread messages',
      'Unable to load Team Management right now.',
      legacyMessageResult.error,
    )
  }

  const progressByParticipant = new Map<string, TeamOnboardingProgressItem[]>()
  for (const row of (progressData ?? []) as ProgressRow[]) {
    const current = progressByParticipant.get(row.participant_id) ?? []
    current.push(mapProgressRow(row))
    progressByParticipant.set(row.participant_id, current)
  }

  const unreadByParticipant = new Map<string, number>()
  for (const row of (canonicalUnreadResult.data ?? []) as Array<{
    conversation_id: string
    unread_count: number
  }>) {
    const participantId = conversationToParticipant.get(row.conversation_id)
    if (participantId) unreadByParticipant.set(participantId, row.unread_count)
  }
  for (const row of (legacyMessageResult.data ?? []) as Array<{
    participant_id: string
    sender_type: TeamOnboardingMessageSender
    read_at: string | null
  }>) {
    if (row.sender_type !== 'participant' || row.read_at) continue
    unreadByParticipant.set(
      row.participant_id,
      (unreadByParticipant.get(row.participant_id) ?? 0) + 1,
    )
  }

  return participants.map((participant) => {
    const progress = progressByParticipant.get(participant.id) ?? []
    return {
      ...participant,
      progress: {
        completed: progress.filter((item) => item.status === 'done').length,
        needsHelp: progress.filter((item) => item.status === 'needs_help').length,
        total: progress.length,
      },
      unreadMessageCount: unreadByParticipant.get(participant.id) ?? 0,
    }
  })
}

async function getParticipantByToken(
  supabase: SupabaseClient,
  token: string,
  tokenVerifier?: (token: string, hash: string) => boolean,
) {
  const normalizedToken = normalizeText(token)
  if (!normalizedToken) {
    throw errors.UNAUTHORIZED('missing invite token')
  }

  const tokenHash = hashTeamOnboardingToken(normalizedToken)
  const { data, error } = await supabase
    .from('team_onboarding_participants')
    .select(PRIVATE_PARTICIPANT_SELECT)
    .eq('access_token_hash', tokenHash)
    .maybeSingle()

  if (error) {
    throw toServiceError(
      'TEAM_ONBOARDING_INVITE_LOOKUP_FAILED',
      'failed to look up team onboarding invite',
      'Unable to load that onboarding link right now.',
      error,
    )
  }

  if (!data) {
    throw errors.UNAUTHORIZED('invalid invite token')
  }

  const row = data as ParticipantRow
  if (row.status === 'archived' || row.archived_at) {
    throw errors.UNAUTHORIZED('archived invite token')
  }

  const verifier = tokenVerifier ?? ((rawToken, storedHash) => hashTeamOnboardingToken(rawToken) === storedHash)
  if (!row.access_token_hash || !verifier(normalizedToken, row.access_token_hash)) {
    throw errors.UNAUTHORIZED('invalid invite token')
  }

  return row
}

export async function recordTeamOnboardingProgress(
  supabase: SupabaseClient,
  token: string,
  input: {
    stepId?: unknown
    status?: unknown
    tokenVerifier?: (token: string, hash: string) => boolean
  },
): Promise<TeamOnboardingProgressItem> {
  const participant = await getParticipantByToken(supabase, token, input.tokenVerifier)
  const stepId = normalizeText(input.stepId)
  const status = normalizeText(input.status) as TeamOnboardingProgressStatus

  if (!stepId) {
    throw errors.INVALID_INPUT('stepId required', 'Which onboarding step changed?')
  }
  if (status !== 'done' && status !== 'needs_help' && status !== 'not_started') {
    throw errors.INVALID_INPUT('invalid progress status', 'Choose a valid step status.')
  }

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('team_onboarding_progress')
    .upsert(
      {
        participant_id: participant.id,
        step_id: stepId,
        status,
        completed_at: status === 'done' ? now : null,
        updated_at: now,
      },
      { onConflict: 'participant_id,step_id' },
    )
    .select(PROGRESS_SELECT)
    .single()

  if (error || !data) {
    throw toServiceError(
      'TEAM_ONBOARDING_PROGRESS_SAVE_FAILED',
      'failed to save team onboarding progress',
      "I couldn't save that onboarding progress right now.",
      error ?? new Error('progress save returned no row'),
    )
  }

  await touchParticipantActivity(supabase, participant.id)
  return mapProgressRow(data as ProgressRow)
}

export async function sendTeamOnboardingMessage(
  supabase: SupabaseClient,
  participantIdOrToken: string,
  input: {
    ownerRepId?: string
    senderType: TeamOnboardingMessageSender
    body?: unknown
    tokenVerifier?: (token: string, hash: string) => boolean
    clientRequestId?: string
  },
): Promise<TeamOnboardingMessage> {
  const body = normalizeText(input.body)
  if (body.length < 2) {
    throw errors.INVALID_INPUT('message body required', 'Write a reply first.')
  }

  let participantId = normalizeText(participantIdOrToken)
  let canonicalAvailable = true
  if (input.senderType === 'participant') {
    const participant = await getParticipantByToken(
      supabase,
      participantIdOrToken,
      input.tokenVerifier,
    )
    participantId = participant.id
    canonicalAvailable = participant.workspace_conversation_id !== undefined
  }

  if (!participantId) {
    throw errors.INVALID_INPUT('participant id required', 'Which rep is this for?')
  }

  if (input.senderType === 'team_lead' && input.ownerRepId) {
    const { data: participant, error: participantError } = await supabase
      .from('team_onboarding_participants')
      .select('id, workspace_conversation_id')
      .eq('id', participantId)
      .eq('owner_rep_id', input.ownerRepId)
      .maybeSingle()

    if (participantError) {
      throw toServiceError(
        'TEAM_ONBOARDING_PARTICIPANT_LOOKUP_FAILED',
        'failed to verify team onboarding participant ownership',
        "I couldn't find that onboarding rep right now.",
        participantError,
      )
    }

    if (!participant) {
      throw errors.UNAUTHORIZED('participant is not owned by rep')
    }
    canonicalAvailable = (participant as { workspace_conversation_id?: unknown }).workspace_conversation_id !== undefined
  }

  if (!canonicalAvailable) {
    const { data, error } = await supabase
      .from('team_onboarding_messages')
      .insert({ participant_id: participantId, sender_type: input.senderType, body })
      .select(MESSAGE_SELECT)
      .single()
    if (error || !data) {
      throw toServiceError('TEAM_ONBOARDING_MESSAGE_SAVE_FAILED', 'failed to save legacy-compatible onboarding message', "I couldn't send that onboarding reply right now.", error ?? new Error('message save returned no row'))
    }
    await touchParticipantActivity(supabase, participantId)
    return mapMessageRow(data as MessageRow)
  }
  return sendTeamOnboardingConversationMessage(supabase, {
    participantId,
    senderType: input.senderType,
    body,
    clientRequestId: input.clientRequestId,
  })
}

export async function archiveTeamOnboardingParticipant(
  supabase: SupabaseClient,
  ownerRepId: string,
  participantId: string,
) {
  const normalizedId = normalizeText(participantId)
  if (!normalizedId) {
    throw errors.INVALID_INPUT('participant id required', 'Which rep should be archived?')
  }

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('team_onboarding_participants')
    .update({ status: 'archived', archived_at: now, updated_at: now })
    .eq('owner_rep_id', ownerRepId)
    .eq('id', normalizedId)
    .select('id, status, workspace_conversation_id')
    .single()

  if (error || !data) {
    throw toServiceError(
      'TEAM_ONBOARDING_ARCHIVE_FAILED',
      'failed to archive team onboarding participant',
      "I couldn't archive that onboarding link right now.",
      error ?? new Error('archive returned no row'),
    )
  }

  const archived = data as { id: string; status: TeamOnboardingParticipantStatus; workspace_conversation_id: string | null }
  if (archived.workspace_conversation_id) {
    await Promise.all([
      supabase.from('workspace_conversations').update({ state: 'closed', closed_at: now, closed_by_actor: `rep:${ownerRepId}`, updated_at: now }).eq('id', archived.workspace_conversation_id),
      supabase.from('workspace_conversation_participants').update({ membership_state: 'left', left_at: now, updated_at: now }).eq('conversation_id', archived.workspace_conversation_id),
    ])
  }
  return {
    participantId: archived.id,
    status: archived.status,
  }
}

export async function getTeamOnboardingParticipantByToken(
  supabase: SupabaseClient,
  token: string,
): Promise<TeamOnboardingPublicAccess> {
  const participant = await getParticipantByToken(supabase, token)
  const [progressResult, messagesResult, repResult, siteSettingsResult] = await Promise.all([
    supabase
      .from('team_onboarding_progress')
      .select(PROGRESS_SELECT)
      .eq('participant_id', participant.id)
      .order('updated_at', { ascending: false }),
    supabase
      .from('team_onboarding_messages')
      .select(MESSAGE_SELECT)
      .eq('participant_id', participant.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('reps')
      .select('id, display_name, business_name')
      .eq('id', participant.owner_rep_id)
      .maybeSingle(),
    supabase
      .from('site_settings')
      .select('team_name')
      .eq('rep_id', participant.owner_rep_id)
      .maybeSingle(),
  ])

  if (
    progressResult.error ||
    messagesResult.error ||
    repResult.error ||
    siteSettingsResult.error
  ) {
    throw toServiceError(
      'TEAM_ONBOARDING_PUBLIC_LOOKUP_FAILED',
      'failed to load public team onboarding state',
      'Unable to load that onboarding link right now.',
      progressResult.error ??
        messagesResult.error ??
        repResult.error ??
        siteSettingsResult.error,
    )
  }

  const rep = (repResult.data ?? {}) as {
    id?: string
    display_name?: string | null
    business_name?: string | null
  }
  const siteSettings = (siteSettingsResult.data ?? {}) as {
    team_name?: string | null
  }

  return {
    participant: {
      displayName: participant.display_name,
      status: participant.status,
      createdAt: participant.created_at,
      lastActivityAt: participant.last_activity_at,
    },
    team: {
      displayName: normalizeText(rep.display_name) || 'Your team lead',
      businessName: normalizeText(rep.business_name) || 'Your team',
      teamName:
        normalizeText(siteSettings.team_name) || 'Your team',
    },
    progress: ((progressResult.data ?? []) as ProgressRow[])
      .map(mapProgressRow)
      .map(toTeamOnboardingPublicProgressItem),
    messages: (
      (await listTeamOnboardingConversationMessages(supabase, participant.id)) ??
      ((messagesResult.data ?? []) as MessageRow[]).map(mapMessageRow)
    ).map(toTeamOnboardingPublicMessage),
  }
}
