import {
  sparkleFinderJewelryItems,
  sparkleFinderLiveShows,
  sparkleFinderRepBoardListings,
  sparkleFinderReps,
} from "../fixtures/sparkle-finder-fixtures";
import type { BombPartyLabel, JewelryItem, JewelryType, LiveShow, RepBoardListing, RepSummary } from "./types";

export type SparkleSuiteFinderJewelryType = "ring" | "necklace" | "earrings" | "stack" | "bracelet";

export type SparkleSuiteFinderCatalogItem = {
  designId: string;
  itemNumber: string;
  designName: string;
  collectionName: string | null;
  collectionYear: number | null;
  jewelryType: SparkleSuiteFinderJewelryType;
  material: string | null;
  mainStone: string | null;
  bpMsrp: number | null;
  canonicalPhotoUrl: string | null;
  rarityClassification?: BombPartyLabel;
  description?: string | null;
  searchTags: string[];
  availableListingCount: number;
  availableLeadCount?: number;
  availableDancerCount?: number;
};

export type CatalogJewelryItem = JewelryItem & {
  description: string | null;
};

export type SparkleSuiteFinderLeadShow = {
  showId: string;
  showName: string;
  repFirstName: string;
  startsAt: string;
  status: "scheduled" | "live";
  customerSiteUrl: string;
};

export type SparkleSuiteFinderRepDirectoryShow =
  | SparkleSuiteFinderLeadShow
  | {
      id: string;
      title: string;
      startsAt: string;
      status: "scheduled" | "live";
      customerShowUrl: string | null;
      durationMinutes?: number | null;
    };

export type SparkleSuiteFinderRepDirectoryItem = {
  repId: string;
  displayName: string;
  businessName: string | null;
  avatarUrl: string | null;
  state: string | null;
  customerSiteUrl: string | null;
  repBoardUrl: string | null;
  nextShow: SparkleSuiteFinderRepDirectoryShow | null;
};

export type FinderAvailabilityMatch = {
  listingId: string;
  quantityAvailable: number;
  listedAt: string | null;
  photoUrl: string | null;
  photoSource?: "listing" | "canonical" | "missing";
  item: JewelryItem;
  showName: string;
  repFirstName: string;
  customerSiteUrl: string;
  nextShow: SparkleSuiteFinderLeadShow;
};

export type FinderAvailabilityPageInfo = {
  totalLeadCount: number;
  totalDancerCount: number;
  hasMore: boolean;
  nextCursor: string | null;
};

export type FinderAvailabilityResult = {
  schemaVersion: 2;
  requestedItem: JewelryItem;
  exactMatches: FinderAvailabilityMatch[];
  similarMatches: FinderAvailabilityMatch[];
  exactPageInfo: FinderAvailabilityPageInfo;
  similarPageInfo: FinderAvailabilityPageInfo;
};

export type FinderLiveShow = SparkleSuiteFinderLeadShow;
export type FinderRepDirectoryData = {
  reps: RepSummary[];
  liveShows: LiveShow[];
  boardListings: RepBoardListing[];
  status: FinderRepDirectoryStatus;
};
export type FinderRepDirectoryStatus = "ready" | "empty" | "unavailable";
export type CatalogFacetKey = "collections" | "materials" | "stones" | "types" | "labels" | "years";

export type CatalogFacetOption = {
  value: string;
  count: number;
};

export type CatalogFacetOptions = Record<CatalogFacetKey, CatalogFacetOption[]>;

export type CatalogItemsReadResult =
  | { status: "success"; items: CatalogJewelryItem[] }
  | { status: "error" };

export type CatalogItemReadResult =
  | { status: "success"; item?: CatalogJewelryItem }
  | { status: "error" };

export type CatalogPageInfo = {
  totalCount: number;
  hasMore: boolean;
  nextCursor: string | null;
};

export type CatalogReadErrorReason =
  | "unavailable"
  | "invalid_contract"
  | "unsupported_pagination"
  | "duplicate_design_id"
  | "cursor_loop"
  | "page_limit";

export type CatalogPageReadResult =
  | {
      status: "success";
      pagination: "supported";
      schemaVersion: 2;
      items: CatalogJewelryItem[];
      pageInfo: CatalogPageInfo;
    }
  | {
      status: "success";
      pagination: "unsupported";
      items: CatalogJewelryItem[];
    }
  | { status: "error"; reason: CatalogReadErrorReason };

export type CatalogBatchReadResult =
  | {
      status: "success";
      schemaVersion: 2;
      items: CatalogJewelryItem[];
      missingDesignIds: string[];
    }
  | { status: "error"; reason: CatalogReadErrorReason };

export type CatalogAllPagesReadResult =
  | {
      status: "success";
      schemaVersion: 2;
      items: CatalogJewelryItem[];
      totalCount: number;
    }
  | { status: "error"; reason: CatalogReadErrorReason };

export type CatalogReadOptions = {
  apiBaseUrl?: string;
  cursor?: string;
  exactCursor?: string;
  similarCursor?: string;
  fetcher?: (input: string, init?: RequestInit) => Promise<Response>;
  collection?: string;
  collectionYear?: number;
  label?: BombPartyLabel | "all";
  limit?: number;
  mainStone?: string;
  material?: string;
  query?: string;
  type?: JewelryType | "all";
  useFixtureFallback?: boolean;
};

type CatalogFacetsResponse = {
  facets?: Partial<CatalogFacetOptions>;
};

type LiveShowsResponse = {
  shows?: SparkleSuiteFinderLeadShow[];
};

type RepDirectoryResponse = {
  reps?: unknown;
};

type SparkleSuiteFinderAvailabilityMatch = {
  listingId: string;
  quantityAvailable: number;
  listedAt: string | null;
  photoUrl: string | null;
  photoSource?: "listing" | "canonical" | "missing";
  item: SparkleSuiteFinderCatalogItem;
  rep?: {
    repId: string;
    showName: string;
    repFirstName: string;
    customerSiteUrl: string;
  } | null;
  showName?: string;
  repFirstName?: string;
  customerSiteUrl?: string;
  nextShow:
    | SparkleSuiteFinderLeadShow
    | {
        showId: string;
        repId: string;
        startsAt: string;
        title: string | null;
        status: "scheduled" | "live";
      }
    | null;
};

