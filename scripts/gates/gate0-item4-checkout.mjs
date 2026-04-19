// Sparkle Suite — Gate 0 Item 4 (RETRY)
// Creates a Stripe Checkout session for the gatetest identity.
// Identity: gatetest@neonrabbit.net
// reps.id (rep_id metadata): 5dc6c155-f46f-4806-85ba-636a588e653c
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const REP_ID = '5dc6c155-f46f-4806-85ba-636a588e653c';
const EMAIL = 'gatetest@neonrabbit.net';
const PRICE_LOOKUP_KEY = 'ss_monthly_test';

// Resolve lookup_key -> price.id (Stripe checkout.line_items.price requires a price ID).
const priceList = await stripe.prices.list({
  lookup_keys: [PRICE_LOOKUP_KEY],
  active: true,
  limit: 1,
});
const price = priceList.data[0];
if (!price) {
  console.error(`No active price with lookup_key=${PRICE_LOOKUP_KEY}`);
  process.exit(1);
}
console.log('PRICE_ID:', price.id);

const customer = await stripe.customers.create({
  email: EMAIL,
  metadata: { rep_id: REP_ID },
});
console.log('CUSTOMER_ID:', customer.id);

const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  customer: customer.id,
  line_items: [{ price: price.id, quantity: 1 }],
  success_url: 'https://sparkle-suite.vercel.app/gate0-success',
  cancel_url: 'https://sparkle-suite.vercel.app/gate0-cancel',
  metadata: { rep_id: REP_ID, gate_test: 'gate_0_item_4' },
});

console.log('SESSION_ID:', session.id);
console.log('CHECKOUT_URL:', session.url);
