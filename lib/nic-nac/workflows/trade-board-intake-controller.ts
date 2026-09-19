import type { NicNacToolIntent } from '@/lib/nic-nac/tools'
import { mergeTradeBoardKnownFields } from './trade-board-known-fields'
import {
  isAcceptedCustomerFacingWorkflowPhoto,
  stampSoleReadinessJewelryFrontCandidate,
} from './workflow-photo-roles'
import type {
  TradeBoardIntakeNextAction,
  TradeBoardIntakePhase,
  TradeBoardIntakePromptState,
  TradeBoardIntakeSessionState,
} from './trade-board-intake-types'

const WORKFLOW_FIELD_LABELS: Record<string, string> = {
  jewelryFrontPhoto: 'the customer-facing jewelry photo',
  itemNumber: 'the item number',
  designName: 'the design name',
  collectionName: 'the collection name',
  collectionYear: 'the collection year',
  jewelryType: 'the jewelry type',
  collectionFamily: 'the collection type',
  ringSize: 'the ring size',
  rarityClassification: 'whether this is standard, diamond, or unicorn',
  labelDetailsPhoto: 'a readable item-info label or the item number',
  labelPhotoUnreadable: 'a readable item-info label or the item number',
  jewelryPhotoUnusable: 'a clearer customer-facing jewelry photo',
}

export function formatWorkflowNotReadyMessage(readiness: {
  missing: string[]
  blockers: string[]
}): string {
  const jewelryOnly =
    readiness.missing.includes('jewelryFrontPhoto') &&
    readiness.missing.every((field) => field === 'jewelryFrontPhoto') &&
    readiness.blockers.length === 0
  if (jewelryOnly) {
    return 'I still need the customer-facing jewelry photo before I can save this listing.'
  }

  const named = [
    ...readiness.missing.map(labelWorkflowField),
    ...readiness.blockers.map(labelWorkflowField),
  ].filter((label, index, all) => label && all.indexOf(label) === index)

  if (named.length === 0) {
    return 'I still need one more detail before I can save this listing: the customer-facing jewelry photo or a readable item number.'
  }

  return `I still need these details before I can save this listing: ${named.join(', ')}.`
}

function labelWorkflowField(field: string): string {
  return WORKFLOW_FIELD_LABELS[field] ?? field
}

export function createEmptyTradeBoardIntakeState(args: {
  id: string
  repId: string
  conversationId: string
}): TradeBoardIntakeSessionState {
  const state: TradeBoardIntakeSessionState = {
    id: args.id,
    repId: args.repId,
    conversationId: args.conversationId,
    workflowType: 'trade_board_add_listing',
    catalogMode: 'item_number',
    status: 'active',
    phase: 'started',
    known: {},
    missing: [],
    blockers: [],
    warnings: [],
    metadata: {},
    photos: [],
  }
  const readiness = computeTradeBoardIntakeReadiness(state)
  return {
    ...state,
    missing: readiness.missing,
    blockers: readiness.blockers,
  }
}

export function computeTradeBoardIntakeReadiness(
  state: TradeBoardIntakeSessionState,
): {
  ready: boolean
  missing: string[]
  blockers: string[]
  nextAction: TradeBoardIntakeNextAction
} {
  const missing: string[] = []
  const blockers: string[] = []
  const known = state.known
  const catalogMode = state.catalogMode ?? 'item_number'
  const labelDetailsPhoto = state.photos.find(
    (photo) => photo.declaredRole === 'label_details',
  )
  const jewelryFrontPhoto = findPublishableJewelryFront(state.photos)
  const blockedLabel = state.photos.find(
    (photo) =>
      photo.declaredRole === 'label_details' && photo.quality === 'blocked',
  )
  const blockedJewelry = state.photos.find(
    (photo) =>
      photo.declaredRole === 'jewelry_front' &&
      photo.quality === 'blocked',
  )

  if (catalogMode === 'non_item_number') {
    if (!known.jewelryType) missing.push('jewelryType')
    if (!known.collectionFamily) missing.push('collectionFamily')
    if (known.jewelryType === 'RG' && !known.ringSize) missing.push('ringSize')
  } else {
    if (!known.itemNumber) missing.push('itemNumber')
    if (!known.designName) missing.push('designName')
    if (!known.collectionName) missing.push('collectionName')
    if (!labelDetailsPhoto && !known.itemNumber) missing.push('labelDetailsPhoto')
  }
  if (!jewelryFrontPhoto) missing.push('jewelryFrontPhoto')
  if (!known.rarityClassification) missing.push('rarityClassification')
  if (
    blockedLabel &&
    !hasListingIdentity({
      catalogMode,
      itemNumber: known.itemNumber,
    })
  ) {
    blockers.push('labelPhotoUnreadable')
  }
  if (blockedJewelry && !jewelryFrontPhoto) {
    blockers.push('jewelryPhotoUnusable')
  }

  const ready = missing.length === 0 && blockers.length === 0
  return {
    ready,
    missing,
    blockers,
    nextAction: chooseNextAction({ ready, missing, blockers }),
  }
}

