// Service-layer errors. ServiceError is the canonical class for new code.
// TradeBoardError is preserved as a subclass so the existing tool handlers
// (lib/nic-nac/tools/list-my-trade-board.ts, lib/nic-nac/tools/remove-listing.ts)
// keep working without code changes - they do `instanceof TradeBoardError` and
// read `err.code`. Both checks survive subclassing.
//
// Tool handlers translate ServiceError to the assistant tool error at the route boundary
// (see lib/nic-nac/errors.ts). The service layer never references
// tool error class; that's the rule that lets the same service back both the
// chat assistant and HTTP dashboard entry points.

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
// constructor signature (code, message) MUST be preserved - see the live
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
      userMessage: 'I need either an item number or listing ID to do that.',
    }),
  MISSING_PIECE_PHOTO: () =>
    new ServiceError({
      code: 'MISSING_PIECE_PHOTO',
      message: 'piece photo URL required when no canonical photo exists',
      userMessage: 'I need a photo of the piece for that listing.',
    }),
  LISTING_PHOTO_PREFLIGHT_FAILED: (coachingMessages: string[]) =>
    new ServiceError({
      code: 'LISTING_PHOTO_PREFLIGHT_FAILED',
      message: `listing photo preflight failed: ${coachingMessages.join(' ')}`,
      userMessage: `That listing photo needs one more try before I can save it. ${coachingMessages.join(' ')}`.trim(),
      statusCode: 422,
    }),
  CLICKWRAP_REQUIRED: (context: 'listing' | 'request' = 'listing') =>
    new ServiceError({
      code: 'CLICKWRAP_REQUIRED',
      message:
        context === 'request'
          ? 'clickwrap acceptance required before submitting request'
          : 'clickwrap acceptance required before listing',
      userMessage:
        context === 'request'
          ? 'That swap request could not be submitted yet.'
          : 'That listing could not be added yet.',
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
  AMBIGUOUS_LISTING: (itemNumber: string) =>
    new ServiceError({
      code: 'AMBIGUOUS_LISTING',
      message: `multiple active listings match item ${itemNumber}`,
      userMessage:
        'I found more than one active physical piece for that item. Pick the exact listing before removing it.',
      statusCode: 409,
    }),
  REQUEST_NOT_PENDING: () =>
    new ServiceError({
      code: 'REQUEST_NOT_PENDING',
      message: 'trade request is not in pending status',
      userMessage: 'That swap request has already been handled.',
    }),
  REQUEST_ALREADY_EXISTS: () =>
    new ServiceError({
      code: 'REQUEST_ALREADY_EXISTS',
      message: 'a pending request already exists for this listing',
      userMessage: 'That piece already has a pending swap request.',
      statusCode: 409,
    }),
  INVALID_STATUS_TRANSITION: (from: string, to: string) =>
    new ServiceError({
      code: 'INVALID_STATUS_TRANSITION',
      message: `invalid status transition: ${from} -> ${to}`,
      userMessage: `I can't move that from "${from}" to "${to}".`,
    }),
  LISTING_RECOVERY_EXPIRED: (days: 7 | 30) =>
    new ServiceError({
      code: 'LISTING_RECOVERY_EXPIRED',
      message: `removed listing is outside the ${days}-day recovery window`,
      userMessage:
        days === 7
          ? "That listing is outside the 7-day recovery window, so I can't restore it."
          : "That listing is outside the 30-day recovery window, so I can't restore it.",
      statusCode: 409,
    }),
  AMBIGUOUS_CUSTOMER: (name: string) =>
    new ServiceError({
      code: 'AMBIGUOUS_CUSTOMER',
      message: `more than one fulfillment matches customer "${name}"`,
      userMessage: `Multiple customers named "${name}" - can you give me a request ID?`,
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
      userMessage: `I don't have ${itemNumber} on file yet - I'll need the design name and a photo.`,
    }),
  NEEDS_MATERIAL_VARIANT: (itemNumber: string) =>
    new ServiceError({
      code: 'NEEDS_MATERIAL_VARIANT',
      message: `multiple material variants found for item ${itemNumber}`,
      userMessage: `I found more than one plating/material for ${itemNumber}. Which plating is this one?`,
    }),
  EVENT_NOT_FOUND: () =>
    new ServiceError({
      code: 'EVENT_NOT_FOUND',
      message: 'calendar event not found or not owned by rep',
      userMessage: "I couldn't find that show on your schedule.",
      statusCode: 404,
    }),
  EVENT_NOT_EDITABLE: () =>
    new ServiceError({
      code: 'EVENT_NOT_EDITABLE',
      message: 'event is not in scheduled status and cannot be modified',
      userMessage:
        'That show has already started, finished, or been cancelled - I can only edit upcoming scheduled shows.',
      statusCode: 409,
    }),
  EVENT_NOT_CANCELLABLE: () =>
    new ServiceError({
      code: 'EVENT_NOT_CANCELLABLE',
      message: 'event is already completed or cancelled',
      userMessage: 'That show is already done or cancelled.',
      statusCode: 409,
    }),
  EVENT_NOT_STARTABLE: () =>
    new ServiceError({
      code: 'EVENT_NOT_STARTABLE',
      message: 'event is not scheduled and cannot be started',
      userMessage: 'I can only start a show that is still scheduled.',
      statusCode: 409,
    }),
  EVENT_NOT_ENDABLE: () =>
    new ServiceError({
      code: 'EVENT_NOT_ENDABLE',
      message: 'event is not live and cannot be completed',
      userMessage: 'I can only end a show that is currently live.',
      statusCode: 409,
    }),
  EVENT_TIME_PAST: () =>
    new ServiceError({
      code: 'EVENT_TIME_PAST',
      message: 'event time must be in the future',
      userMessage: 'That time is in the past - when do you actually want to schedule it?',
      statusCode: 400,
    }),
  MISSING_PLATFORM: () =>
    new ServiceError({
      code: 'MISSING_PLATFORM',
      message: 'platform is required for a show',
      userMessage:
        'Where are you streaming? I need the platform - Facebook Live, TikTok, Instagram, etc.',
      statusCode: 400,
    }),
  MISSING_EVENT_TIME: () =>
    new ServiceError({
      code: 'MISSING_EVENT_TIME',
      message: 'event time is required for a show',
      userMessage: 'When is the show? I need a date and time.',
      statusCode: 400,
    }),
  TOO_MANY_DISCOUNT_CODES: () =>
    new ServiceError({
      code: 'TOO_MANY_DISCOUNT_CODES',
      message: 'maximum 10 discount codes per show',
      userMessage:
        "That's a lot of codes! I can handle up to 10 per show - which ones are the most important?",
      statusCode: 400,
    }),
  EMPTY_DISCOUNT_CODE: () =>
    new ServiceError({
      code: 'EMPTY_DISCOUNT_CODE',
      message: 'discount code text cannot be empty',
      userMessage: "One of those codes is blank - what should it say?",
      statusCode: 400,
    }),
  NOT_A_SERIES: () =>
    new ServiceError({
      code: 'NOT_A_SERIES',
      message: 'event is not part of a recurring series',
      userMessage:
        "That show isn't part of a recurring series, so I can only update it individually.",
      statusCode: 400,
    }),
  SERIES_TIME_UPDATE_UNSUPPORTED: () =>
    new ServiceError({
      code: 'SERIES_TIME_UPDATE_UNSUPPORTED',
      message: 'event time cannot be updated across a recurring series patch',
      userMessage:
        'Title, platform, discount codes, and collections can be applied across a series, but changing the time for every future show needs a separate schedule update.',
      statusCode: 400,
    }),
  INVALID_PHONE_NUMBER: () =>
    new ServiceError({
      code: 'INVALID_PHONE_NUMBER',
      message: 'recipient phone must be in E.164 format',
      userMessage:
        'I need the phone number in full international format, like +15551234567.',
      statusCode: 400,
    }),
  CONTENT_SCREENING_BLOCKED: (matchedPhrases: string[]) =>
    new ServiceError({
      code: 'CONTENT_SCREENING_BLOCKED',
      message: `content screening blocked the message: ${matchedPhrases.join(', ')}`,
      userMessage: `I can't send that as written because it uses prohibited recruiting language: ${matchedPhrases.join(', ')}. Try plain product or show language instead.`,
      statusCode: 422,
    }),
  SMS_NOT_CONFIGURED: () =>
    new ServiceError({
      code: 'SMS_NOT_CONFIGURED',
      message: 'Telnyx SMS is not configured',
      userMessage:
        "SMS delivery isn't configured in this environment yet. If this keeps happening, let Louis know.",
      statusCode: 503,
    }),
  SMS_CAMPAIGN_PENDING: () =>
    new ServiceError({
      code: 'SMS_CAMPAIGN_PENDING',
      message: 'Telnyx 10DLC campaign approval is pending',
      userMessage:
        "SMS sending is blocked until the Telnyx 10DLC campaign is approved. I can help draft the text, but I can't send it yet.",
      statusCode: 503,
    }),
  SMS_NUMBER_NOT_ASSIGNED: () =>
    new ServiceError({
      code: 'SMS_NUMBER_NOT_ASSIGNED',
      message: 'Telnyx SMS number is not assigned to the approved campaign',
      userMessage:
        "SMS sending is blocked until the approved Telnyx campaign has its sending number assigned. I can help draft the text, but I can't send it yet.",
      statusCode: 503,
    }),
  INSUFFICIENT_SMS_WALLET: () =>
    new ServiceError({
      code: 'INSUFFICIENT_SMS_WALLET',
      message: 'sms wallet has insufficient funds',
      userMessage:
        "There's not enough in the SMS wallet to send that text right now.",
      statusCode: 402,
    }),
  SMS_DELIVERY_FAILED: (detail?: string) =>
    new ServiceError({
      code: 'SMS_DELIVERY_FAILED',
      message: detail ? `telnyx send failed: ${detail}` : 'telnyx send failed',
      userMessage: detail
        ? `I couldn't send that text: ${detail}. If this keeps happening, let Louis know.`
        : "I couldn't send that text. If this keeps happening, let Louis know.",
      statusCode: 502,
    }),
  SMS_WEEKLY_LIMIT_REACHED: () =>
    new ServiceError({
      code: 'SMS_WEEKLY_LIMIT_REACHED',
      message: 'manual SMS weekly limit reached',
      userMessage: "You've hit your weekly text limit.",
      statusCode: 429,
    }),
  EMAIL_NOT_CONFIGURED: () =>
    new ServiceError({
      code: 'EMAIL_NOT_CONFIGURED',
      message: 'Resend email is not configured',
      userMessage:
        "Email delivery isn't configured in this environment yet. If this keeps happening, let Louis know.",
      statusCode: 503,
    }),
  EMAIL_WEEKLY_LIMIT_REACHED: () =>
    new ServiceError({
      code: 'EMAIL_WEEKLY_LIMIT_REACHED',
      message: 'manual email weekly limit reached',
      userMessage: "You've hit your weekly email limit.",
      statusCode: 429,
    }),
  EMAIL_DELIVERY_FAILED: (detail?: string) =>
    new ServiceError({
      code: 'EMAIL_DELIVERY_FAILED',
      message: detail ? `resend send failed: ${detail}` : 'resend send failed',
      userMessage: detail
        ? `I couldn't send that email: ${detail}. If this keeps happening, let Louis know.`
        : "I couldn't send that email. If this keeps happening, let Louis know.",
      statusCode: 502,
    }),
  AUTOMATION_KEY_REQUIRED: () =>
    new ServiceError({
      code: 'AUTOMATION_KEY_REQUIRED',
      message: 'automation key required for automated message sends',
      userMessage: 'This automated reminder is missing its send key.',
      statusCode: 400,
    }),
  AUTOMATED_MESSAGE_ALREADY_SENT: (channel: 'sms' | 'email') =>
    new ServiceError({
      code: 'AUTOMATED_MESSAGE_ALREADY_SENT',
      message: `automated ${channel} reminder already sent for this show`,
      userMessage:
        channel === 'sms'
          ? 'That automated text reminder already went out for this show.'
          : 'That automated email reminder already went out for this show.',
      statusCode: 409,
    }),
}

/** Rep editor mappings only; existing customer and approval mappings stay stable. */
export const DANCE_FLOOR_MESSAGES: Record<string, string> = {
  LISTING_NOT_FOUND: "This dancer isn't on your Floor anymore.",
  LISTING_NOT_ACTIVE: "This dancer isn't on your Floor anymore.",
  OPEN_SWAP: 'This dancer is part of an open swap. Finish that swap in Swap history first.',
  QUANTITY_CHANGED: 'This dancer changed while you were editing. Reload and try again.',
  QUANTITY_OUT_OF_RANGE: 'Quantity can be 1 to 99.',
  BELOW_PENDING: 'Deny or approve those requests first.',
  BELOW_FLOOR: 'Deny or approve those requests first.',
  DUPLICATE_ACTIVE_LISTING: 'You already have this dancer on your Floor.',
  RECOVERY_EXPIRED: "That dancer is outside the Put-back window. Add it again to put it on your Floor.",
  LISTING_OFF_FLOOR: 'Put this dancer back on your Floor before reopening this swap.',
  PHOTO_REP_LIMIT: 'You can upload 50 photos per hour. Try again later.',
  PHOTO_DANCER_LIMIT: "You can change this dancer's photo 5 times per day. Try again later.",
  PHOTO_TARGET_INVALID: "That photo upload has expired or already been used. Choose the photo again.",
}
export function danceFloorError(code: string) {
  const known = Object.hasOwn(DANCE_FLOOR_MESSAGES, code)
  return new ServiceError({
    code: known ? code : 'DANCE_FLOOR_UPDATE_FAILED',
    message: known ? code : 'Dance Floor update failed',
    userMessage: DANCE_FLOOR_MESSAGES[code] ?? "Couldn't update that dancer. Try again.",
    statusCode: code === 'LISTING_NOT_FOUND' ? 404 : code.startsWith('PHOTO_') && code.endsWith('_LIMIT') ? 429 : known ? 409 : 500,
  })
}
