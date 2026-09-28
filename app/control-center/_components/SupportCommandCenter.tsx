import { ChevronDown } from 'lucide-react'
import Link from 'next/link'

import { ControlCenterThemeToggle } from '@/app/internal/prelaunch/intake/_components/ControlCenterThemeToggle'
import { CustomerWaitlistPanel } from '@/app/control-center/_components/CustomerWaitlistPanel'
import { BugHuntPanel } from '@/app/control-center/_components/BugHuntPanel'
import { ControlCenterProductSwitcher } from '@/app/control-center/_components/ControlCenterProductSwitcher'
import { OperatorSupportAccessPanel } from '@/app/control-center/_components/OperatorSupportAccessPanel'
import { OperatorOnboardingChecklist } from '@/app/control-center/_components/OperatorOnboardingChecklist'
import type { BugHuntItem } from '@/lib/control-center/bug-hunt'
import {
  buildOperatorOnboardingChecklist,
  type OperatorOnboardingChecklistItem,
} from '@/lib/control-center/operator-onboarding-checklist'
import type { CustomerWaitlistLead } from '@/lib/prelaunch/customer-waitlist'
import type { AccountingMonthlySnapshot } from '@/lib/control-center/accounting'

export type SupportReportRecord = {
  id: string
  source?: string | null
  report_type?: string | null
  urgency?: string | null
  status?: string | null
  audit_status?: string | null
  page_or_workflow?: string | null
  title?: string | null
  details?: string | null
  expected_result?: string | null
  actual_result?: string | null
  client_snapshot?: Record<string, unknown> | null
  created_at?: string | null
  support_audits?: Array<Record<string, unknown>> | null
}

export type OperatorCustomerRecord = {
  repId: string
  accountClassification: 'customer' | 'demo'
  clientName: string
  showName: string
  primaryContactName: string | null
  email: string
  phone: string | null
  referral: {
    code: string | null
    usageCount: number
  }
  accountStatus: string | null
  subscriptionStatus: string | null
  supportTier: string | null
  publicSiteSlug: string | null
  customDomain: string | null
  shopLink: string | null
  streamingLinks: Record<string, unknown>
  socialHandles: Record<string, unknown>
  liveQueueSyncCode: string | null
  internalNotes: string | null
  setupStatus: string | null
  setupCurrentStep: string | null
  billing: {
    status: string | null
    planTier: string | null
    pricingTier: string | null
    monthlyAmount: number | null
    currentPeriodEnd: string | null
    stripeCustomerId: string | null
  }
  createdAt?: string | null
  updatedAt?: string | null
}

interface SupportCommandCenterProps {
  reports: SupportReportRecord[]
  customers: OperatorCustomerRecord[]
  waitlist: CustomerWaitlistLead[]
  bugHuntItems: BugHuntItem[]
  onboardingChecklists?: Record<string, OperatorOnboardingChecklistItem[]>
  suiteAccountingSnapshot?: AccountingMonthlySnapshot | null
}

function label(value: string | null | undefined) {
  return value
    ? value
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
    : 'Not provided'
}

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

function isCustomerDatabaseAccount(customer: OperatorCustomerRecord) {
  return customer.accountClassification === 'customer'
}

function objectEntries(value: Record<string, unknown> | null | undefined) {
  return Object.entries(value ?? {}).filter(([, entry]) => {
    if (typeof entry !== 'string') return false
    return entry.trim().length > 0
  }) as Array<[string, string]>
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not dated'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not dated'
  return date.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function formatMoney(value: number | null | undefined) {
  if (typeof value !== 'number') return 'Not provided'
  return new Intl.NumberFormat('en-US', {
    currency: 'USD',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value)
}

function formatCents(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('en-US', {
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    style: 'currency',
  }).format(value / 100)
}

function formatCount(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value)
    ? String(value)
    : '0'
}

function firstName(value: string | null | undefined) {
  return value?.trim().split(/\s+/)[0] ?? null
}

function statusClass(value: string | null | undefined) {
  if (value === 'showtime_urgent' || value === 'failed' || value === 'timed_out') {
    return 'border-rose-200 bg-rose-50 text-rose-700'
  }
  if (
    value === 'blocking' ||
    value === 'running' ||
    value === 'pending' ||
    value === 'past_due'
  ) {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }
  if (
    value === 'completed' ||
    value === 'resolved' ||
    value === 'active' ||
    value === 'dashboard_unlocked'
  ) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }
  if (value === 'demo_account') {
    return 'border-sky-200 bg-sky-50 text-sky-700'
  }
  return 'border-slate-200 bg-slate-100 text-slate-700'
}

