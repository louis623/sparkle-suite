import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { measureImageQualitySignals } from '@/lib/nic-nac/image-quality'
import { freshPhotoPreviewDecision, carryKnownListingFields, decideCustomerFacingSave } from '@/lib/nic-nac/tools/add-listing'
import { findForwardRolloverDestination, listRecentNicNacConversations } from '@/lib/nic-nac/persistence'
import { recentConversationsFromRows } from '@/lib/nic-nac/recent-conversations'
import {
  alreadySavedReply,
  directPieceReply,
  MOVED_ON_MESSAGE,
  retireSupersededPreviews,
  savedPhotoDisputeReply,
} from '@/lib/nic-nac/turn-replies'
import { repAskedToUpdateSharedCatalogImage } from '@/lib/nic-nac/core/stream-output-guard'
import { decideLabelSave } from '@/lib/nic-nac/workflows/label-item-number'
import {
  shownMainPhotoPreviewId,
  turnBlocksCustomerFacingSave,
  yesCommitsPreviewedPhoto,
} from '@/lib/nic-nac/workflows/main-photo-save-gate'
import { pieceTitleFromConfirmedDetails } from '@/lib/nic-nac/workflows/trade-board-known-fields'
import { resolveWorkflowCustomerFacingPhoto } from '@/lib/nic-nac/workflows/workflow-photo-selection'
import {
  bindMainPhotoForTurn,
  CUT_OFF_PHOTO_MESSAGE,
  mainPhotoPreviewRefusal,
  photoIsLabel,
  separateLabelFromJewelry,
  speculativeSecondItemClaim,
} from '@/lib/nic-nac/workflows/workflow-photo-roles'

/**
 * Server guarantees from Smoke runs 2–9. The model may skip the preview,
 * call save directly, or pick the label upload. These decisions do not.
 */
export const NIC_NAC_SCENARIO_IDS = [
  'run2-photo-turn-cannot-save',
  'run2-unreadable-label-keeps-typed-item',
  'run2-label-mismatch-still-blocks',
  'run2-skip-without-listing-is-not-saved',
  'run3-fresh-chat-yes-asks-for-the-photo',
  'run4-printed-label-is-not-the-main-photo',
  'run4-recent-scan-is-one-page',
  'run5-rollover-hops-by-source',
  'run5-old-reply-yes-is-inactive',
  'run5-use-that-photo-anyway-is-refused',
  'run6-catalog-photo-is-not-offered',
  'run6-empty-chats-stay-hidden',
  'run6-replacement-keeps-stored-details',
  'run7-refused-upload-cannot-be-saved',
  'run7-duplicate-no-keeps-details',
  'run7-skip-follows-the-listing-row',
  'run7-speculative-type-is-not-a-refusal',
  'run7-title-drops-label-print',
  'run7-crop-says-cut-off',
  'run7-yes-does-not-restore-a-lost-photo',
  'run8-save-without-yes-is-blocked',
  'run8-label-id-cannot-be-previewed-or-saved',
  'run8-yes-saves-only-the-confirmed-upload',
  'run8-yes-uses-stored-details',
  'run8-typed-item-does-not-require-a-label',
  'run8-frame-edge-counts-as-cut-off',
  'run8-recent-failure-is-not-none-yet',
  'run8-saved-photo-dispute-checks-the-listing',
  'run9-lone-photo-does-not-force-a-fresh-preview',
  'run9-handlers-block-before-a-mutation',
] as const

const JEWELRY_ID = '11111111-1111-4111-8111-111111111111'
const LABEL_ID = '22222222-2222-4222-8222-222222222222'
const REFUSED_ID = '33333333-3333-4333-8333-333333333333'

function textMessage(role: 'user' | 'assistant', text: string) {
  return { role, parts: [{ type: 'text' as const, text }] }
}

function photo(id: string, notes: string[] = [], visualRole = 'jewelry') {
  return {
    id,
    declaredRole: 'jewelry_front' as const,
    visualRole,
    quality: 'usable' as const,
    imageUrl: `https://example.com/${id}.jpg`,
    notes: [...notes],
    roleConfirmed: false,
  }
}

function activeWorkflow(
  photos: ReturnType<typeof photo>[],
  metadata: Record<string, unknown>,
) {
  return {
    status: 'active' as const,
    catalogMode: 'item_number' as const,
    id: 'session-1',
    photos,
    metadata,
    known: {
      itemNumber: 'ER99205',
      designName: 'The Florence Earrings',
      collectionName: 'July Birthday',
      ringSize: '7',
      rarityClassification: 'standard' as const,
      material: 'silver',
      mainStone: 'clear',
    },
  }
}

