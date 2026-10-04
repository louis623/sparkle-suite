import {
  finderCollectorIntakeRpc,
  finderPayReminderTable,
  finderSilverTrialSettlementRpc,
  settleExpiredSilverTrial,
  type CollectorIntakeRecord,
  type FinderPayReminder,
  type FinderStoredAccessState,
  type FinderStoredMembership,
} from "@/lib/sparkle-finder/collector-intake";

export const finderCollectorIntakeTable = "sparkle_finder_collector_intakes";
export { finderPayReminderTable };

type QueryError = { message: string } | null;

type IntakeWriteClient = {
  rpc?: (fn: string, args?: Record<string, unknown>) => Promise<{ data?: unknown; error: QueryError }>;
  from?: (table: string) => {
    upsert?: (row: Record<string, unknown>) => Promise<{ error: QueryError }>;
    update?: (row: Record<string, unknown>) => {
      eq: (column: string, value: string) => Promise<{ error: QueryError }>;
    };
    insert?: (row: Record<string, unknown>) => Promise<{ error: QueryError }>;
    select?: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: QueryError }>;
      };
    };
  };
};

type StoredMembershipRow = {
  access_state: FinderStoredAccessState | null;
  silver_source: FinderStoredMembership["silverSource"] | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
};

export async function persistCompletedCollectorIntake(
  client: IntakeWriteClient,
  record: CollectorIntakeRecord,
  membership: FinderStoredMembership,
): Promise<void> {
  if (client.rpc) {
    const result = await client.rpc(finderCollectorIntakeRpc, toIntakeRpcArgs(record, true));

    if (result.error) {
      throw new Error(result.error.message);
    }

    return;
  }

  await writeIntakeRow(client, record);
  await writeMembership(client, record.userId, membership);
}

export async function persistCollectorIntakeEdit(client: IntakeWriteClient, record: CollectorIntakeRecord): Promise<void> {
  if (client.rpc) {
    const result = await client.rpc(finderCollectorIntakeRpc, toIntakeRpcArgs(record, false));

    if (result.error) {
      throw new Error(result.error.message);
    }

    return;
  }

  await writeIntakeRow(client, record);
}

export async function persistExpiredSilverTrial(
  client: IntakeWriteClient,
  membership: FinderStoredMembership,
  reminder: FinderPayReminder,
): Promise<boolean> {
  try {
    if (client.rpc) {
      const result = await client.rpc(finderSilverTrialSettlementRpc, {});

      return !result.error && result.data === true;
    }

    if (!client.from) {
      return false;
    }

    const memberships = client.from("sparkle_finder_memberships");
    const reminders = client.from(finderPayReminderTable);

    if (!memberships.update || !reminders.insert) {
      return false;
    }

    const membershipResult = await memberships.update(toMembershipRow(membership)).eq("user_id", reminder.userId);

    if (membershipResult.error) {
      throw new Error(membershipResult.error.message);
    }

    const reminderResult = await reminders.insert({
      user_id: reminder.userId,
      amount_cents: reminder.amountCents,
      reminder_interval: reminder.interval,
      message: reminder.message,
      sent_at: reminder.sentAt,
    });

    if (reminderResult.error) {
      throw new Error(reminderResult.error.message);
    }

    return true;
  } catch {
    return false;
  }
}

export async function applyStoredSilverTrialSettlement<T extends StoredMembershipRow>(
  client: IntakeWriteClient,
  userId: string,
  membership: T | null,
  now = new Date(),
): Promise<T | null> {
  if (!membership || membership.access_state !== "silver_trial") {
    return membership;
  }

  const settled = settleExpiredSilverTrial({
    membership: {
      accessState: membership.access_state,
      silverSource: membership.silver_source ?? "none",
      trialStartedAt: membership.trial_started_at,
      trialEndsAt: membership.trial_ends_at,
    },
    now,
    userId,
  });

  if (!settled.changed || !settled.payReminder) {
    return membership;
  }

  const stored = await persistExpiredSilverTrial(client, settled.membership, settled.payReminder);

  if (!stored) {
    return membership;
  }

  return {
    ...membership,
    access_state: "free",
    silver_source: "none",
  };
}