const defaultSparkleSuiteFinderApiBaseUrl = "https://www.yoursparklesuite.com";
const defaultCatalogLimit = 50;
const maxCatalogLimit = 50;
const maxCatalogCursorLength = 2_048;
const maxCatalogQueryLength = 256;
const maxCatalogFilterLength = 160;
const maxCatalogDesignIdLength = 256;
const maxCatalogYear = 9_999;
const maxCatalogBatchDesignIds = 50;
const defaultCatalogWalkMaxPages = 100;
const defaultAvailabilityLimit = 24;
const defaultLiveShowsLimit = 50;
const defaultRepDirectoryLimit = 200;

export async function getCatalogJewelryItems(options: CatalogReadOptions = {}): Promise<JewelryItem[]> {
  const result = await getCatalogJewelryItemsResult(options);
  return result.status === "success" ? result.items : fallbackItems(options);
}

export async function getCatalogJewelryItemsResult(options: CatalogReadOptions = {}): Promise<CatalogItemsReadResult> {
  const result = await getCatalogJewelryItemsPageResult(options);

  return result.status === "success"
    ? { status: "success", items: result.items }
    : { status: "error" };
}

export async function getCatalogJewelryItemsPageResult(
  options: CatalogReadOptions = {},
): Promise<CatalogPageReadResult> {
  if (!isValidCatalogPageRequest(options)) {
    return { status: "error", reason: "invalid_contract" };
  }

  const apiBaseUrl = getSparkleSuiteFinderApiBaseUrl(options);

  if (!apiBaseUrl) {
    return options.useFixtureFallback === false
      ? { status: "error", reason: "unavailable" }
      : { status: "success", pagination: "unsupported", items: fallbackCatalogItems(options) };
  }

  const params = buildCatalogParams(options, { includeLimit: true });

  try {
    const payload = await fetchJson<unknown>(
      `${apiBaseUrl}/api/public/finder/catalog?${params.toString()}`,
      options,
    );
    return parseCatalogPageResponse(payload, options);
  } catch (error) {
    const reason = error instanceof CatalogContractError ? error.reason : "unavailable";
    return options.useFixtureFallback === false
      ? { status: "error", reason }
      : { status: "success", pagination: "unsupported", items: fallbackCatalogItems(options) };
  }
}

export async function getAllCatalogJewelryItemsResult(
  options: CatalogReadOptions & { maxPages?: number } = {},
): Promise<CatalogAllPagesReadResult> {
  if (options.cursor?.trim()) {
    return { status: "error", reason: "invalid_contract" };
  }

  const maxPages = normalizeCatalogWalkPageLimit(options.maxPages);
  const items: CatalogJewelryItem[] = [];
  const seenDesignIds = new Set<string>();
  const seenCursors = new Set<string>();
  let cursor: string | undefined;
  let totalCount: number | null = null;

  for (let pageNumber = 0; pageNumber < maxPages; pageNumber += 1) {
    const page = await getCatalogJewelryItemsPageResult({
      ...options,
      cursor,
      useFixtureFallback: false,
    });
    if (page.status === "error") {
      return page;
    }
    if (page.pagination === "unsupported") {
      return { status: "error", reason: "unsupported_pagination" };
    }
    if (totalCount !== null && page.pageInfo.totalCount !== totalCount) {
      return { status: "error", reason: "invalid_contract" };
    }
    totalCount = page.pageInfo.totalCount;

    for (const item of page.items) {
      const normalizedDesignId = item.id.toLocaleLowerCase();
      if (seenDesignIds.has(normalizedDesignId)) {
        return { status: "error", reason: "duplicate_design_id" };
      }
      seenDesignIds.add(normalizedDesignId);
      items.push(item);
    }

    if (!page.pageInfo.hasMore) {
      return items.length === totalCount
        ? { status: "success", schemaVersion: 2, items, totalCount }
        : { status: "error", reason: "invalid_contract" };
    }

    const nextCursor = page.pageInfo.nextCursor;
    if (!nextCursor || seenCursors.has(nextCursor)) {
      return { status: "error", reason: "cursor_loop" };
    }
    seenCursors.add(nextCursor);
    cursor = nextCursor;
  }

  return { status: "error", reason: "page_limit" };
}

export async function getCatalogJewelryItemsByIdsResult(
  designIds: string[],
  options: Pick<CatalogReadOptions, "apiBaseUrl" | "fetcher"> = {},
): Promise<CatalogBatchReadResult> {
  const normalizedDesignIds = normalizeRequestedDesignIds(designIds);
  if (!normalizedDesignIds || normalizedDesignIds.length > maxCatalogBatchDesignIds) {
    return { status: "error", reason: "invalid_contract" };
  }
  if (normalizedDesignIds.length === 0) {
    return { status: "success", schemaVersion: 2, items: [], missingDesignIds: [] };
  }

  const apiBaseUrl = getSparkleSuiteFinderApiBaseUrl(options);
  if (!apiBaseUrl) {
    return { status: "error", reason: "unavailable" };
  }

  try {
    const payload = await fetchJson<unknown>(
      `${apiBaseUrl}/api/public/finder/catalog/batch`,
      options,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ designIds: normalizedDesignIds }),
      },
    );
    return parseCatalogBatchResponse(payload, normalizedDesignIds);
  } catch (error) {
    return {
      status: "error",
      reason: error instanceof CatalogContractError ? error.reason : "unavailable",
    };
  }
}

export async function getCatalogFacetOptions(options: CatalogReadOptions = {}): Promise<CatalogFacetOptions> {
  const apiBaseUrl = getSparkleSuiteFinderApiBaseUrl(options);

  if (!apiBaseUrl) {
    return deriveCatalogFacetOptions(getFixtureJewelryItems());
  }

  const params = buildCatalogParams(options, { includeLimit: false });
  const queryString = params.toString();
  const url = `${apiBaseUrl}/api/public/finder/catalog/facets${queryString ? `?${queryString}` : ""}`;

  try {
    const payload = await fetchJson<CatalogFacetsResponse>(url, options);
    return normalizeCatalogFacetOptions(payload.facets);
  } catch {
    return options.useFixtureFallback === false ? emptyCatalogFacetOptions() : deriveCatalogFacetOptions(getFixtureJewelryItems());
  }
}

export async function getCatalogJewelryItemById(
  itemId: string,
  options: CatalogReadOptions = {},
): Promise<JewelryItem | undefined> {
  const result = await getCatalogJewelryItemByIdResult(itemId, options);
  return result.status === "success" ? result.item : fallbackItemById(itemId.trim(), options);
}

