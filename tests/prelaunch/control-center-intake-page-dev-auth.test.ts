import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getAuthenticatedOperatorMock = vi.fn()
const loadPrelaunchAgreementDocumentsByBuildIdsMock = vi.fn()
const loadPrelaunchIntakeReviewSubmissionsMock = vi.fn()
const loadPrelaunchLaunchChecksByBuildIdsMock = vi.fn()
const loadPrelaunchLaunchBuildsMock = vi.fn()
const loadPrelaunchLaunchGatesByBuildIdsMock = vi.fn()
const loadPrelaunchLaunchSetupProfilesByBuildIdsMock = vi.fn()
const loadPrelaunchWaitlistReviewLeadsMock = vi.fn()
const loadOperatorPaymentLinksMock = vi.fn()
const redirectMock = vi.fn((target: string) => {
  throw new Error(`redirect:${target}`)
})

const { MockAuthError, MockOperatorAuthError } = vi.hoisted(() => ({
  MockAuthError: class MockAuthError extends Error {},
  MockOperatorAuthError: class MockOperatorAuthError extends Error {},
}))

vi.mock('next/navigation', () => ({
  redirect: (target: string) => redirectMock(target),
}))

vi.mock('@/lib/supabase/operator-auth', () => ({
  AuthError: MockAuthError,
  OperatorAuthError: MockOperatorAuthError,
  getAuthenticatedOperator: (...args: unknown[]) =>
    getAuthenticatedOperatorMock(...args),
}))

vi.mock('@/lib/prelaunch/agreement-documents', () => ({
  loadPrelaunchAgreementDocumentsByBuildIds: (...args: unknown[]) =>
    loadPrelaunchAgreementDocumentsByBuildIdsMock(...args),
}))

vi.mock('@/lib/prelaunch/intake-review-query', () => ({
  loadPrelaunchIntakeReviewSubmissions: (...args: unknown[]) =>
    loadPrelaunchIntakeReviewSubmissionsMock(...args),
}))

vi.mock('@/lib/prelaunch/launch-builds', () => ({
  loadPrelaunchLaunchBuilds: (...args: unknown[]) =>
    loadPrelaunchLaunchBuildsMock(...args),
}))

vi.mock('@/lib/prelaunch/launch-checks', () => ({
  loadPrelaunchLaunchChecksByBuildIds: (...args: unknown[]) =>
    loadPrelaunchLaunchChecksByBuildIdsMock(...args),
}))

vi.mock('@/lib/prelaunch/launch-gates', () => ({
  loadPrelaunchLaunchGatesByBuildIds: (...args: unknown[]) =>
    loadPrelaunchLaunchGatesByBuildIdsMock(...args),
}))

vi.mock('@/lib/prelaunch/setup-profiles', () => ({
  loadPrelaunchLaunchSetupProfilesByBuildIds: (...args: unknown[]) =>
    loadPrelaunchLaunchSetupProfilesByBuildIdsMock(...args),
}))

vi.mock('@/lib/prelaunch/waitlist-review', () => ({
  loadPrelaunchWaitlistReviewLeads: (...args: unknown[]) =>
    loadPrelaunchWaitlistReviewLeadsMock(...args),
}))

vi.mock('@/lib/prelaunch/payment-links', () => ({
  loadOperatorPaymentLinks: (...args: unknown[]) =>
    loadOperatorPaymentLinksMock(...args),
}))

vi.mock(
  '@/app/internal/prelaunch/intake/_components/PrelaunchIntakeReviewPageContent',
  () => ({
    normalizePrelaunchIntakeReviewLane: (value: unknown) => value ?? null,
    normalizePrelaunchWaitlistReviewView: (value: unknown) => value ?? null,
    PrelaunchIntakeReviewPageContent: (props: {
      launchChecks?: unknown[]
      launchGates?: unknown[]
      launchSetupProfiles?: unknown[]
      surface: string
      basePath: string
    }) =>
      createElement(
        'main',
        null,
        `${props.surface} at ${props.basePath}`,
      ),
  }),
)

import SparkleSuiteControlCenterIntakePage from '@/app/control-center/intake/page'

