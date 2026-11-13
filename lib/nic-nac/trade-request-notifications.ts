import type { SupabaseClient } from '@supabase/supabase-js'
import type { TradeRequestNotificationSummary } from '@/lib/services/types'
import { buildTradeRequestCardPart, swapOfferLine } from './trade-request-card-parts'

export function buildTradeRequestNotificationText(summary: TradeRequestNotificationSummary) {
  return [
    `${summary.customerName} wants ${summary.listing.designName}`,
    swapOfferLine(summary),
    `[Review swap request](/nic-nac?tradeRequest=${encodeURIComponent(summary.requestId)})`,
  ].join('\n\n')
}

export async function notifyRepOfTradeRequest(supabase: SupabaseClient, summary: TradeRequestNotificationSummary) {
  const {error} = await supabase.rpc('rpc_notify_swap_request', {
    p_request_id: summary.requestId, p_rep_id: summary.repId,
    p_parts: [{type:'text', text:buildTradeRequestNotificationText(summary)}, buildTradeRequestCardPart(summary)],
  })
  if (error) throw error
}
