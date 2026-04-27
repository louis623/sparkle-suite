// Base class for any Thumper tool error that should be EXPLAINED to the user
// in plain language rather than escalated as an incident. Tier 2 of the
// three-tier error handling pipeline (see lib/thumper/tools/wrappers/with-error-handling.ts).
//
// Each domain (trade-board, calendar, SMS, billing, ...) translates its own
// service-layer errors into a ThumperToolError inside the tool's execute
// function. The wrapper only needs to know about this one base type.

export class ThumperToolError extends Error {
  readonly code: string
  readonly userMessage: string

  constructor(args: { code: string; userMessage: string; cause?: unknown }) {
    super(args.userMessage)
    this.name = 'ThumperToolError'
    this.code = args.code
    this.userMessage = args.userMessage
    if (args.cause !== undefined) {
      ;(this as { cause?: unknown }).cause = args.cause
    }
  }
}
