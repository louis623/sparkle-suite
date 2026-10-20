import { NextResponse } from 'next/server'

import { resolveAmethystPreviewRep } from '@/lib/amethyst/preview-rep'
import { resolveAmethystRequestTarget } from '@/lib/amethyst/request-rep-target'
import { ServiceError, errors } from '@/lib/services/errors'
import { createCustomerAudienceSignup } from '@/lib/services/customer-audience'
import type { CustomerAudienceSignupInput } from '@/lib/services/types'
import { readSignupPreferences } from '@/lib/sparkle-suite/jewelry-preferences'
import { loadPreferenceOptions } from '@/lib/sparkle-suite/load-preference-options'
import { createAdminClient } from '@/lib/supabase/admin'
import { dispatchWorkspaceMessageAutomationAfterResponse } from '@/lib/services/workspace-message-dispatch'

type SignupRequestBody = CustomerAudienceSignupInput & {
  favoriteStones?: unknown
  favoriteMaterials?: unknown
  favoriteCuts?: unknown
  favoriteCollections?: unknown
  ringSize?: unknown
  jewelryNotes?: unknown
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : ''
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

function readJsonList(body: Record<string, unknown>, ...keys: string[]) {
  const key = keys.find((candidate) => candidate in body)
  return key ? body[key] : undefined
}

function readFormList(formData: FormData, ...keys: string[]) {
  const key = keys.find((candidate) => formData.has(candidate))
  if (!key) return undefined
  return formData.getAll(key).map((value) => (typeof value === 'string' ? value : ''))
}

async function parseSignupPayload(request: Request): Promise<SignupRequestBody> {
  const contentType = request.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    const body = await request.json()
    const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}

    return {
      firstName: readString(record.firstName ?? record.first_name),
      lastName: readString(record.lastName ?? record.last_name),
      email: readString(record.email),
      phone: readString(record.phone),
      smsConsent: readBoolean(record.smsConsent ?? record.sms_consent),
      emailConsent: readBoolean(record.emailConsent ?? record.email_consent),
      marketingConsent: readBoolean(
        record.marketingConsent ?? record.marketing_consent,
      ),
      address: readString(record.address),
      birthday: readString(record.birthday),
      favoriteGemOrStone: readString(
        record.favoriteGemOrStone ?? record.favorite_gem_or_stone,
      ),
      favoriteMaterial: readString(record.favoriteMaterial ?? record.favorite_material),
      favoriteCut: readString(record.favoriteCut ?? record.favorite_cut),
      favoriteCollection: readString(
        record.favoriteCollection ?? record.favorite_collection,
      ),
      favoriteStones: readJsonList(record, 'favoriteStones', 'favorite_stones'),
      favoriteMaterials: readJsonList(record, 'favoriteMaterials', 'favorite_materials'),
      favoriteCuts: readJsonList(record, 'favoriteCuts', 'favorite_cuts'),
      favoriteCollections: readJsonList(
        record,
        'favoriteCollections',
        'favorite_collections',
      ),
      ringSize: readJsonList(record, 'ringSize', 'ring_size'),
      jewelryNotes: readJsonList(record, 'jewelryNotes', 'jewelry_notes'),
    }
  }

  const formData = await request.formData()

  return {
    firstName: readString(formData.get('first_name') ?? formData.get('firstName')),
    lastName: readString(formData.get('last_name') ?? formData.get('lastName')),
    email: readString(formData.get('email')),
    phone: readString(formData.get('phone')),
    smsConsent: readBoolean(
      formData.get('sms_consent') ?? formData.get('smsConsent'),
    ),
    emailConsent: readBoolean(
      formData.get('email_consent') ?? formData.get('emailConsent'),
    ),
    marketingConsent: readBoolean(
      formData.get('marketing_consent') ?? formData.get('marketingConsent'),
    ),
    address: readString(formData.get('address')),
    birthday: readString(formData.get('birthday')),
    favoriteGemOrStone: readString(
      formData.get('favoriteGemOrStone') ?? formData.get('favorite_gem_or_stone'),
    ),
    favoriteMaterial: readString(
      formData.get('favoriteMaterial') ?? formData.get('favorite_material'),
    ),
    favoriteCut: readString(formData.get('favoriteCut') ?? formData.get('favorite_cut')),
    favoriteCollection: readString(
      formData.get('favoriteCollection') ?? formData.get('favorite_collection'),
    ),
    favoriteStones: readFormList(formData, 'favoriteStones', 'favorite_stones'),
    favoriteMaterials: readFormList(formData, 'favoriteMaterials', 'favorite_materials'),
    favoriteCuts: readFormList(formData, 'favoriteCuts', 'favorite_cuts'),
    favoriteCollections: readFormList(
      formData,
      'favoriteCollections',
      'favorite_collections',
    ),
    ringSize: formData.has('ringSize')
      ? formData.get('ringSize')
      : formData.has('ring_size')
        ? formData.get('ring_size')
        : undefined,
    jewelryNotes: formData.has('jewelryNotes')
      ? formData.get('jewelryNotes')
      : formData.has('jewelry_notes')
        ? formData.get('jewelry_notes')
        : undefined,
  }
}

function logSignupSaveError(error: unknown) {
  const record =
    error && typeof error === 'object'
      ? (error as { code?: unknown; message?: unknown })
      : {}
  const code =
    typeof record.code === 'string' && /^[A-Z0-9]{1,10}$/.test(record.code)
      ? record.code
      : 'unknown'
  const message = typeof record.message === 'string' ? record.message : ''
  const constraint = message.match(/constraint "([a-z0-9_]+)"/i)?.[1] ?? null
  console.error('[amethyst/customer-audience] save failed', { code, constraint })
}

export async function POST(request: Request) {
  try {
    const payload = await parseSignupPayload(request)
    const loaded = await loadPreferenceOptions()
    const preferences = readSignupPreferences(payload, loaded.options)
    if (!preferences.ok) {
      throw errors.INVALID_INPUT(preferences.detail, preferences.message)
    }

    const admin = createAdminClient()
    const target = resolveAmethystRequestTarget(request)
    const rep = await resolveAmethystPreviewRep(admin, {
      env: process.env,
      publicSiteSlug: target.publicSiteSlug,
      repId: target.repId ?? target.customDomain,
      select: 'id, email',
    })

    if (!rep?.id) {
      return NextResponse.json(
        { error: 'Signup is temporarily unavailable right now.' },
        { status: 503 },
      )
    }

    await createCustomerAudienceSignup(admin, rep.id, {
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      phone: payload.phone,
      smsConsent: payload.smsConsent,
      emailConsent: payload.emailConsent,
      marketingConsent: payload.marketingConsent,
      address: payload.address,
      birthday: payload.birthday,
      favoriteGemOrStone: payload.favoriteGemOrStone,
      favoriteMaterial: payload.favoriteMaterial,
      favoriteCut: payload.favoriteCut,
      favoriteCollection: payload.favoriteCollection,
      notes: payload.notes,
      tags: payload.tags,
      preferencePicks: preferences.picks,
    })
    dispatchWorkspaceMessageAutomationAfterResponse({
      supabase: admin,
      source: 'customer_signup',
    })

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 })
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

    logSignupSaveError(error)
    return NextResponse.json(
      { error: 'Failed to save signup right now.' },
      { status: 500 },
    )
  }
}
