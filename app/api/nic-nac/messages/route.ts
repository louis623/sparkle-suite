import { NextResponse } from 'next/server'
import { getPaidNicNacContext, AuthError } from '@/lib/nic-nac/auth'
import { ServiceError } from '@/lib/services/errors'
import {
  updateRepWorkspaceMessageDelivery,
} from '@/lib/services/workspace-messages'
import { listRepWorkspaceInbox } from '@/lib/services/workspace-inbox'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  WORKSPACE_MESSAGE_CATEGORIES,
  type WorkspaceMessageCategory,
} from '@/lib/services/workspace-message-permissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function readLimit(url: URL) {
  const raw = url.searchParams.get('limit')
  if (!raw) return 25
  if (!/^\d+$/.test(raw)) return null
  const parsed = Number.parseInt(raw, 10)
  return parsed >= 1 && parsed <= 100 ? parsed : null
}

function readBoolean(value: string | null) {
  if (value === null) return false
  if (value === 'true') return true
  if (value === 'false') return false
  return null
}

function readCategory(value: string | null) {
  if (!value) return undefined
  return WORKSPACE_MESSAGE_CATEGORIES.includes(value as WorkspaceMessageCategory)
    ? (value as WorkspaceMessageCategory)
    : null
}

function serviceErrorResponse(error: ServiceError) {
  return NextResponse.json(
    { code: error.code, error: error.userMessage },
    { status: error.statusCode },
  )
}

function methodNotAllowed() {
  return NextResponse.json(
    {
      code: 'REP_MESSAGE_CENTER_RECEIVE_ONLY',
      error: 'The rep Message Center is receive-only.',
    },
    { status: 405, headers: { Allow: 'GET, PATCH' } },
  )
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const limit = readLimit(url)
    const category = readCategory(url.searchParams.get('category'))
    const unreadOnly = readBoolean(url.searchParams.get('unread'))
    const archived = readBoolean(url.searchParams.get('archived'))
    const cursor = url.searchParams.get('cursor')?.trim() || undefined
    const search = url.searchParams.get('search')?.trim() || undefined
    if (search && (search.length < 2 || search.length > 80)) {
      return NextResponse.json({ error: 'Search must be between 2 and 80 characters.' }, { status: 400 })
    }

    if (limit === null) {
      return NextResponse.json(
        { error: 'limit must be a whole number between 1 and 100.' },
        { status: 400 },
      )
    }
    if (category === null) {
      return NextResponse.json({ error: 'category is invalid.' }, { status: 400 })
    }
    if (unreadOnly === null || archived === null) {
      return NextResponse.json(
        { error: 'unread and archived must be true or false.' },
        { status: 400 },
      )
    }

    const viewValue = url.searchParams.get('view')
    const view = viewValue && ['all', 'team', 'rep_network', 'support', 'sparkle_suite', 'archived', 'needs_reply'].includes(viewValue)
      ? viewValue as 'all' | 'team' | 'rep_network' | 'support' | 'sparkle_suite' | 'archived' | 'needs_reply'
      : viewValue ? null : 'all'
    if (view === null) return NextResponse.json({ error: 'view is invalid.' }, { status: 400 })
    const { repId } = await getPaidNicNacContext()
    const result = await listRepWorkspaceInbox(createAdminClient(), repId, {
      limit,
      cursor,
      category,
      unreadOnly,
      archived,
      view,
      search,
    })
    return NextResponse.json(result)
  } catch (error) {
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
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 })
    }
    const deliveryId =
      typeof body.deliveryId === 'string' ? body.deliveryId.trim() : ''
    const read = body.read
    const archived = body.archived
    if (
      !deliveryId ||
      (read === undefined && archived === undefined) ||
      (read !== undefined && typeof read !== 'boolean') ||
      (archived !== undefined && typeof archived !== 'boolean')
    ) {
      return NextResponse.json(
        {
          error:
            'deliveryId and at least one boolean read or archived state are required.',
        },
        { status: 400 },
      )
    }

    const { repId, supabase } = await getPaidNicNacContext()
    const result = await updateRepWorkspaceMessageDelivery(supabase, repId, {
      deliveryId,
      read,
      archived,
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

export async function POST() {
  return methodNotAllowed()
}

export async function PUT() {
  return methodNotAllowed()
}

export async function DELETE() {
  return methodNotAllowed()
}
