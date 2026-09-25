/**
 * LOC Overview projected monthly revenue for Suite:
 * use liveProjectedRecurringCents first, then snapshot.projectedRecurringCents.
 * Do not use the customer-profile projection (priced monthlyAmount on reps)
 * as the money tile. That path under-reports clients missing a monthly amount.
 */

export type LiveProjectedRecurringSource = "stripe" | null;

export type MonthlyRecurringPrice = {
  unitAmount: number | null;
  currency?: string | null;
  interval?: string | null;
  intervalCount?: number | null;
  usageType?: string | null;
};

export type MonthlyRecurringSubscriptionItem = {
  quantity?: number | null;
  /** Missing when Stripe did not expand the price. */
  price?: MonthlyRecurringPrice | null;
};

export type MonthlyRecurringSubscription = {
  status?: string | null;
  items?: MonthlyRecurringSubscriptionItem[] | null;
  /** True when Stripe says this subscription has more items than were returned. */
  itemsIncomplete?: boolean;
};

export type LiveProjectedRecurringSum =
  | { ok: true; cents: number }
  | { ok: false };

/**
 * Sum recurring monthly USD unit amounts on active subscriptions.
 * Quantity multiplies the unit amount. Non-monthly, metered, and non-active
 * items are left out. Returns ok:false when an active subscription cannot be
 * priced completely, so callers fall back instead of under-reporting.
 */
export function sumActiveMonthlyRecurringUnitAmountCents(
  subscriptions: MonthlyRecurringSubscription[],
): LiveProjectedRecurringSum {
  let cents = 0;
  for (const subscription of subscriptions) {
    if (subscription.status !== "active") continue;
    if (subscription.itemsIncomplete || !subscription.items) return { ok: false };
    for (const item of subscription.items) {
      const contribution = monthlyUnitAmountCents(item);
      if (contribution === "incomplete") return { ok: false };
      if (contribution === "skip") continue;
      cents += contribution;
    }
  }
  return { ok: true, cents };
}

function monthlyUnitAmountCents(
  item: MonthlyRecurringSubscriptionItem,
): number | "skip" | "incomplete" {
  if (!item.price) return "incomplete";
  const { unitAmount, currency, interval, intervalCount, usageType } = item.price;
  const count = intervalCount ?? 1;
  if (interval !== "month" || count !== 1 || usageType === "metered") return "skip";
  if (currency && currency.toLowerCase() !== "usd") return "incomplete";
  if (typeof unitAmount !== "number" || !Number.isInteger(unitAmount)) {
    return "incomplete";
  }
  const quantity = item.quantity ?? 1;
  if (!Number.isInteger(quantity) || quantity < 1) return "incomplete";
  return unitAmount * quantity;
}

export function preferOverviewProjectedRecurringCents(input: {
  liveProjectedRecurringCents: number | null;
  snapshotProjectedRecurringCents?: number | null;
}): { cents: number | null; source: "stripe" | "snapshot" | null } {
  if (typeof input.liveProjectedRecurringCents === "number") {
    return { cents: input.liveProjectedRecurringCents, source: "stripe" };
  }
  if (typeof input.snapshotProjectedRecurringCents === "number") {
    return { cents: input.snapshotProjectedRecurringCents, source: "snapshot" };
  }
  return { cents: null, source: null };
}
