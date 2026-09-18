import type {
  TradeBoardPhotoDeclaredRole,
  TradeBoardPhotoVisualRole,
} from './trade-board-intake-types'

export function isBarredFromCustomerFacingMedia(photo: {
  declaredRole?: string
  visualRole?: string
  quality?: string
} | null | undefined): boolean {
  if (!photo) return true
  if (photo.declaredRole === 'label_details' || photo.declaredRole === 'other') {
    return true
  }
  if (photo.visualRole === 'label_or_packaging') return true
  if (photo.quality === 'blocked') return true
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
    if (visualRole === 'label_or_packaging') roles[index] = 'label_details'
    else if (visualRole === 'jewelry') roles[index] = 'jewelry_front'
  }

  if (count === 1 && !roles[0]) {
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