export async function getCatalogJewelryItemByIdResult(
  itemId: string,
  options: CatalogReadOptions = {},
): Promise<CatalogItemReadResult> {
  const trimmedItemId = itemId.trim();

  if (!trimmedItemId) {
    return { status: "success", item: undefined };
  }

  const apiBaseUrl = getSparkleSuiteFinderApiBaseUrl(options);

  if (!apiBaseUrl) {
    return options.useFixtureFallback === false
      ? { status: "error" }
      : { status: "success", item: fallbackItemById(trimmedItemId, options) };
  }

  try {
    const payload = await fetchJson<unknown>(
      `${apiBaseUrl}/api/public/finder/catalog/${encodeURIComponent(trimmedItemId)}`,
      options,
    );
    if (!isRecord(payload) || !("item" in payload)) {
      throw new CatalogContractError("invalid_contract");
    }
    if (payload.item === null || payload.item === undefined) {
      return { status: "success", item: fallbackItemById(trimmedItemId, options) };
    }
    const item = parseCatalogItem(payload.item, {
      requireAvailabilityCounts: true,
      requireDescription: true,
    });
    if (item.designId.toLocaleLowerCase() !== trimmedItemId.toLocaleLowerCase()) {
      throw new CatalogContractError("invalid_contract");
    }

    return {
      status: "success",
      item: mapSparkleSuiteFinderCatalogItem(item),
    };
  } catch (error) {
    if (isCatalogApiNotFound(error)) {
      return {
        status: "success",
        item: fallbackItemById(trimmedItemId, options),
      };
    }

    return options.useFixtureFallback === false
      ? { status: "error" }
      : { status: "success", item: fallbackItemById(trimmedItemId, options) };
  }
}

export async function getFinderAvailabilityForJewelryItem(
  itemId: string,
  options: CatalogReadOptions = {},
): Promise<FinderAvailabilityResult | undefined> {
  const trimmedItemId = itemId.trim();

  if (!isValidAvailabilityRequest(trimmedItemId, options)) {
    return undefined;
  }

  const apiBaseUrl = getSparkleSuiteFinderApiBaseUrl(options);

  if (!apiBaseUrl) {
    return undefined;
  }

  const params = new URLSearchParams({
    designId: trimmedItemId,
    limit: String(options.limit ?? defaultAvailabilityLimit),
  });
  appendCatalogFilterParam(params, "exactCursor", options.exactCursor);
  appendCatalogFilterParam(params, "similarCursor", options.similarCursor);

  try {
    const payload = await fetchJson<unknown>(
      `${apiBaseUrl}/api/public/finder/availability?${params.toString()}`,
      options,
    );
    return parseAvailabilityResponse(payload, trimmedItemId, apiBaseUrl, options);
  } catch {
    return undefined;
  }
}

export async function getFinderLiveShows(options: CatalogReadOptions = {}): Promise<FinderLiveShow[]> {
  const apiBaseUrl = getSparkleSuiteFinderApiBaseUrl(options);

  if (!apiBaseUrl) {
    return fallbackLiveShows(options);
  }

  const params = new URLSearchParams({ limit: String(options.limit ?? defaultLiveShowsLimit) });

  try {
    const payload = await fetchJson<LiveShowsResponse>(
      `${apiBaseUrl}/api/public/finder/live-shows?${params.toString()}`,
      options,
    );

    return mapLiveShows(payload.shows);
  } catch {
    return fallbackLiveShows(options);
  }
}

export async function getFinderRepDirectoryData(options: CatalogReadOptions = {}): Promise<FinderRepDirectoryData> {
  const apiBaseUrl = getSparkleSuiteFinderApiBaseUrl(options);

  if (!apiBaseUrl) {
    return fallbackRepDirectoryData(options);
  }

  const params = new URLSearchParams({ limit: String(options.limit ?? defaultRepDirectoryLimit) });
  appendCatalogFilterParam(params, "query", options.query);

  try {
    const payload = await fetchJson<RepDirectoryResponse>(
      `${apiBaseUrl}/api/public/finder/reps?${params.toString()}`,
      options,
    );

    if (!Array.isArray(payload.reps)) {
      throw new Error("Sparkle Suite Finder Reps API returned an invalid payload");
    }

    return mapRepDirectoryItems(payload.reps, apiBaseUrl);
  } catch {
    return fallbackRepDirectoryData(options);
  }
}

export function mapSparkleSuiteFinderCatalogItem(item: SparkleSuiteFinderCatalogItem): CatalogJewelryItem {
  return {
    id: item.designId,
    name: item.designName.trim() || item.itemNumber,
    collectionName: item.collectionName?.trim() || "Unassigned Collection",
    collectionYear: item.collectionYear,
    jewelryType: mapSparkleSuiteFinderJewelryType(item.jewelryType),
    material: item.material,
    mainStone: item.mainStone,
    description: item.description?.trim() || null,
    bpMsrp: item.bpMsrp,
    imageUrl: item.canonicalPhotoUrl?.trim() ?? "",
    bpLabel: deriveBombPartyLabel(item),
    itemNumber: item.itemNumber,
    searchTags: Array.isArray(item.searchTags) ? [...item.searchTags] : [],
    availableListingCount: item.availableListingCount,
    availableLeadCount: item.availableLeadCount,
    availableDancerCount: item.availableDancerCount,
    knownRepListingIds: [],
  };
}

export function mapSparkleSuiteFinderJewelryType(jewelryType: SparkleSuiteFinderJewelryType): JewelryType {
  const types: Record<SparkleSuiteFinderJewelryType, JewelryType> = {
    bracelet: "bracelet",
    earrings: "earrings",
    necklace: "necklace",
    ring: "ring",
    stack: "stack",
  };

  return types[jewelryType];
}

export function getSparkleSuiteFinderPublicBaseUrl(options: Pick<CatalogReadOptions, "apiBaseUrl"> = {}): string {
  return getSparkleSuiteFinderApiBaseUrl(options);
}

export function shouldUseCatalogFixtureFallback(env: Record<string, string | undefined> = process.env): boolean {
  return env.NODE_ENV !== "production" || env.SPARKLE_FINDER_ENABLE_PREVIEW_AUTH === "true";
}

