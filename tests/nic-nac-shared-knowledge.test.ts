import { describe, expect, it } from 'vitest'

import {
  NIC_NAC_AFFILIATION,
  NIC_NAC_CORE_KNOWLEDGE,
  NIC_NAC_LIVEQ_KNOWLEDGE,
  NIC_NAC_PERSONALITY,
  NIC_NAC_TRADEBOARD_KNOWLEDGE,
  NIC_NAC_TRADE_TERMS,
  buildNicNacCoreKnowledgeText,
  normalizeNicNacTradeTerms,
} from '@/lib/nic-nac/knowledge'

describe('shared Nic-Nac knowledge', () => {
  it('defines shared product truth for all Nic-Nac surfaces', () => {
    expect(NIC_NAC_CORE_KNOWLEDGE.productName).toBe('Sparkle Suite')
    expect(NIC_NAC_CORE_KNOWLEDGE.assistantName).toBe('Nic-Nac')
    expect(NIC_NAC_CORE_KNOWLEDGE.primaryAudience).toContain('Bomb Party')
    expect(NIC_NAC_CORE_KNOWLEDGE.productSummary).toContain(
      'customer-facing website',
    )
    expect(NIC_NAC_CORE_KNOWLEDGE.productSummary).toContain(
      'live-show support tools',
    )
  })

  it('defines Dance Floor and dancers terminology once', () => {
    expect(NIC_NAC_TRADEBOARD_KNOWLEDGE.productTerm).toBe('Dance Floor')
    expect(NIC_NAC_TRADEBOARD_KNOWLEDGE.lingo.danceFloor).toContain('Dance Floor')
    expect(NIC_NAC_TRADEBOARD_KNOWLEDGE.lingo.dancers).toContain(
      'swap-eligible jewelry',
    )
    expect(NIC_NAC_TRADEBOARD_KNOWLEDGE.customerFlow).toContain(
      'Customers do not add',
    )
    expect(NIC_NAC_TRADEBOARD_KNOWLEDGE.customerFlow).toContain('request')
    expect(NIC_NAC_TRADEBOARD_KNOWLEDGE.customerFlow).toContain(
      'item just revealed',
    )
  })

  it('defines trade eligibility and value boundaries', () => {
    expect(NIC_NAC_TRADEBOARD_KNOWLEDGE.eligibilityRules).toContain(
      'item-for-item only',
    )
    expect(NIC_NAC_TRADEBOARD_KNOWLEDGE.eligibilityRules).toContain(
      'same collection',
    )
    expect(NIC_NAC_TRADEBOARD_KNOWLEDGE.eligibilityRules).toContain(
      'same jewelry type',
    )
    expect(NIC_NAC_TRADEBOARD_KNOWLEDGE.valueRules).toContain(
      'MSRP is reference only',
    )
    expect(NIC_NAC_TRADEBOARD_KNOWLEDGE.valueRules).toContain(
      'No pay-the-difference',
    )
    expect(NIC_NAC_TRADEBOARD_KNOWLEDGE.boundaries).toContain(
      'does not handle shipping',
    )
  })

  it('defines public-safe LiveQ data boundaries', () => {
    expect(NIC_NAC_LIVEQ_KNOWLEDGE.summary).toContain('live-show queue')
    expect(NIC_NAC_LIVEQ_KNOWLEDGE.publicDataBoundary).toContain(
      'customer first names',
    )
    expect(NIC_NAC_LIVEQ_KNOWLEDGE.publicDataBoundary).toContain('queue order')
    expect(NIC_NAC_LIVEQ_KNOWLEDGE.publicDataBoundary).toContain(
      'does not collect order IDs',
    )
    expect(NIC_NAC_LIVEQ_KNOWLEDGE.publicDataBoundary).toContain(
      'does not collect payment information',
    )
  })

  it('defines affiliation language once', () => {
    expect(NIC_NAC_AFFILIATION.disclaimer).toContain('not affiliated')
    expect(NIC_NAC_AFFILIATION.disclaimer).toContain('Bomb Party')
    expect(NIC_NAC_AFFILIATION.owner).toContain('Neon Rabbit')
  })

  it('defines shared Nic-Nac personality without granting permissions', () => {
    expect(NIC_NAC_PERSONALITY.voice).toContain('warm')
    expect(NIC_NAC_PERSONALITY.voice).toContain('plain-English')
    expect(NIC_NAC_PERSONALITY.voice).toContain('slightly empathic')
    expect(NIC_NAC_PERSONALITY.relationship).toContain('trusted business partner')
    expect(NIC_NAC_PERSONALITY.relationship).toContain('friend')
    expect(NIC_NAC_PERSONALITY.relationship).toContain('business goals')
    expect(NIC_NAC_PERSONALITY.uncertaintyRules).toContain(
      'Ask probing questions',
    )
    expect(NIC_NAC_PERSONALITY.uncertaintyRules).toContain(
      'gain clarity and understanding',
    )
    expect(NIC_NAC_PERSONALITY.uncertaintyRules).toContain(
      'Do not lie, hallucinate, or make things up',
    )
    expect(NIC_NAC_PERSONALITY.relatedDomains).toContain('Sparkle Suite')
    expect(NIC_NAC_PERSONALITY.relatedDomains).toContain('Sparkle Finder')
    expect(NIC_NAC_PERSONALITY.relatedDomains).toContain('Small Business')
    expect(NIC_NAC_PERSONALITY.constraints).toContain('No generic SaaS wording')
    expect(NIC_NAC_PERSONALITY.constraints.join(' ')).not.toContain('send SMS')
  })

  it('renders shared knowledge text for prompts', () => {
    const text = buildNicNacCoreKnowledgeText()

    expect(text).toContain('Sparkle Suite')
    expect(text).toContain('Nic-Nac')
    expect(text).toContain('Dance Floor')
    expect(text).toContain('dancers')
    expect(text).toContain('item-for-item only')
    expect(text).toContain('MSRP is reference only')
    expect(text).toContain('not affiliated')
    expect(text).toContain('trusted business partner')
    expect(text).toContain('Ask probing questions')
    expect(text).toContain('Do not lie, hallucinate, or make things up')
  })

  it('keeps the shared knowledge as the source for Dance Floor terminology', () => {
    const text = buildNicNacCoreKnowledgeText()

    expect(text.match(/Dance Floor/g)?.length).toBeGreaterThanOrEqual(1)
    expect(text.match(/dancers/g)?.length).toBeGreaterThanOrEqual(1)
    expect(text).toContain('Customers do not add dancers to the Dance Floor')
  })

  it('exports shared trade terminology for guardrails', () => {
    expect(NIC_NAC_TRADE_TERMS).toContain('tradeboard')
    expect(NIC_NAC_TRADE_TERMS).toContain('dance floor')
    expect(NIC_NAC_TRADE_TERMS).toContain('dance floor')
    expect(NIC_NAC_TRADE_TERMS).toContain('dancers')
  })

  it('normalizes BP lingo for guardrail matching', () => {
    expect(
      normalizeNicNacTradeTerms('Who adds dancers to the dance floor?'),
    ).toContain('tradeboard')
    expect(
      normalizeNicNacTradeTerms('Who adds dancers to the dance floor?'),
    ).toContain('trade listing')
  })

  it('does not include private implementation details or secrets', () => {
    const text = buildNicNacCoreKnowledgeText().toLowerCase()

    expect(text).not.toContain('api key')
    expect(text).not.toContain('service role')
    expect(text).not.toContain('supabase')
    expect(text).not.toContain('selector')
    expect(text).not.toContain('sync code')
    expect(text).not.toContain('private roadmap')
    expect(text).not.toContain('louis@')
  })
})
