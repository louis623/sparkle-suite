import { listLineupArchives, readLineupArchive, recoverLineupArchive } from '@/lib/live-lineup/archive-recovery'
import { lineupFailure, lineupJson, readLineupJson, workspaceLineupContext } from '@/lib/live-lineup/http'
import { liveLineupOwnerMutationsAvailable } from '@/lib/live-lineup/runtime-mode'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function generationParameter(value: string | null): number | null {
  if (value === null || !/^(0|[1-9][0-9]*)$/.test(value)) return null
  const number = Number(value)
  return Number.isSafeInteger(number) ? number : null
}

export async function GET(request: Request) {
  try {
    const { db, repId } = await workspaceLineupContext()
    const parameters = new URL(request.url).searchParams
    // No caller-controlled tenant, free-form filters, or unbounded history reads.
    if ([...parameters.keys()].some(key => key !== 'generation' && key !== 'beforeGeneration')
      || parameters.getAll('generation').length > 1 || parameters.getAll('beforeGeneration').length > 1
      || (parameters.has('generation') && parameters.has('beforeGeneration'))) {
      return lineupJson({error:'invalid_archive_page'}, 400)
    }
    if (parameters.has('generation')) {
      const generation = generationParameter(parameters.get('generation'))
      if (generation === null) return lineupJson({error:'invalid_archive_generation'}, 400)
      return lineupJson(await readLineupArchive(db, repId, generation))
    }
    const beforeGeneration = parameters.has('beforeGeneration') ? generationParameter(parameters.get('beforeGeneration')) : undefined
    if (beforeGeneration === null) return lineupJson({error:'invalid_archive_page'}, 400)
    return lineupJson(await listLineupArchives(db, repId, {beforeGeneration, limit:10}))
  } catch (error) { return lineupFailure(error) }
}

export async function POST(request: Request) {
  try {
    const { db, repId } = await workspaceLineupContext(request)
    if (!liveLineupOwnerMutationsAvailable()) return lineupJson({ error: 'live_lineup_read_only' }, 503)
    const body = await readLineupJson(request, 524_288)
    return lineupJson(await recoverLineupArchive(db, repId, body))
  } catch (error) { return lineupFailure(error) }
}
