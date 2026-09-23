import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  TradeBoardIntakePhotoState,
  TradeBoardIntakeSessionState,
} from './trade-board-intake-types'

export type TradeBoardIntakeSessionPatch = {
  status?: string
  current_phase?: string
  catalog_mode?: string | null
  item_number?: string | null
  jewelry_type?: string | null
  quantity?: number | null
  design_name?: string | null
  collection_family?: string | null
  collection_name?: string | null
  collection_year?: number | null
  material?: string | null
  main_stone?: string | null
  ring_size?: string | null
  rep_notes?: string | null
  trade_preferences?: string | null
  rarity_classification?: string | null
  rarity_confirmed_at?: string | null
  missing_fields?: string[]
  hard_blockers?: string[]
  soft_warnings?: string[]
  created_listing_ids?: string[]
  created_design_id?: string | null
  last_user_message_id?: string | null
  metadata?: Record<string, unknown>
  updated_at?: string
}

export function mapTradeBoardIntakeSessionRow(
  row: Record<string, unknown>,
): TradeBoardIntakeSessionState {
  const photos = (
    (row.trade_board_intake_photos as Array<Record<string, unknown>> | null) ??
    []
  ).map(mapTradeBoardIntakePhotoRow)

  return {
    id: row.id as string,
    repId: row.rep_id as string,
    conversationId: row.conversation_id as string,
    workflowType: 'trade_board_add_listing',
    catalogMode:
      row.catalog_mode === 'non_item_number'
        ? 'non_item_number'
        : 'item_number',
    status: row.status as TradeBoardIntakeSessionState['status'],
    phase: row.current_phase as TradeBoardIntakeSessionState['phase'],
    known: {
      ...(row.item_number ? { itemNumber: row.item_number as string } : {}),
      ...(row.jewelry_type
        ? {
            jewelryType:
              row.jewelry_type as NonNullable<
                TradeBoardIntakeSessionState['known']['jewelryType']
              >,
          }
        : {}),
      ...(row.quantity ? { quantity: row.quantity as number } : {}),
      ...(row.design_name ? { designName: row.design_name as string } : {}),
      ...(row.collection_family
        ? { collectionFamily: row.collection_family as string }
        : {}),
      ...(row.collection_name
        ? { collectionName: row.collection_name as string }
        : {}),
      ...(row.collection_year
        ? { collectionYear: row.collection_year as number }
        : {}),
      ...(row.material ? { material: row.material as string } : {}),
      ...(row.main_stone ? { mainStone: row.main_stone as string } : {}),
      ...(row.ring_size ? { ringSize: row.ring_size as string } : {}),
      ...(row.rep_notes ? { repNotes: row.rep_notes as string } : {}),
      ...(row.trade_preferences
        ? { tradePreferences: row.trade_preferences as string }
        : {}),
      ...(row.rarity_classification
        ? {
            rarityClassification:
              row.rarity_classification as NonNullable<
                TradeBoardIntakeSessionState['known']['rarityClassification']
              >,
          }
        : {}),
      ...((row.metadata as { duplicatePhysicalConfirmed?: unknown } | null)
        ?.duplicatePhysicalConfirmed
        ? { duplicatePhysicalConfirmed: true }
        : {}),
    },
    missing: (row.missing_fields as string[] | null) ?? [],
    blockers: (row.hard_blockers as string[] | null) ?? [],
    warnings: (row.soft_warnings as string[] | null) ?? [],
    metadata:
      row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? { ...(row.metadata as Record<string, unknown>) }
        : {},
    photos,
    createdListingIds:
      ((row.created_listing_ids as string[] | null) ?? undefined) || undefined,
    ...(row.created_design_id
      ? { createdDesignId: row.created_design_id as string }
      : {}),
    ...(row.last_user_message_id
      ? { lastUserMessageId: row.last_user_message_id as string }
      : {}),
    ...(row.created_at ? { createdAt: row.created_at as string } : {}),
    ...(row.updated_at ? { updatedAt: row.updated_at as string } : {}),
    ...(row.expires_at ? { expiresAt: row.expires_at as string } : {}),
  }
}

