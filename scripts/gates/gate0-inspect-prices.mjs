import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const PRODUCT = 'prod_UMLNC0ybgRkVKX';

const all = await stripe.prices.list({ product: PRODUCT, limit: 100 });
console.log(`total prices on product (all): ${all.data.length}\n`);
for (const p of all.data) {
  const rec = p.recurring;
  console.log(JSON.stringify({
    id: p.id,
    lookup_key: p.lookup_key,
    nickname: p.nickname,
    active: p.active,
    unit_amount: p.unit_amount,
    currency: p.currency,
    interval: rec?.interval,
    interval_count: rec?.interval_count,
    metadata: p.metadata,
  }, null, 2));
}
