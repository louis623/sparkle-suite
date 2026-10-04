import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderAccountPageContent } from "../../app/account/page";
import { renderSignUpPageContent } from "../../app/auth/sign-up/page";
import { getCurrentSparkleFinderAccount, type CurrentSparkleFinderAccountState } from "../../lib/sparkle-finder/account-service";
import { finderLearnContent, sparkleProductFooterDisclaimer } from "../../lib/sparkle-finder/learn-page-content";
import {
  completeCollectorIntake,
  finderIntakeFinePrint,
  finderSilverMonthlyPriceCents,
  finderSilverTrialDays,
  membershipCreatedWithAccount,
  suiteRepCollectorRecord,
  settleExpiredSilverTrial,
  updateCollectorIntake,
  validateCollectorIntake,
  type CollectorIntakeInput,
  type CollectorIntakeRecord,
} from "../../lib/sparkle-finder/collector-intake";
import {
  finderCollectorIntakeTable,
  fromIntakeRow,
  persistCollectorIntakeEdit,
  persistCompletedCollectorIntake,
  toIntakeRow,
} from "../../lib/sparkle-finder/collector-intake-store";

const accountCreatedAt = new Date("2026-10-04T11:00:00.000Z");
const formFinishedAt = new Date("2026-10-04T12:00:00.000Z");

