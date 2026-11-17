import { validateRepNotes } from '@/lib/services/rep-notes'
import { NextResponse } from 'next/server'
import { getRepDanceFloorBoard } from '@/lib/services/dance-floor-board'
import { canServePublicCustomerSiteForRep } from '@/lib/services/workspace-access'
import { danceFloorPublication } from '@/app/nic-nac/components/dance-floor/publication'
import { danceFloorRouteError } from '@/lib/nic-nac/dance-floor-route-error'
import { requireOwnedDanceFloorListing, getBlockingDanceFloorSwaps } from '@/lib/services/trade-board'
import type { ListingStatus } from '@/lib/services/types'
import {
  getPaidNicNacContext,
  AuthError,
} from '@/lib/nic-nac/auth'
import { ServiceError } from '@/lib/services/errors'
import { getDanceFloorDancerCounts } from '@/lib/services/trade-board-stats'
import {
  getDanceFloorAttention,
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

function readStatus(value: string | null): ListingStatus[] | undefined | null {
  if (!value) return undefined
  const values = value.split(',')
  return values.every(status => ['available', 'pending_trade', 'traded', 'removed'].includes(status)) ? [...new Set(values)] as ListingStatus[] : null
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
      return NextResponse.json({ code: 'INVALID_INPUT', error: 'limit must be a whole number.' }, { status: 400 })
    }
    if (offset === null) {
      return NextResponse.json({ code: 'INVALID_INPUT', error: 'offset must be a whole number.' }, { status: 400 })
    }
    if (statusFilter === null) {
      return NextResponse.json({ code: 'INVALID_INPUT', error: 'status is invalid.' }, { status: 400 })
    }
    if (typeFilter === null) {
      return NextResponse.json({ code: 'INVALID_INPUT', error: 'type is invalid.' }, { status: 400 })
    }
    if (sortBy === null) {
      return NextResponse.json({ code: 'INVALID_INPUT', error: 'sortBy is invalid.' }, { status: 400 })
    }
    if (sortOrder === null) {
      return NextResponse.json({ code: 'INVALID_INPUT', error: 'sortOrder must be asc or desc.' }, { status: 400 })
    }

    const { repId, rep, supabase } = await getPaidNicNacContext()
    if (url.searchParams.has('listingId')) {
      const listing = await requireOwnedDanceFloorListing(supabase, repId, url.searchParams.get('listingId') ?? '')
      return NextResponse.json({ listing }, { headers: { 'Cache-Control': 'no-store' } })
    }
    const boardPromise = getRepDanceFloorBoard(supabase, repId, rep.time_zone, {
      statusFilters: statusFilter,
      search: url.searchParams.get('search') ?? '',
      sitting: url.searchParams.get('sitting') === 'true',
      browse: { rarity: url.searchParams.get('rarity') ?? '', material: url.searchParams.get('material') ?? '', size: url.searchParams.get('size') ?? '', sortMode: (['newest','collection','type','rarity','name'].includes(url.searchParams.get('sort') ?? '') ? url.searchParams.get('sort') : undefined) as 'newest' | 'collection' | 'type' | 'rarity' | 'name' },
      typeFilter,
      collectionFilter: url.searchParams.get('collection') ?? undefined,
      sortBy,
      sortOrder,
      limit: limit ?? undefined,
      offset: offset ?? undefined,
    })
    const publicationPromise = canServePublicCustomerSiteForRep({ supabase, repId }).then(async published => {
      const { data, error } = await supabase.from('reps').select('public_site_slug, custom_domain').eq('id', repId).maybeSingle()
      if (error) throw error
      return danceFloorPublication({ published, publicSiteSlug: data?.public_site_slug, customDomain: data?.custom_domain, origin: url.origin })
    }).catch(() => ({ status: 'unknown' as const }))
    const countsPromise = getDanceFloorDancerCounts(supabase, repId, rep.time_zone)
      .catch((error: unknown) => {
        console.error('[trade-board] dancer counts unavailable', error)
        return null
      })
    const [board, dancerCounts, attention, publication] = await Promise.all([
      boardPromise, countsPromise, getDanceFloorAttention(supabase, repId).catch(() => null), publicationPromise,
    ])

    return NextResponse.json({
      ...board,
      attention, publication,
      summary: { ...board.summary, ...(dancerCounts ?? {}) },
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ code: 'UNAUTHENTICATED', error: 'unauthenticated' }, { status: 401 })
    }
    if (error instanceof ServiceError) return serviceErrorResponse(error)
    return danceFloorRouteError(error)
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

    const owned = await requireOwnedDanceFloorListing(supabase, repId, listingId)
    if (!['available', 'pending_trade'].includes(owned.status)) {
      throw new ServiceError({ code: 'LISTING_NOT_ACTIVE', message: 'Listing is not active', userMessage: "That dancer isn't on your Floor anymore.", statusCode: 409 })
    }
    const patch = {
      repNotes: validateRepNotes(typeof body?.repNotes === 'string' ? body.repNotes : undefined),
      tradePreferences:
        typeof body?.tradePreferences === 'string' ? body.tradePreferences : undefined,
      ringSize:
        typeof body?.ringSize === 'string'
          ? body.ringSize
          : body?.ringSize === null
            ? null
            : undefined,
    }
    const result = Object.values(patch).some(value => value !== undefined)
      ? await updateListing(supabase, repId, listingId, patch)
      : { listingId }

    return NextResponse.json({ ok: true, result })

  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ code: 'INVALID_INPUT', error: 'Invalid request payload.' }, { status: 400 })
    }
    if (error instanceof AuthError) {
      return NextResponse.json({ code: 'UNAUTHENTICATED', error: 'unauthenticated' }, { status: 401 })
    }
    if (error instanceof ServiceError) return serviceErrorResponse(error)
    return danceFloorRouteError(error)
  }
}

export async function DELETE(request: Request) {
  try {
    const { repId, supabase } = await getPaidNicNacContext()
    const body = await request.json()
    const reason = readRemovalReason(body?.reason)
    if (reason === null) return NextResponse.json({ code: 'INVALID_REASON', error: 'Choose a valid removal reason.' }, { status: 400 })
    const listingId = typeof body?.listingId === 'string' ? body.listingId.trim() : undefined
    try {
      const result = await removeListing(supabase, repId, {
        listingId, itemNumber: typeof body?.itemNumber === 'string' ? body.itemNumber.trim() : undefined, reason,
      })
      return NextResponse.json({ ok: true, result })
    } catch (error) {
      if (error instanceof ServiceError && error.code === 'OPEN_SWAP' && listingId) {
        const blockers = await getBlockingDanceFloorSwaps(supabase, repId, listingId)
        return NextResponse.json({ code: error.code, error: error.userMessage, blockers }, { status: 409 })
      }
      throw error
    }
  } catch (error) { return danceFloorRouteError(error) }
}
