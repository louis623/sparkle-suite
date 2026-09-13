import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveNicNacWorkspaceMode } from '@/lib/nic-nac/required-setup-client-mode'

const client = readFileSync(resolve(process.cwd(), 'app/nic-nac/_client.tsx'), 'utf8')
const requiredSetupHome = readFileSync(
  resolve(process.cwd(), 'app/nic-nac/components/RequiredSetupHome.tsx'),
  'utf8',
)
const liveQueuePanel = readFileSync(
  resolve(process.cwd(), 'app/nic-nac/components/RequiredSetupLiveQueuePanel.tsx'),
  'utf8',
)

describe('Nic-Nac required setup client', () => {
  it('uses a reusable chat body component', () => {
    expect(client).toContain("from './components/NicNacChatBody'")
    expect(client).not.toContain('function ChatBody(')
  })

  it('loads setup state and routes required setup before the full dashboard', () => {
    expect(client).toContain('/api/self-serve/setup-state')
    expect(client).toContain('RequiredSetupHome')
    expect(client).toContain('resolveNicNacWorkspaceMode')
    expect(client).toContain("searchParams.get('onboarding') === 'required-setup'")
    expect(client).toContain("workspaceMode === 'dashboard_unlocked'")
  })

  it('does not bypass real setup state with a local preview fallback', () => {
    expect(client).not.toContain("searchParams.get('preview') === 'setup'")
    expect(client).not.toContain('canUseLocalRequiredSetupPreview')
    expect(client).not.toContain('buildLocalRequiredSetupPreviewState')
    expect(client).not.toContain('const immediateReviewState')
  })

  it('surfaces a local setup-state load blocker instead of spinning forever', () => {
    expect(client).toContain('SETUP_STATE_TIMEOUT_MS')
    expect(client).toContain("controller.abort('timeout')")
    expect(client).toContain('Setup state did not load')
  })

  it('routes unauthenticated setup-state loads to login with a workspace return path', () => {
    expect(client).toContain('buildLoginRedirectHref')
    expect(client).toContain('res.status === 401')
    expect(client).toContain('router.replace(buildLoginRedirectHref())')
    expect(client).toContain("encodeURIComponent(returnPath)")
  })

  it('syncs a returned Stripe checkout session before loading required setup', () => {
    expect(client).toContain('/api/stripe/sync')
    expect(client).toContain('CHECKOUT_SYNC_TIMEOUT_MS')
    expect(client).toContain("searchParams.get('billing')")
    expect(client).toContain("searchParams.get('session_id')")
    expect(client).toContain("billingState === 'subscription-success'")
    expect(client).toContain('syncReturnedCheckoutSession(checkoutSessionId')
    expect(client).toContain('Finalizing Stripe checkout')
    expect(client).toContain('Stripe checkout sync did not finish')
  })

  it('does not trust a checkout-success conversation id until setup sync resolves the rep', () => {
    expect(client).toContain('canUseUrlConversationId')
    expect(client).toContain('checkoutSyncComplete')
  })

  it('passes the Stripe success return into workspace mode resolution', () => {
    expect(client).toContain('isCheckoutSuccessReturn')
  })

  it('shows reviewer setup actions only for reviewer smoke setup state', () => {
    expect(client).toContain('isReviewerSmokeSetupState')
    expect(client).toContain('state?.supportState?.reviewer_smoke')
    expect(client).toContain(
      'reviewerSmokeVisible && isReviewerSmokeSetupState(setupState)',
    )
    expect(client).toContain('showReviewerSetupActions ? (')
  })

  it('sends the setup chat mode only during required setup', () => {
    expect(client).toContain("mode: isRequiredSetupMode ? 'required_setup' : 'workspace'")
    expect(client).toContain("chatMode={isRequiredSetupMode ? 'required_setup' : 'workspace'}")
  })

  it('surfaces actionable send failures during required setup', () => {
    const chatBody = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/NicNacChatBody.tsx'),
      'utf8',
    )
    const route = readFileSync(
      resolve(process.cwd(), 'app/api/nic-nac/route.ts'),
      'utf8',
    )

    expect(chatBody).toContain('REQUIRED_SETUP_SEND_ERROR_MESSAGE')
    expect(chatBody).toContain(
      'Nic-Nac could not send because required setup context is missing. Refresh, then try again.',
    )
    expect(route).toContain('REQUIRED_SETUP_CHAT_CONTEXT_MISSING')
    expect(route).toContain('Required setup chat failed.')
  })

  it('passes the active setup step into chat so setup can show step-specific UI', () => {
    expect(client).toContain('requiredSetupStep={setupState?.currentStep ?? null}')
  })

  it('makes Help & Resources available during required setup', () => {
    expect(requiredSetupHome).toContain('HelpResourcesCard')
    expect(requiredSetupHome).toContain('getHelpResources')
    expect(requiredSetupHome).toContain('Setup help is available from the start.')
    expect(requiredSetupHome).toContain('aria-label="Setup help and resources"')
  })

  it('keeps Nic-Nac expanded on the Help & Resources workspace section', () => {
    expect(client).toContain("activeWorkspaceSection === 'help-resources'")
    expect(client).toContain('shouldKeepDesktopNicNacOpen')
    expect(client).toContain('desktopOpen || shouldKeepDesktopNicNacOpen')
    expect(client).toContain(
      'desktopOpen || shouldKeepDesktopNicNacOpen ? null',
    )
    expect(client).toContain('!desktopOpen && !shouldKeepDesktopNicNacOpen')
  })

  it('passes the assigned Live Queue sync code into chat for Live Queue setup', () => {
    expect(client).toContain('requiredSetupSyncCode={requiredSetupSyncCode}')
    expect(client).toContain('setupState?.liveQueueSyncCode ?? null')
    expect(client).not.toContain('formatExtensionRepId(setupState?.repId)')
  })

  it('passes the exact required setup preview href into chat', () => {
    expect(client).toContain('requiredSetupPreviewHref={requiredSetupPreviewHref}')
    expect(client).toContain('const requiredSetupPublicSiteSlug = getRequiredSetupPublicSiteSlug(setupState)')
    expect(client).toContain('buildCustomerSparkleSiteHref({')
    expect(client).toContain('publicSiteSlug: requiredSetupPublicSiteSlug')
    expect(client).toContain('publicSiteSlugOverride={requiredSetupPublicSiteSlug}')
  })

  it('uses current required setup product language in setup surfaces', () => {
    const source = requiredSetupHome

    expect(source).not.toContain('Site skin')
    expect(source).not.toContain('public site')
    expect(source).not.toContain('dancefloor/dance floor')
    expect(source).toContain('customer-facing website')
  })

  it('verifies server readiness instead of manufacturing checklist completion evidence', () => {
    expect(liveQueuePanel).toContain('/api/workspace/live-lineup/readiness')
    expect(liveQueuePanel).toContain('LiveLineupPublisherControls')
    expect(liveQueuePanel).toContain('isLineupSetupReadiness(next)')
    expect(liveQueuePanel).toContain('if (!next.ready)')
    expect(liveQueuePanel).not.toContain('extensionInstalled: true')
    expect(liveQueuePanel).not.toContain('syncCodeEntered: true')
    expect(liveQueuePanel).not.toContain('liveQueueConnected: true')
    expect(liveQueuePanel).toContain('Do not use checklist claims as connection proof')
  })

  it('refreshes setup state after required setup chat responses settle', () => {
    expect(client).toContain('wasStreamingRef')
    expect(client).toContain('void loadSetupState()')
  })

  it('never opens checkout as a side effect of signing in', () => {
    expect(client).toContain("searchParams.get('onboarding') === 'checkout-required'")
    expect(client).toContain('WorkspaceAccessPending')
    expect(client).not.toContain('/api/stripe/create-checkout')
    expect(client).not.toContain('handleStartCheckout')
    expect(client).not.toContain('Opening checkout...')
    expect(client).not.toContain("onboarding') === 'self-serve-started'")
  })
})

