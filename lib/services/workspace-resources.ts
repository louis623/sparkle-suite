import type { SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'

export const WORKSPACE_RESOURCE_TYPES = ['help', 'faq', 'blog', 'video'] as const
export type WorkspaceResourceType = (typeof WORKSPACE_RESOURCE_TYPES)[number]

export type WorkspaceResource = {
  id: string
  resourceKey: string
  resourceType: WorkspaceResourceType
  title: string
  summary: string
  body: string
  category: string
  tags: string[]
  thumbnailUrl: string | null
  videoProvider: 'youtube' | 'vimeo' | 'loom' | 'other' | null
  videoUrl: string | null
  actionUrl: string | null
  status: 'draft' | 'published' | 'archived'
  version: number
  changeSummary: string
  isFeatured: boolean
  authorLabel: string
  publishedAt: string | null
}

export type ResourceAnnouncementPublisher = (input: {
  title: string
  summary: string
  body: string
  category: 'help_update' | 'blog' | 'video'
  actionLabel: string
  actionUrl: string
  secondaryActionLabel: string | null
  secondaryActionUrl: string | null
  idempotencyKey: string
  sourceType: 'workspace_resource'
  sourceId: string
}) => Promise<{ publicationId: string }>

const safeUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => {
    if (value.startsWith('/') && !value.startsWith('//')) return true
    try {
      return new URL(value).protocol === 'https:'
    } catch {
      return false
    }
  }, 'Use a secure https link or a Sparkle Suite path.')

const optionalSafeUrlSchema = z
  .union([safeUrlSchema, z.literal('')])
  .optional()
  .nullable()
  .transform((value) => value || null)

const optionalResourceKeySchema = z
  .string()
  .trim()
  .max(120)
  .refine(
    (value) => !value || /^[a-z0-9][a-z0-9-]*$/.test(value),
    'Use lowercase letters, numbers, and hyphens only.',
  )
  .optional()
  .default('')

const publishResourceSchema = z
  .object({
    resourceKey: optionalResourceKeySchema,
    resourceType: z.enum(WORKSPACE_RESOURCE_TYPES).default('blog'),
    title: z.string().trim().max(160).default(''),
    summary: z.string().trim().max(500).default(''),
    body: z.string().trim().max(30_000).default(''),
    category: z.string().trim().max(80).default('General'),
    tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
    thumbnailUrl: optionalSafeUrlSchema,
    videoProvider: z.enum(['youtube', 'vimeo', 'loom', 'other']).optional().nullable(),
    videoUrl: optionalSafeUrlSchema,
    actionUrl: optionalSafeUrlSchema,
    changeSummary: z.string().trim().max(500).default(''),
    isFeatured: z.boolean().default(false),
    authorLabel: z.string().trim().min(2).max(80).default('Sparkle Suite'),
    actorKind: z.enum(['owner', 'agent', 'automation']).default('owner'),
    actor: z.string().trim().min(2).max(120),
    announce: z.boolean().default(true),
  })

function fallbackTitle(type: WorkspaceResourceType) {
  return type === 'video' ? 'Untitled video' : 'Untitled blog'
}

function fallbackResourceKey(type: WorkspaceResourceType) {
  return `${type}-${randomUUID().slice(0, 8)}`
}

export type PublishWorkspaceResourceInput = z.input<typeof publishResourceSchema>

const RESOURCE_SELECT =
  'id, resource_key, resource_type, title, summary, body, category, tags, thumbnail_url, video_provider, video_url, action_url, status, version, change_summary, is_featured, author_label, published_at'

function mapResource(row: Record<string, unknown>): WorkspaceResource {
  return {
    id: String(row.id),
    resourceKey: String(row.resource_key),
    resourceType: row.resource_type as WorkspaceResourceType,
    title: String(row.title),
    summary: String(row.summary ?? ''),
    body: String(row.body ?? ''),
    category: String(row.category ?? 'General'),
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    thumbnailUrl: typeof row.thumbnail_url === 'string' ? row.thumbnail_url : null,
    videoProvider:
      typeof row.video_provider === 'string'
        ? (row.video_provider as WorkspaceResource['videoProvider'])
        : null,
    videoUrl: typeof row.video_url === 'string' ? row.video_url : null,
    actionUrl: typeof row.action_url === 'string' ? row.action_url : null,
    status: row.status as WorkspaceResource['status'],
    version: Number(row.version),
    changeSummary: String(row.change_summary ?? ''),
    isFeatured: row.is_featured === true,
    authorLabel: String(row.author_label ?? 'Sparkle Suite'),
    publishedAt: typeof row.published_at === 'string' ? row.published_at : null,
  }
}

