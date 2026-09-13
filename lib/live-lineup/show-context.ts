import 'server-only'
import { getPaidNicNacContext } from '@/lib/nic-nac/auth'
import { getOperatorSupportRequestContext } from '@/lib/operator-support/request-context'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEffectiveLiveQueueSnapshot, LineupServiceError } from './service'

/** Re-authorize the tool's tenant before projecting private v2 state through an admin client. */
export async function loadOwnedShowLineup(expectedRepId: string) {
  const context = await getPaidNicNacContext()
  if (context.repId !== expectedRepId) throw new LineupServiceError('tenant_mismatch', 403)
  // Support's scoped client has its own capabilities/audit path. Never silently escalate it.
  if (getOperatorSupportRequestContext()) throw new LineupServiceError('support_scope_not_enabled', 403)
  return { repId: context.repId, snapshot: await getEffectiveLiveQueueSnapshot(createAdminClient(), context.repId) }
}