export function mapTradeBoardIntakePhotoRow(
  row: Record<string, unknown>,
): TradeBoardIntakePhotoState {
  return {
    id: row.id as string,
    ...(row.conversation_message_id
      ? { conversationMessageId: row.conversation_message_id as string }
      : {}),
    attachmentIndex: row.attachment_index as number,
    declaredRole:
      row.declared_role as TradeBoardIntakePhotoState['declaredRole'],
    visualRole: row.visual_role as TradeBoardIntakePhotoState['visualRole'],
    roleConfirmed: Boolean(row.role_confirmed),
    ...(row.image_url ? { imageUrl: row.image_url as string } : {}),
    ...(row.content_sha256
      ? { contentSha256: row.content_sha256 as string }
      : {}),
    quality: row.quality as TradeBoardIntakePhotoState['quality'],
    ...(row.quality_score !== null && row.quality_score !== undefined
      ? { qualityScore: row.quality_score as number }
      : {}),
    qualityIssues: (row.quality_issues as string[] | null) ?? [],
    notes: (row.notes as string[] | null) ?? [],
    ...(row.visual_role_source
      ? { visualRoleSource: row.visual_role_source as string }
      : {}),
  }
}

export async function getActiveTradeBoardIntakeSession(
  supabase: SupabaseClient,
  args: { repId: string; conversationId: string; nowIso: string },
): Promise<TradeBoardIntakeSessionState | null> {
  const { data, error } = await supabase
    .from('trade_board_intake_sessions')
    .select('*')
    .eq('rep_id', args.repId)
    .eq('conversation_id', args.conversationId)
    .in('status', ['active', 'needs_human_review'])
    .gt('expires_at', args.nowIso)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const { data: photos, error: photoError } = await supabase
    .from('trade_board_intake_photos')
    .select('*')
    .eq('session_id', (data as { id: string }).id)
    .order('created_at', { ascending: true })
  if (photoError) throw photoError

  return mapTradeBoardIntakeSessionRow({
    ...(data as Record<string, unknown>),
    trade_board_intake_photos: photos ?? [],
  })
}

export interface TradeBoardIntakeFailureRecord {
  workflowId: string
  failureCount: number
  workflowStatusAfter: 'active' | 'needs_human_review'
  newlyEscalated: boolean
  sameRunReplay: boolean
}

export async function recordTradeBoardIntakeFailure(
  supabase: SupabaseClient,
  args: {
    sessionId: string
    repId: string
    conversationId: string
    toolName: string
    runId: string
    failureSignature: string
    inputSignature: string
    errorCode: string
    errorStage: string
    retryable: boolean
    nowIso: string
  },
): Promise<TradeBoardIntakeFailureRecord | null> {
  const { data, error } = await supabase.rpc(
    'rpc_record_trade_board_intake_failure',
    {
      p_session_id: args.sessionId,
      p_rep_id: args.repId,
      p_conversation_id: args.conversationId,
      p_tool_name: args.toolName,
      p_run_id: args.runId,
      p_failure_signature: args.failureSignature,
      p_input_signature: args.inputSignature,
      p_error_code: args.errorCode,
      p_error_stage: args.errorStage,
      p_retryable: args.retryable,
      p_now: args.nowIso,
    },
  )
  if (error) throw error
  if (!data) return null

  const row = data as Record<string, unknown>
  return {
    workflowId: String(row.workflow_id),
    failureCount: Number(row.failure_count),
    workflowStatusAfter:
      row.workflow_status_after === 'needs_human_review'
        ? 'needs_human_review'
        : 'active',
    newlyEscalated: Boolean(row.newly_escalated),
    sameRunReplay: Boolean(row.same_run_replay),
  }
}

