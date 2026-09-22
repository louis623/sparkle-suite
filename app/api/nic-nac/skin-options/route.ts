import { NextResponse } from 'next/server'
import { AuthError, getAuthenticatedNicNacContext } from '@/lib/nic-nac/auth'
import { getAvailableAmethystSkinIdsForRep } from '@/lib/amethyst/skin-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { repId, supabase } = await getAuthenticatedNicNacContext()
    const skinIds = await getAvailableAmethystSkinIdsForRep(supabase, repId)
    return NextResponse.json({ skinIds })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Unable to load customer-site themes.' },
      { status: 500 },
    )
  }
}
