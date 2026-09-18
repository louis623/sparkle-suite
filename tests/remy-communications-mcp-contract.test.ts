import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  controlCenterMcpToolNames,
  remyMcpToolNames,
} from '@/lib/remy-communications/mcp'

describe('Sparkle Suite Control Center MCP contract', () => {
  it('extends the single Communications MCP with waitlist and health reads', () => {
    expect(controlCenterMcpToolNames).toEqual([
      'communications_get_inbox_summary',
      'communications_list_support_reports',
      'communications_get_support_report',
      'communications_list_network_safety_queue',
      'communications_list_broadcasts',
      'communications_draft_support_reply',
      'communications_request_support_reply_approval',
      'communications_send_approved_support_reply',
      'communications_draft_broadcast',
      'communications_draft_task_candidate',
      'control_center_list_waitlist_leads',
      'control_center_get_waitlist_lead',
      'control_center_get_operator_health',
      'control_center_get_nic_nac_usage',
      'control_center_get_accounting_summary',
    ])
    expect(remyMcpToolNames).toBe(controlCenterMcpToolNames)
  })

  it('does not expose blocked writes or private conversation access', () => {
    expect(controlCenterMcpToolNames).not.toContain('communications_publish_broadcast')
    expect(controlCenterMcpToolNames).not.toContain('communications_moderate_network')
    expect(controlCenterMcpToolNames).not.toContain('communications_change_support_status')
    expect(controlCenterMcpToolNames).not.toContain('control_center_update_waitlist_lead')
    expect(controlCenterMcpToolNames).not.toContain('control_center_list_rep_conversations')
    expect(controlCenterMcpToolNames).not.toContain('control_center_deploy')
    expect(controlCenterMcpToolNames).not.toContain('control_center_run_sparkle_lab')
    expect(controlCenterMcpToolNames).not.toContain('control_center_suspend_rep')
  })

  it('does not wrap a missing waitlist lead as a generic outage', () => {
    const source = readFileSync('lib/remy-communications/mcp.ts', 'utf8')
    expect(source).not.toContain("throw new Error('Waitlist lead was not found.')")
    expect(source).toContain('buildControlCenterWaitlistGetResult')
    expect(source).toContain('buildControlCenterWaitlistListResult')
    expect(source).toContain('sparkle_suite_waitlist')
  })
})
