// Sparkle Suite — Gate 0 Item 5 (setup / schema inspection)
// Verifies schema for sms_wallet + wallet_transactions, inspects gatetest wallet state.
// SAFE: read-only except optional creation of sms_wallet row if missing for gatetest.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REP_ID = '5dc6c155-f46f-4806-85ba-636a588e653c';

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// 1. Wallet state for gatetest rep
const { data: wallet, error: wErr } = await admin
  .from('sms_wallet')
  .select('*')
  .eq('rep_id', REP_ID)
  .maybeSingle();

if (wErr) {
  console.error('WALLET_QUERY_ERROR:', wErr);
  process.exit(1);
}

let walletRow = wallet;
if (!walletRow) {
  console.log('NO_WALLET_ROW — creating fresh sms_wallet for gatetest');
  const { data: created, error: cErr } = await admin
    .from('sms_wallet')
    .insert({ rep_id: REP_ID })
    .select('*')
    .single();
  if (cErr) {
    console.error('WALLET_CREATE_ERROR:', cErr);
    process.exit(1);
  }
  walletRow = created;
}

console.log('WALLET_ROW:', JSON.stringify(walletRow, null, 2));

// 2. Transaction count baseline
const { count, error: tErr } = await admin
  .from('wallet_transactions')
  .select('*', { count: 'exact', head: true })
  .eq('wallet_id', walletRow.id);
if (tErr) {
  console.error('TX_COUNT_ERROR:', tErr);
  process.exit(1);
}
console.log('INITIAL_TX_COUNT:', count);

// 3. Emit derived values
const INITIAL_BALANCE = walletRow.balance_cents;
const DB_MIN = walletRow.minimum_load_amount_cents;
const LOAD_AMOUNT_CENTS = Math.max(500, DB_MIN);

console.log('SUMMARY_JSON:', JSON.stringify({
  wallet_id: walletRow.id,
  INITIAL_BALANCE,
  DB_MIN,
  LOAD_AMOUNT_CENTS,
  INITIAL_TX_COUNT: count,
}));
