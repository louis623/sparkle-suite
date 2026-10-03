import { beforeEach, describe, expect, it, vi } from "vitest";

const runtime = vi.hoisted(() => ({
  accountState: {
    status: "authenticated" as const,
    customer: {
      id: "user-123",
      displayName: "Casey Collector",
      email: "casey@example.com",
      state: "TX",
    },
    membership: { hasSilverAccess: true },
  },
  client: null as unknown,
  revalidated: [] as Array<[string, string?]>,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => runtime.client,
}));

vi.mock("@/lib/sparkle-finder/account-service", () => ({
  getCurrentSparkleFinderAccount: async () => runtime.accountState,
}));

vi.mock("next/cache", () => ({
  revalidatePath: (path: string, type?: string) => runtime.revalidated.push([path, type]),
}));

import {
  deleteShowcaseCollectionAction,
  saveShowcaseProfileSetupAction,
} from "../../app/(hub)/silver/showcase-owner-actions";

const idleState = { status: "idle" as const, message: "Ready." };
const collectionId = "9fc64c56-42ee-4c7a-95ca-710648e637af";

describe("Showcase owner server actions", () => {
  beforeEach(() => {
    runtime.revalidated.length = 0;
  });

  it("revalidates both the old and new Showcase handle after a rename", async () => {
    const client = createOwnerActionClient({ previousHandle: "old-sparkles" });
    runtime.client = client;
    const formData = new FormData();
    formData.set("handle", "New Sparkles");
    formData.set("tagline", "Purple forever.");
    formData.set("visibility", "public");

    await expect(saveShowcaseProfileSetupAction(idleState, formData)).resolves.toEqual({
      status: "saved",
      message: "Your Sparkle Showcase is public.",
    });

    expect(client.profileUpdates).toEqual([expect.objectContaining({ showcase_handle: "new-sparkles" })]);
    expect(runtime.revalidated).toContainEqual(["/showcase/old-sparkles", undefined]);
    expect(runtime.revalidated).toContainEqual(["/showcase/new-sparkles", undefined]);
  });

  it("creates the missing owner profile row during first-time Showcase setup", async () => {
    const client = createOwnerActionClient({ previousHandle: null });
    runtime.client = client;
    const formData = new FormData();
    formData.set("handle", "First Sparkles");
    formData.set("visibility", "private");

    await expect(saveShowcaseProfileSetupAction(idleState, formData)).resolves.toEqual({
      status: "saved",
      message: "Your Sparkle Showcase is private.",
    });
    expect(client.profileInserts).toEqual([
      expect.objectContaining({
        user_id: "user-123",
        display_name: "Casey Collector",
        email: "casey@example.com",
        showcase_handle: "first-sparkles",
      }),
    ]);
  });

  it("does not claim a profile save when no owner row was affected", async () => {
    runtime.client = createOwnerActionClient({ savedProfileId: null });
    const formData = new FormData();
    formData.set("handle", "Casey Finds");

    await expect(saveShowcaseProfileSetupAction(idleState, formData)).resolves.toEqual({
      status: "error",
      message: "Showcase settings could not be saved.",
    });
    expect(runtime.revalidated).toEqual([]);
  });

  it("requires three letters or numbers rather than counting hyphens", async () => {
    const client = createOwnerActionClient();
    runtime.client = client;
    const formData = new FormData();
    formData.set("handle", "a-b");

    await expect(saveShowcaseProfileSetupAction(idleState, formData)).resolves.toEqual({
      status: "error",
      message: "Choose a Showcase handle with at least 3 letters or numbers.",
    });
    expect(client.profileUpdates).toEqual([]);
    expect(client.profileInserts).toEqual([]);
  });

  it("bounds long handles and returns clear uniqueness feedback", async () => {
    const boundedClient = createOwnerActionClient();
    runtime.client = boundedClient;
    const longHandle = new FormData();
    longHandle.set("handle", "a".repeat(80));

    await expect(saveShowcaseProfileSetupAction(idleState, longHandle)).resolves.toEqual({
      status: "saved",
      message: "Your Sparkle Showcase is private.",
    });
    expect(boundedClient.profileUpdates[0].showcase_handle).toBe("a".repeat(40));

    runtime.client = createOwnerActionClient({ savedError: { code: "23505" } });
    const duplicateHandle = new FormData();
    duplicateHandle.set("handle", "taken-handle");
    await expect(saveShowcaseProfileSetupAction(idleState, duplicateHandle)).resolves.toEqual({
      status: "error",
      message: "That Showcase handle is already taken. Try another.",
    });
  });

  it("reports success only when the owner-scoped delete returns the expected row", async () => {
    const client = createOwnerActionClient({ deletedCollectionId: collectionId });
    runtime.client = client;
    const formData = new FormData();
    formData.set("collectionId", collectionId);

    await expect(deleteShowcaseCollectionAction(idleState, formData)).resolves.toEqual({
      status: "saved",
      message: "Showcase Collection removed. Every piece stayed in your collection.",
    });
    expect(client.deleteFilters).toEqual([
      ["id", collectionId],
      ["user_id", "user-123"],
    ]);
  });

  it("does not claim deletion when no owner-scoped row was affected", async () => {
    runtime.client = createOwnerActionClient({ deletedCollectionId: null });
    const formData = new FormData();
    formData.set("collectionId", collectionId);

    await expect(deleteShowcaseCollectionAction(idleState, formData)).resolves.toEqual({
      status: "error",
      message: "Showcase Collection could not be removed. Refresh and try again.",
    });
    expect(runtime.revalidated).toEqual([]);
  });
});

