import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getPaidNicNacContext, AuthError } from '@/lib/nic-nac/auth'
import { assertValidTimeZone } from '@/lib/services/calendar-timezone'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({ timeZone: z.string().min(1).max(80) })

export async function PATCH(request: Request) {
  try {
    const { timeZone: rawTimeZone } = bodySchema.parse(await request.json())
    const timeZone = assertValidTimeZone(rawTimeZone)
    const { repId, supabase } = await getPaidNicNacContext()
    const { data, error } = await supabase
      .from('reps')
      .update({ time_zone: timeZone, updated_at: new Date().toISOString() })
      .eq('id', repId)
      .select('time_zone')
      .single()
    if (error || !data) throw error ?? new Error('timezone update returned no rep')
    return NextResponse.json({ timeZone: data.time_zone })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }
    if (error instanceof z.ZodError || error instanceof Error) {
      return NextResponse.json(
        { error: 'Choose a supported geographic time zone.' },
        { status: 400 },
      )
    }
    throw error
  }
}
