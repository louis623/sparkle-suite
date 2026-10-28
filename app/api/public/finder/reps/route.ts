import {
  applyPublicFinderRepFeedFields,
  loadPublicFinderRepFeedSources,
} from '@/app/api/public/finder/reps/feed-fields'
import {
  DEFAULT_FINDER_REP_DIRECTORY_LIMIT,
  MAX_FINDER_REP_DIRECTORY_LIMIT,
  listSparkleFinderPublicReps,
  parseSparkleFinderLimit,
} from '@/lib/sparkle-finder/public-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_QUERY_LENGTH = 100

export async function GET(request: Request) {
  const url = new URL(request.url)
  const limit = parseSparkleFinderLimit(
    url.searchParams.get('limit'),
    DEFAULT_FINDER_REP_DIRECTORY_LIMIT,
    MAX_FINDER_REP_DIRECTORY_LIMIT,
  )
  if (limit === null) {
    return Response.json(
      { error: 'limit must be a positive whole number.' },
      { status: 400, headers: noStoreHeaders() },
    )
  }

  const query = url.searchParams.get('query')?.trim() ?? ''
  if (query.length > MAX_QUERY_LENGTH) {
    return Response.json(
      { error: `query must be ${MAX_QUERY_LENGTH} characters or fewer.` },
      { status: 400, headers: noStoreHeaders() },
    )
  }

  try {
    const directoryReps = await listSparkleFinderPublicReps({
      limit,
      query: query || undefined,
    })
    const sources = await loadPublicFinderRepFeedSources(
      directoryReps.map((rep) => rep.repId),
    )
    const reps = applyPublicFinderRepFeedFields(directoryReps, sources)

    return Response.json(
      {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        reps,
        nextCursor: null,
      },
      { headers: noStoreHeaders() },
    )
  } catch (error) {
    console.error('[sparkle-finder/reps] Public rep directory failed:', error)
    return Response.json(
      { error: 'Rep directory is temporarily unavailable.' },
      { status: 503, headers: noStoreHeaders() },
    )
  }
}

function noStoreHeaders() {
  return {
    'cache-control': 'no-store',
  }
}
