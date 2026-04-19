import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, key, { auth: { persistSession: false } });

const { data: users, error: uErr } = await admin.auth.admin.listUsers();
if (uErr) throw uErr;
const testrep = users.users.find((u) => u.email === 'testrep@neonrabbit.net');
console.log('auth.users testrep:', testrep ? { id: testrep.id, email: testrep.email } : 'NOT FOUND');

if (!testrep) process.exit(0);

const { data: rep, error: rErr } = await admin
  .from('reps')
  .select('id, auth_user_id, email')
  .eq('auth_user_id', testrep.id)
  .maybeSingle();
console.log('reps row:', rep, rErr ? `err=${rErr.message}` : '');

if (!rep) process.exit(0);

const { data: subs, error: sErr } = await admin
  .from('subscriptions')
  .select('*')
  .eq('rep_id', rep.id);
console.log('subscriptions rows for testrep:', subs?.length ?? 0);
console.log(JSON.stringify(subs, null, 2));
if (sErr) console.log('subs err:', sErr.message);

const { data: events, error: eErr } = await admin
  .from('stripe_events')
  .select('*')
  .limit(5);
console.log('stripe_events (sample, first 5):', events?.length ?? 0);
console.log(JSON.stringify(events, null, 2));
if (eErr) console.log('events err:', eErr.message);
