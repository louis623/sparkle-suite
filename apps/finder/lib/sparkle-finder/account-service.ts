import { applyStoredSilverTrialSettlement } from "@/lib/sparkle-finder/collector-intake-store";
import { isSupabaseConfigured as defaultIsSupabaseConfigured } from "@/lib/supabase/client";
import { createClient as defaultCreateSupabaseClient } from "@/lib/supabase/server";
import {
  getLocalDevAuthState,
  isLocalPreviewAuthEnabled,
  type SparkleFinderAccountState,
  type SparkleFinderAuthMode,
} from "./auth";
import {
  createDefaultCommunicationConsent,
  getSilverAccessState,
} from "./membership";
import {
  getRepIdentity,
  getSparkleSuiteRepEntitlement,
  hasRepIncludedSilver,
  type SparkleSuiteRepEntitlement,
} from "./rep-entitlements";
import type {
  SparkleFinderAccessState,
  SparkleFinderCommunicationConsent,
  SparkleFinderMembershipRecord,
  SparkleFinderSilverSource,
} from "./account-types";
import type { CustomerAccount, SilverProfile } from "./types";

type SparkleFinderUser = {
  id: string;
  email?: string | null;
};

type SparkleFinderProfileRow = {
  user_id: string;
  display_name: string | null;
  email: string | null;
  phone_e164?: string | null;
  state: string | null;
  tiktok_handle?: string | null;
  bio?: string | null;
  photo_url?: string | null;
  profile_visibility?: SilverProfile["visibility"] | null;
  is_rep?: boolean | null;
  sparkle_suite_rep_id?: string | null;
  sparkle_suite_rep_business_name?: string | null;
  sparkle_suite_rep_public_site_slug?: string | null;
  sparkle_suite_rep_claimed_at?: string | null;
};

type SparkleFinderMembershipRow = {
  user_id: string;
  access_state: SparkleFinderAccessState | null;
  silver_source: SparkleFinderSilverSource | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  silver_started_at: string | null;
  silver_ends_at: string | null;
};

type SparkleFinderConsentRow = {
  user_id: string;
  account_email_required: boolean | null;
  account_sms_allowed: boolean | null;
  account_sms_consented_at?: string | null;
  promotional_email_opt_in: boolean | null;
  promotional_sms_opt_in: boolean | null;
  promotional_email_consented_at: string | null;
  promotional_sms_consented_at: string | null;
  privacy_acknowledged_at: string | null;
};

export type SparkleFinderMembershipDetails = SparkleFinderMembershipRecord & {
  effectiveState: SparkleFinderAccessState;
  hasSilverAccess: boolean;
  isTrialActive: boolean;
  isTrialExpired: boolean;
};

export type CurrentSparkleFinderAccountState = SparkleFinderAccountState & {
  membership?: SparkleFinderMembershipDetails;
  communicationConsent: SparkleFinderCommunicationConsent;
  silverProfile?: SilverProfile;
  repEntitlement?: SparkleSuiteRepEntitlement;
  repIdentity?: CustomerAccount["repIdentity"];
  isLocalPreview?: boolean;
};

type AccountRowsInput = {
  user: SparkleFinderUser;
  profile: SparkleFinderProfileRow | null;
  membership: SparkleFinderMembershipRow | null;
  consent: SparkleFinderConsentRow | null;
  now?: string | Date;
};

type AccountServiceDependencies = {
  isSupabaseConfigured?: () => boolean;
  createSupabaseClient?: () => Promise<unknown>;
  localPreviewAuthMode?: SparkleFinderAuthMode;
};

type SupabaseAccountClient = {
  auth: {
    getUser: () => Promise<{ data: { user: SparkleFinderUser | null }; error: unknown }>;
  };
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => PromiseLike<{ data: unknown; error: unknown }>;
      };
    };
  };
};

const anonymousAccountState: CurrentSparkleFinderAccountState = {
  status: "anonymous",
  tier: "anonymous",
  displayName: "Guest",
  email: null,
  customer: null,
  communicationConsent: createDefaultCommunicationConsent(),
};

const localPreviewSilverTrialStartedAt = "2026-04-27T00:00:00.000Z";
const localPreviewSilverTrialEndsAt = "2026-06-10T23:59:59.999Z";

