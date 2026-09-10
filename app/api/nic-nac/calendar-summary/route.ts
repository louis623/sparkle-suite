import { NextResponse } from 'next/server'
import { listMyShows } from '@/lib/services/calendar'
import {
  getPaidNicNacContext,
  AuthError,
} from '@/lib/nic-nac/auth'
import { ServiceError } from '@/lib/services/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_CALENDAR_SUMMARY_LIMIT = 180
const WHOLE_NUMBER_PATTERN = /^[1-9]\d*$/

function readLimit(url: URL, key: string) {
  const raw = url.searchParams.get(key)
  if (!raw) return undefined
  if (!WHOLE_NUMBER_PATTERN.test(raw)) return null

  const parsed = Number(raw)
  if (!Number.isSafeInteger(parsed) || parsed > MAX_CALENDAR_SUMMARY_LIMIT) {
    return null
  }

  return parsed
}

function limitError(key: string) {
  return `${key} must be a whole number between 1 and ${MAX_CALENDAR_SUMMARY_LIMIT}.`
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const upcomingLimit = readLimit(url, 'upcoming')
    const historyLimit = readLimit(url, 'history')

    if (upcomingLimit === null) {
      return NextResponse.json(
        { error: limitError('upcoming') },
        { status: 400 },
      )
    }

    if (historyLimit === null) {
      return NextResponse.json(
        { error: limitError('history') },
        { status: 400 },
      )
    }

    const { repId, supabase } = await getPaidNicNacContext()
    const [upcomingResult, recentResult] = await Promise.all([
      listMyShows(supabase, repId, {
        upcoming: true,
        limit: upcomingLimit ?? 8,
      }),
      listMyShows(supabase, repId, {
        upcoming: false,
        pastOnly: true,
        limit: historyLimit ?? 4,
        status: ['completed', 'cancelled'],
      }),
    ])

    return NextResponse.json({
      upcomingEvents: upcomingResult.events,
      recentEvents: recentResult.events,
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.userMessage, code: error.code },
        { status: error.statusCode },
      )
    }

    throw error
  }
}
