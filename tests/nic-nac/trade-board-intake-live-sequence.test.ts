import { describe, expect, it } from 'vitest'
import { ER13229_LIVE_SEQUENCE } from './fixtures/trade-board-er13229-sequence'

describe('ER13229 Dance Floor live sequence fixture', () => {
  it('documents the required real-rep turn order and hard-fail phrases', () => {
    expect(ER13229_LIVE_SEQUENCE).toMatchObject({
      itemNumber: 'ER13229',
      designName: 'The Florence Earrings',
      collectionName: 'July Birthday',
      collectionYear: 2026,
    })
    expect(ER13229_LIVE_SEQUENCE.turns.map((turn) => turn.kind)).toEqual([
      'start',
      'label_photo',
      'jewelry_photo',
      'collection_confirmation',
    ])
    expect(ER13229_LIVE_SEQUENCE.confirmationText).toContain(
      'July Birthday collection, 2026',
    )
    expect(ER13229_LIVE_SEQUENCE.hardFailPhrases).toContain(
      'report this to Louis',
    )
    expect(ER13229_LIVE_SEQUENCE.hardFailPhrases).toContain(
      'I still need these details before I can save this listing: .',
    )
  })
})
