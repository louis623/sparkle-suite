// Sparkle Suite — Gate 0 Item 5 (Step 3: verify wallet + ledger after Stripe load)
import { createClient } from '@supabase/supabase-js';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const WALLET_ID = process.argv[2];
if (!WALLET_ID) {
  console.error('Usage: node gate0-item5-verify.mjs <wallet_id>');
  process.exit(1);
}

const { data: w } = await admin.from('sms_wallet').select('*').eq('id', WALLET_ID).single();
console.log('WALLET:', JSON.stringify(w, null, 2));

const { data: txs, count } = await admin
  .from('wallet_transactions')
  .select('*', { count: 'exact' })
  .eq('wallet_id', WALLET_ID)
  .order('created_at', { ascending: true });

console.log('TX_COUNT:', count);
console.log('TRANSACTIONS:', JSON.stringify(txs, null, 2));
