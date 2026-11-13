import {
  DEFAULT_FINDER_LIVE_SHOW_LIMIT,
  MAX_FINDER_LIVE_SHOW_LIMIT,
  listSparkleFinderLiveShows,
  parseSparkleFinderLimit,
} from '@/lib/sparkle-finder/public-api'
import { listFinderShowsV2, parseFinderShowFilters } from '@/lib/sparkle-finder/shows-v2'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const limit = parseSparkleFinderLimit(
    url.searchParams.get('limit'),
    DEFAULT_FINDER_LIVE_SHOW_LIMIT,
    MAX_FINDER_LIVE_SHOW_LIMIT,
  )
  if (limit === null) {
    return Response.json(
      { error: 'limit must be a positive whole number.' },
      { status: 400, headers: noStoreHeaders() },
    )
  }

  if (url.searchParams.get('contract') === 'v2') {
    const filters = parseFinderShowFilters(url.searchParams, limit)
    if (!filters) return Response.json({ error: 'Invalid shows filters.' }, { status: 400, headers: noStoreHeaders() })
    return Response.json(await listFinderShowsV2(filters), { headers: noStoreHeaders() })
  }

  const shows = await listSparkleFinderLiveShows({ limit })

  return Response.json(
    { shows },
    {
      headers: noStoreHeaders(),
    },
  )
}

function noStoreHeaders() {
  return {
    'cache-control': 'no-store',
  }
}
