import { getFounderAvailability } from '@/lib/sparkle-suite/founder-availability-service'
import { isSuiteSmokeEnvironment, readLiveFounderAvailability } from '@/lib/sparkle-suite/live-founder-availability'

export const dynamic = 'force-dynamic'

export async function GET() {
  const availability = isSuiteSmokeEnvironment()
    ? await readLiveFounderAvailability()
    : await getFounderAvailability()
  return Response.json(availability, {
    status: availability.status === 'unavailable' ? 503 : 200,
    headers: { 'Cache-Control': 'no-store' },
  })
}
