import { lineupFailure, lineupJson, workspaceLineupContext } from '@/lib/live-lineup/http'
import { readLineupSetupReadiness } from '@/lib/live-lineup/setup-readiness'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET() {
  try {
    const { db, repId } = await workspaceLineupContext()
    return lineupJson(await readLineupSetupReadiness(db, repId))
  } catch (error) { return lineupFailure(error) }
}
