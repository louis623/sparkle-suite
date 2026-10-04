export const finderSilverTrialDays = 30;
export const finderSilverMonthlyPriceCents = 600;
export const finderCollectorIntakeRpc = "complete_sparkle_finder_collector_intake";
export const finderSilverTrialSettlementRpc = "settle_sparkle_finder_expired_silver_trial";
export const finderPayReminderTable = "sparkle_finder_pay_reminders";

export const finderIntakeFinePrint =
  "This information is for Suite reps only. It stays on your own profile and is used for Finder recommendations. Nobody else.";

export const finderSilverPayReminderMessage = "Silver is $6 per month.";

const dayCountByMonth = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export type FinderStoredAccessState = "free" | "silver_trial" | "silver_paid" | "silver_rep_included";

export type FinderStoredMembership = {
  accessState: FinderStoredAccessState;
  silverSource: "none" | "trial" | "stripe" | "sparkle_suite_rep" | "manual";
  trialStartedAt: string | null;
  trialEndsAt: string | null;
};

export type CollectorIntakeInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  state: string;
  birthdayMonth: number;
  birthdayDay: number;
  favoriteStone: string;
  cut: string;
  finish: string;
  ringSize: string;
  jewelryNotes: string;
  userAgreementAccepted: boolean;
  privacyAccepted: boolean;
};

export type CollectorIntakeRecord = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  state: string;
  birthdayMonth: number;
  birthdayDay: number;
  favoriteStone: string;
  cut: string;
  finish: string;
  ringSize: string;
  jewelryNotes: string;
  userAgreementAcceptedAt: string;
  privacyAcceptedAt: string;
  completedAt: string;
};

export type FinderPayReminder = {
  userId: string;
  amountCents: number;
  interval: "month";
  message: string;
  sentAt: string;
};

export type CollectorIntakeFailure = "missing_required_fields" | "invalid_birthday";

export function membershipCreatedWithAccount(): FinderStoredMembership {
  return {
    accessState: "free",
    silverSource: "none",
    trialStartedAt: null,
    trialEndsAt: null,
  };
}

export function parseCollectorIntake(formData: FormData): CollectorIntakeInput {
  return {
    firstName: readText(formData, "firstName"),
    lastName: readText(formData, "lastName"),
    email: readText(formData, "email"),
    phone: readText(formData, "phone"),
    state: readText(formData, "state"),
    birthdayMonth: readNumber(formData, "birthdayMonth"),
    birthdayDay: readNumber(formData, "birthdayDay"),
    favoriteStone: readText(formData, "favoriteStone"),
    cut: readText(formData, "cut"),
    finish: readText(formData, "finish"),
    ringSize: readText(formData, "ringSize"),
    jewelryNotes: readText(formData, "jewelryNotes"),
    userAgreementAccepted: formData.get("userAgreement") === "yes",
    privacyAccepted: formData.get("privacyAcknowledged") === "yes",
  };
}

export function validateCollectorIntake(input: CollectorIntakeInput): CollectorIntakeFailure | null {
  if (!hasRequiredText(input) || !input.userAgreementAccepted || !input.privacyAccepted) {
    return "missing_required_fields";
  }

  if (!isBirthdayMonthAndDay(input.birthdayMonth, input.birthdayDay)) {
    return "invalid_birthday";
  }

  return null;
}

export function completeCollectorIntake(input: {
  userId: string;
  intake: CollectorIntakeInput;
  completedAt: Date;
}): { ok: true; record: CollectorIntakeRecord; membership: FinderStoredMembership } | { ok: false; reason: CollectorIntakeFailure } {
  const reason = validateCollectorIntake(input.intake);

  if (reason) {
    return { ok: false, reason };
  }

  const completedAt = input.completedAt.toISOString();
  const intake = input.intake;

  return {
    ok: true,
    record: {
      userId: input.userId,
      firstName: intake.firstName,
      lastName: intake.lastName,
      email: intake.email,
      phone: intake.phone,
      state: intake.state,
      birthdayMonth: intake.birthdayMonth,
      birthdayDay: intake.birthdayDay,
      favoriteStone: intake.favoriteStone,
      cut: intake.cut,
      finish: intake.finish,
      ringSize: intake.ringSize,
      jewelryNotes: intake.jewelryNotes,
      userAgreementAcceptedAt: completedAt,
      privacyAcceptedAt: completedAt,
      completedAt,
    },
    membership: startSilverTrial(input.completedAt),
  };
}

export function updateCollectorIntake(input: {
  record: CollectorIntakeRecord;
  intake: CollectorIntakeInput;
  editedAt: Date;
}): { ok: true; record: CollectorIntakeRecord } | { ok: false; reason: CollectorIntakeFailure } {
  const completed = completeCollectorIntake({
    userId: input.record.userId,
    intake: input.intake,
    completedAt: input.editedAt,
  });

  if (!completed.ok) {
    return completed;
  }

  return {
    ok: true,
    record: {
      ...completed.record,
      completedAt: input.record.completedAt,
      userAgreementAcceptedAt: input.record.userAgreementAcceptedAt,
      privacyAcceptedAt: input.record.privacyAcceptedAt,
    },
  };
}

export function suiteRepCollectorRecord(record: CollectorIntakeRecord): CollectorIntakeRecord {
  return { ...record };
}

export function settleExpiredSilverTrial(input: {
  membership: FinderStoredMembership;
  now: Date;
  userId: string;
}): { membership: FinderStoredMembership; payReminder: FinderPayReminder | null; changed: boolean } {
  const { membership, now, userId } = input;

  if (membership.accessState !== "silver_trial" || !membership.trialEndsAt) {
    return { membership, payReminder: null, changed: false };
  }

  if (now.getTime() < new Date(membership.trialEndsAt).getTime()) {
    return { membership, payReminder: null, changed: false };
  }

  return {
    changed: true,
    membership: {
      ...membership,
      accessState: "free",
      silverSource: "none",
    },
    payReminder: {
      userId,
      amountCents: finderSilverMonthlyPriceCents,
      interval: "month",
      message: finderSilverPayReminderMessage,
      sentAt: now.toISOString(),
    },
  };
}

export function startSilverTrial(completedAt: Date): FinderStoredMembership {
  return {
    accessState: "silver_trial",
    silverSource: "trial",
    trialStartedAt: completedAt.toISOString(),
    trialEndsAt: new Date(completedAt.getTime() + finderSilverTrialDays * 24 * 60 * 60 * 1000).toISOString(),
  };
}

function hasRequiredText(input: CollectorIntakeInput): boolean {
  return [
    input.firstName,
    input.lastName,
    input.email,
    input.phone,
    input.state,
    input.favoriteStone,
    input.cut,
    input.finish,
    input.ringSize,
  ].every((value) => value.length > 0);
}

function isBirthdayMonthAndDay(month: number, day: number): boolean {
  const maxDay = dayCountByMonth[month];

  return Number.isInteger(month) && Number.isInteger(day) && maxDay !== undefined && day >= 1 && day <= maxDay;
}

function readText(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function readNumber(formData: FormData, name: string): number {
  return Number(readText(formData, name));
}
