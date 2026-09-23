import { NextResponse } from 'next/server'

import { allowTradeRequest } from '@/lib/amethyst/trade-request-rate-limit'
import { resolveAmethystPreviewRep } from '@/lib/amethyst/preview-rep'
import { resolveAmethystRequestTarget } from '@/lib/amethyst/request-rep-target'
import { ServiceError } from '@/lib/services/errors'
import {
  attachTradeRequestRevealScreenshot,
  getTradeRequestNotificationSummary,
  submitTradeRequest,
  TRADE_REQUEST_CUSTOMER_NAME_MAX_LENGTH,
  TRADE_REQUEST_DESCRIPTION_MAX_LENGTH,
  TRADE_REQUEST_OFFERED_FAMILY_MAX_LENGTH,
} from '@/lib/services/trade-requests'
import {
  removeTradeRequestRevealScreenshots,
  TRADE_REQUEST_SCREENSHOT_MAX_BYTES,
  uploadTradeRequestRevealScreenshot,
} from '@/lib/services/storage'
import { notifyRepOfTradeRequest } from '@/lib/nic-nac/trade-request-notifications'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const SUPPORTED_SCREENSHOT_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
])

type TradeRequestPayload = {
  listingId: string
  customerName: string
  customerDescription: string
  submissionId?: string
  offeredFamily: string | null
  offeredType: 'RG' | 'NK' | 'ER' | 'ST' | 'BR' | null
  manualReviewRequested: boolean
  revealScreenshot: File | null
}

const JSON_BODY_MAX_BYTES = 16 * 1024
const MULTIPART_OVERHEAD_MAX_BYTES = 64 * 1024
const MULTIPART_BODY_MAX_BYTES =
  TRADE_REQUEST_SCREENSHOT_MAX_BYTES + MULTIPART_OVERHEAD_MAX_BYTES

class TradeRequestPayloadError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'TradeRequestPayloadError'
  }
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : ''
}

async function readPayload(request: Request): Promise<TradeRequestPayload> {
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? ''
  const isMultipart = contentType.startsWith('multipart/form-data;')
  const isJson = contentType.split(';', 1)[0]?.trim() === 'application/json'
  if (!isMultipart && !isJson) {
    throw new TradeRequestPayloadError(
      'Trade requests must use application/json or multipart/form-data.',
      415,
    )
  }
  const maxBytes = isMultipart ? MULTIPART_BODY_MAX_BYTES : JSON_BODY_MAX_BYTES
  const bytes = await readBoundedRequestBytes(request, maxBytes)

  if (isMultipart) {
    const formRequest = new Request(request.url, {
      method: 'POST',
      headers: { 'content-type': request.headers.get('content-type')! },
      body: bytes,
    })
    const form = await formRequest.formData()
    const screenshot = form.get('revealScreenshot')
    return {
      listingId: readString(form.get('listingId')),
      customerName: readString(form.get('customerName')),
      customerDescription: readString(form.get('customerDescription')),
      submissionId: readString(form.get('submissionId')) || undefined,
      offeredFamily: readString(form.get('offeredFamily')) || null,
      offeredType: readOfferedType(form.get('offeredType')),
      manualReviewRequested: readBoolean(form.get('manualReviewRequested')),
      revealScreenshot: screenshot instanceof File && screenshot.size > 0
        ? screenshot
        : null,
    }
  }

  let body: Record<string, unknown>
  try {
    body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as Record<string, unknown>
  } catch {
    throw new TradeRequestPayloadError('Invalid request payload.', 400)
  }
  return {
    listingId: readString(body?.listingId),
    customerName: readString(body?.customerName),
    customerDescription: readString(body?.customerDescription),
    submissionId: readString(body?.submissionId) || undefined,
    offeredFamily: readString(body?.offeredFamily) || null,
    offeredType: readOfferedType(body?.offeredType),
    manualReviewRequested: readBoolean(body?.manualReviewRequested),
    revealScreenshot: null,
  }
}

function readOfferedType(value: unknown): TradeRequestPayload['offeredType'] {
  if (value == null || value === '') return null
  if (value === 'RG' || value === 'NK' || value === 'ER' || value === 'ST' || value === 'BR') return value
  throw new TradeRequestPayloadError('Select a valid jewelry type.', 400)
}

function readBoolean(value: unknown): boolean {
  return value === true || value === 'true'
}

async function readBoundedRequestBytes(request: Request, maxBytes: number) {
  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new TradeRequestPayloadError('Trade request payload is too large.', 413)
  }
  const reader = request.body?.getReader()
  if (!reader) return new Uint8Array()
  const chunks: Uint8Array[] = []
  let totalBytes = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalBytes += value.byteLength
      if (totalBytes > maxBytes) {
        await reader.cancel()
        throw new TradeRequestPayloadError('Trade request payload is too large.', 413)
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const body = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return body
}

