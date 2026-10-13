import type { SupabaseClient } from '@supabase/supabase-js'
import { LineupServiceError } from './service'
import type { WorkspaceLineupEntry } from './types'
import { sanitizeLineupBirthday, sanitizeLineupLabel, sanitizeLineupPreference, type LineupAudienceMatch } from './audience'
export interface CustomerCardMatch extends LineupAudienceMatch {
 status: 'matched' | 'needs_clarification' | 'unavailable'
 audienceId: string | null
 label: string | null
 candidates: {id:string;name:string;label:string|null;createdAt:string}[]
}
function presentMatch(match: CustomerCardMatch, includeCandidates: boolean): CustomerCardMatch {
  const matched = match?.status === 'matched'
  const candidates = includeCandidates && Array.isArray(match?.candidates) ? match.candidates.flatMap(candidate => {
    if (!candidate || typeof candidate.id !== 'string') return []
    return [{ id: candidate.id, name: typeof candidate.name === 'string' ? candidate.name : '', label: sanitizeLineupLabel(candidate.label), createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : '' }]
  }) : []
  if (!matched || typeof match.audienceId !== 'string') {
    return { ...match, status: match?.status === 'needs_clarification' ? 'needs_clarification' : 'unavailable', audienceId: null, label: null, birthday: null, preferences: [], candidates }
  }
  return {
    ...match,
    status: 'matched',
    audienceId: typeof match.audienceId === 'string' ? match.audienceId : null,
    label: sanitizeLineupLabel(match.label),
    birthday: sanitizeLineupBirthday(match.birthday),
    preferences: (Array.isArray(match.preferences) ? match.preferences : []).map(sanitizeLineupPreference).filter(Boolean).slice(0, 4),
    candidates,
  }
}
export async function loadLineupCustomerCards(db: SupabaseClient, repId: string, generation: number, entries: WorkspaceLineupEntry[],
 action: {type?: 'read'|'inspect'|'resolve'|'create'; entryId?:string; customerId?:string; newCustomerId?:string; label?:string} = {}, signal?:AbortSignal) {
 const query = db.rpc('live_lineup_customer_cards', {p_rep_id:repId,p_generation:generation,
  p_identities:entries.map(e=>({id:e.id,sourceIdentityVersion:e.sourceIdentityVersion})),p_action:action.type ?? 'read',
  p_entry_id:action.entryId ?? null,p_customer_id:action.customerId ?? null,p_new_customer_id:action.newCustomerId ?? null,p_label:action.label ?? null})
 const {data,error} = await (signal ? query.abortSignal(signal) : query)
 if (error) {
  const code = ['show_changed','identity_changed','source_not_ready','invalid_customer','label_required','invalid_payload'].find(c=>error.message?.includes(c))
  throw new LineupServiceError(code ?? 'customer_cards_unavailable',code ? 409 : 503)
 }
 if (!data || typeof data.audienceVersion !== 'string' || !/^\d+$/.test(data.audienceVersion) || !Array.isArray(data.matches) || data.matches.length !== entries.length)
  throw new LineupServiceError('invalid_customer_receipt')
 const includeCandidates = (action.type ?? 'read') !== 'read'
 return { audienceVersion: data.audienceVersion, matches: (data.matches as CustomerCardMatch[]).map(match => presentMatch(match, includeCandidates)) }
}
