import { z } from 'zod'
import { workspaceLineupContext, readLineupJson, lineupJson, lineupFailure } from '@/lib/live-lineup/http'
import { readLineupState, LineupServiceError } from '@/lib/live-lineup/service'
import { buildWorkspaceLineupSnapshot } from '@/lib/live-lineup/model'
import { loadLineupCustomerCards } from '@/lib/live-lineup/customer-cards'
import { eligibleAudienceIdentity } from '@/lib/live-lineup/audience'
import { getCustomerAudienceMember } from '@/lib/services/customer-audience'
export const runtime='nodejs'
export const dynamic='force-dynamic'
const schema=z.object({action:z.enum(['inspect','resolve','create']),generation:z.number().int().nonnegative(),
 entryId:z.string().min(1).max(160),sourceIdentityVersion:z.string().min(1).max(100),
 customerId:z.string().uuid().optional(),newCustomerId:z.string().uuid().optional(),label:z.string().trim().min(1).max(80).optional()}).strict()
export async function POST(request:Request) {
 try {
  const {db,repId}=await workspaceLineupContext(request)
  const parsed=schema.safeParse(await readLineupJson(request))
  if(!parsed.success) return lineupJson({error:'invalid_payload'},400)
  const body=parsed.data
  const state=await readLineupState(db,repId)
  if(!state || state.show?.generation!==body.generation) throw new LineupServiceError('show_changed',409)
  const snapshot=buildWorkspaceLineupSnapshot(state,Date.now(),true)
  const entry=[...snapshot.entries,...snapshot.heldEntries].find(e=>e.id===body.entryId)
  if(!entry || !eligibleAudienceIdentity(entry) || entry.sourceIdentityVersion!==body.sourceIdentityVersion) throw new LineupServiceError('identity_changed',409)
  if(body.action!=='inspect' && !snapshot.canManage) throw new LineupServiceError('source_not_ready',409)
  const result=await loadLineupCustomerCards(db,repId,body.generation,[entry],{type:body.action,...body})
  const match=result.matches[0]
  const customer=match.audienceId ? await getCustomerAudienceMember(db,repId,match.audienceId) : null
  return lineupJson({match,customer})
 } catch(error) {return lineupFailure(error)}
}