describe('nic-nac scenario regression, runs 2 through 9', () => {
  it('lists every scenario the suite locks', () => {
    expect(new Set(NIC_NAC_SCENARIO_IDS).size).toBe(NIC_NAC_SCENARIO_IDS.length)
    expect(NIC_NAC_SCENARIO_IDS).toHaveLength(30)
  })

  it('run2-photo-turn-cannot-save', () => {
    const piece = photo(JEWELRY_ID)
    const session = activeWorkflow([piece], { boundMainPhotoId: JEWELRY_ID })
    const saved = decideCustomerFacingSave({
      latestUserText: 'here is the photo',
      latestUserHasImage: true,
      workflow: session as never,
      itemNumber: 'ER99205',
      selectedPhotoId: JEWELRY_ID,
    })
    expect(saved?.needsAction).toBe('confirm_main_photo')
    expect(saved?.previewPhotoId).toBe(JEWELRY_ID)
    expect(saved).not.toHaveProperty('listingId')
  })

  it('run2-unreadable-label-keeps-typed-item', () => {
    const decision = decideLabelSave({
      itemNumber: 'NK99303',
      read: { outcome: 'failed', itemNumbers: [], reason: 'unreadable' },
      confirmedItemNumber: 'NK99303',
    })
    expect(decision.blocked).toBe(false)
  })

  it('run2-label-mismatch-still-blocks', () => {
    const decision = decideLabelSave({
      itemNumber: 'ER99202',
      read: { outcome: 'read', itemNumbers: ['RG99112'] },
      confirmedItemNumber: 'ER99202',
    })
    expect(decision.blocked).toBe(true)
    if (decision.blocked) expect(decision.code).toBe('LABEL_ITEM_NUMBER_MISMATCH')
    const reply = directPieceReply({
      messages: [
        textMessage('assistant', 'The label says RG99112.'),
        textMessage('user', 'The label is fine, save it on ER99202'),
      ],
      latestUserText: 'The label is fine, save it on ER99202',
      latestUserHasImage: false,
      known: { itemNumber: 'ER99202' },
      labelItemNumber: 'RG99112',
    })
    expect(reply).toContain('RG99112')
    expect(reply).toContain("won't save")
  })

  it('run2-skip-without-listing-is-not-saved', () => {
    const reply = directPieceReply({
      messages: [
        textMessage('assistant', 'Send a photo of NK99303.'),
        textMessage('user', "don't save NK99303"),
      ],
      latestUserText: "don't save NK99303",
      latestUserHasImage: false,
      known: { itemNumber: 'NK99303' },
      listingExists: false,
    })
    expect(reply ?? '').not.toContain('already on your Dance Floor')
  })

  it('run3-fresh-chat-yes-asks-for-the-photo', () => {
    const previous = 'I started a fresh chat. Want to finish ER99208? Send the photo again.'
    const reply = directPieceReply({
      messages: [textMessage('assistant', previous), textMessage('user', 'yes')],
      latestUserText: 'yes',
      latestUserHasImage: false,
      known: { itemNumber: 'ER99208', ringSize: '7', rarityClassification: 'standard' },
    })
    expect(reply).toContain('Send the photo for ER99208 again')
    expect(
      yesCommitsPreviewedPhoto({
        latestUserText: 'yes',
        latestUserHasImage: false,
        previewPhotoId: JEWELRY_ID,
        previousAssistantText: previous,
      }),
    ).toBe(false)
  })

  it('run4-printed-label-is-not-the-main-photo', () => {
    const photos = [
      photo(JEWELRY_ID, [], 'label_or_packaging'),
      photo(LABEL_ID, ['printed-item:RG99101'], 'jewelry'),
    ]
    separateLabelFromJewelry(photos, 0)
    expect(photoIsLabel(photos[1])).toBe(true)
    expect(photos[0]?.declaredRole).toBe('jewelry_front')
    expect(photos[0]?.visualRole).toBe('jewelry')
    const gated = bindMainPhotoForTurn({
      photos,
      newPhotoStart: 0,
      itemNumber: 'RG99101',
      metadata: {},
    })
    expect(gated.metadata.boundMainPhotoId).toBe(JEWELRY_ID)
    expect(photoIsLabel(gated.photos.find((item) => item.id === LABEL_ID))).toBe(true)
    expect(
      resolveWorkflowCustomerFacingPhoto(gated.photos, { selectedPhotoId: LABEL_ID })?.id,
    ).toBe(JEWELRY_ID)
  })

  it('run4-recent-scan-is-one-page', async () => {
    let ranges = 0
    const query = {
      select: () => query,
      eq: () => query,
      is: () => query,
      order: () => query,
      range: () => {
        ranges += 1
        return Promise.resolve({
          data: Array.from({ length: 150 }, (_, index) => ({
            conversation_id: `chat-${index}`,
            created_at: `2026-10-21T12:${String(index % 60).padStart(2, '0')}:00.000Z`,
          })),
          error: null,
        })
      },
      limit: () =>
        Promise.resolve({
          data: [
            {
              parts: [{ type: 'text', text: 'Add ER95204' }],
              created_at: '2026-10-21T12:00:00.000Z',
            },
          ],
          error: null,
        }),
    }
    const listed = await listRecentNicNacConversations({ from: () => query } as never, 'rep-1', 5)
    expect(ranges).toBe(1)
    expect(listed.length).toBeLessThanOrEqual(8)
  })

  it('run5-rollover-hops-by-source', async () => {
    const edges = [
      { source_conversation_id: 'older', destination_conversation_id: 'middle' },
      { source_conversation_id: 'middle', destination_conversation_id: 'current' },
    ]
    let limits = 0
    const chain = (filters: Record<string, string>) => {
      const api = {
        eq(column: string, value: string) {
          return chain({ ...filters, [column]: value })
        },
        order() {
          return api
        },
        limit(count: number) {
          limits += 1
          expect(count).toBe(1)
          const row = edges.find(
            (edge) => edge.source_conversation_id === filters.source_conversation_id,
          )
          return Promise.resolve({ data: row ? [row] : [], error: null })
        },
      }
      return api
    }
    const admin = { from: () => ({ select: () => chain({}) }) }
    await expect(findForwardRolloverDestination(admin as never, 'rep-1', 'older')).resolves.toBe(
      'current',
    )
    expect(limits).toBeGreaterThan(0)
    expect(limits).toBeLessThanOrEqual(8)
  })

  it('run5-old-reply-yes-is-inactive', () => {
    const retired = retireSupersededPreviews([
      {
        role: 'assistant',
        parts: [{ type: 'text', text: "Reply yes and I'll add it" }],
      },
    ])
    const json = JSON.stringify(retired)
    expect(json).toContain(MOVED_ON_MESSAGE)
    expect(json.toLowerCase()).not.toContain("i'll add it")
    expect(json.toLowerCase()).not.toContain('reply yes')
  })

  it('run5-use-that-photo-anyway-is-refused', () => {
    const reply = directPieceReply({
      messages: [
        textMessage('assistant', 'This photo is already on ER96101. I won\'t use it as the main photo for NK96303.'),
        textMessage('user', 'Yes, use that photo anyway'),
      ],
      latestUserText: 'Yes, use that photo anyway',
      latestUserHasImage: false,
    })
    expect(reply).toContain("won't use that photo")
    expect(reply).not.toContain('reply yes')
  })

  it('run6-catalog-photo-is-not-offered', () => {
    expect(repAskedToUpdateSharedCatalogImage('yes, save ER99205')).toBe(false)
    expect(
      repAskedToUpdateSharedCatalogImage('please update the shared catalog photo for all reps'),
    ).toBe(true)
  })

  it('run6-empty-chats-stay-hidden', () => {
    const listed = recentConversationsFromRows(
      [
        {
          conversation_id: 'empty',
          role: 'user',
          parts: [],
          created_at: '2026-10-21T18:00:00.000Z',
        },
        {
          conversation_id: 'kept',
          role: 'user',
          parts: [{ type: 'text', text: 'Add RG99105' }],
          created_at: '2026-10-21T17:00:00.000Z',
        },
      ],
      5,
    )
    expect(listed.map((item) => item.conversationId)).toEqual(['kept'])
  })

  it('run6-replacement-keeps-stored-details', () => {
    const reply = directPieceReply({
      messages: [
        textMessage('assistant', "That photo isn't clear enough. Send a clearer photo of the jewelry."),
        textMessage('user', "no, that's the wrong photo. Here's the right photo"),
      ],
      latestUserText: "no, that's the wrong photo. Here's the right photo",
      latestUserHasImage: true,
      known: {
        itemNumber: 'NK99304',
        designName: 'Smoke Necklace',
        collectionName: 'July Birthday',
        ringSize: '7',
        rarityClassification: 'diamond',
      },
    })
    expect(reply).toContain('NK99304')
    expect(reply).toContain('July Birthday')
    expect(reply).toContain('reply yes')
    expect(reply).not.toContain('?')
  })

  it('run7-refused-upload-cannot-be-saved', () => {
    const photos = [photo(REFUSED_ID), photo(JEWELRY_ID)]
    const gated = bindMainPhotoForTurn({
      photos,
      newPhotoStart: 1,
      itemNumber: 'ER99203',
      metadata: { boundMainPhotoId: REFUSED_ID },
      previousAssistantText: 'That photo is too blurry. Send a clearer photo of the jewelry.',
    })
    expect(gated.metadata.boundMainPhotoId).toBe(JEWELRY_ID)
    expect(
      resolveWorkflowCustomerFacingPhoto(gated.photos, { selectedPhotoId: REFUSED_ID }),
    ).toBeNull()
    const decision = decideCustomerFacingSave({
      latestUserText: 'save the first one',
      latestUserHasImage: false,
      workflow: activeWorkflow(gated.photos, gated.metadata) as never,
      itemNumber: 'ER99203',
      selectedPhotoId: REFUSED_ID,
    })
    expect(decision?.previewPhotoId).toBe(JEWELRY_ID)
    expect(decision).not.toHaveProperty('listingId')
  })

  it('run7-duplicate-no-keeps-details', () => {
    const reply = directPieceReply({
      messages: [
        textMessage('assistant', 'This photo is already on ER96101. I won\'t use it as the main photo for NK99306.'),
        textMessage('user', 'no'),
      ],
      latestUserText: 'no',
      latestUserHasImage: false,
      known: {
        itemNumber: 'NK99306',
        designName: 'Smoke Necklace',
        collectionName: 'July Birthday',
      },
    })
    expect(reply).toContain("I'll keep")
    expect(reply).toContain('July Birthday')
    expect(reply).toContain('Send a different photo')
  })

  it('run7-skip-follows-the-listing-row', () => {
    const saved = directPieceReply({
      messages: [
        textMessage('assistant', 'What size is RG99105?'),
        textMessage('user', 'skip RG99105'),
      ],
      latestUserText: 'skip RG99105',
      latestUserHasImage: false,
      listingExists: true,
      known: { itemNumber: 'RG99105' },
    })
    expect(saved).toBe(alreadySavedReply('RG99105'))
    const missing = directPieceReply({
      messages: [
        textMessage('assistant', 'What size is NK99303?'),
        textMessage('user', 'skip NK99303'),
      ],
      latestUserText: 'skip NK99303',
      latestUserHasImage: false,
      listingExists: false,
      known: { itemNumber: 'NK99303' },
    })
    expect(missing ?? '').not.toContain('already on your Dance Floor')
  })

  it('run7-speculative-type-is-not-a-refusal', () => {
    expect(speculativeSecondItemClaim('This also shows a ring in the background.')).toBe(true)
    expect(
      mainPhotoPreviewRefusal({
        photo: { quality: 'usable', qualityIssues: [], notes: [], visualRole: 'jewelry' },
        itemNumber: 'ER99207',
        jewelryType: 'ER',
      }),
    ).toBeNull()
  })

  it('run7-title-drops-label-print', () => {
    expect(
      pieceTitleFromConfirmedDetails({
        proposed: 'The Florence Earrings smoke only',
        confirmed: 'The Florence Earrings',
      }),
    ).toBe('The Florence Earrings')
    expect(pieceTitleFromConfirmedDetails({ proposed: '', confirmed: 'The Florence Earrings' })).toBeUndefined()
  })

  it('run7-crop-says-cut-off', () => {
    expect(
      mainPhotoPreviewRefusal({
        photo: { quality: 'warning', qualityIssues: ['subject_cut_off'], notes: [] },
        itemNumber: 'NK99305',
        jewelryType: 'NK',
      }),
    ).toBe(CUT_OFF_PHOTO_MESSAGE)
    expect(CUT_OFF_PHOTO_MESSAGE.toLowerCase()).not.toContain("isn't clear enough")
  })

  it('run7-yes-does-not-restore-a-lost-photo', () => {
    expect(
      yesCommitsPreviewedPhoto({
        latestUserText: 'yes',
        previewPhotoId: null,
        previousAssistantText: 'Want to finish ER99204? Send the photo again.',
      }),
    ).toBe(false)
    expect(
      turnBlocksCustomerFacingSave({
        latestUserText: 'yes',
        confirmedPhotoId: REFUSED_ID,
        savingPhotoId: JEWELRY_ID,
      }),
    ).toBe(true)
  })

  it('run8-save-without-yes-is-blocked', () => {
    expect(
      turnBlocksCustomerFacingSave({
        latestUserText: 'looks good, add it',
        confirmedPhotoId: JEWELRY_ID,
        savingPhotoId: JEWELRY_ID,
      }),
    ).toBe(true)
    expect(
      turnBlocksCustomerFacingSave({
        latestUserHasImage: true,
        latestUserText: 'yes',
        confirmedPhotoId: JEWELRY_ID,
        savingPhotoId: JEWELRY_ID,
      }),
    ).toBe(true)
    const decision = decideCustomerFacingSave({
      latestUserText: 'save it',
      workflow: activeWorkflow([photo(JEWELRY_ID)], {
        boundMainPhotoId: JEWELRY_ID,
        mainPhotoConfirmedPhotoId: JEWELRY_ID,
      }) as never,
      itemNumber: 'NK99307',
      selectedPhotoId: JEWELRY_ID,
    })
    expect(decision?.needsAction).toBe('confirm_main_photo')
    expect(decision).not.toHaveProperty('listingId')
  })

  it('run8-label-id-cannot-be-previewed-or-saved', () => {
    const labelOnly = photo(LABEL_ID, ['printed-item:NK99301'])
    expect(() =>
      decideCustomerFacingSave({
        latestUserText: 'yes',
        latestUserHasImage: true,
        workflow: activeWorkflow([labelOnly], { boundMainPhotoId: LABEL_ID }) as never,
        itemNumber: 'NK99301',
        selectedPhotoId: LABEL_ID,
      }),
    ).toThrow(/label/i)
  })

  it('run8-yes-saves-only-the-confirmed-upload', () => {
    const session = activeWorkflow([photo(JEWELRY_ID), photo(LABEL_ID, ['printed-item:ER99205'])], {
      boundMainPhotoId: JEWELRY_ID,
      mainPhotoConfirmedPhotoId: JEWELRY_ID,
    })
    expect(
      decideCustomerFacingSave({
        latestUserText: 'yes',
        workflow: session as never,
        itemNumber: 'ER99205',
        selectedPhotoId: LABEL_ID,
      }),
    ).toBeNull()
    expect(
      decideCustomerFacingSave({
        latestUserText: 'yes',
        workflow: activeWorkflow([photo(JEWELRY_ID)], {
          boundMainPhotoId: JEWELRY_ID,
          mainPhotoConfirmedPhotoId: LABEL_ID,
        }) as never,
        itemNumber: 'ER99205',
        selectedPhotoId: JEWELRY_ID,
      })?.previewPhotoId,
    ).toBe(JEWELRY_ID)
    expect(
      shownMainPhotoPreviewId([
        {
          role: 'assistant',
          parts: [
            {
              type: 'tool-add_listing',
              output: { needsAction: 'confirm_main_photo', previewPhotoId: JEWELRY_ID },
            },
          ],
        },
        { role: 'user', parts: [{ type: 'text', text: 'yes' }] },
      ]),
    ).toBe(JEWELRY_ID)
  })

  it('run8-yes-uses-stored-details', () => {
    const carried = carryKnownListingFields(
      {
        mode: 'single',
        itemNumber: 'NK99304',
        designName: 'Smoke Necklace',
        collectionName: 'July Birthday',
        ringSize: '7',
        rarityClassification: 'diamond',
      },
      {
        status: 'active',
        catalogMode: 'item_number',
        known: {
          itemNumber: 'NK99304',
          designName: 'Smoke Necklace',
          collectionName: 'July Birthday',
          ringSize: '7',
          rarityClassification: 'diamond',
        },
      },
    )
    expect(carried.ringSize).toBe('7')
    expect(carried.rarityClassification).toBe('diamond')
    expect(carried.collectionName).toBe('July Birthday')
    expect(carried.designName).toBe('Smoke Necklace')
    expect(
      yesCommitsPreviewedPhoto({
        latestUserText: 'yes',
        previewPhotoId: JEWELRY_ID,
        previousAssistantText:
          'This is the main photo I will save for NK99304. If this is the right piece, reply yes.',
      }),
    ).toBe(true)
  })

  it('run8-typed-item-does-not-require-a-label', () => {
    expect(
      decideLabelSave({
        itemNumber: 'RG99103',
        read: { outcome: 'failed', itemNumbers: [], reason: 'missing_api_key' },
        confirmedItemNumber: 'RG99103',
      }).blocked,
    ).toBe(false)
    const source = readFileSync('lib/nic-nac/tools/add-listing.ts', 'utf8')
    expect(source).toContain('confirmedItemNumber: args.labelConfirmedItemNumber || itemNumber')
  })

  it('run8-frame-edge-counts-as-cut-off', () => {
    const width = 80
    const height = 80
    const touching = new Uint8ClampedArray(width * height * 4)
    const inset = new Uint8ClampedArray(width * height * 4)
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = (y * width + x) * 4
        touching[index] = touching[index + 1] = touching[index + 2] = 245
        touching[index + 3] = 255
        inset[index] = inset[index + 1] = inset[index + 2] = 245
        inset[index + 3] = 255
        if (y <= 1 && x > 10 && x < 70) {
          touching[index] = touching[index + 1] = touching[index + 2] = 15
        }
        if (x >= 20 && x <= 60 && y >= 20 && y <= 60) {
          inset[index] = inset[index + 1] = inset[index + 2] = 15
        }
      }
    }
    expect(measureImageQualitySignals({ data: touching, width, height }).subjectTouchesFrameEdge).toBe(
      true,
    )
    expect(measureImageQualitySignals({ data: inset, width, height }).subjectTouchesFrameEdge).toBe(
      false,
    )
  })

  it('run8-recent-failure-is-not-none-yet', () => {
    const dashboard = readFileSync('app/nic-nac/components/DashboardPlaceholder.tsx', 'utf8')
    const route = readFileSync('app/api/nic-nac/conversations/recent/route.ts', 'utf8')
    const persistence = readFileSync('lib/nic-nac/persistence.ts', 'utf8')
    expect(dashboard).toContain('recentStatus === \'error\'')
    expect(dashboard).toContain('Try again')
    expect(dashboard).toContain('None yet')
    expect(dashboard).not.toContain('setRecentConversations([])')
    expect(route).toContain("error: 'recent_unavailable'")
    expect(persistence).toContain('const RECENT_SCAN_CAP = 100')
    expect(persistence).toContain('const RECENT_CONVERSATION_CAP = 8')
    expect(persistence).not.toContain('.limit(1000)')
  })

  it('run8-saved-photo-dispute-checks-the-listing', () => {
    const checked = savedPhotoDisputeReply({
      latestUserText: 'you saved the wrong photo on ER99205',
      listingPhotoUrl: 'https://example.com/dance-floor.jpg',
    })
    expect(checked).toContain('I checked the photo saved')
    expect(checked?.toLowerCase()).not.toContain('saved the wrong')
    expect(checked).toContain("didn't change")
    const missing = savedPhotoDisputeReply({
      latestUserText: 'that saved photo is wrong',
      listingPhotoUrl: null,
    })
    expect(missing).toContain("isn't a saved Dance Floor photo")
    expect(
      savedPhotoDisputeReply({
        latestUserText: 'no, wrong photo',
        listingPhotoUrl: 'https://example.com/dance-floor.jpg',
      }),
    ).toBeNull()
  })

  it('run9-lone-photo-does-not-force-a-fresh-preview', () => {
    expect(
      freshPhotoPreviewDecision([
        {
          role: 'user',
          parts: [{ type: 'file', mediaType: 'image/jpeg', url: 'https://example.com/one.jpg' }],
        },
      ]).required,
    ).toBe(false)
  })

  it('run9-handlers-block-before-a-mutation', () => {
    const listing = readFileSync('lib/nic-nac/tools/add-listing.ts', 'utf8')
    const route = readFileSync('app/api/nic-nac/route.ts', 'utf8')
    expect(listing).toContain('if (turnBlock) return turnBlock')
    expect(listing).toContain('if (nonItemTurnBlock) return nonItemTurnBlock')
    expect(listing).toContain('if (batchTurnBlock) return batchTurnBlock')
    expect(route).toContain('commitPreviewedAddListing')
    expect(route).toContain('yesCommitsPreviewedPhoto')
    const before = listing.indexOf('if (turnBlock) return turnBlock')
    const mutation = listing.indexOf('await addCatalogListingMutation', before)
    expect(before).toBeGreaterThan(0)
    expect(mutation).toBeGreaterThan(before)
  })
})
