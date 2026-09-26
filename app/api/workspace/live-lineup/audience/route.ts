import { lineupFailure, lineupJson, readLineupJson, workspaceLineupContext } from '@/lib/live-lineup/http'
import { readLineupState, LineupServiceError } from '@/lib/live-lineup/service'
import { buildWorkspaceLineupSnapshot } from '@/lib/live-lineup/model'
import { eligibleAudienceIdentity } from '@/lib/live-lineup/audience'
import { matchLineupAudience } from '@/lib/services/customer-audience'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { db, repId } = await workspaceLineupContext(request)
    const body = await readLineupJson(request, 524288, 3000) as {generation?: unknown; identities?: unknown}
    if (!body || !Number.isSafeInteger(body.generation) || !Array.isArray(body.identities) || body.identities.length > 2000
      || body.identities.some(e => !e || typeof e.id !== 'string' || typeof e.sourceIdentityVersion !== 'string')
      || new Set(body.identities.map(e => e.id)).size !== body.identities.length) return lineupJson({error:'invalid_payload'},400)
    const state = await readLineupState(db, repId)
    if (!state || (state.show?.generation ?? 0) !== body.generation) throw new LineupServiceError('show_changed',409)
    const snapshot = buildWorkspaceLineupSnapshot(state, Date.now(), true)
    const requested = new Map(body.identities.map(e => [e.id,e.sourceIdentityVersion]))
    const entries = snapshot.entries.filter(e => requested.has(e.id))
    if (entries.length !== requested.size || entries.some(e => !eligibleAudienceIdentity(e) || requested.get(e.id) !== e.sourceIdentityVersion))
      throw new LineupServiceError('identity_changed',409)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 2500)
    try {
      const result = await matchLineupAudience(db,repId,entries,controller.signal)
      // A show/identity change during the bounded query invalidates its private result.
      const latest = await readLineupState(db, repId)
      if (!latest || (latest.show?.generation ?? 0) !== body.generation
        || entries.some(entry => !latest.order.includes(entry.id) || !latest.entries.some(current => current.id === entry.id
          && current.identityEligible === true && current.sourceIdentityVersion === entry.sourceIdentityVersion
          && current.name === entry.name && current.lastName === entry.lastName))) throw new LineupServiceError('identity_changed',409)
      return lineupJson({tenantContext:repId,generation:body.generation,...result})
    } finally { clearTimeout(timer) }
  } catch (error) { return lineupFailure(error) }
}