function validatePayloadBounds(payload: TradeRequestPayload) {
  if (payload.listingId.trim().length > 100) {
    throw new TradeRequestPayloadError('listingId is too long.', 400)
  }
  if (payload.customerName.trim().length > TRADE_REQUEST_CUSTOMER_NAME_MAX_LENGTH) {
    throw new TradeRequestPayloadError(
      `Your name must be ${TRADE_REQUEST_CUSTOMER_NAME_MAX_LENGTH} characters or fewer.`,
      400,
    )
  }
  if (
    payload.customerDescription.trim().length >
    TRADE_REQUEST_DESCRIPTION_MAX_LENGTH
  ) {
    throw new TradeRequestPayloadError(
      `Your description must be ${TRADE_REQUEST_DESCRIPTION_MAX_LENGTH} characters or fewer.`,
      400,
    )
  }
  if ((payload.offeredFamily?.length ?? 0) > TRADE_REQUEST_OFFERED_FAMILY_MAX_LENGTH) {
    throw new TradeRequestPayloadError('The offered collection family is too long.', 400)
  }
}

async function resolveScreenshotRepId(
  admin: ReturnType<typeof createAdminClient>,
  listingId: string,
) {
  const { data, error } = await admin
    .from('trade_listings')
    .select('rep_id')
    .eq('id', listingId)
    .maybeSingle()
  if (error) throw error
  return (data as { rep_id?: string } | null)?.rep_id ?? null
}

export async function POST(request: Request) {
  try {
    const payload = await readPayload(request)
    validatePayloadBounds(payload)
    const throttle = allowTradeRequest(request, payload.listingId)
    if (!throttle.allowed) {
      return NextResponse.json(
        { error: 'Too many trade requests for this dancer. Please try again shortly.' },
        { status: 429, headers: { 'retry-after': String(throttle.retryAfter) } },
      )
    }
    const admin = createAdminClient()
    const target = resolveAmethystRequestTarget(request)
    const targetRep = target.targeted
      ? await resolveAmethystPreviewRep(admin, {
          env: process.env,
          publicSiteSlug: target.publicSiteSlug,
          repId: target.repId ?? target.customDomain,
          select: 'id, email',
        })
      : null

    if (target.targeted && !targetRep?.id) {
      return NextResponse.json(
        { error: 'Trade requests are temporarily unavailable right now.' },
        { status: 503 },
      )
    }

    const result = await submitTradeRequest(admin, {
      listingId: payload.listingId,
      customerName: payload.customerName,
      customerDescription: payload.customerDescription,
      submissionId: payload.submissionId,
      expectedRepId: targetRep?.id,
      offeredFamily: payload.offeredFamily,
      offeredType: payload.offeredType,
      manualReviewRequested: payload.manualReviewRequested,
    })

    let screenshotWarning: string | null = null
    if (payload.revealScreenshot) {
      let uploadedScreenshotPath: string | null = null
      try {
        const screenshotRepId =
          targetRep?.id ?? (await resolveScreenshotRepId(admin, result.listingId))
        if (!screenshotRepId) {
          throw new Error('screenshot rep target not found')
        }
        if (!SUPPORTED_SCREENSHOT_TYPES.has(payload.revealScreenshot.type.toLowerCase())) {
          throw new Error('unsupported screenshot type')
        }

        const screenshot = await uploadTradeRequestRevealScreenshot(
          screenshotRepId,
          result.requestId,
          await payload.revealScreenshot.arrayBuffer(),
          {
            contentType: payload.revealScreenshot.type,
            filename: payload.revealScreenshot.name,
          },
        )
        uploadedScreenshotPath = screenshot.objectPath
        await attachTradeRequestRevealScreenshot(admin, result.requestId, screenshot)
      } catch (screenshotError) {
        if (uploadedScreenshotPath) {
          try {
            await removeTradeRequestRevealScreenshots([uploadedScreenshotPath])
          } catch (cleanupError) {
            console.error(
              '[amethyst/trade-requests] Screenshot orphan cleanup error:',
              cleanupError,
            )
          }
        }
        screenshotWarning =
          'Your trade request was sent, but the screenshot could not be attached.'
        console.error(
          '[amethyst/trade-requests] Screenshot upload error:',
          screenshotError,
        )
      }
    }

    if (!result.mutationReplayed) {
      try {
        const summary = await getTradeRequestNotificationSummary(
          admin,
          result.requestId,
        )
        if (summary) {
          await notifyRepOfTradeRequest(admin, summary)
        }
      } catch (notificationError) {
        console.error(
          '[amethyst/trade-requests] Notification error:',
          notificationError,
        )
      }
    }

    return NextResponse.json(
      screenshotWarning ? { ...result, warning: screenshotWarning } : result,
      { status: 201, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } },
    )
  } catch (error) {
    if (error instanceof TradeRequestPayloadError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof ServiceError) {
      return NextResponse.json(
        {
          code: error.code,
          error: error.userMessage,
        },
        { status: error.statusCode },
      )
    }

    console.error('[amethyst/trade-requests] Error:', error)
    return NextResponse.json(
      { error: 'Failed to submit trade request.' },
      { status: 500 },
    )
  }
}
