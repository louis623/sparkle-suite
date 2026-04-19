// Step 0d-0f: gatetest identity setup + preconditions
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, key, { auth: { persistSession: false } });

const EMAIL = 'gatetest@neonrabbit.net';

// 0d: find or create gatetest auth user
const { data: list, error: lErr } = await admin.auth.admin.listUsers();
if (lErr) throw lErr;
let authUser = list.users.find((u) => u.email === EMAIL);
if (authUser) {
  console.log('AUTH_USER_EXISTS:', authUser.id);
} else {
  const password = crypto.randomUUID() + crypto.randomUUID();
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email: EMAIL,
    password,
    email_confirm: true,
  });
  if (cErr) throw cErr;
  authUser = created.user;
  console.log('AUTH_USER_CREATED:', authUser.id);
}
const authUuid = authUser.id;

// Inspect reps schema first
const sampleRes = await fetch(`${url}/rest/v1/reps?select=*&limit=1`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
console.log('reps sample row (for schema discovery):', await sampleRes.text());

// 0e: find or create reps row for this auth user
const { data: existingRep, error: rqErr } = await admin
  .from('reps')
  .select('*')
  .eq('auth_user_id', authUuid)
  .maybeSingle();
if (rqErr) throw rqErr;

let repId;
if (existingRep) {
  console.log('REPS_ROW_EXISTS:', existingRep.id);
  repId = existingRep.id;
  console.log('existing rep full row:', JSON.stringify(existingRep, null, 2));
} else {
  // We don't know required fields yet — try minimal first
  const candidate = {
    auth_user_id: authUuid,
    email: EMAIL,
    display_name: 'Gate Test',
    business_name: 'Gate Test Co',
  };
  const { data: inserted, error: iErr } = await admin
    .from('reps')
    .insert(candidate)
    .select('*')
    .single();
  if (iErr) {
    console.log('REPS_INSERT_ERROR:', iErr.message);
    process.exit(1);
  }
  console.log('REPS_ROW_CREATED:', inserted.id);
  console.log('inserted rep full row:', JSON.stringify(inserted, null, 2));
  repId = inserted.id;
}

// 0f: confirm zero subscription rows for this rep
const { data: subs, error: sErr } = await admin
  .from('subscriptions')
  .select('*')
  .eq('rep_id', repId);
if (sErr) throw sErr;
console.log('SUBSCRIPTIONS_FOR_GATETEST_COUNT:', subs.length);
console.log('subs rows:', JSON.stringify(subs, null, 2));

console.log('---SUMMARY---');
console.log('GATETEST_AUTH_UUID=' + authUuid);
console.log('GATETEST_REPS_ID=' + repId);
console.log('GATETEST_SUBS_COUNT=' + subs.length);
