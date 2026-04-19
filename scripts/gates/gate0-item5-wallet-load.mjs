// Sparkle Suite — Gate 0 Item 5 (Step 1: wallet load via Stripe)
//
// IMPORTANT — schema/webhook reality:
//   The webhook handler (app/api/stripe/webhook/route.ts) ONLY credits a wallet via
//   `checkout.session.completed` when metadata includes wallet_load='true', or via
//   `payment_intent.succeeded` when metadata includes auto_recharge='true'. A raw
//   PaymentIntent with wallet_load metadata is a no-op. Therefore this script
//   creates a Stripe Checkout Session (mode='payment') with the exact metadata
//   the production route at app/api/stripe/wallet/load/route.ts uses, and
//   returns the hosted checkout URL for headless completion.
//
// Metadata keys (from webhook handleWalletLoad):
//   wallet_load:    'true'
//   wallet_id:      <uuid>
//   rep_id:         <uuid>
//   intended_cents: <string of integer cents>
//
// Amount: LOAD_AMOUNT_CENTS (from argv; defaults to 2500 = $25.00, DB minimum)
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const REP_ID = '5dc6c155-f46f-4806-85ba-636a588e653c';
const WALLET_ID = process.argv[2];
const LOAD_AMOUNT_CENTS = Number.parseInt(process.argv[3] ?? '2500', 10);
const CUSTOMER_ID = 'cus_UMeV4YFLGAaSz9';

if (!WALLET_ID) {
  console.error('Usage: node gate0-item5-wallet-load.mjs <wallet_id> <load_amount_cents>');
  process.exit(1);
}

const metadata = {
  rep_id: REP_ID,
  wallet_id: WALLET_ID,
  wallet_load: 'true',
  intended_cents: String(LOAD_AMOUNT_CENTS),
  gate_test: 'gate_0_item_5',
};

const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  customer: CUSTOMER_ID,
  payment_method_types: ['card'],
  line_items: [
    {
      quantity: 1,
      price_data: {
        currency: 'usd',
        product_data: { name: 'SMS Wallet Load (Gate 0 Item 5)' },
        unit_amount: LOAD_AMOUNT_CENTS,
      },
    },
  ],
  payment_intent_data: { metadata },
  metadata,
  success_url: 'https://sparkle-suite.vercel.app/?wallet=success',
  cancel_url: 'https://sparkle-suite.vercel.app/?wallet=cancelled',
});

console.log('CHECKOUT_SESSION_ID:', session.id);
console.log('PAYMENT_INTENT:', session.payment_intent);
console.log('CHECKOUT_URL:', session.url);
