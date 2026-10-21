// Base class for any Nic-Nac tool error that should be EXPLAINED to the user
// in plain language rather than escalated as an incident. Tier 2 of the
// three-tier error handling pipeline (see lib/nic-nac/tools/wrappers/with-error-handling.ts).
//
// Each domain (trade-board, calendar, SMS, billing, ...) translates its own
// service-layer errors into a NicNacToolError inside the tool's execute
// function. The wrapper only needs to know about this one base type.

export type NicNacToolErrorDetails = {
  contentSha256?: string
  photoId?: string
  listingId?: string
  itemNumber?: string
  previewImageUrl?: string
  previewPhotoId?: string
  pieceKey?: string
}

export class NicNacToolError extends Error {
  readonly code: string
  readonly userMessage: string
  readonly details?: NicNacToolErrorDetails

  constructor(args: {
    code: string
    userMessage: string
    cause?: unknown
    details?: NicNacToolErrorDetails
  }) {
    super(args.userMessage)
    this.name = 'NicNacToolError'
    this.code = args.code
    this.userMessage = args.userMessage
    if (args.details) this.details = args.details
    if (args.cause !== undefined) {
      ;(this as { cause?: unknown }).cause = args.cause
    }
  }
}
