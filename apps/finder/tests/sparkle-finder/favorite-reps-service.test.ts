import { describe, expect, it, vi } from "vitest";
import {
  getFavoriteRepCardsForUser,
  getPersistedFavoriteRepCounts,
  getPersistedFavoriteRepCardsForUser,
  getPersistedFavoriteRepIdsForUser,
  getFavoriteRepIdsForUser,
  isRepFavoritedByUser,
  sortFavoriteRepCards,
} from "../../lib/sparkle-finder/favorite-reps-service";
import type { FavoriteRepCard } from "../../lib/sparkle-finder/social-types";

describe("Favorite reps service", () => {
  it("returns favorite rep cards with next show and board links", () => {
    const cards = getFavoriteRepCardsForUser({
      userId: "customer-silver-sparkle-mama",
      hasSilverAccess: true,
    });

    expect(cards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          repId: "rep-kelli",
          repDisplayName: "Kelli Jo",
          repSiteUrl: "https://sparklesuite.example/reps/kelli",
          repBoardUrl: "https://sparklesuite.example/reps/kelli/board/moon-orbit",
          nextShowAt: "2026-05-30T16:30:00-04:00",
          nextShowTitle: "Glimmer Room",
          boardItemCount: 1,
        }),
      ]),
    );
  });

  it("shows free favorite rep notes", () => {
    const cards = getFavoriteRepCardsForUser({
      userId: "customer-free-marlena",
      hasSilverAccess: false,
    });

    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      repId: "rep-maya",
      notes: "Saturday show reminder.",
      notifyNextShow: true,
      isSilverEnhanced: false,
    });
  });

  it("enables Silver enhanced notes and filters", () => {
    const cards = getFavoriteRepCardsForUser({
      userId: "customer-silver-sparkle-mama",
      hasSilverAccess: true,
    });

    expect(cards.every((card) => card.isSilverEnhanced)).toBe(true);
    expect(cards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          repId: "rep-kelli",
          notes: "Great ring lives and easy Saturday rewatch.",
          notifyNextShow: true,
        }),
      ]),
    );
    expect(getFavoriteRepIdsForUser("customer-silver-sparkle-mama")).toEqual(new Set(["rep-kelli", "rep-sierra"]));
    expect(isRepFavoritedByUser({ userId: "customer-silver-sparkle-mama", repId: "rep-kelli" })).toBe(true);
  });

  it("sorts favorite reps by next show first, then display name", () => {
    const cards: FavoriteRepCard[] = [
      favoriteCard({ id: "3", repDisplayName: "Zara", nextShowAt: null }),
      favoriteCard({ id: "1", repDisplayName: "Kelli Jo", nextShowAt: "2026-05-30T16:30:00-04:00" }),
      favoriteCard({ id: "2", repDisplayName: "Lindsay Lucas", nextShowAt: "2026-05-30T11:00:00-04:00" }),
      favoriteCard({ id: "4", repDisplayName: "Ada", nextShowAt: null }),
    ];

    expect(sortFavoriteRepCards(cards).map((card) => card.repDisplayName)).toEqual([
      "Lindsay Lucas",
      "Kelli Jo",
      "Ada",
      "Zara",
    ]);
  });

  it("sorts next shows chronologically across timezone offsets", () => {
    const cards: FavoriteRepCard[] = [
      favoriteCard({
        id: "later",
        repDisplayName: "Later Rep",
        nextShowAt: "2026-05-30T08:30:00-07:00",
      }),
      favoriteCard({
        id: "earlier",
        repDisplayName: "Earlier Rep",
        nextShowAt: "2026-05-30T11:00:00-04:00",
      }),
    ];

    expect(sortFavoriteRepCards(cards).map((card) => card.repDisplayName)).toEqual([
      "Earlier Rep",
      "Later Rep",
    ]);
  });

  it("does not expose favorite reps across users", () => {
    const freeCards = getFavoriteRepCardsForUser({
      userId: "customer-free-marlena",
      hasSilverAccess: true,
    });

    expect(freeCards.map((card) => card.repId)).toEqual(["rep-maya"]);
    expect(isRepFavoritedByUser({ userId: "customer-free-marlena", repId: "rep-kelli" })).toBe(false);
  });

  it("maps persisted favorite reps with Silver-only private details", async () => {
    const client = createFavoriteReadClient({
      favorites: [
        {
          id: "persisted-favorite-kelli",
          user_id: "user-123",
          rep_id: "rep-kelli",
          rep_display_name: "Saved Kelli",
          rep_site_url: "https://sparklesuite.example/reps/kelli",
          rep_board_url: null,
          created_at: "2026-06-17T12:00:00.000Z",
          updated_at: "2026-06-17T12:00:00.000Z",
        },
      ],
      details: [
        {
          favorite_rep_id: "persisted-favorite-kelli",
          notes: "Ring lives after dinner.",
          notify_next_show: true,
          user_id: "user-123",
        },
      ],
    });

    const cards = await getPersistedFavoriteRepCardsForUser({
      supabase: client,
      userId: "user-123",
      hasSilverAccess: true,
    });

    expect(cards).toEqual([
      expect.objectContaining({
        id: "persisted-favorite-kelli",
        repId: "rep-kelli",
        repDisplayName: "Kelli Jo",
        repBoardUrl: "https://sparklesuite.example/reps/kelli/board/moon-orbit",
        notes: "Ring lives after dinner.",
        notifyNextShow: true,
        isSilverEnhanced: true,
      }),
    ]);
    expect(client.readTables).toEqual(["sparkle_finder_favorite_reps", "sparkle_finder_favorite_rep_details"]);
  });

  it("loads favorite notes for Free accounts", async () => {
    const client = createFavoriteReadClient({
      favorites: [
        {
          id: "persisted-favorite-kelli",
          user_id: "user-123",
          rep_id: "rep-kelli",
          rep_display_name: "Saved Kelli",
          rep_site_url: "https://sparklesuite.example/reps/kelli",
          rep_board_url: null,
          created_at: "2026-06-17T12:00:00.000Z",
          updated_at: "2026-06-17T12:00:00.000Z",
        },
      ],
      details: [
        {
          favorite_rep_id: "persisted-favorite-kelli",
          notes: "Saturday show reminder.",
          notify_next_show: true,
          user_id: "user-123",
        },
      ],
    });

    const cards = await getPersistedFavoriteRepCardsForUser({
      supabase: client,
      userId: "user-123",
      hasSilverAccess: false,
    });

    expect(cards?.[0]).toMatchObject({
      notes: "Saturday show reminder.",
      notifyNextShow: true,
      isSilverEnhanced: false,
    });
    expect(client.readTables).toEqual(["sparkle_finder_favorite_reps", "sparkle_finder_favorite_rep_details"]);
  });

  it("distinguishes empty persisted reads from failed persisted reads", async () => {
    await expect(
      getPersistedFavoriteRepCardsForUser({
        supabase: createFavoriteReadClient({ favorites: [] }),
        userId: "user-123",
        hasSilverAccess: false,
      }),
    ).resolves.toEqual([]);

    await expect(
      getPersistedFavoriteRepCardsForUser({
        supabase: createFavoriteReadClient({ favorites: [], failTables: new Set(["sparkle_finder_favorite_reps"]) }),
        userId: "user-123",
        hasSilverAccess: false,
      }),
    ).resolves.toBeNull();
  });

  it("reads only favorite rep ids for directory heart state", async () => {
    const client = createFavoriteReadClient({
      favorites: [
        { rep_id: "rep-kelli", user_id: "user-123" },
        { rep_id: "rep-kelli", user_id: "user-123" },
        { rep_id: "rep-maya", user_id: "user-123" },
      ],
    });

    await expect(getPersistedFavoriteRepIdsForUser({ supabase: client, userId: "user-123" })).resolves.toEqual([
      "rep-kelli",
      "rep-maya",
    ]);
    expect(client.readTables).toEqual(["sparkle_finder_favorite_reps"]);
  });

  it("reads bounded aggregate favorite counts without exposing customer identities", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        { rep_id: "rep-kelli", favorite_count: "3" },
        { rep_id: "rep-maya", favorite_count: 1 },
        { rep_id: "rep-bad", favorite_count: -1 },
      ],
      error: null,
    });
    const tooLong = `rep-${"x".repeat(201)}`;

    const counts = await getPersistedFavoriteRepCounts({ rpc }, [" rep-kelli ", "rep-kelli", "rep-maya", tooLong]);

    expect(rpc).toHaveBeenCalledWith("get_sparkle_finder_rep_favorite_counts", {
      p_rep_ids: ["rep-kelli", "rep-maya"],
    });
    expect(counts).toEqual(new Map([["rep-kelli", 3], ["rep-maya", 1]]));
  });

  it("distinguishes aggregate count failures from honest zero counts", async () => {
    await expect(getPersistedFavoriteRepCounts({ rpc: vi.fn() }, [])).resolves.toEqual(new Map());
    await expect(
      getPersistedFavoriteRepCounts(
        { rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "unavailable" } }) },
        ["rep-kelli"],
      ),
    ).resolves.toBeNull();
  });
});

