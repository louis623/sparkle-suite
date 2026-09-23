import { redirect } from 'next/navigation'

import {
  SupportCommandCenter,
  type OperatorCustomerRecord,
  type SupportReportRecord,
} from '@/app/control-center/_components/SupportCommandCenter'
import { listOperatorCustomerProfiles } from '@/lib/services/client-account-profiles'
import { listOperatorOnboardingChecklists } from '@/lib/services/operator-onboarding-checklists'
import { listOperatorSupportReports } from '@/lib/services/support-reports'
import { loadCustomerWaitlist } from '@/lib/prelaunch/customer-waitlist'
import { loadBugHuntItems } from '@/lib/control-center/bug-hunt'
import { loadCurrentAccountingSnapshot } from '@/lib/control-center/accounting'
import { FinderAppearanceControlCenter } from '@/app/control-center/_components/FinderAppearanceControlCenter'
import { SiteSupportConsole } from '@/app/control-center/_components/SiteSupportConsole'
import { loadSparkleFinderAppearanceSetting } from '@/lib/sparkle-finder/appearance'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  AuthError,
  getControlCenterAccess,
  OperatorAuthError,
} from '@/lib/supabase/operator-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function SparkleSuiteControlCenterPage({
  searchParams,
}: {
  searchParams?: Promise<{ product?: string | string[] }>
}) {
  let access
  try {
    access = await getControlCenterAccess({ allowSiteSupport: true })
  } catch (error) {
    if (error instanceof AuthError) {
      redirect('/control-center/login')
    }

    if (error instanceof OperatorAuthError) {
      return (
        <main className="min-h-screen bg-slate-50 px-5 py-12 text-slate-950">
          <section className="mx-auto max-w-xl rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-semibold">Operator access required</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              The Sparkle Suite Control Center is limited to internal operators.
            </p>
          </section>
        </main>
      )
    }

    throw error
  }

  const admin = createAdminClient()
  if (access.scope === 'site_support') {
    const { data: customers, error } = await admin
      .from('reps')
      .select('id, display_name, business_name, email, public_site_slug, custom_domain')
      .eq('account_classification', 'customer')
      .eq('status', 'active')
      .order('display_name', { ascending: true })
    if (error) throw error
    return (
      <SiteSupportConsole
        customers={(customers ?? []).map((customer) => ({
          id: customer.id as string,
          displayName: (customer.display_name as string | null)?.trim() || 'Sparkle Suite customer',
          businessName: (customer.business_name as string | null)?.trim() || 'Sparkle Suite customer',
          email: customer.email as string,
          publicSiteSlug: customer.public_site_slug as string | null,
          customDomain: customer.custom_domain as string | null,
        }))}
      />
    )
  }
  const requestedProduct = (await searchParams)?.product
  if (requestedProduct === 'finder') {
    const appearance = await loadSparkleFinderAppearanceSetting(admin)
    return <FinderAppearanceControlCenter initialAppearance={appearance} />
  }

  const [reports, customers, waitlist, bugHuntItems, suiteAccountingSnapshot] = await Promise.all([
    listOperatorSupportReports(admin, {
      limit: 50,
    }),
    listOperatorCustomerProfiles(admin, {
      limit: 200,
    }),
    loadCustomerWaitlist(admin),
    loadBugHuntItems(admin),
    loadCurrentAccountingSnapshot(admin, 'suite'),
  ])
  const onboardingChecklists = await listOperatorOnboardingChecklists(
    admin,
    customers.map((customer) => customer.repId),
  )

  return (
    <SupportCommandCenter
      customers={customers as unknown as OperatorCustomerRecord[]}
      reports={reports as unknown as SupportReportRecord[]}
      waitlist={waitlist}
      bugHuntItems={bugHuntItems}
      onboardingChecklists={onboardingChecklists}
      suiteAccountingSnapshot={suiteAccountingSnapshot}
    />
  )
}
