import { NextResponse } from 'next/server'
import {
  getReviewerSmokeDiagnostics,
  isReviewerSmokeTokenValid,
  normalizeReviewerSmokeState,
} from '@/lib/reviewer-smoke/config'
import { resetReviewerSmokeSession } from '@/lib/reviewer-smoke/session'
import { ReviewerSmokeSafetyError } from '@/lib/reviewer-smoke/identity'
import { readLineupJson } from '@/lib/live-lineup/http'
import { LineupServiceError } from '@/lib/live-lineup/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const safeResetFailures: Record<string, {status: number; message: string}> = {
  REVIEWER_SMOKE_IDENTITY_MIGRATION_REQUIRED: {status:409,message:'This reviewer needs an explicitly approved identity migration. Ask the operator to verify the migration before retrying; do not repair authentication.'},
  REVIEWER_SMOKE_UNSUPPORTED_IDENTITY: {status:409,message:'This reset supports only the designated synthetic reviewers. Ask the operator to verify reviewer configuration.'},
  REVIEWER_SMOKE_IDENTITY_MISMATCH: {status:409,message:'Reviewer identity could not be safely verified. Stop and ask the operator to inspect the synthetic identity and site assignment.'},
  REVIEWER_SMOKE_UNSAFE_ENTITLEMENT: {status:409,message:'Reviewer access could not be safely verified. Ask the operator to inspect the synthetic entitlement; do not change billing or provider data.'},
  REVIEWER_SMOKE_LINEUP_RESET_UNAVAILABLE: {status:503,message:'The guarded reviewer reset was not confirmed. Stop its fixture publisher and pairing UI, and ask the operator to verify the approved reset migration and identity prerequisites.'},
  REVIEWER_SMOKE_INVALID_RESET_RECEIPT: {status:503,message:'Reviewer reset could not be confirmed. Ask the operator to inspect reset state before retrying.'},
}

const responseHeaders = {
  'cache-control': 'private, no-store',
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
}

function reviewerJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: responseHeaders })
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  if (
    !origin ||
    origin !== new URL(request.url).origin ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  ) {
    return reviewerJson(
      {
        code: 'REVIEWER_SMOKE_INVALID_ORIGIN',
        error: 'Use the same-origin reviewer page.',
      },
      403,
    )
  }

  let body: unknown
  try {
    body = await readLineupJson(request, 2_048)
  } catch (error) {
    const status = error instanceof LineupServiceError ? error.status : 400
    return reviewerJson(
      {
        code: 'REVIEWER_SMOKE_INVALID_REQUEST',
        error:
          status === 413
            ? 'Reviewer request is too large.'
            : status === 415
              ? 'Reviewer request must use JSON.'
              : 'Reviewer request is invalid.',
      },
      status,
    )
  }

  const input =
    typeof body === 'object' && body !== null && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null
  if (!isReviewerSmokeTokenValid(input?.token)) {
    console.warn(
      '[reviewer-smoke/session] Unavailable:',
      getReviewerSmokeDiagnostics(input?.token),
    )
    return reviewerJson(
      {
        code: 'REVIEWER_SMOKE_DISABLED',
        error: 'Reviewer smoke mode is not available.',
      },
      403,
    )
  }

  try {
    const result = await resetReviewerSmokeSession(
      normalizeReviewerSmokeState(input?.state),
    )
    return reviewerJson(result)
  } catch (error) {
    const safe = error instanceof ReviewerSmokeSafetyError && Object.hasOwn(safeResetFailures, error.code)
      ? safeResetFailures[error.code] : undefined
    if (safe) return reviewerJson({code:(error as ReviewerSmokeSafetyError).code,error:safe.message}, safe.status)
    // Never log raw provider failures: they can contain identifiers or credentials.
    console.error('[reviewer-smoke/session] Reset failed without a recognized safe error code.')
    return reviewerJson(
      { error: 'Unable to prepare reviewer smoke session.' },
      500,
    )
  }
}
