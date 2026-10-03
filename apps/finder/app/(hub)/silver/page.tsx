import Link from "next/link";
import { cookies } from "next/headers";
import { Crown, Gem, Sparkles } from "lucide-react";
import { FavoriteRepsPanel } from "@/components/favorites/FavoriteRepsPanel";
import { FinderNicNacWorkspace } from "@/components/nic-nac/FinderNicNacWorkspace";
import type { ManagedCollectionItem } from "@/components/silver/CollectionManager";
import { ProfileSummaryPanel } from "@/components/silver/ProfileSummaryPanel";
import { SimpleSilverShowcase } from "@/components/silver/SimpleSilverShowcase";
import { ShowcaseOwnerPanel, type ShowcaseOwnerData } from "@/components/showcase/ShowcaseOwnerPanel";
import { ShowcaseStudioIntakePanel } from "@/components/showcase/ShowcaseStudioIntakePanel";
import {
  confirmShowcaseStudioVariantAction,
  retryShowcaseStudioRequestAction,
  saveSilverCollectionItemAction,
  saveSilverProfileAction,
  saveShowcasePieceAction,
  submitShowcaseStudioRequestAction,
} from "@/app/(hub)/silver/actions";
import {
  assignShowcasePieceAction,
  deleteShowcaseCollectionAction,
  saveShowcaseCollectionAction,
  saveShowcaseProfileSetupAction,
} from "@/app/(hub)/silver/showcase-owner-actions";
import {
  getAllCatalogJewelryItemsResult,
  getCatalogJewelryItems,
  getCatalogJewelryItemsByIdsResult,
  shouldUseCatalogFixtureFallback,
} from "@/lib/sparkle-finder/catalog-service";
import {
  getCollectionItemsByCustomerId,
  getJewelryItemById,
  getJewelryItems,
  getSilverProfileByCustomerId,
} from "@/lib/sparkle-finder/service";
import {
  getFavoriteRepCardsForUser,
  getPersistedFavoriteRepCardsForUser,
  type SupabaseFavoriteRepsReadClient,
} from "@/lib/sparkle-finder/favorite-reps-service";
import {
  parseSparkleFinderAuthMode,
  sparkleFinderAuthCookieName,
} from "@/lib/sparkle-finder/auth";
import { getCurrentSparkleFinderAccount } from "@/lib/sparkle-finder/account-service";
import { finderNicNacPublicLine } from "@/lib/sparkle-finder/access-split";
import { getSparkleFinderAccountEntitlements } from "@/lib/sparkle-finder/entitlements";
import { createClient } from "@/lib/supabase/server";
import type { SparkleFinderAccountState } from "@/lib/sparkle-finder/auth";
import type { FavoriteRepCard } from "@/lib/sparkle-finder/social-types";
import type { CollectionItem, JewelryItem, SilverProfile } from "@/lib/sparkle-finder/types";
import type { ShowcaseCollection } from "@/lib/sparkle-finder/showcase-types";
import {
  readShowcaseStudioIntakeStatusForUser,
  type SupabaseShowcaseStudioReadClient,
} from "@/lib/sparkle-finder/showcase-studio-state";
import {
  initialShowcaseStudioPanelActionState,
  type ShowcaseStudioPanelActionState,
} from "@/lib/sparkle-finder/showcase-studio-workflow-types";

type SilverPageAccountState = SparkleFinderAccountState & {
  silverProfile?: SilverProfile;
  isLocalPreview?: boolean;
};

const catalogBatchSize = 50;
const catalogBatchConcurrency = 4;
const ownerCollectionPageSize = 200;
const ownerCollectionMaxPages = 10;
const ownerCollectionMaxRows = ownerCollectionPageSize * ownerCollectionMaxPages;

export type PersistedCollectionItemsResult =
  | { status: "success"; items: ManagedCollectionItem[] }
  | { status: "error"; items: []; message: string; missingDesignIds?: string[] };

