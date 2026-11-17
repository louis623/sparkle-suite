import { readSwapJson, swapIpHash, SwapHttpError, verifySwapOrigin } from '@/lib/amethyst/swap-http'
import { readSwapPhotoPolicy } from '@/lib/amethyst/swap-photo-policy'
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
  intent: 'send' | 'recover' | 'retry' | 'abandon'
  listingId: string
  customerName: string
  customerDescription: string
  submissionId?: string
  offeredFamily: string | null
  offeredType: 'RG' | 'NK' | 'ER' | 'ST' | 'BR' | null
  manualReviewRequested: boolean
  uploadId: string | null
}


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
  verifySwapOrigin(request)
  const body = await readSwapJson(request)
  const intent = body.intent ?? 'send'
  if (intent !== 'send' && intent !== 'recover' && intent !== 'retry' && intent !== 'abandon') throw new SwapHttpError(400, 'Invalid swap operation.')
  if (intent !== 'send' && !body.submissionId) throw new SwapHttpError(400, 'Missing original submission.')
  return {
    intent,
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
        { error: 'Swap requests are temporarily unavailable right now.' },
        { status: 503 },
      )
    }

    const policy = await readSwapPhotoPolicy(admin)
    const input = {
      listingId: payload.listingId,
      customerName: payload.customerName,
      customerDescription: payload.customerDescription,
      submissionId: payload.submissionId,
      expectedRepId: targetRep?.id,
      offeredFamily: payload.offeredFamily,
      offeredType: payload.offeredType,
      manualReviewRequested: payload.manualReviewRequested,
      uploadId: payload.uploadId,
    }
    const privateHeaders = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' }
    const wantsMutation = payload.intent === 'send' || payload.intent === 'retry'
    let result = payload.submissionId ? await submitTradeRequest(admin, { ...input, intent: payload.intent === 'abandon' ? 'abandon' : 'recover' }) : { outcome: 'absent' as const }
    if ('outcome' in result && result.outcome === 'absent' && wantsMutation) {
      try {
        if (!payload.uploadId && policy.required) {
          throw new ServiceError({code:'PHOTO_REQUIRED',message:'PHOTO_REQUIRED',userMessage:'Refresh the Dance Floor page and add a photo',statusCode:400})
        }
        const requestIpHash = swapIpHash(request)
        const throttle = allowTradeRequest(request, payload.listingId, 'send', requestIpHash)
        if (!throttle.allowed) {
          throw new ServiceError({code:'SEND_RATE_LIMIT',message:'SEND_RATE_LIMIT:'+throttle.retryAfter,userMessage:'Too many swap requests for this dancer. Try again shortly.',statusCode:429})
        }
        result = await submitTradeRequest(admin, { ...input, intent: payload.intent, requestIpHash })
      } catch (error) {
        if (payload.intent !== 'retry' || !(error instanceof ServiceError) ||
            error.statusCode >= 500 || error.statusCode === 408 || error.code === 'IDEMPOTENCY_CONFLICT') throw error
        // The passive lookup released its submission lock. The original POST
        // may have arrived since then. Fence it before allowing edits.
        const settled = await submitTradeRequest(admin, { ...input, intent:'abandon' })
        if ('outcome' in settled) {
          if (settled.outcome !== 'abandoned') throw new Error('Could not settle the original swap request')
          return NextResponse.json({ code:error.code, error:error.userMessage, attemptClosed:true }, {
            status:error.statusCode,
            headers:{ ...privateHeaders, ...(error.statusCode===429?{'Retry-After':String(Number(error.message.split(':')[1]) || 60)}:{}) },
          })
        }
        result = settled
      }
    }
    if ('outcome' in result) return NextResponse.json(result, { headers: privateHeaders })

    { // The transactional delivery RPC also repairs a previously missed alert.
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
    if (error instanceof TradeRequestPayloadError || error instanceof SwapHttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof ServiceError) {
      return NextResponse.json(
        {
          code: error.code,
          error: error.userMessage,
        },
        { status: error.statusCode, headers: error.statusCode === 429 ? { 'Retry-After': String(Number(error.message.split(':')[1]) || 60) } : {} },
      )
    }

    console.error('[amethyst/trade-requests] Error:', error)
    return NextResponse.json(
      { error: 'Failed to submit swap request.' },
      { status: 500 },
    )
  }
}
