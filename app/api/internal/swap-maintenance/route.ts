import { NextResponse } from 'next/server'
import { createMaintenanceClient } from '@/lib/services/swap-maintenance-client'
import { runSwapMaintenance, swapMaintenanceScope, validBearer } from '@/lib/services/swap-maintenance'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(request: Request) {
  const url = new URL(request.url)
  const scope = swapMaintenanceScope(url.href)
  if (!scope || url.search) return NextResponse.json({ error:'invalid maintenance context' },{status:403})
  const secret = scope.runId ? process.env.SPARKLE_SWAP_MAINTENANCE_SMOKE_SECRET : process.env.SPARKLE_SWAP_MAINTENANCE_CRON_SECRET
  if (!validBearer(request,secret) || (request.headers.get('x-swap-review-run') ?? null) !== scope.runId) {
    return NextResponse.json({error:'unauthorized'},{status:401})
  }
  // Deployed POST adapters may represent a bodyless request as an empty stream.
  // Authenticate before reading, reject any payload and bound the read deadline.
  if (request.body) {
    const reader = request.body.getReader()
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      const empty = (async () => {
        while (true) {
          const part = await reader.read()
          if (part.done) return true
          if (part.value.byteLength) return false
        }
      })()
      const timeout = new Promise<boolean>(resolve => { timer = setTimeout(() => resolve(false), 1000) })
      if (!(await Promise.race([empty, timeout]))) return NextResponse.json({error:'invalid maintenance context'},{status:403})
    } catch {
      return NextResponse.json({error:'invalid maintenance context'},{status:403})
    } finally {
      clearTimeout(timer)
      void reader.cancel().catch(() => {})
    }
  }
  try {
    const result = await runSwapMaintenance(createMaintenanceClient(Date.now()+20_000),scope)
    return NextResponse.json(result,{status:result.ok?200:503,headers:{'Cache-Control':'no-store'}})
  } catch { return NextResponse.json({ok:false,job:'swap-maintenance'},{status:503}) }
}