function parseAvailabilityResponse(
  payload: unknown,
  requestedDesignId: string,
  apiBaseUrl: string,
  options: Pick<CatalogReadOptions, "exactCursor" | "similarCursor">,
): FinderAvailabilityResult {
  if (
    !isRecord(payload)
    || payload.schemaVersion !== 2
    || !Array.isArray(payload.exactMatches)
    || !Array.isArray(payload.similarMatches)
  ) {
    throw new CatalogContractError("invalid_contract");
  }

  const requestedItem = parseCatalogItem(payload.requestedItem, {
    requireAvailabilityCounts: true,
    requireDescription: false,
  });
  if (requestedItem.designId !== requestedDesignId) {
    throw new CatalogContractError("invalid_contract");
  }

  const exactMatches = payload.exactMatches.map((match) =>
    parseAvailabilityMatch(match, apiBaseUrl),
  );
  const similarMatches = payload.similarMatches.map((match) =>
    parseAvailabilityMatch(match, apiBaseUrl),
  );
  if (exactMatches.some((match) => match.item.id !== requestedDesignId)) {
    throw new CatalogContractError("invalid_contract");
  }
  if (similarMatches.some((match) => match.item.id === requestedDesignId)) {
    throw new CatalogContractError("invalid_contract");
  }

  assertDistinctAvailabilityListingIds([...exactMatches, ...similarMatches]);
  const exactPageInfo = parseAvailabilityPageInfo(
    payload.exactPageInfo,
    exactMatches,
    options.exactCursor,
  );
  const similarPageInfo = parseAvailabilityPageInfo(
    payload.similarPageInfo,
    similarMatches,
    options.similarCursor,
  );

  return {
    schemaVersion: 2,
    requestedItem: mapSparkleSuiteFinderCatalogItem(requestedItem),
    exactMatches,
    similarMatches,
    exactPageInfo,
    similarPageInfo,
  };
}

function parseAvailabilityMatch(value: unknown, apiBaseUrl: string): FinderAvailabilityMatch {
  if (!isRecord(value) || !isRecord(value.rep)) {
    throw new CatalogContractError("invalid_contract");
  }

  const match = value as unknown as SparkleSuiteFinderAvailabilityMatch;
  const listingId = readRequiredString(match.listingId);
  const quantityAvailable = match.quantityAvailable;
  const listedAt = match.listedAt;
  const repId = readRequiredString(match.rep?.repId);
  const showName = readRequiredString(match.rep?.showName);
  const repFirstName = readRequiredString(match.rep?.repFirstName);
  const customerSiteUrl = readSuitePublicUrl(match.rep?.customerSiteUrl, apiBaseUrl);
  const item = parseCatalogItem(match.item, {
    requireAvailabilityCounts: true,
    requireDescription: false,
  });
  const nextShow = normalizeAvailabilityShow(
    match.nextShow,
    { customerSiteUrl: customerSiteUrl ?? "", repFirstName, showName },
    repId,
  );

  if (
    !listingId
    || listingId.length > maxCatalogDesignIdLength
    || !isPositiveSafeInteger(quantityAvailable)
    || (listedAt !== null && (typeof listedAt !== "string" || Number.isNaN(Date.parse(listedAt))))
    || !nextShow
    || !customerSiteUrl
    || !showName
    || !repFirstName
    || (match.photoSource !== "listing" && match.photoSource !== "canonical" && match.photoSource !== "missing")
    || (match.photoSource === "missing" && match.photoUrl !== null)
  ) {
    throw new CatalogContractError("invalid_contract");
  }

  return {
    listingId,
    quantityAvailable,
    listedAt,
    photoUrl: normalizeAvailabilityPhoto(match),
    photoSource: match.photoSource,
    item: mapSparkleSuiteFinderCatalogItem(item),
    showName,
    repFirstName,
    customerSiteUrl,
    nextShow,
  };
}

function parseAvailabilityPageInfo(
  value: unknown,
  matches: FinderAvailabilityMatch[],
  requestedCursor: string | undefined,
): FinderAvailabilityPageInfo {
  if (!isRecord(value)) {
    throw new CatalogContractError("invalid_contract");
  }
  const { totalLeadCount, totalDancerCount, hasMore, nextCursor } = value;
  const currentPageDancerCount = matches.reduce((sum, match) => sum + match.quantityAvailable, 0);
  if (
    !isNonnegativeInteger(totalLeadCount)
    || !isNonnegativeInteger(totalDancerCount)
    || !Number.isSafeInteger(currentPageDancerCount)
    || totalLeadCount < matches.length
    || totalDancerCount < totalLeadCount
    || totalDancerCount < currentPageDancerCount
    || typeof hasMore !== "boolean"
    || (nextCursor !== null && typeof nextCursor !== "string")
  ) {
    throw new CatalogContractError("invalid_contract");
  }

  const normalizedNextCursor = typeof nextCursor === "string" ? nextCursor.trim() : null;
  const normalizedRequestedCursor = requestedCursor?.trim();
  if (
    (hasMore && (!normalizedNextCursor || normalizedNextCursor.length > maxCatalogCursorLength || matches.length === 0))
    || (hasMore && totalLeadCount <= matches.length)
    || (!hasMore && normalizedNextCursor !== null)
    || (normalizedRequestedCursor && normalizedNextCursor === normalizedRequestedCursor)
    || (!normalizedRequestedCursor && !hasMore && totalLeadCount !== matches.length)
    || (!normalizedRequestedCursor
      && !hasMore
      && totalDancerCount !== currentPageDancerCount)
  ) {
    throw new CatalogContractError("invalid_contract");
  }

  return {
    totalLeadCount,
    totalDancerCount,
    hasMore,
    nextCursor: normalizedNextCursor,
  };
}

function assertDistinctAvailabilityListingIds(matches: FinderAvailabilityMatch[]): void {
  const seen = new Set<string>();
  for (const match of matches) {
    if (seen.has(match.listingId)) {
      throw new CatalogContractError("duplicate_design_id");
    }
    seen.add(match.listingId);
  }
}

function isPositiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function normalizeAvailabilityShow(
  value: SparkleSuiteFinderAvailabilityMatch["nextShow"],
  fallback: Pick<SparkleSuiteFinderLeadShow, "customerSiteUrl" | "repFirstName" | "showName">,
  expectedRepId: string,
): SparkleSuiteFinderLeadShow | null {
  if (!value) {
    return null;
  }

  const showId = readRequiredString(value.showId);
  const startsAt = readRequiredString(value.startsAt);
  const status = value.status === "live" || value.status === "scheduled" ? value.status : null;
  const showName = ("showName" in value ? readRequiredString(value.showName) : readRequiredString(value.title))
    || fallback.showName;
  const repFirstName = "repFirstName" in value ? readRequiredString(value.repFirstName) : fallback.repFirstName;
  const customerSiteUrl = fallback.customerSiteUrl;
  const nextShowRepId = "repId" in value ? readRequiredString(value.repId) : expectedRepId;

  if (
    !showId
    || !startsAt
    || Number.isNaN(Date.parse(startsAt))
    || !status
    || !showName
    || !repFirstName
    || !customerSiteUrl
    || (expectedRepId && nextShowRepId !== expectedRepId)
  ) {
    return null;
  }

  return {
    showId,
    showName,
    repFirstName,
    startsAt,
    status,
    customerSiteUrl,
  };
}

function normalizeAvailabilityPhoto(match: SparkleSuiteFinderAvailabilityMatch): string | null {
  if (match.photoSource === "missing") {
    return null;
  }

  const photoUrl = readHttpsUrl(match.photoUrl);

  if (match.photoSource === "canonical") {
    const canonicalPhotoUrl = readHttpsUrl(match.item.canonicalPhotoUrl);
    return photoUrl && canonicalPhotoUrl === photoUrl ? photoUrl : null;
  }

  return photoUrl;
}

function mapLiveShows(shows: SparkleSuiteFinderLeadShow[] | undefined): FinderLiveShow[] {
  return (shows ?? []).filter((show) => Boolean(show.showId && show.showName && show.repFirstName && show.startsAt && show.customerSiteUrl));
}

function mapRepDirectoryItems(items: unknown[], apiBaseUrl: string): FinderRepDirectoryData {
  const seenRepIds = new Set<string>();
  const directoryItems = items.flatMap((item) => {
    const normalized = normalizeRepDirectoryItem(item, apiBaseUrl);

    if (!normalized || seenRepIds.has(normalized.repId)) {
      return [];
    }

    seenRepIds.add(normalized.repId);
    return [normalized];
  });

  return {
    reps: directoryItems.map(mapRepDirectoryRep),
    liveShows: directoryItems.flatMap(mapRepDirectoryLiveShow),
    boardListings: directoryItems.flatMap(mapRepDirectoryBoardListing),
    status: directoryItems.length > 0 ? "ready" : items.length === 0 ? "empty" : "unavailable",
  };
}

function normalizeRepDirectoryItem(value: unknown, apiBaseUrl: string): SparkleSuiteFinderRepDirectoryItem | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const repId = readRequiredString(record.repId);
  const displayName = readRequiredString(record.displayName);

  if (!repId || !displayName) {
    return null;
  }

  return {
    repId,
    displayName,
    businessName: readOptionalString(record.businessName),
    avatarUrl: readHttpsUrl(record.avatarUrl),
    state: readOptionalString(record.state),
    customerSiteUrl: readSuitePublicUrl(record.customerSiteUrl, apiBaseUrl),
    repBoardUrl: readSuitePublicUrl(record.repBoardUrl, apiBaseUrl),
    nextShow: normalizeRepDirectoryShow(record.nextShow, apiBaseUrl),
  };
}

function normalizeRepDirectoryShow(
  value: unknown,
  apiBaseUrl: string,
): SparkleSuiteFinderRepDirectoryShow | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id = readRequiredString(record.showId) || readRequiredString(record.id);
  const title = readRequiredString(record.showName) || readRequiredString(record.title);
  const startsAt = readRequiredString(record.startsAt);
  const status = record.status === "live" || record.status === "scheduled" ? record.status : null;
  const customerShowUrl = readSuitePublicUrl(record.customerSiteUrl ?? record.customerShowUrl, apiBaseUrl);

  if (!id || !title || !startsAt || Number.isNaN(Date.parse(startsAt)) || !status) {
    return null;
  }

  return {
    id,
    title,
    startsAt,
    status,
    customerShowUrl,
    durationMinutes:
      typeof record.durationMinutes === "number" && Number.isFinite(record.durationMinutes)
        ? Math.max(0, Math.floor(record.durationMinutes))
        : null,
  };
}

function readRequiredString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalString(value: unknown): string | null {
  const trimmed = readRequiredString(value);
  return trimmed || null;
}

function readHttpsUrl(value: unknown): string | null {
  const trimmed = readRequiredString(value);

  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" && !url.username && !url.password && !url.port ? url.toString() : null;
  } catch {
    return null;
  }
}

function readSuitePublicUrl(value: unknown, apiBaseUrl: string): string | null {
  const safeUrl = readHttpsUrl(value);

  if (!safeUrl) {
    return null;
  }

  try {
    const candidate = new URL(safeUrl);
    const suiteBase = new URL(apiBaseUrl);
    const allowedHosts = new Set([
      suiteBase.hostname.toLowerCase(),
      getAlternateWwwHostname(suiteBase.hostname),
      "yoursparklesuite.com",
      "www.yoursparklesuite.com",
    ]);

    return allowedHosts.has(candidate.hostname.toLowerCase()) ? candidate.toString() : null;
  } catch {
    return null;
  }
}

function getAlternateWwwHostname(hostname: string): string {
  const normalized = hostname.toLowerCase();
  return normalized.startsWith("www.") ? normalized.slice(4) : `www.${normalized}`;
}

function mapRepDirectoryRep(item: SparkleSuiteFinderRepDirectoryItem): RepSummary {
  return {
    id: item.repId,
    avatarUrl: item.avatarUrl?.trim() ?? "",
    businessName: item.businessName?.trim() || item.displayName,
    displayName: item.displayName,
    nextLiveShowId: getRepDirectoryShowId(item.nextShow),
    siteUrl: item.customerSiteUrl?.trim() ?? "",
    state: item.state?.trim() ?? "",
  };
}

function mapRepDirectoryLiveShow(item: SparkleSuiteFinderRepDirectoryItem): LiveShow[] {
  const show = item.nextShow;

  if (!show) {
    return [];
  }

  const showId = getRepDirectoryShowId(show);
  const title = getRepDirectoryShowTitle(show);
  const startsAt = getRepDirectoryShowStartsAt(show);
  const showUrl = getRepDirectoryShowUrl(show, item.customerSiteUrl);

  if (!showId || !title || !startsAt) {
    return [];
  }

  return [
    {
      id: showId,
      durationMinutes: "durationMinutes" in show && typeof show.durationMinutes === "number" ? show.durationMinutes : 120,
      repId: item.repId,
      showUrl,
      startsAt,
      status: show.status,
      title,
    },
  ];
}

