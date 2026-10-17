import { NextResponse } from 'next/server'

import { getNewPasswordValidationError } from '@/lib/auth/password-policy'
import { preparePrelaunchClientAccountForLaunchBuild } from '@/lib/prelaunch/client-account'
import { connectPrelaunchLaunchBuildToProductionRep } from '@/lib/prelaunch/production-roster'
import {
  AuthError,
  getAuthenticatedOperator,
  OperatorAuthError,
} from '@/lib/supabase/operator-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function readBoolean(value: unknown) {
  return value === true || value === 'true' || value === 'on'
}

function isJsonRequest(request: Request) {
  return (
    request.headers.get('content-type')?.includes('application/json') ?? false
  )
}

function sanitizeReturnTo(value: string) {
  if (value.startsWith('/control-center/intake')) return value
  return '/control-center/intake'
}

async function parsePayload(request: Request) {
  if (isJsonRequest(request)) {
    const body = (await request.json()) as Record<string, unknown>

    return {
      launchBuildId: readString(body.launchBuildId),
      repId: readString(body.repId),
      createClientAccount:
      readBoolean(body.createClientAccount) ||
      Boolean(readString(body.temporaryPassword)) ||
      Boolean(readString(body.temporaryPasswordConfirm)),
      temporaryPassword: readString(body.temporaryPassword),
      temporaryPasswordConfirm: readString(body.temporaryPasswordConfirm),
      notes: readString(body.notes),
      returnTo: '/control-center/intake',
      wantsJson: true,
    }
  }

  const form = await request.formData()

  return {
    launchBuildId: readString(form.get('launchBuildId')),
    repId: readString(form.get('repId')),
    createClientAccount:
      readBoolean(form.get('createClientAccount')) ||
      Boolean(readString(form.get('temporaryPassword'))) ||
      Boolean(readString(form.get('temporaryPasswordConfirm'))),
    temporaryPassword: readString(form.get('temporaryPassword')),
    temporaryPasswordConfirm: readString(
      form.get('temporaryPasswordConfirm'),
    ),
    notes: readString(form.get('notes')),
    returnTo: sanitizeReturnTo(readString(form.get('returnTo'))),
    wantsJson: false,
  }
}

export async function POST(request: Request) {
  try {
    const operator = await getAuthenticatedOperator()
    const payload = await parsePayload(request)

    if (!payload.launchBuildId) {
      return NextResponse.json(
        { error: 'launchBuildId is required.' },
        { status: 400 },
      )
    }

    let repId = payload.repId
    let clientAccount: Awaited<
      ReturnType<typeof preparePrelaunchClientAccountForLaunchBuild>
    > | null = null
    let build: Awaited<
      ReturnType<typeof connectPrelaunchLaunchBuildToProductionRep>
    >

    if (payload.createClientAccount) {
      if (!payload.temporaryPassword || !payload.temporaryPasswordConfirm) {
        return NextResponse.json(
          {
            error:
              'temporaryPassword and temporaryPasswordConfirm are required.',
          },
          { status: 400 },
        )
      }

      const passwordError = getNewPasswordValidationError(
        payload.temporaryPassword,
        payload.temporaryPasswordConfirm,
      )
      if (passwordError) {
        return NextResponse.json({ error: passwordError }, { status: 400 })
      }

      clientAccount = await preparePrelaunchClientAccountForLaunchBuild({
        launchBuildId: payload.launchBuildId,
        temporaryPassword: payload.temporaryPassword,
        temporaryPasswordConfirm: payload.temporaryPasswordConfirm,
        notes: payload.notes,
        operatorRepId: operator.repId,
      })
      repId = clientAccount.repId
      build = clientAccount.build
    } else {
      if (!repId) {
        return NextResponse.json(
          { error: 'repId is required.' },
          { status: 400 },
        )
      }

      build = await connectPrelaunchLaunchBuildToProductionRep({
        launchBuildId: payload.launchBuildId,
        repId,
        notes: payload.notes,
        operatorRepId: operator.repId,
      })
    }

    if (!payload.wantsJson) {
      return NextResponse.redirect(new URL(payload.returnTo, request.url), 303)
    }

    return NextResponse.json(
      clientAccount ? { ok: true, build, clientAccount } : { ok: true, build },
    )
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid request payload.' },
        { status: 400 },
      )
    }
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }
    if (error instanceof OperatorAuthError) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    console.error('[control-center/intake/production-roster] Error:', error)
    return NextResponse.json(
      { error: 'Failed to connect this production roster entry.' },
      { status: 500 },
    )
  }
}