function favoriteCard(overrides: Partial<FavoriteRepCard>): FavoriteRepCard {
  return {
    id: "favorite",
    userId: "user",
    repId: "rep",
    repDisplayName: "Rep",
    repSiteUrl: null,
    repBoardUrl: null,
    notes: "",
    notifyNextShow: false,
    createdAt: "2026-06-17T12:00:00.000Z",
    updatedAt: "2026-06-17T12:00:00.000Z",
    nextShowAt: null,
    nextShowTitle: null,
    boardItemCount: 0,
    isSilverEnhanced: false,
    ...overrides,
  };
}

function createFavoriteReadClient({
  favorites,
  details = [],
  failTables = new Set<string>(),
}: {
  favorites: Array<Record<string, unknown>>;
  details?: Array<Record<string, unknown>>;
  failTables?: Set<string>;
}) {
  const readTables: string[] = [];

  return {
    readTables,
    from(table: string) {
      return {
        select: () => ({
          eq: async (column: string, value: string) => {
            readTables.push(table);

            if (failTables.has(table)) {
              return { data: null, error: { message: "read failed" } };
            }

            const rows = table === "sparkle_finder_favorite_rep_details" ? details : favorites;

            return {
              data: rows.filter((row) => row[column] === value),
              error: null,
            };
          },
        }),
      };
    },
  };
}
