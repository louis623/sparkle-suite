// Sparkle Suite — Gate 0 Item 5 (Step 4: deduct × 5 via deduct_wallet_balance RPC)
//
// RPC signature (migration 009):
//   deduct_wallet_balance(p_wallet_id UUID, p_amount INTEGER)
//   RETURNS TABLE(new_balance_cents INTEGER, should_recharge BOOLEAN, attempt_id UUID)
//
// The RPC writes wallet_transactions rows with type='sms_charge' and description='SMS send'
// (both hardcoded — description is not accepted as a parameter in this schema).
import { createClient } from '@supabase/supabase-js';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const WALLET_ID = process.argv[2];
const PER_CALL = 9;
const CALLS = 5;

if (!WALLET_ID) {
  console.error('Usage: node gate0-item5-deduct.mjs <wallet_id>');
  process.exit(1);
}

const startTime = new Date().toISOString();
console.log('DEDUCT_START_TIME:', startTime);

const results = [];
for (let i = 1; i <= CALLS; i++) {
  const { data, error } = await admin.rpc('deduct_wallet_balance', {
    p_wallet_id: WALLET_ID,
    p_amount: PER_CALL,
  });
  if (error) {
    console.error(`CALL_${i}_ERROR:`, error);
    process.exit(1);
  }
  console.log(`CALL_${i}_RESULT:`, JSON.stringify(data));
  results.push(data);
}

console.log('ALL_CALLS_SUCCEEDED');
console.log('DEDUCT_END_TIME:', new Date().toISOString());

// Post-deduct snapshot
const { data: w } = await admin.from('sms_wallet').select('balance_cents').eq('id', WALLET_ID).single();
console.log('FINAL_BALANCE_CENTS:', w.balance_cents);

const { data: debits } = await admin
  .from('wallet_transactions')
  .select('*')
  .eq('wallet_id', WALLET_ID)
  .gte('created_at', startTime)
  .order('created_at', { ascending: true });
console.log('DEBIT_ROWS_AFTER_START:', JSON.stringify(debits, null, 2));

// Ledger math: sum credits - debits should equal balance
const { data: allTx } = await admin
  .from('wallet_transactions')
  .select('type,amount_cents')
  .eq('wallet_id', WALLET_ID);

const creditTypes = new Set(['load', 'refund', 'adjustment_credit', 'auto_recharge']);
const debitTypes = new Set(['sms_charge', 'adjustment_debit']);
let net = 0;
for (const t of allTx) {
  if (creditTypes.has(t.type)) net += t.amount_cents;
  else if (debitTypes.has(t.type)) net -= t.amount_cents;
}
console.log('LEDGER_NET_CENTS:', net);
console.log('LEDGER_RECONCILES:', net === w.balance_cents ? 'YES' : 'NO');
