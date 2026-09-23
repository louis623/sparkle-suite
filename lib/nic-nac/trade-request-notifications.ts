import { randomUUID } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { TradeRequestNotificationSummary } from '@/lib/services/types'
import { getLatestConversationId } from '@/lib/nic-nac/persistence'
import { buildTradeRequestCardPart } from '@/lib/nic-nac/trade-request-card-parts'

export function buildTradeRequestNotificationText(
  summary: TradeRequestNotificationSummary,
) {
  const requestedItem = summary.listing.itemNumber
    ? `${summary.listing.designName} (${summary.listing.itemNumber})`
    : `${summary.listing.designName}${
        summary.listing.listingSource === 'non_item_number'
          ? ' (non-item number piece)'
          : ''
      }`
  const collectionLine = summary.listing.collectionName
    ? `${summary.listing.collectionName} / ${summary.listing.typePrefix}`
    : summary.listing.typePrefix

  return [
    `New trade request from ${summary.customerName} for ${requestedItem}.`,
    `They offered: ${summary.customerDescription}`,
    summary.revealScreenshot
      ? 'They included a reveal screenshot in the Dance Floor request inbox.'
      : null,
    `Review it against the same-collection + same-type rule first: ${collectionLine}.`,
    'Open your pending trade requests in Nic-Nac when you want to approve or deny it.',
  ].filter(Boolean).join('\n\n')
}

export async function notifyRepOfTradeRequest(
  supabase: SupabaseClient,
  summary: TradeRequestNotificationSummary,
) {
  const conversationId =
    (await getLatestConversationId(supabase, summary.repId)) ?? randomUUID()

  const { error } = await supabase.from('nic_nac_conversations').upsert(
    {
      conversation_id: conversationId,
      message_id: `trade-request-${summary.requestId}`,
      rep_id: summary.repId,
      role: 'assistant',
      parts: [
        {
          type: 'text',
          text: buildTradeRequestNotificationText(summary),
        },
        buildTradeRequestCardPart(summary),
      ],
      status: 'complete',
    },
    { onConflict: 'conversation_id,message_id', ignoreDuplicates: true },
  )
  if (error) throw error
}
