// Service-layer errors. ServiceError is the canonical class for new code.
// TradeBoardError is preserved as a subclass so the existing tool handlers
// (lib/thumper/tools/list-my-trade-board.ts, lib/thumper/tools/remove-listing.ts)
// keep working without code changes — they do `instanceof TradeBoardError` and
// read `err.code`. Both checks survive subclassing.
//
// Tool handlers translate ServiceError → ThumperToolError at the route boundary
// (see lib/thumper/errors.ts). The service layer never references
// ThumperToolError; that's the rule that lets the same service back both the
// chat (Thumper) and HTTP (dashboard) entry points.

export class ServiceError extends Error {
  readonly code: string
  readonly userMessage: string
  readonly statusCode: number

  constructor(args: {
    code: string
    message: string
    userMessage?: string
    statusCode?: number
    cause?: unknown
  }) {
    super(args.message)
    this.name = 'ServiceError'
    this.code = args.code
    this.userMessage = args.userMessage ?? args.message
    this.statusCode = args.statusCode ?? 400
    if (args.cause !== undefined) {
      ;(this as { cause?: unknown }).cause = args.cause
    }
  }
}

// Backward-compat for existing trade-board tool handlers. The legacy two-arg
// constructor signature (code, message) MUST be preserved — see the live
// throw sites in `removeListing` below and the original implementation history.
// Empty subclass keeps `instanceof TradeBoardError` working for code that
// already imports the name.
export class TradeBoardError extends ServiceError {
  constructor(
    code: 'LISTING_NOT_FOUND' | 'UNAUTHORIZED' | 'INVALID_INPUT' | string,
    message: string,
    userMessage?: string,
  ) {
    super({ code, message, userMessage })
    this.name = 'TradeBoardError'
  }
}

// ============================================================================
// Predefined error factories. Stable codes for the cross-domain catalog.
// Tool handlers and dashboard routes can pattern-match on these codes.
// ============================================================================

export const errors = {
  MISSING_ITEM_INPUT: () =>
    new ServiceError({
      code: 'MISSING_ITEM_INPUT',
      message: 'itemNumber or listingId required',
      userMessage: "I need either an item number or listing ID to do that.",
    }),
  MISSING_PIECE_PHOTO: () =>
    new ServiceError({
      code: 'MISSING_PIECE_PHOTO',
      message: 'piece photo URL required when no canonical photo exists',
      userMessage: "I need a photo of the piece for that listing.",
    }),
  CLICKWRAP_REQUIRED: () =>
    new ServiceError({
      code: 'CLICKWRAP_REQUIRED',
      message: 'clickwrap acceptance required before listing',
      userMessage: 'You need to accept the trade terms before I can list a piece.',
    }),
  LISTING_NOT_FOUND: (detail?: string) =>
    new ServiceError({
      code: 'LISTING_NOT_FOUND',
      message: detail ? `listing not found: ${detail}` : 'listing not found',
      userMessage: "I couldn't find that listing on your board.",
    }),
  DUPLICATE_LISTING: (itemNumber: string) =>
    new ServiceError({
      code: 'DUPLICATE_LISTING',
      message: `active listing already exists for item ${itemNumber}`,
      userMessage: `You already have ${itemNumber} listed and available.`,
    }),
  REQUEST_NOT_PENDING: () =>
    new ServiceError({
      code: 'REQUEST_NOT_PENDING',
      message: 'trade request is not in pending status',
      userMessage: 'That trade request has already been handled.',
    }),
  REQUEST_ALREADY_EXISTS: () =>
    new ServiceError({
      code: 'REQUEST_ALREADY_EXISTS',
      message: 'a pending request already exists for this listing',
      userMessage: 'That piece already has a pending trade request.',
      statusCode: 409,
    }),
  INVALID_STATUS_TRANSITION: (from: string, to: string) =>
    new ServiceError({
      code: 'INVALID_STATUS_TRANSITION',
      message: `invalid status transition: ${from} → ${to}`,
      userMessage: `I can't move that from "${from}" to "${to}".`,
    }),
  AMBIGUOUS_CUSTOMER: (name: string) =>
    new ServiceError({
      code: 'AMBIGUOUS_CUSTOMER',
      message: `more than one fulfillment matches customer "${name}"`,
      userMessage: `Multiple customers named "${name}" — can you give me a request ID?`,
    }),
  FULFILLMENT_NOT_FOUND: () =>
    new ServiceError({
      code: 'FULFILLMENT_NOT_FOUND',
      message: 'fulfillment row not found',
      userMessage: "I couldn't find that fulfillment.",
    }),
  UNAUTHORIZED: (detail?: string) =>
    new ServiceError({
      code: 'UNAUTHORIZED',
      message: detail ? `unauthorized: ${detail}` : 'unauthorized',
      userMessage: "That isn't on your board, so I can't change it.",
      statusCode: 403,
    }),
  INVALID_INPUT: (detail: string, userMessage?: string) =>
    new ServiceError({
      code: 'INVALID_INPUT',
      message: `invalid input: ${detail}`,
      userMessage: userMessage ?? 'I need a bit more information to do that.',
    }),
  NEEDS_COLLECTION: (designId: string, designName: string) =>
    new ServiceError({
      code: 'NEEDS_COLLECTION',
      message: `design ${designId} has no collection`,
      userMessage: `"${designName}" needs a collection name before I can list it.`,
    }),
  NEEDS_FULL_INFO: (itemNumber: string) =>
    new ServiceError({
      code: 'NEEDS_FULL_INFO',
      message: `no design found for item ${itemNumber}`,
      userMessage: `I don't have ${itemNumber} on file yet — I'll need the design name and a photo.`,
    }),
}
