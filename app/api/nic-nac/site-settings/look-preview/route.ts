import { after, NextResponse } from 'next/server'
import { AuthError, getPaidNicNacContext } from '@/lib/nic-nac/auth'
import { flushLookPreview, processLookPreview, readLookPreview } from '@/lib/look-preview/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET() {
  try {
    const { repId } = await getPaidNicNacContext()
    const lookPreview = await readLookPreview(repId)
    return NextResponse.json({ lookPreview })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }
    return NextResponse.json({ lookPreview: null })
  }
}

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