export default async function SilverPage() {
  const cookieStore = await cookies();
  const authMode = parseSparkleFinderAuthMode(cookieStore.get(sparkleFinderAuthCookieName)?.value);
  const accountState = await getCurrentSparkleFinderAccount({ localPreviewAuthMode: authMode });
  const shouldLoadPersistedState = accountState.status === "authenticated" && accountState.isLocalPreview !== true;
  const [catalogResult, persistedCollectionResult, persistedFavoriteRepCards, persistedShowcaseOwnerData, persistedStudioState] = await Promise.all([
    getSilverCatalogItems(),
    shouldLoadPersistedState ? getPersistedCollectionItems(accountState.customer.id) : Promise.resolve(undefined),
    shouldLoadPersistedState ? getPersistedFavoriteRepCards(accountState) : Promise.resolve(undefined),
    shouldLoadPersistedState ? getPersistedShowcaseOwnerData(accountState.customer.id) : Promise.resolve(undefined),
    shouldLoadPersistedState ? getPersistedShowcaseStudioPanelState(accountState.customer.id) : Promise.resolve(undefined),
  ]);

  return renderSilverPageContent(
    accountState,
    persistedCollectionResult?.items,
    catalogResult.items,
    persistedFavoriteRepCards,
    persistedShowcaseOwnerData,
    persistedCollectionResult?.status === "error" ? persistedCollectionResult.message : undefined,
    catalogResult.message,
    persistedStudioState,
  );
}

