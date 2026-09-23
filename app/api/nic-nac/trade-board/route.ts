import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import {
  getPaidNicNacContext,
  AuthError,
} from '@/lib/nic-nac/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ServiceError } from '@/lib/services/errors'
import { processRepCustomListingPhotoUrl } from '@/lib/services/listing-photo-processing'
import { catalogVariantPhotoAssetKey } from '@/lib/nic-nac/workflows/workflow-photo-selection'
import {
  addListing,
  getCatalogListingMutationReceipt,
  getMyBoard,
  removeListing,
  restoreListing,
  updateListing,
} from '@/lib/services/trade-board'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function readLimit(url: URL) {
  const raw = url.searchParams.get('limit')
  if (!raw) return undefined
  if (!/^\d+$/.test(raw)) return null
  const parsed = Number.parseInt(raw, 10)
  return parsed > 0 ? parsed : null
}

function readOffset(url: URL) {
  const raw = url.searchParams.get('offset')
  if (!raw) return undefined
  if (!/^\d+$/.test(raw)) return null
  const parsed = Number.parseInt(raw, 10)
  return parsed >= 0 ? parsed : null
}

function readStatus(value: string | null) {
  if (!value) return undefined
  if (
    value === 'available' ||
    value === 'pending_trade' ||
    value === 'traded' ||
    value === 'removed'
  ) {
    return value
  }
  return null
}

function readType(value: string | null) {
  if (!value) return undefined
  if (value === 'RG' || value === 'NK' || value === 'ER' || value === 'ST' || value === 'BR') {
    return value
  }
  return null
}

function readSortBy(value: string | null) {
  if (!value) return undefined
  if (
    value === 'created_at' ||
    value === 'listed_at' ||
    value === 'design_name' ||
    value === 'collection'
  ) {
    return value
  }
  return null
}

function readSortOrder(value: string | null) {
  if (!value) return undefined
  if (value === 'asc' || value === 'desc') return value
  return null
}

function readRemovalReason(value: unknown) {
  if (
    value === 'sold' ||
    value === 'keeping' ||
    value === 'mistake' ||
    value === 'other'
  ) {
    return value
  }
  return null
}