describe("Finder collector intake and 30-day trial", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("next/navigation");
    vi.doUnmock("next/cache");
    vi.doUnmock("../../lib/supabase/server");
  });

  it("keeps a new account Free until the intake form is finished", () => {
    const created = membershipCreatedWithAccount();

    expect(created).toEqual({
      accessState: "free",
      silverSource: "none",
      trialStartedAt: null,
      trialEndsAt: null,
    });
    expect(formFinishedAt.getTime()).toBeGreaterThan(accountCreatedAt.getTime());
  });

  it("stores the locked answers with month and day only, and starts Silver at form completion", async () => {
    const writes: Array<{ table: string; op: string; row: Record<string, unknown> }> = [];
    const completed = completeCollectorIntake({
      userId: "user-1",
      intake: sampleIntake(),
      completedAt: formFinishedAt,
    });

    expect(completed.ok).toBe(true);
    if (!completed.ok) {
      return;
    }

    expect(completed.record.birthdayMonth).toBe(2);
    expect(completed.record.birthdayDay).toBe(29);
    expect(completed.record).not.toHaveProperty("birthdayYear");
    expect(completed.membership).toEqual({
      accessState: "silver_trial",
      silverSource: "trial",
      trialStartedAt: formFinishedAt.toISOString(),
      trialEndsAt: new Date(formFinishedAt.getTime() + finderSilverTrialDays * 24 * 60 * 60 * 1000).toISOString(),
    });
    expect(finderSilverTrialDays).toBe(30);
    expect(new Date(completed.membership.trialStartedAt ?? 0).getTime()).toBeGreaterThan(accountCreatedAt.getTime());

    await persistCompletedCollectorIntake(memoryClient(writes), completed.record, completed.membership);

    const intakeRow = writes.find((write) => write.table === finderCollectorIntakeTable && write.op === "upsert")?.row;
    const membershipRow = writes.find((write) => write.table === "sparkle_finder_memberships")?.row;

    expect(intakeRow).toMatchObject({
      user_id: "user-1",
      first_name: "Ada",
      last_name: "Collector",
      email: "ada@example.com",
      phone: "555-0100",
      state: "CO",
      birthday_month: 2,
      birthday_day: 29,
      favorite_stone: "Opal",
      cut: "Round",
      finish: "Rhodium",
      ring_size: "7",
      jewelry_notes: "Stacking bands",
    });
    expect(intakeRow && "birthday_year" in intakeRow).toBe(false);
    expect(Object.keys(intakeRow ?? {})).not.toContain("year");
    expect(membershipRow).toMatchObject({
      access_state: "silver_trial",
      trial_started_at: formFinishedAt.toISOString(),
    });
    expect(suiteRepCollectorRecord(completed.record)).toEqual(completed.record);
    expect(fromIntakeRow(intakeRow ?? {})).toEqual(completed.record);
  });

  it("keeps the original trial when the profile answers change", async () => {
    const writes: Array<{ table: string; op: string; row: Record<string, unknown> }> = [];
    const completed = completeCollectorIntake({
      userId: "user-1",
      intake: sampleIntake(),
      completedAt: formFinishedAt,
    });

    if (!completed.ok) {
      throw new Error("expected a completed intake");
    }

    const edited = updateCollectorIntake({
      record: completed.record,
      intake: { ...sampleIntake(), favoriteStone: "Sapphire", jewelryNotes: "Left hand" },
      editedAt: new Date("2026-10-10T12:00:00.000Z"),
    });

    expect(edited.ok).toBe(true);
    if (!edited.ok) {
      return;
    }

    expect(edited.record.completedAt).toBe(formFinishedAt.toISOString());
    expect(edited.record.favoriteStone).toBe("Sapphire");
    expect(edited.record.userAgreementAcceptedAt).toBe(completed.record.userAgreementAcceptedAt);
    await persistCollectorIntakeEdit(memoryClient(writes), edited.record);

    expect(writes.map((write) => write.table)).toEqual([finderCollectorIntakeTable]);
    expect(writes[0]?.row.completed_at).toBe(formFinishedAt.toISOString());
    expect(suiteRepCollectorRecord(edited.record)).toEqual(edited.record);
  });

  it("turns stored Silver into Free and sends a $6 monthly reminder on day 30", () => {
    const membership = {
      accessState: "silver_trial" as const,
      silverSource: "trial" as const,
      trialStartedAt: formFinishedAt.toISOString(),
      trialEndsAt: new Date(formFinishedAt.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
    const beforeEnd = settleExpiredSilverTrial({
      membership,
      now: new Date(new Date(membership.trialEndsAt).getTime() - 1),
      userId: "user-1",
    });
    const onDay30 = settleExpiredSilverTrial({
      membership,
      now: new Date(membership.trialEndsAt),
      userId: "user-1",
    });

    expect(beforeEnd.changed).toBe(false);
    expect(beforeEnd.payReminder).toBeNull();
    expect(onDay30.changed).toBe(true);
    expect(onDay30.membership.accessState).toBe("free");
    expect(onDay30.membership.silverSource).toBe("none");
    expect(onDay30.membership.trialStartedAt).toBe(membership.trialStartedAt);
    expect(onDay30.payReminder).toMatchObject({
      userId: "user-1",
      amountCents: finderSilverMonthlyPriceCents,
      interval: "month",
      message: "Silver is $6 per month.",
    });
    expect(finderSilverMonthlyPriceCents).toBe(600);
  });

  it("rejects a missing agreement and a birthday that needs a year to be valid", () => {
    expect(validateCollectorIntake({ ...sampleIntake(), userAgreementAccepted: false })).toBe("missing_required_fields");
    expect(validateCollectorIntake({ ...sampleIntake(), privacyAccepted: false })).toBe("missing_required_fields");
    expect(validateCollectorIntake({ ...sampleIntake(), birthdayMonth: 2, birthdayDay: 30 })).toBe("invalid_birthday");
    expect(validateCollectorIntake({ ...sampleIntake(), birthdayMonth: 4, birthdayDay: 31 })).toBe("invalid_birthday");
    expect(validateCollectorIntake(sampleIntake())).toBeNull();
  });

  it("shows the landing look, both agreements, and the Suite-rep fine print without a card", () => {
    const markup = renderToStaticMarkup(renderSignUpPageContent());

    expect(markup).toContain('data-finder-brand="amethyst"');
    expect(markup).toContain(">F<");
    expect(markup).toContain("Finish this form to start 30 days of Silver");
    expect(markup).toContain('name="firstName"');
    expect(markup).toContain('name="lastName"');
    expect(markup).toContain('name="birthdayMonth"');
    expect(markup).toContain('name="birthdayDay"');
    expect(markup).toContain("Month and day only. No year.");
    expect(markup).toContain('name="favoriteStone"');
    expect(markup).toContain('name="cut"');
    expect(markup).toContain('name="finish"');
    expect(markup).toContain('name="ringSize"');
    expect(markup).toContain('name="jewelryNotes"');
    expect(markup).toContain('name="userAgreement"');
    expect(markup).toContain('name="privacyAcknowledged"');
    expect(markup).toContain(finderIntakeFinePrint);
    expect(markup).toContain(sparkleProductFooterDisclaimer);
    expect(markup).not.toMatch(/card number|credit card|cvc|stripe|\$4\.99|45-day|unicorn|limited helper|unlimited chat/i);
    expect(markup.toLowerCase()).not.toContain("vault");
  });

  it("shows the stored answers on the profile for the same Suite rep record", () => {
    const completed = completeCollectorIntake({
      userId: "user-123",
      intake: sampleIntake(),
      completedAt: formFinishedAt,
    });

    if (!completed.ok) {
      throw new Error("expected a completed intake");
    }

    const markup = renderToStaticMarkup(
      renderAccountPageContent(accountState(), undefined, null, suiteRepCollectorRecord(completed.record)),
    );

    expect(markup).toContain('data-suite-rep-record="collector-intake"');
    expect(markup).toContain('value="Ada"');
    expect(markup).toContain('value="Collector"');
    expect(markup).toContain('value="Opal"');
    expect(markup).toContain('value="Round"');
    expect(markup).toContain('value="Rhodium"');
    expect(markup).toContain('value="7"');
    expect(markup).toContain("Stacking bands");
    expect(markup).toContain(finderIntakeFinePrint);
    expect(markup).toContain("A Suite rep sees this same record.");
    expect(markup).toContain("does not restart your Silver trial");
  });

  it("writes the intake and 30-day membership only after password signup returns a user", async () => {
    const writes: Array<{ table: string; op: string; row: Record<string, unknown> }> = [];
    const signUp = vi.fn().mockResolvedValue({ data: { user: { id: "user-9" } }, error: null });
    const redirect = vi.fn((path: string) => {
      throw new Error(`redirect:${path}`);
    });

    vi.doMock("next/navigation", () => ({ redirect }));
    vi.doMock("../../lib/supabase/server", () => ({
      createClient: async () => ({
        auth: { signUp },
        ...memoryClient(writes),
      }),
    }));

    const { signUpWithPassword } = await import("../../app/auth/sign-up/actions");
    const formData = intakeForm();
    formData.set("password", "sparkle-password");
    formData.set("passwordConfirmation", "sparkle-password");

    await expect(signUpWithPassword(formData)).rejects.toThrow("redirect:/auth/sign-in?message=check_email");

    const metadata = signUp.mock.calls[0]?.[0].options.data;
    const membershipWrite = writes.find((write) => write.table === "sparkle_finder_memberships");

    expect(metadata.collector_intake_completed_at).toBe(membershipWrite?.row.trial_started_at);
    expect(membershipWrite?.row.access_state).toBe("silver_trial");
    expect(membershipWrite?.row.trial_ends_at).toBe(
      new Date(new Date(metadata.collector_intake_completed_at).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    );
    expect(signUp.mock.calls[0]?.[0]).not.toHaveProperty("access_state");
    expect(writes.some((write) => write.table === finderCollectorIntakeTable && write.row.user_id === "user-9")).toBe(true);
  });

  it("saves a profile edit without starting the trial over", async () => {
    const writes: Array<{ table: string; op: string; row: Record<string, unknown> }> = [];
    const redirect = vi.fn((path: string) => {
      throw new Error(`redirect:${path}`);
    });
    const existing = toIntakeRow(savedRecord());

    vi.doMock("next/navigation", () => ({ redirect }));
    vi.doMock("next/cache", () => ({ revalidatePath: vi.fn() }));
    vi.doMock("../../lib/supabase/server", () => ({
      createClient: async () => ({
        auth: {
          getUser: async () => ({ data: { user: { id: "user-1", email: "ada@example.com" } }, error: null }),
        },
        from(table: string) {
          return {
            ...memoryClient(writes).from(table),
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: table === finderCollectorIntakeTable ? existing : null,
                  error: null,
                }),
              }),
            }),
          };
        },
      }),
    }));

    const { updateCollectorIntakeAnswers } = await import("../../app/account/actions");
    const formData = intakeForm();
    formData.set("favoriteStone", "Sapphire");

    await expect(updateCollectorIntakeAnswers(formData)).rejects.toThrow("redirect:/account?message=intake_saved");
    expect(writes.some((write) => write.table === "sparkle_finder_memberships")).toBe(false);
    expect(writes.find((write) => write.op === "upsert")?.row).toMatchObject({
      favorite_stone: "Sapphire",
      completed_at: formFinishedAt.toISOString(),
      birthday_month: 2,
      birthday_day: 29,
    });
  });

  it("stores Free in the account row and sends the pay reminder when day 30 has arrived", async () => {
    const updates: Array<Record<string, unknown>> = [];
    const inserts: Array<Record<string, unknown>> = [];
    const account = await getCurrentSparkleFinderAccount({
      isSupabaseConfigured: () => true,
      createSupabaseClient: async () => writableAccountClient(updates, inserts, "2026-08-31T00:00:00.000Z"),
    });

    expect(updates[0]).toMatchObject({ access_state: "free", silver_source: "none" });
    expect(inserts[0]).toMatchObject({ amount_cents: 600, reminder_interval: "month", message: "Silver is $6 per month." });
    expect(account.membership?.accessState).toBe("free");
    expect(account.tier).toBe("free");
  });

  it("leaves an active stored trial alone before day 30", async () => {
    const updates: Array<Record<string, unknown>> = [];
    const inserts: Array<Record<string, unknown>> = [];
    const account = await getCurrentSparkleFinderAccount({
      isSupabaseConfigured: () => true,
      createSupabaseClient: async () => writableAccountClient(updates, inserts, "2026-12-01T00:00:00.000Z"),
    });

    expect(updates).toEqual([]);
    expect(inserts).toEqual([]);
    expect(account.membership?.accessState).toBe("silver_trial");
  });

  it("keeps learn copy, the footer disclaimer, and the live launch-notify insert", () => {
    expect(finderLearnContent.offers.silver.includes).toEqual([
      "Save the pieces you love to your collection",
      "Nic-Nac is your collection curator and jewelry finder assistant",
    ]);
    expect(finderLearnContent.offers.free.includes).toEqual([
      "Look through BP rep listings",
      "Follow your favorite reps",
      "Window shop their virtual dance floors",
      "See when their next show times and dates are",
    ]);
    expect(sparkleProductFooterDisclaimer).toBe(
      "Sparkle Suite is an independent tool for Reps and Collectors. We are not affiliated with, endorsed by, sponsored by, or officially connected to Bomb Party.",
    );

    const launchNotify = readFileSync("app/api/finder/launch-notify/route.ts", "utf8");
    const migration = readFileSync("supabase/migrations/20261004121500_sparkle_finder_collector_intake_trial.sql", "utf8");

    expect(launchNotify).toContain("createLiveFinderLaunchNotifyClient");
    expect(launchNotify).toContain(".insert(parsed.row)");
    expect(migration).toContain("else 'free'");
    expect(migration).toContain("interval '30 days'");
    expect(migration).toContain("intake_completed_at");
    expect(migration).not.toContain("45 days");
    expect(migration).not.toContain("from auth.users");
    expect(migration).not.toContain("birthday_year");
    expect(migration).toContain("amount_cents = 600");
    expect(migration).not.toMatch(/stripe/i);
  });
});

