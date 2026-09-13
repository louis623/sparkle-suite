import type { RequiredSetupStatus } from '@/lib/self-serve/required-setup-contract'

export type NicNacWorkspaceMode =
  | 'checkout_required'
  | 'required_setup'
  | 'dashboard_unlocked'
  | 'workspace'

export function resolveNicNacWorkspaceMode({
  setupStatus,
  isCheckoutSuccessReturn = false,
  wantsCheckout,
  wantsRequiredSetup,
}: {
  setupStatus: RequiredSetupStatus | null | undefined
  isCheckoutSuccessReturn?: boolean
  wantsCheckout: boolean
  wantsRequiredSetup: boolean
}): NicNacWorkspaceMode {
  if (setupStatus === 'dashboard_unlocked') return 'dashboard_unlocked'
  if (setupStatus === 'required_setup' || setupStatus === 'setup_blocked') {
    return 'required_setup'
  }
  if (setupStatus === 'checkout_required' || setupStatus === 'payment_pending') {
    return 'checkout_required'
  }
  if (isCheckoutSuccessReturn && wantsRequiredSetup) return 'required_setup'
  if (wantsRequiredSetup) return 'required_setup'
  if (wantsCheckout) return 'checkout_required'
  return 'workspace'
}
