import { expect, test, type Locator, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { findSparkleFinderCopyViolations } from "../../lib/sparkle-finder/copy-guardrails";

const baseUrl = process.env.SPARKLE_FINDER_BASE_URL ?? "http://127.0.0.1:4310";
const screenshotDir = process.env.SPARKLE_FINDER_SCREENSHOT_DIR ?? "verification/sparkle-finder";
const sparkleSuiteFinderBaseUrl = (
  process.env.SPARKLE_SUITE_FINDER_API_BASE_URL ??
  process.env.NEXT_PUBLIC_SPARKLE_SUITE_FINDER_API_BASE_URL ??
  "https://www.yoursparklesuite.com"
)
  .trim()
  .replace(/\/+$/, "");
const expectLiveReps = process.env.SPARKLE_FINDER_SMOKE_EXPECT_LIVE_REPS === "true";

const smokeTexts = [
  "Sparkle Finder",
  "Coming soon",
  "Sparkle Finder is coming soon.",
  "A new place to find the pieces you love",
  "We are getting the finishing touches in place",
  "Create account",
  "Sign in",
];

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const;

test.describe("Sparkle Finder homepage smoke", () => {
  for (const viewport of viewports) {
    test(`${viewport.name} homepage renders trust-first public landing`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(baseUrl, { waitUntil: "domcontentloaded" });

      for (const text of smokeTexts) {
        await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
      }

      await expectNoGuardrailCopy(page);
      await expectHomepageLinksStayLocal(page);
      await expectNoPublicHomepageDemoData(page);
      await expectReadableControls(page);
      await expectPrimarySectionsAreVisible(page);
      await expectPrimarySectionsDoNotOverlap(page);

      mkdirSync(screenshotDir, { recursive: true });
      await page.screenshot({
        fullPage: true,
        path: join(screenshotDir, `sparkle-finder-home-${viewport.name}.png`),
      });
    });
  }

  test("homepage primary controls route to local app pages", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });

    await expectClickPath(page, page.getByRole("link", { name: "Create account" }), "/auth/sign-up");
    await expectClickPath(page, page.locator("main").getByRole("link", { name: "Sign in" }), "/auth/sign-in");
  });

  test("logged-out homepage keeps the product behind the coming-soon landing", async ({ page }) => {
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });

    await expect(page.locator('[data-smoke="public-landing"]')).toBeVisible();
    await expect(page.locator('[data-smoke="coming-soon-copy"]')).toBeVisible();
    await expect(page.locator('[data-smoke="public-feature-cards"]')).toHaveCount(0);
    await expect(page.locator('[data-smoke="public-membership-tiers"]')).toHaveCount(0);
    await expect(page.getByText("Master Jewelry Library")).toHaveCount(0);
    await expect(page.getByText("Photo-ready uploads")).toHaveCount(0);
    await expect(page.getByText("Start with your 45-day Silver Tier trial")).toHaveCount(0);
  });

  for (const viewport of viewports) {
    test(`${viewport.name} authenticated homepage renders simple app home and preserved Finder flows`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.context().clearCookies();
      await page.context().addCookies([
        {
          name: "sparkle_finder_auth_mode",
          value: "silver",
          url: baseUrl,
        },
      ]);

      await page.goto(baseUrl, { waitUntil: "domcontentloaded" });

      await expect(page.locator('[data-smoke="simple-finder-home"]')).toBeVisible();
      const findPanel = page.locator('[data-smoke="find-piece-panel"]');
      await expect(findPanel).toBeVisible();
      await expect(page.locator('[data-smoke="homepage-bling-vault"]')).toBeVisible();
      await expect(page.getByText("Find the pieces you love.")).toBeVisible();
      await expect(page.getByText("Build your collection with Sparkle Finder.")).toBeVisible();
      await expect(page.getByRole("link", { name: "Find a Piece" })).toBeVisible();
      await expect(page.getByRole("link", { name: "My Collection" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Browse Library" }).first()).toBeVisible();
      await expect(page.getByText("Wishlist check")).toBeVisible();
      await expect(page.getByText("Nic-Nac Home")).toHaveCount(0);
      await expect(page.getByText("Ask Nic-Nac or tap a simple action.")).toHaveCount(0);
      const vault = page.locator('[data-smoke="homepage-bling-vault"]');
      await expect(vault.getByText("Hero Piece").first()).toBeVisible();
      await expect(vault.getByText("Bling Vault").first()).toBeVisible();
      await expect(page.getByText("My Collection Preview")).toHaveCount(0);

      const simpleHome = page.locator('[data-smoke="simple-finder-home"]');
      await expect(simpleHome.getByText("Owned", { exact: true })).toHaveCount(0);
      await expect(simpleHome.getByText("Diamonds", { exact: true })).toHaveCount(0);
      await expect(simpleHome.getByText("Unicorns", { exact: true })).toHaveCount(0);
      await expect(simpleHome.getByText("Found by Sparkle Finder", { exact: true })).toHaveCount(0);
      await expect(simpleHome.getByText("Featured", { exact: true })).toHaveCount(0);
      await expect(simpleHome.getByText("Saved", { exact: true })).toHaveCount(0);
      const collectionStats = vault.locator('[data-smoke="collection-stats"]');
      await expect(collectionStats.getByText("Owned", { exact: true })).toBeVisible();
      await expect(collectionStats.getByText("Wishlist", { exact: true })).toBeVisible();
      await expect(collectionStats.getByText("Diamonds", { exact: true })).toBeVisible();
      await expect(collectionStats.getByText("Unicorns", { exact: true })).toBeVisible();
      await expect(collectionStats.getByText("Found by Sparkle Finder", { exact: true })).toBeVisible();
      await findPanel.getByText("More ways to look").click();
      await expect(findPanel.getByRole("link", { name: "Live Shows" })).toBeVisible();
      await expect(findPanel.getByRole("link", { name: "Dance Floor" })).toBeVisible();
      await expect(findPanel.getByRole("link", { name: "Favorite Reps" })).toBeVisible();
      await expect(findPanel.getByRole("link", { name: "Collectors" })).toBeVisible();
      await expect(findPanel.getByRole("link", { name: "Photo Setup Guide" })).toBeVisible();
      await expect(findPanel.getByRole("link", { name: "Reps", exact: true })).toBeVisible();
      const missingPieceLink = page.getByRole("link", { name: "I have a photo or label" });
      await expect(missingPieceLink).toHaveAttribute("href", "/silver#showcase-studio");
      await missingPieceLink.click();
      await expect(page).toHaveURL(`${baseUrl}/silver#showcase-studio`);
      const studioPanel = page.locator('[data-smoke="showcase-studio-intake"]');
      await expect(studioPanel).toBeVisible();
      await expect(studioPanel.getByLabel("Original label photo")).toBeVisible();
      await expect(studioPanel.getByLabel("Jewelry photo")).toBeVisible();
      await expect(studioPanel.getByRole("textbox", { name: /^Item number\b/ })).toBeVisible();
      await expect(studioPanel.getByText("Photos are resized without a square crop before they leave your browser.")).toBeVisible();
      const studioSubmissionId = studioPanel.locator('input[name="finderSubmissionId"]');
      await expect(studioSubmissionId).toHaveValue(/^[0-9a-f-]{36}$/i);
      const retainedSubmissionId = await studioSubmissionId.inputValue();
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.locator('[data-smoke="showcase-studio-intake"] input[name="finderSubmissionId"]')).toHaveValue(retainedSubmissionId);
      await page.goto(baseUrl, { waitUntil: "domcontentloaded" });

      const vaultTiles = page.locator('[data-smoke="bling-vault-tile"]');
      await expect(vaultTiles.first()).toBeVisible();
      expect(await vaultTiles.count()).toBeLessThanOrEqual(8);

      await expect(vault.locator('[data-smoke="library-image-frame"]').first()).toBeVisible();
      expect(await vault.locator('[data-smoke="library-image-frame"]').count()).toBeGreaterThan(1);

      await expectNoOverlap(page.locator('[data-smoke="simple-finder-home"]'), page.locator('[data-smoke="find-piece-panel"]'), "simple home", "find panel");
      await expectNoOverlap(page.locator('[data-smoke="find-piece-panel"]'), page.locator('[data-smoke="homepage-bling-vault"]'), "find panel", "Bling Vault");

      await expect(page.locator(".sparkle-finder-site-footer")).toHaveCount(0);
    });
  }

  test("Library follows a valid v2 cursor without repeating exact design identities", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.context().clearCookies();
    await page.context().addCookies([
      {
        name: "sparkle_finder_auth_mode",
        value: "silver",
        url: baseUrl,
      },
    ]);

    await page.goto(`${baseUrl}/library`, { waitUntil: "domcontentloaded" });

    const firstPageCards = page.locator('[data-smoke="library-jewelry-card"]');
    const firstCard = firstPageCards.first();
    await expect(firstCard).toBeVisible();
    await expect(firstCard.locator('[data-smoke="library-variant-identity"]')).toBeVisible();
    const exactDesignId = await firstCard.getAttribute("data-design-id");
    expect(exactDesignId).toBeTruthy();
    await expect(firstCard.getByRole("link", { name: "View piece" })).toHaveAttribute(
      "href",
      `/library/${encodeURIComponent(exactDesignId!)}`,
    );

    const firstPageDesignIds = await firstPageCards.evaluateAll((cards) =>
      cards.map((card) => card.getAttribute("data-design-id")).filter((value): value is string => Boolean(value)),
    );
    const nextPage = page.locator('[data-smoke="library-next-page"]');
    await expect(nextPage).toBeVisible();
    await expect(nextPage).toHaveText("Next page");
    const nextPageHref = await nextPage.getAttribute("href");
    expect(nextPageHref).toContain("cursor=");
    await nextPage.click();
    await expect(page).toHaveURL(/\/library\?cursor=/);

    const secondPageCards = page.locator('[data-smoke="library-jewelry-card"]');
    await expect(secondPageCards.first()).toBeVisible();
    const secondPageDesignIds = await secondPageCards.evaluateAll((cards) =>
      cards.map((card) => card.getAttribute("data-design-id")).filter((value): value is string => Boolean(value)),
    );
    expect(secondPageDesignIds.length).toBeGreaterThan(0);
    expect(secondPageDesignIds.some((designId) => firstPageDesignIds.includes(designId))).toBe(false);

    const search = page.getByRole("searchbox", { name: "Search the Jewelry Library" });
    await search.fill("ring");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page).toHaveURL(/\/library\?q=ring(?:&|$)/);
    expect(new URL(page.url()).searchParams.has("cursor")).toBe(false);
  });

  test("signup shows Silver trial and phone privacy defaults", async ({ page }) => {
    await page.goto(`${baseUrl}/auth/sign-up`, { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Finish this form to start 30 days of Silver" })).toBeVisible();
    await expect(page.getByText("No card.")).toBeVisible();
    await expect(page.getByText("Marketing texts are optional.")).toBeVisible();
    await expect(page.getByText("Not sold.")).toBeVisible();
    await expect(page.getByText("I acknowledge the Sparkle Finder privacy terms")).toBeVisible();
    await expect(page.getByRole("checkbox", { name: /Text me optional promotional messages/ })).not.toBeChecked();
  });

  test("account route prompts anonymous visitors and Silver preview can access account and Silver pages", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(`${baseUrl}/account`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Sign in to manage your Sparkle Finder account")).toBeVisible();
    await expect(page.getByText("Silver trial details")).toBeVisible();
    await expect(page.getByRole("link", { name: "Create account" })).toHaveAttribute("href", "/auth/sign-up");

    await page.context().addCookies([
      {
        name: "sparkle_finder_auth_mode",
        value: "silver",
        url: baseUrl,
      },
    ]);

    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Find the pieces you love.")).toBeVisible();
    await expect(page.locator('[data-smoke="homepage-bling-vault"]')).toBeVisible();

    await page.goto(`${baseUrl}/account`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Sparkle Finder account", exact: true })).toBeVisible();
    await expect(page.getByText(/Your\s+45-day Silver trial\s+is active/)).toBeVisible();
    await expect(page.getByText(/Trial ends\s+June 10, 2026/)).toBeVisible();
    await expect(page.getByText("Phone is used for account identification")).toBeVisible();
    await expect(page.getByText("We do not sell your phone number.")).toBeVisible();
    await expect(page.getByText("Marketing texts are optional and separate from account/security notices.")).toBeVisible();
    await expect(page.getByRole("checkbox", { name: /Optional promotional SMS/ })).not.toBeChecked();

    await page.goto(`${baseUrl}/silver`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Sparkle Mama's Sparkle Showcase")).toBeVisible();
    const studioPanel = page.locator('[data-smoke="showcase-studio-intake"]');
    await expect(studioPanel).toBeVisible();
    await expect(studioPanel.getByLabel("Main stone")).toBeVisible();
    await expect(studioPanel.getByLabel("Material")).toBeVisible();
    await expect(studioPanel.getByRole("button", { name: "Send to Showcase Studio" })).toBeVisible();
    await expect(page.getByText("Local fixture mode")).toBeVisible();
  });

  test("Silver preview can browse the Reps main tab", async ({ page }) => {
    await page.context().clearCookies();
    await page.context().addCookies([
      {
        name: "sparkle_finder_auth_mode",
        value: "silver",
        url: baseUrl,
      },
    ]);

    await page.goto(`${baseUrl}/reps`, { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Sparkle Suite Reps" })).toBeVisible();
    await expect(page.getByText("Browse reps, check show times, and save your favorites.")).toBeVisible();
    await expect(page.getByPlaceholder("Search reps")).toBeVisible();
    if (expectLiveReps) {
      await expect(page.getByText("Heather", { exact: true })).toBeVisible();
      await expect(page.getByText("BlingKitchen", { exact: true })).toBeVisible();
      await expect(page.getByText("No show scheduled", { exact: true })).toBeVisible();
      await expect(page.locator('a[href="https://www.yoursparklesuite.com/blingkitchen"]')).toBeVisible();
      await expect(page.locator('a[href="https://www.yoursparklesuite.com/blingkitchen/trade"]')).toBeVisible();
      await expect(page.getByText("Lindsay Lucas")).toHaveCount(0);
      await expect(page.getByText("Sierra Sparkle Studio")).toHaveCount(0);
    } else {
      await expect(page.getByText("Lindsay Lucas")).toBeVisible();
      await expect(page.getByText("Sierra Sparkle Studio")).toBeVisible();
      await expect(page.getByText("Upcoming").first()).toBeVisible();
      await expect(page.locator('a[href^="/rep-boards?rep="]').first()).toBeVisible();
    }
    await expectNoGuardrailCopy(page);
    await expectNoExampleLinksOnCurrentPage(page);
    await page.waitForTimeout(750);
    await expect(page.getByRole("heading", { name: "Sparkle Suite Reps" })).toBeVisible();

    mkdirSync(screenshotDir, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: join(screenshotDir, "sparkle-finder-reps-desktop.png"),
    });

    await page.setViewportSize({ width: 390, height: 900 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Sparkle Suite Reps" })).toBeVisible();
    await expect(page.getByPlaceholder("Search reps")).toBeVisible();
    await page.screenshot({
      fullPage: true,
      path: join(screenshotDir, "sparkle-finder-reps-mobile.png"),
    });
  });

  test("hub routes still gate anonymous visitors", async ({ page }) => {
    await page.context().clearCookies();

    for (const path of ["/dashboard", "/library", "/live-shows", "/rep-boards", "/reps", "/favorites", "/collectors", "/silver"]) {
      await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded" });
      await expect(page.getByText("Sign in to open Sparkle Finder")).toBeVisible();
      await expect(page.getByText("Create a free Sparkle Finder account to open this tool.")).toBeVisible();
      await expect(page.getByRole("link", { name: "Create free account" })).toHaveAttribute("href", "/auth/sign-up");
      await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/auth/sign-in");
    }
  });

  test("auth preview paths open the customer homepage and gated hub routes", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(`${baseUrl}/dashboard`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Sign in to open Sparkle Finder")).toBeVisible();
    await expectNoGuardrailCopy(page);
    await expectNoExampleLinksOnCurrentPage(page);

    await page.getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL(`${baseUrl}/auth/sign-in`);
    await expect(page.getByRole("link", { name: "Continue as Guest" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Continue as Marlena/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Preview Sparkle Mama/ })).toBeVisible();

    await page.getByRole("link", { name: /Continue as Marlena/ }).click();
    await expect(page).toHaveURL(`${baseUrl}/`);
    await expect(page.getByText("Find the pieces you love.")).toBeVisible();

    await page.goto(`${baseUrl}/silver`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Marlena's Sparkle Showcase")).toBeVisible();
    await expect(page.locator('[data-smoke="finder-nic-nac-curator"]')).toBeVisible();
    await expect(page.getByPlaceholder("Tell Nic-Nac what you want to add, find, or update...")).toBeVisible();

    await page.goto(`${baseUrl}/auth/sign-in`, { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: /Preview Sparkle Mama/ }).click();
    await expect(page).toHaveURL(`${baseUrl}/`);
    await page.context().addCookies([
      {
        name: "sparkle_finder_auth_mode",
        value: "silver",
        url: baseUrl,
      },
    ]);
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-smoke="homepage-bling-vault"]')).toBeVisible();
    await page.goto(`${baseUrl}/silver`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Sparkle Mama's Sparkle Showcase")).toBeVisible();

    await page.goto(`${baseUrl}/auth/sign-in`, { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: "Continue as Guest" }).click();
    await expect(page).toHaveURL(`${baseUrl}/`);
    await page.goto(`${baseUrl}/dashboard`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Sign in to open Sparkle Finder")).toBeVisible();
    await expect(page.getByText("Create a free Sparkle Finder account to open this tool.")).toBeVisible();
  });

  test("Silver library item detail exposes bounded Nic-Nac and local Dance Floor paths", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.context().clearCookies();
    await page.context().addCookies([
      {
        name: "sparkle_finder_auth_mode",
        value: "silver",
        url: baseUrl,
      },
    ]);
    await page.goto(`${baseUrl}/dashboard`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(`${baseUrl}/`);
    await expect(page.locator('[data-smoke="homepage-bling-vault"]')).toBeVisible();

    await page.goto(`${baseUrl}/library`, { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-smoke="library-image-frame"]').first()).toBeVisible();

    await page.goto(`${baseUrl}/library/jewel-rainbow-crown-ring`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Rainbow Crown Ring").first()).toBeVisible();
    await expect(page.locator('[data-smoke="library-image-frame"]').first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Nic-Nac" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Check saved pieces" })).toBeVisible();
    await expect(page.getByText("Exact dancer lead", { exact: true }).first()).toBeVisible();
    await expect(page.locator('[data-smoke="availability-total-summary"]')).toContainText("rep lead");
    await expect(page.locator('[data-smoke="availability-total-summary"]')).toContainText(/dancers? available/);
    await expect(page.locator('[data-smoke="dancer-lead-card"]').first()).toContainText("1 dancer available");
    mkdirSync(screenshotDir, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: join(screenshotDir, "sparkle-finder-availability-mobile.png"),
    });
    await expectNoGuardrailCopy(page);
    await expectNoExampleLinksOnCurrentPage(page);

    await page.getByRole("link", { name: "Open Dance Floor" }).first().click();
    await expect(page).toHaveURL(`${baseUrl}/rep-boards?listing=rainbow-crown`);
    await expect(page.getByRole("heading", { name: "Dance Floor" })).toBeVisible();
    await expectNoExampleLinksOnCurrentPage(page);
  });

  test("Silver API-backed item detail exposes Sparkle Suite rep site link when configured", async ({ page }) => {
    const apiItemId = process.env.SPARKLE_FINDER_SMOKE_API_ITEM_ID;

    test.skip(!apiItemId, "Set SPARKLE_FINDER_SMOKE_API_ITEM_ID to smoke-test a live API-backed item detail page.");

    await page.context().clearCookies();
    await page.context().addCookies([
      {
        name: "sparkle_finder_auth_mode",
        value: "silver",
        url: baseUrl,
      },
    ]);

    await page.goto(`${baseUrl}/library/${apiItemId}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Nic-Nac" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Check saved pieces" })).toBeVisible();
    const repSiteLink = page.getByRole("link", { name: "Visit Rep Site" }).first();
    await expect(repSiteLink).toBeVisible();
    await expect(page.locator('[data-smoke="availability-total-summary"]')).toContainText("rep lead");
    await expect(page.locator('[data-smoke="availability-total-summary"]')).toContainText("dancer");
    await expect(page.locator('[data-smoke="dancer-lead-card"]').first()).toContainText(/\d+ dancers? available/);
    await expect(repSiteLink).toHaveAttribute(
      "href",
      new RegExp(`^${escapeRegExp(sparkleSuiteFinderBaseUrl)}/`),
    );
    await expect(page.getByRole("link", { name: "Open Dance Floor" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Open rep profile" })).toHaveCount(0);
    const exactContinuation = page.locator('[data-smoke="availability-exact_item-next"]');
    if (await exactContinuation.count()) {
      await expect(exactContinuation).toHaveText(/Next page of exact leads/);
      await expect(exactContinuation).toHaveAttribute("href", /exactCursor=.*#known-dancer-leads/);
      await exactContinuation.click();
      await expect(page).toHaveURL(/exactCursor=.*#known-dancer-leads/);
      await expect(page.locator("#known-dancer-leads")).toBeVisible();
      await expect(page.locator('[data-smoke="availability-exact_item-bucket"]')).toContainText("This page shows");
      await page.goBack();
    }
    const similarContinuation = page.locator('[data-smoke="availability-same_collection_type-next"]');
    if (await similarContinuation.count()) {
      await expect(similarContinuation).toHaveText(/Next page of similar leads/);
      await expect(similarContinuation).toHaveAttribute("href", /similarCursor=.*#known-dancer-leads/);
    }
    await expectNoGuardrailCopy(page);
  });

  test("Silver live calendar exposes Sparkle Suite rep site links when configured", async ({ page }) => {
    test.skip(
      process.env.SPARKLE_FINDER_SMOKE_EXPECT_LIVE_SHOWS !== "true",
      "Set SPARKLE_FINDER_SMOKE_EXPECT_LIVE_SHOWS=true when the Sparkle Suite live-shows endpoint is deployed.",
    );

    await page.context().clearCookies();
    await page.context().addCookies([
      {
        name: "sparkle_finder_auth_mode",
        value: "silver",
        url: baseUrl,
      },
    ]);

    await page.goto(`${baseUrl}/live-shows`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Master Live Calendar")).toBeVisible();
    await expect(page.getByRole("link", { name: "Visit Rep Site" }).first()).toBeVisible();
    await expect(page.getByText("Preview calendar data")).toHaveCount(0);
    await expectNoGuardrailCopy(page);
  });
});

async function expectNoGuardrailCopy(page: Page) {
  const visibleCopy = await page.locator("body").innerText();
  expect(findSparkleFinderCopyViolations(visibleCopy)).toEqual([]);
}

async function expectPrimarySectionsAreVisible(page: Page) {
  for (const selector of [
    "nav",
    "public-landing",
    "public-hero",
    "coming-soon-copy",
  ]) {
    await expect(page.locator(`[data-smoke="${selector}"]`)).toBeVisible();
  }
}

async function expectHomepageLinksStayLocal(page: Page) {
  const hrefs = await page.locator("main a[href], nav a[href]").evaluateAll((links) =>
    links.map((link) => (link as HTMLAnchorElement).href),
  );

  expect(hrefs.some((href) => href.includes("sparklesuite.example"))).toBe(false);
}

async function expectNoExampleLinksOnCurrentPage(page: Page) {
  const hrefs = await page.locator("a[href]").evaluateAll((links) =>
    links.map((link) => (link as HTMLAnchorElement).href),
  );

  expect(hrefs.some((href) => href.includes("sparklesuite.example"))).toBe(false);
}

async function expectNoPublicHomepageDemoData(page: Page) {
  const html = await page.content();

  expect(html).not.toContain("Rainbow Crown Ring");
  expect(html).not.toContain("Celestial Lights Preview");
  expect(html).not.toContain("Sierra Sparkle Studio");
  expect(html).not.toContain("Add to collection");
  expect(html).not.toContain("Ask Nic-Nac");
}

async function expectReadableControls(page: Page) {
  const navLabelsFit = await page.locator('[data-smoke="nav"] a').evaluateAll((links) =>
    links.every((link) => link.scrollWidth <= link.clientWidth + 1),
  );
  expect(navLabelsFit, "nav labels should not be clipped inside links").toBe(true);

  const primaryColors = await page.getByRole("link", { name: "Create account" }).evaluate((element) => {
    const styles = window.getComputedStyle(element);

    return {
      background: styles.backgroundColor,
      foreground: styles.color,
    };
  });
  const primaryContrast = getContrastRatio(primaryColors.foreground, primaryColors.background);

  expect(primaryContrast, "primary CTA contrast").toBeGreaterThan(4.5);
  expect(primaryColors.foreground, "primary CTA should render light text").toContain("255");
  expect(primaryColors.background, "primary CTA should have a visible background").not.toBe("rgba(0, 0, 0, 0)");
}

async function expectClickPath(page: Page, link: Locator, expectedPath: string) {
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(new RegExp(`${expectedPath.replace("/", "\\/")}(\\?|$)`));
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
}

async function expectPrimarySectionsDoNotOverlap(page: Page) {
  const nav = page.locator('[data-smoke="nav"]');
  const hero = page.locator('[data-smoke="public-hero"]');

  await expectNoOverlap(nav, hero, "nav", "public hero");
}

async function expectNoOverlap(left: Locator, right: Locator, leftLabel: string, rightLabel: string) {
  const [leftBox, rightBox] = await Promise.all([left.boundingBox(), right.boundingBox()]);

  expect(leftBox, `${leftLabel} should have a rendered bounding box`).not.toBeNull();
  expect(rightBox, `${rightLabel} should have a rendered bounding box`).not.toBeNull();

  if (!leftBox || !rightBox) {
    return;
  }

  expect(leftBox.width, `${leftLabel} width`).toBeGreaterThan(0);
  expect(leftBox.height, `${leftLabel} height`).toBeGreaterThan(0);
  expect(rightBox.width, `${rightLabel} width`).toBeGreaterThan(0);
  expect(rightBox.height, `${rightLabel} height`).toBeGreaterThan(0);

  const overlaps =
    leftBox.x < rightBox.x + rightBox.width &&
    leftBox.x + leftBox.width > rightBox.x &&
    leftBox.y < rightBox.y + rightBox.height &&
    leftBox.y + leftBox.height > rightBox.y;

  expect(overlaps, `${leftLabel} overlaps ${rightLabel}`).toBe(false);
}

function getContrastRatio(foreground: string, background: string) {
  const fore = parseRgb(foreground);
  const back = parseRgb(background);
  const lighter = Math.max(getRelativeLuminance(fore), getRelativeLuminance(back));
  const darker = Math.min(getRelativeLuminance(fore), getRelativeLuminance(back));

  return (lighter + 0.05) / (darker + 0.05);
}

function getRelativeLuminance([red, green, blue]: [number, number, number]) {
  const [r, g, b] = [red, green, blue].map((value) => {
    const channel = value / 255;

    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function parseRgb(value: string): [number, number, number] {
  if (value.startsWith("#") && (value.length === 7 || value.length === 4)) {
    const hex =
      value.length === 4
        ? value
            .slice(1)
            .split("")
            .map((character) => character + character)
            .join("")
        : value.slice(1);

    return [
      Number.parseInt(hex.slice(0, 2), 16),
      Number.parseInt(hex.slice(2, 4), 16),
      Number.parseInt(hex.slice(4, 6), 16),
    ];
  }

  const matches = value.match(/\d+(\.\d+)?/g)?.map(Number) ?? [];
  const channels = matches.slice(0, 3);

  if (value.startsWith("color(") && channels.every((channel) => channel <= 1)) {
    return [
      Math.round((channels[0] ?? 0) * 255),
      Math.round((channels[1] ?? 0) * 255),
      Math.round((channels[2] ?? 0) * 255),
    ];
  }

  return [channels[0] ?? 0, channels[1] ?? 0, channels[2] ?? 0];
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
