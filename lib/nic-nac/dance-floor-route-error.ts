import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/nic-nac/auth'
import { ServiceError } from '@/lib/services/errors'
export function danceFloorRouteError(error: unknown) {
  if (error instanceof AuthError) return NextResponse.json({ code: 'UNAUTHENTICATED', error: 'unauthenticated' }, { status: 401 })
  if (error instanceof ServiceError) return NextResponse.json({ code: error.code, error: error.userMessage }, { status: error.statusCode })
  if (error instanceof SyntaxError) return NextResponse.json({ code: 'INVALID_INPUT', error: 'Invalid request payload.' }, { status: 400 })
  return NextResponse.json({ code: 'DANCE_FLOOR_UPDATE_FAILED', error: "Couldn't update that dancer. Try again." }, { status: 500 })
}
