import { describe, expect, it, vi } from 'vitest'
import type { UIMessage } from 'ai'
import {
  getOrCreateTradeBoardIntakeContext,
  inferDeclaredPhotoRoleFromConversation,
  mergeWorkflowToolIntents,
  reconcileDeclaredPhotoRoleWithWorkflow,
} from '@/lib/nic-nac/workflows/trade-board-intake-context'
import { renderTradeBoardIntakePromptState } from '@/lib/nic-nac/workflows/trade-board-intake-prompt'
import type { TradeBoardIntakePromptState } from '@/lib/nic-nac/workflows/trade-board-intake-types'

describe('Dance Floor intake route context', () => {
  it('inherits label_details role after Nic-Nac asks for a label/details photo', () => {
    const messages: UIMessage[] = [
      {
        id: 'assistant-1',
        role: 'assistant',
        parts: [
          { type: 'text', text: 'Upload a clear item-info tag or label photo.' },
        ],
      } as UIMessage,
      {
        id: 'user-1',
        role: 'user',
        parts: [
          { type: 'file', mediaType: 'image/jpeg', url: 'data:image/jpeg;base64,AAA' },
        ],
      } as UIMessage,
    ]

    expect(inferDeclaredPhotoRoleFromConversation(messages, 0)).toBe(
      'label_details',
    )
  })

  it('inherits jewelry_front role after Nic-Nac asks for customer-facing jewelry photo', () => {
    const messages: UIMessage[] = [
      {
        id: 'assistant-1',
        role: 'assistant',
        parts: [
          { type: 'text', text: 'I still need the customer-facing jewelry photo.' },
        ],
      } as UIMessage,
      {
        id: 'user-1',
        role: 'user',
        parts: [
          { type: 'file', mediaType: 'image/jpeg', url: 'data:image/jpeg;base64,BBB' },
        ],
      } as UIMessage,
    ]

    expect(inferDeclaredPhotoRoleFromConversation(messages, 0)).toBe(
      'jewelry_front',
    )
  })

  it('inherits jewelry_front when Nic-Nac contrasts the label source with a boxed display jewelry ask', () => {
    const messages: UIMessage[] = [
      {
        id: 'assistant-1',
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text:
              'Perfect! I found The Florence Earrings (ER13229). Now I need one more thing: a customer-facing photo of the earrings themselves - like a clear boxed display shot showing the jewelry. The label photo is super helpful for the details, but I need to see the earrings front-and-center for your listing. You got a photo of them in the box or on the card?',
          },
        ],
      } as UIMessage,
      {
        id: 'user-1',
        role: 'user',
        parts: [
          {
            type: 'file',
            mediaType: 'image/jpeg',
            url: 'data:image/jpeg;base64,Qk9YRURfSkVXRUxSWQ==',
          },
        ],
      } as UIMessage,
    ]

    expect(inferDeclaredPhotoRoleFromConversation(messages, 0)).toBe(
      'jewelry_front',
    )
  })

  it('inherits jewelry_front when Nic-Nac says the label/details photo shows info but asks for the jewelry photo', () => {
    const messages: UIMessage[] = [
      {
        id: 'assistant-1',
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text:
              'Perfect—I found The Florence Earrings (ER13229). Now I need the customer-facing jewelry photo—a clear shot of the earrings themselves (like a boxed display photo or close-up). This label/details photo shows the info, but I still need to see the earrings clearly for the listing. Can you upload the jewelry photo?',
          },
        ],
      } as UIMessage,
      {
        id: 'user-1',
        role: 'user',
        parts: [
          {
            type: 'file',
            mediaType: 'image/jpeg',
            url: 'data:image/jpeg;base64,Qk9YRURfSkVXRUxSWQ==',
          },
        ],
      } as UIMessage,
    ]

    expect(inferDeclaredPhotoRoleFromConversation(messages, 0)).toBe(
      'jewelry_front',
    )
  })

  it('does not confuse extracted item details with a request for a details photo', () => {
    const messages: UIMessage[] = [
      {
        id: 'assistant-1',
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text:
              'Perfect - I got the details for ER13229, The Florence Earrings.\n\nI still need the separate customer-facing jewelry photo to post it to Dance Floor. A clear boxed display photo is totally fine.',
          },
        ],
      } as UIMessage,
      {
        id: 'user-1',
        role: 'user',
        parts: [
          {
            type: 'file',
            mediaType: 'image/jpeg',
            url: 'data:image/jpeg;base64,Qk9YRURfSkVXRUxSWQ==',
          },
        ],
      } as UIMessage,
    ]

    expect(inferDeclaredPhotoRoleFromConversation(messages, 0)).toBe(
      'jewelry_front',
    )
  })

  it('treats an upload as jewelry_front when Nic-Nac contrasts the old label photo with the requested jewelry shot', () => {
    const messages: UIMessage[] = [
      {
        id: 'assistant-1',
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text:
              "The label photo doesn't work as the listing photo - I need a clearer shot of just the earrings themselves. Can you snap a photo of the jewelry front and center?",
          },
        ],
      } as UIMessage,
      {
        id: 'user-1',
        role: 'user',
        parts: [
          {
            type: 'file',
            mediaType: 'image/jpeg',
            url: 'data:image/jpeg;base64,Qk9YRURfSkVXRUxSWQ==',
          },
        ],
      } as UIMessage,
    ]

    expect(inferDeclaredPhotoRoleFromConversation(messages, 0)).toBe(
      'jewelry_front',
    )
  })

  it('leaves a photo ambiguous when Nic-Nac offers either a label photo or jewelry photo', () => {
    const messages: UIMessage[] = [
      {
        id: 'assistant-1',
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text:
              'Upload a photo - snap a pic of the item-info tag or label, or the jewelry itself.',
          },
        ],
      } as UIMessage,
      {
        id: 'user-1',
        role: 'user',
        parts: [
          {
            type: 'file',
            mediaType: 'image/jpeg',
            url: 'data:image/jpeg;base64,QU1CSUdVT1VT',
          },
        ],
      } as UIMessage,
    ]

    expect(inferDeclaredPhotoRoleFromConversation(messages, 0)).toBe('unknown')
  })

  it('treats the next unlabeled upload as jewelry after a label is already saved', () => {
    expect(
      reconcileDeclaredPhotoRoleWithWorkflow({
        inferredRole: 'label_details',
        latestUserText: '',
        photos: [
          {
            conversationMessageId: 'label-message',
            attachmentIndex: 1,
            declaredRole: 'label_details',
            visualRole: 'label_or_packaging',
            roleConfirmed: true,
            quality: 'unknown',
            qualityIssues: [],
            notes: [],
          },
        ],
      }),
    ).toBe('jewelry_front')
  })

  it('honors an explicit second label declaration instead of guessing jewelry', () => {
    expect(
      reconcileDeclaredPhotoRoleWithWorkflow({
        inferredRole: 'label_details',
        latestUserText: 'Here is a replacement label photo.',
        photos: [
          {
            conversationMessageId: 'label-message',
            attachmentIndex: 1,
            declaredRole: 'label_details',
            visualRole: 'label_or_packaging',
            roleConfirmed: true,
            quality: 'unknown',
            qualityIssues: [],
            notes: [],
          },
        ],
      }),
    ).toBe('label_details')
  })

  it('assigns label then jewelry when two photos arrive together after a jewelry ask', async () => {
    const sessionRow = {
      id: 'workflow-1',
      rep_id: 'rep-1',
      conversation_id: 'conv-1',
      workflow_type: 'trade_board_add_listing',
      status: 'active',
      current_phase: 'photo_capture',
      item_number: 'ER13229',
      design_name: 'The Florence Earrings',
      collection_name: 'July Birthday',
      collection_year: 2026,
      rarity_classification: 'standard',
      missing_fields: ['jewelryFrontPhoto'],
      hard_blockers: [],
      soft_warnings: [],
    }
    const activeBuilder = {
      select: vi.fn(() => activeBuilder),
      eq: vi.fn(() => activeBuilder),
      in: vi.fn(() => activeBuilder),
      gt: vi.fn(() => activeBuilder),
      order: vi.fn(() => activeBuilder),
      limit: vi.fn(() => activeBuilder),
      maybeSingle: vi.fn(() => ({ data: sessionRow, error: null })),
    }
    const selectPhotosBuilder = {
      select: vi.fn(() => selectPhotosBuilder),
      eq: vi.fn(() => selectPhotosBuilder),
      order: vi.fn(() => ({ data: [], error: null })),
    }
    const upsertPhotoBuilder = {
      upsert: vi.fn(() => ({ error: null })),
    }
    const updateBuilder = {
      update: vi.fn(() => updateBuilder),
      eq: vi.fn(() => ({ error: null })),
    }
    const workflowSupabase = {
      from: vi.fn((table: string) => {
        const callsForTable = workflowSupabase.from.mock.calls.filter(
          ([name]) => name === table,
        ).length
        if (table === 'trade_board_intake_sessions') {
          return callsForTable === 1 ? activeBuilder : updateBuilder
        }
        if (table === 'trade_board_intake_photos') {
          return callsForTable === 1 ? selectPhotosBuilder : upsertPhotoBuilder
        }
        throw new Error(`Unexpected table ${table}`)
      }),
    }

    const context = await getOrCreateTradeBoardIntakeContext({
      supabase: workflowSupabase as never,
      workflowSupabase: workflowSupabase as never,
      repId: 'rep-1',
      conversationId: 'conv-1',
      messages: [
        {
          id: 'assistant-1',
          role: 'assistant',
          parts: [
            {
              type: 'text',
              text: 'I still need the customer-facing jewelry photo.',
            },
          ],
        } as UIMessage,
        {
          id: 'user-two-photos',
          role: 'user',
          parts: [
            {
              type: 'file',
              mediaType: 'image/jpeg',
              url: 'data:image/jpeg;base64,TEFCRUw=',
            },
            {
              type: 'file',
              mediaType: 'image/jpeg',
              url: 'data:image/jpeg;base64,SkVXRUxSWQ==',
            },
          ],
        } as UIMessage,
      ],
      latestUserMessageId: 'user-two-photos',
      mode: 'workspace',
      nowIso: '2026-06-16T00:00:00.000Z',
    } as never)

    expect(context.sessionAfter?.photos).toEqual([
      expect.objectContaining({
        attachmentIndex: 1,
        declaredRole: 'label_details',
        imageUrl: 'data:image/jpeg;base64,TEFCRUw=',
      }),
      expect.objectContaining({
        attachmentIndex: 2,
        declaredRole: 'jewelry_front',
        imageUrl: 'data:image/jpeg;base64,SkVXRUxSWQ==',
      }),
    ])
    expect(upsertPhotoBuilder.upsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        attachment_index: 1,
        declared_role: 'label_details',
        image_url: 'data:image/jpeg;base64,TEFCRUw=',
      }),
      { onConflict: 'session_id,conversation_message_id,attachment_index' },
    )
    expect(upsertPhotoBuilder.upsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        attachment_index: 2,
        declared_role: 'jewelry_front',
        image_url: 'data:image/jpeg;base64,SkVXRUxSWQ==',
      }),
      { onConflict: 'session_id,conversation_message_id,attachment_index' },
    )
  })

  it('keeps dance floor intents when workflow intents are active', () => {
    expect(mergeWorkflowToolIntents(['memory'], ['trade_board', 'catalog'])).toEqual([
      'memory',
      'trade_board',
      'catalog',
    ])
  })

  it('renders compact prompt state with hard rules', () => {
    const state: TradeBoardIntakePromptState = {
      workflow: {
        id: 'workflow-1',
        type: 'trade_board_add_listing',
        catalogMode: 'item_number',
        status: 'active',
        phase: 'photo_capture',
      },
      known: {
        itemNumber: 'ER13229',
        designName: 'The Florence Earrings',
        collectionName: 'July Birthday',
      },
      photos: [
        {
          index: 1,
          declaredRole: 'label_details',
          visualRole: 'label_or_packaging',
          roleConfirmed: true,
          quality: 'usable',
          notes: [],
        },
      ],
      missing: ['jewelryFrontPhoto'],
      blockers: [],
      nextAction: 'ask_for_jewelry_front_photo',
      hardRules: ['label_details photos cannot satisfy jewelry_front'],
    }

    const rendered = renderTradeBoardIntakePromptState(state)

    expect(rendered).toContain('Active workflow: trade_board_add_listing')
    expect(rendered).toContain('itemNumber: ER13229')
    expect(rendered).toContain('declaredRole=label_details')
    expect(rendered).toContain('Missing: jewelryFrontPhoto')
    expect(rendered).toContain('Next action: ask_for_jewelry_front_photo')
  })

  it('falls back cleanly when workflow tables are not deployed yet', async () => {
    const supabase = {
      from: vi.fn(() => {
        throw {
          code: '42P01',
          message: 'relation "trade_board_intake_sessions" does not exist',
        }
      }),
    }

    await expect(
      getOrCreateTradeBoardIntakeContext({
        supabase: supabase as never,
        repId: 'rep-1',
        conversationId: 'conv-1',
        messages: [
          {
            id: 'user-1',
            role: 'user',
            parts: [{ type: 'text', text: 'Add ER13229 to my Dance Floor' }],
          } as UIMessage,
        ],
        latestUserMessageId: 'user-1',
        mode: 'workspace',
        nowIso: '2026-06-15T00:00:00.000Z',
      }),
    ).resolves.toMatchObject({
      sessionAfter: null,
      workflowIntents: [],
      toolPolicySource: 'latest_turn_intent',
      workflowPromptState: '',
    })
  })

  it('can use a server-owned workflow client when the rep-scoped client cannot write workflow state', async () => {
    const blockedRepClient = {
      from: vi.fn(() => {
        throw {
          code: '42501',
          message: 'permission denied for table trade_board_intake_sessions',
        }
      }),
    }
    const sessionRow = {
      id: 'workflow-1',
      rep_id: 'rep-1',
      conversation_id: 'conv-1',
      workflow_type: 'trade_board_add_listing',
      status: 'active',
      current_phase: 'started',
      missing_fields: [],
      hard_blockers: [],
      soft_warnings: [],
    }
    const activeBuilder = {
      select: vi.fn(() => activeBuilder),
      eq: vi.fn(() => activeBuilder),
      in: vi.fn(() => activeBuilder),
      gt: vi.fn(() => activeBuilder),
      order: vi.fn(() => activeBuilder),
      limit: vi.fn(() => activeBuilder),
      maybeSingle: vi.fn(() => ({ data: null, error: null })),
    }
    const createBuilder = {
      insert: vi.fn(() => createBuilder),
      select: vi.fn(() => createBuilder),
      single: vi.fn(() => ({ data: sessionRow, error: null })),
    }
    const updateBuilder = {
      update: vi.fn(() => updateBuilder),
      eq: vi.fn(() => ({ error: null })),
    }
    const photoBuilder = {
      select: vi.fn(() => photoBuilder),
      eq: vi.fn(() => photoBuilder),
      order: vi.fn(() => ({ data: [], error: null })),
    }
    const workflowSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'trade_board_intake_photos') return photoBuilder
        const sessionCallCount = workflowSupabase.from.mock.calls.filter(
          ([name]) => name === 'trade_board_intake_sessions',
        ).length
        if (sessionCallCount === 1) return activeBuilder
        if (sessionCallCount === 2) return createBuilder
        return updateBuilder
      }),
    }

    await expect(
      getOrCreateTradeBoardIntakeContext({
        supabase: blockedRepClient as never,
        workflowSupabase: workflowSupabase as never,
        repId: 'rep-1',
        conversationId: 'conv-1',
        messages: [
          {
            id: 'user-1',
            role: 'user',
            parts: [{ type: 'text', text: 'Add a piece to Dance Floor' }],
          } as UIMessage,
        ],
        latestUserMessageId: 'user-1',
        mode: 'workspace',
        nowIso: '2026-06-15T00:00:00.000Z',
      } as never),
    ).resolves.toMatchObject({
      sessionAfter: expect.objectContaining({
        id: 'workflow-1',
        workflowType: 'trade_board_add_listing',
      }),
      workflowIntents: ['trade_board', 'catalog'],
      toolPolicySource: 'active_workflow',
    })
  })

  it('does not start a blank add-listing workflow for a post-completion follow-up photo', async () => {
    const activeBuilder = {
      select: vi.fn(() => activeBuilder),
      eq: vi.fn(() => activeBuilder),
      in: vi.fn(() => activeBuilder),
      gt: vi.fn(() => activeBuilder),
      order: vi.fn(() => activeBuilder),
      limit: vi.fn(() => activeBuilder),
      maybeSingle: vi.fn(() => ({ data: null, error: null })),
    }
    const createBuilder = {
      insert: vi.fn(() => {
        throw new Error('should not create a new workflow')
      }),
    }
    const workflowSupabase = {
      from: vi.fn((table: string) => {
        if (table !== 'trade_board_intake_sessions') {
          throw new Error(`Unexpected table ${table}`)
        }
        const sessionCallCount = workflowSupabase.from.mock.calls.filter(
          ([name]) => name === 'trade_board_intake_sessions',
        ).length
        return sessionCallCount === 1 ? activeBuilder : createBuilder
      }),
    }

    const context = await getOrCreateTradeBoardIntakeContext({
      supabase: workflowSupabase as never,
      workflowSupabase: workflowSupabase as never,
      repId: 'rep-1',
      conversationId: 'conv-1',
      messages: [
        {
          id: 'user-1',
          role: 'user',
          parts: [{ type: 'text', text: 'Here is the label/details photo.' }],
        } as UIMessage,
        {
          id: 'assistant-1',
          role: 'assistant',
          parts: [
            {
              type: 'text',
              text:
                'Done - ER13229, The Florence Earrings, is now on your Dance Floor as available. It is using the catalog photo right now. If you want, I can also add trade preferences or a custom listing photo.',
            },
          ],
        } as UIMessage,
        {
          id: 'user-2',
          role: 'user',
          parts: [
            {
              type: 'file',
              mediaType: 'image/jpeg',
              url: 'data:image/jpeg;base64,SkVXRUxSWQ==',
            },
          ],
        } as UIMessage,
      ],
      latestUserMessageId: 'user-2',
      mode: 'workspace',
      nowIso: '2026-06-15T00:00:00.000Z',
    } as never)

    expect(context).toMatchObject({
      sessionAfter: null,
      workflowIntents: [],
      toolPolicySource: 'latest_turn_intent',
      workflowPromptState: '',
    })
    expect(createBuilder.insert).not.toHaveBeenCalled()
  })

  it('extracts rep-typed ER13229 product truth before asking for more intake details', async () => {
    const sessionRow = {
      id: 'workflow-1',
      rep_id: 'rep-1',
      conversation_id: 'conv-1',
      workflow_type: 'trade_board_add_listing',
      status: 'active',
      current_phase: 'details_capture',
      missing_fields: ['designName', 'jewelryFrontPhoto'],
      hard_blockers: [],
      soft_warnings: [],
      metadata: {
        failureCount: 1,
        lastFailure: { code: 'object_exists', stage: 'storage_upload' },
      },
    }
    const activeBuilder = {
      select: vi.fn(() => activeBuilder),
      eq: vi.fn(() => activeBuilder),
      in: vi.fn(() => activeBuilder),
      gt: vi.fn(() => activeBuilder),
      order: vi.fn(() => activeBuilder),
      limit: vi.fn(() => activeBuilder),
      maybeSingle: vi.fn(() => ({ data: sessionRow, error: null })),
    }
    const selectPhotosBuilder = {
      select: vi.fn(() => selectPhotosBuilder),
      eq: vi.fn(() => selectPhotosBuilder),
      order: vi.fn(() => ({ data: [], error: null })),
    }
    const upsertPhotoBuilder = {
      upsert: vi.fn(() => ({ error: null })),
    }
    const updateBuilder = {
      update: vi.fn(() => updateBuilder),
      eq: vi.fn(() => ({ error: null })),
    }
    const workflowSupabase = {
      from: vi.fn((table: string) => {
        const callsForTable = workflowSupabase.from.mock.calls.filter(
          ([name]) => name === table,
        ).length
        if (table === 'trade_board_intake_sessions') {
          return callsForTable === 1 ? activeBuilder : updateBuilder
        }
        if (table === 'trade_board_intake_photos') {
          return callsForTable === 1 ? selectPhotosBuilder : upsertPhotoBuilder
        }
        throw new Error(`Unexpected table ${table}`)
      }),
    }

    const context = await getOrCreateTradeBoardIntakeContext({
      supabase: workflowSupabase as never,
      workflowSupabase: workflowSupabase as never,
      repId: 'rep-1',
      conversationId: 'conv-1',
      messages: [
        {
          id: 'assistant-1',
          role: 'assistant',
          parts: [
            {
              type: 'text',
              text: 'Upload a photo - snap a pic of the item-info tag or label, or the jewelry itself.',
            },
          ],
        } as UIMessage,
        {
          id: 'user-1',
          role: 'user',
          parts: [
            {
              type: 'text',
              text:
                'ER13229, The Florence Earrings. Lab-Created Ruby, Rhodium Plating, $160 MSRP. Collection is July Birthday Collection 2026. This is a standard piece, not a diamond or unicorn. Use the attached boxed display photo as the customer-facing jewelry photo.',
            },
            {
              type: 'file',
              mediaType: 'image/jpeg',
              url: 'data:image/jpeg;base64,SkVXRUxSWQ==',
            },
          ],
        } as UIMessage,
      ],
      latestUserMessageId: 'user-1',
      mode: 'workspace',
      nowIso: '2026-06-15T00:00:00.000Z',
    } as never)

    expect(context.sessionAfter?.known).toMatchObject({
      itemNumber: 'ER13229',
      designName: 'The Florence Earrings',
      collectionName: 'July Birthday',
      collectionYear: 2026,
      mainStone: 'Lab-Created Ruby',
      material: 'Rhodium Plating',
      bpMsrp: 160,
      rarityClassification: 'standard',
    })
    expect(context.sessionAfter?.phase).toBe('ready_to_add')
    expect(context.sessionAfter?.missing).toEqual([])
    expect(context.sessionAfter?.metadata).toEqual({
      failureCount: 1,
      lastFailure: { code: 'object_exists', stage: 'storage_upload' },
    })
    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        design_name: 'The Florence Earrings',
        collection_name: 'July Birthday',
        collection_year: 2026,
        main_stone: 'Lab-Created Ruby',
        material: 'Rhodium Plating',
        bp_msrp: 160,
        rarity_classification: 'standard',
        current_phase: 'ready_to_add',
        missing_fields: [],
        metadata: {
          failureCount: 1,
          lastFailure: { code: 'object_exists', stage: 'storage_upload' },
          duplicatePhysicalConfirmed: false,
        },
      }),
    )
  })

  it('parses rep confirmation of trailing Birthday collection without capturing ection', async () => {
    const sessionRow = {
      id: 'workflow-1',
      rep_id: 'rep-1',
      conversation_id: 'conv-1',
      workflow_type: 'trade_board_add_listing',
      status: 'active',
      current_phase: 'details_capture',
      item_number: 'ER13229',
      design_name: 'The Florence Earrings',
      collection_name: null,
      collection_year: null,
      missing_fields: ['collectionName'],
      hard_blockers: [],
      soft_warnings: [],
    }
    const activeBuilder = {
      select: vi.fn(() => activeBuilder),
      eq: vi.fn(() => activeBuilder),
      in: vi.fn(() => activeBuilder),
      gt: vi.fn(() => activeBuilder),
      order: vi.fn(() => activeBuilder),
      limit: vi.fn(() => activeBuilder),
      maybeSingle: vi.fn(() => ({ data: sessionRow, error: null })),
    }
    const selectPhotosBuilder = {
      select: vi.fn(() => selectPhotosBuilder),
      eq: vi.fn(() => selectPhotosBuilder),
      order: vi.fn(() => ({
        data: [
          {
            conversation_message_id: 'photo-msg-1',
            attachment_index: 1,
            declared_role: 'jewelry_front',
            visual_role: 'jewelry',
            role_confirmed: true,
            image_url: 'data:image/jpeg;base64,SkVXRUxSWQ==',
            quality: 'usable',
            quality_issues: [],
            notes: ['boxed display jewelry is centered and clear'],
          },
        ],
        error: null,
      })),
    }
    const updateBuilder = {
      update: vi.fn(() => updateBuilder),
      eq: vi.fn(() => ({ error: null })),
    }
    const workflowSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'trade_board_intake_sessions') {
          return workflowSupabase.from.mock.calls.filter(
            ([name]) => name === table,
          ).length === 1
            ? activeBuilder
            : updateBuilder
        }
        if (table === 'trade_board_intake_photos') return selectPhotosBuilder
        throw new Error(`Unexpected table ${table}`)
      }),
    }

    const context = await getOrCreateTradeBoardIntakeContext({
      supabase: workflowSupabase as never,
      workflowSupabase: workflowSupabase as never,
      repId: 'rep-1',
      conversationId: 'conv-1',
      messages: [
        {
          id: 'assistant-1',
          role: 'assistant',
          parts: [
            {
              type: 'text',
              text:
                'The system has July Birthday 2026 on file. Can you confirm the collection?',
            },
          ],
        } as UIMessage,
        {
          id: 'user-1',
          role: 'user',
          parts: [
            {
              type: 'text',
              text:
                'That is correct. This is the July Birthday collection, 2026.',
            },
          ],
        } as UIMessage,
      ],
      latestUserMessageId: 'user-1',
      mode: 'workspace',
      nowIso: '2026-06-16T00:00:00.000Z',
    } as never)

    expect(context.sessionAfter?.known).toMatchObject({
      itemNumber: 'ER13229',
      designName: 'The Florence Earrings',
      collectionName: 'July Birthday',
      collectionYear: 2026,
    })
    expect(context.sessionAfter?.known.collectionName).not.toBe('ection')
    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection_name: 'July Birthday',
        collection_year: 2026,
      }),
    )
  })

  it('persists catalog truth from search_jewelry_database output before the jewelry-only photo turn', async () => {
    const sessionRow = {
      id: 'workflow-1',
      rep_id: 'rep-1',
      conversation_id: 'conv-1',
      workflow_type: 'trade_board_add_listing',
      status: 'active',
      current_phase: 'photo_capture',
      item_number: null,
      design_name: null,
      collection_name: null,
      collection_year: null,
      missing_fields: ['itemNumber', 'designName', 'jewelryFrontPhoto'],
      hard_blockers: [],
      soft_warnings: [],
    }
    const activeBuilder = {
      select: vi.fn(() => activeBuilder),
      eq: vi.fn(() => activeBuilder),
      in: vi.fn(() => activeBuilder),
      gt: vi.fn(() => activeBuilder),
      order: vi.fn(() => activeBuilder),
      limit: vi.fn(() => activeBuilder),
      maybeSingle: vi.fn(() => ({ data: sessionRow, error: null })),
    }
    const selectPhotosBuilder = {
      select: vi.fn(() => selectPhotosBuilder),
      eq: vi.fn(() => selectPhotosBuilder),
      order: vi.fn(() => ({
        data: [
          {
            conversation_message_id: 'label-msg-1',
            attachment_index: 1,
            declared_role: 'label_details',
            visual_role: 'label_or_packaging',
            role_confirmed: true,
            image_url: 'data:image/jpeg;base64,TEFCRUw=',
            quality: 'unknown',
            quality_issues: [],
            notes: ['declared as label/details source'],
          },
        ],
        error: null,
      })),
    }
    const upsertPhotoBuilder = {
      upsert: vi.fn(() => ({ error: null })),
    }
    const updateBuilder = {
      update: vi.fn(() => updateBuilder),
      eq: vi.fn(() => ({ error: null })),
    }
    const workflowSupabase = {
      from: vi.fn((table: string) => {
        const callsForTable = workflowSupabase.from.mock.calls.filter(
          ([name]) => name === table,
        ).length
        if (table === 'trade_board_intake_sessions') {
          return callsForTable === 1 ? activeBuilder : updateBuilder
        }
        if (table === 'trade_board_intake_photos') {
          return callsForTable === 1 ? selectPhotosBuilder : upsertPhotoBuilder
        }
        throw new Error(`Unexpected table ${table}`)
      }),
    }

    const context = await getOrCreateTradeBoardIntakeContext({
      supabase: workflowSupabase as never,
      workflowSupabase: workflowSupabase as never,
      repId: 'rep-1',
      conversationId: 'conv-1',
      messages: [
        {
          id: 'assistant-search',
          role: 'assistant',
          parts: [
            {
              type: 'tool-search_jewelry_database',
              state: 'output-available',
              input: { query: 'ER13229' },
              output: {
                results: [
                  {
                    itemNumber: 'ER13229',
                    designName: 'The Florence Earrings',
                    collectionName: 'July Birthday',
                    collectionYear: 2026,
                    mainStone: 'Lab-Created Ruby',
                    material: 'Rhodium Plating',
                    bpMsrp: 160,
                  },
                ],
              },
            } as never,
            {
              type: 'text',
              text:
                'Perfect! I found ER13229. Just need the customer-facing jewelry photo.',
            },
          ],
        } as UIMessage,
        {
          id: 'user-jewelry',
          role: 'user',
          parts: [
            {
              type: 'text',
              text: 'No, this is a standard piece, not a diamond or unicorn.',
            },
            {
              type: 'file',
              mediaType: 'image/jpeg',
              url: 'data:image/jpeg;base64,SkVXRUxSWQ==',
            },
          ],
        } as UIMessage,
      ],
      latestUserMessageId: 'user-jewelry',
      mode: 'workspace',
      nowIso: '2026-06-16T00:00:00.000Z',
    } as never)

    expect(context.sessionAfter?.known).toMatchObject({
      itemNumber: 'ER13229',
      designName: 'The Florence Earrings',
      collectionName: 'July Birthday',
      collectionYear: 2026,
      mainStone: 'Lab-Created Ruby',
      material: 'Rhodium Plating',
      bpMsrp: 160,
      rarityClassification: 'standard',
    })
    expect(context.sessionAfter?.photos).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ declaredRole: 'label_details' }),
        expect.objectContaining({ declaredRole: 'jewelry_front' }),
      ]),
    )
    expect(context.sessionAfter?.missing).toEqual([])
    expect(context.sessionAfter?.phase).toBe('ready_to_add')
  })

  it('promotes the latest unknown photo when the rep confirms Nic-Nac identified it as jewelry-front', async () => {
    const sessionRow = {
      id: 'workflow-1',
      rep_id: 'rep-1',
      conversation_id: 'conv-1',
      workflow_type: 'trade_board_add_listing',
      status: 'active',
      current_phase: 'photo_capture',
      item_number: 'ER13229',
      design_name: 'The Florence Earrings',
      collection_name: 'July Birthday',
      collection_year: 2026,
      rarity_classification: 'standard',
      missing_fields: ['jewelryFrontPhoto'],
      hard_blockers: [],
      soft_warnings: [],
    }
    const activeBuilder = {
      select: vi.fn(() => activeBuilder),
      eq: vi.fn(() => activeBuilder),
      in: vi.fn(() => activeBuilder),
      gt: vi.fn(() => activeBuilder),
      order: vi.fn(() => activeBuilder),
      limit: vi.fn(() => activeBuilder),
      maybeSingle: vi.fn(() => ({ data: sessionRow, error: null })),
    }
    const selectPhotosBuilder = {
      select: vi.fn(() => selectPhotosBuilder),
      eq: vi.fn(() => selectPhotosBuilder),
      order: vi.fn(() => ({
        data: [
          {
            conversation_message_id: 'label-msg-1',
            attachment_index: 1,
            declared_role: 'label_details',
            visual_role: 'label_or_packaging',
            role_confirmed: true,
            image_url: 'data:image/jpeg;base64,TEFCRUw=',
            quality: 'unknown',
            quality_issues: [],
            notes: ['declared as label/details source'],
          },
          {
            conversation_message_id: 'jewelry-msg-1',
            attachment_index: 1,
            declared_role: 'unknown',
            visual_role: 'uncertain',
            role_confirmed: false,
            image_url: 'data:image/jpeg;base64,SkVXRUxSWQ==',
            quality: 'unknown',
            quality_issues: [],
            notes: [],
          },
        ],
        error: null,
      })),
    }
    const upsertPhotoBuilder = {
      upsert: vi.fn(() => ({ error: null })),
    }
    const updateBuilder = {
      update: vi.fn(() => updateBuilder),
      eq: vi.fn(() => ({ error: null })),
    }
    const workflowSupabase = {
      from: vi.fn((table: string) => {
        const callsForTable = workflowSupabase.from.mock.calls.filter(
          ([name]) => name === table,
        ).length
        if (table === 'trade_board_intake_sessions') {
          return callsForTable === 1 ? activeBuilder : updateBuilder
        }
        if (table === 'trade_board_intake_photos') {
          return callsForTable === 1 ? selectPhotosBuilder : upsertPhotoBuilder
        }
        throw new Error(`Unexpected table ${table}`)
      }),
    }

    const context = await getOrCreateTradeBoardIntakeContext({
      supabase: workflowSupabase as never,
      workflowSupabase: workflowSupabase as never,
      repId: 'rep-1',
      conversationId: 'conv-1',
      messages: [
        {
          id: 'assistant-confirm-photo',
          role: 'assistant',
          parts: [
            {
              type: 'text',
              text:
                "The boxed display shot you just sent looks perfect for the listing. Can you confirm that's the jewelry-front photo you want to use for this piece?",
            },
          ],
        } as UIMessage,
        {
          id: 'user-confirm',
          role: 'user',
          parts: [{ type: 'text', text: 'Use this photo.' }],
        } as UIMessage,
      ],
      latestUserMessageId: 'user-confirm',
      mode: 'workspace',
      nowIso: '2026-06-16T00:00:00.000Z',
    } as never)

    expect(context.sessionAfter?.photos[1]).toMatchObject({
      declaredRole: 'jewelry_front',
      visualRole: 'uncertain',
      roleConfirmed: true,
      imageUrl: 'data:image/jpeg;base64,SkVXRUxSWQ==',
    })
    expect(context.sessionAfter?.missing).toEqual([])
    expect(context.sessionAfter?.phase).toBe('ready_to_add')
    expect(upsertPhotoBuilder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        conversation_message_id: 'jewelry-msg-1',
        attachment_index: 1,
        declared_role: 'jewelry_front',
        visual_role: 'uncertain',
        role_confirmed: true,
        image_url: 'data:image/jpeg;base64,SkVXRUxSWQ==',
      }),
      { onConflict: 'session_id,conversation_message_id,attachment_index' },
    )
  })

  it('promotes the latest unknown photo when Nic-Nac identified it as a boxed display before confirming collection', async () => {
    const sessionRow = {
      id: 'workflow-1',
      rep_id: 'rep-1',
      conversation_id: 'conv-1',
      workflow_type: 'trade_board_add_listing',
      status: 'active',
      current_phase: 'photo_capture',
      item_number: 'ER13229',
      design_name: 'The Florence Earrings',
      collection_name: 'July Birthday',
      collection_year: 2026,
      rarity_classification: 'standard',
      missing_fields: ['jewelryFrontPhoto'],
      hard_blockers: [],
      soft_warnings: [],
    }
    const activeBuilder = {
      select: vi.fn(() => activeBuilder),
      eq: vi.fn(() => activeBuilder),
      in: vi.fn(() => activeBuilder),
      gt: vi.fn(() => activeBuilder),
      order: vi.fn(() => activeBuilder),
      limit: vi.fn(() => activeBuilder),
      maybeSingle: vi.fn(() => ({ data: sessionRow, error: null })),
    }
    const selectPhotosBuilder = {
      select: vi.fn(() => selectPhotosBuilder),
      eq: vi.fn(() => selectPhotosBuilder),
      order: vi.fn(() => ({
        data: [
          {
            conversation_message_id: 'label-msg-1',
            attachment_index: 1,
            declared_role: 'label_details',
            visual_role: 'label_or_packaging',
            role_confirmed: true,
            image_url: 'data:image/jpeg;base64,TEFCRUw=',
            quality: 'unknown',
            quality_issues: [],
            notes: ['declared as label/details source'],
          },
          {
            conversation_message_id: 'jewelry-msg-1',
            attachment_index: 1,
            declared_role: 'unknown',
            visual_role: 'uncertain',
            role_confirmed: false,
            image_url: 'data:image/jpeg;base64,SkVXRUxSWQ==',
            quality: 'unknown',
            quality_issues: [],
            notes: [],
          },
        ],
        error: null,
      })),
    }
    const upsertPhotoBuilder = {
      upsert: vi.fn(() => ({ error: null })),
    }
    const updateBuilder = {
      update: vi.fn(() => updateBuilder),
      eq: vi.fn(() => ({ error: null })),
    }
    const workflowSupabase = {
      from: vi.fn((table: string) => {
        const callsForTable = workflowSupabase.from.mock.calls.filter(
          ([name]) => name === table,
        ).length
        if (table === 'trade_board_intake_sessions') {
          return callsForTable === 1 ? activeBuilder : updateBuilder
        }
        if (table === 'trade_board_intake_photos') {
          return callsForTable === 1 ? selectPhotosBuilder : upsertPhotoBuilder
        }
        throw new Error(`Unexpected table ${table}`)
      }),
    }

    const context = await getOrCreateTradeBoardIntakeContext({
      supabase: workflowSupabase as never,
      workflowSupabase: workflowSupabase as never,
      repId: 'rep-1',
      conversationId: 'conv-1',
      messages: [
        {
          id: 'assistant-boxed-collection-confirm',
          role: 'assistant',
          parts: [
            {
              type: 'text',
              text:
                'Perfect - that is a great boxed display photo of the earrings. I can see them clearly in the Bomb Party packaging. July Birthday 2026 still the right collection for these?',
            },
          ],
        } as UIMessage,
        {
          id: 'user-confirm',
          role: 'user',
          parts: [{ type: 'text', text: 'Confirmed.' }],
        } as UIMessage,
      ],
      latestUserMessageId: 'user-confirm',
      mode: 'workspace',
      nowIso: '2026-06-16T00:00:00.000Z',
    } as never)

    expect(context.sessionAfter?.photos[1]).toMatchObject({
      declaredRole: 'jewelry_front',
      visualRole: 'uncertain',
      roleConfirmed: true,
      imageUrl: 'data:image/jpeg;base64,SkVXRUxSWQ==',
    })
    expect(context.sessionAfter?.missing).toEqual([])
    expect(context.sessionAfter?.phase).toBe('ready_to_add')
  })

  it('promotes the latest unknown photo when the rep asks Nic-Nac to push through a visually accepted front photo', async () => {
    const sessionRow = {
      id: 'workflow-1',
      rep_id: 'rep-1',
      conversation_id: 'conv-1',
      workflow_type: 'trade_board_add_listing',
      status: 'active',
      current_phase: 'photo_capture',
      item_number: 'ER18012',
      design_name: 'Quiet Luxury',
      collection_name: 'July Birthday',
      collection_year: 2026,
      rarity_classification: 'standard',
      missing_fields: ['jewelryFrontPhoto'],
      hard_blockers: [],
      soft_warnings: [],
    }
    const activeBuilder = {
      select: vi.fn(() => activeBuilder),
      eq: vi.fn(() => activeBuilder),
      in: vi.fn(() => activeBuilder),
      gt: vi.fn(() => activeBuilder),
      order: vi.fn(() => activeBuilder),
      limit: vi.fn(() => activeBuilder),
      maybeSingle: vi.fn(() => ({ data: sessionRow, error: null })),
    }
    const selectPhotosBuilder = {
      select: vi.fn(() => selectPhotosBuilder),
      eq: vi.fn(() => selectPhotosBuilder),
      order: vi.fn(() => ({
        data: [
          {
            conversation_message_id: 'earrings-msg-1',
            attachment_index: 1,
            declared_role: 'unknown',
            visual_role: 'uncertain',
            role_confirmed: false,
            image_url: 'data:image/jpeg;base64,RVIxODAxMl9GUk9OVA==',
            quality: 'unknown',
            quality_issues: [],
            notes: [],
          },
        ],
        error: null,
      })),
    }
    const upsertPhotoBuilder = {
      upsert: vi.fn(() => ({ error: null })),
    }
    const updateBuilder = {
      update: vi.fn(() => updateBuilder),
      eq: vi.fn(() => ({ error: null })),
    }
    const workflowSupabase = {
      from: vi.fn((table: string) => {
        const callsForTable = workflowSupabase.from.mock.calls.filter(
          ([name]) => name === table,
        ).length
        if (table === 'trade_board_intake_sessions') {
          return callsForTable === 1 ? activeBuilder : updateBuilder
        }
        if (table === 'trade_board_intake_photos') {
          return callsForTable === 1 ? selectPhotosBuilder : upsertPhotoBuilder
        }
        throw new Error(`Unexpected table ${table}`)
      }),
    }

    const context = await getOrCreateTradeBoardIntakeContext({
      supabase: workflowSupabase as never,
      workflowSupabase: workflowSupabase as never,
      repId: 'rep-1',
      conversationId: 'conv-1',
      messages: [
        {
          id: 'assistant-photo-handoff-stuck',
          role: 'assistant',
          parts: [
            {
              type: 'text',
              text:
                "I've got the front photo visually, but the save step still isn't picking it up on my side.",
            },
          ],
        } as UIMessage,
        {
          id: 'user-confirm',
          role: 'user',
          parts: [
            {
              type: 'text',
              text: "Push it through, please. It's a good photo.",
            },
          ],
        } as UIMessage,
      ],
      latestUserMessageId: 'user-confirm',
      mode: 'workspace',
      nowIso: '2026-06-27T00:00:00.000Z',
    } as never)

    expect(context.sessionAfter?.photos[0]).toMatchObject({
      declaredRole: 'jewelry_front',
      visualRole: 'uncertain',
      roleConfirmed: true,
      imageUrl: 'data:image/jpeg;base64,RVIxODAxMl9GUk9OVA==',
    })
    expect(context.sessionAfter?.missing).toEqual([])
    expect(context.sessionAfter?.phase).toBe('ready_to_add')
    expect(upsertPhotoBuilder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        conversation_message_id: 'earrings-msg-1',
        attachment_index: 1,
        declared_role: 'jewelry_front',
        visual_role: 'uncertain',
        role_confirmed: true,
        image_url: 'data:image/jpeg;base64,RVIxODAxMl9GUk9OVA==',
      }),
      { onConflict: 'session_id,conversation_message_id,attachment_index' },
    )
  })
})
