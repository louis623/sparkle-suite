import { NextResponse } from 'next/server'
import { getAuthenticatedThumperContext, AuthError } from '@/lib/thumper/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { rep } = await getAuthenticatedThumperContext()
    return NextResponse.json({
      rep: { id: rep.id, email: rep.email, display_name: rep.display_name },
    })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }
    throw err
  }
}
