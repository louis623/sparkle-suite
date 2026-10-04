import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getSparkleFinderAccountEntitlements,
  canUseSilverCollectionActions,
  canUseNicNacFindRequests,
  canUseSilverProfileActions,
  getSparkleFinderEntitlements,
} from "../../lib/sparkle-finder/entitlements";
import { getLocalDevAuthState } from "../../lib/sparkle-finder/auth";
import {
  addJewelryItemToCustomerCollection,
  persistCollectionItemForAccount,
  persistSilverProfileForAccount,
  updateSilverProfilePreview,
} from "../../lib/sparkle-finder/customer-state";
import type { CurrentSparkleFinderAccountState } from "../../lib/sparkle-finder/account-service";
import type { SparkleFinderAccessState } from "../../lib/sparkle-finder/account-types";
import type { CollectionItem, CustomerAccount, SilverProfile } from "../../lib/sparkle-finder/types";

const freeCustomer: CustomerAccount = {
  id: "customer-free-test",
  displayName: "Free Collector",
  email: "free@example.test",
  state: "NC",
  tier: "free",
};

const silverCustomer: CustomerAccount = {
  id: "customer-silver-test",
  displayName: "Silver Collector",
  email: "silver@example.test",
  state: "TX",
  tier: "silver",
};

describe("Sparkle Finder entitlements", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("next/cache");
    vi.doUnmock("../../lib/supabase/server");
    vi.doUnmock("../../lib/sparkle-finder/account-service");
  });

  it("represents anonymous local-dev visitors without customer entitlements", () => {
    const accountState = getLocalDevAuthState("anonymous");
    const entitlements = getSparkleFinderAccountEntitlements(accountState);

    expect(accountState).toMatchObject({
      status: "anonymous",
      tier: "anonymous",
      customer: null,
    });
    expect(entitlements).toMatchObject({
      tier: "anonymous",
      canBrowseLibrary: false,
      canUseSilverProfileActions: false,
      canUseSilverCollectionActions: false,
      canUseNicNacFindRequests: false,
    });
  });

  it("represents Free local-dev customers with profile access and no collection or Nic-Nac access", () => {
    const accountState = getLocalDevAuthState("free");
    const entitlements = getSparkleFinderAccountEntitlements(accountState);

    expect(accountState).toMatchObject({
      status: "authenticated",
      tier: "free",
      customer: {
        id: "customer-free-marlena",
      },
    });
    expect(entitlements).toMatchObject({
      tier: "free",
      canBrowseLibrary: true,
      canUseSilverProfileActions: true,
      canUseSilverCollectionActions: false,
      canUseNicNacFindRequests: false,
    });
  });

  it("uses anonymous as the default local-dev account state", () => {
    const accountState = getLocalDevAuthState();
    const entitlements = getSparkleFinderAccountEntitlements(accountState);

    expect(accountState).toMatchObject({
      status: "anonymous",
      tier: "anonymous",
      customer: null,
    });
    expect(entitlements).toMatchObject({
      tier: "anonymous",
      canBrowseLibrary: false,
      canUseSilverProfileActions: false,
      canUseSilverCollectionActions: false,
      canUseNicNacFindRequests: false,
    });
  });

  it("represents Silver local-dev customers with full preview access", () => {
    const accountState = getLocalDevAuthState("silver");
    const entitlements = getSparkleFinderAccountEntitlements(accountState);

    expect(accountState).toMatchObject({
      status: "authenticated",
      tier: "silver",
      customer: {
        id: "customer-silver-sparkle-mama",
      },
    });
    expect(entitlements).toMatchObject({
      tier: "silver",
      canBrowseLibrary: true,
      canUseSilverProfileActions: true,
      canUseSilverCollectionActions: true,
      canUseNicNacFindRequests: true,
    });
  });

  it("lets Free users keep a profile while collection saves and Nic-Nac stay Silver", () => {
    const entitlements = getSparkleFinderEntitlements(freeCustomer);

    expect(entitlements).toMatchObject({
      tier: "free",
      canBrowseLibrary: true,
      canUseSilverProfileActions: true,
      canUseSilverCollectionActions: false,
      canUseNicNacFindRequests: false,
    });
    expect(canUseSilverProfileActions(freeCustomer)).toBe(true);
    expect(canUseSilverCollectionActions(freeCustomer)).toBe(false);
    expect(canUseNicNacFindRequests(freeCustomer)).toBe(false);
  });

  it("allows Silver users to use profile, collection, and Nic-Nac find actions", () => {
    const entitlements = getSparkleFinderEntitlements(silverCustomer);

    expect(entitlements).toMatchObject({
      tier: "silver",
      canBrowseLibrary: true,
      canUseSilverProfileActions: true,
      canUseSilverCollectionActions: true,
      canUseNicNacFindRequests: true,
    });
    expect(canUseSilverProfileActions(silverCustomer)).toBe(true);
    expect(canUseSilverCollectionActions(silverCustomer)).toBe(true);
    expect(canUseNicNacFindRequests(silverCustomer)).toBe(true);
  });

  it("lets Free local-dev accounts save a profile and blocks collection saves", () => {
    const freeAccount = getLocalDevAuthState("free");
    const profile: SilverProfile = {
      customerId: "customer-free-marlena",
      photoUrl: "",
      tiktokHandle: "",
      bio: "",
      visibility: "private",
    };
    const collection: CollectionItem[] = [];

    const profileResult = updateSilverProfilePreview(freeAccount, profile, {
      bio: "Collects soft pink rings.",
      tiktokHandle: "@free_preview",
      visibility: "sparkle_finder",
    });
    const collectionResult = addJewelryItemToCustomerCollection(freeAccount, collection, {
      jewelryItemId: "jewel-rainbow-crown-ring",
      state: "owned",
      note: "Local preview note.",
      isHighlighted: true,
    });

    expect(profileResult).toMatchObject({
      ok: true,
      profile: {
        customerId: "customer-free-marlena",
        bio: "Collects soft pink rings.",
        tiktokHandle: "@free_preview",
        visibility: "sparkle_finder",
      },
    });
    expect(collectionResult).toMatchObject({
      ok: false,
      reason: "silver_required",
      collectionItems: collection,
    });
  });

  it("allows Silver local-dev profile and collection state saves", () => {
    const silverAccount = getLocalDevAuthState("silver");
    const profile: SilverProfile = {
      customerId: "customer-silver-sparkle-mama",
      photoUrl: "/fixtures/customers/sparkle-mama.svg",
      tiktokHandle: "@sparklemama_tx",
      bio: "Collects warm golds.",
      visibility: "private",
    };
    const collection: CollectionItem[] = [
      {
        id: "collection-owned-rainbow",
        customerId: "customer-silver-sparkle-mama",
        jewelryItemId: "jewel-rainbow-crown-ring",
        state: "owned",
        note: "Favorite centerpiece ring.",
        isHighlighted: false,
      },
    ];

    const profileResult = updateSilverProfilePreview(silverAccount, profile, {
      bio: "Collects warm golds, hearts, and statement rings.",
      tiktokHandle: "@sparklemama_tx",
      visibility: "sparkle_finder",
    });
    const ownedResult = addJewelryItemToCustomerCollection(silverAccount, collection, {
      jewelryItemId: "jewel-rainbow-crown-ring",
      state: "owned",
      note: "Favorite centerpiece ring.",
      isHighlighted: true,
    });
    const wishlistResult = addJewelryItemToCustomerCollection(silverAccount, ownedResult.collectionItems, {
      jewelryItemId: "jewel-lilac-orbit-ring",
      state: "wishlist",
      note: "Watch for the softer purple stone.",
      isHighlighted: false,
    });
    const privateNoteResult = addJewelryItemToCustomerCollection(silverAccount, wishlistResult.collectionItems, {
      jewelryItemId: "jewel-golden-heart-necklace",
      state: "private_note_only",
      note: "Looks good with layered chains.",
      isHighlighted: false,
    });

    expect(profileResult).toMatchObject({
      ok: true,
      profile: {
        customerId: "customer-silver-sparkle-mama",
        bio: "Collects warm golds, hearts, and statement rings.",
        tiktokHandle: "@sparklemama_tx",
        visibility: "sparkle_finder",
      },
    });
    expect(ownedResult.collectionItems).toContainEqual(
      expect.objectContaining({
        id: "collection-owned-rainbow",
        state: "owned",
        isHighlighted: true,
      }),
    );
    expect(wishlistResult.collectionItems).toContainEqual(
      expect.objectContaining({
        jewelryItemId: "jewel-lilac-orbit-ring",
        state: "wishlist",
        isHighlighted: false,
      }),
    );
    expect(privateNoteResult.collectionItems).toContainEqual(
      expect.objectContaining({
        jewelryItemId: "jewel-golden-heart-necklace",
        state: "private_note_only",
        note: "Looks good with layered chains.",
      }),
    );
  });

  it.each([
    "silver_trial",
    "silver_paid",
    "silver_rep_included",
  ] satisfies SparkleFinderAccessState[])(
    "allows %s accounts to persist Silver profile and collection state",
    async (accessState) => {
      const accountState = currentAccountState(accessState);
      const client = createFakePersistenceClient({
        profile: { user_id: accountState.customer.id },
        collectionItem: null,
      });

      const profileResult = await persistSilverProfileForAccount(client, accountState, {
        bio: "Keeps a tidy signed-in collection.",
        photoUrl: "https://cdn.example.test/casey.jpg",
        tiktokHandle: "@casey_silver",
        visibility: "sparkle_finder",
      });
      const ownedResult = await persistCollectionItemForAccount(client, accountState, {
        jewelryItemId: "jewel-rainbow-crown-ring",
        state: "owned",
        note: "Confirmed in my collection.",
        isHighlighted: true,
      });
      const wishlistResult = await persistCollectionItemForAccount(client, accountState, {
        jewelryItemId: "jewel-lilac-orbit-ring",
        state: "wishlist",
        note: "Watching for this one.",
        isHighlighted: false,
      });
      const privateNoteResult = await persistCollectionItemForAccount(client, accountState, {
        jewelryItemId: "jewel-golden-heart-necklace",
        state: "private_note_only",
        note: "Pairs with layered chains.",
        isHighlighted: false,
      });

      expect(profileResult).toEqual({ ok: true });
      expect(ownedResult).toEqual({ ok: true });
      expect(wishlistResult).toEqual({ ok: true });
      expect(privateNoteResult).toEqual({ ok: true });
      expect(client.operations).toContainEqual({
        table: "sparkle_finder_profiles",
        type: "update",
        values: {
          display_name: "Casey Collector",
          tiktok_handle: "@casey_silver",
          bio: "Keeps a tidy signed-in collection.",
          photo_url: "https://cdn.example.test/casey.jpg",
          profile_visibility: "sparkle_finder",
        },
        filters: [
          ["user_id", "user-123"],
        ],
      });
      expect(client.operations).toContainEqual({
        table: "sparkle_finder_collection_items",
        type: "upsert",
        values: {
          user_id: "user-123",
          jewelry_item_id: "jewel-rainbow-crown-ring",
          state: "owned",
          showcase_status: "owned",
          note: "Confirmed in my collection.",
          is_highlighted: true,
          acquisition_source: "manual",
          acquisition_context: {},
        },
        options: {
          onConflict: "user_id,jewelry_item_id",
        },
      });
      expect(client.operations).toContainEqual({
        table: "sparkle_finder_collection_items",
        type: "upsert",
        values: {
          user_id: "user-123",
          jewelry_item_id: "jewel-lilac-orbit-ring",
          state: "wishlist",
          showcase_status: "wishlist",
          note: "Watching for this one.",
          is_highlighted: false,
          is_rarest_reveal: false,
          acquisition_source: "wishlist",
          acquisition_context: {},
        },
        options: {
          onConflict: "user_id,jewelry_item_id",
        },
      });
      expect(client.operations).toContainEqual({
        table: "sparkle_finder_collection_items",
        type: "upsert",
        values: {
          user_id: "user-123",
          jewelry_item_id: "jewel-golden-heart-necklace",
          state: "private_note_only",
          showcase_status: "private_note_only",
          note: "Pairs with layered chains.",
          is_highlighted: false,
          is_rarest_reveal: false,
          acquisition_source: "manual",
          acquisition_context: {},
        },
        options: {
          onConflict: "user_id,jewelry_item_id",
        },
      });
    },
  );

  it("uses duplicate-safe upsert for an existing persisted collection item", async () => {
    const accountState = currentAccountState("silver_paid");
    const client = createFakePersistenceClient({
      collectionItem: { id: "collection-existing", user_id: "user-123" },
    });

    const result = await persistCollectionItemForAccount(client, accountState, {
      jewelryItemId: "jewel-rainbow-crown-ring",
      state: "owned",
      note: "Now highlighted.",
      isHighlighted: true,
    });

    expect(result).toEqual({ ok: true });
    expect(client.operations).toContainEqual({
      table: "sparkle_finder_collection_items",
      type: "upsert",
      values: {
        user_id: "user-123",
        jewelry_item_id: "jewel-rainbow-crown-ring",
        state: "owned",
        showcase_status: "owned",
        note: "Now highlighted.",
        is_highlighted: true,
        acquisition_source: "manual",
        acquisition_context: {},
      },
      options: {
        onConflict: "user_id,jewelry_item_id",
      },
    });
    expect(client.operations).not.toContainEqual(expect.objectContaining({ type: "insert" }));
    expect(client.operations).not.toContainEqual(expect.objectContaining({ type: "update" }));
  });

  it("records assisted acquisition context for Sparkle Finder-found owned saves", async () => {
    const accountState = currentAccountState("silver_paid");
    const client = createFakePersistenceClient({
      collectionItem: { id: "collection-existing", user_id: "user-123" },
    });

    const result = await persistCollectionItemForAccount(client, accountState, {
      jewelryItemId: "jewel-rainbow-crown-ring",
      state: "owned",
      note: "Found from a Nic-Nac lead.",
      isHighlighted: false,
      acquisitionSource: "sparkle_finder_lead",
      acquisitionContext: {
        listingId: "listing-rainbow-crown-sierra",
        requestId: "fixture-request-jewel-rainbow-crown-ring",
      },
    });

    expect(result).toEqual({ ok: true });
    expect(client.operations).toContainEqual({
      table: "sparkle_finder_collection_items",
      type: "upsert",
      values: {
        user_id: "user-123",
        jewelry_item_id: "jewel-rainbow-crown-ring",
        state: "owned",
        showcase_status: "owned",
        note: "Found from a Nic-Nac lead.",
        is_highlighted: false,
        acquisition_source: "sparkle_finder_lead",
        acquisition_context: {
          listingId: "listing-rainbow-crown-sierra",
          requestId: "fixture-request-jewel-rainbow-crown-ring",
        },
        acquisition_marked_at: expect.any(String),
      },
      options: {
        onConflict: "user_id,jewelry_item_id",
      },
    });
  });

  it("links owned saves to the selected Showcase collection", async () => {
    const accountState = currentAccountState("silver_paid");
    const client = createFakePersistenceClient({});

    const result = await persistCollectionItemForAccount(client, accountState, {
      jewelryItemId: "jewel-rainbow-crown-ring",
      state: "owned",
      note: "Confirmed in my collection.",
      isHighlighted: true,
      showcaseCollectionTitle: "Rarest Reveals",
    });

    expect(result).toEqual({ ok: true });
    expect(client.operations).toContainEqual({
      table: "sparkle_finder_collection_items",
      type: "upsert",
      values: {
        user_id: "user-123",
        jewelry_item_id: "jewel-rainbow-crown-ring",
        state: "owned",
        showcase_status: "owned",
        note: "Confirmed in my collection.",
        is_highlighted: true,
        acquisition_source: "manual",
        acquisition_context: {},
      },
      options: {
        onConflict: "user_id,jewelry_item_id",
      },
    });
    expect(client.operations).toContainEqual({
      table: "sparkle_finder_showcase_collections",
      type: "insert",
      values: {
        user_id: "user-123",
        title: "Rarest Reveals",
        slug: "rarest-reveals",
        description: "",
        visibility: "private",
      },
    });
    expect(client.operations).toContainEqual({
      table: "sparkle_finder_showcase_collection_items",
      type: "insert",
      values: {
        showcase_collection_id: "showcase-collection-created",
        collection_item_id: "collection-upserted",
      },
    });
  });

  it("keeps collection persistence duplicate-safe when a previous duplicate row would make selection ambiguous", async () => {
    const accountState = currentAccountState("silver_paid");
    const client = createFakePersistenceClient({
      collectionSelectError: new Error("multiple rows returned"),
    });

    const result = await persistCollectionItemForAccount(client, accountState, {
      jewelryItemId: "jewel-rainbow-crown-ring",
      state: "wishlist",
      note: "Recover by upserting one logical row.",
      isHighlighted: false,
    });

    expect(result).toEqual({ ok: true });
    expect(client.operations).toEqual([
      {
        table: "sparkle_finder_collection_items",
        type: "upsert",
        values: {
          user_id: "user-123",
          jewelry_item_id: "jewel-rainbow-crown-ring",
          state: "wishlist",
          showcase_status: "wishlist",
          note: "Recover by upserting one logical row.",
          is_highlighted: false,
          is_rarest_reveal: false,
          acquisition_source: "wishlist",
          acquisition_context: {},
        },
        options: {
          onConflict: "user_id,jewelry_item_id",
        },
      },
    ]);
  });

  it("inserts a missing persisted profile with required account-owned basics", async () => {
    const accountState = currentAccountState("silver_paid");
    const client = createFakePersistenceClient({ profile: null });

    const result = await persistSilverProfileForAccount(client, accountState, {
      bio: "Fresh profile row.",
      tiktokHandle: "@casey_new",
      visibility: "private",
    });

    expect(result).toEqual({ ok: true });
    expect(client.operations).toEqual([
      {
        table: "sparkle_finder_profiles",
        type: "insert",
        values: {
          user_id: "user-123",
          display_name: "Casey Collector",
          email: "casey@example.test",
          state: "PA",
          tiktok_handle: "@casey_new",
          bio: "Fresh profile row.",
          profile_visibility: "private",
        },
      },
      {
        table: "sparkle_finder_profiles",
        type: "update",
        values: {
          display_name: "Casey Collector",
          tiktok_handle: "@casey_new",
          bio: "Fresh profile row.",
          profile_visibility: "private",
        },
        filters: [
          ["user_id", "user-123"],
        ],
      },
    ]);
  });

  it("recovers missing persisted profile rows before saving uploaded profile photos", async () => {
    const accountState = currentAccountState("silver_paid");
    const client = createFakePersistenceClient({ profile: null });
    const photoDataUrl = `data:image/png;base64,${"a".repeat(640)}`;

    const result = await persistSilverProfileForAccount(client, accountState, {
      bio: "Fresh photo profile.",
      photoUrl: photoDataUrl,
      tiktokHandle: "@casey_photo",
      visibility: "private",
    });

    expect(result).toEqual({ ok: true });
    expect(client.operations).toEqual([
      {
        table: "sparkle_finder_profiles",
        type: "insert",
        values: {
          user_id: "user-123",
          display_name: "Casey Collector",
          email: "casey@example.test",
          state: "PA",
          tiktok_handle: "@casey_photo",
          bio: "Fresh photo profile.",
          profile_visibility: "private",
        },
      },
      {
        table: "sparkle_finder_profiles",
        type: "update",
        values: {
          display_name: "Casey Collector",
          tiktok_handle: "@casey_photo",
          bio: "Fresh photo profile.",
          photo_url: photoDataUrl,
          profile_visibility: "private",
        },
        filters: [
          ["user_id", "user-123"],
        ],
      },
    ]);
  });

  it("fails missing profile recovery when the base profile row cannot be inserted", async () => {
    const accountState = currentAccountState("silver_paid");
    const client = createFakePersistenceClient({ profile: null, profileInsertError: new Error("insert denied") });

    const result = await persistSilverProfileForAccount(client, accountState, {
      bio: "Cannot create this row.",
      tiktokHandle: "@casey_blocked",
      visibility: "private",
    });

    expect(result).toEqual({ ok: false, reason: "save_failed" });
    expect(client.operations).toEqual([
      {
        table: "sparkle_finder_profiles",
        type: "insert",
        values: {
          user_id: "user-123",
          display_name: "Casey Collector",
          email: "casey@example.test",
          state: "PA",
          tiktok_handle: "@casey_blocked",
          bio: "Cannot create this row.",
          profile_visibility: "private",
        },
      },
    ]);
  });

  it("does not insert photo_url while recovering a missing persisted profile row", async () => {
    const accountState = currentAccountState("silver_paid");
    const client = createFakePersistenceClient({ profile: null });
    const photoDataUrl = `data:image/png;base64,${"a".repeat(640)}`;

    await persistSilverProfileForAccount(client, accountState, {
      photoUrl: photoDataUrl,
      visibility: "private",
    });

    expect(client.operations[0]).toEqual({
      table: "sparkle_finder_profiles",
      type: "insert",
      values: {
        user_id: "user-123",
        display_name: "Casey Collector",
        email: "casey@example.test",
        state: "PA",
        tiktok_handle: "",
        bio: "",
        profile_visibility: "private",
      },
    });
  });

  it("persists uploaded profile photo data without truncating it like a URL", async () => {
    const accountState = currentAccountState("silver_paid");
    const client = createFakePersistenceClient({
      profile: { user_id: accountState.customer.id },
    });
    const photoDataUrl = `data:image/png;base64,${"a".repeat(640)}`;

    const result = await persistSilverProfileForAccount(client, accountState, {
      bio: "Photo upload profile.",
      photoUrl: photoDataUrl,
      tiktokHandle: "@casey_photo",
      visibility: "private",
    });

    expect(result).toEqual({ ok: true });
    expect(client.operations).toContainEqual({
      table: "sparkle_finder_profiles",
      type: "update",
      values: {
        display_name: "Casey Collector",
        tiktok_handle: "@casey_photo",
        bio: "Photo upload profile.",
        photo_url: photoDataUrl,
        profile_visibility: "private",
      },
      filters: [
        ["user_id", "user-123"],
      ],
    });
  });

  it("persists Silver profile display name edits", async () => {
    const accountState = currentAccountState("silver_paid");
    const client = createFakePersistenceClient({
      profile: { user_id: accountState.customer.id },
    });

    const result = await persistSilverProfileForAccount(client, accountState, {
      bio: "Renamed from the Silver profile form.",
      displayName: "Louis Sparkle",
      tiktokHandle: "@louis_sparkle",
      visibility: "private",
    });

    expect(result).toEqual({ ok: true });
    expect(client.operations).toContainEqual({
      table: "sparkle_finder_profiles",
      type: "update",
      values: {
        display_name: "Louis Sparkle",
        tiktok_handle: "@louis_sparkle",
        bio: "Renamed from the Silver profile form.",
        profile_visibility: "private",
      },
      filters: [
        ["user_id", "user-123"],
      ],
    });
  });

  it("preserves the existing persisted profile photo on text-only profile edits", async () => {
    const accountState = currentAccountState("silver_paid");
    const client = createFakePersistenceClient({
      profile: {
        user_id: accountState.customer.id,
        photo_url: "data:image/jpeg;base64,current-photo",
      },
    });

    const result = await persistSilverProfileForAccount(client, accountState, {
      bio: "Text-only profile edit.",
      displayName: "Louis Text Edit",
      tiktokHandle: "@louis_text",
      visibility: "private",
    });

    expect(result).toEqual({ ok: true });
    expect(client.operations).toContainEqual({
      table: "sparkle_finder_profiles",
      type: "update",
      values: {
        display_name: "Louis Text Edit",
        tiktok_handle: "@louis_text",
        bio: "Text-only profile edit.",
        profile_visibility: "private",
      },
      filters: [
        ["user_id", "user-123"],
      ],
    });
    expect(client.operations).not.toContainEqual(
      expect.objectContaining({
        values: expect.objectContaining({ photo_url: expect.any(String) }),
      }),
    );
  });

  it("rejects persisted Silver profile saves when Supabase does not return the saved profile row", async () => {
    const accountState = currentAccountState("silver_paid");
    const client = createFakePersistenceClient({
      profile: { user_id: accountState.customer.id },
      profileWriteResult: null,
    });

    const result = await persistSilverProfileForAccount(client, accountState, {
      displayName: "Louis Sparkle",
      tiktokHandle: "@louis_sparkle",
      visibility: "private",
    });

    expect(result).toEqual({ ok: false, reason: "save_failed" });
  });

  it("lets Free accounts persist a profile and still blocks collection writes", async () => {
    const accountState = currentAccountState("free");
    const client = createFakePersistenceClient({});

    const profileResult = await persistSilverProfileForAccount(client, accountState, {
      bio: "Free profile.",
      tiktokHandle: "@free_user",
      visibility: "sparkle_finder",
    });
    const collectionResult = await persistCollectionItemForAccount(client, accountState, {
      jewelryItemId: "jewel-rainbow-crown-ring",
      state: "owned",
      note: "Should not save.",
      isHighlighted: true,
    });

    expect(profileResult).toEqual({ ok: true });
    expect(collectionResult).toEqual({ ok: false, reason: "silver_required" });
    expect(client.operations.some((operation) => operation.table === "sparkle_finder_profiles")).toBe(true);
    expect(client.operations.some((operation) => operation.table === "sparkle_finder_collection_items")).toBe(false);
  });

  it("rejects unknown jewelry item ids in the Silver collection server action before persistence", async () => {
    const accountState = currentAccountState("silver_paid");
    const client = createFakePersistenceClient({});
    const getUser = vi.fn().mockResolvedValue({
      data: { user: { id: accountState.customer.id } },
      error: null,
    });
    const revalidatePath = vi.fn();

    vi.doMock("next/cache", () => ({ revalidatePath }));
    vi.doMock("../../lib/supabase/server", () => ({
      createClient: async () => ({
        ...client,
        auth: { getUser },
      }),
    }));
    vi.doMock("../../lib/sparkle-finder/account-service", () => ({
      getCurrentSparkleFinderAccount: async () => accountState,
    }));

    const { saveSilverCollectionItemAction } = await import("../../app/(hub)/silver/actions");
    const formData = new FormData();
    formData.set("jewelryItemId", "jewel-not-in-library");
    formData.set("state", "owned");
    formData.set("note", "Should not persist.");
    formData.set("isHighlighted", "yes");

    const result = await saveSilverCollectionItemAction({ status: "idle", message: "" }, formData);

    expect(result).toEqual({
      status: "denied",
      message: "Collection item is not available in the Sparkle Finder library.",
    });
    expect(getUser).toHaveBeenCalled();
    expect(client.operations).toEqual([]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

function currentAccountState(accessState: SparkleFinderAccessState): CurrentSparkleFinderAccountState & { status: "authenticated" } {
  const hasSilverAccess = accessState !== "free";
  const tier = hasSilverAccess ? "silver" : "free";

  return {
    status: "authenticated",
    tier,
    displayName: "Casey Collector",
    email: "casey@example.test",
    customer: {
      id: "user-123",
      displayName: "Casey Collector",
      email: "casey@example.test",
      state: "PA",
      tier,
    },
    membership: {
      accountId: "user-123",
      personId: "user-123",
      accessState,
      silverSource: accessState === "silver_rep_included" ? "sparkle_suite_rep" : accessState === "silver_paid" ? "stripe" : accessState === "silver_trial" ? "trial" : "none",
      trialStartedAt: accessState === "silver_trial" ? "2026-05-01T12:00:00.000Z" : null,
      trialEndsAt: accessState === "silver_trial" ? "2026-06-15T12:00:00.000Z" : null,
      silverStartedAt: hasSilverAccess ? "2026-05-01T12:00:00.000Z" : null,
      silverEndsAt: null,
      effectiveState: accessState,
      hasSilverAccess,
      isTrialActive: accessState === "silver_trial",
      isTrialExpired: false,
    },
    communicationConsent: {
      accountEmailRequired: true,
      accountSmsAllowed: false,
      accountSmsConsentedAt: null,
      promotionalEmailOptIn: false,
      promotionalSmsOptIn: false,
      promotionalEmailConsentedAt: null,
      promotionalSmsConsentedAt: null,
      privacyAcknowledgedAt: "2026-05-01T12:00:00.000Z",
    },
  };
}

function createFakePersistenceClient({
  profile = null,
  profileWriteResult,
  profileInsertError = null,
  collectionItem = null,
  collectionSelectError = null,
  showcaseCollection = null,
  showcaseCollectionJoin = null,
}: {
  profile?: { user_id: string } | null;
  profileWriteResult?: { user_id: string } | null;
  profileInsertError?: Error | null;
  collectionItem?: { id: string; user_id: string } | null;
  collectionSelectError?: Error | null;
  showcaseCollection?: { id: string; user_id: string; slug: string } | null;
  showcaseCollectionJoin?: { showcase_collection_id: string; collection_item_id: string } | null;
}) {
  const operations: Array<{
    table: string;
    type: "insert" | "update" | "upsert";
    values: Record<string, unknown>;
    filters?: Array<[string, string]>;
    options?: Record<string, unknown>;
  }> = [];
  let profileRecord: Record<string, unknown> | null = profile;
  let collectionItemRecord: Record<string, unknown> | null = collectionItem;
  let showcaseCollectionRecord: Record<string, unknown> | null = showcaseCollection;
  let showcaseCollectionJoinRecord: Record<string, unknown> | null = showcaseCollectionJoin;

  return {
    operations,
    from(table: string) {
      return {
        select: () => createFilterBuilder(async () => selectResultForTable(table)),
        update: (values: Record<string, unknown>) =>
          createFilterBuilder(async (filters) => {
            operations.push({ table, type: "update", values, filters });
            if (table === "sparkle_finder_profiles") {
              profileRecord =
                profileWriteResult === undefined
                  ? { ...(profileRecord ?? { user_id: filters.find(([column]) => column === "user_id")?.[1] ?? "" }), ...values }
                  : profileWriteResult;
            }
            return { data: null, error: null };
          }),
        insert: async (values: Record<string, unknown>) => {
          operations.push({ table, type: "insert", values });
          if (table === "sparkle_finder_profiles" && profileInsertError) {
            return { data: null, error: profileInsertError };
          }
          if (table === "sparkle_finder_profiles") {
            profileRecord = profileWriteResult === undefined ? values : profileWriteResult;
          }
          if (table === "sparkle_finder_showcase_collections") {
            showcaseCollectionRecord = {
              id: "showcase-collection-created",
              ...values,
            };
          }
          if (table === "sparkle_finder_showcase_collection_items") {
            showcaseCollectionJoinRecord = values;
          }
          return { data: null, error: null };
        },
        upsert: async (values: Record<string, unknown>, options: Record<string, unknown>) => {
          operations.push({ table, type: "upsert", values, options });
          if (table === "sparkle_finder_collection_items") {
            collectionItemRecord = {
              id: collectionItemRecord?.id ?? "collection-upserted",
              ...values,
            };
          }
          return { data: null, error: null };
        },
      };
    },
  };

  function selectResultForTable(table: string): Promise<{ data: unknown; error: unknown }> {
    const selectRows: Record<string, unknown> = {
      sparkle_finder_profiles: profileRecord,
      sparkle_finder_collection_items: collectionItemRecord,
      sparkle_finder_showcase_collections: showcaseCollectionRecord,
      sparkle_finder_showcase_collection_items: showcaseCollectionJoinRecord,
    };

    if (table === "sparkle_finder_collection_items" && collectionSelectError) {
      throw collectionSelectError;
    }

    return Promise.resolve({ data: selectRows[table] ?? null, error: null });
  }
}

function createFilterBuilder(
  execute: (filters: Array<[string, string]>) => Promise<{ data: unknown; error: unknown }>,
) {
  const filters: Array<[string, string]> = [];
  const builder = {
    eq(column: string, value: string) {
      filters.push([column, value]);
      return builder;
    },
    maybeSingle() {
      return execute(filters);
    },
    then<TResult1 = { data: unknown; error: unknown }, TResult2 = never>(
      onfulfilled?: ((value: { data: unknown; error: unknown }) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) {
      return execute(filters).then(onfulfilled, onrejected);
    },
  };

  return builder;
}
