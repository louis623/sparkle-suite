import { describe, expect, it, vi } from "vitest";
import {
  getCatalogJewelryItemById,
  getCatalogJewelryItemByIdResult,
  getCatalogJewelryItemsByIdsResult,
  getCatalogFacetOptions,
  getAllCatalogJewelryItemsResult,
  getCatalogJewelryItems,
  getCatalogJewelryItemsPageResult,
  getCatalogJewelryItemsResult,
  getFinderAvailabilityForJewelryItem,
  getFinderLiveShows,
  getFinderRepDirectoryData,
  getSparkleSuiteFinderPublicBaseUrl,
  mapSparkleSuiteFinderCatalogItem,
  mapSparkleSuiteFinderJewelryType,
  type SparkleSuiteFinderCatalogItem,
  type SparkleSuiteFinderRepDirectoryItem,
} from "../../lib/sparkle-finder/catalog-service";

describe("Sparkle Finder public API catalog service", () => {
  it("maps Sparkle Suite Finder API catalog items into Finder library records", () => {
    const item = mapSparkleSuiteFinderCatalogItem(
      apiCatalogItem({
        designName: "Starlight Diamond Ring",
        rarityClassification: "standard",
        jewelryType: "ring",
        searchTags: ["rose gold", "diamond"],
      }),
    );

    expect(item).toEqual({
      id: "design-123",
      name: "Starlight Diamond Ring",
      collectionName: "Midnight Garden",
      collectionYear: 2026,
      jewelryType: "ring",
      material: "Rose gold",
      mainStone: "Pink stone",
      description: null,
      bpMsrp: 19.95,
      imageUrl: "https://cdn.example.test/design-123.jpg",
      bpLabel: "standard",
      itemNumber: "RG1234",
      searchTags: ["rose gold", "diamond"],
      availableListingCount: 2,
      availableLeadCount: 2,
      availableDancerCount: 3,
      knownRepListingIds: [],
    });
  });

  it("uses only the explicit rarity classification, never descriptive diamond text", () => {
    expect(mapSparkleSuiteFinderCatalogItem(apiCatalogItem({
      designName: "Diamond Cubic Zirconia Earrings",
      mainStone: "Diamond CZ",
      searchTags: ["diamond"],
      rarityClassification: "standard",
    })).bpLabel).toBe("standard");
    expect(mapSparkleSuiteFinderCatalogItem(apiCatalogItem({
      rarityClassification: "unicorn",
      searchTags: [],
    })).bpLabel).toBe("unicorn");
  });

  it("keeps Sparkle Suite stack items as a first-class Finder type", () => {
    expect(mapSparkleSuiteFinderJewelryType("stack")).toBe("stack");
    expect(mapSparkleSuiteFinderJewelryType("bracelet")).toBe("bracelet");
    expect(mapSparkleSuiteFinderJewelryType("earrings")).toBe("earrings");
    expect(mapSparkleSuiteFinderJewelryType("necklace")).toBe("necklace");
    expect(mapSparkleSuiteFinderJewelryType("ring")).toBe("ring");
  });

  it("reads catalog items from the Sparkle Suite public Finder API", async () => {
    const fetchCatalog = vi.fn(async () => jsonResponse({ items: [apiCatalogItem({ designId: "design-api" })] }));

    const items = await getCatalogJewelryItems({
      apiBaseUrl: "https://suite.example",
      fetcher: fetchCatalog,
      useFixtureFallback: false,
    });

    expect(fetchCatalog).toHaveBeenCalledWith("https://suite.example/api/public/finder/catalog?limit=50", {
      cache: "no-store",
    });
    expect(items).toEqual([
      expect.objectContaining({
        id: "design-api",
        itemNumber: "RG1234",
        material: "Rose gold",
        mainStone: "Pink stone",
        bpMsrp: 19.95,
        collectionYear: 2026,
        searchTags: ["rose gold"],
        availableListingCount: 2,
      }),
    ]);
  });

  it("passes structured catalog browse filters to the Sparkle Suite public Finder API", async () => {
    const fetchCatalog = vi.fn(async () => jsonResponse({ items: [] }));

    await getCatalogJewelryItems({
      apiBaseUrl: "https://suite.example",
      fetcher: fetchCatalog,
      useFixtureFallback: false,
      query: "opal",
      type: "ring",
      collection: "Midnight Garden",
      material: "Rose gold",
      mainStone: "Pink stone",
      label: "diamond",
      collectionYear: 2026,
      limit: 12,
    });

    expect(fetchCatalog).toHaveBeenCalledWith(
      "https://suite.example/api/public/finder/catalog?limit=12&query=opal&type=ring&collection=Midnight+Garden&material=Rose+gold&stone=Pink+stone&label=diamond&year=2026",
      {
        cache: "no-store",
      },
    );
  });

  it("reads authoritative v2 page metadata and keeps same-item-number designs distinct", async () => {
    const fetchCatalog = vi.fn(async () =>
      jsonResponse({
        schemaVersion: 2,
        items: [
          apiCatalogItem({
            designId: "design-variant-a",
            itemNumber: "RG-SAME",
            description: "First exact variant",
          }),
          apiCatalogItem({
            designId: "design-variant-b",
            itemNumber: "RG-SAME",
            description: "Second exact variant",
          }),
        ],
        pageInfo: { totalCount: 4, hasMore: true, nextCursor: "opaque.page.2" },
      }),
    );

    const result = await getCatalogJewelryItemsPageResult({
      apiBaseUrl: "https://suite.example",
      cursor: "opaque.page.1",
      fetcher: fetchCatalog,
      limit: 2,
      useFixtureFallback: false,
    });

    expect(fetchCatalog).toHaveBeenCalledWith(
      "https://suite.example/api/public/finder/catalog?limit=2&cursor=opaque.page.1",
      { cache: "no-store" },
    );
    expect(result).toEqual({
      status: "success",
      pagination: "supported",
      schemaVersion: 2,
      items: [
        expect.objectContaining({
          id: "design-variant-a",
          itemNumber: "RG-SAME",
          description: "First exact variant",
        }),
        expect.objectContaining({
          id: "design-variant-b",
          itemNumber: "RG-SAME",
          description: "Second exact variant",
        }),
      ],
      pageInfo: { totalCount: 4, hasMore: true, nextCursor: "opaque.page.2" },
    });
  });

  it("accepts an authoritative short page when metadata says more results remain", async () => {
    const result = await getCatalogJewelryItemsPageResult({
      apiBaseUrl: "https://suite.example",
      fetcher: vi.fn(async () =>
        jsonResponse({
          schemaVersion: 2,
          items: [apiCatalogItem({ designId: "design-short", description: null })],
          pageInfo: { totalCount: 51, hasMore: true, nextCursor: "short-page-next" },
        }),
      ),
      limit: 50,
      useFixtureFallback: false,
    });

    expect(result).toMatchObject({
      status: "success",
      pagination: "supported",
      pageInfo: { totalCount: 51, hasMore: true, nextCursor: "short-page-next" },
    });
  });

  it("rejects invalid page bounds before making a catalog request", async () => {
    const fetchCatalog = vi.fn();
    const oversizedLimit = await getCatalogJewelryItemsPageResult({
      apiBaseUrl: "https://suite.example",
      fetcher: fetchCatalog,
      limit: 51,
      useFixtureFallback: false,
    });
    const oversizedQuery = await getCatalogJewelryItemsPageResult({
      apiBaseUrl: "https://suite.example",
      fetcher: fetchCatalog,
      query: "q".repeat(257),
      useFixtureFallback: false,
    });
    const oversizedFilter = await getCatalogJewelryItemsPageResult({
      apiBaseUrl: "https://suite.example",
      collection: "c".repeat(161),
      fetcher: fetchCatalog,
      useFixtureFallback: false,
    });

    expect(oversizedLimit).toEqual({ status: "error", reason: "invalid_contract" });
    expect(oversizedQuery).toEqual({ status: "error", reason: "invalid_contract" });
    expect(oversizedFilter).toEqual({ status: "error", reason: "invalid_contract" });
    expect(fetchCatalog).not.toHaveBeenCalled();
  });

  it("detects the legacy catalog response without claiming pagination support", async () => {
    const result = await getCatalogJewelryItemsPageResult({
      apiBaseUrl: "https://suite.example",
      fetcher: vi.fn(async () => jsonResponse({ items: [apiCatalogItem()] })),
      useFixtureFallback: false,
    });

    expect(result).toEqual({
      status: "success",
      pagination: "unsupported",
      items: [expect.objectContaining({ id: "design-123", description: null })],
    });
  });

  it("fails closed on malformed v2 metadata and catalog item fields", async () => {
    const malformedMetadata = await getCatalogJewelryItemsPageResult({
      apiBaseUrl: "https://suite.example",
      fetcher: vi.fn(async () =>
        jsonResponse({
          schemaVersion: 2,
          items: [apiCatalogItem({ description: null })],
          pageInfo: { totalCount: 1, hasMore: true, nextCursor: null },
        }),
      ),
      useFixtureFallback: false,
    });
    const malformedItem = await getCatalogJewelryItemsPageResult({
      apiBaseUrl: "https://suite.example",
      fetcher: vi.fn(async () =>
        jsonResponse({
          schemaVersion: 2,
          items: [{ ...apiCatalogItem({ description: null }), availableListingCount: -1 }],
          pageInfo: { totalCount: 1, hasMore: false, nextCursor: null },
        }),
      ),
      useFixtureFallback: false,
    });
    const unsafeMetadata = await getCatalogJewelryItemsPageResult({
      apiBaseUrl: "https://suite.example",
      fetcher: vi.fn(async () =>
        jsonResponse({
          schemaVersion: 2,
          items: [],
          pageInfo: { totalCount: Number.MAX_SAFE_INTEGER + 1, hasMore: false, nextCursor: null },
        }),
      ),
      useFixtureFallback: false,
    });
    const unsafeCount = await getCatalogJewelryItemsPageResult({
      apiBaseUrl: "https://suite.example",
      fetcher: vi.fn(async () =>
        jsonResponse({
          schemaVersion: 2,
          items: [{
            ...apiCatalogItem({ description: null }),
            availableListingCount: Number.MAX_SAFE_INTEGER + 1,
          }],
          pageInfo: { totalCount: 1, hasMore: false, nextCursor: null },
        }),
      ),
      useFixtureFallback: false,
    });
    const missingAvailabilityCounts = await getCatalogJewelryItemsPageResult({
      apiBaseUrl: "https://suite.example",
      fetcher: vi.fn(async () => {
        const item = apiCatalogItem({ description: null }) as Record<string, unknown>;
        delete item.availableLeadCount;
        return jsonResponse({
          schemaVersion: 2,
          items: [item],
          pageInfo: { totalCount: 1, hasMore: false, nextCursor: null },
        });
      }),
      useFixtureFallback: false,
    });
    const mismatchedLeadCount = await getCatalogJewelryItemsPageResult({
      apiBaseUrl: "https://suite.example",
      fetcher: vi.fn(async () =>
        jsonResponse({
          schemaVersion: 2,
          items: [apiCatalogItem({
            description: null,
            availableListingCount: 2,
            availableLeadCount: 1,
          })],
          pageInfo: { totalCount: 1, hasMore: false, nextCursor: null },
        }),
      ),
      useFixtureFallback: false,
    });

    expect(malformedMetadata).toEqual({ status: "error", reason: "invalid_contract" });
    expect(malformedItem).toEqual({ status: "error", reason: "invalid_contract" });
    expect(unsafeMetadata).toEqual({ status: "error", reason: "invalid_contract" });
    expect(unsafeCount).toEqual({ status: "error", reason: "invalid_contract" });
    expect(missingAvailabilityCounts).toEqual({ status: "error", reason: "invalid_contract" });
    expect(mismatchedLeadCount).toEqual({ status: "error", reason: "invalid_contract" });
  });

  it("rejects duplicate design identities and an immediately repeated cursor", async () => {
    const duplicate = await getCatalogJewelryItemsPageResult({
      apiBaseUrl: "https://suite.example",
      fetcher: vi.fn(async () =>
        jsonResponse({
          schemaVersion: 2,
          items: [
            apiCatalogItem({ designId: "design-repeat", description: null }),
            apiCatalogItem({ designId: "DESIGN-REPEAT", description: null }),
          ],
          pageInfo: { totalCount: 2, hasMore: false, nextCursor: null },
        }),
      ),
      useFixtureFallback: false,
    });
    const cursorLoop = await getCatalogJewelryItemsPageResult({
      apiBaseUrl: "https://suite.example",
      cursor: "opaque.same",
      fetcher: vi.fn(async () =>
        jsonResponse({
          schemaVersion: 2,
          items: [apiCatalogItem({ description: null })],
          pageInfo: { totalCount: 2, hasMore: true, nextCursor: "opaque.same" },
        }),
      ),
      useFixtureFallback: false,
    });

    expect(duplicate).toEqual({ status: "error", reason: "duplicate_design_id" });
    expect(cursorLoop).toEqual({ status: "error", reason: "cursor_loop" });
  });

  it("walks bounded v2 pages and rejects cross-page design repetition", async () => {
    const fetchCatalog = vi.fn(async (input: string) => {
      const url = new URL(input);
      return url.searchParams.get("cursor") === "page-2"
        ? jsonResponse({
            schemaVersion: 2,
            items: [apiCatalogItem({ designId: "design-repeat", description: null })],
            pageInfo: { totalCount: 2, hasMore: false, nextCursor: null },
          })
        : jsonResponse({
            schemaVersion: 2,
            items: [apiCatalogItem({ designId: "design-repeat", description: null })],
            pageInfo: { totalCount: 2, hasMore: true, nextCursor: "page-2" },
          });
    });

    const result = await getAllCatalogJewelryItemsResult({
      apiBaseUrl: "https://suite.example",
      fetcher: fetchCatalog,
      limit: 1,
    });

    expect(result).toEqual({ status: "error", reason: "duplicate_design_id" });
    expect(fetchCatalog).toHaveBeenCalledTimes(2);
  });

  it("walks more than 50 v2 catalog records without loss", async () => {
    const firstPage = Array.from({ length: 50 }, (_, index) =>
      apiCatalogItem({ designId: `design-${index + 1}`, description: null }),
    );
    const fetchCatalog = vi.fn(async (input: string) => {
      const cursor = new URL(input).searchParams.get("cursor");
      return cursor === "page-2"
        ? jsonResponse({
            schemaVersion: 2,
            items: [apiCatalogItem({ designId: "design-51", description: null })],
            pageInfo: { totalCount: 51, hasMore: false, nextCursor: null },
          })
        : jsonResponse({
            schemaVersion: 2,
            items: firstPage,
            pageInfo: { totalCount: 51, hasMore: true, nextCursor: "page-2" },
          });
    });

    const result = await getAllCatalogJewelryItemsResult({
      apiBaseUrl: "https://suite.example",
      fetcher: fetchCatalog,
      limit: 50,
    });

    expect(result.status).toBe("success");
    expect(result.status === "success" ? result.items : []).toHaveLength(51);
    expect(result.status === "success" ? result.totalCount : 0).toBe(51);
    expect(fetchCatalog).toHaveBeenCalledTimes(2);
  });

  it("keeps all-pages semantics full-from-first-page and rejects an initial cursor without fetching", async () => {
    const fetchCatalog = vi.fn();
    const result = await getAllCatalogJewelryItemsResult({
      apiBaseUrl: "https://suite.example",
      cursor: "page-2",
      fetcher: fetchCatalog,
    });

    expect(result).toEqual({ status: "error", reason: "invalid_contract" });
    expect(fetchCatalog).not.toHaveBeenCalled();
  });

  it("fails a full walk when totals change, a later cursor loops, or the page guard is exhausted", async () => {
    const changedTotal = await getAllCatalogJewelryItemsResult({
      apiBaseUrl: "https://suite.example",
      fetcher: vi.fn(async (input: string) =>
        new URL(input).searchParams.has("cursor")
          ? jsonResponse({
              schemaVersion: 2,
              items: [apiCatalogItem({ designId: "design-2", description: null })],
              pageInfo: { totalCount: 3, hasMore: false, nextCursor: null },
            })
          : jsonResponse({
              schemaVersion: 2,
              items: [apiCatalogItem({ designId: "design-1", description: null })],
              pageInfo: { totalCount: 2, hasMore: true, nextCursor: "page-2" },
            }),
      ),
      limit: 1,
    });
    const laterLoop = await getAllCatalogJewelryItemsResult({
      apiBaseUrl: "https://suite.example",
      fetcher: vi.fn(async (input: string) => {
        const cursor = new URL(input).searchParams.get("cursor");
        const page = cursor === "page-2" ? 2 : cursor === "page-3" ? 3 : 1;
        return jsonResponse({
          schemaVersion: 2,
          items: [apiCatalogItem({ designId: `loop-design-${page}`, description: null })],
          pageInfo: {
            totalCount: 4,
            hasMore: true,
            nextCursor: page === 1 ? "page-2" : page === 2 ? "page-3" : "page-2",
          },
        });
      }),
      limit: 1,
    });
    const pageLimit = await getAllCatalogJewelryItemsResult({
      apiBaseUrl: "https://suite.example",
      fetcher: vi.fn(async () =>
        jsonResponse({
          schemaVersion: 2,
          items: [apiCatalogItem({ designId: "guard-design", description: null })],
          pageInfo: { totalCount: 2, hasMore: true, nextCursor: "page-2" },
        }),
      ),
      limit: 1,
      maxPages: 1,
    });

    expect(changedTotal).toEqual({ status: "error", reason: "invalid_contract" });
    expect(laterLoop).toEqual({ status: "error", reason: "cursor_loop" });
    expect(pageLimit).toEqual({ status: "error", reason: "page_limit" });
  });

  it("hydrates exact v2 batch results in request order and reports missing designs", async () => {
    const fetchBatch = vi.fn(async () =>
      jsonResponse({
        schemaVersion: 2,
        items: [
          apiCatalogItem({ designId: "design-b", itemNumber: "RG-SAME", description: "B" }),
          apiCatalogItem({ designId: "design-a", itemNumber: "RG-SAME", description: "A" }),
        ],
        missingDesignIds: ["design-missing"],
      }),
    );

    const result = await getCatalogJewelryItemsByIdsResult(
      ["design-a", "design-missing", "design-b", "design-a"],
      { apiBaseUrl: "https://suite.example", fetcher: fetchBatch },
    );

    expect(fetchBatch).toHaveBeenCalledWith(
      "https://suite.example/api/public/finder/catalog/batch",
      {
        cache: "no-store",
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ designIds: ["design-a", "design-missing", "design-b"] }),
      },
    );
    expect(result).toEqual({
      status: "success",
      schemaVersion: 2,
      items: [
        expect.objectContaining({ id: "design-a", description: "A" }),
        expect.objectContaining({ id: "design-b", description: "B" }),
      ],
      missingDesignIds: ["design-missing"],
    });
  });

  it("fails closed when batch hydration is inexact or exceeds 50 distinct IDs", async () => {
    const inexact = await getCatalogJewelryItemsByIdsResult(["design-a"], {
      apiBaseUrl: "https://suite.example",
      fetcher: vi.fn(async () =>
        jsonResponse({
          schemaVersion: 2,
          items: [apiCatalogItem({ designId: "design-other", description: null })],
          missingDesignIds: [],
        }),
      ),
    });
    const fetchTooMany = vi.fn();
    const tooMany = await getCatalogJewelryItemsByIdsResult(
      Array.from({ length: 51 }, (_, index) => `design-${index}`),
      { apiBaseUrl: "https://suite.example", fetcher: fetchTooMany },
    );

    expect(inexact).toEqual({ status: "error", reason: "invalid_contract" });
    expect(tooMany).toEqual({ status: "error", reason: "invalid_contract" });
    expect(fetchTooMany).not.toHaveBeenCalled();
  });

  it("rejects an oversized batch design ID before making a request", async () => {
    const fetchBatch = vi.fn();
    const result = await getCatalogJewelryItemsByIdsResult(
      ["d".repeat(257)],
      { apiBaseUrl: "https://suite.example", fetcher: fetchBatch },
    );

    expect(result).toEqual({ status: "error", reason: "invalid_contract" });
    expect(fetchBatch).not.toHaveBeenCalled();
  });

  it("reads dynamic catalog facets from the Sparkle Suite public Finder API", async () => {
    const fetchFacets = vi.fn(async () =>
      jsonResponse({
        facets: {
          collections: [{ value: "Midnight Garden", count: 2 }],
          materials: [{ value: "Rose gold", count: 2 }],
          stones: [{ value: "Pearl", count: 1 }],
          types: [{ value: "ring", count: 2 }],
          labels: [{ value: "diamond", count: 1 }],
          years: [{ value: "2026", count: 2 }],
        },
      }),
    );

    const facets = await getCatalogFacetOptions({
      apiBaseUrl: "https://suite.example",
      fetcher: fetchFacets,
      useFixtureFallback: false,
      query: "opal",
      type: "ring",
      collection: "Midnight Garden",
      material: "Rose gold",
      mainStone: "Pearl",
      label: "diamond",
      collectionYear: 2026,
    });

    expect(fetchFacets).toHaveBeenCalledWith(
      "https://suite.example/api/public/finder/catalog/facets?query=opal&type=ring&collection=Midnight+Garden&material=Rose+gold&stone=Pearl&label=diamond&year=2026",
      { cache: "no-store" },
    );
    expect(facets.stones).toEqual([{ value: "Pearl", count: 1 }]);
    expect(facets.materials).toEqual([{ value: "Rose gold", count: 2 }]);
  });

  it("derives fixture facet options without showing unused stone filters", async () => {
    const facets = await getCatalogFacetOptions({
      apiBaseUrl: "",
    });

    expect(facets.collections.length).toBeGreaterThan(0);
    expect(facets.stones).toEqual([]);
    expect(JSON.stringify(facets)).not.toContain("Pearl");
  });

  it("can disable fixture fallback when a live API read fails", async () => {
    const fetchCatalog = vi.fn(async () => new Response("not found", { status: 404 }));

    const items = await getCatalogJewelryItems({
      apiBaseUrl: "https://suite.example",
      fetcher: fetchCatalog,
      useFixtureFallback: false,
    });

    expect(items).toEqual([]);
  });

  it("keeps an unavailable catalog distinct from a successful empty catalog", async () => {
    const unavailable = await getCatalogJewelryItemsResult({
      apiBaseUrl: "https://suite.example",
      fetcher: vi.fn(async () => new Response("unavailable", { status: 503 })),
      useFixtureFallback: false,
    });
    const empty = await getCatalogJewelryItemsResult({
      apiBaseUrl: "https://suite.example",
      fetcher: vi.fn(async () => jsonResponse({ items: [] })),
      useFixtureFallback: false,
    });

    expect(unavailable).toEqual({ status: "error" });
    expect(empty).toEqual({ status: "success", items: [] });
  });

  it("fetches a single catalog item by Sparkle Suite designId", async () => {
    const fetchDetail = vi.fn(async () => jsonResponse({ item: apiCatalogItem({ designId: "design-single" }) }));

    const item = await getCatalogJewelryItemById("design-single", {
      apiBaseUrl: "https://suite.example/",
      fetcher: fetchDetail,
      useFixtureFallback: false,
    });

    expect(fetchDetail).toHaveBeenCalledWith("https://suite.example/api/public/finder/catalog/design-single", {
      cache: "no-store",
    });
    expect(item).toEqual(
      expect.objectContaining({
        id: "design-single",
        collectionYear: 2026,
        availableListingCount: 2,
      }),
    );
  });

  it("can disable fixture fallback for missing detail records", async () => {
    const fetchDetail = vi.fn(async () => new Response("not found", { status: 404 }));

    const item = await getCatalogJewelryItemById("missing-design", {
      apiBaseUrl: "https://suite.example",
      fetcher: fetchDetail,
      useFixtureFallback: false,
    });

    expect(item).toBeUndefined();
  });

  it("keeps an unavailable detail endpoint distinct from a valid missing item", async () => {
    const unavailable = await getCatalogJewelryItemByIdResult("design-123", {
      apiBaseUrl: "https://suite.example",
      fetcher: vi.fn(async () => new Response("unavailable", { status: 503 })),
      useFixtureFallback: false,
    });
    const missing = await getCatalogJewelryItemByIdResult("design-123", {
      apiBaseUrl: "https://suite.example",
      fetcher: vi.fn(async () => new Response("not found", { status: 404 })),
      useFixtureFallback: false,
    });

    expect(unavailable).toEqual({ status: "error" });
    expect(missing).toEqual({ status: "success", item: undefined });
  });

  it("reads exact and similar availability matches from the Sparkle Suite public Finder API", async () => {
    const fetchAvailability = vi.fn(async () =>
      jsonResponse(apiAvailabilityResponse({
        exactMatches: [
          apiAvailabilityMatch({
            listingId: "listing-exact",
            designId: "design-123",
            designName: "Starlight Diamond Ring",
            quantityAvailable: 2,
          }),
        ],
        similarMatches: [
          apiAvailabilityMatch({
            listingId: "listing-similar",
            designId: "design-similar",
            designName: "Starlight Sister Ring",
            quantityAvailable: 3,
          }),
        ],
      })),
    );

    const availability = await getFinderAvailabilityForJewelryItem("design-123", {
      apiBaseUrl: "https://suite.example",
      fetcher: fetchAvailability,
      useFixtureFallback: false,
    });

    expect(fetchAvailability).toHaveBeenCalledWith(
      "https://suite.example/api/public/finder/availability?designId=design-123&limit=24",
      { cache: "no-store" },
    );
    expect(availability?.exactMatches[0]).toMatchObject({
      listingId: "listing-exact",
      quantityAvailable: 2,
      showName: "Demo Glow Show",
      repFirstName: "Demo",
      customerSiteUrl: "https://suite.example/demo-show?c=rep-demo",
      item: {
        id: "design-123",
      },
      nextShow: {
        showId: "show-demo",
        showName: "Demo Glow Show",
      },
    });
    expect(availability?.similarMatches[0]).toMatchObject({
      listingId: "listing-similar",
      quantityAvailable: 3,
      item: {
        id: "design-similar",
      },
    });
    expect(availability?.exactPageInfo).toEqual({
      totalLeadCount: 1,
      totalDancerCount: 2,
      hasMore: false,
      nextCursor: null,
    });
    expect(availability?.similarPageInfo).toEqual({
      totalLeadCount: 1,
      totalDancerCount: 3,
      hasMore: false,
      nextCursor: null,
    });
    expect(availability?.requestedItem).toMatchObject({
      id: "design-123",
      availableListingCount: 2,
      availableLeadCount: 2,
      availableDancerCount: 3,
    });
  });

  it("passes independent availability cursors and preserves authoritative totals", async () => {
    const fetchAvailability = vi.fn(async () =>
      jsonResponse(apiAvailabilityResponse({
        exactMatches: [apiAvailabilityMatch({
          listingId: "listing-exact-2",
          designId: "design-123",
          designName: "Starlight Diamond Ring",
          quantityAvailable: 1,
        })],
        similarMatches: [apiAvailabilityMatch({
          listingId: "listing-similar-2",
          designId: "design-similar",
          designName: "Starlight Sister Ring",
          quantityAvailable: 2,
        })],
        exactPageInfo: {
          totalLeadCount: 2,
          totalDancerCount: 3,
          hasMore: false,
          nextCursor: null,
        },
        similarPageInfo: {
          totalLeadCount: 2,
          totalDancerCount: 5,
          hasMore: false,
          nextCursor: null,
        },
      })),
    );

    const availability = await getFinderAvailabilityForJewelryItem("design-123", {
      apiBaseUrl: "https://suite.example",
      exactCursor: "exact-page-2",
      similarCursor: "similar-page-2",
      fetcher: fetchAvailability,
      limit: 12,
      useFixtureFallback: false,
    });

    expect(fetchAvailability).toHaveBeenCalledWith(
      "https://suite.example/api/public/finder/availability?designId=design-123&limit=12&exactCursor=exact-page-2&similarCursor=similar-page-2",
      { cache: "no-store" },
    );
    expect(availability?.exactPageInfo.totalDancerCount).toBe(3);
    expect(availability?.similarPageInfo.totalDancerCount).toBe(5);
  });

  it("preserves authoritative availability continuation metadata", async () => {
    const availability = await getFinderAvailabilityForJewelryItem("design-123", {
      apiBaseUrl: "https://suite.example",
      fetcher: vi.fn(async () => jsonResponse(apiAvailabilityResponse({
        exactMatches: [apiAvailabilityMatch({
          listingId: "listing-exact-1",
          designId: "design-123",
          designName: "Starlight Diamond Ring",
        })],
        exactPageInfo: {
          totalLeadCount: 2,
          totalDancerCount: 2,
          hasMore: true,
          nextCursor: "exact-page-2",
        },
      }))),
      useFixtureFallback: false,
    });

    expect(availability?.exactPageInfo).toEqual({
      totalLeadCount: 2,
      totalDancerCount: 2,
      hasMore: true,
      nextCursor: "exact-page-2",
    });
  });

  it.each([
    { label: "zero", quantityAvailable: 0 },
    { label: "negative", quantityAvailable: -1 },
    { label: "fractional", quantityAvailable: 1.5 },
    { label: "missing", quantityAvailable: undefined },
  ])("fails closed on $label production quantity", async ({ quantityAvailable }) => {
    const match = apiAvailabilityMatch({
      listingId: "listing-invalid-quantity",
      designId: "design-123",
      designName: "Starlight Diamond Ring",
    }) as Record<string, unknown>;
    if (quantityAvailable === undefined) {
      delete match.quantityAvailable;
    } else {
      match.quantityAvailable = quantityAvailable;
    }
    const availability = await getFinderAvailabilityForJewelryItem("design-123", {
      apiBaseUrl: "https://suite.example",
      fetcher: vi.fn(async () => jsonResponse({
        ...apiAvailabilityResponse({}),
        exactMatches: [match],
        exactPageInfo: {
          totalLeadCount: 1,
          totalDancerCount: 1,
          hasMore: false,
          nextCursor: null,
        },
      })),
      useFixtureFallback: false,
    });

    expect(availability).toBeUndefined();
  });

  it("fails closed when availability metadata is missing or a cursor immediately repeats", async () => {
    const missingMetadata = await getFinderAvailabilityForJewelryItem("design-123", {
      apiBaseUrl: "https://suite.example",
      fetcher: vi.fn(async () => jsonResponse({
        schemaVersion: 2,
        requestedItem: apiCatalogItem({ designId: "design-123" }),
        exactMatches: [],
        similarMatches: [],
      })),
      useFixtureFallback: false,
    });
    const repeatedCursor = await getFinderAvailabilityForJewelryItem("design-123", {
      apiBaseUrl: "https://suite.example",
      exactCursor: "exact-same",
      fetcher: vi.fn(async () => jsonResponse(apiAvailabilityResponse({
        exactMatches: [apiAvailabilityMatch({
          listingId: "listing-repeat-cursor",
          designId: "design-123",
          designName: "Starlight Diamond Ring",
        })],
        exactPageInfo: {
          totalLeadCount: 2,
          totalDancerCount: 2,
          hasMore: true,
          nextCursor: "exact-same",
        },
      }))),
      useFixtureFallback: false,
    });

    expect(missingMetadata).toBeUndefined();
    expect(repeatedCursor).toBeUndefined();
  });

  it("accepts a strict zero-inventory response and rejects duplicate listing identities", async () => {
    const zeroInventory = await getFinderAvailabilityForJewelryItem("design-123", {
      apiBaseUrl: "https://suite.example",
      fetcher: vi.fn(async () => jsonResponse(apiAvailabilityResponse({}))),
      useFixtureFallback: false,
    });
    const duplicate = apiAvailabilityMatch({
      listingId: "listing-duplicate",
      designId: "design-123",
      designName: "Starlight Diamond Ring",
    });
    const duplicateListings = await getFinderAvailabilityForJewelryItem("design-123", {
      apiBaseUrl: "https://suite.example",
      fetcher: vi.fn(async () => jsonResponse(apiAvailabilityResponse({
        exactMatches: [duplicate, { ...duplicate }],
      }))),
      useFixtureFallback: false,
    });
    const caseDistinctListings = await getFinderAvailabilityForJewelryItem("design-123", {
      apiBaseUrl: "https://suite.example",
      fetcher: vi.fn(async () => jsonResponse(apiAvailabilityResponse({
        exactMatches: [apiAvailabilityMatch({
          listingId: "Listing-Opaque",
          designId: "design-123",
          designName: "Starlight Diamond Ring",
        })],
        similarMatches: [apiAvailabilityMatch({
          listingId: "listing-opaque",
          designId: "design-similar",
          designName: "Starlight Sister Ring",
        })],
      }))),
      useFixtureFallback: false,
    });

    expect(zeroInventory).toMatchObject({
      exactMatches: [],
      similarMatches: [],
      exactPageInfo: { totalLeadCount: 0, totalDancerCount: 0, hasMore: false, nextCursor: null },
      similarPageInfo: { totalLeadCount: 0, totalDancerCount: 0, hasMore: false, nextCursor: null },
    });
    expect(duplicateListings).toBeUndefined();
    expect(caseDistinctListings?.exactMatches[0]?.listingId).toBe("Listing-Opaque");
    expect(caseDistinctListings?.similarMatches[0]?.listingId).toBe("listing-opaque");
  });

  it("fails closed when an availability item disagrees on listing and lead counts", async () => {
    const match = apiAvailabilityMatch({
      listingId: "listing-count-mismatch",
      designId: "design-123",
      designName: "Starlight Diamond Ring",
    });
    match.item.availableLeadCount = 1;

    const availability = await getFinderAvailabilityForJewelryItem("design-123", {
      apiBaseUrl: "https://suite.example",
      fetcher: vi.fn(async () => jsonResponse(apiAvailabilityResponse({ exactMatches: [match] }))),
      useFixtureFallback: false,
    });

    expect(availability).toBeUndefined();
  });

  it("rejects invalid availability request bounds without fetching", async () => {
    const fetchAvailability = vi.fn();
    const oversizedLimit = await getFinderAvailabilityForJewelryItem("design-123", {
      apiBaseUrl: "https://suite.example",
      fetcher: fetchAvailability,
      limit: 51,
    });
    const oversizedCursor = await getFinderAvailabilityForJewelryItem("design-123", {
      apiBaseUrl: "https://suite.example",
      exactCursor: "c".repeat(2_049),
      fetcher: fetchAvailability,
    });
    const oversizedDesignId = await getFinderAvailabilityForJewelryItem("d".repeat(257), {
      apiBaseUrl: "https://suite.example",
      fetcher: fetchAvailability,
    });

    expect(oversizedLimit).toBeUndefined();
    expect(oversizedCursor).toBeUndefined();
    expect(oversizedDesignId).toBeUndefined();
    expect(fetchAvailability).not.toHaveBeenCalled();
  });

  it("fails closed on former top-level availability rep fields in strict v2", async () => {
    const nestedMatch = apiAvailabilityMatch({
      listingId: "listing-legacy",
      designId: "design-123",
      designName: "Starlight Diamond Ring",
    });
    const fetchAvailability = vi.fn(async () =>
      jsonResponse({
        ...apiAvailabilityResponse({}),
        exactMatches: [
          {
            ...nestedMatch,
            rep: undefined,
            showName: "Legacy Glow Show",
            repFirstName: "Legacy",
            customerSiteUrl: "https://suite.example/legacy-show?c=rep-legacy",
            nextShow: {
              showId: "show-legacy",
              showName: "Legacy Glow Show",
              repFirstName: "Legacy",
              startsAt: "2026-06-06T20:00:00.000Z",
              status: "scheduled",
              customerSiteUrl: "https://suite.example/legacy-show?c=rep-legacy",
            },
          },
        ],
        exactPageInfo: {
          totalLeadCount: 1,
          totalDancerCount: 1,
          hasMore: false,
          nextCursor: null,
        },
      }),
    );

    const availability = await getFinderAvailabilityForJewelryItem("design-123", {
      apiBaseUrl: "https://suite.example",
      fetcher: fetchAvailability,
      useFixtureFallback: false,
    });

    expect(availability).toBeUndefined();
  });

  it("fails closed on malformed availability matches without a next show", async () => {
    const fetchAvailability = vi.fn(async () =>
      jsonResponse({
        ...apiAvailabilityResponse({}),
        exactMatches: [
          {
            ...apiAvailabilityMatch({
              listingId: "listing-missing-show",
              designId: "design-123",
              designName: "Starlight Diamond Ring",
            }),
            nextShow: null,
          },
        ],
        exactPageInfo: {
          totalLeadCount: 1,
          totalDancerCount: 1,
          hasMore: false,
          nextCursor: null,
        },
      }),
    );

    const availability = await getFinderAvailabilityForJewelryItem("design-123", {
      apiBaseUrl: "https://suite.example",
      fetcher: fetchAvailability,
      useFixtureFallback: false,
    });

    expect(availability).toBeUndefined();
  });

  it("fails closed on mismatched rep/show identity and unsafe Suite URLs", async () => {
    const mismatchedRep = apiAvailabilityMatch({
      listingId: "listing-mismatched-rep",
      designId: "design-123",
      designName: "Starlight Diamond Ring",
    });
    mismatchedRep.nextShow.repId = "rep-other";
    const unsafeUrl = apiAvailabilityMatch({
      listingId: "listing-unsafe-url",
      designId: "design-123",
      designName: "Starlight Diamond Ring",
    });
    unsafeUrl.rep.customerSiteUrl = "https://malicious.example/show";
    const fetchAvailability = vi.fn(async () =>
      jsonResponse(apiAvailabilityResponse({
        exactMatches: [mismatchedRep, unsafeUrl],
        similarMatches: [],
      })),
    );

    const availability = await getFinderAvailabilityForJewelryItem("design-123", {
      apiBaseUrl: "https://suite.example",
      fetcher: fetchAvailability,
      useFixtureFallback: false,
    });

    expect(availability).toBeUndefined();
  });

  it("preserves listing photos while failing closed on missing or mismatched canonical photos", async () => {
    const listingPhoto = apiAvailabilityMatch({
      listingId: "listing-photo",
      designId: "design-123",
      designName: "Starlight Diamond Ring",
    });
    const missingPhoto = {
      ...apiAvailabilityMatch({
        listingId: "listing-missing-photo",
        designId: "design-123",
        designName: "Starlight Diamond Ring",
      }),
      photoSource: "missing" as const,
      photoUrl: null,
    };
    const canonicalPhoto = {
      ...apiAvailabilityMatch({
        listingId: "listing-canonical-photo",
        designId: "design-123",
        designName: "Starlight Diamond Ring",
      }),
      photoSource: "canonical" as const,
      photoUrl: "https://cdn.example.test/design-123.jpg",
    };
    const mismatchedCanonicalPhoto = {
      ...apiAvailabilityMatch({
        listingId: "listing-mismatched-canonical",
        designId: "design-123",
        designName: "Starlight Diamond Ring",
      }),
      photoSource: "canonical" as const,
      photoUrl: "https://cdn.example.test/wrong-design.jpg",
    };
    const fetchAvailability = vi.fn(async () =>
      jsonResponse(apiAvailabilityResponse({
        exactMatches: [listingPhoto, missingPhoto, canonicalPhoto, mismatchedCanonicalPhoto],
        similarMatches: [],
      })),
    );

    const availability = await getFinderAvailabilityForJewelryItem("design-123", {
      apiBaseUrl: "https://suite.example",
      fetcher: fetchAvailability,
      useFixtureFallback: false,
    });

    expect(availability?.exactMatches.map((match) => [match.listingId, match.photoUrl])).toEqual([
      ["listing-photo", "https://cdn.example.test/listing.jpg"],
      ["listing-missing-photo", null],
      ["listing-canonical-photo", "https://cdn.example.test/design-123.jpg"],
      ["listing-mismatched-canonical", null],
    ]);
  });

  it("fails closed on mismatched exact identity and duplicate listing ids across availability buckets", async () => {
    const exact = apiAvailabilityMatch({
      listingId: "listing-shared",
      designId: "design-123",
      designName: "Starlight Diamond Ring",
    });
    const wrongExact = apiAvailabilityMatch({
      listingId: "listing-wrong-exact",
      designId: "design-other",
      designName: "Other Ring",
    });
    const repeatedSimilar = apiAvailabilityMatch({
      listingId: "listing-shared",
      designId: "design-similar",
      designName: "Similar Ring",
    });
    const validSimilar = apiAvailabilityMatch({
      listingId: "listing-similar",
      designId: "design-similar",
      designName: "Similar Ring",
    });
    const fetchAvailability = vi.fn(async () =>
      jsonResponse(apiAvailabilityResponse({
        exactMatches: [exact, wrongExact],
        similarMatches: [repeatedSimilar, validSimilar],
      })),
    );

    const availability = await getFinderAvailabilityForJewelryItem("design-123", {
      apiBaseUrl: "https://suite.example",
      fetcher: fetchAvailability,
      useFixtureFallback: false,
    });

    expect(availability).toBeUndefined();
  });

  it("reads live shows from the Sparkle Suite public Finder API", async () => {
    const fetchLiveShows = vi.fn(async () =>
      jsonResponse({
        shows: [
          {
            showId: "show-demo",
            showName: "Demo Glow Show",
            repFirstName: "Demo",
            startsAt: "2026-06-06T20:00:00.000Z",
            status: "scheduled",
            customerSiteUrl: "https://suite.example/demo-show?c=rep-demo",
          },
        ],
      }),
    );

    const shows = await getFinderLiveShows({
      apiBaseUrl: "https://suite.example",
      fetcher: fetchLiveShows,
      useFixtureFallback: false,
    });

    expect(fetchLiveShows).toHaveBeenCalledWith("https://suite.example/api/public/finder/live-shows?limit=50", {
      cache: "no-store",
    });
    expect(shows).toEqual([
      {
        showId: "show-demo",
        showName: "Demo Glow Show",
        repFirstName: "Demo",
        startsAt: "2026-06-06T20:00:00.000Z",
        status: "scheduled",
        customerSiteUrl: "https://suite.example/demo-show?c=rep-demo",
      },
    ]);
  });

  it("can disable fixture fallback when live shows are unavailable", async () => {
    const fetchLiveShows = vi.fn(async () => new Response("not found", { status: 404 }));

    const shows = await getFinderLiveShows({
      apiBaseUrl: "https://suite.example",
      fetcher: fetchLiveShows,
      useFixtureFallback: false,
    });

    expect(shows).toEqual([]);
  });

  it("reads rep directory data from the Sparkle Suite public Finder API", async () => {
    const fetchReps = vi.fn(async () =>
      jsonResponse({
        reps: [
          apiRepDirectoryItem({
            repId: "rep-suite-demo",
            displayName: "Demo Draper",
            businessName: "Demo Sparkle Studio",
            state: "OH",
            customerSiteUrl: "https://suite.example/reps/demo",
            repBoardUrl: "https://suite.example/reps/demo/board",
          }),
        ],
      }),
    );

    const data = await getFinderRepDirectoryData({
      apiBaseUrl: "https://suite.example",
      fetcher: fetchReps,
      useFixtureFallback: false,
    });

    expect(fetchReps).toHaveBeenCalledWith("https://suite.example/api/public/finder/reps?limit=200", {
      cache: "no-store",
    });
    expect(data.reps).toEqual([
      expect.objectContaining({
        id: "rep-suite-demo",
        businessName: "Demo Sparkle Studio",
        displayName: "Demo Draper",
        state: "OH",
        siteUrl: "https://suite.example/reps/demo",
        nextLiveShowId: "show-demo",
      }),
    ]);
    expect(data.liveShows).toEqual([
      expect.objectContaining({
        id: "show-demo",
        repId: "rep-suite-demo",
        title: "Demo Glow Show",
        status: "scheduled",
        showUrl: "https://suite.example/demo-show?c=rep-demo",
      }),
    ]);
    expect(data.boardListings).toEqual([
      expect.objectContaining({
        id: "rep-suite-demo-board",
        repId: "rep-suite-demo",
        status: "available",
        boardUrl: "https://suite.example/reps/demo/board",
      }),
    ]);
    expect(data.status).toBe("ready");
  });

  it("sends Rep Directory searches upstream and deduplicates repeated rep ids", async () => {
    const repeated = apiRepDirectoryItem({ repId: "rep-repeat", displayName: "Repeat Rep" });
    const fetchReps = vi.fn(async () => jsonResponse({ reps: [repeated, repeated] }));

    const data = await getFinderRepDirectoryData({
      apiBaseUrl: "https://suite.example",
      fetcher: fetchReps,
      query: "Repeat Rep",
      useFixtureFallback: false,
    });

    expect(fetchReps).toHaveBeenCalledWith(
      "https://suite.example/api/public/finder/reps?limit=200&query=Repeat+Rep",
      { cache: "no-store" },
    );
    expect(data.reps.map((rep) => rep.id)).toEqual(["rep-repeat"]);
  });

  it("can disable fixture fallback when rep directory data is unavailable", async () => {
    const fetchReps = vi.fn(async () => new Response("not found", { status: 404 }));

    const data = await getFinderRepDirectoryData({
      apiBaseUrl: "https://suite.example",
      fetcher: fetchReps,
      useFixtureFallback: false,
    });

    expect(data).toEqual({
      boardListings: [],
      liveShows: [],
      reps: [],
      status: "unavailable",
    });
  });

  it("distinguishes a working empty rep feed from an unavailable feed", async () => {
    const data = await getFinderRepDirectoryData({
      apiBaseUrl: "https://suite.example",
      fetcher: vi.fn(async () => jsonResponse({ reps: [] })),
      useFixtureFallback: false,
    });

    expect(data).toEqual({
      boardListings: [],
      liveShows: [],
      reps: [],
      status: "empty",
    });
  });

  it("treats a missing reps array as an unavailable contract", async () => {
    const data = await getFinderRepDirectoryData({
      apiBaseUrl: "https://suite.example",
      fetcher: vi.fn(async () => jsonResponse({ items: [] })),
      useFixtureFallback: false,
    });

    expect(data.status).toBe("unavailable");
  });

  it("treats a nonempty all-malformed rep feed as unavailable", async () => {
    const data = await getFinderRepDirectoryData({
      apiBaseUrl: "https://suite.example",
      fetcher: vi.fn(async () => jsonResponse({ reps: [null, {}, { repId: "rep-without-name" }] })),
      useFixtureFallback: false,
    });

    expect(data.status).toBe("unavailable");
    expect(data.reps).toEqual([]);
  });

  it("skips malformed reps, drops unsafe links, and preserves a valid rep without a valid show", async () => {
    const data = await getFinderRepDirectoryData({
      apiBaseUrl: "https://suite.example",
      fetcher: vi.fn(async () =>
        jsonResponse({
          reps: [
            null,
            { repId: "", displayName: "Missing ID" },
            apiRepDirectoryItem({
              repId: "rep-safe",
              avatarUrl: "http://cdn.example.test/avatar.jpg",
              customerSiteUrl: "javascript:alert(1)",
              repBoardUrl: "https://evil.example/board",
              nextShow: {
                id: "bad-show",
                title: "Bad Date",
                startsAt: "not-a-date",
                status: "scheduled",
                customerShowUrl: "https://suite.example/shows/bad",
              },
            }),
          ],
        }),
      ),
      useFixtureFallback: false,
    });

    expect(data.status).toBe("ready");
    expect(data.reps).toEqual([
      expect.objectContaining({ id: "rep-safe", avatarUrl: "", siteUrl: "", nextLiveShowId: "" }),
    ]);
    expect(data.boardListings).toEqual([]);
    expect(data.liveShows).toEqual([]);
  });

  it("keeps reps visible when only a board link is available", async () => {
    const fetchReps = vi.fn(async () =>
      jsonResponse({
        reps: [
          apiRepDirectoryItem({
            repId: "rep-board-only",
            customerSiteUrl: null,
            repBoardUrl: "https://suite.example/reps/board-only/board",
            nextShow: null,
          }),
        ],
      }),
    );

    const data = await getFinderRepDirectoryData({
      apiBaseUrl: "https://suite.example",
      fetcher: fetchReps,
      useFixtureFallback: false,
    });

    expect(data.reps).toEqual([
      expect.objectContaining({
        id: "rep-board-only",
        siteUrl: "",
      }),
    ]);
    expect(data.boardListings).toEqual([
      expect.objectContaining({
        repId: "rep-board-only",
        boardUrl: "https://suite.example/reps/board-only/board",
      }),
    ]);
  });

  it("maps the Reps directory next-show payload shape", async () => {
    const fetchReps = vi.fn(async () =>
      jsonResponse({
        reps: [
          apiRepDirectoryItem({
            repId: "rep-directory-show",
            nextShow: {
              id: "directory-show",
              title: "Directory Glow Show",
              startsAt: "2026-06-07T20:00:00.000Z",
              status: "live",
              customerShowUrl: "https://suite.example/shows/directory-glow",
            },
          }),
        ],
      }),
    );

    const data = await getFinderRepDirectoryData({
      apiBaseUrl: "https://suite.example",
      fetcher: fetchReps,
      useFixtureFallback: false,
    });

    expect(data.reps[0]).toEqual(
      expect.objectContaining({
        id: "rep-directory-show",
        nextLiveShowId: "directory-show",
      }),
    );
    expect(data.liveShows).toEqual([
      expect.objectContaining({
        id: "directory-show",
        repId: "rep-directory-show",
        showUrl: "https://suite.example/shows/directory-glow",
        status: "live",
        title: "Directory Glow Show",
      }),
    ]);
  });

  it("falls back to fixture items when the API is not configured", async () => {
    const items = await getCatalogJewelryItems({
      apiBaseUrl: "",
    });

    expect(items[0]).toMatchObject({
      id: "jewel-rainbow-crown-ring",
      name: "Rainbow Crown Ring",
    });
  });

  it("normalizes the Sparkle Suite Finder API base URL for customer-facing links", () => {
    expect(getSparkleSuiteFinderPublicBaseUrl({ apiBaseUrl: "https://suite.example/" })).toBe("https://suite.example");
    expect(getSparkleSuiteFinderPublicBaseUrl({ apiBaseUrl: "https://suite.example///" })).toBe(
      "https://suite.example",
    );
  });
});

