import type { SparkleFinderAccountState } from "./auth";
import type { CurrentSparkleFinderAccountState } from "./account-service";
import type { CollectionAcquisitionSource, CollectionItem, SilverProfile } from "./types";
import type { SparkleShowcaseItemStatus, SparkleShowcaseVisibility } from "./showcase-types";
import { normalizeRarestRevealSelection } from "./showcase-rarity";

export type CustomerStateDeniedReason = "silver_required" | "account_mismatch" | "save_failed";

export type SilverProfileUpdateInput = Partial<
  Pick<SilverProfile, "bio" | "photoUrl" | "tiktokHandle" | "visibility">
> & {
  displayName?: string;
};

export type SilverProfileUpdateResult =
  | {
      ok: true;
      profile: SilverProfile;
    }
  | {
      ok: false;
      reason: CustomerStateDeniedReason;
      profile: SilverProfile;
    };

export type CollectionItemUpsertInput = Pick<
  CollectionItem,
  "isHighlighted" | "jewelryItemId" | "note" | "state"
> & {
  acquisitionContext?: Record<string, unknown>;
  acquisitionSource?: CollectionAcquisitionSource;
  showcaseCollectionTitle?: string;
};

export type ShowcasePieceUpdateInput = {
  isRarestReveal: boolean;
  jewelryItemId: string;
  note: string;
  /** Undefined preserves the current photo; an empty string removes it. */
  personalPhotoUrl?: string;
  revealStory: string;
  showcaseStatus: SparkleShowcaseItemStatus;
  visibility: SparkleShowcaseVisibility;
};

export type CollectionItemUpsertResult =
  | {
      ok: true;
      collectionItems: CollectionItem[];
    }
  | {
      ok: false;
      reason: CustomerStateDeniedReason;
      collectionItems: CollectionItem[];
    };

export type PersistedCustomerStateResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      reason: CustomerStateDeniedReason;
    };

type SupabasePersistenceResult = PromiseLike<{ data: unknown; error: unknown }>;

type SupabasePersistenceFilterBuilder = PromiseLike<{ data: unknown; error: unknown }> & {
  eq: (column: string, value: string) => SupabasePersistenceFilterBuilder;
  maybeSingle?: () => SupabasePersistenceResult;
};

const profilePhotoMaxCharacters = 700_000;

export type SupabaseCustomerStateClient = {
  from: (table: string) => {
    select: (columns: string) => SupabasePersistenceFilterBuilder;
    update: (values: Record<string, unknown>) => SupabasePersistenceFilterBuilder;
    insert: (values: Record<string, unknown>) => SupabasePersistenceResult;
    upsert: (
      values: Record<string, unknown>,
      options: { onConflict: string },
    ) => SupabasePersistenceResult;
  };
};

export function updateSilverProfilePreview(
  accountState: SparkleFinderAccountState,
  profile: SilverProfile,
  input: SilverProfileUpdateInput,
): SilverProfileUpdateResult {
  if (!canSaveSignedInState(accountState)) {
    return {
      ok: false,
      reason: "silver_required",
      profile,
    };
  }

  const { displayName: omittedDisplayName, ...profileInput } = input;
  void omittedDisplayName;

  return {
    ok: true,
    profile: {
      ...profile,
      ...profileInput,
      customerId: accountState.customer.id,
    },
  };
}

