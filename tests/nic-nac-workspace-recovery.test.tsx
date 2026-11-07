import { Children, createElement, isValidElement, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WorkspaceSetupRecovery, WORKSPACE_RECOVERY_MESSAGE } from '@/app/nic-nac/components/WorkspaceSetupRecovery'
import { requestWorkspaceSetupState } from '@/lib/nic-nac/workspace-setup-request'

function findButton(node: ReactNode): ReactElement<{ onClick: () => Promise<void> }> | undefined {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<{ children?: ReactNode; onClick?: () => Promise<void> }>(child)) continue
    if (child.type === 'button') return child as ReactElement<{ onClick: () => Promise<void> }>
    const button = findButton(child.props.children)
    if (button) return button
  }
}

describe('Workspace setup recovery', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('displays the safe error and both recovery actions without workspace data', () => {
    const signInHref = '/login?redirect=%2Fnic-nac%3FconversationId%3Dsynthetic'
    const html = renderToStaticMarkup(createElement(WorkspaceSetupRecovery, {
      onRetry: () => {}, signInHref,
    }))
    expect(WORKSPACE_RECOVERY_MESSAGE).toBe('We couldn’t load your workspace. Please try again. If the problem continues, sign out and sign back in.')
    expect(html).toContain(`role="alert">${WORKSPACE_RECOVERY_MESSAGE}</p>`)
    expect(html).toContain('<button type="button">Retry</button>')
    expect(html).toContain(`href="${signInHref}">Sign in</a>`)
    expect(html).not.toMatch(/Gracie|repId|liveQueueSyncCode|sslp_/)
  })

  it('Retry reuses the authorized setup request without choosing another identity or fallback', async () => {
    const endpoint = '/api/self-serve/setup-state?conversationId=synthetic'
    const authorizedRepId = 'authorized-synthetic-rep'
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ error: 'Failed to load setup state' }, { status: 500 }))
      .mockResolvedValueOnce(Response.json({ state: { repId: authorizedRepId, status: 'dashboard_unlocked' } }))
    vi.stubGlobal('fetch', fetchMock)
    const failed = await requestWorkspaceSetupState(endpoint)
    expect(failed.status).toBe(500)
    let recovered: { state: { repId: string } } | undefined
    const card = WorkspaceSetupRecovery({
      signInHref: '/login?redirect=%2Fnic-nac',
      onRetry: async () => {
        const response = await requestWorkspaceSetupState(endpoint)
        if (!response.ok) throw new Error('Setup still unavailable')
        recovered = await response.json()
      },
    })
    const retry = findButton(card)
    expect(retry).toBeDefined()
    await retry!.props.onClick()
    expect(recovered?.state.repId).toBe(authorizedRepId)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    for (const [url, options] of fetchMock.mock.calls) {
      expect(url).toBe(endpoint)
      expect(options).toMatchObject({ credentials: 'include', cache: 'no-store' })
      expect(options).not.toHaveProperty('body')
    }
  })
})
