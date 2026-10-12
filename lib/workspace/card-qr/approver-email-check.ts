import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendCardQrEmailViaResend, type CardQrEmailSender } from '@/lib/workspace/card-qr/order-emails'
import { cardQrApproverEmail, sendCardQrApproverEmail, type CardQrApproverEmailResult } from '@/lib/workspace/card-qr/printer-approval'

export interface CardQrUnsentOrder {
  id: string
  order_number: string
  paid_at: string
  approver_email_status: string | null
  approver_email_attempts: number
  fulfillment_email_error: string | null
}

/**
 * Daily check: paid orders whose APPROVAL NEEDED email never went out. Retries each once (the
 * claim makes this safe), then alerts the approver about any still unsent.
 */
export async function runCardQrApproverEmailCheck(
  deps: { db?: SupabaseClient; send?: CardQrEmailSender; now?: Date; approverTo?: string } = {},
) {
  const db = deps.db ?? createAdminClient()
  const send = deps.send ?? sendCardQrEmailViaResend
  const cutoff = new Date((deps.now ?? new Date()).getTime() - 15 * 60 * 1000).toISOString()
  const { data, error } = await db
    .from('rep_card_print_orders')
    .select('id, order_number, paid_at, approver_email_status, approver_email_attempts, fulfillment_email_error')
    .in('status', ['paid', 'received'])
    .is('fulfillment_email_sent_at', null)
    .lt('paid_at', cutoff)
    .order('paid_at', { ascending: true })
    .limit(50)
  if (error) throw new Error(`CARD_QR_CHECK_QUERY_FAILED: ${error.message}`)
  const orders = (data ?? []) as CardQrUnsentOrder[]

  const retried: Array<{ orderNumber: string; result: CardQrApproverEmailResult }> = []
  for (const o of orders) {
    retried.push({ orderNumber: o.order_number, result: await sendCardQrApproverEmail(o.id, { db, send }) })
  }
  const stillUnsent = retried.filter((r) => r.result !== 'sent')

  let alert: 'sent' | 'failed' | 'none' = 'none'
  if (stillUnsent.length) {
    const lines = orders
      .filter((o) => stillUnsent.some((r) => r.orderNumber === o.order_number))
      .map((o) => {
        const r = stillUnsent.find((x) => x.orderNumber === o.order_number)!
        return `- ${o.order_number}: paid ${o.paid_at}, attempts ${o.approver_email_attempts + (r.result === 'skipped' ? 0 : 1)}, this run: ${r.result}${o.fulfillment_email_error ? `, last error: ${o.fulfillment_email_error}` : ''}`
      })
    try {
      await send({
        to: deps.approverTo ?? cardQrApproverEmail(),
        subject: `ACTION: ${stillUnsent.length} paid business card order${stillUnsent.length === 1 ? '' : 's'} missing the approval email`,
        text: [
          'These paid business card orders still have no APPROVAL NEEDED email, so nothing has gone to the printer:',
          '',
          ...lines,
          '',
          'To resend one: POST /api/internal/card-qr/approver-emails with {"orderId": "<id>"} while signed in to Control Center (owner).',
          'It sends at most once. A send stuck for over 15 minutes is retried automatically by tomorrow\'s check.',
        ].join('\n'),
      })
      alert = 'sent'
    } catch (e) {
      console.error('CARD_QR_CHECK_ALERT_FAILED', e instanceof Error ? e.message : e)
      alert = 'failed'
    }
  }
  return { checked: orders.length, retried, stillUnsent: stillUnsent.length, alert }
}
