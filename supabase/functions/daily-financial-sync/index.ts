import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const PLAID_CLIENT_ID = Deno.env.get("PLAID_CLIENT_ID")!;
const PLAID_SECRET = Deno.env.get("PLAID_SECRET")!;
const SYNC_SECRET = Deno.env.get("SYNC_SECRET")!;

// Louis's auth UUID — all writes use this for RLS consistency
const OWNER_UUID = Deno.env.get("OWNER_UUID")!;

const PLAID_BASE_URL = "https://production.plaid.com";
const STRIPE_BASE_URL = "https://api.stripe.com/v1";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTodayAndYesterdayNY(): {
  today: string;
  yesterdayStartEpoch: number;
  yesterdayEndEpoch: number;
} {
  const now = new Date();
  const nyDate = new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" })
  );
  const todayStr = nyDate.toISOString().split("T")[0];

  const todayMidnight = new Date(todayStr + "T00:00:00-05:00");
  const yesterdayMidnight = new Date(todayMidnight.getTime() - 86400000);

  return {
    today: todayStr,
    yesterdayStartEpoch: Math.floor(yesterdayMidnight.getTime() / 1000),
    yesterdayEndEpoch: Math.floor(todayMidnight.getTime() / 1000),
  };
}

function centsToDollars(cents: number): number {
  return Math.round(cents) / 100;
}

async function stripeGet(endpoint: string, params: Record<string, string> = {}): Promise<unknown> {
  const url = new URL(`${STRIPE_BASE_URL}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Stripe ${endpoint} failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function stripeGetAll(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;
  while (hasMore) {
    const p = { ...params, limit: "100" };
    if (startingAfter) p["starting_after"] = startingAfter;
    const json = (await stripeGet(endpoint, p)) as {
      data: Record<string, unknown>[];
      has_more: boolean;
    };
    all.push(...json.data);
    hasMore = json.has_more;
    if (json.data.length > 0) {
      startingAfter = json.data[json.data.length - 1].id as string;
    }
  }
  return all;
}

async function plaidPost(endpoint: string, body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${PLAID_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: PLAID_CLIENT_ID,
      secret: PLAID_SECRET,
      ...body,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Plaid ${endpoint} failed: ${res.status} ${text}`);
  }
  return res.json();
}

function log(step: string, msg: string) {
  console.log(`[daily-financial-sync][${step}] ${msg}`);
}

// ─── Stripe Pipeline ─────────────────────────────────────────────────────────

interface StripeResult {
  stripeAvailable: number;
  stripePending: number;
  mrr: number;
  subscriptionCount: number;
  dailyRevenue: number;
  dailyStripeFees: number;
  dailyOneTimeRevenue: number;
  failedPaymentsCount: number;
  activeSubscriptions: Record<string, unknown>[];
  pastDueSubscriptions: Record<string, unknown>[];
}

async function runStripe(yesterdayStart: number, yesterdayEnd: number): Promise<StripeResult> {
  log("stripe", "Fetching balance...");
  const balance = (await stripeGet("balance")) as {
    available: { amount: number }[];
    pending: { amount: number }[];
  };
  const stripeAvailable = centsToDollars(
    balance.available.reduce((s: number, a: { amount: number }) => s + a.amount, 0)
  );
  const stripePending = centsToDollars(
    balance.pending.reduce((s: number, a: { amount: number }) => s + a.amount, 0)
  );

  log("stripe", "Fetching subscriptions...");
  const activeSubs = await stripeGetAll("subscriptions", { status: "active" });
  const pastDueSubs = await stripeGetAll("subscriptions", { status: "past_due" });

  // MRR: normalize all intervals to monthly
  let mrrCents = 0;
  for (const sub of activeSubs) {
    const items = sub.items as { data: { price: { unit_amount: number; recurring: { interval: string; interval_count: number } } }[] };
    for (const item of items.data) {
      const amount = item.price.unit_amount;
      const interval = item.price.recurring?.interval;
      const count = item.price.recurring?.interval_count || 1;
      if (interval === "month") mrrCents += amount / count;
      else if (interval === "quarter") mrrCents += amount / (3 * count);
      else if (interval === "year") mrrCents += amount / (12 * count);
      else if (interval === "week") mrrCents += (amount * 52) / (12 * count);
      else if (interval === "day") mrrCents += (amount * 365) / (12 * count);
      else mrrCents += amount;
    }
  }

  log("stripe", "Fetching yesterday's invoices and balance transactions...");
  const [invoices, balanceTxns] = await Promise.all([
    stripeGetAll("invoices", {
      status: "paid",
      "created[gte]": String(yesterdayStart),
      "created[lt]": String(yesterdayEnd),
    }),
    stripeGetAll("balance_transactions", {
      "created[gte]": String(yesterdayStart),
      "created[lt]": String(yesterdayEnd),
    }),
  ]);

  const dailyRevenue = centsToDollars(
    invoices.reduce((s, inv) => s + (inv.amount_paid as number || 0), 0)
  );
  const dailyStripeFees = centsToDollars(
    balanceTxns.reduce((s, tx) => s + (tx.fee as number || 0), 0)
  );
  const dailyOneTimeRevenue = centsToDollars(
    invoices
      .filter((inv) => !inv.subscription)
      .reduce((s, inv) => s + (inv.amount_paid as number || 0), 0)
  );

  log("stripe", `MRR: $${centsToDollars(mrrCents)}, Daily: $${dailyRevenue}, Fees: $${dailyStripeFees}`);

  return {
    stripeAvailable,
    stripePending,
    mrr: centsToDollars(mrrCents),
    subscriptionCount: activeSubs.length,
    dailyRevenue,
    dailyStripeFees,
    dailyOneTimeRevenue,
    failedPaymentsCount: pastDueSubs.length,
    activeSubscriptions: activeSubs,
    pastDueSubscriptions: pastDueSubs,
  };
}