export async function persistSilverProfileForAccount(
  supabase: SupabaseCustomerStateClient,
  accountState: CurrentSparkleFinderAccountState,
  input: SilverProfileUpdateInput,
): Promise<PersistedCustomerStateResult> {
  if (!canSaveSignedInState(accountState)) {
    return { ok: false, reason: "silver_required" };
  }

  const values: Record<string, string> = {
    display_name: cleanText(input.displayName, 80) || cleanText(accountState.customer.displayName, 80),
    tiktok_handle: cleanText(input.tiktokHandle, 80),
    bio: cleanText(input.bio, 500),
    profile_visibility: input.visibility === "sparkle_finder" ? "sparkle_finder" : "private",
  };

  if (input.photoUrl !== undefined) {
    values.photo_url = cleanText(input.photoUrl, profilePhotoMaxCharacters);
  }

  const existingProfile = await safeMaybeSingle(
    supabase.from("sparkle_finder_profiles").select("user_id").eq("user_id", accountState.customer.id),
  );

  if (existingProfile.error) {
    logProfileSaveFailure("select_existing_profile", existingProfile.error);
  }

  let result: { data: unknown; error: unknown };

  if (existingProfile.data) {
    result = await supabase.from("sparkle_finder_profiles").update(values).eq("user_id", accountState.customer.id);
  } else {
    const insertResult = await supabase.from("sparkle_finder_profiles").insert({
      user_id: accountState.customer.id,
      display_name: values.display_name,
      email: cleanText(accountState.customer.email, 254),
      state: cleanText(accountState.customer.state, 40),
      tiktok_handle: values.tiktok_handle,
      bio: values.bio,
      profile_visibility: values.profile_visibility,
    });

    result = insertResult.error
      ? insertResult
      : await supabase.from("sparkle_finder_profiles").update(values).eq("user_id", accountState.customer.id);
  }

  if (result.error) {
    logProfileSaveFailure(existingProfile.data ? "update_profile" : "insert_profile", result.error, {
      valueKeys: Object.keys(values),
    });
    return { ok: false, reason: "save_failed" };
  }

  const savedProfile = await safeMaybeSingle(
    supabase
      .from("sparkle_finder_profiles")
      .select(["user_id", ...Object.keys(values)].join(","))
      .eq("user_id", accountState.customer.id),
  );

  if (savedProfile.error) {
    logProfileSaveFailure("select_saved_profile", savedProfile.error);
    return { ok: false, reason: "save_failed" };
  }

  if (!matchesSavedProfile(savedProfile.data, accountState.customer.id, values)) {
    logProfileSaveFailure("verify_saved_profile", null, {
      expectedKeys: Object.keys(values),
      savedKeys: savedProfile.data && typeof savedProfile.data === "object" ? Object.keys(savedProfile.data) : [],
    });
    return { ok: false, reason: "save_failed" };
  }

  return { ok: true };
}

export async function persistCollectionItemForAccount(
  supabase: SupabaseCustomerStateClient,
  accountState: CurrentSparkleFinderAccountState,
  input: CollectionItemUpsertInput,
): Promise<PersistedCustomerStateResult> {
  if (!canSaveCollection(accountState)) {
    return { ok: false, reason: "silver_required" };
  }

  const values = {
    user_id: accountState.customer.id,
    jewelry_item_id: input.jewelryItemId,
    state: input.state,
    showcase_status: input.state,
    note: cleanText(input.note, 500),
    is_highlighted: input.state === "owned" ? input.isHighlighted : false,
    ...(input.state === "owned" ? {} : { is_rarest_reveal: false }),
    ...getAcquisitionPersistenceValues(input),
  };
  const result = await supabase.from("sparkle_finder_collection_items").upsert(values, {
    onConflict: "user_id,jewelry_item_id",
  });

  if (result.error) {
    return { ok: false, reason: "save_failed" };
  }

  const showcaseCollectionTitle = cleanText(input.showcaseCollectionTitle, 80);

  if (input.state !== "owned" || !showcaseCollectionTitle) {
    return { ok: true };
  }

  return assignOwnedItemToShowcaseCollection(supabase, accountState, {
    jewelryItemId: input.jewelryItemId,
    title: showcaseCollectionTitle,
  });
}

export async function persistShowcasePieceForAccount(
  supabase: SupabaseCustomerStateClient,
  accountState: CurrentSparkleFinderAccountState,
  input: ShowcasePieceUpdateInput,
): Promise<PersistedCustomerStateResult> {
  if (!canSaveCollection(accountState)) {
    return { ok: false, reason: "silver_required" };
  }

  const isRarestReveal = normalizeRarestRevealSelection(input.showcaseStatus, input.isRarestReveal);
  const values = {
    user_id: accountState.customer.id,
    jewelry_item_id: input.jewelryItemId,
    state: mapShowcaseStatusToLegacyCollectionState(input.showcaseStatus),
    note: cleanText(input.note, 500),
    is_highlighted: isRarestReveal,
    visibility: input.visibility,
    showcase_status: input.showcaseStatus,
    reveal_story: cleanText(input.revealStory, 700),
    is_rarest_reveal: isRarestReveal,
    ...(input.personalPhotoUrl !== undefined
      ? { personal_photo_url: cleanText(input.personalPhotoUrl, profilePhotoMaxCharacters) || null }
      : {}),
  };
  const result = await supabase.from("sparkle_finder_collection_items").upsert(values, {
    onConflict: "user_id,jewelry_item_id",
  });

  return result.error ? { ok: false, reason: "save_failed" } : { ok: true };
}

