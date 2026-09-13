import { issuePublisher, listPublishers, revokePublisher } from '@/lib/live-lineup/service'
import { lineupFailure, lineupJson, readLineupJson, workspaceLineupContext } from '@/lib/live-lineup/http'
import { liveLineupOwnerMutationsAvailable } from '@/lib/live-lineup/runtime-mode'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET() {
  try { const { db, repId } = await workspaceLineupContext(); return lineupJson({ publishers: await listPublishers(db, repId) }) }
  catch (error) { return lineupFailure(error) }
}
export async function POST(request: Request) {
  try {
    const { db, repId } = await workspaceLineupContext(request)
    if (!liveLineupOwnerMutationsAvailable()) return lineupJson({ error: 'live_lineup_read_only' }, 503)
    const body = await readLineupJson(request) as { label?: unknown } | null
    return lineupJson(await issuePublisher(db, repId, body?.label), 201)
  } catch (error) { return lineupFailure(error) }
}
export async function DELETE(request: Request) {
  try {
    const { db, repId } = await workspaceLineupContext(request)
    const body = await readLineupJson(request) as { publisherId?: unknown } | null
    await revokePublisher(db, repId, body?.publisherId)
    return lineupJson({ ok: true })
  } catch (error) { return lineupFailure(error) }
}