export async function getCurrentSparkleFinderAccount({
  isSupabaseConfigured = defaultIsSupabaseConfigured,
  createSupabaseClient = defaultCreateSupabaseClient,
  localPreviewAuthMode,
}: AccountServiceDependencies = {}): Promise<CurrentSparkleFinderAccountState> {
  if (!isSupabaseConfigured()) {
    return getLocalPreviewAccountState(localPreviewAuthMode) ?? { ...anonymousAccountState };
  }

  let supabase: SupabaseAccountClient;

  try {
    supabase = (await createSupabaseClient()) as SupabaseAccountClient;
  } catch {
    return { ...anonymousAccountState };
  }

  let user: SparkleFinderUser | null;

  try {
    const authResult = await supabase.auth.getUser();
    user = authResult.error ? null : authResult.data.user;
  } catch {
    user = null;
  }

  if (!user) {
    return { ...anonymousAccountState };
  }

  const [profile, membership, consent] = await Promise.all([
    fetchMaybeSingle<SparkleFinderProfileRow>(supabase, "sparkle_finder_profiles", user.id),
    fetchMaybeSingle<SparkleFinderMembershipRow>(supabase, "sparkle_finder_memberships", user.id),
    fetchMaybeSingle<SparkleFinderConsentRow>(supabase, "sparkle_finder_communication_consents", user.id),
  ]);
  const storedMembership = await applyStoredSilverTrialSettlement(
    supabase as unknown as Parameters<typeof applyStoredSilverTrialSettlement>[0],
    user.id,
    membership,
  );

  return mapSparkleFinderAccountRows({
    user,
    profile,
    membership: storedMembership,
    consent,
  });
}

export function mapSparkleFinderAccountRows({
  user,
  profile,
  membership,
  consent,
  now,
}: AccountRowsInput): CurrentSparkleFinderAccountState {
  const displayName = firstPresent(profile?.display_name, user.email?.split("@")[0], "Sparkle Finder");
  const email = firstPresent(profile?.email, user.email, "");
  const baseAccessState = membership?.access_state ?? "free";
  const baseSilverAccess = getSilverAccessState({
    accessState: baseAccessState,
    trialEndsAt: membership?.trial_ends_at,
    silverEndsAt: membership?.silver_ends_at,
    now,
  });
  const repEntitlement = getRepEntitlementForProfile(profile, membership);
  const repIdentity = getRepIdentity(repEntitlement);
  const shouldUseRepIncludedSilver =
    hasRepIncludedSilver(repEntitlement) && baseSilverAccess.effectiveState !== "silver_paid";
  const accessState: SparkleFinderAccessState = shouldUseRepIncludedSilver
    ? "silver_rep_included"
    : baseAccessState;
  const silverAccess = shouldUseRepIncludedSilver
    ? getSilverAccessState({
        accessState,
        trialEndsAt: membership?.trial_ends_at,
        silverEndsAt: membership?.silver_ends_at,
        now,
      })
    : baseSilverAccess;
  const tier = silverAccess.hasSilverAccess ? "silver" : "free";
  const customer: CustomerAccount = {
    id: user.id,
    displayName,
    email,
    phoneE164: profile?.phone_e164 ?? "",
    state: profile?.state ?? "",
    tier,
    ...(repIdentity ? { repIdentity } : {}),
  };

  return {
    status: "authenticated",
    tier,
    displayName,
    email,
    customer,
    membership: {
      accountId: user.id,
      personId: user.id,
      accessState,
      silverSource: shouldUseRepIncludedSilver ? "sparkle_suite_rep" : membership?.silver_source ?? "none",
      trialStartedAt: membership?.trial_started_at ?? null,
      trialEndsAt: membership?.trial_ends_at ?? null,
      silverStartedAt: membership?.silver_started_at ?? null,
      silverEndsAt: membership?.silver_ends_at ?? null,
      effectiveState: silverAccess.effectiveState,
      hasSilverAccess: silverAccess.hasSilverAccess,
      isTrialActive: silverAccess.isTrialActive,
      isTrialExpired: silverAccess.isTrialExpired,
    },
    communicationConsent: consent
      ? {
          accountEmailRequired: true,
          accountSmsAllowed: consent.account_sms_allowed ?? false,
          promotionalEmailOptIn: consent.promotional_email_opt_in ?? false,
          promotionalSmsOptIn: consent.promotional_sms_opt_in ?? false,
          accountSmsConsentedAt: consent.account_sms_consented_at ?? null,
          promotionalEmailConsentedAt: consent.promotional_email_consented_at,
          promotionalSmsConsentedAt: consent.promotional_sms_consented_at,
          privacyAcknowledgedAt: consent.privacy_acknowledged_at,
        }
      : createDefaultCommunicationConsent(),
    silverProfile: {
      customerId: user.id,
      photoUrl: profile?.photo_url ?? "",
      tiktokHandle: profile?.tiktok_handle ?? "",
      bio: profile?.bio ?? "",
      visibility: profile?.profile_visibility ?? "private",
    },
    ...(repEntitlement ? { repEntitlement } : {}),
    ...(repIdentity ? { repIdentity } : {}),
  };
}

