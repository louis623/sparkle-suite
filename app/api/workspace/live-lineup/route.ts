import { changeLineup, getWorkspaceLineup } from '@/lib/live-lineup/service'
import { lineupFailure, lineupJson, readLineupJson, workspaceLineupContext } from '@/lib/live-lineup/http'
import { liveLineupOwnerMutationsAvailable } from '@/lib/live-lineup/runtime-mode'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET() {
  try { const { db, repId } = await workspaceLineupContext(); return lineupJson(await getWorkspaceLineup(db, repId)) }
  catch (error) { return lineupFailure(error) }
}
export async function POST(request: Request) {
  try {
    const { db, repId } = await workspaceLineupContext(request)
    if (!liveLineupOwnerMutationsAvailable()) return lineupJson({ error: 'live_lineup_read_only' }, 503)
    const body = await readLineupJson(request, 524_288) as { expectedRevision?: unknown; command?: unknown } | null
    const command = body?.command
    if (!command || typeof command !== 'object' || Array.isArray(command)) return lineupJson({ error: 'invalid_payload' }, 400)
    return lineupJson(await changeLineup(db, repId, { ...command, expectedRevision: body?.expectedRevision }))
  } catch (error) { return lineupFailure(error) }
}
