import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, key, { auth: { persistSession: false } });

const sql = `
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name IN ('subscriptions','stripe_events')
ORDER BY table_name, ordinal_position;
`;

const { data, error } = await supabase.rpc('exec_sql_readonly', { q: sql }).catch((e) => ({ data: null, error: e }));

if (error || !data) {
  const res = await fetch(`${url}/rest/v1/subscriptions?select=*&limit=0`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  console.log('subscriptions HEAD (check existence):', res.status);

  const res2 = await fetch(`${url}/rest/v1/stripe_events?select=*&limit=0`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  console.log('stripe_events HEAD (check existence):', res2.status);

  // Insert a dummy "OPTIONS" call
  const r3 = await fetch(`${url}/rest/v1/subscriptions?select=*&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  console.log('subscriptions sample body:', await r3.text());
  const r4 = await fetch(`${url}/rest/v1/stripe_events?select=*&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  console.log('stripe_events sample body:', await r4.text());
  process.exit(0);
}
console.log(JSON.stringify(data, null, 2));
