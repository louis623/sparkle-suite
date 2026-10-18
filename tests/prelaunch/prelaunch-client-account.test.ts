import { describe, expect, it, vi } from 'vitest'

import { preparePrelaunchClientAccountForLaunchBuild } from '@/lib/prelaunch/client-account'

describe('prelaunch client account provisioning', () => {
  it('does not create an account before payment', async () => {
    const fromMock = vi.fn()

    await expect(
      preparePrelaunchClientAccountForLaunchBuild(
        {
          launchBuildId: 'build-1',
          temporaryPassword: 'RealCustomerTemp2026!',
          temporaryPasswordConfirm: 'RealCustomerTemp2026!',
          operatorRepId: 'operator-1',
        },
        { from: fromMock } as never,
      ),
    ).rejects.toThrow(
      'Accounts are created after a payment link is paid. Create a payment link instead.',
    )
    expect(fromMock).not.toHaveBeenCalled()
  })
})
