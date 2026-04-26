// Guardian telemetry — write-side helpers for thumper_incidents and
// tool_executions. Both write through createAdminClient() (RLS on those
// tables is service-role-only). Both swallow internal errors so a
// telemetry failure never throws into the request path.

import { createAdminClient } from '@/lib/supabase/admin'

type Severity = 'info' | 'warn' | 'error' | 'critical'

export async function logIncident(args: {
  errorType: string
  repId?: string | null
  conversationId?: string | null
  severity: Severity
  details?: Record<string, unknown>
}): Promise<void> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('thumper_incidents').insert({
      error_type: args.errorType,
      rep_id: args.repId ?? null,
      conversation_id: args.conversationId ?? null,
      severity: args.severity,
      details: args.details ?? null,
    })
    if (error) {
      console.error('[guardian] logIncident insert failed:', error)
    }
  } catch (err) {
    console.error('[guardian] logIncident exception:', err)
  }
}

export async function logToolExecution(args: {
  toolName: string
  repId: string
  conversationId: string
  success: boolean
  durationMs: number
  errorMessage?: string
  argsHash?: string
}): Promise<void> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('tool_executions').insert({
      tool_name: args.toolName,
      rep_id: args.repId,
      conversation_id: args.conversationId,
      success: args.success,
      duration_ms: args.durationMs,
      error_message: args.errorMessage ?? null,
      args_hash: args.argsHash ?? null,
    })
    if (error) {
      console.error('[guardian] logToolExecution insert failed:', error)
    }
  } catch (err) {
    console.error('[guardian] logToolExecution exception:', err)
  }
}