// ─── Plaid Pipeline ──────────────────────────────────────────────────────────

interface PlaidResult {
  businessBalance: number;
  businessCheckingAvailable: number;
  addedTransactions: Record<string, unknown>[];
  modifiedTransactions: Record<string, unknown>[];
  removedTransactionIds: string[];
  newCursor: string;
}

async function runPlaid(): Promise<PlaidResult> {
  // Read secrets from Vault
  const { data: secrets } = await supabase
    .from("vault.decrypted_secrets" as string)
    .select("name, decrypted_secret")
    .in("name", ["plaid_access_token", "plaid_account_id"]);

  const secretMap: Record<string, string> = {};
  for (const s of secrets || []) {
    secretMap[s.name] = s.decrypted_secret;
  }

  const accessToken = secretMap["plaid_access_token"];
  const targetAccountId = secretMap["plaid_account_id"];

  if (!accessToken || accessToken === "PLACEHOLDER_SET_AFTER_LINK") {
    throw new Error("Plaid access token not configured — run Plaid Link first");
  }

  // Get balance filtered to target account
  log("plaid", "Fetching balance...");
  const balanceData = (await plaidPost("/accounts/balance/get", {
    access_token: accessToken,
    options: targetAccountId ? { account_ids: [targetAccountId] } : {},
  })) as { accounts: { current: number; available: number; account_id: string }[] };

  const account = targetAccountId
    ? balanceData.accounts.find((a) => a.account_id === targetAccountId)
    : balanceData.accounts[0];

  const businessBalance = account?.current ?? 0;
  const businessCheckingAvailable = account?.available ?? 0;

  // Get cursor from sync state
  const { data: syncState } = await supabase
    .from("plaid_sync_state")
    .select("cursor")
    .limit(1)
    .maybeSingle();

  let cursor = syncState?.cursor || "";
  const added: Record<string, unknown>[] = [];
  const modified: Record<string, unknown>[] = [];
  const removed: { transaction_id: string }[] = [];
  let hasMore = true;

  log("plaid", "Syncing transactions...");
  while (hasMore) {
    const syncData = (await plaidPost("/transactions/sync", {
      access_token: accessToken,
      cursor,
      count: 500,
    })) as {
      added: Record<string, unknown>[];
      modified: Record<string, unknown>[];
      removed: { transaction_id: string }[];
      next_cursor: string;
      has_more: boolean;
    };

    added.push(...syncData.added);
    modified.push(...syncData.modified);
    removed.push(...syncData.removed);
    cursor = syncData.next_cursor;
    hasMore = syncData.has_more;
  }

  // Filter to target account
  const filteredAdded = targetAccountId
    ? added.filter((t) => t.account_id === targetAccountId)
    : added;
  const filteredModified = targetAccountId
    ? modified.filter((t) => t.account_id === targetAccountId)
    : modified;

  log("plaid", `Balance: $${businessBalance}, Added: ${filteredAdded.length}, Modified: ${filteredModified.length}, Removed: ${removed.length}`);

  return {
    businessBalance,
    businessCheckingAvailable,
    addedTransactions: filteredAdded,
    modifiedTransactions: filteredModified,
    removedTransactionIds: removed.map((r) => r.transaction_id),
    newCursor: cursor,
  };
}

// ─── Brief Generation ────────────────────────────────────────────────────────