export function renderSilverPageContent(
  accountState: SilverPageAccountState,
  persistedCollectionItems?: ManagedCollectionItem[],
  libraryItems: JewelryItem[] = getJewelryItems(),
  persistedFavoriteRepCards?: FavoriteRepCard[],
  persistedShowcaseOwnerData?: ShowcaseOwnerData,
  collectionHydrationIssue?: string,
  catalogIssue?: string,
  studioInitialState: ShowcaseStudioPanelActionState = initialShowcaseStudioPanelActionState,
) {
  const entitlements = getSparkleFinderAccountEntitlements(accountState);
  const isLocalPreview = accountState.isLocalPreview === true;
  const canSaveCollection = entitlements.canUseSilverCollectionActions;
  const canUseNicNac = entitlements.canUseNicNacFindRequests;

  if (accountState.status !== "authenticated") {
    return <SilverUpgradePrompt accountState={accountState} />;
  }

  const customer = accountState.customer;
  const profile =
    accountState.silverProfile ?? getSilverProfileByCustomerId(customer.id) ?? createEmptySilverProfile(customer.id);
  const collectionItems =
    persistedCollectionItems ??
    getCollectionItemsByCustomerId(customer.id).flatMap((item) => {
      const jewelryItem = findLibraryItemById(item.jewelryItemId, libraryItems) ?? getJewelryItemById(item.jewelryItemId);

      return jewelryItem ? [{ ...item, jewelryItem }] : [];
    });
  const favoriteRepCards =
    persistedFavoriteRepCards ??
    getFavoriteRepCardsForUser({
      userId: customer.id,
      hasSilverAccess: entitlements.canUseNicNacFindRequests,
    });

  return (
    <section className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--sparkle-coral)]">
            My Sparkle Showcase
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-playfair)] text-4xl font-semibold text-[var(--sparkle-plum-deep)]">
            {customer.displayName}&apos;s Sparkle Showcase
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--sparkle-ink-muted)]">
            {isLocalPreview
              ? "Stage owned pieces, pieces you are looking for, rare reveals, and profile details against Sparkle Finder's fixture-backed preview."
              : canSaveCollection
                ? "Build, track, highlight, and share the pieces you own or hope to find, then use dancer leads when a wanted piece appears."
                : "Look through the library, the rep list, show times, and Dance Floors, and keep your profile. Saving a collection and Nic-Nac need Silver."}
          </p>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[var(--sparkle-ink-muted)]">
            Sparkle Showcase is for discovery, tracking, highlighting, and sharing with rep-first find paths.
          </p>
        </div>
        <div className="rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-[var(--sparkle-paper)] p-4 shadow-[var(--sparkle-shadow-sm)]">
          <div className="flex items-center gap-3">
            <Crown aria-hidden="true" className="size-7 text-[var(--sparkle-plum)]" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-bold text-[var(--sparkle-plum-deep)]">
                {isLocalPreview ? "Local fixture mode" : canSaveCollection ? "Silver is active" : "Free account"}
              </p>
              <p className="text-sm leading-5 text-[var(--sparkle-ink-muted)]">
                {isLocalPreview
                  ? "Preview-only state, ready for later actions."
                  : canSaveCollection
                    ? `You can save a collection. ${finderNicNacPublicLine}`
                    : `Saving a collection and Nic-Nac need Silver. ${finderNicNacPublicLine}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {collectionHydrationIssue ? (
        <div
          className="rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-coral)] bg-[var(--sparkle-blush-bg)] px-4 py-3 text-sm font-semibold leading-6 text-[var(--sparkle-plum-deep)]"
          role="alert"
        >
          {collectionHydrationIssue}
        </div>
      ) : null}

      {catalogIssue ? (
        <div
          className="rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-coral)] bg-[var(--sparkle-blush-bg)] px-4 py-3 text-sm font-semibold leading-6 text-[var(--sparkle-plum-deep)]"
          role="alert"
        >
          {catalogIssue}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(18rem,0.45fr)_minmax(0,1fr)] lg:items-start">
        <ProfileSummaryPanel
          accountState={accountState}
          canSaveSilverActions={entitlements.canUseSilverProfileActions}
          customer={customer}
          isLocalPreview={isLocalPreview}
          profile={profile}
          saveAction={isLocalPreview ? undefined : saveSilverProfileAction}
        />
        <FinderNicNacWorkspace
          canUseNicNac={canUseNicNac}
          collectionItems={collectionItems}
          displayName={customer.displayName}
          libraryItems={libraryItems}
          profile={profile}
        />
      </div>

      <ShowcaseStudioIntakePanel
        accountId={customer.id}
        canSubmit={entitlements.canUseSilverProfileActions}
        confirmAction={isLocalPreview ? undefined : confirmShowcaseStudioVariantAction}
        initialState={studioInitialState}
        isLocalPreview={isLocalPreview}
        key={customer.id}
        retryAction={isLocalPreview ? undefined : retryShowcaseStudioRequestAction}
        submitAction={isLocalPreview ? undefined : submitShowcaseStudioRequestAction}
      />

      <FavoriteRepsPanel cards={favoriteRepCards} isSilver={entitlements.canUseNicNacFindRequests} />

      <ShowcaseOwnerPanel
        assignPieceAction={isLocalPreview ? undefined : assignShowcasePieceAction}
        canSave={entitlements.canUseSilverProfileActions}
        canSavePieces={canSaveCollection}
        collectionItems={collectionItems}
        data={persistedShowcaseOwnerData ?? createEmptyShowcaseOwnerData()}
        deleteCollectionAction={isLocalPreview ? undefined : deleteShowcaseCollectionAction}
        isLocalPreview={isLocalPreview}
        saveCollectionAction={isLocalPreview ? undefined : saveShowcaseCollectionAction}
        savePieceAction={isLocalPreview ? undefined : saveShowcasePieceAction}
        saveProfileAction={isLocalPreview ? undefined : saveShowcaseProfileSetupAction}
      />

      <SimpleSilverShowcase
        accountState={accountState}
        canSaveSilverActions={entitlements.canUseSilverCollectionActions}
        collectionItems={collectionItems}
        isLocalPreview={isLocalPreview}
        libraryItems={libraryItems}
        saveAction={isLocalPreview ? undefined : saveSilverCollectionItemAction}
      />
    </section>
  );
}

async function getSilverCatalogItems(): Promise<{ items: JewelryItem[]; message?: string }> {
  if (shouldUseCatalogFixtureFallback()) {
    return { items: await getCatalogJewelryItems({ useFixtureFallback: true }) };
  }

  const result = await getAllCatalogJewelryItemsResult();
  return result.status === "success"
    ? { items: result.items }
    : {
        items: [],
        message: "The complete jewelry catalog couldn't be loaded, so adding a piece is temporarily unavailable.",
      };
}

function SilverUpgradePrompt({ accountState }: { accountState: SilverPageAccountState }) {
  const isLocalPreview = accountState.isLocalPreview === true;

  return (
    <section className="mx-auto grid max-w-3xl gap-5 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-[var(--sparkle-paper)] p-6 shadow-[var(--sparkle-shadow-sm)] sm:p-8">
      <div className="grid size-16 place-items-center rounded-full border border-[var(--sparkle-border)] bg-[var(--sparkle-blush-bg)] text-[var(--sparkle-plum)]">
        <Gem aria-hidden="true" className="size-8" strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--sparkle-coral)]">
          {isLocalPreview ? "Silver preview needed" : "Silver access needed"}
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-playfair)] text-4xl font-semibold text-[var(--sparkle-plum-deep)]">
          {isLocalPreview ? "Open Silver to save Sparkle Showcase previews" : "Open Silver to view and stage your Sparkle Showcase"}
        </h1>
        <p className="mt-3 text-base leading-7 text-[var(--sparkle-ink-muted)]">
          {isLocalPreview
            ? "Free accounts can keep browsing the library. Silver preview accounts can stage profile edits, Sparkle Showcase records, and looking-for records against local fixture data."
            : "Free accounts can keep browsing the library. Silver accounts can view and stage profile details, Sparkle Showcase records, and looking-for records while persistent saves are still in progress."}
        </p>
      </div>
      <Link
        className="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-[var(--sparkle-radius-sm)] bg-[var(--sparkle-plum)] px-5 text-sm font-bold text-white"
        href="/auth/sign-in"
      >
        <Sparkles aria-hidden="true" className="size-4" />
        {isLocalPreview ? "Choose preview account" : "Review access options"}
      </Link>
    </section>
  );
}

function createEmptySilverProfile(customerId: string): SilverProfile {
  return {
    customerId,
    photoUrl: "",
    tiktokHandle: "",
    bio: "",
    visibility: "private",
  };
}

export async function getPersistedCollectionItems(userId: string): Promise<PersistedCollectionItemsResult> {
  try {
    const supabase = await createClient();
    const collectionRowsResult = await loadOrderedOwnerCollectionRows(supabase, userId);
    if (collectionRowsResult.status === "error") {
      return {
        status: "error",
        items: [],
        message: collectionRowsResult.reason === "page_limit"
          ? `Your Sparkle Showcase has more than ${ownerCollectionMaxRows.toLocaleString("en-US")} saved pieces and can't be loaded safely yet. No partial collection was shown.`
          : "We couldn't load your saved Sparkle Showcase pieces. Please try again.",
      };
    }

    const collectionItems = collectionRowsResult.rows.map((row) => mapPersistedCollectionItem(row, userId));
    if (collectionItems.some((item) => item === null)) {
      return {
        status: "error",
        items: [],
        message: "Some saved Sparkle Showcase pieces couldn't be read safely. Please try again.",
      };
    }

    const hydratedCatalog = await loadPersistedCatalogItemsByDesignIds(
      collectionItems.flatMap((item) => (item ? [item.jewelryItemId] : [])),
    );
    if (hydratedCatalog.status === "error") {
      return {
        status: "error",
        items: [],
        message: "Your Sparkle Showcase couldn't reach the jewelry catalog. Please try again.",
      };
    }

    if (hydratedCatalog.missingDesignIds.length > 0) {
      return {
        status: "error",
        items: [],
        message: "Some saved pieces are no longer available in the jewelry catalog. Nothing was substituted.",
        missingDesignIds: hydratedCatalog.missingDesignIds,
      };
    }

    const catalogById = new Map(hydratedCatalog.items.map((item) => [normalizeExactDesignId(item.id), item]));
    const items = collectionItems.flatMap((item) => {
      const jewelryItem = item ? catalogById.get(normalizeExactDesignId(item.jewelryItemId)) : undefined;

      return item && jewelryItem ? [{ ...item, jewelryItem }] : [];
    });

    return { status: "success", items };
  } catch {
    return {
      status: "error",
      items: [],
      message: "We couldn't load your saved Sparkle Showcase pieces. Please try again.",
    };
  }
}