function Pill({ value }: { value: string | null | undefined }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${statusClass(
        value,
      )}`}
    >
      {label(value)}
    </span>
  )
}

function InfoBlock({
  className = '',
  term,
  value,
}: {
  className?: string
  term: string
  value: string
}) {
  return (
    <div className={`rounded-md border border-slate-200 p-3 ${className}`}>
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {term}
      </dt>
      <dd className="mt-1 break-words text-sm font-semibold text-slate-800">
        {value}
      </dd>
    </div>
  )
}

function CustomerProfile({
  customer,
  onboardingChecklist,
  profileType = 'customer',
}: {
  customer: OperatorCustomerRecord
  onboardingChecklist?: OperatorOnboardingChecklistItem[]
  profileType?: 'customer' | 'demo'
}) {
  const socialLinks = objectEntries(customer.socialHandles)
  const streamingLinks = objectEntries(customer.streamingLinks)
  const checklist = onboardingChecklist ?? buildOperatorOnboardingChecklist()
  const hasIncompleteChecklist =
    profileType === 'customer' && checklist.some((item) => !item.entry.isCompleted)
  const repFirstName = firstName(customer.primaryContactName)

  return (
    <details
      className={`group border-t first:border-t-0 ${
        hasIncompleteChecklist ? 'border-amber-200 bg-amber-50/70' : 'border-slate-100'
      }`}
    >
      <summary
        aria-label={`Expand ${customer.clientName} profile`}
        className={`grid cursor-pointer list-none gap-3 px-4 py-4 marker:hidden md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.85fr)_auto] ${
          hasIncompleteChecklist ? 'hover:bg-amber-100/70' : ''
        }`}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-slate-950">
              {customer.showName}
              {repFirstName ? ` (${repFirstName})` : ''}
            </span>
            <ChevronDown
              aria-hidden="true"
              className="h-4 w-4 text-slate-400 transition group-open:rotate-180"
            />
          </div>
          {hasIncompleteChecklist ? (
            <p className="mt-1 text-sm font-medium text-amber-800">
              Onboarding checklist incomplete
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {profileType === 'demo' ? <Pill value="demo_account" /> : null}
          <Pill value={customer.accountStatus} />
          <Pill value={customer.subscriptionStatus} />
          <Pill value={customer.supportTier} />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 md:text-right">
          Updated {formatDate(customer.updatedAt)}
        </p>
      </summary>

      <div className="grid gap-4 border-t border-slate-100 bg-slate-50/70 p-4 lg:grid-cols-2">
        <OperatorSupportAccessPanel
          customDomain={customer.customDomain}
          publicSiteSlug={customer.publicSiteSlug}
          repDisplayName={customer.primaryContactName ?? customer.clientName}
          repEmail={customer.email}
          targetRepId={customer.repId}
        />

        {profileType === 'customer' ? (
          <OperatorOnboardingChecklist
            clientName={customer.clientName}
            initialItems={checklist}
            repId={customer.repId}
          />
        ) : null}

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold">Contact</h3>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <InfoBlock
              term="Rep"
              value={customer.primaryContactName ?? customer.clientName}
            />
            <InfoBlock
              term="Phone"
              value={customer.phone ?? 'Not provided'}
            />
            <InfoBlock term="Show title" value={customer.showName} />
            <InfoBlock
              term="Live Queue code"
              value={customer.liveQueueSyncCode ?? 'Not assigned'}
            />
            <InfoBlock
              term="Promo code"
              value={customer.referral.code ?? 'Not provided'}
            />
            <InfoBlock
              term="Promo uses"
              value={formatCount(customer.referral.usageCount)}
            />
            <InfoBlock
              className="sm:col-span-2"
              term="Email"
              value={customer.email}
            />
          </dl>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold">Billing</h3>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <InfoBlock term="Subscription" value={label(customer.billing.status)} />
            <InfoBlock term="Plan" value={label(customer.billing.planTier)} />
            <InfoBlock term="Pricing" value={label(customer.billing.pricingTier)} />
            <InfoBlock
              term="Monthly"
              value={formatMoney(customer.billing.monthlyAmount)}
            />
            <InfoBlock
              term="Period end"
              value={formatDate(customer.billing.currentPeriodEnd)}
            />
            <InfoBlock
              term="Stripe customer"
              value={customer.billing.stripeCustomerId ?? 'Not provided'}
            />
          </dl>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold">Website and Social</h3>
          <dl className="mt-3 grid gap-3">
            <InfoBlock
              term="Public site"
              value={
                customer.publicSiteSlug
                  ? `/${customer.publicSiteSlug}`
                  : 'Not provided'
              }
            />
            <InfoBlock
              term="Custom domain"
              value={customer.customDomain ?? 'Not provided'}
            />
            <InfoBlock
              term="Shop link"
              value={customer.shopLink ?? 'Not provided'}
            />
          </dl>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-slate-200 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Social
              </p>
              {socialLinks.length > 0 ? (
                <ul className="mt-2 space-y-1 text-sm font-semibold text-slate-800">
                  {socialLinks.map(([key, value]) => (
                    <li className="break-words" key={`${customer.repId}-${key}`}>
                      {label(key)}: {value}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-slate-500">Not provided</p>
              )}
            </div>
            <div className="rounded-md border border-slate-200 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Streaming
              </p>
              {streamingLinks.length > 0 ? (
                <ul className="mt-2 space-y-1 text-sm font-semibold text-slate-800">
                  {streamingLinks.map(([key, value]) => (
                    <li className="break-words" key={`${customer.repId}-${key}`}>
                      {label(key)}: {value}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-slate-500">Not provided</p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold">Status and Notes</h3>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <InfoBlock term="Setup" value={label(customer.setupStatus)} />
            <InfoBlock
              term="Current step"
              value={label(customer.setupCurrentStep)}
            />
          </dl>
          <div className="mt-3 rounded-md border border-slate-200 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Internal notes
            </p>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-700">
              {customer.internalNotes ?? 'No internal notes yet.'}
            </p>
          </div>
        </section>
      </div>
    </details>
  )
}

export function SupportCommandCenter({
  customers,
  reports,
  waitlist,
  bugHuntItems,
  onboardingChecklists = {},
  suiteAccountingSnapshot = null,
}: SupportCommandCenterProps) {
  const openReports = reports.filter((report) => report.status !== 'closed')
  const customerAccounts = customers.filter(isCustomerDatabaseAccount)
  const demoAccounts = customers.filter(
    (customer) => !isCustomerDatabaseAccount(customer),
  )
  const projectedMonthlyRevenueCents = suiteAccountingSnapshot?.projectedRecurringCents
  const actualRevenueCollectedCents = suiteAccountingSnapshot?.actualCollectedCents
  const actualExpensesPaidCents = suiteAccountingSnapshot?.expensesCents
  const accountingCards = [
    {
      title: 'Actual revenue collected',
      valueCents: actualRevenueCollectedCents,
    },
    {
      title: 'Actual expenses paid',
      valueCents: actualExpensesPaidCents,
    },
  ]

  return (
    <main className="control-center-surface min-h-screen bg-slate-50 px-5 py-8 text-slate-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Sparkle Suite
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal">
              Sparkle Suite Control Center
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Review support tickets, customer status, billing signals, public
              site details, and operator notes from one internal workspace.
            </p>
          </div>
          <ControlCenterThemeToggle />
        </header>

        <ControlCenterProductSwitcher active="suite" />

        <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <nav className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <p className="px-2 pb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                Control Center Options
              </p>
              <Link
                className="flex items-center justify-between rounded-md px-3 py-2 text-sm font-semibold text-violet-800 hover:bg-violet-50"
                href="/control-center/messages"
              >
                Messages
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700">
                  New
                </span>
              </Link>
              <Link
                className="mt-1 flex items-center justify-between rounded-md px-3 py-2 text-sm font-semibold text-violet-800 hover:bg-violet-50"
                href="/control-center/resources"
              >
                Resources
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700">
                  Publisher
                </span>
              </Link>
              <Link
                className="mt-1 flex items-center justify-between rounded-md px-3 py-2 text-sm font-semibold text-violet-800 hover:bg-violet-50"
                href="/control-center/accounting"
              >
                Accounting
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Setup</span>
              </Link>
              <a
                className="mt-1 flex items-center justify-between rounded-md px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
                href="#support-tickets"
              >
                Trouble Tickets
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {openReports.length}
                </span>
              </a>
              <a
                className="mt-1 flex items-center justify-between rounded-md px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
                href="#bug-hunt-updates"
              >
                Task List
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {bugHuntItems.filter((item) => item.status !== 'complete').length}
                </span>
              </a>
              <a
                className="mt-1 flex items-center justify-between rounded-md px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
                href="#customer-waitlist"
              >
                Customer Waitlist
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {waitlist.filter((lead) => !lead.accountActivatedAt).length}
                </span>
              </a>
              <a
                className="mt-1 flex items-center justify-between rounded-md px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
                href="#customer-database"
              >
                Customer Database
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {customerAccounts.length}
                </span>
              </a>
              <a
                className="mt-1 flex items-center justify-between rounded-md px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
                href="#demo-database"
              >
                Demo Database
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {demoAccounts.length}
                </span>
              </a>
              <Link
                className="mt-1 flex items-center justify-between rounded-md px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
                href="/control-center/guardian"
              >
                Guardian
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  Watch
                </span>
              </Link>
              <Link
                className="mt-1 flex items-center justify-between rounded-md px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
                href="/control-center/nic-nac-usage"
              >
                AI Cost &amp; Capacity
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700">
                  New
                </span>
              </Link>
              <Link
                className="mt-1 flex items-center justify-between rounded-md px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
                href="/control-center/lab"
              >
                Sparkle Lab
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  New
                </span>
              </Link>
            </nav>
          </aside>

          <div className="flex min-w-0 flex-col gap-6">
        <section className="grid gap-4 md:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Open reports
                </p>
                <p className="mt-2 text-3xl font-semibold">
                  {openReports.length}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Audit pending
                </p>
                <p className="mt-2 text-3xl font-semibold">
                  {
                    reports.filter((report) =>
                      ['pending', 'running'].includes(report.audit_status ?? ''),
                    ).length
                  }
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Active accounts
                </p>
                <p className="mt-2 text-3xl font-semibold">
                  {customerAccounts.length}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Demo accounts
                </p>
                <p className="mt-2 text-3xl font-semibold">
                  {demoAccounts.length}
                </p>
              </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3" aria-label="Accounting overview">
          <Link className={`rounded-lg border p-4 shadow-sm ${projectedMonthlyRevenueCents == null ? 'border-amber-200 bg-amber-50 hover:bg-amber-100' : 'border-emerald-200 bg-white hover:bg-emerald-50'}`} href="/control-center/accounting">
            <p className={`text-xs font-bold uppercase tracking-wide ${projectedMonthlyRevenueCents == null ? 'text-amber-900' : 'text-slate-700'}`}>Projected monthly revenue</p>
            <p className={`mt-2 text-3xl font-semibold ${projectedMonthlyRevenueCents == null ? 'text-amber-950' : 'text-slate-950'}`}>{formatCents(projectedMonthlyRevenueCents)}</p>
            <p className={`mt-2 text-sm font-medium ${projectedMonthlyRevenueCents == null ? 'text-amber-900' : 'text-slate-600'}`}>{projectedMonthlyRevenueCents == null ? 'Not connected yet' : 'Cheese’s latest reconciled expected recurring revenue'}</p>
          </Link>
          {accountingCards.map(({ title, valueCents }) => (
            <Link className={`rounded-lg border p-4 shadow-sm ${valueCents == null ? 'border-amber-200 bg-amber-50 hover:bg-amber-100' : 'border-emerald-200 bg-white hover:bg-emerald-50'}`} href="/control-center/accounting" key={title}>
              <p className={`text-xs font-bold uppercase tracking-wide ${valueCents == null ? 'text-amber-900' : 'text-slate-700'}`}>{title}</p>
              <p className={`mt-2 text-3xl font-semibold ${valueCents == null ? 'text-amber-950' : 'text-slate-950'}`}>{formatCents(valueCents)}</p>
              <p className={`mt-2 text-sm font-medium ${valueCents == null ? 'text-amber-900' : 'text-slate-600'}`}>{valueCents == null ? 'Not connected yet' : 'Cheese’s latest reconciled monthly total'}</p>
            </Link>
          ))}
        </section>

            <section
              className="control-center-panel scroll-mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
              id="support-tickets"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Support conversations</h2>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                    Rep questions, problems, ideas, replies, Support Auditor
                    context, and Task List promotion now live together in the
                    Communications area.
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">
                    {countLabel(openReports.length, 'active conversation')}
                  </p>
                </div>
                <Link
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-violet-700 px-4 text-sm font-semibold text-white"
                  href="/control-center/messages?view=support"
                >
                  Open Support Inbox
                </Link>
              </div>
            </section>

            <CustomerWaitlistPanel initialLeads={waitlist} />

            <BugHuntPanel initialItems={bugHuntItems} />

            <details
              className="group/database control-center-panel scroll-mt-6 rounded-lg border border-slate-200 bg-white shadow-sm"
              id="customer-database"
            >
              <summary
                aria-label="Expand Customer Database"
                className="control-center-summary flex cursor-pointer list-none flex-col gap-2 px-4 py-4 marker:hidden md:flex-row md:items-end md:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">Customer Database</h2>
                    <ChevronDown
                      aria-hidden="true"
                      className="h-4 w-4 text-slate-400 transition group-open/database:rotate-180"
                    />
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    Every real onboarding account is classified here explicitly.
                  </p>
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {countLabel(customerAccounts.length, 'customer account')}
                </p>
              </summary>

              {customerAccounts.length === 0 ? (
                <p className="border-t border-slate-200 px-4 py-8 text-sm text-slate-500">
                  No customer profiles are available yet.
                </p>
              ) : (
                <div className="border-t border-slate-200">
                  {customerAccounts.map((customer) => (
                    <CustomerProfile
                      customer={customer}
                      key={customer.repId}
                      onboardingChecklist={onboardingChecklists[customer.repId]}
                    />
                  ))}
                </div>
              )}
            </details>

            <details
              className="group/database control-center-panel scroll-mt-6 rounded-lg border border-slate-200 bg-white shadow-sm"
              id="demo-database"
            >
              <summary
                aria-label="Expand Demo Database"
                className="control-center-summary flex cursor-pointer list-none flex-col gap-2 px-4 py-4 marker:hidden md:flex-row md:items-end md:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">Demo Database</h2>
                    <ChevronDown
                      aria-hidden="true"
                      className="h-4 w-4 text-slate-400 transition group-open/database:rotate-180"
                    />
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    Demo, reviewer, smoke, and sample accounts are explicitly
                    kept separate from active customers.
                  </p>
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {countLabel(demoAccounts.length, 'demo account')}
                </p>
              </summary>

              {demoAccounts.length === 0 ? (
                <p className="border-t border-slate-200 px-4 py-8 text-sm text-slate-500">
                  No demo profiles are available yet.
                </p>
              ) : (
                <div className="border-t border-slate-200">
                  {demoAccounts.map((customer) => (
                    <CustomerProfile
                      customer={customer}
                      key={customer.repId}
                      profileType="demo"
                    />
                  ))}
                </div>
              )}
            </details>
          </div>
        </div>
      </div>
    </main>
  )
}