async function generateBrief(
  type: "morning" | "evening",
  today: string,
  snapshotData: Record<string, unknown> | null
) {
  log("brief", `Generating ${type} brief...`);

  // Financial pulse from snapshot
  const financialContent = snapshotData
    ? {
        business_balance: snapshotData.business_balance,
        business_available: snapshotData.business_checking_available,
        stripe_available: snapshotData.stripe_available,
        stripe_pending: snapshotData.stripe_pending,
        mrr: snapshotData.mrr,
        daily_revenue: snapshotData.daily_revenue,
        failed_payments: snapshotData.failed_payments_count,
      }
    : { note: "No financial snapshot available" };

  // Client status
  const { data: clientIssues } = await supabase
    .from("neon_rabbit_clients")
    .select("name, payment_status, stripe_customer_id")
    .neq("payment_status", "current")
    .neq("payment_status", "free")
    .neq("payment_status", "unknown");

  const { count: totalClients } = await supabase
    .from("neon_rabbit_clients")
    .select("*", { count: "exact", head: true });

  // Maintenance flags
  const { data: maintenanceItems } = await supabase
    .from("maintenance_items")
    .select("name, next_due, status")
    .lte("next_due", today)
    .neq("status", "complete");

  // Queue top 3
  const { data: queueItems } = await supabase
    .from("queue_items")
    .select("title, priority, status")
    .neq("status", "done")
    .order("priority", { ascending: true })
    .limit(3);

  const sections = [
    {
      title: "Financial Pulse",
      content: financialContent,
      source: "financial_snapshots",
    },
    {
      title: "Client Status",
      content: {
        total_clients: totalClients ?? 0,
        issues: (clientIssues ?? []).map((c) => ({
          name: c.name,
          status: c.payment_status,
        })),
      },
      source: "neon_rabbit_clients",
    },
    {
      title: "Maintenance Flags",
      content: {
        items: (maintenanceItems ?? []).map((m) => ({
          name: m.name,
          due: m.next_due,
          status: m.status,
        })),
      },
      source: "maintenance_items",
    },
    {
      title: "Queue",
      content: {
        items: (queueItems ?? []).map((q) => ({
          title: q.title,
          priority: q.priority,
        })),
      },
      source: "queue_items",
    },
  ];

  const { error } = await supabase.from("briefs").upsert(
    {
      date: today,
      type,
      sections,
      generated_at: new Date().toISOString(),
      user_id: OWNER_UUID,
    },
    { onConflict: "date,type,user_id" }
  );

  if (error) {
    log("brief", `Failed to write brief: ${error.message}`);
    throw error;
  }

  log("brief", `${type} brief written`);
}

