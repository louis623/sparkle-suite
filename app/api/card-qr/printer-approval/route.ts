import { approveCardQrOrderForPrinter, loadCardQrOrderFacts, verifyCardQrApproval } from '@/lib/workspace/card-qr/printer-approval'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const esc = (v: string) => v.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

function page(title: string, body: string, status = 200) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title>
<style>body{font-family:system-ui,sans-serif;max-width:560px;margin:48px auto;padding:0 20px;color:#2a1d33}h1{font-size:1.4rem}.card{border:1px solid #e6dcec;border-radius:14px;padding:20px}button{background:#b0257a;color:#fff;border:0;border-radius:999px;padding:12px 22px;font-size:1rem;cursor:pointer}dt{font-weight:600;margin-top:8px}</style></head>
<body><div class="card"><h1>${esc(title)}</h1>${body}</div></body></html>`,
    { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' } },
  )
}

const BAD: Record<string, string> = {
  not_configured: 'Approvals are not configured on this server.',
  bad_token: 'This approve link is not valid.',
  expired: 'This approve link has expired.',
}

/** GET only shows a confirm button, so link scanners and previews never approve anything. */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token')
  const v = verifyCardQrApproval(token)
  if (!v.ok) return page('Link not valid', `<p>${esc(BAD[v.reason])}</p>`, 400)
  const loaded = await loadCardQrOrderFacts(createAdminClient(), v.orderId)
  if (!loaded) return page('Order not found', '<p>No order matches this link.</p>', 404)
  const { order, facts } = loaded
  const a = facts.address
  const details = `<dl><dt>Order</dt><dd>${esc(facts.orderNumber)}</dd><dt>Rep</dt><dd>${esc(facts.repName)}</dd><dt>Cards</dt><dd>${facts.quantity}</dd><dt>Ship to</dt><dd>${esc([a.name, a.street1, a.street2, `${a.city}, ${a.state} ${a.zip}`].filter(Boolean).join(', '))}</dd></dl>`
  if (order.printer_email_sent_at) {
    return page(`${facts.orderNumber} already sent`, `${details}<p>Approved by ${esc(String(order.printer_approved_by))} and sent to the printer. Nothing else to do.</p>`)
  }
  return page(
    `Approve ${facts.orderNumber} for the printer?`,
    `${details}<p>${order.printer_approved_at ? `Already approved by ${esc(String(order.printer_approved_by))}. Click to send now if the printer email is configured.` : 'Approving sends this packet and the proof PDF to the printer, once.'}</p>
<form method="post"><input type="hidden" name="token" value="${esc(token ?? '')}"><button type="submit">Approve and send to printer</button></form>`,
  )
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null)
  const token = (form?.get('token') as string | null) ?? new URL(request.url).searchParams.get('token')
  const v = verifyCardQrApproval(token)
  if (!v.ok) return page('Link not valid', `<p>${esc(BAD[v.reason])}</p>`, 400)
  const result = await approveCardQrOrderForPrinter({
    orderId: v.orderId,
    approver: v.approver,
    meta: { via: 'signed_link', ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null, user_agent: request.headers.get('user-agent')?.slice(0, 200) ?? null },
  })
  if (result.status === 'not_found') return page('Order not found', '<p>No order matches this link.</p>', 404)
  if (result.status === 'not_paid') return page('Not paid', '<p>This order is not paid, so it cannot go to the printer.</p>', 409)
  const printer = {
    sent: `Sent to the printer (${esc(result.printerTo ?? '')}).`,
    already_sent: 'It was already sent to the printer earlier. Nothing was sent again.',
    not_configured: 'Approved and recorded. The printer email address is not set yet, so nothing was sent. Open this link again after it is set to send it.',
    failed: 'Approved, but the printer email failed. Open this link again to retry.',
    in_progress: 'A send to the printer is already in progress. Check again in 15 minutes before retrying.',
    unknown: 'Approved. We could not confirm whether the printer email went out. Do not resend by hand; open this link again after 15 minutes and it will retry only if needed.',
  }[result.printer]
  return page(`${result.orderNumber} ${result.status === 'approved' ? 'approved' : 'was already approved'}`, `<p>Approved by ${esc(result.approvedBy)} at ${esc(result.approvedAt)}.</p><p>${printer}</p>`)
}
