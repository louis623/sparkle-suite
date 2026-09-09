import type { SupabaseClient } from '@supabase/supabase-js'

import {
  listOperatorCustomerProfiles,
  type OperatorCustomerProfile,
} from '@/lib/services/client-account-profiles'

export type ProjectedClientBilling = {
  clientName: string
  plan: string | null
  monthlyAmount: number
}

export type SparkleSuiteAccountingProjection = {
  monthlyRevenue: number
  pricedActiveClientCount: number
  activeClientCount: number
  pastDueClientCount: number
  cancelledClientCount: number
  clientsMissingMonthlyAmount: number
  clientBilling: ProjectedClientBilling[]
}

export type AccountingMonthlySnapshot = {
  product: 'suite' | 'finder'
  periodStart: string
  periodEndExclusive: string
  asOf: string
  recordedAt: string
  reason: 'initial' | 'correction' | 'restatement'
  sourceStatus: {
    stripe: 'connected' | 'not_connected' | 'stale' | 'error'
    bluevine: 'connected' | 'not_connected' | 'stale' | 'error'
    productDb: 'connected' | 'not_connected' | 'stale' | 'error'
  }
  activeClientCount: number | null
  pastDueClientCount: number | null
  cancelledClientCount: number | null
  projectedRecurringCents: number | null
  projectedExpensesCents: number | null
  actualCollectedCents: number | null
  refundsCents: number | null
  creditsCents: number | null
  disputesCents: number | null
  pastDueBalanceCents: number | null
  processorAvailableCents: number | null
  payoutsInTransitCents: number | null
  expensesCents: number | null
  netCents: number | null
}

function isActiveProjectedClient(customer: OperatorCustomerProfile) {
  return (
    customer.accountClassification === 'customer' &&
    customer.accountStatus === 'active' &&
    customer.billing.status === 'active'
  )
}

function monthlyAmount(customer: OperatorCustomerProfile) {
  const value = customer.billing.monthlyAmount
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : null
}

export function summarizeSparkleSuiteProjectedRevenue(
  customers: OperatorCustomerProfile[],
): SparkleSuiteAccountingProjection {
  const activeClients = customers.filter(isActiveProjectedClient)
  const customerSubscriptions = customers.filter(
    (customer) => customer.accountClassification === 'customer',
  )
  const pricedClients = activeClients.flatMap((customer) => {
    const amount = monthlyAmount(customer)
    return amount === null
      ? []
      : [{
          clientName: customer.clientName,
          plan: customer.billing.pricingTier ?? customer.billing.planTier,
          monthlyAmount: amount,
        }]
  })

  return {
    monthlyRevenue: pricedClients.reduce(
      (total, client) => total + client.monthlyAmount,
      0,
    ),
    activeClientCount: activeClients.length,
    pastDueClientCount: customerSubscriptions.filter(
      (customer) => customer.billing.status === 'past_due',
    ).length,
    cancelledClientCount: customerSubscriptions.filter(
      (customer) => customer.billing.status === 'cancelled',
    ).length,
    pricedActiveClientCount: pricedClients.length,
    clientsMissingMonthlyAmount: activeClients.length - pricedClients.length,
    clientBilling: pricedClients.sort((left, right) =>
      left.clientName.localeCompare(right.clientName),
    ),
  }
}

export async function loadSparkleSuiteAccountingProjection(
  supabase: SupabaseClient,
): Promise<SparkleSuiteAccountingProjection> {
  const customers: Awaited<ReturnType<typeof listOperatorCustomerProfiles>> = []
  for(let offset=0;offset<50000;offset+=500) {
    const page=await listOperatorCustomerProfiles(supabase,{limit:500,offset,classification:'customer'})
    customers.push(...page)
    if(page.length<500)return summarizeSparkleSuiteProjectedRevenue(customers)
  }
  throw new Error('Accounting projection exceeded its bounded source read. It cannot be shown as a complete total.')
}

function easternMonthStart(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''
  return value('year') + '-' + value('month') + '-01'
}

export async function loadCurrentAccountingSnapshot(
  supabase: SupabaseClient,
  product: 'suite' | 'finder',
): Promise<AccountingMonthlySnapshot | null> {
  const { data, error } = await supabase
    .from('accounting_monthly_snapshots')
    .select('*')
    .eq('product', product)
    .eq('period_start', easternMonthStart())
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    product: data.product,
    periodStart: data.period_start,
    periodEndExclusive: data.period_end_exclusive,
    asOf: data.as_of,
    recordedAt: data.recorded_at,
    reason: data.reason,
    sourceStatus: data.source_status,
    activeClientCount: data.active_client_count,
    pastDueClientCount: data.past_due_client_count,
    cancelledClientCount: data.cancelled_client_count,
    projectedRecurringCents: data.projected_recurring_cents,
    projectedExpensesCents: data.projected_expenses_cents,
    actualCollectedCents: data.actual_collected_cents,
    refundsCents: data.refunds_cents,
    creditsCents: data.credits_cents,
    disputesCents: data.disputes_cents,
    pastDueBalanceCents: data.past_due_balance_cents,
    processorAvailableCents: data.processor_available_cents,
    payoutsInTransitCents: data.payouts_in_transit_cents,
    expensesCents: data.expenses_cents,
    netCents: data.net_cents,
  }
}
