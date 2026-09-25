import "server-only";

import { getStripe } from "@/lib/stripe/client";
import { isStripeEnabled } from "@/lib/stripe/config";
import {
  sumActiveMonthlyRecurringUnitAmountCents,
  type MonthlyRecurringPrice,
  type MonthlyRecurringSubscription,
} from "@/lib/control-center/live-projected-recurring";

export type LiveSuiteProjectedRecurring = {
  liveProjectedRecurringCents: number | null;
  liveProjectedRecurringSource: "stripe" | null;
};

const unavailable: LiveSuiteProjectedRecurring = {
  liveProjectedRecurringCents: null,
  liveProjectedRecurringSource: null,
};

const PAGE_LIMIT = 100;
const MAX_PAGES = 20;

type StripePrice = {
  deleted?: boolean;
  unit_amount?: number | null;
  currency?: string | null;
  recurring?: {
    interval?: string | null;
    interval_count?: number | null;
    usage_type?: string | null;
  } | null;
};

type StripeSubscription = {
  id: string;
  status: string;
  items?: {
    has_more?: boolean;
    data?: Array<{
      quantity?: number | null;
      price?: string | StripePrice | null;
    }>;
  };
};

/**
 * Read-only sum of active Suite subscription monthly unit amounts.
 * Stripe errors and incomplete reads return null so LOC can use the Lane snapshot.
 */
export async function loadLiveSuiteProjectedRecurring(): Promise<LiveSuiteProjectedRecurring> {
  if (!isStripeEnabled()) return unavailable;
  try {
    const stripe = getStripe();
    const subscriptions: MonthlyRecurringSubscription[] = [];
    let startingAfter: string | undefined;
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const result = await stripe.subscriptions.list({
        status: "active",
        limit: PAGE_LIMIT,
        expand: ["data.items.data.price"],
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });
      const batch = result.data as StripeSubscription[];
      for (const subscription of batch) {
        const mapped = mapSubscription(subscription);
        if (!mapped) return unavailable;
        subscriptions.push(mapped);
      }
      if (!result.has_more) {
        const sum = sumActiveMonthlyRecurringUnitAmountCents(subscriptions);
        if (!sum.ok) return unavailable;
        return {
          liveProjectedRecurringCents: sum.cents,
          liveProjectedRecurringSource: "stripe",
        };
      }
      const last = batch[batch.length - 1];
      if (!last) return unavailable;
      startingAfter = last.id;
    }
    return unavailable;
  } catch (error) {
    console.error(
      "[accounting] live Suite projected recurring unavailable",
      error instanceof Error ? error.message : "stripe read failed",
    );
    return unavailable;
  }
}

function mapSubscription(
  subscription: StripeSubscription,
): MonthlyRecurringSubscription | null {
  const items = subscription.items;
  if (!items?.data) return null;
  return {
    status: subscription.status,
    itemsIncomplete: items.has_more === true,
    items: items.data.map((item) => ({
      quantity: item.quantity,
      price: mapPrice(item.price),
    })),
  };
}

function mapPrice(
  price: string | StripePrice | null | undefined,
): MonthlyRecurringPrice | null {
  if (!price || typeof price === "string" || price.deleted) return null;
  return {
    unitAmount: price.unit_amount ?? null,
    currency: price.currency,
    interval: price.recurring?.interval,
    intervalCount: price.recurring?.interval_count,
    usageType: price.recurring?.usage_type,
  };
}