type PersistedCatalogHydrationResult =
  | { status: "success"; items: JewelryItem[]; missingDesignIds: string[] }
  | { status: "error" };

async function loadPersistedCatalogItemsByDesignIds(
  designIds: string[],
): Promise<PersistedCatalogHydrationResult> {
  const uniqueDesignIds = [...new Map(
    designIds
      .map((designId) => designId.trim())
      .filter(Boolean)
      .map((designId) => [designId, designId]),
  ).values()];
  if (uniqueDesignIds.length === 0) {
    return { status: "success", items: [], missingDesignIds: [] };
  }

  const batches: string[][] = [];
  for (let index = 0; index < uniqueDesignIds.length; index += catalogBatchSize) {
    batches.push(uniqueDesignIds.slice(index, index + catalogBatchSize));
  }

  const results: Array<Extract<Awaited<ReturnType<typeof getCatalogJewelryItemsByIdsResult>>, { status: "success" }>> = [];
  for (let index = 0; index < batches.length; index += catalogBatchConcurrency) {
    const batchResults = await Promise.all(
      batches
        .slice(index, index + catalogBatchConcurrency)
        .map((batch) => getCatalogJewelryItemsByIdsResult(batch)),
    );
    for (const result of batchResults) {
      if (result.status === "error") {
        return { status: "error" };
      }
      results.push(result);
    }
  }

  const items = results.flatMap((result) => result.items);
  const requestedIds = new Set(uniqueDesignIds);
  if (items.some((item) => !requestedIds.has(normalizeExactDesignId(item.id)))) {
    return { status: "error" };
  }

  const returnedIds = new Set(items.map((item) => normalizeExactDesignId(item.id)));
  const reportedMissingIds = results.flatMap((result) => result.missingDesignIds);
  const missingDesignIds = [...new Set([
    ...reportedMissingIds
      .map(normalizeExactDesignId)
      .filter((designId) => requestedIds.has(designId)),
    ...uniqueDesignIds.filter((designId) => !returnedIds.has(designId)),
  ])];

  return { status: "success", items, missingDesignIds };
}

