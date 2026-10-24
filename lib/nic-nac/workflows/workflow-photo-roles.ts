import type {
  TradeBoardPhotoDeclaredRole,
  TradeBoardPhotoVisualRole,
} from './trade-board-intake-types'

export const REP_CONFIRMED_MAIN_PHOTO_NOTE =
  'confirmed by rep as customer-facing jewelry photo'

export const TURNED_DOWN_MAIN_PHOTO_NOTE = 'turned down for this piece'

export function repExplicitlyConfirmedMainPhoto(photo: {
  notes?: string[]
} | null | undefined): boolean {
  return Boolean(photo?.notes?.includes(REP_CONFIRMED_MAIN_PHOTO_NOTE))
}

export function photoTurnedDownForThisPiece(photo: {
  notes?: string[]
} | null | undefined): boolean {
  return Boolean(photo?.notes?.includes(TURNED_DOWN_MAIN_PHOTO_NOTE))
}

export const REFUSED_MAIN_PHOTO_NOTE = 'refused as main photo'

export const SUBJECT_CUT_OFF_ISSUE = 'subject_cut_off'

export const CUT_OFF_PHOTO_MESSAGE =
  'Part of the piece is cut off; step back so the whole piece is in the photo.'

export function photoRefusedAsMainPhoto(photo: {
  notes?: string[]
} | null | undefined): boolean {
  return Boolean(photo?.notes?.includes(REFUSED_MAIN_PHOTO_NOTE))
}

export function stampRefusedMainPhoto<T extends { notes?: string[]; quality?: string }>(
  photo: T,
): T {
  const notes = [...(photo.notes ?? [])]
  if (!notes.includes(REFUSED_MAIN_PHOTO_NOTE)) notes.push(REFUSED_MAIN_PHOTO_NOTE)
  return { ...photo, notes, quality: 'blocked' }
}

/** The previous reply already refused the photo, whatever words the model chose. */
/** A second jewelry type mentioned beside the real one is not a conflict. */
export function speculativeSecondItemClaim(text: string): boolean {
  return /also shows|as well as (?:a |an )?(?:ring|earrings|necklace|bracelet)/i.test(text)
}

export function previousAssistantRefusedPhoto(text: string): boolean {
  return /too blurry|isn'?t clear enough|not clear enough|won'?t use (?:it|that|this) as the main|send a clearer|send one clear/i.test(
    text,
  )
}

export function isBarredFromCustomerFacingMedia(photo: {
  declaredRole?: string
  visualRole?: string
  quality?: string
  notes?: string[]
} | null | undefined): boolean {
  if (!photo) return true
  if (photoRefusedAsMainPhoto(photo)) return true
  if (photoIsLabel(photo)) return true
  if (photoTurnedDownForThisPiece(photo)) return true
  if (photo.declaredRole === 'label_details' || photo.declaredRole === 'other') {
    return true
  }
  if (
    photo.visualRole === 'label_or_packaging' &&
    !repExplicitlyConfirmedMainPhoto(photo)
  ) {
    return true
  }
  if (mainPhotoPreviewRefusal({ photo })) return true
  return false
}

export function isAcceptedCustomerFacingWorkflowPhoto<
  T extends {
    declaredRole?: string
    visualRole?: string
    quality?: string
    imageUrl?: string
  },
>(
  photo: T | null | undefined,
): photo is T & { declaredRole: 'jewelry_front'; imageUrl: string } {
  return Boolean(
    photo &&
      photo.declaredRole === 'jewelry_front' &&
      photo.imageUrl &&
      !isBarredFromCustomerFacingMedia(photo),
  )
}

/**
 * Workflow-owned jewelry-front identity for the save gate.
 *
 * A clear jewelry shot already in the thread must satisfy the
 * customer-facing jewelry photo requirement. Selection is still by
 * declared / visual role — never by raw URL or attachment order.
 * Labels stay labels. Two uncertain photos still cannot invent a role.
 */
export function workflowPhotoSatisfiesJewelryFront(photo: {
  declaredRole?: string
  visualRole?: string
  quality?: string
  notes?: string[]
} | null | undefined): boolean {
  if (!photo) return false
  if (photoIsLabel(photo)) return false
  if (photoRefusedAsMainPhoto(photo)) return false
  if (photoTurnedDownForThisPiece(photo)) return false
  if (photo.quality === 'blocked') return false
  if (photo.declaredRole === 'label_details' || photo.declaredRole === 'other') {
    return false
  }
  // A front tag does not turn a label into the main photo. The rep has to
  // confirm that shot in words first.
  if (
    photo.visualRole === 'label_or_packaging' &&
    !repExplicitlyConfirmedMainPhoto(photo)
  ) {
    return false
  }
  if (photo.declaredRole === 'jewelry_front') return true
  if (photo.visualRole === 'jewelry') return true
  return false
}