function mapRepDirectoryBoardListing(item: SparkleSuiteFinderRepDirectoryItem): RepBoardListing[] {
  const boardUrl = item.repBoardUrl?.trim();

  if (!boardUrl) {
    return [];
  }

  return [
    {
      id: `${item.repId}-board`,
      boardUrl,
      jewelryItemId: "",
      listedAt: getRepDirectoryShowStartsAt(item.nextShow),
      repId: item.repId,
      status: "available",
    },
  ];
}

function getRepDirectoryShowId(show: SparkleSuiteFinderRepDirectoryShow | null): string {
  if (!show) {
    return "";
  }

  return "showId" in show ? show.showId : show.id;
}

function getRepDirectoryShowTitle(show: SparkleSuiteFinderRepDirectoryShow | null): string {
  if (!show) {
    return "";
  }

  return "showName" in show ? show.showName : show.title;
}

function getRepDirectoryShowStartsAt(show: SparkleSuiteFinderRepDirectoryShow | null): string {
  return show?.startsAt ?? "";
}

function getRepDirectoryShowUrl(show: SparkleSuiteFinderRepDirectoryShow, repSiteUrl: string | null): string {
  const showUrl = "customerSiteUrl" in show ? show.customerSiteUrl : show.customerShowUrl;

  return showUrl?.trim() || repSiteUrl?.trim() || "";
}

function parseCatalogPageResponse(payload: unknown, options: CatalogReadOptions): CatalogPageReadResult {
  if (!isRecord(payload) || !Array.isArray(payload.items)) {
    throw new CatalogContractError("invalid_contract");
  }

  if (payload.schemaVersion === undefined) {
    const legacyItems = parseCatalogItems(payload.items, {
      requireAvailabilityCounts: false,
      requireDescription: false,
    });
    assertDistinctCatalogDesignIds(legacyItems);
    return {
      status: "success",
      pagination: "unsupported",
      items: legacyItems.map(mapSparkleSuiteFinderCatalogItem),
    };
  }

  if (payload.schemaVersion !== 2 || !isRecord(payload.pageInfo)) {
    throw new CatalogContractError("invalid_contract");
  }

  const items = parseCatalogItems(payload.items, {
    requireAvailabilityCounts: true,
    requireDescription: true,
  });
  assertDistinctCatalogDesignIds(items);
  const pageInfo = parseCatalogPageInfo(payload.pageInfo, items.length);
  const requestedLimit = options.limit ?? defaultCatalogLimit;
  if (!Number.isSafeInteger(requestedLimit) || requestedLimit < 1 || items.length > requestedLimit) {
    throw new CatalogContractError("invalid_contract");
  }
  const requestedCursor = options.cursor?.trim();
  if (requestedCursor && pageInfo.nextCursor === requestedCursor) {
    throw new CatalogContractError("cursor_loop");
  }

  return {
    status: "success",
    pagination: "supported",
    schemaVersion: 2,
    items: items.map(mapSparkleSuiteFinderCatalogItem),
    pageInfo,
  };
}

function parseCatalogBatchResponse(
  payload: unknown,
  requestedDesignIds: string[],
): CatalogBatchReadResult {
  if (
    !isRecord(payload)
    || payload.schemaVersion !== 2
    || !Array.isArray(payload.items)
    || !Array.isArray(payload.missingDesignIds)
  ) {
    throw new CatalogContractError("invalid_contract");
  }

  const rawItems = parseCatalogItems(payload.items, {
    requireAvailabilityCounts: true,
    requireDescription: true,
  });
  assertDistinctCatalogDesignIds(rawItems);
  const missingDesignIds = payload.missingDesignIds.map((designId) => {
    const normalized = readRequiredString(designId);
    if (!normalized) {
      throw new CatalogContractError("invalid_contract");
    }
    return normalized;
  });
  assertDistinctDesignIdStrings(missingDesignIds);

  const requestedByNormalizedId = new Map(
    requestedDesignIds.map((designId) => [designId.toLocaleLowerCase(), designId]),
  );
  const itemByNormalizedId = new Map(
    rawItems.map((item) => [item.designId.toLocaleLowerCase(), item]),
  );
  const missingNormalizedIds = new Set(missingDesignIds.map((designId) => designId.toLocaleLowerCase()));

  for (const designId of itemByNormalizedId.keys()) {
    if (!requestedByNormalizedId.has(designId) || missingNormalizedIds.has(designId)) {
      throw new CatalogContractError("invalid_contract");
    }
  }
  for (const designId of missingNormalizedIds) {
    if (!requestedByNormalizedId.has(designId) || itemByNormalizedId.has(designId)) {
      throw new CatalogContractError("invalid_contract");
    }
  }
  for (const designId of requestedByNormalizedId.keys()) {
    if (!itemByNormalizedId.has(designId) && !missingNormalizedIds.has(designId)) {
      throw new CatalogContractError("invalid_contract");
    }
  }

  return {
    status: "success",
    schemaVersion: 2,
    items: requestedDesignIds.flatMap((designId) => {
      const item = itemByNormalizedId.get(designId.toLocaleLowerCase());
      return item ? [mapSparkleSuiteFinderCatalogItem(item)] : [];
    }),
    missingDesignIds: requestedDesignIds.filter((designId) =>
      missingNormalizedIds.has(designId.toLocaleLowerCase()),
    ),
  };
}

function parseCatalogPageInfo(value: Record<string, unknown>, itemCount: number): CatalogPageInfo {
  const { totalCount, hasMore, nextCursor } = value;
  if (
    !Number.isSafeInteger(totalCount)
    || Number(totalCount) < 0
    || typeof hasMore !== "boolean"
    || (nextCursor !== null && typeof nextCursor !== "string")
  ) {
    throw new CatalogContractError("invalid_contract");
  }
  const normalizedNextCursor = typeof nextCursor === "string" ? nextCursor.trim() : null;
  if (
    Number(totalCount) < itemCount
    || (hasMore && Number(totalCount) <= itemCount)
    || (hasMore && (!normalizedNextCursor || normalizedNextCursor.length > maxCatalogCursorLength || itemCount === 0))
    || (!hasMore && normalizedNextCursor !== null)
  ) {
    throw new CatalogContractError("invalid_contract");
  }
  return {
    totalCount: Number(totalCount),
    hasMore,
    nextCursor: normalizedNextCursor,
  };
}

