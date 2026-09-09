import { NextResponse } from 'next/server'

import {
  CUSTOMER_WAITLIST_SELECT,
  normalizeCustomerWaitlistRow,
  type CustomerWaitlistRow,
} from '@/lib/prelaunch/customer-waitlist'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  AuthError,
  getControlCenterAccess,
  OperatorAuthError,
} from '@/lib/supabase/operator-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function errorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  if (error instanceof OperatorAuthError) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  console.error('[control-center/customer-waitlist] Error:', error)
  return NextResponse.json(
    { error: 'Unable to update the customer waitlist.' },
    { status: 500 },
  )
}

export async function POST(request: Request) {
  try {
    await getControlCenterAccess()
    const body = (await request.json()) as Record<string, unknown>
    const name = text(body.name)
    const email = text(body.email).toLowerCase()
    const phone = text(body.phone)
    const notes = text(body.notes)

    if (!name || !validEmail(email)) {
      return NextResponse.json(
        { error: 'A name and valid email are required.' },
        { status: 400 },
      )
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('sparkle_suite_waitlist')
      .insert({
        name,
        email,
        phone: phone || null,
        tiktok_handle: null,
        team_rep_name: null,
        setup_pain: null,
        sms_consent: false,
        email_consent: false,
        source: 'operator_manual',
        operator_notes: notes || null,
      })
      .select(CUSTOMER_WAITLIST_SELECT)
      .single()

    if (error || !data) throw error ?? new Error('Waitlist insert returned no row')
    return NextResponse.json(
      { lead: normalizeCustomerWaitlistRow(data as unknown as CustomerWaitlistRow) },
      { status: 201 },
    )
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const access = await getControlCenterAccess()
    const body = (await request.json()) as Record<string, unknown>
    const id = text(body.id)
    if (!id) {
      return NextResponse.json({ error: 'Waitlist entry is required.' }, { status: 400 })
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if ('notes' in body) update.operator_notes = text(body.notes) || null
    if ('accountActivated' in body) {
      const accountActivated = body.accountActivated === true
      update.account_activated_at = accountActivated ? new Date().toISOString() : null
      update.account_activated_by_rep_id = accountActivated ? access.operator.repId : null
    }

    if (Object.keys(update).length === 1) {
      return NextResponse.json({ error: 'No waitlist update was supplied.' }, { status: 400 })
    }

    const admin = createAdminClient()
    let query = admin
      .from('sparkle_suite_waitlist')
      .update(update)
      .eq('id', id)
    if(typeof body.expectedUpdatedAt==='string')query=query.eq('updated_at',body.expectedUpdatedAt)
    const {data,error}=await query.select(CUSTOMER_WAITLIST_SELECT).single()
    if(error?.code==='PGRST116'&&typeof body.expectedUpdatedAt==='string')return NextResponse.json({error:'This waitlist entry changed. Refresh it before saving.'},{status:409})

    if (error || !data) throw error ?? new Error('Waitlist update returned no row')
    return NextResponse.json({
      lead: normalizeCustomerWaitlistRow(data as unknown as CustomerWaitlistRow),
    })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function DELETE(request: Request) {
  try {
    await getControlCenterAccess()
    const body = (await request.json()) as Record<string, unknown>
    const id = text(body.id)
    if (!id) {
      return NextResponse.json({ error: 'Waitlist entry is required.' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: lead, error: readError } = await admin
      .from('sparkle_suite_waitlist')
      .select('id, name')
      .eq('id', id)
      .maybeSingle()

    if (readError) throw readError
    if (!lead) {
      return NextResponse.json({ error: 'Waitlist entry was not found.' }, { status: 404 })
    }
    let deletion = admin
      .from('sparkle_suite_waitlist')
      .delete()
      .eq('id', id)
    if(typeof body.expectedUpdatedAt==='string') {
      deletion=deletion.eq('updated_at',body.expectedUpdatedAt)
      const removed=await deletion.select('id').maybeSingle()
      if(removed.error)throw removed.error
      if(!removed.data)return NextResponse.json({error:'This waitlist entry changed. Refresh it before deleting.'},{status:409})
    } else {
      const {error:deleteError}=await deletion
      if(deleteError)throw deleteError
    }
    return NextResponse.json({ ok: true, id })
  } catch (error) {
    return errorResponse(error)
  }
}
