import { after, NextResponse } from 'next/server'
import { AuthError, getPaidNicNacContext } from '@/lib/nic-nac/auth'
import { flushLookPreview, processLookPreview } from '@/lib/look-preview/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST() {
  try {
    const { repId } = await getPaidNicNacContext()
    const flushed = await flushLookPreview(repId)
    if (!flushed.skipped) {
      after(async () => {
        await processLookPreview(repId, { flush: true }).catch(() => undefined)
      })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }
    return NextResponse.json({ ok: true })
  }
}