type OwnerCollectionRowsResult =
  | { status: "success"; rows: unknown[] }
  | { status: "error"; reason: "unavailable" | "page_limit" };

async function loadOrderedOwnerCollectionRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<OwnerCollectionRowsResult> {
  const rows: unknown[] = [];

  for (let page = 0; page <= ownerCollectionMaxPages; page += 1) {
    const from = page * ownerCollectionPageSize;
    const { data, error } = await supabase
      .from("sparkle_finder_collection_items")
      .select("id,user_id,jewelry_item_id,state,note,is_highlighted,acquisition_source,acquisition_context,acquisition_marked_at,visibility,showcase_status,reveal_story,personal_photo_url,is_rarest_reveal")
      .eq("user_id", userId)
      .order("id", { ascending: true })
      .range(from, from + ownerCollectionPageSize - 1);

    if (error || !Array.isArray(data)) {
      return { status: "error", reason: "unavailable" };
    }
    if (page === ownerCollectionMaxPages) {
      return data.length > 0
        ? { status: "error", reason: "page_limit" }
        : { status: "success", rows };
    }

    rows.push(...data);
    if (data.length < ownerCollectionPageSize) {
      return { status: "success", rows };
    }
  }

  return { status: "error", reason: "page_limit" };
}

function normalizeExactDesignId(designId: string): string {
  return designId.trim();
}

