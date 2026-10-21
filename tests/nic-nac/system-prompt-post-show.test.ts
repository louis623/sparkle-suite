import { describe, expect, it } from 'vitest'

import { NIC_NAC_SYSTEM_PROMPT } from '@/lib/nic-nac/system-prompt'

describe('Nic-Nac system prompt — post-show cleanup orchestration', () => {
  it('frames post-show cleanup as a rep-invoked conversation instead of an automatic queue', () => {
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('show is over')
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('asks for cleanup')
    expect(NIC_NAC_SYSTEM_PROMPT).toContain(
      'rep-invoked cleanup conversation',
    )
  })

  it('uses get_trade_requests first and add_listing batch for remaining reveal pieces', () => {
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('get_trade_requests')
    expect(NIC_NAC_SYSTEM_PROMPT).toContain(
      'summarize pending swap-request decisions',
    )
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('remaining reveal pieces')
    expect(NIC_NAC_SYSTEM_PROMPT).toContain("mode:'batch'")
  })

  it('forbids claiming automatic post-show counts and keeps fulfillment review as a separate follow-on step', () => {
    expect(NIC_NAC_SYSTEM_PROMPT).toContain(
      "Do not claim automatic counts like 'You have 3 new pieces to catalog and 2 swaps to finalize'",
    )
    expect(NIC_NAC_SYSTEM_PROMPT).toContain(
      'Fulfillment queue review is a separate follow-on step after cleanup',
    )
  })

  it('locks the live-show trade swap prompt and tool guidance', () => {
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('approve_trade_swap')
    expect(NIC_NAC_SYSTEM_PROMPT).toContain(
      'Which item number was just revealed for the customer?',
    )
    expect(NIC_NAC_SYSTEM_PROMPT).toContain(
      'The customer never has the just-revealed dancer in their possession',
    )
    expect(NIC_NAC_SYSTEM_PROMPT).toContain(
      'If the rep is too busy to capture the revealed item number now',
    )
    expect(NIC_NAC_SYSTEM_PROMPT).toContain(
      'approve the swap without live-show revealed item capture',
    )
    expect(NIC_NAC_SYSTEM_PROMPT).not.toContain(
      'piece they revealed or want to offer',
    )
  })
})