export function findWorkflowJewelryFrontForReadiness<
  T extends {
    declaredRole?: string
    visualRole?: string
    quality?: string
  },
>(photos: T[] | null | undefined): T | undefined {
  const allPhotos = photos ?? []
  const declared = allPhotos.find(
    (photo) =>
      photo.declaredRole === 'jewelry_front' &&
      photo.quality !== 'blocked' &&
      workflowPhotoSatisfiesJewelryFront(photo),
  )
  if (declared) return declared
  const candidates = allPhotos.filter(workflowPhotoSatisfiesJewelryFront)
  if (candidates.length === 1) return candidates[0]
  return undefined
}

const JEWELRY_FRONT_DECLARED_NOTE = 'declared as customer-facing jewelry photo'

type StampableWorkflowPhoto = {
  declaredRole?: string
  visualRole?: string
  quality?: string
  imageUrl?: string
  roleConfirmed?: boolean
  notes?: string[]
}

/**
 * Promote a photo to jewelry_front without erasing a label classification.
 * A visual label stays a label until the rep confirms it in words.
 */
export function stampPhotoAsJewelryFront<T extends StampableWorkflowPhoto>(
  photo: T,
): T {
  const notes = [...(photo.notes ?? [])]
  if (!notes.includes(JEWELRY_FRONT_DECLARED_NOTE)) {
    notes.push(JEWELRY_FRONT_DECLARED_NOTE)
  }
  return {
    ...photo,
    declaredRole: 'jewelry_front',
    visualRole: photo.visualRole,
    roleConfirmed: true,
    notes,
  }
}

function jewelryFrontStampAlreadyApplied<T extends StampableWorkflowPhoto>(
  photo: T,
): boolean {
  return photo.declaredRole === 'jewelry_front' && photo.roleConfirmed === true
}

/**
 * Stamp-on-promote: if readiness would treat exactly one photo as the
 * jewelry-front, persist that identity as declared jewelry_front so publish
 * helpers (isAcceptedCustomerFacingWorkflowPhoto / add_listing) see the same
 * photo. Two uncertain photos still cannot invent a role.
 */
export function stampSoleReadinessJewelryFrontCandidate<
  T extends StampableWorkflowPhoto,
>(photos: T[] | null | undefined): T[] {
  const allPhotos = photos ?? []
  const candidate = findWorkflowJewelryFrontForReadiness(allPhotos)
  if (!candidate || jewelryFrontStampAlreadyApplied(candidate)) {
    return allPhotos
  }
  const stamped = stampPhotoAsJewelryFront(candidate)
  return allPhotos.map((photo) => (photo === candidate ? stamped : photo))
}

