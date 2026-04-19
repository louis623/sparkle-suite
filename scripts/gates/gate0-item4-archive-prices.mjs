import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const PRODUCT = 'prod_UMLNC0ybgRkVKX';

const lookupKeysToArchive = ['ss_quarterly_test', 'ss_annual_test'];

const all = await stripe.prices.list({ product: PRODUCT, limit: 100 });

for (const key of lookupKeysToArchive) {
  const match = all.data.find((p) => p.lookup_key === key);
  if (!match) {
    console.log(`no price found with lookup_key ${key}`);
    continue;
  }
  if (match.active) {
    const updated = await stripe.prices.update(match.id, { active: false });
    console.log(`archived ${key} (${match.id}) -> active=${updated.active}`);
  } else {
    console.log(`already archived ${key} (${match.id}) -> active=${match.active}`);
  }
}

const active = await stripe.prices.list({ product: PRODUCT, active: true, limit: 100 });
console.log('\n=== active prices on product ===');
for (const p of active.data) {
  console.log(
    `${p.id}  lookup=${p.lookup_key}  amount=${p.unit_amount} ${p.currency} interval=${p.recurring?.interval_count}/${p.recurring?.interval}  active=${p.active}`,
  );
}
console.log(`\ntotal active: ${active.data.length}`);
