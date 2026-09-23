import { redirect } from 'next/navigation'

import { AccountingDashboard } from '@/app/control-center/_components/AccountingDashboard'
import {
  loadCurrentAccountingSnapshot,
  loadSparkleSuiteAccountingProjection,
} from '@/lib/control-center/accounting'
import { createAdminClient } from '@/lib/supabase/admin'
import { AuthError, getControlCenterAccess, OperatorAuthError } from '@/lib/supabase/operator-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function ControlCenterAccountingPage({ searchParams }: { searchParams?: Promise<{ product?: string | string[] }> }) {
  const product = (await searchParams)?.product === 'finder' ? 'finder' : 'suite'
  try {
    await getControlCenterAccess({ allowAccountingViewer: true })
  } catch (error) {
    if (error instanceof AuthError) redirect(`/control-center/login?redirect=${encodeURIComponent(`/control-center/accounting${product === 'finder' ? '?product=finder' : ''}`)}`)
    if (error instanceof OperatorAuthError) return <main className="min-h-screen bg-slate-50 px-5 py-12 text-slate-950"><section className="mx-auto max-w-xl rounded-lg border border-slate-200 bg-white p-8 shadow-sm"><h1 className="text-2xl font-semibold">Operator access required</h1><p className="mt-3 text-sm leading-6 text-slate-600">Accounting is limited to authorized internal viewers.</p></section></main>
    throw error
  }
  const suiteProjection =
    product === 'suite'
      ? await loadSparkleSuiteAccountingProjection(createAdminClient())
      : null
  const snapshot = await loadCurrentAccountingSnapshot(createAdminClient(), product)
  return <AccountingDashboard product={product} suiteProjection={suiteProjection} snapshot={snapshot} />
}