function apiCatalogItem(overrides: Partial<SparkleSuiteFinderCatalogItem> = {}): SparkleSuiteFinderCatalogItem {
  return {
    designId: "design-123",
    itemNumber: "RG1234",
    designName: "Starlight Ring",
    collectionName: "Midnight Garden",
    collectionYear: 2026,
    jewelryType: "ring",
    material: "Rose gold",
    mainStone: "Pink stone",
    bpMsrp: 19.95,
    canonicalPhotoUrl: "https://cdn.example.test/design-123.jpg",
    rarityClassification: "standard",
    description: null,
    searchTags: ["rose gold"],
    availableListingCount: 2,
    availableLeadCount: 2,
    availableDancerCount: 3,
    ...overrides,
  };
}

function apiAvailabilityMatch({
  listingId,
  designId,
  designName,
  quantityAvailable = 1,
}: {
  listingId: string;
  designId: string;
  designName: string;
  quantityAvailable?: number;
}) {
  return {
    listingId,
    quantityAvailable,
    listedAt: "2026-06-06T12:00:00.000Z",
    photoUrl: "https://cdn.example.test/listing.jpg",
    photoSource: "listing",
    item: apiAvailabilityCatalogItem({ designId, designName }),
    rep: {
      repId: "rep-demo",
      showName: "Demo Glow Show",
      repFirstName: "Demo",
      customerSiteUrl: "https://suite.example/demo-show?c=rep-demo",
    },
    nextShow: {
      showId: "show-demo",
      repId: "rep-demo",
      startsAt: "2026-06-06T20:00:00.000Z",
      title: "Demo Glow Show",
      status: "scheduled",
    },
  };
}

