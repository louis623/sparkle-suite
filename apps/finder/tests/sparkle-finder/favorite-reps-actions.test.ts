import { describe, expect, it } from "vitest";
import {
  FAVORITE_REP_NOTE_MAX_LENGTH,
  canEditFavoriteRepNotes,
  canFavoriteRep,
  normalizeFavoriteRepNote,
  normalizeRepId,
} from "../../lib/sparkle-finder/favorite-reps-actions";

describe("Favorite reps actions", () => {
  it("allows logged-in users to favorite a rep", () => {
    expect(
      canFavoriteRep({
        userId: "customer-free-marlena",
      }),
    ).toEqual({ allowed: true });
  });

  it("lets a signed-in Free account favorite another rep without a Silver cap", () => {
    expect(
      canFavoriteRep({
        userId: "customer-free-marlena",
      }),
    ).toEqual({ allowed: true });
  });

  it("allows idempotent favorite requests for an existing favorite", () => {
    expect(
      canFavoriteRep({
        userId: "customer-free-marlena",
        isAlreadyFavorited: true,
      }),
    ).toEqual({ allowed: true, alreadyFavorited: true });
  });

  it("allows the favorite owner to save rep notes without Silver", () => {
    expect(
      canEditFavoriteRepNotes({
        userId: "customer-silver-sparkle-mama",
        favoriteOwnerUserId: "customer-silver-sparkle-mama",
      }),
    ).toBe(true);
    expect(
      canEditFavoriteRepNotes({
        userId: "customer-free-marlena",
        favoriteOwnerUserId: "customer-free-marlena",
      }),
    ).toBe(true);
  });

  it("trims notes to 500 characters", () => {
    expect(normalizeFavoriteRepNote(` ${"a".repeat(520)} `)).toHaveLength(FAVORITE_REP_NOTE_MAX_LENGTH);
  });

  it("rejects empty rep ids", () => {
    expect(normalizeRepId("   ")).toBe("");
    expect(normalizeRepId(" rep-kelli ")).toBe("rep-kelli");
  });
});