export function addJewelryItemToCustomerCollection(
  accountState: SparkleFinderAccountState,
  collectionItems: CollectionItem[],
  input: CollectionItemUpsertInput,
): CollectionItemUpsertResult {
  if (!canSaveCollection(accountState)) {
    return {
      ok: false,
      reason: "silver_required",
      collectionItems,
    };
  }

  const existingItem = collectionItems.find((item) => item.jewelryItemId === input.jewelryItemId);
  const updatedItem: CollectionItem = {
    id: existingItem?.id ?? createLocalCollectionItemId(input.jewelryItemId),
    customerId: accountState.customer.id,
    jewelryItemId: input.jewelryItemId,
    state: input.state,
    note: input.note,
    isHighlighted: input.isHighlighted,
    acquisitionSource: normalizeAcquisitionSource(input.acquisitionSource) ?? getDefaultAcquisitionSource(input.state),
    acquisitionContext: input.acquisitionContext ?? {},
    acquisitionMarkedAt: isFinderAssistedAcquisitionSource(input.acquisitionSource) ? new Date().toISOString() : null,
  };

  return {
    ok: true,
    collectionItems: existingItem
      ? collectionItems.map((item) => (item.id === existingItem.id ? updatedItem : item))
      : [...collectionItems, updatedItem],
  };
}

function canSaveSignedInState(
  accountState: SparkleFinderAccountState | CurrentSparkleFinderAccountState,
): accountState is (SparkleFinderAccountState | CurrentSparkleFinderAccountState) & { status: "authenticated" } {
  return accountState.status === "authenticated";
}

function canSaveCollection(
  accountState: SparkleFinderAccountState | CurrentSparkleFinderAccountState,
): accountState is (SparkleFinderAccountState | CurrentSparkleFinderAccountState) & { status: "authenticated" } {
  if (!canSaveSignedInState(accountState)) {
    return false;
  }

  const membership =
    "membership" in accountState
      ? (accountState.membership as CurrentSparkleFinderAccountState["membership"] | undefined)
      : undefined;

  return membership ? membership.hasSilverAccess : accountState.tier === "silver";
}

function createLocalCollectionItemId(jewelryItemId: string): string {
  return `collection-local-${jewelryItemId}`;
}

function mapShowcaseStatusToLegacyCollectionState(status: SparkleShowcaseItemStatus): CollectionItem["state"] {
  if (status === "private_note_only") {
    return "private_note_only";
  }

  return status === "owned" ? "owned" : "wishlist";
}

function getAcquisitionPersistenceValues(input: CollectionItemUpsertInput): {
  acquisition_context: Record<string, unknown>;
  acquisition_marked_at?: string;
  acquisition_source: CollectionAcquisitionSource;
} {
  const acquisitionSource = normalizeAcquisitionSource(input.acquisitionSource) ?? getDefaultAcquisitionSource(input.state);
  const values: {
    acquisition_context: Record<string, unknown>;
    acquisition_marked_at?: string;
    acquisition_source: CollectionAcquisitionSource;
  } = {
    acquisition_context: cleanAcquisitionContext(input.acquisitionContext),
    acquisition_source: acquisitionSource,
  };

  if (isFinderAssistedAcquisitionSource(acquisitionSource)) {
    values.acquisition_marked_at = new Date().toISOString();
  }

  return values;
}

function getDefaultAcquisitionSource(state: CollectionItem["state"]): CollectionAcquisitionSource {
  return state === "wishlist" ? "wishlist" : "manual";
}

function normalizeAcquisitionSource(source: CollectionAcquisitionSource | undefined): CollectionAcquisitionSource | null {
  if (
    source === "manual" ||
    source === "wishlist" ||
    source === "sparkle_finder_lead" ||
    source === "nic_nac_request" ||
    source === "unknown"
  ) {
    return source;
  }

  return null;
}

function isFinderAssistedAcquisitionSource(source: CollectionAcquisitionSource | undefined | null): boolean {
  return source === "sparkle_finder_lead" || source === "nic_nac_request";
}

function cleanAcquisitionContext(context: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!context) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(context)
      .filter(([key, value]) => key.trim() && typeof value !== "undefined" && value !== null)
      .slice(0, 12)
      .map(([key, value]) => [cleanText(key, 60), cleanAcquisitionContextValue(value)]),
  );
}

function cleanAcquisitionContextValue(value: unknown): string | number | boolean {
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  return cleanText(String(value), 180);
}

