import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { getPaidNicNacContext, AuthError } from '@/lib/nic-nac/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ServiceError } from '@/lib/services/errors'
import { processRepCustomListingPhotoUrl } from '@/lib/services/listing-photo-processing'
import { searchJewelryDatabase } from '@/lib/services/jewelry-database'
import { catalogVariantPhotoAssetKey } from '@/lib/nic-nac/workflows/workflow-photo-selection'
import {
  addListing,
  getCatalogListingMutationReceipt,
} from '@/lib/services/trade-board'
import type { JewelryDatabaseResult, JewelryType } from '@/lib/services/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_JEWELRY_TYPES = new Set<JewelryType>(['RG', 'NK', 'ER', 'ST', 'BR'])
const TYPE_PARAM_TO_PREFIX: Record<string, JewelryType> = {
  bracelet: 'BR',
  earrings: 'ER',
  necklace: 'NK',
  ring: 'RG',
  stack: 'ST',
}
const VALID_LABELS = new Set(['diamond', 'unicorn', 'standard'])

function readLimit(url: URL) {
  const raw = url.searchParams.get('limit')
  if (!raw) return undefined
  if (!/^\d+$/.test(raw)) return null
  const parsed = Number.parseInt(raw, 10)
  return parsed > 0 ? parsed : null
}

function readCollectionYear(url: URL) {
  const raw = url.searchParams.get('year')?.trim()
  if (!raw) return undefined
  if (!/^\d{4}$/.test(raw)) return null
  const parsed = Number.parseInt(raw, 10)
  return Number.isInteger(parsed) ? parsed : null
}

function readJewelryType(url: URL): JewelryType | undefined {
  const raw = url.searchParams.get('type')?.trim()
  if (!raw || raw === 'all') return undefined
  const normalized = raw.toLowerCase()
  const mapped = TYPE_PARAM_TO_PREFIX[normalized]
  if (mapped) return mapped
  const upper = raw.toUpperCase() as JewelryType
  return VALID_JEWELRY_TYPES.has(upper) ? upper : undefined
}

function readLabel(url: URL): 'diamond' | 'unicorn' | 'standard' | undefined {
  const raw = url.searchParams.get('label')?.trim().toLowerCase()
  if (!raw || raw === 'all') return undefined
  return VALID_LABELS.has(raw) ? (raw as 'diamond' | 'unicorn' | 'standard') : undefined
}

function countFacetValues(values: Array<string | null | undefined>) {
  const counts = new Map<string, number>()
  for (const value of values) {
    const trimmed = value?.trim()
    if (!trimmed) continue
    counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => left.value.localeCompare(right.value))
}

function deriveLabel(result: JewelryDatabaseResult) {
  const explicitTags = (result.searchTags ?? []).map((tag) =>
    tag.trim().toLowerCase(),
  )
  if (explicitTags.includes('unicorn')) return 'unicorn'
  if (explicitTags.includes('diamond')) return 'diamond'
  return 'standard'
}

function formatTypeFacet(typePrefix: JewelryType) {
  const labels: Record<JewelryType, string> = {
    BR: 'bracelet',
    ER: 'earrings',
    NK: 'necklace',
    RG: 'ring',
    ST: 'stack',
  }
  return labels[typePrefix] ?? typePrefix.toLowerCase()
}

function deriveFacets(results: JewelryDatabaseResult[]) {
  return {
    collections: countFacetValues(results.map((result) => result.collectionName)),
    materials: countFacetValues(results.map((result) => result.material)),
    stones: countFacetValues(results.map((result) => result.mainStone)),
    types: countFacetValues(results.map((result) => formatTypeFacet(result.typePrefix))),
    labels: countFacetValues(results.map(deriveLabel)),
    years: countFacetValues(
      results.map((result) =>
        result.collectionYear ? String(result.collectionYear) : undefined,
      ),
    ),
  }
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
    const query = (url.searchParams.get('query') ?? url.searchParams.get('q'))?.trim() ?? ''
    const limit = readLimit(url)
    if (limit === null) {
      return NextResponse.json({ error: 'limit must be a whole number.' }, { status: 400 })
    }
    const collectionYear = readCollectionYear(url)
    if (collectionYear === null) {
      return NextResponse.json({ error: 'year must be a four-digit year.' }, { status: 400 })
    }

    const { repId } = await getPaidNicNacContext()
    const results = await searchJewelryDatabase(createAdminClient(), repId, {
      query,
      jewelryType: readJewelryType(url),
      collection: url.searchParams.get('collection')?.trim() || undefined,
      material: url.searchParams.get('material')?.trim() || undefined,
      mainStone: url.searchParams.get('stone')?.trim() || undefined,
      label: readLabel(url),
      collectionYear,
      limit: limit ?? undefined,
    })

    const items = results.map(({ bpMsrp: _legacyMsrp, ...item }) => {
      void _legacyMsrp
      return item
    })
    return NextResponse.json({ items, facets: deriveFacets(results) })
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
    const listingPhotoUrl =
      typeof body?.listingPhotoUrl === 'string' ? body.listingPhotoUrl : undefined
    const repNotes =
      typeof body?.repNotes === 'string' ? body.repNotes.trim() : undefined
    const tradePreferences =
      typeof body?.tradePreferences === 'string'
        ? body.tradePreferences.trim()
        : undefined
    const idempotencyKey = `jewelry-library-api:${mutationKey}`
    const inputSignature = createHash('sha256')
      .update(
        JSON.stringify({
          designId: designId || null,
          itemNumber: itemNumber.toUpperCase(),
          material: material?.toLowerCase() ?? null,
          mainStone: mainStone?.toLowerCase() ?? null,
          repNotes: repNotes || null,
          tradePreferences: tradePreferences || null,
          listingPhotoSource: listingPhotoUrl || null,
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
      material,
      mainStone,
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