function sampleIntake(): CollectorIntakeInput {
  return {
    firstName: "Ada",
    lastName: "Collector",
    email: "ada@example.com",
    phone: "555-0100",
    state: "CO",
    birthdayMonth: 2,
    birthdayDay: 29,
    favoriteStone: "Opal",
    cut: "Round",
    finish: "Rhodium",
    ringSize: "7",
    jewelryNotes: "Stacking bands",
    userAgreementAccepted: true,
    privacyAccepted: true,
  };
}

function intakeForm() {
  const formData = new FormData();
  const intake = sampleIntake();

  formData.set("firstName", intake.firstName);
  formData.set("lastName", intake.lastName);
  formData.set("email", intake.email);
  formData.set("phone", intake.phone);
  formData.set("state", intake.state);
  formData.set("birthdayMonth", String(intake.birthdayMonth));
  formData.set("birthdayDay", String(intake.birthdayDay));
  formData.set("favoriteStone", intake.favoriteStone);
  formData.set("cut", intake.cut);
  formData.set("finish", intake.finish);
  formData.set("ringSize", intake.ringSize);
  formData.set("jewelryNotes", intake.jewelryNotes);
  formData.set("userAgreement", "yes");
  formData.set("privacyAcknowledged", "yes");

  return formData;
}