function apiAvailabilityResponse({
  exactMatches = [],
  similarMatches = [],
  exactPageInfo,
  similarPageInfo,
}: {
  exactMatches?: Record<string, unknown>[];
  similarMatches?: Record<string, unknown>[];
  exactPageInfo?: {
    totalLeadCount: number;
    totalDancerCount: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
  similarPageInfo?: {
    totalLeadCount: number;
    totalDancerCount: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}) {
  return {
    schemaVersion: 2,
    requestedItem: apiAvailabilityCatalogItem({ designId: "design-123" }),
    exactMatches,
    similarMatches,
    exactPageInfo: exactPageInfo ?? {
      totalLeadCount: exactMatches.length,
      totalDancerCount: exactMatches.reduce(
        (sum, match) => sum + (typeof match.quantityAvailable === "number" ? match.quantityAvailable : 0),
        0,
      ),
      hasMore: false,
      nextCursor: null,
    },
    similarPageInfo: similarPageInfo ?? {
      totalLeadCount: similarMatches.length,
      totalDancerCount: similarMatches.reduce(
        (sum, match) => sum + (typeof match.quantityAvailable === "number" ? match.quantityAvailable : 0),
        0,
      ),
      hasMore: false,
      nextCursor: null,
    },
  };
}

function apiAvailabilityCatalogItem(overrides: Partial<SparkleSuiteFinderCatalogItem> = {}) {
  const { description, ...item } = apiCatalogItem(overrides);
  void description;
  return item;
}

function apiRepDirectoryItem(
  overrides: Partial<SparkleSuiteFinderRepDirectoryItem> = {},
): SparkleSuiteFinderRepDirectoryItem {
  return {
    repId: "rep-demo",
    displayName: "Demo Draper",
    businessName: "Demo Sparkle Studio",
    avatarUrl: "https://cdn.example.test/reps/demo.jpg",
    state: "OH",
    customerSiteUrl: "https://suite.example/reps/demo",
    repBoardUrl: "https://suite.example/reps/demo/board",
    nextShow: {
      showId: "show-demo",
      showName: "Demo Glow Show",
      repFirstName: "Demo",
      startsAt: "2026-06-06T20:00:00.000Z",
      status: "scheduled",
      customerSiteUrl: "https://suite.example/demo-show?c=rep-demo",
    },
    ...overrides,
  };
}

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
  });
}