export function computeTradeBoardAddAttemptReadiness(
  state: TradeBoardIntakeSessionState,
  input: {
    catalogMode?: TradeBoardIntakeSessionState['catalogMode']
    itemNumber?: string
    jewelryType?: TradeBoardIntakeSessionState['known']['jewelryType']
    designName?: string
    collectionFamily?: string
    collectionName?: string
    collectionYear?: number
    ringSize?: string
    rarityClassification?: TradeBoardIntakeSessionState['known']['rarityClassification']
  },
): {
  ready: boolean
  missing: string[]
  blockers: string[]
  nextAction: TradeBoardIntakeNextAction
} {
  const known = mergeTradeBoardKnownFields(state.known, {
    itemNumber: normalizeOptionalText(input.itemNumber)?.toUpperCase(),
    jewelryType: input.jewelryType,
    designName: normalizeOptionalText(input.designName),
    collectionFamily: normalizeOptionalText(input.collectionFamily),
    collectionName: normalizeOptionalText(input.collectionName),
    collectionYear: input.collectionYear,
    ringSize: normalizeOptionalText(input.ringSize),
    rarityClassification: input.rarityClassification,
  })
  const missing: string[] = []
  const blockers: string[] = []
  const catalogMode = input.catalogMode ?? state.catalogMode ?? 'item_number'

  const jewelryFrontPhoto = findPublishableJewelryFront(state.photos)
  const blockedLabel = state.photos.find(
    (photo) =>
      photo.declaredRole === 'label_details' && photo.quality === 'blocked',
  )
  const blockedJewelry = state.photos.find(
    (photo) =>
      photo.declaredRole === 'jewelry_front' &&
      photo.quality === 'blocked',
  )

  if (catalogMode === 'non_item_number') {
    if (!known.jewelryType) missing.push('jewelryType')
    if (!known.collectionFamily) missing.push('collectionFamily')
    if (known.jewelryType === 'RG' && !known.ringSize) missing.push('ringSize')
  } else if (!known.itemNumber) {
    missing.push('itemNumber')
  }
  if (!jewelryFrontPhoto) missing.push('jewelryFrontPhoto')
  if (!known.rarityClassification) missing.push('rarityClassification')
  if (
    blockedLabel &&
    !hasListingIdentity({
      catalogMode,
      itemNumber: known.itemNumber,
    })
  ) {
    blockers.push('labelPhotoUnreadable')
  }
  if (blockedJewelry && !jewelryFrontPhoto) {
    blockers.push('jewelryPhotoUnusable')
  }

  const ready = missing.length === 0 && blockers.length === 0
  return {
    ready,
    missing,
    blockers,
    nextAction: chooseNextAction({ ready, missing, blockers }),
  }
}

export function transitionTradeBoardIntake(
  state: TradeBoardIntakeSessionState,
  event:
    | { type: 'cancel' }
    | { type: 'expire' }
    | { type: 'escalate' }
    | { type: 'authorize_add_listing' }
    | { type: 'mark_completed'; listingIds: string[]; designId?: string },
): TradeBoardIntakeSessionState {
  if (event.type === 'cancel') {
    return { ...state, status: 'cancelled', phase: 'cancelled' }
  }
  if (event.type === 'expire') {
    return { ...state, status: 'expired' }
  }
  if (event.type === 'escalate') {
    return {
      ...state,
      status: 'needs_human_review',
      phase: 'needs_human_review',
    }
  }
  if (event.type === 'authorize_add_listing') {
    const readiness = computeTradeBoardIntakeReadiness(state)
    if (!readiness.ready) {
      return {
        ...state,
        phase: inferPhase({
          ...state,
          missing: readiness.missing,
          blockers: readiness.blockers,
        }),
        missing: readiness.missing,
        blockers: readiness.blockers,
      }
    }
    return { ...state, phase: 'adding', missing: [], blockers: [] }
  }
  return {
    ...state,
    status: 'completed',
    phase: 'completed',
    createdListingIds: event.listingIds,
    createdDesignId: event.designId,
  }
}

export function getTradeBoardIntakeToolsRequired(
  state: TradeBoardIntakeSessionState | null,
): NicNacToolIntent[] {
  if (!state || state.status !== 'active') return []
  return ['trade_board', 'catalog']
}

