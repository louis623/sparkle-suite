import {
  sparkleFinderFavoriteReps,
  sparkleFinderLiveShows,
  sparkleFinderRepBoardListings,
  sparkleFinderReps,
} from "../fixtures/sparkle-finder-fixtures";
import type { FavoriteRep, FavoriteRepCard } from "./social-types";

type SupabaseReadResult = PromiseLike<{ data: unknown; error: unknown }>;

export type SupabaseFavoriteRepsReadClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => SupabaseReadResult;
    };
  };
};

export type SupabaseFavoriteRepCountsClient = {
  rpc: (functionName: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
};

type FavoriteRepDetailRow = {
  favorite_rep_id?: unknown;
  notes?: unknown;
  notify_next_show?: unknown;
};

export function getFavoriteRepCardsForUser(input: {
  userId: string;
  hasSilverAccess: boolean;
}): FavoriteRepCard[] {
  const cards = sparkleFinderFavoriteReps
    .filter((favorite) => favorite.userId === input.userId)
    .map((favorite) => mapFavoriteRepCard(favorite, input.hasSilverAccess));

  return sortFavoriteRepCards(cards);
}

export function getFavoriteRepIdsForUser(userId: string): Set<string> {
  return new Set(
    sparkleFinderFavoriteReps
      .filter((favorite) => favorite.userId === userId)
      .map((favorite) => favorite.repId),
  );
}

export function getFavoriteRepCounts(): Map<string, number> {
  const counts = new Map<string, number>();

  for (const favorite of sparkleFinderFavoriteReps) {
    counts.set(favorite.repId, (counts.get(favorite.repId) ?? 0) + 1);
  }

  return counts;
}

export async function getPersistedFavoriteRepCounts(
  supabase: SupabaseFavoriteRepCountsClient,
  repIds: readonly string[],
): Promise<Map<string, number> | null> {
  const safeRepIds = [...new Set(repIds.map((repId) => repId.trim()).filter((repId) => repId.length > 0 && repId.length <= 200))].slice(0, 200);

  if (safeRepIds.length === 0) {
    return new Map();
  }

  try {
    const result = await supabase.rpc("get_sparkle_finder_rep_favorite_counts", { p_rep_ids: safeRepIds });

    if (result.error || !Array.isArray(result.data)) {
      return null;
    }

    const counts = new Map<string, number>();

    for (const row of result.data) {
      const record = asRecord(row);
      const repId = readString(record?.rep_id);
      const favoriteCount = readNonNegativeInteger(record?.favorite_count);

      if (repId && favoriteCount !== null) {
        counts.set(repId, favoriteCount);
      }
    }

    return counts;
  } catch {
    return null;
  }
}

export async function getPersistedFavoriteRepIdsForUser(input: {
  supabase: SupabaseFavoriteRepsReadClient;
  userId: string;
}): Promise<string[] | null> {
  try {
    const result = await input.supabase
      .from("sparkle_finder_favorite_reps")
      .select("rep_id")
      .eq("user_id", input.userId);

    if (result.error || !Array.isArray(result.data)) {
      return null;
    }

    return [...new Set(result.data.map((row) => readString(asRecord(row)?.rep_id)).filter(Boolean))];
  } catch {
    return null;
  }
}

export function isRepFavoritedByUser(input: { userId: string; repId: string }): boolean {
  return sparkleFinderFavoriteReps.some(
    (favorite) => favorite.userId === input.userId && favorite.repId === input.repId,
  );
}

export async function getPersistedFavoriteRepCardsForUser(input: {
  supabase: SupabaseFavoriteRepsReadClient;
  userId: string;
  hasSilverAccess: boolean;
}): Promise<FavoriteRepCard[] | null> {
  try {
    const favoritesResult = await input.supabase
      .from("sparkle_finder_favorite_reps")
      .select("id,user_id,rep_id,rep_display_name,rep_site_url,rep_board_url,created_at,updated_at")
      .eq("user_id", input.userId);

    if (favoritesResult.error || !Array.isArray(favoritesResult.data)) {
      return null;
    }

    const detailMap = await getFavoriteRepDetailMap(input.supabase, input.userId);

    if (!detailMap) {
      return null;
    }

    const cards = favoritesResult.data
      .flatMap((row) => {
        const favorite = mapPersistedFavoriteRep(row, input.userId, detailMap);

        return favorite ? [mapFavoriteRepCard(favorite, input.hasSilverAccess)] : [];
      });

    return sortFavoriteRepCards(cards);
  } catch {
    return null;
  }
}

export function sortFavoriteRepCards(cards: FavoriteRepCard[]): FavoriteRepCard[] {
  return [...cards].sort((left, right) => {
    const leftShowTime = getNextShowTime(left.nextShowAt);
    const rightShowTime = getNextShowTime(right.nextShowAt);

    if (leftShowTime !== null && rightShowTime !== null && leftShowTime !== rightShowTime) {
      return leftShowTime - rightShowTime;
    }

    if (leftShowTime !== null && rightShowTime === null) {
      return -1;
    }

    if (leftShowTime === null && rightShowTime !== null) {
      return 1;
    }

    return left.repDisplayName.localeCompare(right.repDisplayName);
  });
}

function getNextShowTime(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const time = Date.parse(value);

  return Number.isNaN(time) ? null : time;
}

function mapFavoriteRepCard(favorite: FavoriteRep, hasSilverAccess: boolean): FavoriteRepCard {
  const rep = sparkleFinderReps.find((candidate) => candidate.id === favorite.repId);
  const nextShow = rep
    ? sparkleFinderLiveShows.find((show) => show.id === rep.nextLiveShowId && show.status !== "completed")
    : undefined;
  const boardListings = sparkleFinderRepBoardListings.filter(
    (listing) => listing.repId === favorite.repId && listing.status === "available",
  );
  const firstBoardUrl = boardListings[0]?.boardUrl ?? null;

  return {
    ...favorite,
    repDisplayName: rep?.displayName ?? favorite.repDisplayName,
    repSiteUrl: rep?.siteUrl ?? favorite.repSiteUrl,
    repBoardUrl: favorite.repBoardUrl ?? firstBoardUrl,
    notes: favorite.notes,
    notifyNextShow: favorite.notifyNextShow,
    nextShowAt: nextShow?.startsAt ?? null,
    nextShowTitle: nextShow?.title ?? null,
    boardItemCount: boardListings.length,
    isSilverEnhanced: hasSilverAccess,
  };
}

async function getFavoriteRepDetailMap(
  supabase: SupabaseFavoriteRepsReadClient,
  userId: string,
): Promise<Map<string, Pick<FavoriteRep, "notes" | "notifyNextShow">> | null> {
  const detailsResult = await supabase
    .from("sparkle_finder_favorite_rep_details")
    .select("favorite_rep_id,notes,notify_next_show")
    .eq("user_id", userId);

  if (detailsResult.error || !Array.isArray(detailsResult.data)) {
    return null;
  }

  const details = new Map<string, Pick<FavoriteRep, "notes" | "notifyNextShow">>();

  for (const row of detailsResult.data) {
    const record = asRecord(row) as FavoriteRepDetailRow | null;
    const favoriteRepId = readString(record?.favorite_rep_id);

    if (favoriteRepId) {
      details.set(favoriteRepId, {
        notes: readString(record?.notes),
        notifyNextShow: record?.notify_next_show === true,
      });
    }
  }

  return details;
}

function mapPersistedFavoriteRep(
  row: unknown,
  expectedUserId: string,
  details: Map<string, Pick<FavoriteRep, "notes" | "notifyNextShow">>,
): FavoriteRep | null {
  const record = asRecord(row);
  const id = readString(record?.id);
  const userId = readString(record?.user_id);
  const repId = readString(record?.rep_id);

  if (!id || userId !== expectedUserId || !repId) {
    return null;
  }

  const detail = details.get(id);

  return {
    id,
    userId,
    repId,
    repDisplayName: readString(record?.rep_display_name),
    repSiteUrl: readNullableString(record?.rep_site_url),
    repBoardUrl: readNullableString(record?.rep_board_url),
    notes: detail?.notes ?? "",
    notifyNextShow: detail?.notifyNextShow ?? false,
    createdAt: readString(record?.created_at),
    updatedAt: readString(record?.updated_at),
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readNullableString(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function readNonNegativeInteger(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.floor(parsed);
}
