import { describe, expect, it, vi } from "vitest";

import {
  preferOverviewProjectedRecurringCents,
  sumActiveMonthlyRecurringUnitAmountCents,
  type MonthlyRecurringSubscription,
} from "@/lib/control-center/live-projected-recurring";

const { list, stripeEnabled } = vi.hoisted(() => ({
  list: vi.fn(),
  stripeEnabled: vi.fn(() => true),
}));

vi.mock("@/lib/stripe/client", () => ({
  getStripe: () => ({ subscriptions: { list } }),
}));

vi.mock("@/lib/stripe/config", () => ({
  isStripeEnabled: () => stripeEnabled(),
}));

function monthly(
  unitAmount: number | null,
  overrides: Partial<NonNullable<MonthlyRecurringSubscription["items"]>[number]["price"]> = {},
  quantity = 1,
): NonNullable<MonthlyRecurringSubscription["items"]>[number] {
  return {
    quantity,
    price: {
      unitAmount,
      currency: "usd",
      interval: "month",
      intervalCount: 1,
      usageType: "licensed",
      ...overrides,
    },
  };
}

function active(
  items: NonNullable<MonthlyRecurringSubscription["items"]>,
  extra: Partial<MonthlyRecurringSubscription> = {},
): MonthlyRecurringSubscription {
  return { status: "active", items, ...extra };
}

describe("live Suite projected recurring cents", () => {
  it("sums active monthly unit amounts the way Cheese verified on 2026-09-25", () => {
    const sum = sumActiveMonthlyRecurringUnitAmountCents([
      active([monthly(4999)]),
      active([monthly(4999)]),
      active([monthly(3900)]),
      active([monthly(3900)]),
      active([monthly(3900)]),
      active([monthly(100)], { status: "trialing" }),
      active([monthly(7400, { interval: "year", intervalCount: 1 })]),
      { status: "past_due", items: [monthly(3900)] },
    ]);
    expect(sum).toEqual({ ok: true, cents: 21698 });
  });

  it("multiplies quantity and ignores one-time and metered items", () => {
    const sum = sumActiveMonthlyRecurringUnitAmountCents([
      active([
        monthly(3900, {}, 2),
        monthly(4999, { interval: undefined, usageType: undefined }),
        monthly(100, { usageType: "metered" }),
      ]),
    ]);
    expect(sum).toEqual({ ok: true, cents: 7800 });
  });

  it("refuses a partial sum when an active monthly price is missing", () => {
    expect(
      sumActiveMonthlyRecurringUnitAmountCents([
        active([monthly(4999)]),
        active([{ quantity: 1, price: null }]),
      ]),
    ).toEqual({ ok: false });
    expect(
      sumActiveMonthlyRecurringUnitAmountCents([
        active([monthly(3900)], { itemsIncomplete: true }),
      ]),
    ).toEqual({ ok: false });
  });

  it("prefers live Stripe cents, then the Lane snapshot, and never the profile projection", () => {
    expect(
      preferOverviewProjectedRecurringCents({
        liveProjectedRecurringCents: 21698,
        snapshotProjectedRecurringCents: 100,
      }),
    ).toEqual({ cents: 21698, source: "stripe" });
    expect(
      preferOverviewProjectedRecurringCents({
        liveProjectedRecurringCents: null,
        snapshotProjectedRecurringCents: 21698,
      }),
    ).toEqual({ cents: 21698, source: "snapshot" });
    expect(
      preferOverviewProjectedRecurringCents({
        liveProjectedRecurringCents: 0,
        snapshotProjectedRecurringCents: 21698,
      }),
    ).toEqual({ cents: 0, source: "stripe" });
    expect(
      preferOverviewProjectedRecurringCents({
        liveProjectedRecurringCents: null,
        snapshotProjectedRecurringCents: null,
      }),
    ).toEqual({ cents: null, source: null });
  });
});

describe("loadLiveSuiteProjectedRecurring", () => {
  it("returns null when Stripe is disconnected or the read fails", async () => {
    const { loadLiveSuiteProjectedRecurring } = await import(
      "@/lib/control-center/load-live-suite-projected-recurring"
    );
    stripeEnabled.mockReturnValue(false);
    expect(await loadLiveSuiteProjectedRecurring()).toEqual({
      liveProjectedRecurringCents: null,
      liveProjectedRecurringSource: null,
    });

    stripeEnabled.mockReturnValue(true);
    list.mockRejectedValueOnce(new Error("stripe down"));
    expect(await loadLiveSuiteProjectedRecurring()).toEqual({
      liveProjectedRecurringCents: null,
      liveProjectedRecurringSource: null,
    });
    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({ status: "active", limit: 100 }),
    );
  });

  it("returns the paged active monthly sum in cents", async () => {
    const { loadLiveSuiteProjectedRecurring } = await import(
      "@/lib/control-center/load-live-suite-projected-recurring"
    );
    stripeEnabled.mockReturnValue(true);
    list
      .mockResolvedValueOnce({
        has_more: true,
        data: [
          priceSub("sub_1", 4999),
          priceSub("sub_2", 4999),
        ],
      })
      .mockResolvedValueOnce({
        has_more: false,
        data: [
          priceSub("sub_3", 3900),
          priceSub("sub_4", 3900),
          priceSub("sub_5", 3900),
        ],
      });
    expect(await loadLiveSuiteProjectedRecurring()).toEqual({
      liveProjectedRecurringCents: 21698,
      liveProjectedRecurringSource: "stripe",
    });
  });
});

function priceSub(id: string, unitAmount: number) {
  return {
    id,
    status: "active",
    items: {
      has_more: false,
      data: [
        {
          quantity: 1,
          price: {
            unit_amount: unitAmount,
            currency: "usd",
            recurring: { interval: "month", interval_count: 1, usage_type: "licensed" },
          },
        },
      ],
    },
  };
}