export function getSparkleFinderNavStatusLabel(accountState: SparkleFinderAccountState): string {
  if (accountState.status === "anonymous") {
    return "Guest";
  }

  const membership = "membership" in accountState
    ? (accountState.membership as SparkleFinderMembershipDetails | undefined)
    : undefined;

  if (membership?.effectiveState === "silver_trial") {
    return "Trial Silver";
  }

  if (membership?.effectiveState === "silver_rep_included") {
    return "Rep Silver";
  }

  return accountState.tier === "silver" ? "Silver" : "Free";
}

async function fetchMaybeSingle<T>(
  supabase: SupabaseAccountClient,
  table: string,
  userId: string,
): Promise<T | null> {
  try {
    const { data, error } = await supabase.from(table).select("*").eq("user_id", userId).maybeSingle();

    return error ? null : (data as T | null);
  } catch {
    return null;
  }
}

function getLocalPreviewAccountState(
  mode: SparkleFinderAuthMode | undefined,
): CurrentSparkleFinderAccountState | null {
  if (!mode || mode === "anonymous" || !isLocalPreviewAuthEnabled()) {
    return null;
  }

  return {
    ...getLocalDevAuthState(mode),
    membership: createLocalPreviewMembership(mode),
    communicationConsent: createDefaultCommunicationConsent(),
    isLocalPreview: true,
  };
}

function createLocalPreviewMembership(mode: Exclude<SparkleFinderAuthMode, "anonymous">): SparkleFinderMembershipDetails {
  const previewAccount = getLocalDevAuthState(mode);
  const accountId = previewAccount.status === "authenticated" ? previewAccount.customer.id : `local-preview-${mode}`;
  const accessState: SparkleFinderAccessState = mode === "silver" ? "silver_trial" : "free";
  const silverAccess = getSilverAccessState({
    accessState,
    trialEndsAt: mode === "silver" ? localPreviewSilverTrialEndsAt : null,
    now: "2026-06-01T00:00:00.000Z",
  });

  return {
    accountId,
    personId: accountId,
    accessState,
    silverSource: mode === "silver" ? "trial" : "none",
    trialStartedAt: mode === "silver" ? localPreviewSilverTrialStartedAt : null,
    trialEndsAt: mode === "silver" ? localPreviewSilverTrialEndsAt : null,
    silverStartedAt: null,
    silverEndsAt: null,
    effectiveState: silverAccess.effectiveState,
    hasSilverAccess: silverAccess.hasSilverAccess,
    isTrialActive: silverAccess.isTrialActive,
    isTrialExpired: silverAccess.isTrialExpired,
  };
}

function getRepEntitlementForProfile(
  profile: SparkleFinderProfileRow | null,
  membership: SparkleFinderMembershipRow | null,
): SparkleSuiteRepEntitlement | null {
  const fixtureEntitlement = getSparkleSuiteRepEntitlement(profile?.sparkle_suite_rep_id);

  if (fixtureEntitlement) {
    return fixtureEntitlement;
  }

  const linkedSuiteRepId = firstPresent(profile?.sparkle_suite_rep_id);
  const hasPersistedRepSilver =
    membership?.access_state === "silver_rep_included"
    || membership?.silver_source === "sparkle_suite_rep";

  if (!profile?.is_rep || !linkedSuiteRepId || !hasPersistedRepSilver) {
    return null;
  }

  return {
    sparkleSuiteRepId: linkedSuiteRepId,
    businessName: firstPresent(profile.sparkle_suite_rep_business_name, "Sparkle Suite workspace"),
    subscriptionStatus: "active",
    publicDiscoveryEnabled: Boolean(profile.sparkle_suite_rep_public_site_slug?.trim()),
  };
}

function firstPresent(...values: Array<string | null | undefined>): string {
  return values.find((value) => value?.trim())?.trim() ?? "";
}