describe('required setup client mode precedence', () => {
  it.each([
    ['checkout_required', 'checkout_required'],
    ['payment_pending', 'checkout_required'],
    ['required_setup', 'required_setup'],
    ['setup_blocked', 'required_setup'],
    ['dashboard_unlocked', 'dashboard_unlocked'],
  ] as const)('uses structured %s setup state before URL hints', (setupStatus, mode) => {
    expect(
      resolveNicNacWorkspaceMode({
        setupStatus,
        wantsCheckout: setupStatus === 'dashboard_unlocked',
        wantsRequiredSetup:
          setupStatus === 'checkout_required' || setupStatus === 'payment_pending',
      }),
    ).toBe(mode)
  })

  it('uses URL hints only before structured setup state is available', () => {
    expect(
      resolveNicNacWorkspaceMode({
        setupStatus: null,
        wantsCheckout: false,
        wantsRequiredSetup: true,
      }),
    ).toBe('required_setup')
    expect(
      resolveNicNacWorkspaceMode({
        setupStatus: undefined,
        wantsCheckout: true,
        wantsRequiredSetup: false,
      }),
    ).toBe('checkout_required')
  })

  it('uses unlocked server state after Stripe setup returns instead of staying in setup', () => {
    expect(
      resolveNicNacWorkspaceMode({
        setupStatus: 'dashboard_unlocked',
        wantsCheckout: false,
        wantsRequiredSetup: true,
        isCheckoutSuccessReturn: true,
      }),
    ).toBe('dashboard_unlocked')
  })
})