export async function readCollectorIntake(client: IntakeWriteClient, userId: string): Promise<CollectorIntakeRecord | null> {
  if (!client.from) {
    return null;
  }

  try {
    const intake = client.from(finderCollectorIntakeTable);

    if (!intake.select) {
      return null;
    }

    const result = await intake.select("*").eq("user_id", userId).maybeSingle();

    if (result.error || !result.data) {
      return null;
    }

    return fromIntakeRow(result.data);
  } catch {
    return null;
  }
}

export function toIntakeRow(record: CollectorIntakeRecord): Record<string, unknown> {
  return {
    user_id: record.userId,
    first_name: record.firstName,
    last_name: record.lastName,
    email: record.email,
    phone: record.phone,
    state: record.state,
    birthday_month: record.birthdayMonth,
    birthday_day: record.birthdayDay,
    favorite_stone: record.favoriteStone,
    cut: record.cut,
    finish: record.finish,
    ring_size: record.ringSize,
    jewelry_notes: record.jewelryNotes,
    user_agreement_accepted_at: record.userAgreementAcceptedAt,
    privacy_accepted_at: record.privacyAcceptedAt,
    completed_at: record.completedAt,
  };
}

export function fromIntakeRow(row: Record<string, unknown>): CollectorIntakeRecord {
  return {
    userId: String(row.user_id ?? ""),
    firstName: String(row.first_name ?? ""),
    lastName: String(row.last_name ?? ""),
    email: String(row.email ?? ""),
    phone: String(row.phone ?? ""),
    state: String(row.state ?? ""),
    birthdayMonth: Number(row.birthday_month),
    birthdayDay: Number(row.birthday_day),
    favoriteStone: String(row.favorite_stone ?? ""),
    cut: String(row.cut ?? ""),
    finish: String(row.finish ?? ""),
    ringSize: String(row.ring_size ?? ""),
    jewelryNotes: String(row.jewelry_notes ?? ""),
    userAgreementAcceptedAt: String(row.user_agreement_accepted_at ?? ""),
    privacyAcceptedAt: String(row.privacy_accepted_at ?? ""),
    completedAt: String(row.completed_at ?? ""),
  };
}

async function writeIntakeRow(client: IntakeWriteClient, record: CollectorIntakeRecord): Promise<void> {
  if (!client.from) {
    return;
  }

  const intake = client.from(finderCollectorIntakeTable);

  if (!intake.upsert) {
    return;
  }

  const intakeResult = await intake.upsert(toIntakeRow(record));

  if (intakeResult.error) {
    throw new Error(intakeResult.error.message);
  }
}

async function writeMembership(client: IntakeWriteClient, userId: string, membership: FinderStoredMembership): Promise<void> {
  if (!client.from) {
    return;
  }

  const memberships = client.from("sparkle_finder_memberships");

  if (!memberships.update) {
    return;
  }

  const membershipResult = await memberships.update(toMembershipRow(membership)).eq("user_id", userId);

  if (membershipResult.error) {
    throw new Error(membershipResult.error.message);
  }
}

function toIntakeRpcArgs(record: CollectorIntakeRecord, startTrial: boolean): Record<string, unknown> {
  return {
    p_first_name: record.firstName,
    p_last_name: record.lastName,
    p_email: record.email,
    p_phone: record.phone,
    p_state: record.state,
    p_birthday_month: record.birthdayMonth,
    p_birthday_day: record.birthdayDay,
    p_favorite_stone: record.favoriteStone,
    p_cut: record.cut,
    p_finish: record.finish,
    p_ring_size: record.ringSize,
    p_jewelry_notes: record.jewelryNotes,
    p_user_agreement_accepted_at: record.userAgreementAcceptedAt,
    p_privacy_accepted_at: record.privacyAcceptedAt,
    p_completed_at: record.completedAt,
    p_start_trial: startTrial,
  };
}

function toMembershipRow(membership: FinderStoredMembership): Record<string, unknown> {
  return {
    access_state: membership.accessState,
    silver_source: membership.silverSource,
    trial_started_at: membership.trialStartedAt,
    trial_ends_at: membership.trialEndsAt,
  };
}
