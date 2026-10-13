import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthenticatedHomePage } from "@/components/home/AuthenticatedHomePage";
import { PublicLandingPage } from "@/components/home/PublicLandingPage";
import { sparkleFinderSmokeAnonymousEntryPath } from "@/lib/sparkle-finder/auth-entry";
import {
  parseSparkleFinderAuthMode,
  sparkleFinderAuthCookieName,
} from "@/lib/sparkle-finder/auth";
import {
  getCurrentSparkleFinderAccount,
  type CurrentSparkleFinderAccountState,
} from "@/lib/sparkle-finder/account-service";
import { getCatalogJewelryItemByIdResult } from "@/lib/sparkle-finder/catalog-service";
import { createClient } from "@/lib/supabase/server";
import type { HomepageBlingVaultItem } from "@/lib/sparkle-finder/homepage-bling-vault";
import type { CollectionAcquisitionSource, CollectionItem } from "@/lib/sparkle-finder/types";

export function renderPublicHomeContent(accountState: CurrentSparkleFinderAccountState) {
  return <PublicLandingPage accountState={accountState} />;
}

export function renderHomeContent(
  accountState: CurrentSparkleFinderAccountState,
  collectionItems?: HomepageBlingVaultItem[],
  heroCollectionItemId?: string | null,
  blingVaultLoadError?: string | null,
) {
  return accountState.status === "authenticated" ? (
    <AuthenticatedHomePage
      accountState={accountState}
      blingVaultLoadError={blingVaultLoadError}
      collectionItems={collectionItems}
      heroCollectionItemId={heroCollectionItemId}
    />
  ) : (
    renderPublicHomeContent(accountState)
  );
}

export default async function Home() {
  const cookieStore = await cookies();
  const authMode = parseSparkleFinderAuthMode(cookieStore.get(sparkleFinderAuthCookieName)?.value);
  const accountState = await getCurrentSparkleFinderAccount({ localPreviewAuthMode: authMode });
  const smokeAnonymousEntry = sparkleFinderSmokeAnonymousEntryPath(accountState.status);
  if (smokeAnonymousEntry) {
    redirect(smokeAnonymousEntry);
  }

  const homepageData =
    accountState.status === "authenticated" && accountState.isLocalPreview !== true
      ? await getPersistedHomepageData(accountState.customer.id)
      : null;

  return renderHomeContent(
    accountState,
    homepageData
      ? homepageData.collectionItems.status === "success"
        ? homepageData.collectionItems.items
        : []
      : undefined,
    homepageData?.heroCollectionItemId,
    homepageData?.collectionItems.status === "error"
      ? homepageData.collectionItems.message
      : null,
  );
}

async function getPersistedHomepageData(userId: string): Promise<{
  collectionItems: HomepageCollectionItemsResult;
  heroCollectionItemId: string | null;
}> {
  const [collectionItems, heroCollectionItemId] = await Promise.all([
    getPersistedHomepageBlingVaultItems(userId),
    getPersistedHeroCollectionItemId(userId),
  ]);
  return { collectionItems, heroCollectionItemId };
}

export type HomepageCollectionItemsResult =
  | { status: "success"; items: HomepageBlingVaultItem[] }
  | { status: "error"; message: string };

export async function getPersistedHomepageBlingVaultItems(
  userId: string,
): Promise<HomepageCollectionItemsResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("sparkle_finder_collection_items")
      .select(
        "id,user_id,jewelry_item_id,state,note,is_highlighted,acquisition_source,acquisition_context,acquisition_marked_at,personal_photo_url",
      )
      .eq("user_id", userId);

    if (error || !Array.isArray(data)) {
      return {
        status: "error",
        message: "We couldn't load your Bling Vault. Please try again.",
      };
    }

    const mappedItems = await Promise.all(
      data.flatMap((row): CollectionItem[] => {
        const item = mapPersistedCollectionItem(row);

        return item ? [item] : [];
      }).map(async (item) => {
        const catalogResult = await getCatalogJewelryItemByIdResult(item.jewelryItemId, {
          useFixtureFallback: false,
        });

        if (catalogResult.status === "error") {
          return { status: "error" as const };
        }

        return {
          status: "success" as const,
          item: catalogResult.item ? { ...item, jewelryItem: catalogResult.item } : null,
        };
      }),
    );

    if (mappedItems.some((result) => result.status === "error")) {
      return {
        status: "error",
        message: "Your Bling Vault couldn't reach the jewelry catalog. Please try again.",
      };
    }

    return {
      status: "success",
      items: mappedItems.flatMap((result) =>
        result.status === "success" && result.item ? [result.item] : [],
      ),
    };
  } catch {
    return {
      status: "error",
      message: "We couldn't load your Bling Vault. Please try again.",
    };
  }
}

async function getPersistedHeroCollectionItemId(userId: string): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("sparkle_finder_profiles")
      .select("hero_collection_item_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data || typeof data !== "object") return null;
    return readString((data as Record<string, unknown>).hero_collection_item_id) || null;
  } catch {
    return null;
  }
}

function mapPersistedCollectionItem(row: unknown): (CollectionItem & { personalPhotoUrl?: string | null }) | null {
  if (!row || typeof row !== "object") {
    return null;
  }

  const record = row as Record<string, unknown>;
  const id = readString(record.id);
  const customerId = readString(record.user_id);
  const jewelryItemId = readString(record.jewelry_item_id);
  const state = readCollectionState(record.state);

  if (!id || !customerId || !jewelryItemId || !state) {
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
    personalPhotoUrl: readString(record.personal_photo_url) || null,
  };
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

function readAcquisitionSource(value: unknown): CollectionAcquisitionSource {
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
