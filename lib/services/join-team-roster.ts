import type { SupabaseClient } from '@supabase/supabase-js'
import { ServiceError, errors } from '@/lib/services/errors'
import { formatBirthday, normalizeBirthday } from '@/lib/services/birthdays'
import type {
  JoinTeamMember,
  JoinTeamMemberLinks,
  ReorderJoinTeamRosterInput,
  UpsertJoinTeamMemberInput,
} from '@/lib/services/types'

const JOIN_TEAM_MEMBER_SELECT =
  'id, rep_id, display_name, business_name, state, city, initials, photo_url, photo_alt, image_class_name, bio, birthday_month, birthday_day, links, sort_order, is_visible, created_at, updated_at'

type JoinTeamMemberRow = {
  id: string
  rep_id: string
  display_name: string
  business_name: string | null
  state: string | null
  city: string | null
  initials: string | null
  photo_url: string | null
  photo_alt: string | null
  image_class_name: string | null
  bio: string | null
  birthday_month: number | null
  birthday_day: number | null
  links: Record<string, string> | null
  sort_order: number | null
  is_visible: boolean | null
  created_at: string | null
  updated_at: string | null
}

function normalizeText(value: string | null | undefined) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeSortOrder(value: number | undefined) {
  return Number.isFinite(value) ? Math.trunc(value as number) : undefined
}

function normalizePublicLink(value: string) {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw errors.INVALID_INPUT(
      'join team member social links must be full URLs',
      'Use a full http or https link for team member social links.',
    )
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw errors.INVALID_INPUT(
      'join team member social links must use http or https',
      'Use a full http or https link for team member social links.',
    )
  }

  return url.toString()
}

function normalizeLinks(value: JoinTeamMemberLinks | undefined) {
  if (!value) return undefined

  const entries = Object.entries(value)
    .map(([key, link]) => [key.trim(), normalizeText(link)] as const)
    .filter(([key, link]) => key.length > 0 && link.length > 0)
    .map(([key, link]) => [key, normalizePublicLink(link)] as const)

  return Object.fromEntries(entries)
}

function toServiceError(
  code: string,
  message: string,
  userMessage: string,
  cause: unknown,
  statusCode = 500,
) {
  return new ServiceError({
    code,
    message,
    userMessage,
    cause,
    statusCode,
  })
}