function createOwnerActionClient({
  deletedCollectionId = collectionId,
  previousHandle = "casey-finds",
  savedProfileId = "user-123",
  savedError = null,
}: {
  deletedCollectionId?: string | null;
  previousHandle?: string | null;
  savedProfileId?: string | null;
  savedError?: unknown;
} = {}) {
  const profileUpdates: Record<string, unknown>[] = [];
  const profileInserts: Record<string, unknown>[] = [];
  const deleteFilters: Array<[string, string]> = [];

  return {
    profileUpdates,
    profileInserts,
    deleteFilters,
    auth: {
      getUser: async () => ({ data: { user: { id: "user-123" } }, error: null }),
    },
    from(table: string) {
      if (table === "sparkle_finder_profiles") {
        return {
          select: () => chainableQuery(previousHandle === null ? null : { showcase_handle: previousHandle }),
          update: (values: Record<string, unknown>) => {
            profileUpdates.push(values);
            return chainableProfileSave(savedProfileId, String(values.showcase_handle ?? ""), savedError);
          },
          insert: (values: Record<string, unknown>) => {
            profileInserts.push(values);
            return chainableProfileSave(savedProfileId, String(values.showcase_handle ?? ""), savedError);
          },
        };
      }

      if (table === "sparkle_finder_showcase_collections") {
        return {
          delete: () => chainableDelete(deleteFilters, deletedCollectionId),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };
}

function chainableQuery(data: unknown) {
  return {
    eq() {
      return this;
    },
    async maybeSingle() {
      return { data, error: null };
    },
  };
}

function chainableProfileSave(savedProfileId: string | null, showcaseHandle: string, error: unknown) {
  return {
    eq() {
      return this;
    },
    select() {
      return this;
    },
    async maybeSingle() {
      return {
        data: error || !savedProfileId ? null : { user_id: savedProfileId, showcase_handle: showcaseHandle },
        error,
      };
    },
  };
}

function chainableDelete(filters: Array<[string, string]>, deletedCollectionId: string | null) {
  return {
    eq(column: string, value: string) {
      filters.push([column, value]);
      return this;
    },
    select() {
      return this;
    },
    async maybeSingle() {
      return {
        data: deletedCollectionId ? { id: deletedCollectionId } : null,
        error: null,
      };
    },
  };
}
