import { NextResponse } from 'next/server'
import { createMaintenanceClient } from '@/lib/services/swap-maintenance-client'
import { runSwapMaintenance, swapMaintenanceScope, validBearer } from '@/lib/services/swap-maintenance'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(request: Request) {
  const url = new URL(request.url)
  const scope = swapMaintenanceScope(url.href)
  if (!scope || url.search || request.body !== null) return NextResponse.json({ error:'invalid maintenance context' },{status:403})
  const secret = scope.runId ? process.env.SPARKLE_SWAP_MAINTENANCE_SMOKE_SECRET : process.env.SPARKLE_SWAP_MAINTENANCE_CRON_SECRET
  if (!validBearer(request,secret) || (request.headers.get('x-swap-review-run') ?? null) !== scope.runId) {
    return NextResponse.json({error:'unauthorized'},{status:401})
  }
  try {
    const result = await runSwapMaintenance(createMaintenanceClient(Date.now()+20_000),scope)
    return NextResponse.json(result,{status:result.ok?200:503,headers:{'Cache-Control':'no-store'}})
  } catch { return NextResponse.json({ok:false,job:'swap-maintenance'},{status:503}) }
}
