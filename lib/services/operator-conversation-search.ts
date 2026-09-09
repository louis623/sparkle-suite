/** A quoted, literal PostgreSQL case-insensitive substring expression. */
export function operatorConversationSearch(value: unknown) {
  const term = typeof value === 'string' ? value.trim().slice(0, 240) : ''
  if (!term) return null
  const pattern = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const quoted = '"' + pattern.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'
  return {
    // An outer relation preserves subject/preview matches with no matching requester.
    // Its inner rep relation restricts existence to the matching requester identity.
    select: 'search_requester:workspace_conversation_participants!workspace_conversation_participants_conversation_id_fkey(id,search_rep:reps!workspace_conversation_participants_rep_id_fkey!inner(id))',
    repFilter: `business_name.imatch.${quoted},display_name.imatch.${quoted}`,
    conversationFilter: [
      `subject.imatch.${quoted}`,
      `latest_message_preview.imatch.${quoted}`,
      `latest_message_sender_display_name.imatch.${quoted}`,
      'and(conversation_type.eq.support,search_requester.not.is.null)',
    ].join(','),
  }
}
