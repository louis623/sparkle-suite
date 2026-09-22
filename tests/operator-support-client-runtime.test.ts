import { describe, expect, it } from 'vitest'

import {
  buildOperatorSupportGatewayUrl,
  isWorkspaceApiPath,
} from '@/lib/operator-support/client-runtime'

describe('operator support client runtime', () => {
  it('rewrites same-origin Workspace API calls into the frozen support session', () => {
    expect(
      buildOperatorSupportGatewayUrl(
        '/api/nic-nac/site-settings?view=dashboard',
        'session-1',
        'https://www.yoursparklesuite.com',
      ),
    ).toBe(
      '/api/control-center/support-sessions/session-1/gateway?path=%2Fapi%2Fnic-nac%2Fsite-settings&view=dashboard',
    )
    expect(
      buildOperatorSupportGatewayUrl(
        '/api/workspace/live-lineup',
        'session-1',
        'https://www.yoursparklesuite.com',
      ),
    ).toBe(
      '/api/control-center/support-sessions/session-1/gateway?path=%2Fapi%2Fworkspace%2Flive-lineup',
    )
    expect(
      buildOperatorSupportGatewayUrl(
        '/api/nic-nac/skin-options',
        'session-1',
        'https://www.yoursparklesuite.com',
      ),
    ).toBe(
      '/api/control-center/support-sessions/session-1/gateway?path=%2Fapi%2Fnic-nac%2Fskin-options',
    )
  })

  it('never rewrites external origins or non-Workspace routes', () => {
    expect(
      buildOperatorSupportGatewayUrl(
        'https://billing.example.com/api/nic-nac/site-settings',
        'session-1',
        'https://www.yoursparklesuite.com',
      ),
    ).toBeNull()
    expect(
      buildOperatorSupportGatewayUrl(
        '/api/control-center/messages',
        'session-1',
        'https://www.yoursparklesuite.com',
      ),
    ).toBeNull()
    expect(isWorkspaceApiPath('/api/stripe/create-checkout')).toBe(true)
  })
})
