function normalizeIdentity(value?: string | null) {
  return value?.trim().toLowerCase() ?? ''
}

export function joinLeadIdentityMatches(
  left: { name?: string | null; business?: string | null },
  right: { name?: string | null; business?: string | null },
) {
  const leftName = normalizeIdentity(left.name)
  const rightName = normalizeIdentity(right.name)
  if (!leftName || leftName !== rightName) return false

  return normalizeIdentity(left.business) === normalizeIdentity(right.business)
}

export function findMatchingLeadRosterMember<
  T extends { displayName?: string | null; businessName?: string | null },
>(
  members: T[],
  lead: { name?: string | null; business?: string | null },
) {
  return (
    members.find((member) =>
      joinLeadIdentityMatches(
        { name: member.displayName, business: member.businessName },
        lead,
      ),
    ) ?? null
  )
}

export function resolveJoinCardImageUrl(
  cardImageUrl?: string | null,
  leadImageUrl?: string | null,
  isLead = false,
) {
  const cardImage = cardImageUrl?.trim()
  if (cardImage) return cardImage
  if (!isLead) return undefined

  const leadImage = leadImageUrl?.trim()
  return leadImage || undefined
}

export function resolveLeadCardPhotoUrl(
  profilePhotoUrl?: string | null,
  matchingMemberPhotoUrl?: string | null,
) {
  return (
    matchingMemberPhotoUrl?.trim() || profilePhotoUrl?.trim() || ''
  )
}
