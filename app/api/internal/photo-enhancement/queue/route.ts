import { NextResponse } from 'next/server'
import { processReadyPhotoEnhancementQueue } from '@/lib/services/photo-enhancement-queue'
import { sweepTickets, sweepScreenshots, swapMaintenanceScope, validBearer } from '@/lib/services/swap-maintenance'
import { createAdminClient } from '@/lib/supabase/admin'
import { createMaintenanceClient } from '@/lib/services/swap-maintenance-client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return NextResponse.json({error:'photo queue cron secret is not configured.'},{status:503})
  if (!validBearer(request,secret)) return NextResponse.json({error:'unauthorized'},{status:401})
  const url = new URL(request.url)
  const raw = url.searchParams.get('limit') ?? '25'
  if (!/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(Number(raw))) return NextResponse.json({error:'limit must be a positive whole number.'},{status:400})
  // Vercel's existing daily cron can arrive on its platform-provided production alias.
  // The dedicated external scheduler still requires the exact public HTTPS origin.
  const platformHost = process.env.VERCEL_PROJECT_PRODUCTION_URL
  const verifiedPlatformOrigin = process.env.SPARKLE_ENVIRONMENT !== 'smoke'
    && platformHost && url.protocol === 'https:' && url.host === platformHost
  const scope = swapMaintenanceScope(
    verifiedPlatformOrigin ? 'https://www.yoursparklesuite.com' : url.href, process.env, false,
  )
  // Never run the global enhancement queue in a Smoke fixture namespace.
  if (process.env.SPARKLE_ENVIRONMENT === 'smoke' && (!scope?.runId || request.headers.get('x-swap-review-run') !== scope.runId)) {
    return NextResponse.json({error:'invalid Smoke review context'},{status:403})
  }
  if (!scope) return NextResponse.json({error:'invalid maintenance context'},{status:403})
  const deadline = Date.now()+20_000
  const admin = createMaintenanceClient(deadline)
  const dailyScope = scope
  const [tickets,screenshots,queue,expiry] = await Promise.allSettled([
    dailyScope ? sweepTickets(admin,dailyScope,25,deadline) : Promise.resolve(null),
    dailyScope ? sweepScreenshots(admin,dailyScope,25,deadline) : Promise.resolve(null),
    dailyScope.runId ? Promise.resolve(null) : processReadyPhotoEnhancementQueue(createAdminClient(),{limit:Number(raw)}),
    (async()=>{
      if (!dailyScope || (!dailyScope.runId && process.env.SPARKLE_SWAP_POLICY_ALERTS_ENABLED !== 'true')) return null
      const recipient = dailyScope.runId ? process.env.SPARKLE_SWAP_SMOKE_ALERT_REP_ID : process.env.SPARKLE_SWAP_OPERATOR_REP_ID
      if (!recipient) throw new Error('policy alert sink missing')
      const current = await admin.from('trade_request_photo_policy').select('generation').single()
      if (current.error) throw current.error
      const delivered = await admin.rpc('deliver_expired_trade_photo_policy',{
        p_rep_id:recipient, p_expected_generation:current.data.generation,
      })
      if (delivered.error) throw delivered.error
      return delivered.data
    })(),
  ])
  const failed = [tickets,screenshots,queue,expiry].some(step=>step.status==='rejected')
  return NextResponse.json({ok:!failed,
    result:queue.status==='fulfilled'?queue.value:null,
    tradeUploadTicketCleanup:tickets.status==='fulfilled'?tickets.value:null,
    tradeRequestScreenshotCleanup:screenshots.status==='fulfilled'?{removedCount:screenshots.value?.removed??0}:null,
    policyExpiry:expiry.status==='fulfilled'?expiry.value:null,
  },{status:failed?503:200})
}