function mapRow(row: JoinTeamMemberRow): JoinTeamMember {
  return {
    id: row.id,
    repId: row.rep_id,
    displayName: row.display_name,
    businessName: normalizeText(row.business_name),
    state: normalizeText(row.state),
    city: normalizeText(row.city),
    initials: normalizeText(row.initials),
    photoUrl: normalizeText(row.photo_url),
    photoAlt: normalizeText(row.photo_alt),
    imageClassName: normalizeText(row.image_class_name),
    bio: normalizeText(row.bio),
    birthday: formatBirthday(row.birthday_month, row.birthday_day),
    links: (row.links ?? {}) as JoinTeamMemberLinks,
    sortOrder: row.sort_order ?? 0,
    isVisible: row.is_visible ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function buildPatch(repId: string, input: UpsertJoinTeamMemberInput) {
  const displayName = normalizeText(input.displayName)
  if (!displayName) {
    throw errors.INVALID_INPUT(
      'join team member displayName is required',
      'I need the team member name before I can save that roster card.',
    )
  }

  const links = normalizeLinks(input.links)
  const sortOrder = normalizeSortOrder(input.sortOrder)
  const birthday = Object.hasOwn(input, 'birthday')
    ? normalizeBirthday(input.birthday)
    : undefined

  return {
    rep_id: repId,
    display_name: displayName,
    business_name: normalizeText(input.businessName),
    state: normalizeText(input.state),
    city: normalizeText(input.city),
    initials: normalizeText(input.initials),
    photo_url: normalizeText(input.photoUrl),
    photo_alt: normalizeText(input.photoAlt),
    image_class_name: normalizeText(input.imageClassName),
    bio: normalizeText(input.bio),
    ...(birthday !== undefined
      ? {
          birthday_month: birthday?.month ?? null,
          birthday_day: birthday?.day ?? null,
        }
      : {}),
    ...(links !== undefined ? { links } : {}),
    ...(sortOrder !== undefined ? { sort_order: sortOrder } : {}),
    ...(input.isVisible !== undefined ? { is_visible: input.isVisible } : {}),
  }
}

export async function getJoinTeamRoster(
  supabase: SupabaseClient,
  repId: string,
  options: { visibleOnly?: boolean } = {},
): Promise<JoinTeamMember[]> {
  let query = supabase
    .from('join_team_members')
    .select(JOIN_TEAM_MEMBER_SELECT)
    .eq('rep_id', repId)

  if (options.visibleOnly !== false) {
    query = query.eq('is_visible', true)
  }

  const { data, error } = await query
    .order('sort_order', { ascending: true })
    .order('display_name', { ascending: true })

  if (error) {
    throw toServiceError(
      'JOIN_TEAM_ROSTER_LOOKUP_FAILED',
      'failed to load join team roster',
      "I couldn't load the join team roster right now.",
      error,
    )
  }

  return ((data ?? []) as JoinTeamMemberRow[]).map(mapRow)
}

export async function upsertJoinTeamMember(
  supabase: SupabaseClient,
  repId: string,
  input: UpsertJoinTeamMemberInput,
): Promise<JoinTeamMember> {
  const patch = buildPatch(repId, input)

  const query = input.id
    ? supabase
        .from('join_team_members')
        .update({
          ...patch,
          updated_at: new Date().toISOString(),
        })
        .eq('rep_id', repId)
        .eq('id', input.id)
    : supabase.from('join_team_members').insert(patch)

  const { data, error } = await query.select(JOIN_TEAM_MEMBER_SELECT).single()

  if (error || !data) {
    throw toServiceError(
      'JOIN_TEAM_MEMBER_SAVE_FAILED',
      'failed to save join team member',
      "I couldn't save that team member right now.",
      error ?? new Error('join team member save returned no row'),
    )
  }

  return mapRow(data as JoinTeamMemberRow)
}

export async function removeJoinTeamMember(
  supabase: SupabaseClient,
  repId: string,
  memberId: string,
): Promise<{ memberId: string }> {
  const normalizedId = normalizeText(memberId)
  if (!normalizedId) {
    throw errors.INVALID_INPUT(
      'join team member id is required',
      'Which team member should I remove?',
    )
  }

  const { data, error } = await supabase
    .from('join_team_members')
    .delete()
    .eq('rep_id', repId)
    .eq('id', normalizedId)
    .select('id')
    .maybeSingle()

  if (error) {
    throw toServiceError(
      'JOIN_TEAM_MEMBER_REMOVE_FAILED',
      'failed to remove join team member',
      "I couldn't remove that team member right now.",
      error,
    )
  }

  if (!data) {
    throw toServiceError(
      'JOIN_TEAM_MEMBER_NOT_FOUND',
      'join team member was not found for the authenticated rep',
      "I couldn't find that team member on your Join Team roster.",
      new Error('join team member delete returned no row'),
      404,
    )
  }

  return { memberId: (data as { id: string }).id }
}

export async function reorderJoinTeamRoster(
  supabase: SupabaseClient,
  repId: string,
  input: ReorderJoinTeamRosterInput,
): Promise<{ updatedCount: number }> {
  if (!Array.isArray(input.memberIds) || input.memberIds.length === 0) {
    throw errors.INVALID_INPUT(
      'memberIds must include at least one id',
      'Tell me the roster order you want to save.',
    )
  }

  for (const [index, memberId] of input.memberIds.entries()) {
    const normalizedId = normalizeText(memberId)
    if (!normalizedId) continue

    const { error } = await supabase
      .from('join_team_members')
      .update({
        sort_order: index,
        updated_at: new Date().toISOString(),
      })
      .eq('rep_id', repId)
      .eq('id', normalizedId)

    if (error) {
      throw toServiceError(
        'JOIN_TEAM_ROSTER_REORDER_FAILED',
        'failed to reorder join team roster',
        "I couldn't reorder the team roster right now.",
        error,
      )
    }
  }

  return { updatedCount: input.memberIds.length }
}