describe('SparkleSuiteControlCenterIntakePage dev auth bypass', () => {
  const originalBypass = process.env.CONTROL_CENTER_DEV_AUTH_BYPASS
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    getAuthenticatedOperatorMock.mockReset()
    loadPrelaunchAgreementDocumentsByBuildIdsMock.mockReset()
    loadPrelaunchIntakeReviewSubmissionsMock.mockReset()
    loadPrelaunchLaunchChecksByBuildIdsMock.mockReset()
    loadPrelaunchLaunchBuildsMock.mockReset()
    loadPrelaunchLaunchGatesByBuildIdsMock.mockReset()
    loadPrelaunchLaunchSetupProfilesByBuildIdsMock.mockReset()
    loadPrelaunchWaitlistReviewLeadsMock.mockReset()
    loadOperatorPaymentLinksMock.mockReset()
    redirectMock.mockClear()
    loadOperatorPaymentLinksMock.mockResolvedValue({ ready: true, links: [] })
    loadPrelaunchIntakeReviewSubmissionsMock.mockResolvedValue([])
    loadPrelaunchAgreementDocumentsByBuildIdsMock.mockResolvedValue([])
    loadPrelaunchLaunchChecksByBuildIdsMock.mockResolvedValue([])
    loadPrelaunchLaunchGatesByBuildIdsMock.mockResolvedValue([])
    loadPrelaunchLaunchBuildsMock.mockResolvedValue([
      { id: 'build-1', leadName: 'Demo Lead' },
    ])
    loadPrelaunchLaunchSetupProfilesByBuildIdsMock.mockResolvedValue([])
    loadPrelaunchWaitlistReviewLeadsMock.mockResolvedValue([])
  })

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
    if (originalBypass === undefined) {
      delete process.env.CONTROL_CENTER_DEV_AUTH_BYPASS
    } else {
      process.env.CONTROL_CENTER_DEV_AUTH_BYPASS = originalBypass
    }
  })

  it('renders the Control Center intake page without auth when dev bypass is enabled', async () => {
    process.env.NODE_ENV = 'development'
    process.env.CONTROL_CENTER_DEV_AUTH_BYPASS = 'true'
    getAuthenticatedOperatorMock.mockRejectedValueOnce(
      new MockAuthError('missing session'),
    )

    const page = await SparkleSuiteControlCenterIntakePage({
      searchParams: Promise.resolve({
        waitlist: 'contact_batch',
      }),
    })
    const html = renderToStaticMarkup(page)

    expect(getAuthenticatedOperatorMock).not.toHaveBeenCalled()
    expect(redirectMock).not.toHaveBeenCalled()
    expect(html).toContain('control_center at /control-center/intake')
    expect(loadPrelaunchIntakeReviewSubmissionsMock).toHaveBeenCalledOnce()
    expect(loadPrelaunchLaunchBuildsMock).toHaveBeenCalledOnce()
    expect(loadPrelaunchLaunchChecksByBuildIdsMock).toHaveBeenCalledWith([
      'build-1',
    ])
    expect(loadPrelaunchLaunchGatesByBuildIdsMock).toHaveBeenCalledWith([
      'build-1',
    ])
    expect(loadPrelaunchAgreementDocumentsByBuildIdsMock).toHaveBeenCalledWith([
      'build-1',
    ])
    expect(
      loadPrelaunchLaunchSetupProfilesByBuildIdsMock,
    ).toHaveBeenCalledWith(['build-1'])
    expect(loadPrelaunchWaitlistReviewLeadsMock).toHaveBeenCalledOnce()
  })

  it('does not honor the Control Center intake dev bypass in production', async () => {
    process.env.NODE_ENV = 'production'
    process.env.CONTROL_CENTER_DEV_AUTH_BYPASS = 'true'
    getAuthenticatedOperatorMock.mockRejectedValueOnce(
      new MockAuthError('missing session'),
    )

    await expect(
      SparkleSuiteControlCenterIntakePage({
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow('redirect:/login')

    expect(getAuthenticatedOperatorMock).toHaveBeenCalledOnce()
    expect(loadPrelaunchIntakeReviewSubmissionsMock).not.toHaveBeenCalled()
  })

  it('still redirects unauthenticated requests when dev bypass is disabled', async () => {
    process.env.NODE_ENV = 'production'
    delete process.env.CONTROL_CENTER_DEV_AUTH_BYPASS
    getAuthenticatedOperatorMock.mockRejectedValueOnce(
      new MockAuthError('missing session'),
    )

    await expect(
      SparkleSuiteControlCenterIntakePage({
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow('redirect:/login')

    expect(getAuthenticatedOperatorMock).toHaveBeenCalledOnce()
    expect(loadPrelaunchIntakeReviewSubmissionsMock).not.toHaveBeenCalled()
    expect(loadPrelaunchAgreementDocumentsByBuildIdsMock).not.toHaveBeenCalled()
    expect(loadPrelaunchLaunchChecksByBuildIdsMock).not.toHaveBeenCalled()
    expect(loadPrelaunchLaunchBuildsMock).not.toHaveBeenCalled()
    expect(loadPrelaunchLaunchGatesByBuildIdsMock).not.toHaveBeenCalled()
    expect(
      loadPrelaunchLaunchSetupProfilesByBuildIdsMock,
    ).not.toHaveBeenCalled()
    expect(loadPrelaunchWaitlistReviewLeadsMock).not.toHaveBeenCalled()
  })
})
