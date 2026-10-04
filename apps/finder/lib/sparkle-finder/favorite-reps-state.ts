import type { CurrentSparkleFinderAccountState } from "./account-service";
import { canFavoriteRep, normalizeFavoriteRepNote, normalizeRepId } from "./favorite-reps-actions";

export type FavoriteRepPersistenceReason =
  | "sign_in_required"
  | "favorite_unavailable"
  | "free_limit_reached"
  | "silver_required"
  | "notes_unavailable";

export type FavoriteRepPersistenceResult =
  | {
      ok: true;
      alreadyFavorited?: true;
    }
  | {
      ok: false;
      reason: FavoriteRepPersistenceReason;
    };

export type FavoriteRepPersistenceInput = {
  repId: string;
  repDisplayName: string;
  repSiteUrl: string;
  repBoardUrl: string;
};

export type FavoriteRepNotesPersistenceInput = {
  repId: string;
  notes: string;
};

type FavoriteRepRow = {
  id: string;
  user_id: string;
  rep_id: string;
};

type SupabasePersistenceResult = PromiseLike<{ data: unknown; error: unknown }>;

type SupabaseFilterBuilder = {
  eq: (column: string, value: string) => SupabaseFilterBuilder;
  maybeSingle?: () => SupabasePersistenceResult;
};

export type SupabaseFavoriteRepsClient = {
  from: (table: string) => {
    select: (columns: string) => SupabaseFilterBuilder;
    upsert: (values: Record<string, unknown>, options: { onConflict: string }) => SupabasePersistenceResult;
    delete: () => SupabaseFilterBuilder;
  };
};

export async function persistFavoriteRepForAccount(
  supabase: SupabaseFavoriteRepsClient,
  accountState: CurrentSparkleFinderAccountState,
  input: FavoriteRepPersistenceInput,
): Promise<FavoriteRepPersistenceResult> {
  if (accountState.status !== "authenticated") {
    return { ok: false, reason: "sign_in_required" };
  }

  const repId = normalizeRepId(input.repId);

  if (!repId) {
    return { ok: false, reason: "favorite_unavailable" };
  }

  const userId = accountState.customer.id;
  const existingFavorite = await findFavoriteRepRow(supabase, userId, repId);

  if (existingFavorite.error) {
    return { ok: false, reason: "favorite_unavailable" };
  }

  const favoritePermission = canFavoriteRep({
    userId,
    isAlreadyFavorited: Boolean(existingFavorite.row),
  });

  if (!favoritePermission.allowed) {
    return { ok: false, reason: favoritePermission.reason ?? "favorite_unavailable" };
  }

  if (favoritePermission.alreadyFavorited) {
    return { ok: true, alreadyFavorited: true };
  }

  const result = await supabase.from("sparkle_finder_favorite_reps").upsert(
    {
      user_id: userId,
      rep_id: repId,
      rep_display_name: cleanText(input.repDisplayName, 120),
      rep_site_url: cleanOptionalUrl(input.repSiteUrl),
      rep_board_url: cleanOptionalUrl(input.repBoardUrl),
    },
    {
      onConflict: "user_id,rep_id",
    },
  );

  return result.error ? { ok: false, reason: "favorite_unavailable" } : { ok: true };
}

export async function deleteFavoriteRepForAccount(
  supabase: SupabaseFavoriteRepsClient,
  accountState: CurrentSparkleFinderAccountState,
  repIdInput: string,
): Promise<FavoriteRepPersistenceResult> {
  if (accountState.status !== "authenticated") {
    return { ok: false, reason: "sign_in_required" };
  }

  const repId = normalizeRepId(repIdInput);

  if (!repId) {
    return { ok: false, reason: "favorite_unavailable" };
  }

  const result = (await supabase
    .from("sparkle_finder_favorite_reps")
    .delete()
    .eq("user_id", accountState.customer.id)
    .eq("rep_id", repId)) as unknown as { data: unknown; error: unknown };

  return result.error ? { ok: false, reason: "favorite_unavailable" } : { ok: true };
}

export async function persistFavoriteRepNotesForAccount(
  supabase: SupabaseFavoriteRepsClient,
  accountState: CurrentSparkleFinderAccountState,
  input: FavoriteRepNotesPersistenceInput,
): Promise<FavoriteRepPersistenceResult> {
  if (accountState.status !== "authenticated") {
    return { ok: false, reason: "sign_in_required" };
  }

  const repId = normalizeRepId(input.repId);

  if (!repId) {
    return { ok: false, reason: "notes_unavailable" };
  }

  const existingFavorite = await findFavoriteRepRow(supabase, accountState.customer.id, repId);

  if (existingFavorite.error || !existingFavorite.row) {
    return { ok: false, reason: "notes_unavailable" };
  }

  const result = await supabase.from("sparkle_finder_favorite_rep_details").upsert(
    {
      favorite_rep_id: existingFavorite.row.id,
      user_id: accountState.customer.id,
      notes: normalizeFavoriteRepNote(input.notes),
      notify_next_show: false,
    },
    {
      onConflict: "favorite_rep_id",
    },
  );

  return result.error ? { ok: false, reason: "notes_unavailable" } : { ok: true };
}

async function findFavoriteRepRow(
  supabase: SupabaseFavoriteRepsClient,
  userId: string,
  repId: string,
): Promise<{ row: FavoriteRepRow | null; error: unknown }> {
  const result = await safeMaybeSingle(
    supabase.from("sparkle_finder_favorite_reps").select("id,user_id,rep_id").eq("user_id", userId).eq("rep_id", repId),
  );

  return {
    row: result.data ? (result.data as FavoriteRepRow) : null,
    error: result.error,
  };
}

async function safeMaybeSingle(builder: SupabaseFilterBuilder): Promise<{ data: unknown; error: unknown }> {
  if (!builder.maybeSingle) {
    return { data: null, error: null };
  }

  try {
    return await builder.maybeSingle();
  } catch (error) {
    return { data: null, error };
  }
}

function cleanText(value: string, maxLength: number): string {
  return String(value ?? "")
    .trim()
    .slice(0, maxLength);
}

function cleanOptionalUrl(value: string): string | null {
  const cleaned = cleanText(value, 500);

  if (!cleaned) {
    return null;
  }

  try {
    const url = new URL(cleaned);
    const host = url.hostname.toLowerCase();

    if ((url.protocol !== "https:" && url.protocol !== "http:") || !trustedFavoriteRepUrlHosts.has(host)) {
      return null;
    }

    return cleaned;
  } catch {
    return null;
  }
}

const trustedFavoriteRepUrlHosts = new Set([
  "sparklesuite.example",
  "sparklesuite.com",
  "www.sparklesuite.com",
  "yoursparklesuite.com",
  "www.yoursparklesuite.com",
]);