async function getPersistedShowcaseStudioPanelState(userId: string): Promise<ShowcaseStudioPanelActionState> {
  try {
    const supabase = await createClient();
    const status = await readShowcaseStudioIntakeStatusForUser(
      supabase as unknown as SupabaseShowcaseStudioReadClient,
      userId,
    );
    const latest = status.latestSubmission;
    if (status.status !== "connected" || !latest) return initialShowcaseStudioPanelActionState;

    const mappedStatus = latest.status === "needs_confirmation"
      ? "needs_confirmation"
      : latest.status === "needs_jewelry_photo" || latest.status === "needs_label"
        ? "needs_jewelry_photo"
        : latest.status === "photo_rejected"
          ? "photo_rejected"
          : latest.status === "saved_pending_sync" || latest.status === "submitted"
            ? "saved_pending_sync"
            : latest.status === "accepted" || latest.status === "publish_queued" || latest.status === "published" || latest.status === "rejected"
              ? latest.status
              : latest.status === "uploading" || latest.status === "publish_failed"
                ? "error"
                : "idle";
    const retryable = latest.status === "saved_pending_sync" || latest.status === "submitted";

    return {
      status: mappedStatus,
      message: getShowcaseStudioCustomerMessage(latest.status),
      submissionId: latest.submissionId || null,
      retryable,
      candidates: latest.variantCandidates,
      selectedDesign: latest.selectedDesign,
    };
  } catch {
    return initialShowcaseStudioPanelActionState;
  }
}

function getShowcaseStudioCustomerMessage(
  status: NonNullable<Awaited<ReturnType<typeof readShowcaseStudioIntakeStatusForUser>>["latestSubmission"]>["status"],
): string {
  if (status === "draft") return "Your Studio request is ready for both photos.";
  if (status === "uploading") {
    return "This photo save was interrupted. Start a fresh Studio request so your evidence stays protected.";
  }
  if (status === "submitted" || status === "saved_pending_sync") {
    return "Your photos are saved safely. Retry the Sparkle Suite sync without uploading them again.";
  }
  if (status === "needs_confirmation") return "Nic-Nac found more than one exact variant. Choose the matching design below.";
  if (status === "needs_label" || status === "needs_jewelry_photo") return "Showcase Studio needs clearer evidence before this request can continue.";
  if (status === "photo_rejected") return "The photos need another try. Follow the coaching, then start a new Studio request.";
  if (status === "accepted") return "Sparkle Suite confirmed the exact design for this Studio request.";
  if (status === "publish_queued") return "This missing design is safely queued for Sparkle Suite review.";
  if (status === "published") return "This exact design is published in the Sparkle Suite catalog.";
  if (status === "rejected") return "This Studio request could not be matched safely. Start a new request with corrected details.";
  return "This Studio request could not be completed and is not safe to retry. Start a new request if needed.";
}

async function getPersistedFavoriteRepCards(
  accountState: SilverPageAccountState & { status: "authenticated" },
): Promise<FavoriteRepCard[]> {
  try {
    const entitlements = getSparkleFinderAccountEntitlements(accountState);
    const supabase = await createClient();
    const readClient = supabase as unknown as SupabaseFavoriteRepsReadClient;
    const cards = await getPersistedFavoriteRepCardsForUser({
      supabase: readClient,
      userId: accountState.customer.id,
      hasSilverAccess: entitlements.canUseNicNacFindRequests,
    });

    return cards ?? [];
  } catch {
    return [];
  }
}

function findLibraryItemById(itemId: string, libraryItems: readonly JewelryItem[]): JewelryItem | undefined {
  return libraryItems.find((item) => item.id === itemId);
}

type PersistedManagedCollectionItem = Omit<ManagedCollectionItem, "jewelryItem">;

