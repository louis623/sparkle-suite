import { afterEach, describe, expect, it, vi } from "vitest";
import type { CurrentSparkleFinderAccountState } from "../../lib/sparkle-finder/account-service";
import type { SparkleFinderAccessState } from "../../lib/sparkle-finder/account-types";
import {
  deleteFavoriteRepForAccount,
  persistFavoriteRepForAccount,
  persistFavoriteRepNotesForAccount,
} from "../../lib/sparkle-finder/favorite-reps-state";

describe("Favorite reps persistence", () => {
  it("inserts a compact favorite rep row for the authenticated account", async () => {
    const client = createFavoriteRepClient();

    const result = await persistFavoriteRepForAccount(client, currentAccountState("free"), {
      repId: "rep-kelli",
      repDisplayName: "Kelli Jo",
      repSiteUrl: "https://sparklesuite.example/reps/kelli",
      repBoardUrl: "https://sparklesuite.example/reps/kelli/board",
    });

    expect(result).toEqual({ ok: true });
    expect(client.operations).toEqual([
      {
        type: "upsert",
        table: "sparkle_finder_favorite_reps",
        values: {
          user_id: "user-123",
          rep_id: "rep-kelli",
          rep_display_name: "Kelli Jo",
          rep_site_url: "https://sparklesuite.example/reps/kelli",
          rep_board_url: "https://sparklesuite.example/reps/kelli/board",
        },
        options: {
          onConflict: "user_id,rep_id",
        },
      },
    ]);
  });

  it("deletes only the authenticated account favorite row", async () => {
    const client = createFavoriteRepClient({
      favorites: [
        favoriteRow({ id: "favorite-owned", user_id: "user-123", rep_id: "rep-kelli" }),
        favoriteRow({ id: "favorite-other", user_id: "user-456", rep_id: "rep-kelli" }),
      ],
    });

    const result = await deleteFavoriteRepForAccount(client, currentAccountState("free"), "rep-kelli");

    expect(result).toEqual({ ok: true });
    expect(client.favorites).toEqual([favoriteRow({ id: "favorite-other", user_id: "user-456", rep_id: "rep-kelli" })]);
    expect(client.operations).toEqual([
      {
        type: "delete",
        table: "sparkle_finder_favorite_reps",
        filters: [
          ["user_id", "user-123"],
          ["rep_id", "rep-kelli"],
        ],
      },
    ]);
  });

  it("updates favorite rep notes only for Silver accounts", async () => {
    const client = createFavoriteRepClient({
      favorites: [favoriteRow({ id: "favorite-owned", user_id: "user-123", rep_id: "rep-kelli" })],
    });

    const result = await persistFavoriteRepNotesForAccount(client, currentAccountState("silver_paid"), {
      repId: "rep-kelli",
      notes: " Great ring lives. ",
    });

    expect(result).toEqual({ ok: true });
    expect(client.operations).toEqual([
      {
        type: "upsert",
        table: "sparkle_finder_favorite_rep_details",
        values: {
          favorite_rep_id: "favorite-owned",
          user_id: "user-123",
          notes: "Great ring lives.",
          notify_next_show: false,
        },
        options: {
          onConflict: "favorite_rep_id",
        },
      },
    ]);
  });

  it("saves favorite rep notes for Free accounts", async () => {
    const client = createFavoriteRepClient({
      favorites: [favoriteRow({ id: "favorite-owned", user_id: "user-123", rep_id: "rep-kelli" })],
    });

    const result = await persistFavoriteRepNotesForAccount(client, currentAccountState("free"), {
      repId: "rep-kelli",
      notes: "Private note.",
    });

    expect(result).toEqual({ ok: true });
    expect(client.operations).toEqual([
      expect.objectContaining({
        type: "upsert",
        table: "sparkle_finder_favorite_rep_details",
        values: expect.objectContaining({
          notes: "Private note.",
          user_id: "user-123",
        }),
      }),
    ]);
  });

  it("returns a friendly unavailable result when favorite persistence fails", async () => {
    const client = createFavoriteRepClient({ failWrites: true });

    const result = await persistFavoriteRepForAccount(client, currentAccountState("free"), {
      repId: "rep-kelli",
      repDisplayName: "Kelli Jo",
      repSiteUrl: "",
      repBoardUrl: "",
    });

    expect(result).toEqual({ ok: false, reason: "favorite_unavailable" });
  });

  it("drops untrusted favorite rep URLs before persistence", async () => {
    const client = createFavoriteRepClient();

    const result = await persistFavoriteRepForAccount(client, currentAccountState("free"), {
      repId: "rep-kelli",
      repDisplayName: "Kelli Jo",
      repSiteUrl: "javascript:alert(1)",
      repBoardUrl: "https://evil.example/reps/kelli/board",
    });

    expect(result).toEqual({ ok: true });
    expect(client.operations).toEqual([
      expect.objectContaining({
        type: "upsert",
        table: "sparkle_finder_favorite_reps",
        values: expect.objectContaining({
          rep_site_url: null,
          rep_board_url: null,
        }),
      }),
    ]);
  });

  it("lets a Free account save another favorite without a Silver cap", async () => {
    const clientAtCap = createFavoriteRepClient({
      favorites: Array.from({ length: 5 }, (_, index) =>
        favoriteRow({ id: `favorite-${index}`, user_id: "user-123", rep_id: `rep-${index}` }),
      ),
    });

    await expect(
      persistFavoriteRepForAccount(clientAtCap, currentAccountState("free"), {
        repId: "rep-new",
        repDisplayName: "New Rep",
        repSiteUrl: "",
        repBoardUrl: "",
      }),
    ).resolves.toEqual({ ok: true });
    expect(clientAtCap.operations).toEqual([
      expect.objectContaining({
        type: "upsert",
        table: "sparkle_finder_favorite_reps",
        values: expect.objectContaining({ rep_id: "rep-new" }),
      }),
    ]);

    const clientAlreadyFavorited = createFavoriteRepClient({
      favorites: Array.from({ length: 5 }, (_, index) =>
        favoriteRow({
          id: `favorite-${index}`,
          user_id: "user-123",
          rep_id: index === 0 ? "rep-kelli" : `rep-${index}`,
        }),
      ),
    });

    await expect(
      persistFavoriteRepForAccount(clientAlreadyFavorited, currentAccountState("free"), {
        repId: "rep-kelli",
        repDisplayName: "Kelli Jo",
        repSiteUrl: "",
        repBoardUrl: "",
      }),
    ).resolves.toEqual({ ok: true, alreadyFavorited: true });
    expect(clientAlreadyFavorited.operations).toEqual([]);
  });
});

