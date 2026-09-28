import Link from 'next/link'

import type {
  AccountingMonthlySnapshot,
  SparkleSuiteAccountingProjection,
} from '@/lib/control-center/accounting'

import { ControlCenterProductSwitcher } from './ControlCenterProductSwitcher'

type AccountingProduct = 'suite' | 'finder'

type Metric = {
  title: string
  description: string
  value: string
  status: string
  connected: boolean
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatCents(value: number | null | undefined) {
  return value == null ? '—' : formatMoney(value / 100)
}

function Status({ children, connected }: { children: React.ReactNode; connected: boolean }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${connected ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
      {children}
    </span>
  )
}

function MetricCard({ metric }: { metric: Metric }) {
  return (
    <article className={`rounded-lg border p-4 shadow-sm ${metric.connected ? 'border-emerald-200 bg-white' : 'border-amber-200 bg-amber-50'}`}>
      <div className="flex items-start justify-between gap-3">
        <p className={`text-xs font-bold uppercase tracking-wide ${metric.connected ? 'text-slate-700' : 'text-amber-900'}`}>{metric.title}</p>
        <Status connected={metric.connected}>{metric.status}</Status>
      </div>
      <p className={`mt-3 text-3xl font-semibold ${metric.connected ? 'text-slate-950' : 'text-amber-950'}`}>{metric.value}</p>
      <p className={`mt-2 text-sm leading-5 ${metric.connected ? 'text-slate-600' : 'text-amber-900'}`}>{metric.description}</p>
    </article>
  )
}

export function AccountingDashboard({
  product,
  suiteProjection,
  snapshot,
}: {
  product: AccountingProduct
  suiteProjection?: SparkleSuiteAccountingProjection | null
  snapshot?: AccountingMonthlySnapshot | null
}) {
  const productName = product === 'suite' ? 'Sparkle Suite' : 'Sparkle Finder'
  const productQuery = product === 'finder' ? '?product=finder' : ''
  const projectedRevenue =
    snapshot?.projectedRecurringCents != null
      ? {
          title: 'Projected monthly revenue',
          description: 'Cheese’s latest reconciled expected recurring revenue for this product and month.',
          value: formatCents(snapshot.projectedRecurringCents),
          status: 'Cheese verified',
          connected: true,
        }
      : {
          title: 'Projected monthly revenue',
          description: snapshot
            ? 'Cheese’s latest monthly snapshot does not include a projected recurring total. Stored client-list prices are not used as that total.'
            : 'No verified monthly snapshot is stored for this Eastern calendar month. Stored client-list prices are not used, because they are incomplete.',
          value: '—',
          status: snapshot ? 'Not in snapshot' : 'Missing snapshot',
          connected: false,
        }
  const metrics: Metric[] = [
    projectedRevenue,
    {
      title: 'Actual revenue collected',
      description: 'Confirmed payments received this month, including late payments when they clear.',
      value: formatCents(snapshot?.actualCollectedCents),
      status: snapshot?.actualCollectedCents == null ? 'Not connected' : 'Cheese verified',
      connected: snapshot?.actualCollectedCents != null,
    },
    {
      title: 'Projected monthly expenses',
      description: 'Expected recurring business costs for the month.',
      value: formatCents(snapshot?.projectedExpensesCents),
      status: snapshot?.projectedExpensesCents == null ? 'Not connected' : 'Cheese verified',
      connected: snapshot?.projectedExpensesCents != null,
    },
    {
      title: 'Actual expenses paid',
      description: 'Business costs actually paid this month.',
      value: formatCents(snapshot?.expensesCents),
      status: snapshot?.expensesCents == null ? 'Not connected' : 'Cheese verified',
      connected: snapshot?.expensesCents != null,
    },
    {
      title: 'Actual net for the month',
      description: 'Actual revenue collected minus actual expenses paid.',
      value: formatCents(snapshot?.netCents),
      status: snapshot?.netCents == null ? 'Not connected' : 'Cheese verified',
      connected: snapshot?.netCents != null,
    },
    {
      title: 'Past-due balance',
      description: 'Invoices still unpaid after their due date.',
      value: formatCents(snapshot?.pastDueBalanceCents),
      status: snapshot?.pastDueBalanceCents == null ? 'Not connected' : 'Cheese verified',
      connected: snapshot?.pastDueBalanceCents != null,
    },
  ]

  return (
    <main className="control-center-surface min-h-screen bg-slate-50 px-5 py-8 text-slate-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{productName}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal">Accounting</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Projected and actual totals come from Cheese’s latest monthly snapshot. Stored client-list prices are a profile check only and are not the books. A subscription price is not cash already collected.
            </p>
          </div>
          <ControlCenterProductSwitcher active={product} />
        </header>

        <div className="flex flex-wrap gap-3">
          <Link className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" href={`/control-center${productQuery}`}>
            Back to {productName} Control Center
          </Link>
          <Link className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" href={`/control-center/accounting${product === 'finder' ? '' : '?product=finder'}`}>
            View Sparkle {product === 'suite' ? 'Finder' : 'Suite'} accounting
          </Link>
        </div>

        <section aria-label={`${productName} monthly accounting overview`} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {metrics.map((metric) => <MetricCard key={metric.title} metric={metric} />)}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div><h2 className="text-lg font-semibold text-slate-950">Customer billing and payment history</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-700">This table is a client-list profile check. Stored monthly amounts here are not the monthly books and are not cash collected. Cheese’s snapshot above is the total to use.</p></div>
            <Status connected={false}>{product === 'suite' && suiteProjection ? 'Profile check only' : 'Billing source needed'}</Status>
          </div>
          <div className="mt-4 overflow-x-auto rounded-md border border-slate-200 bg-white"><table className="min-w-[760px] w-full text-left text-sm"><thead className="bg-slate-100 text-xs font-bold uppercase tracking-wide text-slate-700"><tr><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Plan</th><th className="px-4 py-3">Stored profile amount</th><th className="px-4 py-3">Latest actual payment</th><th className="px-4 py-3">Actual balance</th><th className="px-4 py-3">History</th></tr></thead><tbody>{product === 'suite' && suiteProjection?.clientBilling.length ? suiteProjection.clientBilling.map((client) => <tr className="border-t border-slate-100" key={client.clientName}><td className="px-4 py-3 font-medium text-slate-900">{client.clientName}</td><td className="px-4 py-3 text-slate-700">{client.plan ?? 'Not set'}</td><td className="px-4 py-3 text-slate-700">{formatMoney(client.monthlyAmount)}</td><td className="px-4 py-3 text-amber-800">Not connected</td><td className="px-4 py-3 text-amber-800">Not connected</td><td className="px-4 py-3 text-amber-800">Not connected</td></tr>) : <tr><td className="px-4 py-5 text-slate-600" colSpan={6}>No stored client-list amounts are available for this product. That does not change the verified snapshot totals above.</td></tr>}</tbody></table></div>
          {product === 'suite' && suiteProjection && suiteProjection.clientsMissingMonthlyAmount > 0 ? <p className="mt-3 text-sm text-amber-800">{suiteProjection.clientsMissingMonthlyAmount} active client{suiteProjection.clientsMissingMonthlyAmount === 1 ? '' : 's'} have no stored monthly amount on the client list. That list is not the monthly books.</p> : null}
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <article className={`rounded-lg border p-5 shadow-sm ${snapshot?.projectedExpensesCents != null || snapshot?.expensesCents != null ? 'border-emerald-200 bg-white' : 'border-amber-200 bg-amber-50'}`}><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-950">Expense ledger</h2><p className="mt-1 text-sm leading-6 text-slate-700">Cheese can supply expected and paid operating-cost totals through the accounting MCP. Individual vendor, receipt, and banking details stay in the source system.</p></div><Status connected={snapshot?.projectedExpensesCents != null || snapshot?.expensesCents != null}>{snapshot?.projectedExpensesCents != null || snapshot?.expensesCents != null ? 'Cheese verified' : 'Expense source needed'}</Status></div><dl className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-md border border-slate-200 bg-white p-3"><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Expected this month</dt><dd className="mt-1 text-lg font-semibold">{formatCents(snapshot?.projectedExpensesCents)}</dd></div><div className="rounded-md border border-slate-200 bg-white p-3"><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Paid this month</dt><dd className="mt-1 text-lg font-semibold">{formatCents(snapshot?.expensesCents)}</dd></div></dl></article>
          <article className={`rounded-lg border p-5 shadow-sm ${snapshot ? 'border-emerald-200 bg-white' : 'border-amber-200 bg-amber-50'}`}><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-950">Month-end checks</h2><p className="mt-1 text-sm leading-6 text-slate-700">Reconciliation totals from Cheese’s latest aggregate snapshot. They give a clear review point without exposing bank or customer-level details here.</p></div><Status connected={Boolean(snapshot)}>{snapshot ? 'Verified snapshot' : 'Reconciliation source needed'}</Status></div><dl className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-md border border-slate-200 bg-white p-3"><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Refunds</dt><dd className="mt-1 text-lg font-semibold">{formatCents(snapshot?.refundsCents)}</dd></div><div className="rounded-md border border-slate-200 bg-white p-3"><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Credits</dt><dd className="mt-1 text-lg font-semibold">{formatCents(snapshot?.creditsCents)}</dd></div><div className="rounded-md border border-slate-200 bg-white p-3"><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Disputes</dt><dd className="mt-1 text-lg font-semibold">{formatCents(snapshot?.disputesCents)}</dd></div><div className="rounded-md border border-slate-200 bg-white p-3"><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Processor available</dt><dd className="mt-1 text-lg font-semibold">{formatCents(snapshot?.processorAvailableCents)}</dd></div><div className="rounded-md border border-slate-200 bg-white p-3"><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Payouts in transit</dt><dd className="mt-1 text-lg font-semibold">{formatCents(snapshot?.payoutsInTransitCents)}</dd></div></dl></article>
        </section>
      </div>
    </main>
  )
}
