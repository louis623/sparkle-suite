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
  EMPTY_PIECE_MODEL_CONTEXT,
  assistantIsResumingUnfinishedPiece,
  decidePieceClose,
  pieceCarryNote,
  pieceNoteList,
  pieceTurnBoundary,
  repConfirmedPrintedLabelNumber,
  unfinishedPieceQuestion,
  type PieceModelContext,
} from '@/lib/nic-nac/piece-task'
import {
  createTradeBoardIntakeSession,
  getActiveTradeBoardIntakeSession,
  readLatestClosedPieceNotes,
  updateTradeBoardIntakeSession,
  upsertTradeBoardIntakePhoto,
} from './trade-board-intake-store'
import {
  hashDataImageUrl,
  mainPhotoConfirmationIdentity,
  photoConfirmationPieceKey,
} from './photo-reuse-guard'
import { isExplicitTradeBoardAddRequest } from './trade-board-add-intent'
import {
  assignDeclaredPhotoRolesForTurn,
  inferRoleFromText,
  REP_CONFIRMED_MAIN_PHOTO_NOTE,
  stampSoleReadinessJewelryFrontCandidate,
  TURNED_DOWN_MAIN_PHOTO_NOTE,
} from './workflow-photo-roles'

export { reconcileDeclaredPhotoRoleWithWorkflow } from './workflow-photo-roles'

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
  modelPieceContext: PieceModelContext
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
    const latestUserIndex = findLatestUserMessageIndex(args.messages)
    const latestUser =
      latestUserIndex === -1 ? undefined : args.messages[latestUserIndex]
    const latestText = getMessageText(latestUser)
    const previousAssistantText = getMessageText(
      args.messages
        .slice(0, Math.max(latestUserIndex, 0))
        .reverse()
        .find((message) => message.role === 'assistant'),
    )
    let session = existing
    let inheritedNotes: string[] | null = null
    let unfinishedQuestion: string | null = null
    if (session?.status === 'active') {
      const boundary = pieceTurnBoundary({
        latestUserText: latestText,
        previousAssistantText,
        activeItemNumber: session.known.itemNumber,
        latestTurnIsPhotoConfirmation:
          isPositiveConfirmation(latestText) ||
          isNegativePhotoConfirmation(latestText),
      })
      if (boundary.action === 'close') {
        const note = pieceCarryNote({
          reason: boundary.reason,
          itemNumber: session.known.itemNumber,
          material: session.known.material,
          jewelryType: session.known.jewelryType,
          designName: session.known.designName,
        })
        const notes = [...pieceNoteList(session.metadata.priorPieceNotes), note].slice(-8)
        unfinishedQuestion = boundary.askToFinish
          ? unfinishedPieceQuestion(session.known.itemNumber)
          : null
        await updateTradeBoardIntakeSession(workflowSupabase, {
          sessionId: session.id,
          patch: {
            status: 'cancelled',
            current_phase: 'cancelled',
            metadata: {
              ...clearedPieceConfirmation(session.metadata),
              carryNote: note,
              priorPieceNotes: notes,
              pieceClosedReason: boundary.reason,
            },
          },
        })
        inheritedNotes = notes
        if (!boundary.startsReplacement) {
          return {
            sessionBefore: existing,
            sessionAfter: null,
            workflowIntents: [],
            toolPolicySource: 'latest_turn_intent',
            workflowPromptState: notes.join('. '),
            modelPieceContext: {
              fromMessageId: latestUser?.id ?? null,
              carryNotes: notes,
              unfinishedQuestion,
            },
          }
        }
        session = null
      }
    }

    const shouldStart = session !== null || hasTradeBoardIntakeSignal(args.messages)
    if (!shouldStart) {
      const closedNotes =
        inheritedNotes ??
        (await readLatestClosedPieceNotes(workflowSupabase, {
          repId: args.repId,
          conversationId: args.conversationId,
        }))
      const saved = [...closedNotes].reverse().find((note) => note.startsWith('Saved '))
      const latestUser = args.messages
        .slice()
        .reverse()
        .find((message) => message.role === 'user')
      if (saved && decidePieceClose(getMessageText(latestUser)) === 'skipped') {
        return {
          ...emptyWorkflowContext('latest_turn_intent'),
          workflowPromptState: `${saved}. This piece is already on the Dance Floor. Tell the rep that. Do not say it was skipped. If she wants it removed, call remove_listing and let the approval dialog confirm it.`,
          modelPieceContext: {
            fromMessageId: latestUser?.id ?? null,
            carryNotes: closedNotes,
            unfinishedQuestion: null,
          },
        }
      }
      return emptyWorkflowContext('latest_turn_intent')
    }

    const priorNotes =
      inheritedNotes ??
      (session
        ? pieceNoteList(session.metadata.priorPieceNotes)
        : await readLatestClosedPieceNotes(workflowSupabase, {
            repId: args.repId,
            conversationId: args.conversationId,
          }))
    const baseSession =
      session ??
      (await createTradeBoardIntakeSession(workflowSupabase, {
        repId: args.repId,
        conversationId: args.conversationId,
        lastUserMessageId: args.latestUserMessageId,
        metadata: {
          priorPieceNotes: priorNotes,
          ...(args.latestUserMessageId
            ? { openedOnMessageId: args.latestUserMessageId }
            : {}),
          ...(unfinishedQuestion ? { unfinishedQuestion } : {}),
        },
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
        modelPieceContext: pieceModelContext(baseSession),
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
      modelPieceContext: pieceModelContext(ingested),
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

const ADD_PIECE_PHOTO_ASK =
  /\b(?:photo|image|shot|picture|label)s?\b[\s\S]{0,80}\bfor this piece\b|\bfor this piece\b[\s\S]{0,80}\b(?:photo|image|shot|picture|label)s?\b/i

export function hasTradeBoardIntakeSignal(messages: UIMessage[]): boolean {
  const latestUserIndex = findLatestUserMessageIndex(messages)
  const latestUser = latestUserIndex === -1 ? undefined : messages[latestUserIndex]
  const text = getMessageText(latestUser)
  const previousAssistant = messages
    .slice(0, Math.max(latestUserIndex, 0))
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

  if (hasExplicitTradeBoardAddSignal(text) || /\b[A-Z]{1,4}\d{3,}\b/.test(text)) {
    return true
  }

  // A photo starts a piece only while one is being added. A photo in ordinary
  // chat, or a label sent with no add in progress, does not open an intake.
  return (
    hasImage &&
    (ADD_PIECE_PHOTO_ASK.test(assistantText) ||
      assistantIsResumingUnfinishedPiece(assistantText))
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

export function inferCatalogModeFromTurn(args: {
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
  let metadata = { ...args.session.metadata }
  if (typeof metadata.openedOnMessageId !== 'string' || !metadata.openedOnMessageId) {
    metadata.openedOnMessageId =
      args.session.photos.find((photo) => photo.conversationMessageId)
        ?.conversationMessageId ??
      args.latestUserMessageId ??
      latestUser.id
  }
  const openedOnMessageId = metadata.openedOnMessageId as string
  const openedIndex = args.messages.findIndex(
    (message) => message.id === openedOnMessageId,
  )
  const pieceMessages =
    openedIndex === -1 ? args.messages : args.messages.slice(openedIndex)
  let known = mergeTradeBoardKnownFields(
    mergeTradeBoardKnownFields(
      args.session.known,
      extractKnownFieldsFromCatalogToolOutputs(pieceMessages),
    ),
    extractKnownFieldsFromText(latestUserText),
  )
  if (
    repConfirmedPrintedLabelNumber({
      latestUserText,
      previousAssistantText,
      itemNumber: known.itemNumber,
    })
  ) {
    metadata = {
      ...metadata,
      labelItemNumberConfirmed: known.itemNumber?.toUpperCase(),
    }
  }
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
  const photosBeforeThisTurn = photos.length
  const fileParts = (latestUser.parts ?? []).filter(
    (part) =>
      (part as { type?: string; mediaType?: string }).type === 'file' &&
      (part as { mediaType?: string }).mediaType?.startsWith('image/'),
  ) as Array<{ type?: string; mediaType?: string; url?: string }>
  const inspectedPhotos = await Promise.all(
    fileParts.map((filePart) => inspectWorkflowPhoto(filePart.url, 'unknown')),
  )
  const declaredRoles = assignDeclaredPhotoRolesForTurn({
    attachmentCount: fileParts.length,
    inheritedRole:
      fileParts.length === 1
        ? inferDeclaredPhotoRoleFromConversation(args.messages, 0)
        : 'unknown',
    latestUserText,
    existingPhotos: photos,
    visualRoles: inspectedPhotos.map((inspected) => inspected.visualRole),
  })

  for (const [index, filePart] of fileParts.entries()) {
    const declaredRole = declaredRoles[index] ?? 'unknown'
    const inspected = scoreInspectedWorkflowPhoto(
      declaredRole,
      inspectedPhotos[index] ??
        ({
          visualRole: 'uncertain',
          quality: 'unknown',
          qualityIssues: [],
        } satisfies InspectedWorkflowPhoto),
    )
    const visualRole = inspected.visualRole
    const photo: TradeBoardIntakeSessionState['photos'][number] = {
      intakeSessionId: args.session.id,
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
    const savedId = await upsertTradeBoardIntakePhoto(supabase, {
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
    if (savedId) photo.id = savedId
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
        contentSha256: confirmedPhoto.contentSha256,
        visualRoleSource: confirmedPhoto.visualRoleSource,
      })
    }
  }

  const stampedPhotos = stampSoleReadinessJewelryFrontCandidate(photos)
  for (let index = 0; index < stampedPhotos.length; index += 1) {
    const photo = stampedPhotos[index]
    if (!photo || photo === photos[index]) continue
    photos[index] = photo
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

  const ingestedNewImage = photos.length > photosBeforeThisTurn
  const declinedSharedPhoto = isNegativePhotoConfirmation(latestUserText) &&
    /already on|belongs with that set|main photo I will save/i.test(previousAssistantText)
  if (ingestedNewImage) {
    delete metadata.mainPhotoConfirmedPhotoId
    delete metadata.mainPhotoConfirmed
    delete metadata.mainPhotoConfirmedItemNumber
    if (declinedSharedPhoto) {
      metadata.declinedSharedPhoto = true
      for (let index = 0; index < photosBeforeThisTurn; index += 1) {
        const photo = photos[index]
        if (!photo?.imageUrl || photo.declaredRole === 'label_details') continue
        if (photo.notes.includes(TURNED_DOWN_MAIN_PHOTO_NOTE)) continue
        const turnedDown = {
          ...photo,
          notes: [...photo.notes, TURNED_DOWN_MAIN_PHOTO_NOTE],
        }
        photos[index] = turnedDown
        await upsertTradeBoardIntakePhoto(supabase, {
          sessionId: args.session.id,
          repId: args.session.repId,
          conversationId: args.session.conversationId,
          conversationMessageId: turnedDown.conversationMessageId,
          attachmentIndex: turnedDown.attachmentIndex,
          declaredRole: turnedDown.declaredRole,
          visualRole: turnedDown.visualRole,
          roleConfirmed: turnedDown.roleConfirmed,
          imageUrl: turnedDown.imageUrl,
          quality: turnedDown.quality,
          qualityScore: turnedDown.qualityScore,
          qualityIssues: turnedDown.qualityIssues,
          notes: turnedDown.notes,
          contentSha256: turnedDown.contentSha256,
          visualRoleSource: turnedDown.visualRoleSource,
        })
      }
    }
  } else if (latestTurnConfirmsMainPhoto(args.messages)) {
    const shownPreview = lastShownMainPhotoPreview(args.messages)
    const confirmedPhotoId = shownPreview.shown
      ? shownPreview.id
      : currentMainPhotoIdentity(photos)
    const confirmedItemNumber = photoConfirmationPieceKey({
      itemNumber: mainPhotoConfirmedItemNumber(
        args.messages,
        args.session.known.itemNumber,
      ),
      catalogMode,
      intakeId: args.session.id,
    })
    if (confirmedPhotoId && confirmedItemNumber) {
      metadata = {
        ...metadata,
        mainPhotoConfirmedPhotoId: confirmedPhotoId,
        mainPhotoConfirmedItemNumber: confirmedItemNumber,
      }
      delete metadata.mainPhotoConfirmed
    }
  } else if (latestTurnTurnsDownMainPhoto(args.messages)) {
    if (declinedSharedPhoto) metadata.declinedSharedPhoto = true
    const shownPreview = lastShownMainPhotoPreview(args.messages)
    const turnedDownId = shownPreview.shown
      ? shownPreview.id
      : currentMainPhotoIdentity(photos)
    metadata = recordTurnedDownMainPhoto(metadata, turnedDownId)
    if (
      turnedDownId &&
      metadata.mainPhotoConfirmedPhotoId === turnedDownId
    ) {
      delete metadata.mainPhotoConfirmedPhotoId
      delete metadata.mainPhotoConfirmed
      delete metadata.mainPhotoConfirmedItemNumber
    }
    if (turnedDownId) {
      for (let index = 0; index < photos.length; index += 1) {
        const photo = photos[index]
        if (!photo || !photoMatchesPreviewId(photo, turnedDownId)) continue
        if (photo.notes.includes(TURNED_DOWN_MAIN_PHOTO_NOTE)) continue
        const turnedDown = {
          ...photo,
          notes: [...photo.notes, TURNED_DOWN_MAIN_PHOTO_NOTE],
        }
        photos[index] = turnedDown
        await upsertTradeBoardIntakePhoto(supabase, {
          sessionId: args.session.id,
          repId: args.session.repId,
          conversationId: args.session.conversationId,
          conversationMessageId: turnedDown.conversationMessageId,
          attachmentIndex: turnedDown.attachmentIndex,
          declaredRole: turnedDown.declaredRole,
          visualRole: turnedDown.visualRole,
          roleConfirmed: turnedDown.roleConfirmed,
          imageUrl: turnedDown.imageUrl,
          quality: turnedDown.quality,
          qualityScore: turnedDown.qualityScore,
          qualityIssues: turnedDown.qualityIssues,
          notes: turnedDown.notes,
          contentSha256: turnedDown.contentSha256,
          visualRoleSource: turnedDown.visualRoleSource,
        })
      }
    }
  }
  if (latestTurnConfirmsPhotoSet(args.messages)) {
    const confirmedSha = flaggedPhotoSetSha(args.messages, photos)
    const confirmedItemNumber = photoConfirmationPieceKey({
      itemNumber: setAskItemNumber(args.messages),
      catalogMode,
      intakeId: args.session.id,
    })
    if (confirmedSha && confirmedItemNumber) {
      metadata = {
        ...metadata,
        photoSetReuseConfirmedSha: confirmedSha,
        photoSetReuseConfirmedItemNumber: confirmedItemNumber,
      }
      delete metadata.photoSetReuseConfirmed
    }
  }
  const updated: TradeBoardIntakeSessionState = {
    ...args.session,
    catalogMode,
    known,
    photos,
    metadata,
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
    modelPieceContext: EMPTY_PIECE_MODEL_CONTEXT,
  }
}

function clearedPieceConfirmation(
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...metadata }
  for (const key of [
    'mainPhotoConfirmedPhotoId',
    'mainPhotoConfirmed',
    'mainPhotoConfirmedItemNumber',
    'photoSetReuseConfirmedSha',
    'photoSetReuseConfirmedItemNumber',
    'photoSetReuseConfirmed',
    'labelItemNumberConfirmed',
    'unfinishedQuestion',
  ]) {
    delete next[key]
  }
  return next
}

function pieceModelContext(
  session: TradeBoardIntakeSessionState,
): PieceModelContext {
  const fromMessageId = session.metadata.openedOnMessageId
  const unfinished = session.metadata.unfinishedQuestion
  return {
    fromMessageId: typeof fromMessageId === 'string' ? fromMessageId : null,
    carryNotes: pieceNoteList(session.metadata.priorPieceNotes),
    unfinishedQuestion: typeof unfinished === 'string' ? unfinished : null,
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

type InspectedWorkflowPhoto = {
  visualRole: TradeBoardPhotoVisualRole
  quality: 'usable' | 'warning' | 'blocked' | 'unknown'
  qualityScore?: number
  qualityIssues: string[]
  contentSha256?: string
  visualRoleSource?: string
  labelQuality?: 'usable' | 'warning' | 'blocked' | 'unknown'
  jewelryQuality?: 'usable' | 'warning' | 'blocked' | 'unknown'
}

function scoreInspectedWorkflowPhoto(
  declaredRole: TradeBoardPhotoDeclaredRole,
  inspected: InspectedWorkflowPhoto,
): InspectedWorkflowPhoto {
  const quality =
    declaredRole === 'label_details'
      ? (inspected.labelQuality ?? inspected.quality)
      : (inspected.jewelryQuality ?? inspected.quality)
  return { ...inspected, quality }
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
      if (
        photo.visualRole === 'label_or_packaging' &&
        !photo.notes.includes(REP_CONFIRMED_MAIN_PHOTO_NOTE)
      ) {
        const confirmed = {
          ...photo,
          notes: [...photo.notes, REP_CONFIRMED_MAIN_PHOTO_NOTE],
        }
        args.photos[index] = confirmed
        return confirmed
      }
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
        REP_CONFIRMED_MAIN_PHOTO_NOTE,
      ],
    }
    args.photos[index] = confirmed
    return confirmed
  }

  return null
}

function flaggedPhotoSetSha(
  messages: UIMessage[],
  photos: TradeBoardIntakeSessionState['photos'],
): string | null {
  const latestUserIndex = findLatestUserMessageIndex(messages)
  const previousAssistant =
    latestUserIndex === -1
      ? undefined
      : messages
          .slice(0, latestUserIndex)
          .reverse()
          .find((message) => message.role === 'assistant')
  for (const part of previousAssistant?.parts ?? []) {
    const output = (
      part as {
        output?: {
          code?: unknown
          contentSha256?: unknown
          photoId?: unknown
        }
      }
    ).output
    if (output?.code !== 'PHOTO_REUSED_ON_OTHER_ITEM') continue
    if (typeof output.contentSha256 === 'string' && output.contentSha256.trim()) {
      return output.contentSha256.trim()
    }
    if (typeof output.photoId === 'string' && output.photoId.trim()) {
      const flagged = photos.find((photo) => photo.id === output.photoId)
      const sha =
        flagged?.contentSha256?.trim() || hashDataImageUrl(flagged?.imageUrl)
      return sha || null
    }
    return null
  }
  return null
}

function latestTurnConfirmsPhotoSet(messages: UIMessage[]): boolean {
  const latestUserIndex = findLatestUserMessageIndex(messages)
  if (latestUserIndex === -1) return false
  if (hasImagePart(messages[latestUserIndex])) return false
  if (!isPositiveConfirmation(getMessageText(messages[latestUserIndex]))) return false
  const previousAssistant = messages
    .slice(0, latestUserIndex)
    .reverse()
    .find((message) => message.role === 'assistant')
  if (/belongs with that set/i.test(getMessageText(previousAssistant))) return true
  return (previousAssistant?.parts ?? []).some((part) => {
    const output = (
      part as { output?: { code?: string; message?: string } }
    ).output
    if (output?.code === 'PHOTO_REUSED_ON_OTHER_ITEM') return true
    return typeof output?.message === 'string' && /belongs with that set/i.test(output.message)
  })
}

function normalizeSavedItemNumber(value: unknown): string {
  return typeof value === 'string' ? value.trim().toUpperCase() : ''
}

function itemNumberInSetAsk(text: string): string {
  const match = text.match(/\bif\s+([A-Za-z]{1,4}-?\d{3,})\s+belongs with that set\b/i)
  return match?.[1] ? match[1].trim().toUpperCase() : ''
}

function itemNumberInMainPhotoAsk(text: string): string {
  const match = text.match(
    /\bmain photo I will save for\s+([A-Za-z]{1,4}-?\d{3,})\b/i,
  )
  return match?.[1] ? match[1].trim().toUpperCase() : ''
}

function previousAssistantBlobs(messages: UIMessage[]): string[] {
  const latestUserIndex = findLatestUserMessageIndex(messages)
  if (latestUserIndex === -1) return []
  const previousAssistant = messages
    .slice(0, latestUserIndex)
    .reverse()
    .find((message) => message.role === 'assistant')
  const blobs = [getMessageText(previousAssistant)]
  for (const part of previousAssistant?.parts ?? []) {
    const message = (part as { output?: { message?: unknown } }).output?.message
    if (typeof message === 'string' && message.trim()) blobs.push(message)
  }
  return blobs
}

function mainPhotoConfirmedItemNumber(
  messages: UIMessage[],
  knownItemNumber: unknown,
): string {
  for (const blob of previousAssistantBlobs(messages)) {
    const named = itemNumberInMainPhotoAsk(blob)
    if (named) return named
  }
  return normalizeSavedItemNumber(knownItemNumber)
}

function setAskItemNumber(messages: UIMessage[]): string {
  for (const blob of previousAssistantBlobs(messages)) {
    const named = itemNumberInSetAsk(blob)
    if (named) return named
  }
  return ''
}

function previousAssistantMessage(
  messages: UIMessage[],
): UIMessage | undefined {
  const latestUserIndex = findLatestUserMessageIndex(messages)
  if (latestUserIndex === -1) return undefined
  return messages
    .slice(0, latestUserIndex)
    .reverse()
    .find((message) => message.role === 'assistant')
}

function isMainPhotoPreviewOutput(output: {
  needsAction?: unknown
  code?: unknown
  previewPhotoId?: unknown
  previewImageUrl?: unknown
} | null | undefined): boolean {
  if (!output) return false
  if (output.needsAction === 'confirm_main_photo') return true
  if (output.code !== 'PHOTO_REUSED_ON_OTHER_ITEM') return false
  const previewPhotoId =
    typeof output.previewPhotoId === 'string' ? output.previewPhotoId.trim() : ''
  const previewImageUrl =
    typeof output.previewImageUrl === 'string' ? output.previewImageUrl.trim() : ''
  return Boolean(previewPhotoId || previewImageUrl)
}

function lastShownMainPhotoPreview(messages: UIMessage[]): {
  shown: boolean
  id: string | null
} {
  const previousAssistant = previousAssistantMessage(messages)
  let shown = false
  let id: string | null = null
  for (const part of previousAssistant?.parts ?? []) {
    const output = (
      part as {
        output?: {
          needsAction?: unknown
          code?: unknown
          previewPhotoId?: unknown
          previewImageUrl?: unknown
        }
      }
    ).output
    if (!isMainPhotoPreviewOutput(output)) continue
    shown = true
    const previewPhotoId =
      typeof output?.previewPhotoId === 'string' ? output.previewPhotoId.trim() : ''
    id = previewPhotoId || null
  }
  return { shown, id }
}

function photoMatchesPreviewId(
  photo: TradeBoardIntakeSessionState['photos'][number],
  previewId: string,
): boolean {
  if (photo.id === previewId) return true
  return mainPhotoConfirmationIdentity(photo) === previewId
}

function recordTurnedDownMainPhoto(
  metadata: Record<string, unknown>,
  turnedDownId: string | null,
): Record<string, unknown> {
  if (!turnedDownId) return metadata
  const existing = Array.isArray(metadata.turnedDownMainPhotoIds)
    ? metadata.turnedDownMainPhotoIds.filter(
        (value): value is string =>
          typeof value === 'string' && value.trim().length > 0,
      )
    : []
  if (existing.includes(turnedDownId)) return metadata
  return {
    ...metadata,
    turnedDownMainPhotoIds: [...existing, turnedDownId],
  }
}

function currentMainPhotoIdentity(
  photos: TradeBoardIntakeSessionState['photos'],
): string | null {
  for (let index = photos.length - 1; index >= 0; index -= 1) {
    const photo = photos[index]
    if (!photo?.imageUrl?.trim()) continue
    if (photo.declaredRole === 'label_details') continue
    if (photo.declaredRole !== 'jewelry_front') continue
    const identity = mainPhotoConfirmationIdentity(photo)
    if (identity) return identity
  }
  return null
}

function previousAssistantAskedForMainPhoto(messages: UIMessage[]): boolean {
  const previousAssistant = previousAssistantMessage(messages)
  if (/main photo I will save/i.test(getMessageText(previousAssistant))) return true
  return (previousAssistant?.parts ?? []).some((part) => {
    const output = (part as { output?: { needsAction?: string } }).output
    return output?.needsAction === 'confirm_main_photo'
  })
}

function latestTurnConfirmsMainPhoto(messages: UIMessage[]): boolean {
  const latestUserIndex = findLatestUserMessageIndex(messages)
  if (latestUserIndex === -1) return false
  if (!isPositiveConfirmation(getMessageText(messages[latestUserIndex]))) return false
  return previousAssistantAskedForMainPhoto(messages)
}

function latestTurnTurnsDownMainPhoto(messages: UIMessage[]): boolean {
  const latestUserIndex = findLatestUserMessageIndex(messages)
  if (latestUserIndex === -1) return false
  if (!isNegativePhotoConfirmation(getMessageText(messages[latestUserIndex]))) {
    return false
  }
  return previousAssistantAskedForMainPhoto(messages)
}

const POSITIVE_CONFIRMATION_EMOJI =
  /(?:\u{1F44D}|\u{1F44C}|\u{1F64C}|\u{1F60A}|\u{1F642}|\u{1F600}|\u{1F601}|\u{2705}|\u{2714})(?:\u{1F3FB}|\u{1F3FC}|\u{1F3FD}|\u{1F3FE}|\u{1F3FF})?\u{FE0F}?/gu

const CONFIRMATION_FILLER = /\b(?:no\s+problem|not\s+bad|nothing\s+wrong)\b/gi

const AFFIRMATIVE_PHRASE =
  /yes please|yes thank you|yes that(?:'s| is) it|thats right|that(?:'s| is) the one|sounds good|go ahead|all good|yea|yes|yep|yeah|yup|correct|that(?:'s| is) right|that(?:'s| is) correct|looks? good|perfect|confirmed|ok|okay|sure|use (?:it|this|that)(?: (?:one|photo|shot|image))?|(?:this|that) one/i

const ONLY_AFFIRMATIVES = new RegExp(
  `^(?:${AFFIRMATIVE_PHRASE.source})(?:\\s+(?:${AFFIRMATIVE_PHRASE.source}))*$`,
  'i',
)

function normalizeConfirmationText(text: string): string {
  return text
    .replace(/[\u2018\u2019\u2032\u02BC`]/g, "'")
    .replace(/[\u201C\u201D\u2033]/g, '"')
}

export function isPositiveConfirmation(text: string): boolean {
  const normalized = normalizeConfirmationText(text).trim()
  if (!normalized || normalized.includes('?')) return false
  const withoutEmoji = normalized.replace(POSITIVE_CONFIRMATION_EMOJI, ' ')
  const hadPositiveEmoji = withoutEmoji !== normalized
  const remainder = withoutEmoji
    .replace(CONFIRMATION_FILLER, ' ')
    .replace(/[!.,…"“”]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!remainder) return hadPositiveEmoji
  return ONLY_AFFIRMATIVES.test(remainder)
}

const NEGATIVE_PHOTO_CONFIRMATION =
  /^(?:no|nope|nah|not that(?: one)?|not this(?: one)?|wrong photo|wrong piece|that(?:'s| is) not it|don'?t use (?:that|this)|do not use (?:that|this))$/i

export function isNegativePhotoConfirmation(text: string): boolean {
  const normalized = normalizeConfirmationText(text).trim()
  if (!normalized || normalized.includes('?')) return false
  const remainder = normalized
    .replace(CONFIRMATION_FILLER, ' ')
    .replace(/[!.,…"“”]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!remainder) return false
  return NEGATIVE_PHOTO_CONFIRMATION.test(remainder)
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
): Promise<InspectedWorkflowPhoto> {
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
    const labelQuality = labelUnreadable
      ? ('blocked' as const)
      : analysis.blurRisk >= 0.45 || analysis.detailRisk >= 0.58
        ? ('warning' as const)
        : ('usable' as const)
    const jewelryQuality = preflight.passed
      ? ('usable' as const)
      : reviewableJewelryFront
        ? ('warning' as const)
        : ('blocked' as const)
    const quality =
      declaredRole === 'label_details' ? labelQuality : jewelryQuality
    return {
      visualRole: semantic.role,
      quality,
      labelQuality,
      jewelryQuality,
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
      labelQuality: 'unknown',
      jewelryQuality: 'unknown',
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