describe("Favorite reps server actions", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("next/cache");
    vi.doUnmock("@/lib/supabase/server");
    vi.doUnmock("@/lib/sparkle-finder/account-service");
    vi.doUnmock("@/lib/sparkle-finder/catalog-service");
    vi.doUnmock("@/lib/sparkle-finder/favorite-reps-state");
  });

  it("favorites a rep for the verified Sparkle Finder account and revalidates social views", async () => {
    const accountState = currentAccountState("free");
    const revalidatePath = vi.fn();
    const persistFavoriteRepForAccount = vi.fn().mockResolvedValue({ ok: true });
    const client = authenticatedClient(accountState.customer.id);

    mockFavoriteActionDependencies({
      accountState,
      client,
      revalidatePath,
      persistFavoriteRepForAccount,
    });

    const { favoriteRepAction } = await import("../../app/(hub)/favorites/actions");
    const formData = new FormData();
    formData.set("repId", " rep-kelli ");
    formData.set("repDisplayName", " Kelli Jo ");
    formData.set("repSiteUrl", " https://sparklesuite.example/reps/kelli ");
    formData.set("repBoardUrl", " https://sparklesuite.example/reps/kelli/board ");

    const result = await favoriteRepAction({ status: "idle", message: "" }, formData);

    expect(result).toEqual({ status: "success", message: "Favorite rep saved." });
    expect(persistFavoriteRepForAccount).toHaveBeenCalledWith(client, accountState, {
      repId: "rep-kelli",
      repDisplayName: "Kelli Jo",
      repSiteUrl: "https://sparklesuite.example/reps/kelli",
      repBoardUrl: "https://sparklesuite.example/reps/kelli/board",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/favorites");
    expect(revalidatePath).toHaveBeenCalledWith("/silver");
    expect(revalidatePath).toHaveBeenCalledWith("/live-shows");
    expect(revalidatePath).toHaveBeenCalledWith("/rep-boards");
  });

  it("returns a friendly free-limit message when the favorite cap is reached", async () => {
    const accountState = currentAccountState("free");

    mockFavoriteActionDependencies({
      accountState,
      client: authenticatedClient(accountState.customer.id),
      persistFavoriteRepForAccount: vi.fn().mockResolvedValue({ ok: false, reason: "free_limit_reached" }),
    });

    const { favoriteRepAction } = await import("../../app/(hub)/favorites/actions");
    const formData = new FormData();
    formData.set("repId", "rep-kelli");

    await expect(favoriteRepAction({ status: "idle", message: "" }, formData)).resolves.toEqual({
      status: "error",
      message: "Free favorite rep limit reached. Silver can save more favorite reps.",
    });
  });

  it("rejects invented rep ids instead of trusting hidden form fields", async () => {
    const accountState = currentAccountState("free");
    const persistFavoriteRepForAccount = vi.fn();

    mockFavoriteActionDependencies({
      accountState,
      client: authenticatedClient(accountState.customer.id),
      directoryReps: [],
      persistFavoriteRepForAccount,
    });

    const { favoriteRepAction } = await import("../../app/(hub)/favorites/actions");
    const formData = new FormData();
    formData.set("repId", "rep-invented");
    formData.set("repDisplayName", "Invented Rep");

    await expect(favoriteRepAction({ status: "idle", message: "" }, formData)).resolves.toEqual({
      status: "error",
      message: "Favorite rep is unavailable.",
    });
    expect(persistFavoriteRepForAccount).not.toHaveBeenCalled();
  });

  it("deletes a favorite rep for the verified Sparkle Finder account", async () => {
    const accountState = currentAccountState("free");
    const revalidatePath = vi.fn();
    const deleteFavoriteRepForAccount = vi.fn().mockResolvedValue({ ok: true });
    const client = authenticatedClient(accountState.customer.id);

    mockFavoriteActionDependencies({
      accountState,
      client,
      revalidatePath,
      deleteFavoriteRepForAccount,
    });

    const { unfavoriteRepAction } = await import("../../app/(hub)/favorites/actions");
    const formData = new FormData();
    formData.set("repId", "rep-kelli");

    await expect(unfavoriteRepAction(formData)).resolves.toBeUndefined();
    expect(deleteFavoriteRepForAccount).toHaveBeenCalledWith(client, accountState, "rep-kelli");
    expect(revalidatePath).toHaveBeenCalledWith("/favorites");
    expect(revalidatePath).toHaveBeenCalledWith("/silver");
    expect(revalidatePath).toHaveBeenCalledWith("/live-shows");
    expect(revalidatePath).toHaveBeenCalledWith("/rep-boards");
  });

  it("saves Silver favorite rep notes and revalidates favorite views", async () => {
    const accountState = currentAccountState("silver_paid");
    const revalidatePath = vi.fn();
    const persistFavoriteRepNotesForAccount = vi.fn().mockResolvedValue({ ok: true });
    const client = authenticatedClient(accountState.customer.id);

    mockFavoriteActionDependencies({
      accountState,
      client,
      revalidatePath,
      persistFavoriteRepNotesForAccount,
    });

    const { saveFavoriteRepNotesAction } = await import("../../app/(hub)/favorites/actions");
    const formData = new FormData();
    formData.set("repId", "rep-kelli");
    formData.set("notes", " Great Saturday shows. ");

    const result = await saveFavoriteRepNotesAction({ status: "idle", message: "" }, formData);

    expect(result).toEqual({ status: "success", message: "Favorite rep notes saved." });
    expect(persistFavoriteRepNotesForAccount).toHaveBeenCalledWith(client, accountState, {
      repId: "rep-kelli",
      notes: "Great Saturday shows.",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/favorites");
    expect(revalidatePath).toHaveBeenCalledWith("/silver");
  });

  it("requires sign-in through the Sparkle Finder auth boundary", async () => {
    const persistFavoriteRepForAccount = vi.fn();

    mockFavoriteActionDependencies({
      accountState: anonymousAccountState(),
      client: authenticatedClient(null),
      persistFavoriteRepForAccount,
    });

    const { favoriteRepAction } = await import("../../app/(hub)/favorites/actions");
    const formData = new FormData();
    formData.set("repId", "rep-kelli");

    await expect(favoriteRepAction({ status: "idle", message: "" }, formData)).resolves.toEqual({
      status: "error",
      message: "Sign in to save favorite reps.",
    });
    expect(persistFavoriteRepForAccount).not.toHaveBeenCalled();
  });
});

type FavoriteRepRow = {
  id: string;
  user_id: string;
  rep_id: string;
  rep_display_name: string;
  rep_site_url: string | null;
  rep_board_url: string | null;
};

function createFavoriteRepClient({
  favorites = [],
  failWrites = false,
}: {
  favorites?: FavoriteRepRow[];
  failWrites?: boolean;
} = {}) {
  const operations: Array<Record<string, unknown>> = [];

  return {
    favorites: [...favorites],
    operations,
    from(table: string) {
      return {
        select: () => createQuery({ table, favorites: this.favorites }),
        upsert: async (values: Record<string, unknown>, options: Record<string, unknown>) => {
          if (failWrites) {
            return { data: null, error: { message: "write failed" } };
          }

          operations.push({ type: "upsert", table, values, options });
          return { data: null, error: null };
        },
        delete: () => createDeleteQuery({ table, favorites: this.favorites, operations }),
      };
    },
  };
}

function createQuery({
  table,
  favorites,
}: {
  table: string;
  favorites: FavoriteRepRow[];
}) {
  const filters: Array<[string, string]> = [];
  const query = {
    eq(column: string, value: string) {
      filters.push([column, value]);
      return query;
    },
    maybeSingle: async () => {
      if (table !== "sparkle_finder_favorite_reps") {
        return { data: null, error: null };
      }

      return { data: filterFavoriteRows(favorites, filters)[0] ?? null, error: null };
    },
    then(resolve: (value: { data: FavoriteRepRow[] | null; error: null }) => unknown) {
      return Promise.resolve({ data: filterFavoriteRows(favorites, filters), error: null }).then(resolve);
    },
  };

  return query;
}

function createDeleteQuery({
  table,
  favorites,
  operations,
}: {
  table: string;
  favorites: FavoriteRepRow[];
  operations: Array<Record<string, unknown>>;
}) {
  const filters: Array<[string, string]> = [];
  const query = {
    eq(column: string, value: string) {
      filters.push([column, value]);
      return query;
    },
    then(resolve: (value: { data: null; error: null }) => unknown) {
      operations.push({ type: "delete", table, filters: [...filters] });
      const remaining = favorites.filter((row) => !matchesFilters(row, filters));
      favorites.splice(0, favorites.length, ...remaining);
      return Promise.resolve({ data: null, error: null }).then(resolve);
    },
  };

  return query;
}

function filterFavoriteRows(rows: FavoriteRepRow[], filters: Array<[string, string]>): FavoriteRepRow[] {
  return rows.filter((row) => matchesFilters(row, filters));
}

function matchesFilters(row: FavoriteRepRow, filters: Array<[string, string]>): boolean {
  return filters.every(([column, value]) => row[column as keyof FavoriteRepRow] === value);
}

function favoriteRow(overrides: Partial<FavoriteRepRow>): FavoriteRepRow {
  return {
    id: "favorite",
    user_id: "user-123",
    rep_id: "rep-kelli",
    rep_display_name: "Kelli Jo",
    rep_site_url: null,
    rep_board_url: null,
    ...overrides,
  };
}

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
      silverSource: accessState === "silver_paid" ? "stripe" : "none",
      trialStartedAt: null,
      trialEndsAt: null,
      silverStartedAt: hasSilverAccess ? "2026-05-01T12:00:00.000Z" : null,
      silverEndsAt: null,
      effectiveState: accessState,
      hasSilverAccess,
      isTrialActive: false,
      isTrialExpired: false,
    },
    communicationConsent: {
      accountEmailRequired: true,
      accountSmsAllowed: false,
      accountSmsConsentedAt: null,
      promotionalEmailOptIn: false,
      promotionalEmailConsentedAt: null,
      promotionalSmsOptIn: false,
      promotionalSmsConsentedAt: null,
      privacyAcknowledgedAt: "2026-05-01T12:00:00.000Z",
    },
  };
}