async function assignOwnedItemToShowcaseCollection(
  supabase: SupabaseCustomerStateClient,
  accountState: CurrentSparkleFinderAccountState & { status: "authenticated" },
  input: { jewelryItemId: string; title: string },
): Promise<PersistedCustomerStateResult> {
  const collectionItem = await safeMaybeSingle(
    supabase
      .from("sparkle_finder_collection_items")
      .select("id")
      .eq("user_id", accountState.customer.id)
      .eq("jewelry_item_id", input.jewelryItemId),
  );

  if (collectionItem.error) {
    return { ok: false, reason: "save_failed" };
  }

  const collectionItemId = readStringField(collectionItem.data, "id");

  if (!collectionItemId) {
    return { ok: false, reason: "save_failed" };
  }

  const slug = createShowcaseCollectionSlug(input.title);
  const showcaseCollectionId = await findOrCreateShowcaseCollectionId(supabase, accountState.customer.id, {
    slug,
    title: input.title,
  });

  if (!showcaseCollectionId) {
    return { ok: false, reason: "save_failed" };
  }

  const existingJoin = await safeMaybeSingle(
    supabase
      .from("sparkle_finder_showcase_collection_items")
      .select("showcase_collection_id")
      .eq("showcase_collection_id", showcaseCollectionId)
      .eq("collection_item_id", collectionItemId),
  );

  if (existingJoin.error) {
    return { ok: false, reason: "save_failed" };
  }

  if (existingJoin.data) {
    return { ok: true };
  }

  const joinResult = await supabase.from("sparkle_finder_showcase_collection_items").insert({
    showcase_collection_id: showcaseCollectionId,
    collection_item_id: collectionItemId,
  });

  return joinResult.error ? { ok: false, reason: "save_failed" } : { ok: true };
}

async function findOrCreateShowcaseCollectionId(
  supabase: SupabaseCustomerStateClient,
  userId: string,
  input: { slug: string; title: string },
): Promise<string | null> {
  const existing = await selectShowcaseCollectionId(supabase, userId, input.slug);

  if (existing) {
    return existing;
  }

  const insertResult = await supabase.from("sparkle_finder_showcase_collections").insert({
    user_id: userId,
    title: input.title,
    slug: input.slug,
    description: "",
    visibility: "private",
  });

  if (insertResult.error) {
    const recovered = await selectShowcaseCollectionId(supabase, userId, input.slug);

    return recovered;
  }

  return selectShowcaseCollectionId(supabase, userId, input.slug);
}

async function selectShowcaseCollectionId(
  supabase: SupabaseCustomerStateClient,
  userId: string,
  slug: string,
): Promise<string | null> {
  const result = await safeMaybeSingle(
    supabase
      .from("sparkle_finder_showcase_collections")
      .select("id")
      .eq("user_id", userId)
      .eq("slug", slug),
  );

  if (result.error) {
    return null;
  }

  return readStringField(result.data, "id");
}

function createShowcaseCollectionSlug(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "my-collection";
}

function readStringField(data: unknown, field: string): string {
  if (!data || typeof data !== "object") {
    return "";
  }

  const value = (data as Record<string, unknown>)[field];

  return typeof value === "string" ? value : "";
}

async function safeMaybeSingle(builder: SupabasePersistenceFilterBuilder): Promise<{ data: unknown; error: unknown }> {
  if (!builder.maybeSingle) {
    return { data: null, error: null };
  }

  try {
    return await builder.maybeSingle();
  } catch (error) {
    return { data: null, error };
  }
}

function cleanText(value: string | undefined, maxLength: number): string {
  return String(value ?? "")
    .trim()
    .slice(0, maxLength);
}

function matchesSavedProfile(data: unknown, userId: string, values: Record<string, string>): boolean {
  if (!data || typeof data !== "object") {
    return false;
  }

  const row = data as Record<string, unknown>;

  return row.user_id === userId && Object.entries(values).every(([key, value]) => row[key] === value);
}

function logProfileSaveFailure(stage: string, error: unknown, context: Record<string, unknown> = {}) {
  console.error(
    "[sparkle-finder] silver profile save failed",
    JSON.stringify({
      stage,
      error: summarizePersistenceError(error),
      ...context,
    }),
  );
}

function summarizePersistenceError(error: unknown): Record<string, unknown> | null {
  if (!error || typeof error !== "object") {
    return error ? { message: String(error) } : null;
  }

  const record = error as Record<string, unknown>;

  return {
    code: record.code,
    details: record.details,
    hint: record.hint,
    message: record.message,
    name: record.name,
  };
}
