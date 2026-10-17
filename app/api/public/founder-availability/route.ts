import { getFounderAvailability } from '@/lib/sparkle-suite/founder-availability-service'
import { isSuiteSmokeEnvironment, readLiveFounderAvailability } from '@/lib/sparkle-suite/live-founder-availability'
import { toPublicFounderAvailability } from '@/lib/sparkle-suite/public-founder-availability'

export const dynamic = 'force-dynamic'

// Anonymous endpoint: status only. The slot count stays server-side.
export async function GET() {
  const availability = toPublicFounderAvailability(isSuiteSmokeEnvironment()
    ? await readLiveFounderAvailability()
    : await getFounderAvailability())
  return Response.json(availability, {
    status: availability.status === 'unavailable' ? 503 : 200,
    headers: { 'Cache-Control': 'no-store' },
  })
}