export function buildTradeBoardIntakePromptState(
  state: TradeBoardIntakeSessionState,
): TradeBoardIntakePromptState {
  const readiness = computeTradeBoardIntakeReadiness(state)
  if (state.status === 'needs_human_review') {
    return {
      workflow: {
        id: state.id,
        type: state.workflowType,
        catalogMode: state.catalogMode ?? 'item_number',
        status: state.status,
        phase: 'needs_human_review',
      },
      known: state.known,
      photos: state.photos.map((photo, index) => ({
        id: photo.id,
        index: index + 1,
        declaredRole: photo.declaredRole,
        visualRole: photo.visualRole,
        roleConfirmed: photo.roleConfirmed,
        quality: photo.quality,
        notes: photo.notes,
      })),
      missing: state.missing,
      blockers: Array.from(
        new Set([...state.blockers, 'add_listing_backend_failure']),
      ),
      nextAction: 'escalate_to_human_review',
      hardRules: [
        'do not call add_listing while this workflow needs human review',
        'do not ask the rep to re-upload already confirmed photos',
        'tell the rep their saved details and confirmed photo are retained',
      ],
    }
  }
  const normalized = {
    ...state,
    missing: readiness.missing,
    blockers: readiness.blockers,
  }
  return {
    workflow: {
      id: state.id,
      type: state.workflowType,
      catalogMode: state.catalogMode ?? 'item_number',
      status: state.status,
      phase: inferPhase(normalized),
    },
    known: state.known,
    photos: state.photos.map((photo, index) => ({
      id: photo.id,
      index: index + 1,
      declaredRole: photo.declaredRole,
      visualRole: photo.visualRole,
      roleConfirmed: photo.roleConfirmed,
      quality: photo.quality,
      notes: photo.notes,
    })),
    missing: readiness.missing,
    blockers: readiness.blockers,
    nextAction: readiness.nextAction,
    hardRules: [
      'label_details photos cannot satisfy jewelry_front',
      'visible jewelry in a label_details photo does not change its declared role',
      'a jewelry or boxed-display photo already in this workflow satisfies jewelry_front',
      'boxed display jewelry photos are acceptable when centered, close, clear, and website-worthy',
      'do not ask for unboxed jewelry, plain background, or no packaging for a usable boxed display photo',
      'if a field is missing, name it; never list missing details as an empty list',
      'if save fails, tell the rep the real error — do not say you have everything but cannot upload',
      'non-item-number pieces must use controlled jewelry type, collection, and size when applicable',
      'do not create or invent an item number for a non-item-number piece',
      'dance-floor-only vs catalog is Nic-Nac discretion, not a forced path',
      'catalog and Finder keep jewelry-facing quality; if the rep says the piece is Bomb Party, a good-quality-looking image is enough — do not invent extra proof hurdles',
    ],
  }
}

function inferPhase(state: TradeBoardIntakeSessionState): TradeBoardIntakePhase {
  if (state.status !== 'active') {
    if (state.status === 'completed') return 'completed'
    if (state.status === 'cancelled') return 'cancelled'
    if (state.status === 'needs_human_review') return 'needs_human_review'
    return state.phase
  }
  if (state.phase === 'adding') return 'adding'
  if (state.blockers.length > 0) return 'photo_capture'
  if (
    state.missing.includes('itemNumber') ||
    state.missing.includes('jewelryType') ||
    state.missing.includes('collectionFamily') ||
    state.missing.includes('ringSize') ||
    state.missing.includes('collectionName') ||
    state.missing.includes('designName')
    || state.missing.includes('rarityClassification')
  ) {
    return 'details_capture'
  }
  if (state.missing.includes('jewelryFrontPhoto')) return 'photo_capture'
  if (state.known.itemNumber || state.catalogMode === 'non_item_number') {
    return 'ready_to_add'
  }
  return 'started'
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}

function findPublishableJewelryFront(
  photos: TradeBoardIntakeSessionState['photos'],
) {
  return stampSoleReadinessJewelryFrontCandidate(photos).find(
    isAcceptedCustomerFacingWorkflowPhoto,
  )
}

function hasListingIdentity(args: {
  catalogMode: TradeBoardIntakeSessionState['catalogMode']
  itemNumber?: string
}): boolean {
  return args.catalogMode === 'non_item_number' || Boolean(args.itemNumber)
}

function chooseNextAction(args: {
  ready: boolean
  missing: string[]
  blockers: string[]
}): TradeBoardIntakeNextAction {
  if (args.blockers.includes('labelPhotoUnreadable')) {
    return 'ask_for_label_details_photo'
  }
  if (args.blockers.includes('jewelryPhotoUnusable')) {
    return 'ask_for_jewelry_front_photo'
  }
  if (args.ready) return 'call_add_listing'
  if (args.missing.includes('rarityClassification')) {
    return 'ask_for_rarity_classification'
  }
  if (args.missing.includes('itemNumber')) return 'ask_for_item_number'
  if (
    args.missing.includes('jewelryType') ||
    args.missing.includes('collectionFamily') ||
    args.missing.includes('ringSize')
  ) {
    return 'ask_for_collection_type_and_size'
  }
  if (args.missing.includes('collectionName')) return 'ask_for_collection'
  if (args.missing.includes('labelDetailsPhoto')) {
    return 'ask_for_label_details_photo'
  }
  if (args.missing.includes('jewelryFrontPhoto')) {
    return 'ask_for_jewelry_front_photo'
  }
  return 'confirm_extracted_details'
}
