import { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

interface PreparePrelaunchClientAccountInput {
  launchBuildId: string
  temporaryPassword: string
  temporaryPasswordConfirm: string
  notes?: string
  operatorRepId?: string | null
}

/**
 * Early account creation is closed. Intake creates a payment link, and the
 * Stripe webhook creates the account after a verified paid subscription.
 */
export async function preparePrelaunchClientAccountForLaunchBuild(
  _input: PreparePrelaunchClientAccountInput,
  _admin: AdminClient = createAdminClient(),
): Promise<never> {
  throw new Error(
    'Accounts are created after a payment link is paid. Create a payment link instead.',
  )
}
