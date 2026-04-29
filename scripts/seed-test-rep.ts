/**
 * Seed script for the test rep account (testrep@neonrabbit.net).
 * Also creates auth users for louis@neonrabbit.net and testrep@neonrabbit.net.
 *
 * Usage: npx tsx scripts/seed-test-rep.ts
 *
 * Idempotent — safe to re-run. Cleans up existing test rep data first.
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ---------- helpers ----------

async function ensureAuthUser(email: string, password: string): Promise<string> {
  // Check if user already exists by listing users
  const { data: { users }, error: listError } = await admin.auth.admin.listUsers()
  if (listError) throw new Error(`Failed to list users: ${listError.message}`)

  const existing = users.find((u) => u.email === email)
  if (existing) {
    console.log(`  Auth user ${email} already exists (${existing.id})`)
    return existing.id
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) throw new Error(`Failed to create auth user ${email}: ${error.message}`)
  console.log(`  Created auth user ${email} (${data.user.id})`)
  return data.user.id
}

function nextWeekday(dayOfWeek: number, hour: number, minute: number): string {
  // dayOfWeek: 0=Sun, 5=Fri
  const now = new Date()
  const current = now.getDay()
  let daysUntil = dayOfWeek - current
  if (daysUntil <= 0) daysUntil += 7

  const target = new Date(now)
  target.setDate(now.getDate() + daysUntil)
  // Set time in EST (UTC-4 in April)
  target.setUTCHours(hour + 4, minute, 0, 0)
  return target.toISOString()
}

// ---------- main ----------

async function main() {
  console.log('\n=== Phase 0.3: Supabase Auth Setup ===\n')

  // 1. Create admin account (Louis)
  console.log('Creating auth users...')
  const louisAuthId = await ensureAuthUser('louis@neonrabbit.net', 'NeonRabbit2026!')

  // 2. Create test rep account
  const testRepAuthId = await ensureAuthUser('testrep@neonrabbit.net', 'SparkleTest2026!')

  console.log('\n=== Phase 0.6: Seed Test Rep Data ===\n')

  // 3. Clean up existing test rep data (cascade from reps table handles most)
  console.log('Cleaning up existing test rep data...')
  const { data: existingRep } = await admin
    .from('reps')
    .select('id')
    .eq('email', 'testrep@neonrabbit.net')
    .maybeSingle()

  if (existingRep) {
    // Delete in reverse dependency order
    await admin.from('rep_notes').delete().eq('rep_id', existingRep.id)
    await admin.from('calendar_events').delete().eq('rep_id', existingRep.id)
    await admin.from('onboarding_status').delete().eq('rep_id', existingRep.id)
    await admin.from('subscriptions').delete().eq('rep_id', existingRep.id)
    await admin.from('sms_wallet').delete().eq('rep_id', existingRep.id)
    await admin.from('site_settings').delete().eq('rep_id', existingRep.id)

    // Trade chain: fulfillment -> requests -> listings
    const { data: listings } = await admin
      .from('trade_listings')
      .select('id')
      .eq('rep_id', existingRep.id)
    if (listings?.length) {
      const listingIds = listings.map((l) => l.id)
      const { data: requests } = await admin
        .from('trade_requests')
        .select('id')
        .in('listing_id', listingIds)
      if (requests?.length) {
        const requestIds = requests.map((r) => r.id)
        await admin.from('trade_fulfillment').delete().in('request_id', requestIds)
        await admin.from('trade_requests').delete().in('listing_id', listingIds)
      }
      await admin.from('trade_listings').delete().eq('rep_id', existingRep.id)
    }

    await admin.from('reps').delete().eq('id', existingRep.id)
    console.log('  Cleaned up existing test rep data')
  } else {
    console.log('  No existing test rep data to clean up')
  }

  // Also ensure Louis has a rep row (admin account)
  const { data: louisRep } = await admin
    .from('reps')
    .select('id')
    .eq('email', 'louis@neonrabbit.net')
    .maybeSingle()

  if (!louisRep) {
    await admin.from('reps').insert({
      auth_user_id: louisAuthId,
      display_name: 'Louis',
      business_name: 'Neon Rabbit',
      email: 'louis@neonrabbit.net',
      status: 'active',
    })
    console.log('  Created admin rep row for Louis')
  }

  // 4. Insert test rep
  console.log('Inserting test rep...')
  const { data: rep, error: repError } = await admin
    .from('reps')
    .insert({
      auth_user_id: testRepAuthId,
      display_name: 'Demo Rep',
      business_name: 'Sparkle Suite Demo',
      email: 'testrep@neonrabbit.net',
      custom_domain: null,
      template_id: 'default',
      status: 'active',
      shop_link: 'https://www.bombparty.com/shop',
      streaming_links: { tiktok: 'https://tiktok.com/@demo', facebook: '' },
      social_handles: { tiktok: '@sparklesuitedemo', instagram: '@sparklesuitedemo' },
    })
    .select('id')
    .single()

  if (repError) throw new Error(`Failed to insert rep: ${repError.message}`)
  const repId = rep.id
  console.log(`  Inserted rep: ${repId}`)

  // 5. site_settings
  console.log('Inserting site_settings...')
  const { error: ssErr } = await admin.from('site_settings').insert({
    rep_id: repId,
    tagline: 'Your Sparkle Suite Demo Store',
    banner_text: 'Welcome to the Demo!',
    banner_visible: true,
    ticker_text: 'New pieces added weekly',
    ticker_visible: true,
    show_join_page: true,
    hero_animation_type: 'zoom',
  })
  if (ssErr) throw new Error(`site_settings: ${ssErr.message}`)

  // 6. sms_wallet
  console.log('Inserting sms_wallet...')
  const { error: walletErr } = await admin.from('sms_wallet').insert({
    rep_id: repId,
    balance_cents: 5000,
    auto_recharge_enabled: false,
    auto_recharge_threshold_cents: 500,
    auto_recharge_amount_cents: 2500,
    minimum_load_amount_cents: 2500,
    auto_recharge_pending: false,
  })
  if (walletErr) throw new Error(`sms_wallet: ${walletErr.message}`)

  // 7. subscriptions
  console.log('Inserting subscription...')
  const now = new Date().toISOString()
  const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const { error: subErr } = await admin.from('subscriptions').insert({
    rep_id: repId,
    plan_tier: 'monthly',
    status: 'active',
    monthly_amount: 0.0,
    current_period_start: now,
    current_period_end: thirtyDaysLater,
  })
  if (subErr) throw new Error(`subscriptions: ${subErr.message}`)

  // 8. onboarding_status
  console.log('Inserting onboarding_status...')
  const { error: obErr } = await admin.from('onboarding_status').insert({
    rep_id: repId,
    current_stage: 'launched',
    camera_type: 'phone_fallback',
    camera_quality_passed: true,
  })
  if (obErr) throw new Error(`onboarding_status: ${obErr.message}`)

  // 9. collections (shared — upsert by name)
  console.log('Inserting collections...')
  const collectionNames = ['March 2026', 'Galaxy', 'Celestial']
  const collectionMap: Record<string, string> = {}

  for (const name of collectionNames) {
    const { data: existing } = await admin
      .from('collections')
      .select('id')
      .eq('name', name)
      .maybeSingle()

    if (existing) {
      collectionMap[name] = existing.id
      console.log(`  Collection "${name}" already exists (${existing.id})`)
    } else {
      const { data: col, error: colErr } = await admin
        .from('collections')
        .insert({ name })
        .select('id')
        .single()
      if (colErr) throw new Error(`collections: ${colErr.message}`)
      collectionMap[name] = col.id
      console.log(`  Created collection "${name}" (${col.id})`)
    }
  }

  // 10. jewelry_designs (shared — upsert by item_number)
  console.log('Inserting jewelry designs...')
  const designs = [
    { item_number: 'RG31452', design_name: 'The Celeste Ring', collection: 'Celestial', material: 'Rhodium Plating', main_stone: 'Lab-Created Emerald', bp_msrp: 128, type_prefix: 'RG' },
    { item_number: 'NK66139', design_name: 'In The Orbit Of Grace', collection: 'Galaxy', material: 'Rose Gold Plating', main_stone: 'Lab Created Citrine', bp_msrp: 134, type_prefix: 'NK' },
    { item_number: 'ER84972', design_name: 'Sculpted To Shimmer', collection: 'March 2026', material: 'Rhodium Plating', main_stone: 'Garnet Cubic Zirconia', bp_msrp: 138, type_prefix: 'ER' },
    { item_number: 'ST78951', design_name: 'The Modern Muse', collection: 'Galaxy', material: 'Gold Plating', main_stone: 'Lab Created Stones', bp_msrp: 140, type_prefix: 'ST' },
    { item_number: 'BR22415', design_name: 'Wrapped In Light', collection: 'Celestial', material: 'Rhodium Plating', main_stone: 'Lab-Created Sapphire', bp_msrp: 132, type_prefix: 'BR' },
  ]

  const designMap: Record<string, string> = {}

  for (const d of designs) {
    const { data: existing } = await admin
      .from('jewelry_designs')
      .select('id')
      .eq('item_number', d.item_number)
      .maybeSingle()

    if (existing) {
      designMap[d.item_number] = existing.id
      console.log(`  Design ${d.item_number} already exists (${existing.id})`)
    } else {
      const { data: design, error: dErr } = await admin
        .from('jewelry_designs')
        .insert({
          item_number: d.item_number,
          design_name: d.design_name,
          collection_id: collectionMap[d.collection],
          material: d.material,
          main_stone: d.main_stone,
          bp_msrp: d.bp_msrp,
          type_prefix: d.type_prefix,
        })
        .select('id')
        .single()
      if (dErr) throw new Error(`jewelry_designs (${d.item_number}): ${dErr.message}`)
      designMap[d.item_number] = design.id
      console.log(`  Created design ${d.item_number} (${design.id})`)
    }
  }

  // 11. trade_listings (3 of 5 designs). We need the inserted listing ids
  // back so the trade_requests step below can target them by item_number.
  console.log('Inserting trade listings...')
  const listingItems = ['RG31452', 'NK66139', 'ER84972']
  const listingIdByItem: Record<string, string> = {}
  for (const itemNum of listingItems) {
    const { data: tl, error: tlErr } = await admin
      .from('trade_listings')
      .insert({
        rep_id: repId,
        design_id: designMap[itemNum],
        uses_canonical_photo: true,
        status: 'available',
        listed_at: now,
      })
      .select('id')
      .single()
    if (tlErr) throw new Error(`trade_listings (${itemNum}): ${tlErr.message}`)
    listingIdByItem[itemNum] = tl.id
    console.log(`  Listed ${itemNum} (${tl.id})`)
  }

  // 11b. trade_requests — submit two pending requests via rpc_submit_trade_request.
  // The RPC flips the targeted listing's status to pending_trade automatically,
  // which gives Thumper a real two-request inbox for testing approve + reject
  // flows independently. The third listing (ER84972) intentionally stays
  // available so other tests (e.g. remove_listing) have an untouched target.
  console.log('Submitting trade requests...')
  const tradeRequestSeed = [
    {
      itemNumber: 'RG31452',
      customerName: 'Test Customer Alice',
      customerDescription:
        'I have a Galaxy ring to trade — NK55201, rose gold with lab citrine. Similar MSRP.',
    },
    {
      itemNumber: 'NK66139',
      customerName: 'Test Customer Bob',
      customerDescription:
        'Trading my Celestial earrings — ER44821, rhodium with CZ. Close MSRP match.',
    },
  ]
  for (const req of tradeRequestSeed) {
    const listingId = listingIdByItem[req.itemNumber]
    if (!listingId) {
      throw new Error(`trade_requests: no listing id for ${req.itemNumber}`)
    }
    const { error: trErr } = await admin.rpc('rpc_submit_trade_request', {
      p_listing_id: listingId,
      p_customer_name: req.customerName,
      p_customer_description: req.customerDescription,
    })
    if (trErr) {
      throw new Error(`trade_requests (${req.itemNumber}): ${trErr.message}`)
    }
    console.log(`  Submitted request from ${req.customerName} for ${req.itemNumber}`)
  }

  // 12. calendar_events
  console.log('Inserting calendar events...')
  const nextFriday = nextWeekday(5, 20, 0) // Friday 8 PM EST
  const nextSunday = nextWeekday(0, 15, 0) // Sunday 3 PM EST

  const { error: ev1Err } = await admin.from('calendar_events').insert({
    rep_id: repId,
    description: 'Friday Night Fizz',
    event_time: nextFriday,
    platform: 'TikTok',
    discount_code: 'SPARKLE10',
    status: 'scheduled',
  })
  if (ev1Err) throw new Error(`calendar_events (Friday): ${ev1Err.message}`)

  const { error: ev2Err } = await admin.from('calendar_events').insert({
    rep_id: repId,
    description: 'Sunday Sparkle Session',
    event_time: nextSunday,
    platform: 'TikTok',
    status: 'scheduled',
  })
  if (ev2Err) throw new Error(`calendar_events (Sunday): ${ev2Err.message}`)
  console.log('  Created 2 calendar events')

  // 13. rep_notes (Thumper memory)
  console.log('Inserting rep note...')
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { error: noteErr } = await admin.from('rep_notes').insert({
    rep_id: repId,
    summary:
      'Demo rep prefers to batch-add pieces after shows rather than during. Likes Galaxy collection the most. Has a lightbox arriving soon for photo setup.',
    conversation_date: yesterday,
  })
  if (noteErr) throw new Error(`rep_notes: ${noteErr.message}`)

  console.log('\n=== Seed Complete ===\n')

  // ---------- Verification ----------

  console.log('=== Verification ===\n')

  // Verify auth users can sign in
  console.log('1. Testing auth sign-in for louis@neonrabbit.net...')
  const { data: louisSignIn, error: louisSignInErr } = await admin.auth.signInWithPassword({
    email: 'louis@neonrabbit.net',
    password: 'NeonRabbit2026!',
  })
  console.log(louisSignInErr ? `   FAIL: ${louisSignInErr.message}` : `   OK: signed in (${louisSignIn.user?.id})`)

  console.log('2. Testing auth sign-in for testrep@neonrabbit.net...')
  const { data: repSignIn, error: repSignInErr } = await admin.auth.signInWithPassword({
    email: 'testrep@neonrabbit.net',
    password: 'SparkleTest2026!',
  })
  console.log(repSignInErr ? `   FAIL: ${repSignInErr.message}` : `   OK: signed in (${repSignIn.user?.id})`)

  // Verify test rep has data in all 9 tables
  console.log('3. Verifying test rep data across tables...')
  const tables = [
    'reps',
    'site_settings',
    'sms_wallet',
    'subscriptions',
    'onboarding_status',
    'trade_listings',
    'calendar_events',
    'rep_notes',
  ]

  for (const table of tables) {
    const { data, error } = await admin.from(table).select('id').eq('rep_id', repId)
    if (table === 'reps') {
      // reps uses id directly
      const { data: r, error: rErr } = await admin.from('reps').select('id').eq('id', repId)
      console.log(rErr ? `   ${table}: FAIL (${rErr.message})` : `   ${table}: ${r?.length} row(s)`)
    } else {
      console.log(error ? `   ${table}: FAIL (${error.message})` : `   ${table}: ${data?.length} row(s)`)
    }
  }

  // Collections and designs (shared tables — check they exist)
  const { data: cols } = await admin.from('collections').select('id').in('name', collectionNames)
  console.log(`   collections: ${cols?.length} row(s)`)

  const { data: dsgns } = await admin
    .from('jewelry_designs')
    .select('id')
    .in('item_number', designs.map((d) => d.item_number))
  console.log(`   jewelry_designs: ${dsgns?.length} row(s)`)

  // 4. Test RLS: create a client with the test rep's JWT
  console.log('\n4. Testing RLS (rep can only see own data)...')
  if (repSignIn?.session) {
    const repClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${repSignIn.session.access_token}` } },
    })

    const { data: repReps } = await repClient.from('reps').select('id')
    console.log(`   As test rep — reps visible: ${repReps?.length} (expected: 1)`)

    const { data: repListings } = await repClient.from('trade_listings').select('id')
    console.log(`   As test rep — trade_listings visible: ${repListings?.length} (expected: 3)`)

    const { data: repWallet } = await repClient.from('sms_wallet').select('id')
    console.log(`   As test rep — sms_wallet visible: ${repWallet?.length} (expected: 1)`)
  }

  // 5. Test admin access: sign in as Louis and verify full visibility
  console.log('\n5. Testing admin access (Louis sees all)...')
  if (louisSignIn?.session) {
    const adminClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${louisSignIn.session.access_token}` } },
    })

    const { data: adminReps } = await adminClient.from('reps').select('id')
    console.log(`   As admin — reps visible: ${adminReps?.length} (expected: >= 2)`)

    const { data: adminListings } = await adminClient.from('trade_listings').select('id')
    console.log(`   As admin — trade_listings visible: ${adminListings?.length} (expected: >= 3)`)
  }

  console.log('\n=== All Done ===\n')
}

main().catch((err) => {
  console.error('SEED FAILED:', err)
  process.exit(1)
})
