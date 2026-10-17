/**
 * Public founder availability contract.
 *
 * The public site only needs to know whether founder pricing is still offered.
 * It must never receive the slot count (remaining, taken, claimed), so this
 * shape has no number in it. The internal count stays in
 * `FounderAvailability` for checkout and allocation. No imports, so it is safe
 * to use from client components.
 */
export type PublicFounderAvailabilityStatus = 'available' | 'full' | 'unavailable'

export type PublicFounderAvailability = {
  status: PublicFounderAvailabilityStatus
  checkedAt: string | null
}

export function unavailablePublicFounderAvailability(): PublicFounderAvailability {
  return { status: 'unavailable', checkedAt: null }
}

/**
 * Builds a fresh object with only `status` and `checkedAt`. Never spread the
 * input: anything else on it (like `remaining`) must not reach a response,
 * page prop, or serialized RSC payload.
 */
export function toPublicFounderAvailability(input: unknown): PublicFounderAvailability {
  if (!input || typeof input !== 'object') return unavailablePublicFounderAvailability()
  const data = input as { status?: unknown; checkedAt?: unknown }
  if (data.status !== 'available' && data.status !== 'full') return unavailablePublicFounderAvailability()
  if (data.checkedAt != null && (typeof data.checkedAt !== 'string' || data.checkedAt.length === 0)) {
    return unavailablePublicFounderAvailability()
  }
  return { status: data.status, checkedAt: (data.checkedAt as string | null | undefined) ?? null }
}
