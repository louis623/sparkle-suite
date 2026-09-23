import { NextResponse } from 'next/server'

import { allowTradeRequest } from '@/lib/amethyst/trade-request-rate-limit'
import { resolveAmethystPreviewRep } from '@/lib/amethyst/preview-rep'
import { resolveAmethystRequestTarget } from '@/lib/amethyst/request-rep-target'
import { ServiceError } from '@/lib/services/errors'
import {
  getTradeRequestNotificationSummary,
  submitTradeRequest,
  TRADE_REQUEST_CUSTOMER_NAME_MAX_LENGTH,
  TRADE_REQUEST_DESCRIPTION_MAX_LENGTH,
  TRADE_REQUEST_OFFERED_FAMILY_MAX_LENGTH,
} from '@/lib/services/trade-requests'
import { notifyRepOfTradeRequest } from '@/lib/nic-nac/trade-request-notifications'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

type TradeRequestPayload = {
  listingId: string
  customerName: string
  customerDescription: string
  submissionId?: string
  offeredFamily: string | null
  offeredType: 'RG' | 'NK' | 'ER' | 'ST' | 'BR' | null
  manualReviewRequested: boolean
  uploadId: string | null
}

const JSON_BODY_MAX_BYTES = 16 * 1024

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
  const isJson = contentType.split(';', 1)[0]?.trim() === 'application/json'
  if (!isJson) {
    throw new TradeRequestPayloadError(
      'Refresh the Dance Floor page before sending a trade request.',
      415,
    )
  }
  const bytes = await readBoundedRequestBytes(request, JSON_BODY_MAX_BYTES)

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
    uploadId: readString(body?.uploadId) || null,
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
  if (payload.uploadId && payload.uploadId.length > 100) {
    throw new TradeRequestPayloadError('That photo upload is not valid. Please choose the photo again.', 400)
  }
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
      uploadId: payload.uploadId,
    })

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
      result,
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