export function inferRoleFromText(text: string): TradeBoardPhotoDeclaredRole {
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
    /\bdetails\s+(?:photo|shot|image|source)\b/i.test(text)
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

export function reconcileDeclaredPhotoRoleWithWorkflow(args: {
  inferredRole: TradeBoardPhotoDeclaredRole
  latestUserText: string
  photos: Array<{ declaredRole: TradeBoardPhotoDeclaredRole }>
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

export function inferExplicitAttachmentRole(
  text: string,
  attachmentIndex: number,
  attachmentCount: number,
): TradeBoardPhotoDeclaredRole | null {
  if (!text.trim() || attachmentCount < 1) return null

  const ordinals = ['first', 'second', 'third', 'fourth', 'fifth']
  const ordinal = ordinals[attachmentIndex]
  const number = String(attachmentIndex + 1)
  const numberWithSuffix =
    attachmentIndex === 0
      ? '1st'
      : attachmentIndex === 1
        ? '2nd'
        : attachmentIndex === 2
          ? '3rd'
          : `${attachmentIndex + 1}th`
  const locator = [ordinal, numberWithSuffix, `photo\\s+${number}`, `image\\s+${number}`]
    .filter(Boolean)
    .join('|')

  const labelMatch = new RegExp(
    `\\b(?:${locator})(?:\\s+(?:photo|shot|image|one))?\\s+is\\s+(?:the\\s+)?(?:label|details|tag|item-info|item info)\\b`,
    'i',
  )
  const jewelryMatch = new RegExp(
    `\\b(?:${locator})(?:\\s+(?:photo|shot|image|one))?\\s+is\\s+(?:the\\s+)?(?:jewelry|customer-facing|front|piece|listing)\\b`,
    'i',
  )
  const labelThenJewelry =
    /\b(?:label|details|tag)\b[\s\S]{0,40}\b(?:then|and then|, then)\b[\s\S]{0,40}\b(?:jewelry|front|piece)\b/i.test(
      text,
    )
  const jewelryThenLabel =
    /\b(?:jewelry|front|piece)\b[\s\S]{0,40}\b(?:then|and then|, then)\b[\s\S]{0,40}\b(?:label|details|tag)\b/i.test(
      text,
    )

  if (labelMatch.test(text) && !jewelryMatch.test(text)) return 'label_details'
  if (jewelryMatch.test(text) && !labelMatch.test(text)) return 'jewelry_front'
  if (attachmentCount === 2 && labelThenJewelry) {
    return attachmentIndex === 0 ? 'label_details' : 'jewelry_front'
  }
  if (attachmentCount === 2 && jewelryThenLabel) {
    return attachmentIndex === 0 ? 'jewelry_front' : 'label_details'
  }
  return null
}

export function assignDeclaredPhotoRolesForTurn(args: {
  attachmentCount: number
  inheritedRole: TradeBoardPhotoDeclaredRole
  latestUserText: string
  existingPhotos: Array<{ declaredRole: TradeBoardPhotoDeclaredRole }>
  visualRoles: TradeBoardPhotoVisualRole[]
}): TradeBoardPhotoDeclaredRole[] {
  const count = args.attachmentCount
  if (count < 1) return []

  const roles: Array<TradeBoardPhotoDeclaredRole | null> = Array.from(
    { length: count },
    () => null,
  )

  for (let index = 0; index < count; index += 1) {
    roles[index] = inferExplicitAttachmentRole(
      args.latestUserText,
      index,
      count,
    )
  }

  for (let index = 0; index < count; index += 1) {
    if (roles[index]) continue
    const visualRole = args.visualRoles[index]
    if (visualRole === 'jewelry') {
      roles[index] = 'jewelry_front'
      continue
    }
    if (visualRole !== 'label_or_packaging') continue
    // A single photo after a jewelry ask is the jewelry shot, even when the
    // visual classifier calls a boxed hex-card display "label/packaging".
    // Two-photo turns still pin a true visual label as details-only.
    if (count === 1 && args.inheritedRole === 'jewelry_front') {
      roles[index] = 'jewelry_front'
    } else {
      roles[index] = 'label_details'
    }
  }

  if (count === 1 && !roles[0]) {
    // An uncertain photo stays undecided. It does not become the main photo
    // just because it is the only attachment.
    roles[0] = reconcileDeclaredPhotoRoleWithWorkflow({
      inferredRole: args.inheritedRole,
      latestUserText: args.latestUserText,
      photos: args.existingPhotos,
    })
  }

  const turnHasLabel = roles.some((role) => role === 'label_details')
  const turnHasJewelry = roles.some((role) => role === 'jewelry_front')
  const sessionHasLabel = args.existingPhotos.some(
    (photo) => photo.declaredRole === 'label_details',
  )
  const sessionHasJewelry = args.existingPhotos.some(
    (photo) => photo.declaredRole === 'jewelry_front',
  )
  const unknownIndexes = roles
    .map((role, index) => (role ? -1 : index))
    .filter((index) => index >= 0)

  // Fill the other slot only after an explicit or visual pin. Two uncertain
  // photos must stay unknown — attachment order is not a role.
  if (count >= 2 && unknownIndexes.length === 1) {
    const index = unknownIndexes[0]
    if ((turnHasLabel || sessionHasLabel) && !turnHasJewelry && !sessionHasJewelry) {
      roles[index] = 'jewelry_front'
    } else if (
      (turnHasJewelry || sessionHasJewelry) &&
      !turnHasLabel &&
      !sessionHasLabel
    ) {
      roles[index] = 'label_details'
    }
  }

  return roles.map((role) => role ?? 'unknown')
}

const JEWELRY_TYPE_WORD: Record<string, string> = {
  RG: 'ring',
  ER: 'earrings',
  NK: 'necklace',
  BR: 'bracelet',
  ST: 'set',
}

function pieceJewelryType(
  itemNumber?: string | null,
  jewelryType?: string | null,
): string | null {
  const explicit = jewelryType?.trim().toUpperCase() ?? ''
  if (JEWELRY_TYPE_WORD[explicit]) return explicit
  const prefix = itemNumber?.trim().toUpperCase().match(/^[A-Z]{2}/)?.[0] ?? ''
  return JEWELRY_TYPE_WORD[prefix] ? prefix : null
}

function subjectJewelryType(photo: {
  notes?: string[]
  qualityIssues?: string[]
}): string | null {
  const notes = photo.notes ?? []
  for (const note of notes) {
    const tagged = note.match(/^subject-type:(RG|NK|ER|BR|ST)$/i)
    if (tagged?.[1]) return tagged[1].toUpperCase()
    const printed = note.match(/^printed-item:([A-Z]{2})\d{3,}/i)
    if (printed?.[1] && JEWELRY_TYPE_WORD[printed[1].toUpperCase()]) {
      return printed[1].toUpperCase()
    }
  }
  const blob = [...notes, ...(photo.qualityIssues ?? [])]
    .filter((note) => !speculativeSecondItemClaim(note))
    .join(' ')
  const hits = [
    /\bring\b/i.test(blob) ? 'RG' : '',
    /\bearrings?\b/i.test(blob) ? 'ER' : '',
    /\bnecklace\b/i.test(blob) ? 'NK' : '',
    /\bbracelet\b/i.test(blob) ? 'BR' : '',
  ].filter(Boolean)
  return hits.length === 1 ? hits[0] : null
}

/**
 * No preview until the stored photo passes blur/quality and matches the piece.
 * A missing check does not invent a failure.
 */
export function mainPhotoPreviewRefusal(args: {
  photo?: {
    declaredRole?: string
    visualRole?: string
    quality?: string | null
    qualityScore?: number | null
    qualityIssues?: string[]
    notes?: string[]
  } | null
  itemNumber?: string | null
  jewelryType?: string | null
}): string | null {
  const photo = args.photo
  if (!photo) return null
  if (photoIsLabel(photo)) return 'That photo is the label. Send a photo of the jewelry.'
  const piece = pieceJewelryType(args.itemNumber, args.jewelryType)
  const subject = subjectJewelryType(photo)
  if (piece && subject && piece !== subject) {
    const shown = subject === 'ER' ? 'earrings' : `a ${JEWELRY_TYPE_WORD[subject] ?? 'different piece'}`
    const wanted =
      piece === 'ER' ? 'these earrings' : `this ${JEWELRY_TYPE_WORD[piece] ?? 'piece'}`
    const send = JEWELRY_TYPE_WORD[piece] ?? 'jewelry'
    return `That photo shows ${shown}, so I won't use it as the main photo for ${wanted}. Send a photo of the ${send}.`
  }
  const notes = (photo.notes ?? []).join(' ')
  const blurry =
    (photo.qualityIssues ?? []).includes('blur_risk') || /\bblur(?:ry| risk)\b/i.test(notes)
  const cutOff =
    (photo.qualityIssues ?? []).includes(SUBJECT_CUT_OFF_ISSUE) || /\bcut off\b/i.test(notes)
  const failedQuality =
    photo.quality === 'blocked' ||
    photo.quality === 'warning' ||
    photo.quality === 'unknown' ||
    (typeof photo.qualityScore === 'number' && photo.qualityScore < 70)
  if (blurry) return 'That photo is too blurry. Send a clearer photo of the jewelry.'
  if (cutOff) return CUT_OFF_PHOTO_MESSAGE
  if (photoRefusedAsMainPhoto(photo) || photoTurnedDownForThisPiece(photo)) {
    return 'That photo was refused. Send a new photo of the jewelry.'
  }
  if (failedQuality) {
    return "That photo isn't clear enough. Send a clearer photo of the jewelry."
  }
  return null
}

/** A label, or a photo that prints an item number, is never the main photo. */
export function photoIsLabel(photo: {
  declaredRole?: string
  visualRole?: string
  notes?: string[]
} | null | undefined): boolean {
  if (!photo) return false
  if ((photo.notes ?? []).some((note) => /^printed-item:/i.test(note))) return true
  if (photo.declaredRole === 'label_details') return true
  return (
    photo.visualRole === 'label_or_packaging' && photo.declaredRole !== 'jewelry_front'
  )
}

/**
 * A photo that prints an item number is the label. When another photo came
 * in on the same turn, that other photo is the jewelry shot, even if the
 * visual classifier swapped them. A blocked photo is not promoted.
 */
export function separateLabelFromJewelry<
  T extends {
    declaredRole: string
    visualRole: string
    quality?: string
    notes?: string[]
    roleConfirmed?: boolean
  },
>(photos: T[], start = 0): void {
  const fresh = photos.slice(Math.max(0, start))
  if (fresh.length === 0) return
  const printsItem = (photo: T) =>
    (photo.notes ?? []).some((note) => /^printed-item:/i.test(note))
  const pinLabel = (photo: T) => {
    photo.declaredRole = 'label_details'
    photo.visualRole = 'label_or_packaging'
    photo.roleConfirmed = true
  }
  const pinJewelry = (photo: T) => {
    if (photo.quality === 'blocked') return
    photo.declaredRole = 'jewelry_front'
    photo.visualRole = 'jewelry'
    photo.roleConfirmed = true
  }
  if (fresh.some(printsItem)) {
    for (const photo of fresh) {
      if (printsItem(photo)) pinLabel(photo)
      else pinJewelry(photo)
    }
    return
  }
  if (fresh.length < 2) return
  const labelish = fresh.filter(
    (photo) =>
      photo.visualRole === 'label_or_packaging' || photo.declaredRole === 'label_details',
  )
  if (labelish.length === 0 || labelish.length === fresh.length) return
  for (const photo of fresh) {
    if (
      photo.visualRole === 'label_or_packaging' ||
      photo.declaredRole === 'label_details'
    ) {
      pinLabel(photo)
    } else {
      pinJewelry(photo)
    }
  }
}

function isLabelSidePhoto(photo: {
  declaredRole?: string
  visualRole?: string
  notes?: string[]
}): boolean {
  return photoIsLabel(photo)
}

/**
 * The upload that passed the gate on this turn is the only photo preview
 * and save may use. A refused upload stays ineligible.
 */
export function bindMainPhotoForTurn<
  T extends {
    id?: string
    declaredRole?: string
    visualRole?: string
    quality?: string
    qualityScore?: number | null
    qualityIssues?: string[]
    notes?: string[]
  },
>(args: {
  photos: T[]
  newPhotoStart: number
  itemNumber?: string | null
  jewelryType?: string | null
  metadata: Record<string, unknown>
  previousAssistantText?: string
}): { photos: T[]; metadata: Record<string, unknown> } {
  const photos = args.photos.map((photo) => ({
    ...photo,
    notes: [...(photo.notes ?? [])],
  }))
  const metadata = { ...args.metadata }
  if (previousAssistantRefusedPhoto(args.previousAssistantText ?? '')) {
    for (let index = 0; index < args.newPhotoStart; index += 1) {
      const photo = photos[index]
      if (!photo || isLabelSidePhoto(photo)) continue
      photos[index] = stampRefusedMainPhoto(photo)
    }
  }
  let passedId = ''
  let sawNewJewelry = false
  for (let index = args.newPhotoStart; index < photos.length; index += 1) {
    const photo = photos[index]
    if (!photo || isLabelSidePhoto(photo)) continue
    sawNewJewelry = true
    const refusal = mainPhotoPreviewRefusal({
      photo,
      itemNumber: args.itemNumber,
      jewelryType: args.jewelryType,
    })
    if (refusal) {
      photos[index] = stampRefusedMainPhoto(photo)
      continue
    }
    if (photo.id) passedId = photo.id
  }
  if (sawNewJewelry) {
    if (passedId) metadata.boundMainPhotoId = passedId
    else delete metadata.boundMainPhotoId
  }
  const boundId =
    typeof metadata.boundMainPhotoId === 'string' ? metadata.boundMainPhotoId : ''
  if (
    boundId &&
    photos.some((photo) => photo.id === boundId && photoRefusedAsMainPhoto(photo))
  ) {
    delete metadata.boundMainPhotoId
  }
  return { photos, metadata }
}

export function selectBoundMainPhoto<
  T extends { id?: string; notes?: string[]; imageUrl?: string; quality?: string },
>(
  photos: T[] | null | undefined,
  metadata?: Record<string, unknown> | null,
): T | null {
  const boundId =
    typeof metadata?.boundMainPhotoId === 'string' ? metadata.boundMainPhotoId.trim() : ''
  if (!boundId) return null
  const photo = (photos ?? []).find((item) => item.id === boundId)
  if (
    !photo ||
    photoRefusedAsMainPhoto(photo) ||
    photoIsLabel(photo) ||
    mainPhotoPreviewRefusal({ photo }) !== null ||
    !photo.imageUrl
  ) {
    return null
  }
  return photo
}
