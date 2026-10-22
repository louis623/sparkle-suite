import { describe, expect, it } from 'vitest'

import { APPROVAL_COPY, getApprovalCopy } from '@/app/nic-nac/components/HITLBlock'

describe('Nic-Nac HITL approval copy', () => {
  it('uses swap-specific approval copy for approve_trade_swap', () => {
    expect(APPROVAL_COPY.approve_trade_swap).toEqual({
      title: 'Approve this swap?',
      confirm: 'Approve swap',
      cancel: 'Cancel',
    })
  })

  it('uses catalog-specific approval copy for shared catalog corrections', () => {
    expect(APPROVAL_COPY.report_jewelry_catalog_issue).toEqual({
      title: 'Update this design for every rep?',
      confirm: 'Update catalog',
      cancel: 'Cancel',
    })
  })

  it('adds occurrence-specific detail for one-night show skips', () => {
    expect(
      getApprovalCopy('skip_show_occurrence', {
        eventId: '9ec8f40c-7c38-4d95-8d2a-0f06790d7c55',
        reason: 'sick tonight',
      }),
    ).toMatchObject({
      title: 'Skip this show only?',
      detail:
        'Show 9ec8f40c - Reason: sick tonight - Only this occurrence will be skipped.',
      confirm: 'Skip show',
      cancel: 'Keep show',
    })
  })

  it('adds pause range detail for recurring series pauses', () => {
    expect(
      getApprovalCopy('pause_show_series', {
        eventId: '9ec8f40c-7c38-4d95-8d2a-0f06790d7c55',
        pauseUntil: '2026-07-07',
      }),
    ).toMatchObject({
      detail: 'Series from show 9ec8f40c - Pause through 2026-07-07',
      confirm: 'Pause shows',
    })
  })

  it('summarizes default reminder preference changes', () => {
    expect(
      getApprovalCopy('set_notification_preferences', {
        enabled: true,
        channels: ['sms', 'email'],
        leadMinutes: 45,
      }),
    ).toMatchObject({
      detail: 'Reminders on - SMS + EMAIL - 45 min before',
      confirm: 'Save preferences',
    })
  })

  it('summarizes per-show reminder overrides', () => {
    expect(
      getApprovalCopy('set_show_reminder_override', {
        eventId: '9ec8f40c-7c38-4d95-8d2a-0f06790d7c55',
        enabled: true,
        channels: ['email'],
      }),
    ).toMatchObject({
      detail: 'Show 9ec8f40c - Reminders on - EMAIL',
      confirm: 'Save show reminder',
    })
  })
})