function parseCatalogItems(
  values: unknown[],
  options: CatalogItemParseOptions,
): SparkleSuiteFinderCatalogItem[] {
  return values.map((value) => parseCatalogItem(value, options));
}

function parseCatalogItem(
  value: unknown,
  { requireAvailabilityCounts, requireDescription }: CatalogItemParseOptions,
): SparkleSuiteFinderCatalogItem {
  if (!isRecord(value)) {
    throw new CatalogContractError("invalid_contract");
  }
  const designId = readRequiredString(value.designId);
  const itemNumber = readRequiredString(value.itemNumber);
  const designName = readRequiredString(value.designName);
  const jewelryType = value.jewelryType;
  const description = value.description;
  if (
    !designId
    || !itemNumber
    || !designName
    || !isSparkleSuiteFinderJewelryType(jewelryType)
    || !isNullableString(value.collectionName)
    || !isNullableInteger(value.collectionYear)
    || !isNullableString(value.material)
    || !isNullableString(value.mainStone)
    || !isNullableFiniteNumber(value.bpMsrp)
    || !isNullableString(value.canonicalPhotoUrl)
    || !Array.isArray(value.searchTags)
    || !value.searchTags.every((tag) => typeof tag === "string")
    || !isNonnegativeInteger(value.availableListingCount)
    || (requireAvailabilityCounts && !isNonnegativeInteger(value.availableLeadCount))
    || (requireAvailabilityCounts && !isNonnegativeInteger(value.availableDancerCount))
    || (requireAvailabilityCounts && Number(value.availableListingCount) !== Number(value.availableLeadCount))
    || (requireAvailabilityCounts && Number(value.availableDancerCount) < Number(value.availableLeadCount))
    || (requireDescription
      ? !("description" in value) || !isNullableString(description)
      : description !== undefined && !isNullableString(description))
  ) {
    throw new CatalogContractError("invalid_contract");
  }

  return {
    designId,
    itemNumber,
    designName,
    collectionName: cleanNullableString(value.collectionName),
    collectionYear: value.collectionYear as number | null,
    jewelryType,
    material: cleanNullableString(value.material),
    mainStone: cleanNullableString(value.mainStone),
    bpMsrp: value.bpMsrp as number | null,
    canonicalPhotoUrl: cleanNullableString(value.canonicalPhotoUrl),
    description: cleanNullableString(description),
    searchTags: [...value.searchTags],
    availableListingCount: Number(value.availableListingCount),
    availableLeadCount: value.availableLeadCount === undefined ? undefined : Number(value.availableLeadCount),
    availableDancerCount: value.availableDancerCount === undefined ? undefined : Number(value.availableDancerCount),
  };
}

type CatalogItemParseOptions = {
  requireAvailabilityCounts: boolean;
  requireDescription: boolean;
};

function assertDistinctCatalogDesignIds(items: SparkleSuiteFinderCatalogItem[]): void {
  assertDistinctDesignIdStrings(items.map((item) => item.designId));
}

function assertDistinctDesignIdStrings(designIds: string[]): void {
  const seen = new Set<string>();
  for (const designId of designIds) {
    const normalized = designId.toLocaleLowerCase();
    if (seen.has(normalized)) {
      throw new CatalogContractError("duplicate_design_id");
    }
    seen.add(normalized);
  }
}

function normalizeRequestedDesignIds(designIds: string[]): string[] | null {
  if (!Array.isArray(designIds)) {
    return null;
  }
  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const value of designIds) {
    const designId = readRequiredString(value);
    if (!designId || designId.length > maxCatalogDesignIdLength) {
      return null;
    }
    const normalizedDesignId = designId.toLocaleLowerCase();
    if (seen.has(normalizedDesignId)) {
      continue;
    }
    seen.add(normalizedDesignId);
    normalized.push(designId);
    if (normalized.length > maxCatalogBatchDesignIds) {
      return normalized;
    }
  }
  return normalized;
}

function isValidCatalogPageRequest(options: CatalogReadOptions): boolean {
  const limit = options.limit ?? defaultCatalogLimit;
  return Number.isSafeInteger(limit)
    && limit >= 1
    && limit <= maxCatalogLimit
    && (options.collectionYear === undefined
      || (Number.isSafeInteger(options.collectionYear)
        && options.collectionYear >= 0
        && options.collectionYear <= maxCatalogYear))
    && isBoundedOptionalString(options.cursor, maxCatalogCursorLength)
    && isBoundedOptionalString(options.query, maxCatalogQueryLength)
    && isBoundedOptionalString(options.collection, maxCatalogFilterLength)
    && isBoundedOptionalString(options.material, maxCatalogFilterLength)
    && isBoundedOptionalString(options.mainStone, maxCatalogFilterLength)
    && isBoundedOptionalString(options.type, maxCatalogFilterLength)
    && isBoundedOptionalString(options.label, maxCatalogFilterLength);
}

function isValidAvailabilityRequest(itemId: string, options: CatalogReadOptions): boolean {
  const limit = options.limit ?? defaultAvailabilityLimit;
  return Boolean(itemId)
    && itemId.length <= maxCatalogDesignIdLength
    && Number.isSafeInteger(limit)
    && limit >= 1
    && limit <= maxCatalogLimit
    && isBoundedOptionalString(options.exactCursor, maxCatalogCursorLength)
    && isBoundedOptionalString(options.similarCursor, maxCatalogCursorLength);
}

function isBoundedOptionalString(value: unknown, maxLength: number): boolean {
  return value === undefined || (typeof value === "string" && value.trim().length <= maxLength);
}

function normalizeCatalogWalkPageLimit(value: number | undefined): number {
  if (value === undefined) {
    return defaultCatalogWalkMaxPages;
  }
  return Number.isSafeInteger(value) && value >= 1
    ? Math.min(value, defaultCatalogWalkMaxPages)
    : 0;
}

function isSparkleSuiteFinderJewelryType(value: unknown): value is SparkleSuiteFinderJewelryType {
  return value === "ring"
    || value === "necklace"
    || value === "earrings"
    || value === "stack"
    || value === "bracelet";
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNullableInteger(value: unknown): value is number | null {
  return value === null || (Number.isSafeInteger(value) && Number(value) >= 0);
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0);
}

function isNonnegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function cleanNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