export async function createTradeBoardIntakeSession(
  supabase: SupabaseClient,
  args: {
    repId: string
    conversationId: string
    lastUserMessageId?: string
  },
): Promise<TradeBoardIntakeSessionState> {
  const { data, error } = await supabase
    .from('trade_board_intake_sessions')
    .insert({
      rep_id: args.repId,
      conversation_id: args.conversationId,
      workflow_type: 'trade_board_add_listing',
      catalog_mode: 'item_number',
      status: 'active',
      current_phase: 'started',
      last_user_message_id: args.lastUserMessageId ?? null,
    })
    .select('*')
    .single()

  if (error) throw error
  return mapTradeBoardIntakeSessionRow(data as Record<string, unknown>)
}

export async function updateTradeBoardIntakeSession(
  supabase: SupabaseClient,
  args: { sessionId: string; patch: TradeBoardIntakeSessionPatch },
): Promise<void> {
  const { error } = await supabase
    .from('trade_board_intake_sessions')
    .update({ ...args.patch, updated_at: new Date().toISOString() })
    .eq('id', args.sessionId)

  if (error) throw error
}

/**
 * Rebind an active intake to a replacement conversation without creating a new
 * workflow. Only conversation ownership fields change; all known facts,
 * failure metadata, phase/status, and confirmed photo state stay on the same
 * durable workflow id.
 */
export async function transferActiveTradeBoardIntakeConversation(
  supabase: SupabaseClient,
  args: {
    repId: string
    sourceConversationId: string
    destinationConversationId: string
    nowIso: string
  },
): Promise<{
  workflowId: string
  destinationConversationId: string
  replayed: boolean
} | null> {
  if (
    !args.repId ||
    !args.sourceConversationId ||
    !args.destinationConversationId ||
    args.sourceConversationId === args.destinationConversationId
  ) {
    throw new Error('Invalid Trade Board intake rollover scope')
  }

  const { data, error } = await supabase.rpc(
    'rpc_rollover_trade_board_intake_v2',
    {
      p_rep_id: args.repId,
      p_source_conversation_id: args.sourceConversationId,
      p_destination_conversation_id: args.destinationConversationId,
      p_now: args.nowIso,
    },
  )

  if (error) throw error
  if (!data) return null

  const row = data as Record<string, unknown>
  return {
    workflowId: String(row.workflow_id),
    destinationConversationId: String(row.destination_conversation_id),
    replayed: Boolean(row.replayed),
  }
}

export async function upsertTradeBoardIntakePhoto(
  supabase: SupabaseClient,
  args: {
    sessionId: string
    repId: string
    conversationId: string
    conversationMessageId?: string
    attachmentIndex: number
    declaredRole: TradeBoardIntakePhotoState['declaredRole']
    visualRole: TradeBoardIntakePhotoState['visualRole']
    roleConfirmed: boolean
    imageUrl?: string
    quality: TradeBoardIntakePhotoState['quality']
    qualityScore?: number
    qualityIssues: string[]
    notes: string[]
    ocrOrVisionSummary?: string
    contentSha256?: string
    visualRoleSource?: string
  },
): Promise<void> {
  const { error } = await supabase.from('trade_board_intake_photos').upsert(
    {
      session_id: args.sessionId,
      rep_id: args.repId,
      conversation_id: args.conversationId,
      conversation_message_id: args.conversationMessageId ?? null,
      attachment_index: args.attachmentIndex,
      declared_role: args.declaredRole,
      visual_role: args.visualRole,
      role_confirmed: args.roleConfirmed,
      image_url: args.imageUrl ?? null,
      quality: args.quality,
      quality_score: args.qualityScore ?? null,
      quality_issues: args.qualityIssues,
      notes: args.notes,
      ocr_or_vision_summary: args.ocrOrVisionSummary ?? null,
      content_sha256: args.contentSha256 ?? null,
      inspected_at: args.visualRoleSource ? new Date().toISOString() : null,
      visual_role_source: args.visualRoleSource ?? null,
    },
    { onConflict: 'session_id,conversation_message_id,attachment_index' },
  )

  if (error) throw error
}