function mapPersistedCollectionItem(row: unknown, userId: string): PersistedManagedCollectionItem | null {
  if (!row || typeof row !== "object") {
    return null;
  }

  const record = row as Record<string, unknown>;
  const id = readString(record.id);
  const customerId = readString(record.user_id);
  const jewelryItemId = readString(record.jewelry_item_id);
  const state = readCollectionState(record.state);

  if (!id || customerId !== userId || !jewelryItemId || !state) {
    return null;
  }

  return {
    id,
    customerId,
    jewelryItemId,
    state,
    note: readString(record.note),
    isHighlighted: record.is_highlighted === true,
    acquisitionSource: readAcquisitionSource(record.acquisition_source),
    acquisitionContext: readAcquisitionContext(record.acquisition_context),
    acquisitionMarkedAt: readString(record.acquisition_marked_at) || null,
    visibility: record.visibility === "public" ? "public" : "private",
    showcaseStatus: readShowcaseStatus(record.showcase_status),
    revealStory: readString(record.reveal_story),
    personalPhotoUrl: readString(record.personal_photo_url) || null,
    isRarestReveal: record.is_rarest_reveal === true,
  };
}

async function getPersistedShowcaseOwnerData(userId: string): Promise<ShowcaseOwnerData> {
  try {
    const supabase = await createClient();
    const [profileResult, collectionsResult] = await Promise.all([
      supabase
        .from("sparkle_finder_profiles")
        .select("showcase_handle,showcase_tagline,showcase_visibility")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("sparkle_finder_showcase_collections")
        .select("id,user_id,title,slug,description,visibility,sparkle_finder_showcase_collection_items(collection_item_id)")
        .eq("user_id", userId)
        .order("created_at", { ascending: true }),
    ]);

    const profile = profileResult.data && typeof profileResult.data === "object"
      ? profileResult.data as Record<string, unknown>
      : {};
    const collections = Array.isArray(collectionsResult.data)
      ? collectionsResult.data.flatMap((row) => {
          const collection = mapOwnerShowcaseCollection(row);
          return collection ? [collection] : [];
        })
      : [];

    return {
      handle: readString(profile.showcase_handle),
      tagline: readString(profile.showcase_tagline),
      visibility: profile.showcase_visibility === "public" ? "public" : "private",
      collections,
    };
  } catch {
    return createEmptyShowcaseOwnerData();
  }
}

function mapOwnerShowcaseCollection(row: unknown): ShowcaseCollection | null {
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;
  const id = readString(record.id);
  const customerId = readString(record.user_id);
  const title = readString(record.title);
  const slug = readString(record.slug);
  if (!id || !customerId || !title || !slug) return null;

  const joins = Array.isArray(record.sparkle_finder_showcase_collection_items)
    ? record.sparkle_finder_showcase_collection_items
    : [];

  return {
    id,
    customerId,
    title,
    slug,
    description: readString(record.description),
    visibility: record.visibility === "public" ? "public" : "private",
    pieceIds: joins.flatMap((join) => {
      if (!join || typeof join !== "object") return [];
      const itemId = readString((join as Record<string, unknown>).collection_item_id);
      return itemId ? [itemId] : [];
    }),
  };
}

function createEmptyShowcaseOwnerData(): ShowcaseOwnerData {
  return { handle: "", tagline: "", visibility: "private", collections: [] };
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readCollectionState(value: unknown): CollectionItem["state"] | null {
  if (value === "owned" || value === "wishlist" || value === "private_note_only") {
    return value;
  }

  return null;
}

function readShowcaseStatus(value: unknown): ManagedCollectionItem["showcaseStatus"] {
  if (value === "wishlist" || value === "iso" || value === "private_note_only") return value;
  return "owned";
}

function readAcquisitionSource(value: unknown): CollectionItem["acquisitionSource"] {
  if (
    value === "manual" ||
    value === "wishlist" ||
    value === "sparkle_finder_lead" ||
    value === "nic_nac_request" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

function readAcquisitionContext(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