export async function listPublishedWorkspaceResources(
  supabase: SupabaseClient,
  filters: { type?: WorkspaceResourceType; query?: string; limit?: number } = {},
) {
  let query = supabase
    .from('workspace_resources')
    .select(RESOURCE_SELECT)
    .eq('status', 'published')
    .order('is_featured', { ascending: false })
    .order('published_at', { ascending: false })
    .limit(Math.min(Math.max(filters.limit ?? 100, 1), 200))

  if (filters.type) query = query.eq('resource_type', filters.type)
  if (filters.query?.trim()) {
    const safeQuery = filters.query.trim().replace(/[%_,()]/g, ' ').slice(0, 120)
    query = query.or(
      `title.ilike.%${safeQuery}%,summary.ilike.%${safeQuery}%,category.ilike.%${safeQuery}%`,
    )
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map((row) => mapResource(row as Record<string, unknown>))
}

export async function listOperatorWorkspaceResources(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('workspace_resources')
    .select(RESOURCE_SELECT)
    .order('updated_at', { ascending: false })
    .limit(300)

  if (error) throw error
  return (data ?? []).map((row) => mapResource(row as Record<string, unknown>))
}

function announcementCategory(type: WorkspaceResourceType) {
  if (type === 'blog') return 'blog' as const
  if (type === 'video') return 'video' as const
  return 'help_update' as const
}

function announcementTitle(type: WorkspaceResourceType, title: string, version: number) {
  if (type === 'blog') return `New blog: ${title}`
  if (type === 'video') return `New video: ${title}`
  return version === 1 ? `New help resource: ${title}` : `Help updated: ${title}`
}

function getTrustedYouTubeUrl(value: string | null) {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.port &&
      ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(
        url.hostname.toLowerCase(),
      )
      ? url.toString()
      : null
  } catch {
    return null
  }
}

export async function publishWorkspaceResource(args: {
  supabase: SupabaseClient
  input: PublishWorkspaceResourceInput
  publishAnnouncement?: ResourceAnnouncementPublisher
  now?: Date
}) {
  const parsedInput = publishResourceSchema.parse(args.input)
  const input = {
    ...parsedInput,
    resourceKey: parsedInput.resourceKey || fallbackResourceKey(parsedInput.resourceType),
    title: parsedInput.title || fallbackTitle(parsedInput.resourceType),
  }
  const now = (args.now ?? new Date()).toISOString()
  const { data: existing, error: existingError } = await args.supabase
    .from('workspace_resources')
    .select('id, version')
    .eq('resource_key', input.resourceKey)
    .maybeSingle()

  if (existingError) throw existingError
  const version = existing ? Number(existing.version) + 1 : 1
  const values = {
    resource_key: input.resourceKey,
    resource_type: input.resourceType,
    title: input.title,
    summary: input.summary,
    body: input.body,
    category: input.category,
    tags: input.tags,
    thumbnail_url: input.thumbnailUrl ?? null,
    video_provider: input.videoProvider ?? null,
    video_url: input.videoUrl ?? null,
    action_url: input.actionUrl ?? `/nic-nac?section=resources&resource=${input.resourceKey}`,
    status: 'published',
    version,
    change_summary: input.changeSummary,
    is_featured: input.isFeatured,
    author_label: input.authorLabel,
    published_at: now,
    created_by_kind: input.actorKind,
    created_by: input.actor,
    updated_at: now,
  }

  const resourceWrite = existing
    ? args.supabase
        .from('workspace_resources')
        .update(values)
        .eq('id', existing.id)
        .select(RESOURCE_SELECT)
        .single()
    : args.supabase
        .from('workspace_resources')
        .insert(values)
        .select(RESOURCE_SELECT)
        .single()

  const { data: resourceRow, error: resourceError } = await resourceWrite
  if (resourceError || !resourceRow) {
    throw resourceError ?? new Error('resource publish failed')
  }
  const resource = mapResource(resourceRow as Record<string, unknown>)

  // The revision insert drives a database trigger that durably enqueues the
  // announcement. An injected publisher remains useful for isolated service
  // tests, but production publication never waits on message delivery.
  const shouldAnnounce = input.announce
  const { data: revision, error: revisionError } = await args.supabase
    .from('workspace_resource_revisions')
    .insert({
      resource_id: resource.id,
      version,
      title: input.title,
      summary: input.summary,
      body: input.body,
      change_summary: input.changeSummary,
      content_snapshot: resource,
      announcement_status: shouldAnnounce ? 'pending' : 'not_required',
      published_by_kind: input.actorKind,
      published_by: input.actor,
      published_at: now,
    })
    .select('id')
    .single()

  if (revisionError || !revision) {
    throw revisionError ?? new Error('resource revision write failed')
  }

  if (!shouldAnnounce || !args.publishAnnouncement) {
    return { resource, announcement: null }
  }

  const youtubeUrl =
    input.resourceType === 'video' && input.videoProvider === 'youtube'
      ? getTrustedYouTubeUrl(resource.videoUrl)
      : null

  try {
    const announcement = await args.publishAnnouncement({
      title: announcementTitle(input.resourceType, input.title, version),
      summary: input.changeSummary,
      body: input.summary,
      category: announcementCategory(input.resourceType),
      actionLabel: 'Open in Resources & Help',
      actionUrl: `/nic-nac?section=resources&resource=${encodeURIComponent(input.resourceKey)}`,
      secondaryActionLabel: youtubeUrl ? 'Watch on YouTube' : null,
      secondaryActionUrl: youtubeUrl,
      idempotencyKey: `resource-published:${resource.id}:${version}`,
      sourceType: 'workspace_resource',
      sourceId: resource.id,
    })

    const { error: updateError } = await args.supabase
      .from('workspace_resource_revisions')
      .update({
        announcement_status: 'published',
        publication_id: announcement.publicationId,
        announcement_error: null,
      })
      .eq('id', revision.id)

    if (updateError) throw updateError
    return { resource, announcement }
  } catch (error) {
    await args.supabase
      .from('workspace_resource_revisions')
      .update({
        announcement_status: 'failed',
        announcement_error:
          error instanceof Error ? error.message.slice(0, 1000) : 'announcement failed',
      })
      .eq('id', revision.id)
    throw error
  }
}
