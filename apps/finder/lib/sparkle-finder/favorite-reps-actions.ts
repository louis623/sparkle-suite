export const FAVORITE_REP_NOTE_MAX_LENGTH = 500;

export function canFavoriteRep(input: {
  userId: string | null;
  isAlreadyFavorited?: boolean;
}): { allowed: boolean; alreadyFavorited?: true; reason?: "sign_in_required" | "free_limit_reached" } {
  if (!input.userId) {
    return { allowed: false, reason: "sign_in_required" };
  }

  if (input.isAlreadyFavorited) {
    return { allowed: true, alreadyFavorited: true };
  }

  return { allowed: true };
}

export function canEditFavoriteRepNotes(input: {
  userId: string | null;
  favoriteOwnerUserId: string;
}): boolean {
  return Boolean(input.userId && input.userId === input.favoriteOwnerUserId);
}

export function normalizeFavoriteRepNote(value: unknown): string {
  return String(value ?? "")
    .trim()
    .slice(0, FAVORITE_REP_NOTE_MAX_LENGTH);
}

export function normalizeRepId(value: unknown): string {
  return String(value ?? "").trim().slice(0, 200);
}
