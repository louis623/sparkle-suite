import { NextResponse } from 'next/server'

import {
  buildBuildListSignupWebhookPayload,
  notifyBuildListSignupAfterResponse,
} from '@/lib/prelaunch/build-list-webhook'
import {
  buildPrelaunchWaitlistInsert,
  parsePrelaunchWaitlistInput,
} from '@/lib/prelaunch/waitlist'
import { assertPrelaunchRequestAllowed } from '@/lib/prelaunch/request-guard'
import {
  sendPrelaunchWaitlistWelcomeEmail,
  type PrelaunchWaitlistWelcomeEmailResult,
} from '@/lib/prelaunch/waitlist-email'
import { ServiceError } from '@/lib/services/errors'
import { createAdminClient } from '@/lib/supabase/admin'

function buildWelcomeEmailPatch(result: PrelaunchWaitlistWelcomeEmailResult) {
  return {
    welcome_email_status: result.status,
    welcome_email_provider_id:
      result.status === 'sent' ? result.providerId : null,
    welcome_email_error:
      result.status === 'failed'
        ? result.error
        : result.status === 'skipped'
          ? result.reason
          : null,
    welcome_email_sent_at: result.status === 'sent' ? new Date().toISOString() : null,
  }
}

async function recordWelcomeEmailStatus(
  waitlistId: string,
  result: PrelaunchWaitlistWelcomeEmailResult,
) {
  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from('sparkle_suite_waitlist')
      .update(buildWelcomeEmailPatch(result))
      .eq('id', waitlistId)

    if (error) throw error
  } catch (error) {
    console.error('[prelaunch/waitlist] Failed to record welcome email:', error)
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    assertPrelaunchRequestAllowed({
      formName: 'waitlist',
      payload,
      request,
    })
    const insert = buildPrelaunchWaitlistInsert(
      parsePrelaunchWaitlistInput(payload),
    )
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('sparkle_suite_waitlist')
      .insert(insert)
      .select('id, name, email, created_at')
      .single()

    if (error || !data?.id) {
      throw error ?? new Error('WAITLIST_INSERT_RETURNED_NO_ROW')
    }

    const welcomeEmail = await sendPrelaunchWaitlistWelcomeEmail({
      email: data.email,
      name: data.name,
    })
    await recordWelcomeEmailStatus(data.id, welcomeEmail)

    notifyBuildListSignupAfterResponse(
      buildBuildListSignupWebhookPayload(data),
    )

    return NextResponse.json(
      { ok: true, welcomeEmail: { status: welcomeEmail.status } },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid request payload.' },
        { status: 400 },
      )
    }

    if (error instanceof ServiceError) {
      return NextResponse.json(
        { code: error.code, error: error.userMessage },
        { status: error.statusCode },
      )
    }

    console.error('[prelaunch/waitlist] Error:', error)
    return NextResponse.json(
      { error: 'Failed to save your waitlist spot right now.' },
      { status: 500 },
    )
  }
}
