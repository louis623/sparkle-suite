// Step 4 + Step 3 cross-check: DB writes + Stripe<->DB consistency.
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, key, { auth: { persistSession: false } });
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const EVENT_ID = 'evt_1TNvQDHRBK3pZpO2KhOj9AeM';
const REP_ID = '5dc6c155-f46f-4806-85ba-636a588e653c';
const EXPECTED_CUSTOMER = 'cus_UMeV4YFLGAaSz9';

// 1. stripe_events idempotency row
const { data: ev, error: evErr } = await admin
  .from('stripe_events')
  .select('*')
  .eq('event_id', EVENT_ID);
console.log('stripe_events match:', ev?.length, evErr?.message ?? '');
console.log(JSON.stringify(ev, null, 2));

// 2. subscriptions row(s) for gatetest rep
const { data: subs, error: sErr } = await admin
  .from('subscriptions')
  .select('*')
  .eq('rep_id', REP_ID);
console.log('subscriptions for gatetest:', subs?.length, sErr?.message ?? '');
console.log(JSON.stringify(subs, null, 2));

const sub = subs?.[0];
if (!sub) {
  console.log('NO_SUB_FOUND');
  process.exit(1);
}

const startsSub = sub.stripe_subscription_id?.startsWith('sub_');
const startsCus = sub.stripe_customer_id?.startsWith('cus_');
const cusMatches = sub.stripe_customer_id === EXPECTED_CUSTOMER;
const statusOk = ['active', 'trialing'].includes(sub.status);
const periodEnd = new Date(sub.current_period_end);
const future = periodEnd.getTime() > Date.now();
const priceField = sub.price_id ?? sub.stripe_price_id ?? null;

console.log('starts_sub:', startsSub);
console.log('starts_cus:', startsCus);
console.log('cus_matches_step1:', cusMatches);
console.log('status_ok:', statusOk, 'value=', sub.status);
console.log('period_end_future:', future, 'value=', sub.current_period_end);
console.log('price_field_value:', priceField);

// 3. Compare Stripe state to DB
const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
const stripeCustomer = stripeSub.customer;
const stripeStatus = stripeSub.status;
const stripeItem = stripeSub.items.data[0];
const stripePeriodEnd = new Date(stripeItem.current_period_end * 1000);

console.log('stripe.customer:', stripeCustomer);
console.log('stripe.status:', stripeStatus);
console.log('stripe.current_period_end:', stripePeriodEnd.toISOString());

const dbVsStripeMatch =
  stripeCustomer === sub.stripe_customer_id &&
  stripeStatus === sub.status &&
  Math.abs(stripePeriodEnd.getTime() - periodEnd.getTime()) < 1000;
console.log('STRIPE_DB_MATCH:', dbVsStripeMatch);

console.log('---SUMMARY---');
console.log(JSON.stringify({
  event_id: EVENT_ID,
  rep_id: REP_ID,
  stripe_events_count: ev.length,
  subscriptions_count: subs.length,
  sub_id: sub.stripe_subscription_id,
  cus_id: sub.stripe_customer_id,
  status: sub.status,
  current_period_end: sub.current_period_end,
  price_field: priceField,
  starts_sub: startsSub,
  starts_cus: startsCus,
  cus_matches_step1: cusMatches,
  status_ok: statusOk,
  period_end_future: future,
  stripe_db_match: dbVsStripeMatch,
}, null, 2));
