import { NextResponse } from 'next/server'
import {
  getPaidNicNacContext,
  AuthError,
} from '@/lib/nic-nac/auth'
import { ServiceError } from '@/lib/services/errors'
import {
  createCustomerAudienceContact,
  formatCustomerAudienceCsv,
  getCustomerAudience,
  getCustomerAudienceMember,
  importCustomerAudienceContacts,
  unsubscribeCustomerAudienceMember,
  updateCustomerAudienceContact,
} from '@/lib/services/customer-audience'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function readLimit(url: URL) {
  const raw = url.searchParams.get('limit')
  if (!raw) return undefined
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : null
}

function readChannel(url: URL) {
  const raw = url.searchParams.get('channel')
  if (!raw) return undefined
  if (raw === 'all' || raw === 'sms' || raw === 'email' || raw === 'marketing') {
    return raw
  }
  return null
}

function readBoolean(value: unknown) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return (
      normalized === 'true' ||
      normalized === '1' ||
      normalized === 'yes' ||
      normalized === 'on'
    )
  }
  return false
}

function readFormat(url: URL) {
  const raw = url.searchParams.get('format')
  if (!raw) return 'json'
  return raw === 'csv' ? raw : null
}

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function readTags(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((tag): tag is string => typeof tag === 'string')
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
  }
  return []
}

function readContactProfile(body: Record<string, unknown>) {
  return {
    identityLabel: readString(body.identityLabel),
    name: readString(body.name),
    email: readString(body.email),
    phone: readString(body.phone),
    address: readString(body.address),
    birthday: readString(body.birthday),
    favoriteGemOrStone: readString(body.favoriteGemOrStone),
    favoriteMaterial: readString(body.favoriteMaterial),
    favoriteCut: readString(body.favoriteCut),
    favoriteCollection: readString(body.favoriteCollection),
    notes: readString(body.notes),
    tags: readTags(body.tags),
  }
}

function readContactProfilePatch(body: Record<string, unknown>) {
  const fields = [
    'identityLabel',
    'name',
    'email',
    'phone',
    'address',
    'birthday',
    'favoriteGemOrStone',
    'favoriteMaterial',
    'favoriteCut',
    'favoriteCollection',
    'notes',
    'tags',
  ] as const
  const patch: Record<string, unknown> = {}
  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(body, field)) continue
    patch[field] = field === 'tags' ? readTags(body[field]) : readString(body[field])
  }
  return patch
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const limit = readLimit(url)
    const channelFilter = readChannel(url)
    const format = readFormat(url)

    if (limit === null) {
      return NextResponse.json(
        { error: 'limit must be a whole number.' },
        { status: 400 },
      )
    }

    if (channelFilter === null) {
      return NextResponse.json(
        { error: 'channel must be all, sms, email, or marketing.' },
        { status: 400 },
      )
    }

    if (format === null) {
      return NextResponse.json(
        { error: 'format must be csv when provided.' },
        { status: 400 },
      )
    }

    const { repId, supabase } = await getPaidNicNacContext()
    const customerId = url.searchParams.get('customerId')
    if (customerId) return NextResponse.json({customer: await getCustomerAudienceMember(supabase, repId, customerId)}, {headers:{'cache-control':'no-store'}})
    const audience = await getCustomerAudience(supabase, repId, {
      channelFilter,
      query: url.searchParams.get('query') ?? undefined,
      limit: format === 'csv' ? null : limit ?? undefined,
    })

    if (format === 'csv') {
      const date = new Date().toISOString().slice(0, 10)
      return new Response(`\ufeff${formatCustomerAudienceCsv(audience.customers)}`, {
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': `attachment; filename="sparkle-suite-customers-${date}.csv"`,
          'cache-control': 'no-store, private',
        },
      })
    }

    return NextResponse.json(audience)
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }
    throw err
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const { repId, supabase } = await getPaidNicNacContext()

    if (body.action === 'import') {
      const rawContacts = Array.isArray(body.contacts) ? body.contacts : []
      const contacts = rawContacts
        .filter((contact): contact is Record<string, unknown> =>
          typeof contact === 'object' && contact !== null,
        )
        .map((contact) => ({
          ...readContactProfilePatch(contact),
          name: readString(contact.name),
        }))
      const result = await importCustomerAudienceContacts(
        supabase,
        repId,
        contacts,
        { actorKind: 'rep', actorRepId: repId },
      )
      return NextResponse.json({ ok: true, result })
    }

    if (!readString(body.audienceId)) {
      const customer = await createCustomerAudienceContact(
        supabase,
        repId,
        readContactProfile(body),
        { actorKind: 'rep', actorRepId: repId },
      )
      return NextResponse.json({ ok: true, customer }, { status: 201 })
    }

    const result = await unsubscribeCustomerAudienceMember(supabase, repId, {
      audienceId: readString(body.audienceId),
      unsubscribeSms: readBoolean(body?.unsubscribeSms),
      unsubscribeEmail: readBoolean(body?.unsubscribeEmail),
    })

    return NextResponse.json({ ok: true, result })
  } catch (err) {
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 })
    }

    if (err instanceof AuthError) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }

    if (err instanceof ServiceError) {
      return NextResponse.json(
        {
          code: err.code,
          error: err.userMessage,
        },
        { status: err.statusCode },
      )
    }

    throw err
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const audienceId = readString(body.audienceId)
    const { repId, supabase } = await getPaidNicNacContext()
    const customer = await updateCustomerAudienceContact(
      supabase,
      repId,
      { audienceId, ...readContactProfilePatch(body), ...(typeof body.expectedVersion === 'number' ? {expectedVersion:body.expectedVersion} : {}) },
      { actorKind: 'rep', actorRepId: repId },
    )

    if (!customer) {
      return NextResponse.json({ error: 'Customer record not found.' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, customer })
  } catch (err) {
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 })
    }

    if (err instanceof AuthError) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }

    if (err instanceof ServiceError) {
      return NextResponse.json(
        { code: err.code, error: err.userMessage },
        { status: err.statusCode },
      )
    }

    throw err
  }
}
