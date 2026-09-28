import 'server-only'

import { createMcpHandler, McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/admin'
import { loadCurrentAccountingSnapshot } from '@/lib/control-center/accounting'

const basis = z.enum(['actual', 'projected', 'estimated'])
const source = z.enum(['connected', 'not_connected', 'stale', 'error'])
const cents = z.number().int().safe().nullable().optional()
const money = z.object({ cents, basis })

const snapshotInput = z.object({
  product: z.enum(['suite', 'finder']),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEndExclusive: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  asOf: z.string().datetime(),
  reason: z.enum(['initial', 'correction', 'restatement']),
  sourceStatus: z.object({ stripe: source, bluevine: source, productDb: source }),
  counts: z.object({
    active: z.number().int().nonnegative().nullable().optional(),
    pastDue: z.number().int().nonnegative().nullable().optional(),
    cancelled: z.number().int().nonnegative().nullable().optional(),
  }),
  money: z.object({
    projectedRecurring: money.optional(),
    projectedExpenses: money.optional(),
    actualCollected: money.optional(),
    refunds: money.optional(),
    credits: money.optional(),
    disputes: money.optional(),
    pastDueBalance: money.optional(),
    processorAvailable: money.optional(),
    payoutsInTransit: money.optional(),
    expenses: money.optional(),
    net: money.optional(),
  }),
})

type SnapshotInput = z.infer<typeof snapshotInput>

function value(input: { cents?: number | null } | undefined) {
  return input?.cents ?? null
}

function validate(input: SnapshotInput) {
  if (input.periodEndExclusive <= input.periodStart) {
    throw new Error('periodEndExclusive must be after periodStart.')
  }
  const amounts = input.money
  if (amounts.projectedRecurring?.cents != null && !['projected', 'estimated'].includes(amounts.projectedRecurring.basis)) {
    throw new Error('projectedRecurring must use projected or estimated basis.')
  }
  if (amounts.projectedExpenses?.cents != null && !['projected', 'estimated'].includes(amounts.projectedExpenses.basis)) {
    throw new Error('projectedExpenses must use projected or estimated basis.')
  }
  const stripeAmounts = [
    amounts.actualCollected, amounts.refunds, amounts.credits, amounts.disputes,
    amounts.pastDueBalance, amounts.processorAvailable, amounts.payoutsInTransit,
  ]
  if (stripeAmounts.some((amount) => amount?.cents != null) && input.sourceStatus.stripe !== 'connected') {
    throw new Error('Stripe-derived amounts require sourceStatus.stripe=connected.')
  }
  if ((amounts.expenses?.cents != null || amounts.net?.cents != null) && input.sourceStatus['bluevine'] !== 'connected') {
    throw new Error('Expense and net amounts require sourceStatus.bluevine=connected.')
  }
}

function bases(amounts: SnapshotInput['money']) {
  return Object.fromEntries(Object.entries(amounts).flatMap(([name, amount]) =>
    amount?.cents == null ? [] : [[name, amount.basis]],
  ))
}

// Cheese owns this accounting connector. Tool names, the MCP server name, and
// recorded_by stay on the live lane_ wire values so existing credentials keep working.
export function createLaneAccountingMcpServer() {
  const server = new McpServer({ name: 'sparkle-suite-lane-accounting', version: '1.0.0' })
  server.registerTool(
    'lane_append_accounting_monthly_snapshot',
    {
      description: 'Append one validated, aggregate-only monthly accounting snapshot for Sparkle Suite or Sparkle Finder. Cheese owns this path. It cannot move money, alter providers, edit customers, create invoices, issue refunds, or overwrite/delete any prior snapshot.',
      inputSchema: snapshotInput,
    },
    async (input) => {
      validate(input)
      const { data, error } = await createAdminClient().from('accounting_monthly_snapshots').insert({
        schema_version: 1,
        product: input.product,
        period_start: input.periodStart,
        period_end_exclusive: input.periodEndExclusive,
        as_of: input.asOf,
        // Stored actor key remains lane so existing snapshot rows stay valid. Cheese owns this path.
        recorded_by: 'lane',
        reason: input.reason,
        source_status: input.sourceStatus,
        money_basis: bases(input.money),
        active_client_count: input.counts.active ?? null,
        past_due_client_count: input.counts.pastDue ?? null,
        cancelled_client_count: input.counts.cancelled ?? null,
        projected_recurring_cents: value(input.money.projectedRecurring),
        projected_expenses_cents: value(input.money.projectedExpenses),
        actual_collected_cents: value(input.money.actualCollected),
        refunds_cents: value(input.money.refunds),
        credits_cents: value(input.money.credits),
        disputes_cents: value(input.money.disputes),
        past_due_balance_cents: value(input.money.pastDueBalance),
        processor_available_cents: value(input.money.processorAvailable),
        payouts_in_transit_cents: value(input.money.payoutsInTransit),
        expenses_cents: value(input.money.expenses),
        net_cents: value(input.money.net),
      }).select('id, recorded_at').single()
      if (error) throw new Error('Could not append accounting snapshot: ' + error.message)
      return {
        content: [{ type: 'text', text: JSON.stringify({
          snapshotId: data.id,
          recordedAt: data.recorded_at,
          mode: 'append_only',
          notice: 'Aggregate snapshot saved. No payment, bank, billing, customer, or provider state was changed.',
        }) }],
      }
    },
  )
  server.registerTool(
    'lane_get_current_accounting_snapshot',
    {
      description: 'Read the latest aggregate monthly accounting snapshot currently displayed for one product. Cheese owns this path. This returns no customer, invoice, payment, banking, or provider-object details.',
      inputSchema: z.object({ product: z.enum(['suite', 'finder']) }),
    },
    async ({ product }) => {
      const snapshot = await loadCurrentAccountingSnapshot(createAdminClient(), product)
      return {
        content: [{ type: 'text', text: JSON.stringify({
          product,
          snapshot,
          mode: 'read_only_aggregate',
          notice: 'This is Cheese’s verified monthly snapshot. Control Center uses it for the current Eastern calendar month.',
        }) }],
      }
    },
  )
  return server
}

export const laneAccountingMcpHandler = createMcpHandler(createLaneAccountingMcpServer)