function serviceErrorResponse(error: ServiceError) {
  return NextResponse.json(
    { code: error.code, error: error.userMessage },
    { status: error.statusCode },
  )
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const limit = readLimit(url)
    const offset = readOffset(url)
    const statusFilter = readStatus(url.searchParams.get('status'))
    const typeFilter = readType(url.searchParams.get('type'))
    const sortBy = readSortBy(url.searchParams.get('sortBy'))
    const sortOrder = readSortOrder(url.searchParams.get('sortOrder'))

    if (limit === null) {
      return NextResponse.json({ error: 'limit must be a whole number.' }, { status: 400 })
    }
    if (offset === null) {
      return NextResponse.json({ error: 'offset must be a whole number.' }, { status: 400 })
    }
    if (statusFilter === null) {
      return NextResponse.json({ error: 'status is invalid.' }, { status: 400 })
    }
    if (typeFilter === null) {
      return NextResponse.json({ error: 'type is invalid.' }, { status: 400 })
    }
    if (sortBy === null) {
      return NextResponse.json({ error: 'sortBy is invalid.' }, { status: 400 })
    }
    if (sortOrder === null) {
      return NextResponse.json({ error: 'sortOrder must be asc or desc.' }, { status: 400 })
    }

    const { repId, supabase } = await getPaidNicNacContext()
    const board = await getMyBoard(supabase, repId, {
      statusFilter,
      typeFilter,
      collectionFilter: url.searchParams.get('collection') ?? undefined,
      sortBy,
      sortOrder,
      limit: limit ?? undefined,
      offset: offset ?? undefined,
    })

    return NextResponse.json(board)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }
    if (error instanceof ServiceError) return serviceErrorResponse(error)
    throw error
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { repId } = await getPaidNicNacContext()
    const itemNumber =
      typeof body?.itemNumber === 'string' ? body.itemNumber.trim() : ''
    const designId =
      typeof body?.designId === 'string' ? body.designId.trim() : undefined
    const mutationKey =
      typeof body?.mutationKey === 'string' ? body.mutationKey.trim() : ''
    if (!mutationKey) {
      return NextResponse.json(
        { error: 'mutationKey is required.' },
        { status: 400 },
      )
    }
    const material =
      typeof body?.material === 'string' ? body.material.trim() : undefined
    const mainStone =
      typeof body?.mainStone === 'string' ? body.mainStone.trim() : undefined
    const ringSize =
      typeof body?.ringSize === 'string' ? body.ringSize.trim() : undefined
    const repNotes =
      typeof body?.repNotes === 'string' ? body.repNotes.trim() : undefined
    const tradePreferences =
      typeof body?.tradePreferences === 'string'
        ? body.tradePreferences.trim()
        : undefined
    const listingPhotoUrl =
      typeof body?.listingPhotoUrl === 'string' ? body.listingPhotoUrl : undefined
    const idempotencyKey = `trade-board-api:${mutationKey}`
    const inputSignature = createHash('sha256')
      .update(
        JSON.stringify({
          itemNumber: itemNumber.toUpperCase(),
          ringSize: ringSize || null,
          repNotes: repNotes || null,
          tradePreferences: tradePreferences || null,
          listingPhotoSource: listingPhotoUrl || null,
          ...(designId ? { designId } : {}),
          ...(material ? { material: material.toLowerCase() } : {}),
          ...(mainStone ? { mainStone: mainStone.toLowerCase() } : {}),
        }),
      )
      .digest('hex')
    const admin = createAdminClient()
    const replay = await getCatalogListingMutationReceipt(admin, {
      repId,
      idempotencyKey,
      inputSignature,
    })
    if (replay) {
      return NextResponse.json({ ok: true, result: replay })
    }
    const variantAssetKey = catalogVariantPhotoAssetKey({
      designId,
      material,
      mainStone,
    })
    const processedListingPhotoUrl = listingPhotoUrl
      ? (
          await processRepCustomListingPhotoUrl({
            repId,
            sourceImageUrl: listingPhotoUrl,
            filenameStem: `${itemNumber || 'listing'}-listing-photo`,
            mutationAssetKey: inputSignature,
            ...(variantAssetKey ? { variantAssetKey } : {}),
          })
        ).photoUrl
      : undefined
    const result = await addListing(admin, repId, {
      ...(designId ? { designId } : {}),
      itemNumber,
      ...(material ? { material } : {}),
      ...(mainStone ? { mainStone } : {}),
      ringSize,
      repNotes,
      tradePreferences,
      listingPhotoUrl: processedListingPhotoUrl,
      idempotencyKey,
      inputSignature,
    })

    return NextResponse.json({ ok: true, result })
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 })
    }
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }
    if (error instanceof ServiceError) return serviceErrorResponse(error)
    throw error
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { repId, supabase } = await getPaidNicNacContext()
    const listingId = typeof body?.listingId === 'string' ? body.listingId.trim() : ''
    if (body?.action === 'restore') {
      const result = await restoreListing(supabase, repId, {
        listingId,
        itemNumber:
          typeof body?.itemNumber === 'string' ? body.itemNumber.trim() : undefined,
      })

      return NextResponse.json({ ok: true, result })
    }

    const listingPhotoUrl =
      typeof body?.listingPhotoUrl === 'string' ? body.listingPhotoUrl : undefined
    const processedListingPhotoUrl = listingPhotoUrl
      ? (
          await processRepCustomListingPhotoUrl({
            repId,
            sourceImageUrl: listingPhotoUrl,
            filenameStem: `${listingId || 'listing'}-listing-photo`,
          })
        ).photoUrl
      : undefined

    const result = await updateListing(supabase, repId, listingId, {
      repNotes: typeof body?.repNotes === 'string' ? body.repNotes : undefined,
      tradePreferences:
        typeof body?.tradePreferences === 'string' ? body.tradePreferences : undefined,
      ringSize:
        typeof body?.ringSize === 'string'
          ? body.ringSize
          : body?.ringSize === null
            ? null
            : undefined,
      listingPhotoUrl: processedListingPhotoUrl,
      useCanonicalPhoto: body?.useCanonicalPhoto === true ? true : undefined,
    })

    return NextResponse.json({ ok: true, result })
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 })
    }
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }
    if (error instanceof ServiceError) return serviceErrorResponse(error)
    throw error
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const reason = readRemovalReason(body?.reason)
    if (reason === null) {
      return NextResponse.json(
        { error: 'reason must be sold, keeping, mistake, or other.' },
        { status: 400 },
      )
    }

    const { repId, supabase } = await getPaidNicNacContext()
    const result = await removeListing(supabase, repId, {
      listingId: typeof body?.listingId === 'string' ? body.listingId.trim() : undefined,
      itemNumber: typeof body?.itemNumber === 'string' ? body.itemNumber.trim() : undefined,
      reason,
    })

    return NextResponse.json({ ok: true, result })
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 })
    }
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }
    if (error instanceof ServiceError) return serviceErrorResponse(error)
    throw error
  }
}