function savedRecord(): CollectorIntakeRecord {
  const completed = completeCollectorIntake({
    userId: "user-1",
    intake: sampleIntake(),
    completedAt: formFinishedAt,
  });

  if (!completed.ok) {
    throw new Error("expected a completed intake");
  }

  return completed.record;
}

function memoryClient(writes: Array<{ table: string; op: string; row: Record<string, unknown> }>) {
  return {
    from(table: string) {
      return {
        upsert: async (row: Record<string, unknown>) => {
          writes.push({ table, op: "upsert", row });
          return { error: null };
        },
        update: (row: Record<string, unknown>) => ({
          eq: async () => {
            writes.push({ table, op: "update", row });
            return { error: null };
          },
        }),
        insert: async (row: Record<string, unknown>) => {
          writes.push({ table, op: "insert", row });
          return { error: null };
        },
      };
    },
  };
}

function accountState(): CurrentSparkleFinderAccountState {
  return {
    status: "authenticated",
    tier: "silver",
    displayName: "Ada Collector",
    email: "ada@example.com",
    customer: {
      id: "user-123",
      displayName: "Ada Collector",
      email: "ada@example.com",
      state: "CO",
      tier: "silver",
    },
    communicationConsent: {
      accountEmailRequired: true,
      accountSmsAllowed: false,
      promotionalEmailOptIn: false,
      promotionalSmsOptIn: false,
      accountSmsConsentedAt: null,
      promotionalEmailConsentedAt: null,
      promotionalSmsConsentedAt: null,
      privacyAcknowledgedAt: formFinishedAt.toISOString(),
    },
  };
}

function writableAccountClient(
  updates: Array<Record<string, unknown>>,
  inserts: Array<Record<string, unknown>>,
  trialEndsAt: string,
) {
  const membership = {
    user_id: "user-1",
    access_state: "silver_trial",
    silver_source: "trial",
    trial_started_at: "2026-08-01T00:00:00.000Z",
    trial_ends_at: trialEndsAt,
    silver_started_at: "2026-08-01T00:00:00.000Z",
    silver_ends_at: trialEndsAt,
  };

  return {
    auth: {
      getUser: async () => ({ data: { user: { id: "user-1", email: "ada@example.com" } }, error: null }),
    },
    from(table: string) {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data:
                table === "sparkle_finder_memberships"
                  ? membership
                  : table === "sparkle_finder_profiles"
                    ? { user_id: "user-1", display_name: "Ada", email: "ada@example.com", state: "CO" }
                    : null,
              error: null,
            }),
          }),
        }),
        update: (row: Record<string, unknown>) => ({
          eq: async () => {
            updates.push(row);
            return { error: null };
          },
        }),
        insert: async (row: Record<string, unknown>) => {
          inserts.push(row);
          return { error: null };
        },
      };
    },
  };
}
