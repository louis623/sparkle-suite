import { describe, expect, it } from 'vitest'
import type { UIMessage } from 'ai'

import {
  getWorkspaceRefreshPartKey,
  getWorkspaceRefreshTopicsFromMessages,
  isCalendarWorkspaceMutationPart,
  isCustomerWorkspaceMutationPart,
  isSiteWorkspaceMutationPart,
  isTradeWorkspaceMutationPart,
} from '@/lib/nic-nac/workspace-refresh-events'

function assistantWithToolPart(part: unknown): UIMessage {
  return {
    id: 'assistant-1',
    role: 'assistant',
    parts: [part],
  } as UIMessage
}

describe('Nic-Nac workspace refresh events', () => {
  it('requests a trade workspace refresh after add_listing creates a listing', () => {
    const messages = [
      assistantWithToolPart({
        type: 'tool-add_listing',
        state: 'output-available',
        output: {
          mode: 'single',
          listingId: 'listing-1',
          itemNumber: 'NK18149',
        },
      }),
    ]

    expect(getWorkspaceRefreshTopicsFromMessages(messages)).toEqual(['trade'])
  })

  it('requests one trade refresh after add_listing batch adds physical units', () => {
    const messages = [
      assistantWithToolPart({
        type: 'tool-add_listing',
        state: 'output-available',
        output: {
          mode: 'batch',
          added: [
            { listingId: 'listing-1', itemNumber: 'NK18149' },
            { listingId: 'listing-2', itemNumber: 'NK18149' },
          ],
        },
      }),
    ]

    expect(getWorkspaceRefreshTopicsFromMessages(messages)).toEqual(['trade'])
  })

  it('does not refresh for add_listing recovery prompts that did not mutate the board', () => {
    expect(
      isTradeWorkspaceMutationPart({
        type: 'tool-add_listing',
        state: 'output-available',
        output: {
          needsAction: 'create_design',
          itemNumber: 'NK18149',
        },
      }),
    ).toBe(false)
  })

  it('does not refresh for tool errors such as photo preflight failures', () => {
    expect(
      isTradeWorkspaceMutationPart({
        type: 'tool-add_listing',
        state: 'output-available',
        output: {
          code: 'PHOTO_PREFLIGHT_FAILED',
          message: 'That photo needs one more try.',
        },
      }),
    ).toBe(false)
  })

  it('requests a trade refresh for other successful trade write tools', () => {
    expect(
      isTradeWorkspaceMutationPart({
        type: 'tool-remove_listing',
        state: 'output-available',
        output: {
          listingId: 'listing-1',
        },
      }),
    ).toBe(true)
  })

  it('requests a trade refresh after approve_trade_swap completes', () => {
    expect(
      isTradeWorkspaceMutationPart({
        type: 'tool-approve_trade_swap',
        state: 'output-available',
        output: {
          requestId: 'request-1',
          replacementStatus: 'needs_catalog_details',
        },
      }),
    ).toBe(true)
  })

  it('requests a site preview refresh after site customization tools mutate settings', () => {
    const messages = [
      assistantWithToolPart({
        type: 'tool-update_site_setting',
        state: 'output-available',
        output: {
          settings: {
            bannerText: 'Going live at 8',
          },
        },
      }),
    ]

    expect(isSiteWorkspaceMutationPart(messages[0].parts[0] as never)).toBe(true)
    expect(getWorkspaceRefreshTopicsFromMessages(messages)).toEqual(['site'])
  })

  it('requests a site preview refresh after Nic-Nac saves a Pantry recipe', () => {
    const messages = [
      assistantWithToolPart({
        type: 'tool-manage_site_recipes',
        state: 'output-available',
        output: {
          action: 'upsert',
          recipe: {
            id: 'recipe-1',
            title: 'Chocolate-Dipped Strawberries',
          },
        },
      }),
    ]

    expect(isSiteWorkspaceMutationPart(messages[0].parts[0] as never)).toBe(true)
    expect(getWorkspaceRefreshTopicsFromMessages(messages)).toEqual(['site'])
  })

  it('requests an audience refresh after Nic-Nac updates a customer card', () => {
    const messages = [
      assistantWithToolPart({
        type: 'tool-manage_customer_contact',
        state: 'output-available',
        output: { action: 'updated', customer: { id: 'aud-1' } },
      }),
    ]

    expect(isCustomerWorkspaceMutationPart(messages[0].parts[0] as never)).toBe(true)
    expect(getWorkspaceRefreshTopicsFromMessages(messages)).toEqual(['audience'])
    expect(isCustomerWorkspaceMutationPart({
      type: 'tool-manage_customer_contact',
      state: 'output-available',
      output: { code: 'CUSTOMER_NOT_FOUND' },
    })).toBe(false)
  })

  it('requests a calendar workspace refresh after add_show writes a show', () => {
    const messages = [
      assistantWithToolPart({
        type: 'tool-add_show',
        state: 'output-available',
        output: {
          event: {
            id: 'show-1',
            title: 'Fireworks Fizzing',
          },
        },
      }),
    ]

    expect(isCalendarWorkspaceMutationPart(messages[0].parts[0] as never)).toBe(true)
    expect(getWorkspaceRefreshTopicsFromMessages(messages)).toEqual(['calendar'])
  })

  it('requests calendar refreshes for recurring and cancellation show writes', () => {
    for (const type of [
      'tool-update_show',
      'tool-cancel_show',
      'tool-cancel_show_series',
      'tool-pause_show_series',
      'tool-skip_show_occurrence',
      'tool-start_show_session',
      'tool-end_show',
    ]) {
      expect(
        isCalendarWorkspaceMutationPart({
          type,
          state: 'output-available',
          output: { event: { id: 'show-1' } },
        }),
      ).toBe(true)
    }
  })

  it('does not refresh the calendar for failed show tools', () => {
    expect(
      isCalendarWorkspaceMutationPart({
        type: 'tool-add_show',
        state: 'output-available',
        output: {
          code: 'INVALID_INPUT',
          message: 'That show needs a date.',
        },
      }),
    ).toBe(false)
  })

  it('does not refresh the site preview for failed site-setting tools', () => {
    expect(
      isSiteWorkspaceMutationPart({
        type: 'tool-update_site_setting',
        state: 'output-available',
        output: {
          code: 'SITE_SETTINGS_UPDATE_FAILED',
          message: 'Unable to update that setting.',
        },
      }),
    ).toBe(false)
  })

  it('builds stable part keys so the client dispatches each mutation once', () => {
    const message = assistantWithToolPart({
      type: 'tool-add_listing',
      state: 'output-available',
      output: { listingId: 'listing-1' },
    })

    expect(getWorkspaceRefreshPartKey(message, message.parts[0], 0)).toBe(
      'assistant-1:0:tool-add_listing:output-available',
    )
  })
})
