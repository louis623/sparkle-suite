import { LIVE_LINEUP_RELEASE } from '@/lib/live-lineup/release'
export const dynamic = 'force-dynamic'
/** Public release metadata only. No credentials, URLs, selectors or executable code. */
export async function GET() {
  return Response.json(LIVE_LINEUP_RELEASE, {headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})
}