async function fetchJson<T>(
  url: string,
  options: Pick<CatalogReadOptions, "fetcher">,
  init: RequestInit = {},
): Promise<T> {
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(url, { cache: "no-store", ...init });

  if (!response.ok) {
    throw new CatalogApiError(response.status);
  }

  return (await response.json()) as T;
}

class CatalogApiError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Sparkle Suite Finder API returned ${status}`);
    this.name = "CatalogApiError";
    this.status = status;
  }
}

class CatalogContractError extends Error {
  readonly reason: CatalogReadErrorReason;

  constructor(reason: CatalogReadErrorReason) {
    super(`Sparkle Suite Finder catalog contract failed: ${reason}`);
    this.name = "CatalogContractError";
    this.reason = reason;
  }
}

function isCatalogApiNotFound(error: unknown): boolean {
  return error instanceof CatalogApiError && error.status === 404;
}

function getSparkleSuiteFinderApiBaseUrl(options: Pick<CatalogReadOptions, "apiBaseUrl"> = {}): string {
  const configured =
    options.apiBaseUrl ??
    process.env.SPARKLE_SUITE_FINDER_API_BASE_URL ??
    process.env.NEXT_PUBLIC_SPARKLE_SUITE_FINDER_API_BASE_URL ??
    defaultSparkleSuiteFinderApiBaseUrl;

  return configured.trim().replace(/\/+$/, "");
}

function buildCatalogParams(options: CatalogReadOptions, { includeLimit }: { includeLimit: boolean }): URLSearchParams {
  const params = new URLSearchParams();

  if (includeLimit) {
    params.set("limit", String(options.limit ?? defaultCatalogLimit));
    appendCatalogFilterParam(params, "cursor", options.cursor);
  }

  appendCatalogFilterParam(params, "query", options.query);
  appendCatalogFilterParam(params, "type", options.type);
  appendCatalogFilterParam(params, "collection", options.collection);
  appendCatalogFilterParam(params, "material", options.material);
  appendCatalogFilterParam(params, "stone", options.mainStone);
  appendCatalogFilterParam(params, "label", options.label);
  if (typeof options.collectionYear === "number") {
    params.set("year", String(options.collectionYear));
  }

  return params;
}

function appendCatalogFilterParam(params: URLSearchParams, key: string, value: string | null | undefined): void {
  const trimmed = value?.trim();

  if (trimmed && trimmed !== "all") {
    params.set(key, trimmed);
  }
}

function normalizeCatalogFacetOptions(facets: Partial<CatalogFacetOptions> | undefined): CatalogFacetOptions {
  const empty = emptyCatalogFacetOptions();

  return {
    collections: normalizeFacetList(facets?.collections ?? empty.collections),
    materials: normalizeFacetList(facets?.materials ?? empty.materials),
    stones: normalizeFacetList(facets?.stones ?? empty.stones),
    types: normalizeFacetList(facets?.types ?? empty.types),
    labels: normalizeFacetList(facets?.labels ?? empty.labels),
    years: normalizeFacetList(facets?.years ?? empty.years),
  };
}

function normalizeFacetList(options: CatalogFacetOption[]): CatalogFacetOption[] {
  return options.flatMap((option) => {
    const value = option.value?.trim();
    const count = Number.isFinite(option.count) ? Math.max(0, option.count) : 0;

    return value && count > 0 ? [{ value, count }] : [];
  });
}

function deriveCatalogFacetOptions(items: JewelryItem[]): CatalogFacetOptions {
  return {
    collections: countFacetValues(items.map((item) => item.collectionName)),
    materials: countFacetValues(items.map((item) => item.material ?? "")),
    stones: countFacetValues(items.map((item) => item.mainStone ?? "")),
    types: countFacetValues(items.map((item) => item.jewelryType)),
    labels: countFacetValues(items.map((item) => item.bpLabel)),
    years: countFacetValues(items.map((item) => (item.collectionYear ? String(item.collectionYear) : ""))),
  };
}

function countFacetValues(values: string[]): CatalogFacetOption[] {
  const counts = new Map<string, number>();

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => left.value.localeCompare(right.value));
}

function emptyCatalogFacetOptions(): CatalogFacetOptions {
  return {
    collections: [],
    materials: [],
    stones: [],
    types: [],
    labels: [],
    years: [],
  };
}

function deriveBombPartyLabel(item: SparkleSuiteFinderCatalogItem): BombPartyLabel {
  return item.rarityClassification === "diamond" || item.rarityClassification === "unicorn"
    ? item.rarityClassification
    : "standard";
}

function fallbackItems(options: CatalogReadOptions): JewelryItem[] {
  return options.useFixtureFallback === false ? [] : getFixtureJewelryItems();
}

function fallbackCatalogItems(options: CatalogReadOptions): CatalogJewelryItem[] {
  return fallbackItems(options).map((item) => ({
    ...item,
    description: item.description?.trim() || null,
  }));
}

function fallbackItemById(itemId: string, options: CatalogReadOptions): CatalogJewelryItem | undefined {
  return fallbackCatalogItems(options).find((item) => item.id === itemId);
}

function getFixtureJewelryItems(): JewelryItem[] {
  return sparkleFinderJewelryItems.map((item) => ({ ...item }));
}

function fallbackLiveShows(options: CatalogReadOptions): FinderLiveShow[] {
  if (options.useFixtureFallback === false) {
    return [];
  }

  return sparkleFinderLiveShows.flatMap((show) => {
    const rep = sparkleFinderReps.find((candidate) => candidate.id === show.repId);

    if (!rep) {
      return [];
    }

    return [
      {
        showId: show.id,
        showName: show.title,
        repFirstName: rep.displayName.split(" ").filter(Boolean)[0] ?? rep.displayName,
        startsAt: show.startsAt,
        status: show.status === "live" ? "live" : "scheduled",
        customerSiteUrl: rep.siteUrl,
      },
    ];
  });
}

function fallbackRepDirectoryData(options: CatalogReadOptions): FinderRepDirectoryData {
  if (options.useFixtureFallback === false) {
    return {
      boardListings: [],
      liveShows: [],
      reps: [],
      status: "unavailable",
    };
  }

  return {
    boardListings: sparkleFinderRepBoardListings.map((listing) => ({ ...listing })),
    liveShows: sparkleFinderLiveShows.map((show) => ({ ...show })),
    reps: sparkleFinderReps.map((rep) => ({ ...rep })),
    status: sparkleFinderReps.length > 0 ? "ready" : "empty",
  };
}