function anonymousAccountState(): CurrentSparkleFinderAccountState {
  return {
    status: "anonymous",
    tier: "anonymous",
    displayName: "Guest",
    email: null,
    customer: null,
    communicationConsent: {
      accountEmailRequired: true,
      accountSmsAllowed: false,
      accountSmsConsentedAt: null,
      promotionalEmailOptIn: false,
      promotionalEmailConsentedAt: null,
      promotionalSmsOptIn: false,
      promotionalSmsConsentedAt: null,
      privacyAcknowledgedAt: null,
    },
  };
}

function authenticatedClient(userId: string | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: userId ? { id: userId } : null,
        },
        error: null,
      }),
    },
  };
}

function mockFavoriteActionDependencies({
  accountState,
  client,
  revalidatePath = vi.fn(),
  persistFavoriteRepForAccount = vi.fn().mockResolvedValue({ ok: true }),
  deleteFavoriteRepForAccount = vi.fn().mockResolvedValue({ ok: true }),
  persistFavoriteRepNotesForAccount = vi.fn().mockResolvedValue({ ok: true }),
  directoryReps = [
    {
      id: "rep-kelli",
      avatarUrl: "",
      businessName: "Kelli's Sparkle",
      displayName: "Kelli Jo",
      nextLiveShowId: "",
      siteUrl: "https://sparklesuite.example/reps/kelli",
      state: "",
    },
  ],
}: {
  accountState: CurrentSparkleFinderAccountState;
  client: ReturnType<typeof authenticatedClient>;
  revalidatePath?: ReturnType<typeof vi.fn>;
  persistFavoriteRepForAccount?: ReturnType<typeof vi.fn>;
  deleteFavoriteRepForAccount?: ReturnType<typeof vi.fn>;
  persistFavoriteRepNotesForAccount?: ReturnType<typeof vi.fn>;
  directoryReps?: Array<{
    id: string;
    avatarUrl: string;
    businessName: string;
    displayName: string;
    nextLiveShowId: string;
    siteUrl: string;
    state: string;
  }>;
}) {
  vi.doMock("next/cache", () => ({ revalidatePath }));
  vi.doMock("@/lib/supabase/server", () => ({
    createClient: vi.fn().mockResolvedValue(client),
  }));
  vi.doMock("@/lib/sparkle-finder/account-service", () => ({
    getCurrentSparkleFinderAccount: vi.fn().mockResolvedValue(accountState),
  }));
  vi.doMock("@/lib/sparkle-finder/catalog-service", () => ({
    getFinderRepDirectoryData: vi.fn().mockResolvedValue({
      boardListings: directoryReps.some((rep) => rep.id === "rep-kelli")
        ? [{ id: "board-kelli", boardUrl: "https://sparklesuite.example/reps/kelli/board", jewelryItemId: "", listedAt: "", repId: "rep-kelli", status: "available" }]
        : [],
      liveShows: [],
      reps: directoryReps,
      status: directoryReps.length > 0 ? "ready" : "empty",
    }),
    shouldUseCatalogFixtureFallback: vi.fn().mockReturnValue(false),
  }));
  vi.doMock("@/lib/sparkle-finder/favorite-reps-state", () => ({
    deleteFavoriteRepForAccount,
    persistFavoriteRepForAccount,
    persistFavoriteRepNotesForAccount,
  }));
}
