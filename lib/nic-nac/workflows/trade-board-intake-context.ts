import type { SupabaseClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import type { UIMessage } from 'ai'
import type { NicNacToolIntent } from '@/lib/nic-nac/tools'
import { analyzeServerImageQuality } from '@/lib/services/server-image-quality'
import {
  canUseConfirmedJewelryFront,
  classifyJewelryPhotoSemantics,
} from '@/lib/services/jewelry-photo-semantics'
import { assessJewelryPhotoPreflight } from '@/lib/services/jewelry-photo-preflight'
import {
  extractKnownFieldsFromCatalogToolOutputs,
  extractKnownFieldsFromText,
  mergeTradeBoardKnownFields,
} from './trade-board-known-fields'
import {
  buildTradeBoardIntakePromptState,
  computeTradeBoardIntakeReadiness,
  getTradeBoardIntakeToolsRequired,
} from './trade-board-intake-controller'
import { renderTradeBoardIntakePromptState } from './trade-board-intake-prompt'
import type {
  TradeBoardIntakeSessionState,
  TradeBoardIntakeToolPolicySource,
  TradeBoardPhotoDeclaredRole,
  TradeBoardPhotoVisualRole,
} from './trade-board-intake-types'
import {
  createTradeBoardIntakeSession,
  getActiveTradeBoardIntakeSession,
  updateTradeBoardIntakeSession,
  upsertTradeBoardIntakePhoto,
} from './trade-board-intake-store'
import { isExplicitTradeBoardAddRequest } from './trade-board-add-intent'

export function inferDeclaredPhotoRoleFromConversation(
  messages: UIMessage[],
  attachmentIndex: number,
): TradeBoardPhotoDeclaredRole {
  const latestUserIndex = findLatestUserMessageIndex(messages)
  if (latestUserIndex === -1) return 'unknown'
  const latestUser = messages[latestUserIndex]
  const fileParts = (latestUser.parts ?? []).filter(
    (part) =>
      (part as { type?: string; mediaType?: string }).type === 'file' &&
      (part as { mediaType?: string }).mediaType?.startsWith('image/'),
  )
  if (!fileParts[attachmentIndex]) return 'unknown'

  const latestText = getMessageText(latestUser)
  const latestRole = inferRoleFromText(latestText)
  if (latestRole !== 'unknown') return latestRole

  const previousAssistant = messages
    .slice(0, latestUserIndex)
    .reverse()
    .find((message) => message.role === 'assistant')
  return inferRoleFromText(getMessageText(previousAssistant))
}

export function reconcileDeclaredPhotoRoleWithWorkflow(args: {
  inferredRole: TradeBoardPhotoDeclaredRole
  latestUserText: string
  photos: TradeBoardIntakeSessionState['photos']
}): TradeBoardPhotoDeclaredRole {
  const latestUserDeclaredRole = inferRoleFromText(args.latestUserText)
  if (latestUserDeclaredRole !== 'unknown') return latestUserDeclaredRole

  const alreadyHasLabel = args.photos.some(
    (photo) => photo.declaredRole === 'label_details',
  )
  const alreadyHasJewelryFront = args.photos.some(
    (photo) => photo.declaredRole === 'jewelry_front',
  )
  if (
    alreadyHasLabel &&
    !alreadyHasJewelryFront &&
    (args.inferredRole === 'label_details' || args.inferredRole === 'unknown')
  ) {
    return 'jewelry_front'
  }

  return args.inferredRole
}

export function mergeWorkflowToolIntents(
  latestIntents: NicNacToolIntent[],
  workflowIntents: NicNacToolIntent[],
): NicNacToolIntent[] {
  const merged: NicNacToolIntent[] = []
  for (const intent of [...latestIntents, ...workflowIntents]) {
    if (!merged.includes(intent)) merged.push(intent)
  }
  return merged
}

export async function getOrCreateTradeBoardIntakeContext(args: {
  supabase: SupabaseClient
  workflowSupabase?: SupabaseClient
  repId: string
  conversationId: string
  messages: UIMessage[]
  latestUserMessageId?: string
  mode: 'workspace' | 'required_setup'
  nowIso: string
  preloadedSession?: TradeBoardIntakeSessionState | null
}): Promise<{
  sessionBefore: TradeBoardIntakeSessionState | null
  sessionAfter: TradeBoardIntakeSessionState | null
  workflowIntents: NicNacToolIntent[]
  toolPolicySource: TradeBoardIntakeToolPolicySource
  workflowPromptState: string
}> {
  if (args.mode !== 'workspace') {
    return emptyWorkflowContext('mode_required_setup')
  }

  try {
    const workflowSupabase = args.workflowSupabase ?? args.supabase
    const existing =
      args.preloadedSession !== undefined
        ? args.preloadedSession
        : await getActiveTradeBoardIntakeSession(workflowSupabase, {
            repId: args.repId,
            conversationId: args.conversationId,
            nowIso: args.nowIso,
          })
    const shouldStart = existing !== null || hasTradeBoardIntakeSignal(args.messages)
    if (!shouldStart) {
      return emptyWorkflowContext('latest_turn_intent')
    }

    const baseSession =
      existing ??
      (await createTradeBoardIntakeSession(workflowSupabase, {
        repId: args.repId,
        conversationId: args.conversationId,
        lastUserMessageId: args.latestUserMessageId,
      }))
    if (baseSession.status === 'needs_human_review') {
      return {
        sessionBefore: existing,
        sessionAfter: baseSession,
        workflowIntents: [],
        toolPolicySource: 'active_workflow',
        workflowPromptState: renderTradeBoardIntakePromptState(
          buildTradeBoardIntakePromptState(baseSession),
        ),
      }
    }
    const ingested = await ingestLatestTradeBoardIntakeTurn(workflowSupabase, {
      session: baseSession,
      messages: args.messages,
      latestUserMessageId: args.latestUserMessageId,
    })
    const promptState = buildTradeBoardIntakePromptState(ingested)

    return {
      sessionBefore: existing,
      sessionAfter: ingested,
      workflowIntents: getTradeBoardIntakeToolsRequired(ingested),
      toolPolicySource: 'active_workflow',
      workflowPromptState: renderTradeBoardIntakePromptState(promptState),
    }
  } catch (err) {
    if (isMissingWorkflowSchemaError(err)) {
      console.warn('[nic-nac] Dance Floor intake workflow schema is unavailable', {
        conversationId: args.conversationId,
      })
      return emptyWorkflowContext('latest_turn_intent')
    }
    throw err
  }
}

export function hasTradeBoardIntakeSignal(messages: UIMessage[]): boolean {
  const latestUser = [...messages].reverse().find((message) => message.role === 'user')
  const text = getMessageText(latestUser)
  const previousAssistant = [...messages]
    .reverse()
    .find((message) => message.role === 'assistant')
  const assistantText = getMessageText(previousAssistant)
  const hasImage = hasImagePart(latestUser)
  if (
    hasImage &&
    !hasExplicitTradeBoardAddSignal(text) &&
    assistantIsPostCompletionFollowUp(assistantText)
  ) {
    return false
  }

  return (
    hasExplicitTradeBoardAddSignal(text) ||
    /\b[A-Z]{1,4}\d{3,}\b/.test(text) ||
    (hasImage &&
      /\b(label|details|tag|jewelry|customer-facing|dance floor|add a piece)\b/i.test(
        assistantText,
      ))
  )
}

function hasExplicitTradeBoardAddSignal(text: string): boolean {
  return isExplicitTradeBoardAddRequest(text)
}

function assistantIsPostCompletionFollowUp(text: string): boolean {
  return (
    /\bnow on your Dance Floor as available\b/i.test(text) ||
    /\busing the catalog photo right now\b/i.test(text) ||
    /\bI can also add trade preferences or a custom listing photo\b/i.test(text)
  )
}

function latestTurnConfirmsAdditionalPhysicalPiece(args: {
  latestUserText: string
  previousAssistantText: string
}): boolean {
  const assistantAskedAboutDuplicatePhysicalPiece =
    /\balready\s+on\s+your\s+Trade\s+Board\b/i.test(args.previousAssistantText) &&
    /\b(?:another|second|additional|extra)\s+physical\s+piece\b/i.test(
      args.previousAssistantText,
    ) &&
    /\b(?:same|that\s+same)\s+design\b/i.test(args.previousAssistantText)
  const positiveAnswer =
    /\b(yes|yep|yeah|yup|correct|right|exactly|please|do\s+it|go\s+ahead)\b/i.test(
      args.latestUserText,
    )
  if (assistantAskedAboutDuplicatePhysicalPiece && positiveAnswer) return true

  return (
    /\b(?:another|second|additional|extra|duplicate)\s+(?:physical\s+)?(?:piece|copy|unit)\b[\s\S]{0,100}\b(?:same|that\s+same|this\s+same)\s+(?:design|item|piece)\b/i.test(
      args.latestUserText,
    ) ||
    /\bI\s+(?:have|got|found)\s+(?:another|a\s+second|an\s+additional|an\s+extra)\s+(?:physical\s+)?(?:piece|copy|unit)\b/i.test(
      args.latestUserText,
    )
  )
}

function inferCatalogModeFromTurn(args: {
  currentMode: TradeBoardIntakeSessionState['catalogMode']
  latestUserText: string
  previousAssistantText: string
  hasItemNumber: boolean
}): TradeBoardIntakeSessionState['catalogMode'] {
  if (args.hasItemNumber) return 'item_number'
  if (args.currentMode === 'non_item_number') return 'non_item_number'
  if (/\b(?:do not|don't|dont|no|missing|without)\b[\s\S]{0,40}\bitem\s*(?:number|#)\b/i.test(args.latestUserText)) {
    return 'non_item_number'
  }
  if (
    /\b(?:yes|yep|yeah|correct|that'?s right|that is right|please|go ahead|do that|add it)\b/i.test(
      args.latestUserText,
    ) &&
    /\b(?:non-item number|without an item number|missing item number|do not see an item number)\b/i.test(
      args.previousAssistantText,
    )
  ) {
    return 'non_item_number'
  }
  return 'item_number'
}

export async function ingestLatestTradeBoardIntakeTurn(
  supabase: SupabaseClient,
  args: {
    session: TradeBoardIntakeSessionState
    messages: UIMessage[]
    latestUserMessageId?: string
  },
): Promise<TradeBoardIntakeSessionState> {
  const latestUserIndex = findLatestUserMessageIndex(args.messages)
  if (latestUserIndex === -1) return args.session
  const latestUser = args.messages[latestUserIndex]
  const latestUserText = getMessageText(latestUser)
  const previousAssistantText = getMessageText(
    args.messages
      .slice(0, latestUserIndex)
      .reverse()
      .find((message) => message.role === 'assistant'),
  )
  let known = mergeTradeBoardKnownFields(
    mergeTradeBoardKnownFields(
      args.session.known,
      extractKnownFieldsFromCatalogToolOutputs(args.messages),
    ),
    extractKnownFieldsFromText(latestUserText),
  )
  if (
    latestTurnConfirmsAdditionalPhysicalPiece({
      latestUserText,
      previousAssistantText,
    })
  ) {
    known = { ...known, duplicatePhysicalConfirmed: true }
  }
  const catalogMode = inferCatalogModeFromTurn({
    currentMode: args.session.catalogMode,
    latestUserText,
    previousAssistantText,
    hasItemNumber: Boolean(known.itemNumber),
  })
  const photos = [...args.session.photos]
  const fileParts = (latestUser.parts ?? []).filter(
    (part) =>
      (part as { type?: string; mediaType?: string }).type === 'file' &&
      (part as { mediaType?: string }).mediaType?.startsWith('image/'),
  ) as Array<{ type?: string; mediaType?: string; url?: string }>

  for (const [index, filePart] of fileParts.entries()) {
    const declaredRole = reconcileDeclaredPhotoRoleWithWorkflow({
      inferredRole: inferDeclaredPhotoRoleFromConversation(
        args.messages,
        index,
      ),
      latestUserText,
      photos,
    })
    const inspected = await inspectWorkflowPhoto(filePart.url, declaredRole)
    const visualRole =
      declaredRole === 'jewelry_front' && inspected.visualRole === 'label_or_packaging'
        ? 'uncertain'
        : inspected.visualRole
    const photo = {
      conversationMessageId: args.latestUserMessageId ?? latestUser.id,
      attachmentIndex: index + 1,
      declaredRole,
      visualRole,
      roleConfirmed: declaredRole !== 'unknown',
      imageUrl: filePart.url,
      quality: inspected.quality,
      qualityScore: inspected.qualityScore,
      qualityIssues: inspected.qualityIssues,
      contentSha256: inspected.contentSha256,
      visualRoleSource: inspected.visualRoleSource,
      notes:
        declaredRole === 'label_details'
          ? ['declared as label/details source']
          : declaredRole === 'jewelry_front'
            ? ['declared as customer-facing jewelry photo']
            : [],
    }
    photos.push(photo)
    await upsertTradeBoardIntakePhoto(supabase, {
      sessionId: args.session.id,
      repId: args.session.repId,
      conversationId: args.session.conversationId,
      conversationMessageId: photo.conversationMessageId,
      attachmentIndex: photo.attachmentIndex,
      declaredRole: photo.declaredRole,
      visualRole: photo.visualRole,
      roleConfirmed: photo.roleConfirmed,
      imageUrl: photo.imageUrl,
      quality: photo.quality,
      qualityScore: photo.qualityScore,
      qualityIssues: photo.qualityIssues,
      notes: photo.notes,
      contentSha256: photo.contentSha256,
      visualRoleSource: photo.visualRoleSource,
    })
  }

  if (fileParts.length === 0) {
    const confirmedPhoto = maybeConfirmLatestJewelryFrontPhoto({
      photos,
      latestUserText,
      previousAssistantText: getMessageText(
        args.messages
          .slice(0, latestUserIndex)
          .reverse()
          .find((message) => message.role === 'assistant'),
      ),
    })
    if (confirmedPhoto) {
      await upsertTradeBoardIntakePhoto(supabase, {
        sessionId: args.session.id,
        repId: args.session.repId,
        conversationId: args.session.conversationId,
        conversationMessageId: confirmedPhoto.conversationMessageId,
        attachmentIndex: confirmedPhoto.attachmentIndex,
        declaredRole: confirmedPhoto.declaredRole,
        visualRole: confirmedPhoto.visualRole,
        roleConfirmed: confirmedPhoto.roleConfirmed,
        imageUrl: confirmedPhoto.imageUrl,
        quality: confirmedPhoto.quality,
        qualityScore: confirmedPhoto.qualityScore,
        qualityIssues: confirmedPhoto.qualityIssues,
        notes: confirmedPhoto.notes,
      })
    }
  }

  const updated: TradeBoardIntakeSessionState = {
    ...args.session,
    catalogMode,
    known,
    photos,
    lastUserMessageId: args.latestUserMessageId ?? latestUser.id,
  }
  const readiness = computeTradeBoardIntakeReadiness(updated)
  const normalized: TradeBoardIntakeSessionState = {
    ...updated,
    missing: readiness.missing,
    blockers: readiness.blockers,
    phase:
      readiness.ready && updated.status === 'active'
        ? 'ready_to_add'
        : buildTradeBoardIntakePromptState(updated).workflow.phase,
  }

  await updateTradeBoardIntakeSession(supabase, {
    sessionId: args.session.id,
    patch: {
      item_number: known.itemNumber ?? null,
      catalog_mode: normalized.catalogMode,
      jewelry_type: known.jewelryType ?? null,
      quantity: known.quantity ?? null,
      design_name: known.designName ?? null,
      collection_family: known.collectionFamily ?? null,
      collection_name: known.collectionName ?? null,
      collection_year: known.collectionYear ?? null,
      material: known.material ?? null,
      main_stone: known.mainStone ?? null,
      bp_msrp: known.bpMsrp ?? null,
      ring_size: known.ringSize ?? null,
      rep_notes: known.repNotes ?? null,
      trade_preferences: known.tradePreferences ?? null,
      rarity_classification: known.rarityClassification ?? null,
      rarity_confirmed_at: known.rarityClassification
        ? new Date().toISOString()
        : null,
      metadata: {
        ...normalized.metadata,
        duplicatePhysicalConfirmed:
          known.duplicatePhysicalConfirmed === true,
      },
      current_phase: normalized.phase,
      missing_fields: normalized.missing,
      hard_blockers: normalized.blockers,
      soft_warnings: normalized.warnings,
      last_user_message_id: normalized.lastUserMessageId ?? null,
    },
  })

  return normalized
}

function emptyWorkflowContext(
  toolPolicySource: TradeBoardIntakeToolPolicySource,
) {
  return {
    sessionBefore: null,
    sessionAfter: null,
    workflowIntents: [],
    toolPolicySource,
    workflowPromptState: '',
  }
}

function isMissingWorkflowSchemaError(err: unknown): boolean {
  const error = err as { code?: string; message?: string } | null
  return (
    error?.code === '42P01' ||
    /\brelation\s+"?(?:public\.)?trade_board_intake_(?:sessions|photos)"?\s+does\s+not\s+exist\b/i.test(
      error?.message ?? '',
    ) ||
    /\bcould\s+not\s+find\s+the\s+table\b[\s\S]{0,120}\btrade_board_intake_(?:sessions|photos)\b/i.test(
      error?.message ?? '',
    )
  )
}

function inferRoleFromText(text: string): TradeBoardPhotoDeclaredRole {
  const asksForJewelryPhoto =
    /\b(?:need|needs|send|upload|snap|take|provide|use|show|get|got)\b[\s\S]{0,120}\b(?:jewelry|customer-facing|front\s+(?:photo|shot|image)|boxed display|piece photo|listing photo|earrings themselves|just the earrings|actual jewelry)\b/i.test(
      text,
    ) ||
    /\b(?:jewelry|customer-facing|front\s+(?:photo|shot|image)|boxed display|piece photo|listing photo|earrings themselves|just the earrings|actual jewelry)\b[\s\S]{0,80}\b(?:photo|shot|image|front and center|clear|close)\b/i.test(
      text,
    )
  const asksForLabelPhoto =
    /\b(?:need|needs|send|upload|snap|take|provide|use|show|get|got)\b[\s\S]{0,120}\b(?:label(?:\/details)?|details\s+(?:photo|shot|image|source)|tag|back.of.card|item-info|item info)\b/i.test(
      text,
    ) ||
    /\b(?:label(?:\/details)?|tag|back.of.card|item-info|item info)\b[\s\S]{0,80}\b(?:photo|shot|image|source)\b/i.test(
      text,
    ) ||
    /\bdetails\s+(?:photo|shot|image|source)\b/i.test(
      text,
    )
  const rejectsLabelAsListingPhoto =
    /\blabel(?:\/details)?\s+photo\b[\s\S]{0,80}\b(?:doesn'?t|does not|isn'?t|is not|won'?t|will not|can'?t|cannot)\b[\s\S]{0,120}\b(?:listing|jewelry|earrings|front|photo|shot|image)\b/i.test(
      text,
    )
  const treatsLabelAsDetailsSource =
    /\blabel(?:\/details)?\s+photo\b[\s\S]{0,120}\b(?:helpful|details|source|read|got\s+the\s+details|shows\s+the\s+info|super\s+helpful)\b/i.test(
      text,
    ) ||
    /\blabel(?:\/details)?\s+photo\b[\s\S]{0,160}\bbut\b[\s\S]{0,160}\b(?:need|see|show|get|use)\b[\s\S]{0,120}\b(?:earrings|jewelry|customer-facing|front|boxed display|listing)\b/i.test(
      text,
    )

  if (
    asksForJewelryPhoto &&
    (rejectsLabelAsListingPhoto ||
      treatsLabelAsDetailsSource ||
      !asksForLabelPhoto)
  ) {
    return 'jewelry_front'
  }
  if (asksForLabelPhoto && !asksForJewelryPhoto) {
    return 'label_details'
  }
  if (asksForJewelryPhoto && asksForLabelPhoto) {
    return 'unknown'
  }
  if (
    /\b(jewelry|customer-facing|front photo|boxed display|piece photo)\b/i.test(
      text,
    )
  ) {
    return 'jewelry_front'
  }
  return 'unknown'
}

function maybeConfirmLatestJewelryFrontPhoto(args: {
  photos: TradeBoardIntakeSessionState['photos']
  latestUserText: string
  previousAssistantText: string
}): TradeBoardIntakeSessionState['photos'][number] | null {
  if (!isPositiveConfirmation(args.latestUserText)) return null
  if (
    !assistantAskedToConfirmJewelryFront(args.previousAssistantText) &&
    !assistantIdentifiedJewelryFront(args.previousAssistantText)
  ) {
    return null
  }

  for (let index = args.photos.length - 1; index >= 0; index--) {
    const photo = args.photos[index]
    if (!photo) continue
    if (photo.declaredRole === 'label_details') continue
    if (photo.quality === 'blocked') continue
    if (!photo.imageUrl) continue
    if (photo.declaredRole === 'jewelry_front' && photo.roleConfirmed) {
      return photo
    }
    if (photo.declaredRole !== 'unknown' && photo.declaredRole !== 'other') {
      continue
    }

    const confirmed = {
      ...photo,
      declaredRole: 'jewelry_front' as const,
      roleConfirmed: true,
      notes: [
        ...photo.notes,
        'confirmed by rep as customer-facing jewelry photo',
      ],
    }
    args.photos[index] = confirmed
    return confirmed
  }

  return null
}

function isPositiveConfirmation(text: string): boolean {
  return (
    /\b(?:confirmed|confirm|yes|yep|yeah|correct|that'?s right|that is right|that is correct|exactly|use it|use that|use this(?:\s+(?:photo|shot|image|one))?|good enough)\b/i.test(
      text,
    ) ||
    /\bpush\s+(?:it|that|this|the\s+photo|the\s+shot|the\s+image)\s+through\b/i.test(
      text,
    ) ||
    /\b(?:it'?s|it is|that'?s|that is|this is|photo is|shot is|image is)\s+a?\s*(?:good|great|perfect|usable|clear)\s+(?:photo|shot|image)\b/i.test(
      text,
    ) ||
    /\b(?:good|great|perfect|usable|clear)\s+(?:photo|shot|image)\b/i.test(
      text,
    )
  )
}

function assistantAskedToConfirmJewelryFront(text: string): boolean {
  return (
    /\bconfirm\b[\s\S]{0,160}\b(?:jewelry[-\s]?front|customer-facing|listing|photo|shot|image)\b/i.test(
      text,
    ) ||
    /\b(?:jewelry[-\s]?front|customer-facing|boxed display|listing)\b[\s\S]{0,160}\bconfirm\b/i.test(
      text,
    )
  )
}

function assistantIdentifiedJewelryFront(text: string): boolean {
  return (
    /\b(?:great|clear|usable|perfect|good|solid)\b[\s\S]{0,80}\bboxed\s+display\s+photo\b[\s\S]{0,120}\b(?:earrings|jewelry)\b/i.test(
      text,
    ) ||
    /\bboxed\s+display\s+photo\b[\s\S]{0,120}\b(?:earrings|jewelry)\b[\s\S]{0,120}\b(?:clearly|clear|usable|counts|customer-facing)\b/i.test(
      text,
    ) ||
    /\b(?:earrings|jewelry)\b[\s\S]{0,120}\b(?:clearly|clear|usable|customer-facing)\b[\s\S]{0,120}\bboxed\s+display\b/i.test(
      text,
    ) ||
    /\b(?:got|have|see|received|caught)\b[\s\S]{0,80}\bfront\s+(?:jewelry\s+)?(?:photo|shot|image)\b[\s\S]{0,80}\bvisually\b/i.test(
      text,
    ) ||
    /\bfront\s+(?:jewelry\s+)?(?:photo|shot|image)\b[\s\S]{0,160}\b(?:save\s+step|photo\s+handoff|picking\s+it\s+up|receiving|comes?\s+through)\b/i.test(
      text,
    ) ||
    /\b(?:not\s+rejecting\s+the\s+quality|quality\s+isn'?t\s+the\s+issue|quality\s+is\s+not\s+the\s+issue)\b[\s\S]{0,160}\bfront\s+(?:jewelry\s+)?(?:photo|shot|image)\b/i.test(
      text,
    )
  )
}

async function inspectWorkflowPhoto(
  imageUrl: string | undefined,
  declaredRole: TradeBoardPhotoDeclaredRole,
): Promise<{
  visualRole: TradeBoardPhotoVisualRole
  quality: 'usable' | 'warning' | 'blocked' | 'unknown'
  qualityScore?: number
  qualityIssues: string[]
  contentSha256?: string
  visualRoleSource?: string
}> {
  if (!imageUrl) {
    return { visualRole: 'uncertain', quality: 'unknown', qualityIssues: [] }
  }
  try {
    const dataMatch = /^data:[^;]+;base64,(.+)$/i.exec(imageUrl)
    const bytes = dataMatch
      ? new Uint8Array(Buffer.from(dataMatch[1], 'base64'))
      : new Uint8Array(await (await fetch(imageUrl)).arrayBuffer())
    const analysis = await analyzeServerImageQuality(bytes)
    const semantic = classifyJewelryPhotoSemantics(analysis)
    const preflight = assessJewelryPhotoPreflight(analysis)
    const reviewableJewelryFront = canUseConfirmedJewelryFront(
      analysis,
      semantic,
      true,
    )
    const labelUnreadable =
      Math.min(analysis.width, analysis.height) < 500 ||
      analysis.blurRisk >= 0.75 ||
      analysis.detailRisk >= 0.82 ||
      analysis.detailConfidence < 0.35
    const quality =
      declaredRole === 'label_details'
        ? labelUnreadable
          ? 'blocked'
          : analysis.blurRisk >= 0.45 || analysis.detailRisk >= 0.58
            ? 'warning'
            : 'usable'
        : preflight.passed
          ? 'usable'
          : reviewableJewelryFront
            ? 'warning'
            : 'blocked'
    return {
      visualRole: semantic.role,
      quality,
      qualityScore: preflight.score,
      qualityIssues: [
        ...semantic.reasons,
        ...preflight.issues.map((issue) => issue.code),
      ],
      contentSha256: createHash('sha256').update(bytes).digest('hex'),
      visualRoleSource: 'server_image_analysis_v1',
    }
  } catch {
    return {
      visualRole: 'uncertain',
      quality: 'unknown',
      qualityIssues: ['server_visual_inspection_unavailable'],
      visualRoleSource: 'inspection_failed',
    }
  }
}

function findLatestUserMessageIndex(messages: UIMessage[]): number {
  for (let index = messages.length - 1; index >= 0; index--) {
    if (messages[index].role === 'user') return index
  }
  return -1
}

function getMessageText(message: UIMessage | undefined): string {
  return (
    message?.parts
      ?.filter((part) => (part as { type?: string }).type === 'text')
      .map((part) => (part as { text?: string }).text ?? '')
      .join('\n') ?? ''
  )
}

function hasImagePart(message: UIMessage | undefined): boolean {
  return (
    message?.parts?.some(
      (part) =>
        (part as { type?: string }).type === 'file' &&
        (part as { mediaType?: string }).mediaType?.startsWith('image/'),
    ) ?? false
  )
}