// ─── Main Handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // Auth check
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${SYNC_SECRET}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { type } = (await req.json()) as { type: "morning" | "evening" };
  if (type !== "morning" && type !== "evening") {
    return new Response(
      JSON.stringify({ error: 'Invalid type — must be "morning" or "evening"' }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { today, yesterdayStartEpoch, yesterdayEndEpoch } = getTodayAndYesterdayNY();
  log("main", `Starting ${type} run for ${today}`);

  // Concurrent run protection
  const { data: existing } = await supabase
    .from("financial_snapshots")
    .select("sync_status")
    .eq("snapshot_date", today)
    .maybeSingle();

  if (existing?.sync_status === "running") {
    return new Response(
      JSON.stringify({ error: "Sync already in progress" }),
      { status: 409, headers: { "Content-Type": "application/json" } }
    );
  }

  let syncStatus = "complete";
  let stripeResult: StripeResult | null = null;
  let plaidResult: PlaidResult | null = null;

  if (type === "morning") {
    // Mark as running
    await supabase.from("financial_snapshots").upsert(
      { snapshot_date: today, sync_status: "running", user_id: OWNER_UUID },
      { onConflict: "snapshot_date" }
    );

    // Step 1 & 2: Stripe
    try {
      stripeResult = await runStripe(yesterdayStartEpoch, yesterdayEndEpoch);
    } catch (err) {
      log("stripe", `FAILED: ${(err as Error).message}`);
      syncStatus = "partial_stripe_fail";
    }

    // Step 3: Plaid
    try {
      plaidResult = await runPlaid();
    } catch (err) {
      log("plaid", `FAILED: ${(err as Error).message}`);
      syncStatus = syncStatus === "partial_stripe_fail" ? "failed" : "partial_plaid_fail";
    }

    // Step 4: Write to Supabase
    try {
      // Upsert financial snapshot
      const snapshotRow: Record<string, unknown> = {
        snapshot_date: today,
        sync_status: syncStatus,
        user_id: OWNER_UUID,
      };

      if (stripeResult) {
        snapshotRow.stripe_available = stripeResult.stripeAvailable;
        snapshotRow.stripe_pending = stripeResult.stripePending;
        snapshotRow.mrr = stripeResult.mrr;
        snapshotRow.subscription_count = stripeResult.subscriptionCount;
        snapshotRow.daily_revenue = stripeResult.dailyRevenue;
        snapshotRow.daily_stripe_fees = stripeResult.dailyStripeFees;
        snapshotRow.daily_one_time_revenue = stripeResult.dailyOneTimeRevenue;
        snapshotRow.failed_payments_count = stripeResult.failedPaymentsCount;
      }

      if (plaidResult) {
        snapshotRow.business_balance = plaidResult.businessBalance;
        snapshotRow.business_checking_available = plaidResult.businessCheckingAvailable;
      }

      await supabase
        .from("financial_snapshots")
        .upsert(snapshotRow, { onConflict: "snapshot_date" });

      // Upsert bank transactions
      if (plaidResult) {
        const allTxns = [
          ...plaidResult.addedTransactions,
          ...plaidResult.modifiedTransactions,
        ];
        if (allTxns.length > 0) {
          const rows = allTxns.map((t) => ({
            plaid_transaction_id: t.transaction_id as string,
            plaid_account_id: t.account_id as string,
            date: t.date as string,
            name: t.name as string || t.merchant_name as string || "Unknown",
            amount: t.amount as number,
            category: t.category as string[] || [],
            pending: t.pending as boolean || false,
            user_id: OWNER_UUID,
          }));

          const { error: txnError } = await supabase
            .from("bank_transactions")
            .upsert(rows, { onConflict: "plaid_transaction_id" });
          if (txnError) log("write", `Transaction upsert error: ${txnError.message}`);
        }

        // Remove deleted transactions
        if (plaidResult.removedTransactionIds.length > 0) {
          await supabase
            .from("bank_transactions")
            .delete()
            .in("plaid_transaction_id", plaidResult.removedTransactionIds);
        }
      }

      // Update neon_rabbit_clients from Stripe data (only those with stripe_customer_id)
      if (stripeResult) {
        for (const sub of stripeResult.activeSubscriptions) {
          const items = sub.items as { data: { price: { nickname?: string; id: string } }[] };
          const planName = items?.data?.[0]?.price?.nickname || items?.data?.[0]?.price?.id || null;
          const periodEnd = sub.current_period_end as number;

          await supabase
            .from("neon_rabbit_clients")
            .update({
              payment_status: "current",
              current_plan: planName,
              next_charge_date: new Date(periodEnd * 1000)
                .toISOString()
                .split("T")[0],
            })
            .eq("stripe_customer_id", sub.customer as string)
            .not("stripe_customer_id", "is", null);
        }

        for (const sub of stripeResult.pastDueSubscriptions) {
          await supabase
            .from("neon_rabbit_clients")
            .update({ payment_status: "past_due" })
            .eq("stripe_customer_id", sub.customer as string)
            .not("stripe_customer_id", "is", null);
        }
      }

      // Update Plaid cursor LAST (after all writes succeed)
      if (plaidResult) {
        await supabase
          .from("plaid_sync_state")
          .update({
            cursor: plaidResult.newCursor,
            updated_at: new Date().toISOString(),
          })
          .limit(1);
      }

      log("write", "All writes complete");
    } catch (err) {
      log("write", `Write error: ${(err as Error).message}`);
      syncStatus = "failed";
      await supabase
        .from("financial_snapshots")
        .update({ sync_status: "failed" })
        .eq("snapshot_date", today);
    }

    // Step 5: Cleanup old transactions
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      await supabase
        .from("bank_transactions")
        .delete()
        .lt("date", ninetyDaysAgo.toISOString().split("T")[0]);
    } catch (err) {
      log("cleanup", `Cleanup error: ${(err as Error).message}`);
    }
  }

  // Generate brief (both morning and evening)
  try {
    const { data: latestSnapshot } = await supabase
      .from("financial_snapshots")
      .select("*")
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    await generateBrief(type, today, latestSnapshot);
  } catch (err) {
    log("brief", `Brief generation error: ${(err as Error).message}`);
  }

  // Final status update
  if (type === "morning") {
    await supabase
      .from("financial_snapshots")
      .update({ sync_status: syncStatus })
      .eq("snapshot_date", today);
  }

  log("main", `${type} run complete — status: ${syncStatus}`);

  return new Response(
    JSON.stringify({ status: syncStatus, type, date: today }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
