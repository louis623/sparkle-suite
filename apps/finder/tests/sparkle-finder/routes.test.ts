import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHubChrome } from "../../components/layout/SparkleFinderHubChrome";
import PrivacyPolicyPage from "../../app/privacy-policy/page";
import TermsAndConditionsPage from "../../app/terms-and-conditions/page";
import { renderHomeContent, renderPublicHomeContent } from "../../app/page";
import { renderAccountPageContent } from "../../app/account/page";
import { renderDashboardPageContent } from "../../app/(hub)/dashboard/page";
import ItemDetailPage, { renderItemDetailPageContent } from "../../app/(hub)/library/[itemId]/page";
import { renderLibraryPageContent } from "../../app/(hub)/library/page";
import { renderLiveShowsPageContent } from "../../app/(hub)/live-shows/page";
import { renderRepsPageContent } from "../../app/(hub)/reps/page";
import { renderFavoritesPageContent } from "../../app/(hub)/favorites/page";
import { renderCollectorsPageContent } from "../../app/(hub)/collectors/page";
import RepBoardsPage from "../../app/(hub)/rep-boards/page";
import PhotoSetupPage, { renderPhotoSetupPageContent } from "../../app/photo-setup/page";
import { renderSignInPageContent } from "../../app/auth/sign-in/page";
import { renderSignUpPageContent } from "../../app/auth/sign-up/page";
import { FavoriteRepsPanel } from "../../components/favorites/FavoriteRepsPanel";
import { JewelryImageFrame } from "../../components/library/JewelryImageFrame";
import { PieceImage } from "../../components/showcase/RarestReveals";
import { RepLeadPanel } from "../../components/showcase/RepLeadPanel";
import { ShowcaseStudioIntakePanel } from "../../components/showcase/ShowcaseStudioIntakePanel";
import { GET as previewAuthGET } from "../../app/auth/preview/[mode]/route";
import { renderSilverPageContent } from "../../app/(hub)/silver/page";
import { JewelryCard } from "../../components/library/JewelryCard";
import type { CurrentSparkleFinderAccountState } from "../../lib/sparkle-finder/account-service";
import type { CatalogPageReadResult, FinderAvailabilityResult, FinderLiveShow } from "../../lib/sparkle-finder/catalog-service";
import type { FavoriteRepCard, PublicCollectorProfile } from "../../lib/sparkle-finder/social-types";
import type { JewelryItem, LiveShow, RepSummary } from "../../lib/sparkle-finder/types";
import type { SparkleShowcasePiece } from "../../lib/sparkle-finder/showcase-types";
import * as accountService from "../../lib/sparkle-finder/account-service";
import * as catalogService from "../../lib/sparkle-finder/catalog-service";
import { getLocalDevAuthState } from "../../lib/sparkle-finder/auth";
import { buildHomepageBlingVaultModel, type HomepageBlingVaultItem } from "../../lib/sparkle-finder/homepage-bling-vault";
import { findSparkleFinderCopyViolations } from "../../lib/sparkle-finder/copy-guardrails";
import { initialShowcaseStudioPanelActionState } from "../../lib/sparkle-finder/showcase-studio-workflow-types";
import {
  getLocalRepBoardHref,
  getLocalRepHref,
  getSparkleSuiteRepBoardHref,
  getSparkleSuiteRepHref,
} from "../../lib/sparkle-finder/route-hrefs";
import {
  sparkleFinderLegalFooterLinks,
  sparkleFinderPrivacyPolicyDocument,
  sparkleFinderTermsAndConditionsDocument,
} from "../../lib/sparkle-finder/legal-content";

const { cookiesMock } = vi.hoisted(() => ({ cookiesMock: vi.fn() }));

vi.mock("next/headers", () => ({ cookies: cookiesMock }));

const routes = [
  ["dashboard", () => renderToStaticMarkup(renderDashboardPageContent())],
  ["library", () => renderToStaticMarkup(renderLibraryPageContent())],
  ["live-shows", () => renderToStaticMarkup(renderLiveShowsPageContent(finderLiveShowItems()))],
  ["reps", () => renderToStaticMarkup(renderRepsPageContent())],
  ["favorites", () => renderToStaticMarkup(renderFavoritesPageContent(getLocalDevAuthState("silver")))],
  ["collectors", () => renderToStaticMarkup(renderCollectorsPageContent(getLocalDevAuthState("silver")))],
  ["rep-boards", () => renderToStaticMarkup(createElement(RepBoardsPage))],
  ["silver", () => renderToStaticMarkup(renderSilverPageContent(getLocalDevAuthState("silver")))],
] as const;

const publicRoutes = [
  ["photo-setup", () => renderToStaticMarkup(createElement(PhotoSetupPage))],
] as const;

describe("Sparkle Finder hub routes", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    cookiesMock.mockReset();
  });

  it("renders the shared hub shell around dashboard content", () => {
    const markup = renderToStaticMarkup(
      renderHubChrome(renderDashboardPageContent(), getLocalDevAuthState("silver")),
    );
    const navMarkup = extractNavMarkup(markup);

    expect(markup).toContain("Sparkle Finder");
    expect(markup).toContain("Finder Dashboard");
    expect(navMarkup).toContain('href="/"');
    expect(navMarkup).toContain(">Home<");
    expect(navMarkup).toContain('href="/#find-a-piece"');
    expect(navMarkup).toContain(">Find<");
    expect(navMarkup).toContain('href="/#bling-vault"');
    expect(navMarkup).toContain(">Collection<");
    expect(navMarkup).toContain('href="/reps"');
    expect(navMarkup).toContain(">Reps<");
    expect(navMarkup).toContain('href="/account"');
    expect(navMarkup).not.toContain('href="/library"');
    expect(navMarkup).not.toContain('href="/rep-boards"');
    expect(navMarkup).not.toContain('href="/live-shows"');
    expect(navMarkup).not.toContain('href="/favorites"');
    expect(navMarkup).not.toContain('href="/collectors"');
    expect(markup).toContain("/rep-boards");
    expect(markup).toContain("/live-shows");
    expect(markup).toContain("/favorites");
    expect(markup).toContain("/collectors");
    expect(markup).not.toContain("/shop");
  });

  it("renders a persistent app-style bottom nav for signed-in visitors", () => {
    const markup = renderToStaticMarkup(
      renderHubChrome(renderDashboardPageContent(), getLocalDevAuthState("silver")),
    );
    const navMarkup = extractNavMarkup(markup);
    const bottomNavMarkup = navMarkup.slice(navMarkup.indexOf('data-smoke="app-bottom-nav"'));

    expect(navMarkup).toContain('data-smoke="app-bottom-nav"');
    expect(navMarkup).toContain("Sparkle Finder app navigation");
    expect(navMarkup).toContain("sparkle-finder-app-bottom-nav");
    expect(navMarkup).not.toContain("sparkle-finder-mobile-menu");
    expect(navMarkup).not.toContain("<summary");
    expect(navMarkup).not.toContain(">Menu<");
    expect(navMarkup).toContain('href="/"');
    expect(navMarkup).toContain(">Home<");
    expect(navMarkup).toContain('href="/#find-a-piece"');
    expect(navMarkup).toContain(">Find<");
    expect(navMarkup).toContain('href="/#bling-vault"');
    expect(navMarkup).toContain(">Collection<");
    expect(navMarkup).toContain('href="/reps"');
    expect(navMarkup).toContain(">Reps<");
    expect(navMarkup).toContain('href="/account"');
    expect(navMarkup).toContain(">Me<");
    expect(navMarkup).not.toContain('href="/library"');
    expect(navMarkup).not.toContain('href="/live-shows"');
    expect(navMarkup).not.toContain('href="/rep-boards"');
    expect(navMarkup).not.toContain('href="/favorites"');
    expect(navMarkup).not.toContain('href="/collectors"');
    expect(navMarkup).not.toContain('href="/shop"');
    expect(bottomNavMarkup).not.toContain('href="/auth/sign-out"');
    expect(bottomNavMarkup).not.toContain(">Sign out<");
  });

  it("shows a sign-in wall for anonymous hub visitors", () => {
    const markup = renderToStaticMarkup(
      renderHubChrome(renderDashboardPageContent(), getLocalDevAuthState("anonymous")),
    );

    expect(markup).toContain("Create a free Sparkle Finder account to open this tool.");
    expect(markup).toContain("/auth/sign-up");
    expect(markup).toContain("/auth/sign-in");
    expect(markup).not.toContain("Finder Dashboard");
  });

  it("labels the anonymous header account link as Sign In", () => {
    const markup = renderToStaticMarkup(
      renderHubChrome(renderDashboardPageContent(), getLocalDevAuthState("anonymous")),
    );

    expect(markup).toContain('href="/auth/sign-in"');
    expect(markup).toContain(">Sign In<");
    expect(markup).not.toContain(">Guest<");
  });

  it("renders the shared Sparkle Finder footer with Sparkle Suite links", () => {
    const publicMarkup = renderToStaticMarkup(renderPublicHomeContent(anonymousRouteAccountState()));
    const hubMarkup = renderToStaticMarkup(
      renderHubChrome(renderDashboardPageContent(), getLocalDevAuthState("anonymous")),
    );

    for (const markup of [publicMarkup, hubMarkup]) {
      expect(markup).toContain('class="sparkle-finder-site-footer"');
      expect(markup).toContain("Sparkle Finder");
      expect(markup).toContain("Footer links");
      expect(markup).toContain('href="/account"');
      expect(markup).not.toContain('href="/affiliate-disclosure"');
      expect(markup).toContain('href="/privacy-policy"');
      expect(markup).toContain(">Privacy Policy<");
      expect(markup).toContain('href="/terms-and-conditions"');
      expect(markup).toContain(">Terms and Conditions<");
      expect(markup).toContain('href="https://www.yoursparklesuite.com"');
      expect(markup).toContain(">Sparkle Suite<");
      expect(markup).toContain('class="sparkle-finder-site-footer__nav"');
      expect(markup).toContain('class="sparkle-finder-site-footer__brand-stack"');
      expect(markup).toContain('aria-label="Sparkle Finder social links"');
      expect(markup).toContain('href="https://www.tiktok.com/@yoursparklesuite"');
      expect(markup).toContain('aria-label="Sparkle Finder on TikTok"');
      expect(markup).toContain('class="sparkle-finder-site-footer__social-bubble"');
      expect(markup).not.toContain(">TikTok<");
      expect(markup).toContain('href="https://www.youtube.com/@yoursparklesuite"');
      expect(markup).toContain('aria-label="Sparkle Finder on YouTube"');
      expect(markup).not.toContain(">YouTube<");
      expect(markup).not.toContain(">Social<");
      expect(markup).toContain('href="https://neonrabbit.net"');
      expect(markup).toContain("Sparkle Finder is powered by Neon Rabbit Digital Services.");
    }
  });

  it("does not append the marketing footer to signed-in app surfaces", () => {
    const homeMarkup = renderToStaticMarkup(renderHomeContent(silverPreviewRouteAccountState()));
    const hubMarkup = renderToStaticMarkup(
      renderHubChrome(renderRepsPageContent(), getLocalDevAuthState("silver")),
    );

    expect(homeMarkup).toContain('data-layout="mobile-first-app"');
    expect(homeMarkup).not.toContain('class="sparkle-finder-site-footer"');
    expect(homeMarkup).not.toContain("Footer links");
    expect(hubMarkup).not.toContain('class="sparkle-finder-site-footer"');
    expect(hubMarkup).not.toContain("Footer links");
  });

  it("defines Sparkle Finder legal documents with customer-specific coverage", () => {
    expect(sparkleFinderLegalFooterLinks).toEqual([
      { href: "/privacy-policy", label: "Privacy Policy" },
      { href: "/terms-and-conditions", label: "Terms and Conditions" },
    ]);

    expect(sparkleFinderPrivacyPolicyDocument.pageTitle).toBe("Privacy Policy");
    expect(sparkleFinderPrivacyPolicyDocument.seoTitle).toContain("Sparkle Finder Privacy Policy");
    expect(sparkleFinderPrivacyPolicyDocument.description).toContain("Sparkle Finder customer accounts");
    expect(sparkleFinderPrivacyPolicyDocument.lastUpdated).toBe("June 22, 2026");
    expect(sparkleFinderPrivacyPolicyDocument.sections.map((section) => section.title)).toEqual([
      "What This Policy Covers",
      "Information Sparkle Finder Collects",
      "How Sparkle Finder Uses Information",
      "Nic-Nac, Memory, And AI-Assisted Features",
      "Sparkle Suite Data And Rep Links",
      "Sparkle Showcase Sharing And Moderation",
      "SMS And Email Choices",
      "Data Sharing",
      "Data Retention",
      "Your Rights And Choices",
      "Security",
      "Children's Privacy",
      "Changes To This Policy",
      "Contact",
    ]);

    expect(sparkleFinderTermsAndConditionsDocument.pageTitle).toBe("Terms and Conditions");
    expect(sparkleFinderTermsAndConditionsDocument.seoTitle).toContain("Sparkle Finder Terms");
    expect(sparkleFinderTermsAndConditionsDocument.description).toContain("Sparkle Finder customer discovery hub");
    expect(sparkleFinderTermsAndConditionsDocument.lastUpdated).toBe("June 22, 2026");
    expect(sparkleFinderTermsAndConditionsDocument.sections.map((section) => section.title)).toEqual([
      "Agreement To These Terms",
      "About Sparkle Finder",
      "Customer Accounts And Silver Access",
      "Library, Live Shows, Dance Floor, And Availability",
      "Sparkle Showcase, Profile, And Watchlist Tools",
      "Nic-Nac And AI-Assisted Features",
      "Follows, Blocking, Reports, And Moderation",
      "Third-Party Product Resources",
      "Acceptable Use",
      "Privacy",
      "Third-Party Services",
      "Payments, Trials, And Billing",
      "No Sales, Escrow, Or Fulfillment",
      "No Guarantees",
      "Intellectual Property",
      "Disclaimer Of Warranties",
      "Limitation Of Liability",
      "Changes To These Terms",
      "Contact",
    ]);
  });

  it("renders Sparkle Finder legal pages with Finder-specific content", () => {
    const privacyMarkup = renderToStaticMarkup(createElement(PrivacyPolicyPage));
    const termsMarkup = renderToStaticMarkup(createElement(TermsAndConditionsPage));

    expect(privacyMarkup).toContain("Sparkle Finder Legal Center");
    expect(privacyMarkup).toContain("Privacy Policy");
    expect(privacyMarkup).toContain("Sparkle Finder customer accounts");
    expect(privacyMarkup).toContain("Favorite Reps");
    expect(privacyMarkup).toContain("Public Showcases");
    expect(privacyMarkup).toContain("Nic-Nac, Memory, And AI-Assisted Features");
    expect(privacyMarkup).toContain("Nic-Nac memory is a product feature.");
    expect(privacyMarkup).toContain(
      "bounded safe representative memory may be shared between Sparkle Suite and Sparkle Finder",
    );
    expect(privacyMarkup).toContain("one-way follows");
    expect(privacyMarkup).toContain("follower counts");
    expect(privacyMarkup).toContain("public sharing links");
    expect(privacyMarkup).toContain("blocking, reporting, and moderation review");
    expect(privacyMarkup).toContain("We do not sell personal information.");
    expect(privacyMarkup).not.toContain("Affiliate And Shop Information");
    expect(privacyMarkup).not.toContain("comments");
    expect(privacyMarkup).toContain("Back to Sparkle Finder");

    expect(termsMarkup).toContain("Sparkle Finder Legal Center");
    expect(termsMarkup).toContain("Terms and Conditions");
    expect(termsMarkup).toContain("No Sales, Escrow, Or Fulfillment");
    expect(termsMarkup).toContain("Third-Party Product Resources");
    expect(termsMarkup).toContain("Favorite Reps");
    expect(termsMarkup).toContain("Public Showcases");
    expect(termsMarkup).toContain("Nic-Nac And AI-Assisted Features");
    expect(termsMarkup).toContain("Nic-Nac tool access is permission-based and product-surface gated.");
    expect(termsMarkup).toContain("one-way follows");
    expect(termsMarkup).toContain("blocking, reporting, and moderation review");
    expect(termsMarkup).toContain(
      "Sparkle Finder does not support DMs, friend requests, customer-to-customer trading, customer marketplace features, escrow, payment, fulfillment, or disputes.",
    );
    expect(termsMarkup).toContain(
      "Sparkle Finder does not support buying from members, selling your jewelry, message seller workflows, customer-to-customer jewelry trading, or customer-to-customer marketplace workflows.",
    );
    expect(termsMarkup).toContain("Sparkle Finder is a discovery hub");
    expect(termsMarkup).not.toContain("comments");
    expect(termsMarkup).toContain(
      "not owned by, operated by, endorsed by, sponsored by, or officially affiliated with Bomb Party",
    );
    expect(termsMarkup).toContain('href="/privacy-policy"');
    expect(findSparkleFinderCopyViolations(`${privacyMarkup} ${termsMarkup}`)).toEqual([]);
  });

  it("renders a simple coming-soon landing for anonymous visitors", () => {
    const markup = renderToStaticMarkup(renderPublicHomeContent(anonymousRouteAccountState()));

    expect(markup).toContain("Sparkle Finder");
    expect(markup).toContain("Sparkle Finder is coming soon.");
    expect(markup).toContain("Coming soon");
    expect(markup).toContain("Create account");
    expect(markup).toContain("Sign in");
    expect(markup).toContain("Sparkle Finder public navigation");
    expect(markup).toContain('data-smoke="coming-soon-copy"');
    expect(markup).toContain('href="/auth/sign-up?next=/"');
    expect(markup).toContain('href="/auth/sign-in"');
    expect(markup).toContain("sign in now");
    expect(markup).not.toContain('data-smoke="public-hero-editorial"');
    expect(markup).not.toContain("Find it, favorite it, show it off.");
    expect(markup).not.toContain("Collector-first discovery");
    expect(markup).not.toContain("How Sparkle Finder works");
    expect(markup).toContain("sparkle-home-primary-cta");
    expect(markup).not.toContain("Find pieces you like.");
    expect(markup).not.toContain("Browse the Dance Floor.");
    expect(markup).not.toContain("Live show calendar.");
    expect(markup).not.toContain("Collect and show off.");
    expect(markup).not.toContain("Included tools");
    expect(markup).not.toContain("Free or Silver account required.");
    expect(markup).not.toContain("Create free account");
    expect(markup).not.toContain("Free account");
    expect(markup).not.toContain("Silver account");
    expect((markup.match(/data-tone="espresso"/g) ?? []).length).toBe(0);
    expect((markup.match(/data-tone="light"/g) ?? []).length).toBe(0);
    expect(markup).not.toContain("What Sparkle Finder helps with");
    expect(markup).not.toContain("Public preview");
    expect(markup).not.toContain("Start with this");
    expect(markup).not.toContain("Sparkle Finder primary navigation");
    expect(markup).not.toContain('href="/library"');
    expect(markup).not.toContain('href="/live-shows"');
    expect(markup).not.toContain('href="/rep-boards"');
    expect(markup).not.toContain('href="/shop"');
    expect(markup).not.toContain('href="/auth/sign-up?next=/library"');
    expect(markup).not.toContain('href="/auth/sign-up?next=/live-shows"');
    expect(markup).not.toContain('href="/auth/sign-up?next=/rep-boards"');
    expect(markup).not.toContain('href="/auth/sign-up?next=/shop"');
    expect(markup).not.toContain("Master Jewelry Library");
    expect(markup).not.toContain("Live Show Calendar");
    expect(markup).not.toContain(">Dance Floor<");
    expect(markup).not.toContain("Collection Showcase");
    expect(markup).not.toContain("Photo-ready uploads");
    expect(markup).not.toContain("See which reps have dancers you love.");
    expect(markup).not.toContain("Start with your 45-day Silver Tier trial");
    expect(markup).not.toContain("Silver opens the full collector workflow");
    expect(markup).not.toContain("$4.99/month");
    expect(markup).not.toContain("Show off pieces you already own with a digital collection.");
    expect(markup).not.toContain("Get Started");
    expect(markup).not.toContain(">Free tier<");
    expect(markup).not.toContain(">Silver tier<");
  });

  it("renders the main homepage with app navigation for signed-in customers", () => {
    const markup = renderToStaticMarkup(renderHomeContent(silverPreviewRouteAccountState()));
    const navMarkup = extractNavMarkup(markup);

    expect(navMarkup).toContain("Sparkle Finder primary navigation");
    expect(navMarkup).toContain('href="/"');
    expect(navMarkup).toContain(">Home<");
    expect(navMarkup).toContain('href="/#find-a-piece"');
    expect(navMarkup).toContain(">Find<");
    expect(navMarkup).toContain('href="/#bling-vault"');
    expect(navMarkup).toContain(">Collection<");
    expect(navMarkup).toContain('href="/reps"');
    expect(navMarkup).toContain(">Reps<");
    expect(navMarkup).toContain('data-smoke="app-bottom-nav"');
    expect(navMarkup).toContain(">Me<");
    expect(navMarkup).toContain('href="/account"');
    expect(navMarkup).toContain(">Silver<");
    expect(navMarkup).toContain('href="/auth/sign-out"');
    expect(navMarkup).toContain(">Sign out<");
    expect(navMarkup).not.toContain('href="/library"');
    expect(navMarkup).not.toContain('href="/shop"');
    expect(navMarkup).not.toContain('href="/live-shows"');
    expect(navMarkup).not.toContain('href="/rep-boards"');
    expect(navMarkup).not.toContain('href="/favorites"');
    expect(navMarkup).not.toContain('href="/collectors"');
    expect(navMarkup).not.toContain(">Showcase<");
    expect(markup).not.toContain('href="/shop"');
    expect(markup).not.toContain("Today across Sparkle Suite");
    expect(markup).not.toContain('data-smoke="finder-command-center"');
    expect(markup).toContain('data-smoke="simple-finder-home"');
    expect(markup).toContain('data-smoke="find-piece-panel"');
    expect(markup).toContain('data-smoke="homepage-bling-vault"');
    expect(markup).toContain("Find the pieces you love.");
    expect(markup).toContain("Build your collection with Sparkle Finder.");
    expect(markup).toContain("Find a Piece");
    expect(markup).toContain("My Collection");
    expect(markup).toContain("Browse Library");
    expect(markup).toContain("Wishlist check");
    expect(markup).toContain("Bling Vault");
    expect(markup).toContain("Hero Piece");
    expect(markup).toContain("Wishlist");
    const simpleHomeIndex = markup.indexOf('data-smoke="simple-finder-home"');
    const findIndex = markup.indexOf('data-smoke="find-piece-panel"');
    const collectionIndex = markup.indexOf('data-smoke="homepage-bling-vault"');
    expect(simpleHomeIndex).toBeGreaterThan(-1);
    expect(findIndex).toBeGreaterThan(simpleHomeIndex);
    expect(collectionIndex).toBeGreaterThan(findIndex);
    const simpleHomeMarkup = markup.slice(simpleHomeIndex, findIndex);
    expect(simpleHomeMarkup).toContain("Find a Piece");
    expect(simpleHomeMarkup).toContain("My Collection");
    expect(simpleHomeMarkup).toContain("Browse Library");
    expect(simpleHomeMarkup).toContain("Wishlist check");
    expect(simpleHomeMarkup).not.toContain("Found by Sparkle Finder");
    expect(simpleHomeMarkup).not.toContain("Diamonds");
    expect(simpleHomeMarkup).not.toContain("Unicorns");
    expect(simpleHomeMarkup).not.toContain("Account");
    const vaultMarkup = markup.slice(collectionIndex);
    expect(vaultMarkup).toContain("max-w-[34rem]");
    expect(vaultMarkup).toContain("lg:max-w-[56rem]");
    expect(vaultMarkup).not.toContain("max-w-[112rem]");
    expect(vaultMarkup).not.toContain("xl:grid-cols");
    expect(vaultMarkup).toContain("Owned");
    expect(vaultMarkup).toContain("Wishlist");
    expect(vaultMarkup).toContain("Diamonds");
    expect(vaultMarkup).toContain("Unicorns");
    expect(vaultMarkup).toContain("Found by Sparkle Finder");
    expect(vaultMarkup).not.toContain(">Saved<");
    expect(vaultMarkup).not.toContain("Featured");
    expect(vaultMarkup.indexOf("Owned")).toBeLessThan(vaultMarkup.indexOf("Hero Piece"));
    expect(vaultMarkup.indexOf("Hero Piece")).toBeLessThan(vaultMarkup.indexOf("Pieces you want to find."));
    expect(vaultMarkup.indexOf("Pieces you want to find.")).toBeLessThan(
      vaultMarkup.indexOf("Your collection, all in one place."),
    );
    expect((markup.match(/data-smoke="bling-vault-tile"/g) ?? []).length).toBeLessThanOrEqual(8);
    expect(markup).not.toContain("My Collection Preview");
    expect(markup).not.toContain("Sparkle Finder public navigation");
    expect(markup).not.toContain("Start free Silver trial");
    expect(markup).not.toContain(">Sign in<");
    expect(markup).toContain('data-layout="mobile-first-app"');
    expect(markup).toContain("sparkle-finder-app-canvas");
  });

  it("renders authenticated home as a simple app home with preserved collection stats", () => {
    const markup = renderToStaticMarkup(renderHomeContent(silverPreviewRouteAccountState()));
    const simpleHomeIndex = markup.indexOf('data-smoke="simple-finder-home"');
    const findIndex = markup.indexOf('data-smoke="find-piece-panel"');
    const homeMarkup = markup.slice(
      simpleHomeIndex,
      findIndex,
    );

    expect(markup).toContain('data-smoke="simple-finder-home"');
    expect(markup).toContain('data-smoke="find-piece-panel"');
    expect(markup).toContain('data-smoke="homepage-bling-vault"');
    expect(markup).not.toContain("Nic-Nac Home");
    expect(markup).not.toContain("Ask Nic-Nac or tap a simple action.");
    expect(markup).not.toContain("Command Center");
    expect(markup).not.toContain("Open Showcase Studio");
    expect(markup).toContain('data-layout="mobile-first-app"');
    expect(markup).toContain("sparkle-finder-app-canvas");
    expect(markup).toContain("I have a photo or label");
    expect(markup).toContain("Find the pieces you love.");
    expect(markup).toContain("Build your collection with Sparkle Finder.");
    expect(markup).toContain("Check my Wishlist");
    expect(markup).toContain("Ask Nic-Nac for Help");
    expect(markup).toContain("Live Shows");
    expect(markup).toContain("Dance Floor");
    expect(markup).toContain("Favorite Reps");
    expect(markup).toContain("Collectors");
    expect(markup).not.toContain("Trial access");
    expect(markup).not.toContain("Collection next steps");
    expect(homeMarkup).toContain("Wishlist check");
    expect(homeMarkup).not.toContain("Owned");
    expect(homeMarkup).not.toContain("Diamonds");
    expect(homeMarkup).not.toContain("Unicorns");
    expect(homeMarkup).not.toContain("Found by Sparkle Finder");
    expect(homeMarkup).not.toContain("Featured");
    expect(homeMarkup).not.toContain(">Saved<");
    const collectionMarkup = markup.slice(markup.indexOf('data-smoke="homepage-bling-vault"'));
    expect(collectionMarkup).toContain("max-w-[34rem]");
    expect(collectionMarkup).toContain("lg:max-w-[56rem]");
    expect(collectionMarkup).not.toContain("max-w-[112rem]");
    expect(collectionMarkup).toContain("Owned");
    expect(collectionMarkup).toContain("Wishlist");
    expect(collectionMarkup).toContain("Diamonds");
    expect(collectionMarkup).toContain("Unicorns");
    expect(collectionMarkup).toContain("Found by Sparkle Finder");
    expect(markup).not.toContain('min-h-screen overflow-hidden bg-[var(--sparkle-warm-bg)]');
  });

  it("keeps advanced Finder capabilities reachable from contextual homepage links", () => {
    const markup = renderToStaticMarkup(renderHomeContent(silverPreviewRouteAccountState()));
    const findIndex = markup.indexOf('data-smoke="find-piece-panel"');
    const collectionIndex = markup.indexOf('data-smoke="homepage-bling-vault"');
    const findMarkup = markup.slice(findIndex, collectionIndex);

    expect(findIndex).toBeGreaterThan(-1);
    expect(collectionIndex).toBeGreaterThan(findIndex);
    expect(findMarkup).toContain('href="/live-shows"');
    expect(findMarkup).toContain("Live Shows");
    expect(findMarkup).toContain('href="/rep-boards"');
    expect(findMarkup).toContain("Dance Floor");
    expect(findMarkup).toContain('href="/favorites"');
    expect(findMarkup).toContain("Favorite Reps");
    expect(findMarkup).toContain('href="/collectors"');
    expect(findMarkup).toContain("Collectors");
    expect(findMarkup).toContain('href="/reps"');
    expect(findMarkup).toContain("Reps");
    expect(findMarkup).toContain('href="/photo-setup"');
    expect(findMarkup).toContain("Photo Setup Guide");
    expect(findMarkup).toContain('href="/silver#showcase-studio"');
    expect(findMarkup).toContain("I have a photo or label");
    expect(findMarkup).toContain("Check my Wishlist");
    expect(findMarkup).toContain('href="#homepage-nic-nac"');
    expect(findMarkup).toContain("Ask Nic-Nac for Help");
    expect(findMarkup).not.toContain('href="/shop"');
  });

  it("counts Bling Vault stats by meaningful owned, hunt, rarity, and Finder-find signals", () => {
    const model = buildHomepageBlingVaultModel([
      homepageVaultItem({
        id: "owned-diamond-finder",
        jewelryItemId: "diamond-owned",
        state: "owned",
        acquisitionSource: "sparkle_finder_lead",
        jewelryItem: jewelryItem({ id: "diamond-owned", bpLabel: "diamond" }),
      }),
      homepageVaultItem({
        id: "owned-unicorn-nic-nac",
        jewelryItemId: "unicorn-owned",
        state: "owned",
        acquisitionSource: "nic_nac_request",
        jewelryItem: jewelryItem({ id: "unicorn-owned", bpLabel: "unicorn" }),
      }),
      homepageVaultItem({
        id: "owned-standard-manual",
        jewelryItemId: "standard-owned",
        state: "owned",
        acquisitionSource: "manual",
        jewelryItem: jewelryItem({ id: "standard-owned", bpLabel: "standard" }),
      }),
      homepageVaultItem({
        id: "wishlist-unicorn",
        jewelryItemId: "unicorn-wishlist",
        state: "wishlist",
        acquisitionSource: "wishlist",
        jewelryItem: jewelryItem({ id: "unicorn-wishlist", bpLabel: "unicorn" }),
      }),
    ]);

    expect(model.counts).toEqual({
      diamonds: 1,
      finderFinds: 2,
      owned: 3,
      unicorns: 1,
      wishlist: 1,
    });
  });

  it("renders authenticated home profile details from the signed-in account state", () => {
    const silverState = silverPreviewRouteAccountState();
    const markup = renderToStaticMarkup(
      renderHomeContent({
        ...silverState,
        customer: {
          ...silverState.customer,
          displayName: "Louis Sparkle",
        },
        displayName: "Louis Sparkle",
        silverProfile: {
          customerId: "customer-silver-sparkle-mama",
          photoUrl: "data:image/jpeg;base64,abc123",
          tiktokHandle: "https://www.tiktok.com/@louis_sparkle",
          bio: "Profile changed on the live site.",
          visibility: "private",
        },
      }),
    );

    expect(markup).toContain("Louis Sparkle");
    expect(markup).toContain("@louis_sparkle");
    expect(markup).toContain('href="https://www.tiktok.com/@louis_sparkle"');
    expect(markup).toContain('aria-label="@louis_sparkle on TikTok"');
    expect(markup).not.toContain(">https://www.tiktok.com/@louis_sparkle<");
    expect(markup).toContain("data:image/jpeg;base64,abc123");
    expect(markup).not.toContain("Sparkle Mama");
  });

  it("lets jewelry image frames opt into hero eager loading while keeping cards lazy", () => {
    const heroMarkup = renderToStaticMarkup(
      createElement(JewelryImageFrame, {
        fetchPriority: "high",
        imageUrl: "https://cdn.example.test/hero-ring.jpg",
        jewelryType: "ring",
        loading: "eager",
        name: "Hero Ring",
      }),
    );
    const cardMarkup = renderToStaticMarkup(
      createElement(JewelryImageFrame, {
        imageUrl: "https://cdn.example.test/card-ring.jpg",
        jewelryType: "ring",
        name: "Card Ring",
      }),
    );

    expect(heroMarkup).toContain('loading="eager"');
    expect(heroMarkup).toContain('fetchPriority="high"');
    expect(cardMarkup).toContain('loading="lazy"');
  });

  it("keeps the anonymous coming-soon landing informational and avoids live/demo jewelry data", () => {
    const markup = renderToStaticMarkup(renderPublicHomeContent(anonymousRouteAccountState()));

    expect(markup).toContain("Sparkle Finder is coming soon.");
    expect(markup).toContain("Coming soon");
    expect(markup).not.toContain("Independent discovery hub");
    expect(markup).not.toContain("Built for collectors, independently.");
    expect(markup).not.toContain("Sparkle Finder organizes the hunt");
    expect(markup).not.toContain("Sparkle Finder is not Bomb Party, a Bomb Party affiliate, or a Bomb Party rep.");
    expect(markup).not.toContain("Master Jewelry Library");
    expect(markup).not.toContain("Rainbow Crown Ring");
    expect(markup).not.toContain("Celestial Lights Preview");
    expect(markup).not.toContain("Sierra Sparkle Studio");
    expect(markup).not.toContain("Add to collection");
    expect(markup).not.toContain("Nic-Nac, find this for me");
  });

  it.each(["dashboard", "library", "live-shows", "reps", "favorites", "collectors", "rep-boards", "silver"] as const)(
    "gates anonymous visitors before rendering %s hub content",
    (routeName) => {
      const [, renderRoute] = routes.find(([name]) => name === routeName)!;
      const markup = renderToStaticMarkup(
        renderHubChrome(createElement("div", { dangerouslySetInnerHTML: { __html: renderRoute() } }), getLocalDevAuthState("anonymous")),
      );

      expect(markup).toContain("Create a free Sparkle Finder account to open this tool.");
      expect(markup).toContain("Create free account");
      expect(markup).not.toContain("Start free Silver trial");
      expect(markup).toContain("/auth/sign-up");
      expect(markup).toContain("/auth/sign-in");
    },
  );

  it("renders library search and fixture-backed jewelry cards", () => {
    const markup = renderToStaticMarkup(renderLibraryPageContent());

    expect(markup).toContain("Search the Jewelry Library");
    expect(markup).toContain("Rainbow Crown Ring");
    expect(markup).toContain("Celestial Lights");
    expect(markup).toContain("/library/jewel-rainbow-crown-ring");
  });

  it("labels dashboard live show stats from the Finder API and dancers as preview data", () => {
    const markup = renderToStaticMarkup(renderDashboardPageContent(undefined, 3));

    expect(markup).toContain("Live/upcoming shows");
    expect(markup).toContain(">3<");
    expect(markup).toContain("Preview dancers");
  });

  it("labels the Dance Floor as preview-backed and renders API-shaped live shows", () => {
    const repBoardsMarkup = renderToStaticMarkup(createElement(RepBoardsPage));
    const liveShowsMarkup = renderToStaticMarkup(renderLiveShowsPageContent(finderLiveShowItems()));

    expect(repBoardsMarkup).toContain("Preview dancers");
    expect(liveShowsMarkup).toContain("Demo Glow Show");
    expect(liveShowsMarkup).toContain("Rep: Demo");
    expect(liveShowsMarkup).toContain("Visit Rep Site");
    expect(liveShowsMarkup).not.toContain("Preview calendar data");
  });

  it("renders the Reps main tab as a simple customer directory with next-show status", () => {
    const reps: RepSummary[] = [
      {
        id: "rep-later",
        businessName: "Later Sparkle Studio",
        displayName: "Later Rep",
        avatarUrl: "/fixtures/reps/later.jpg",
        state: "NC",
        siteUrl: "https://sparklesuite.example/reps/later",
        nextLiveShowId: "show-later",
      },
      {
        id: "rep-live",
        businessName: "Live Sparkle Studio",
        displayName: "Live Rep",
        avatarUrl: "/fixtures/reps/live.jpg",
        state: "TX",
        siteUrl: "https://sparklesuite.example/reps/live",
        nextLiveShowId: "show-live",
      },
      {
        id: "rep-no-show",
        businessName: "Quiet Sparkle Studio",
        displayName: "Quiet Rep",
        avatarUrl: "",
        state: "GA",
        siteUrl: "https://sparklesuite.example/reps/quiet",
        nextLiveShowId: "",
      },
    ];
    const shows: LiveShow[] = [
      {
        id: "show-later",
        repId: "rep-later",
        startsAt: "2026-07-06T19:00:00-04:00",
        durationMinutes: 45,
        title: "Later Sparkle Live",
        status: "scheduled",
        showUrl: "https://sparklesuite.example/reps/later/show",
      },
      {
        id: "show-live",
        repId: "rep-live",
        startsAt: "2026-07-03T18:00:00-04:00",
        durationMinutes: 45,
        title: "Live Sparkle Now",
        status: "live",
        showUrl: "https://sparklesuite.example/reps/live/show",
      },
    ];

    const markup = renderToStaticMarkup(
      renderRepsPageContent({
        reps,
        liveShows: shows,
        favoriteRepIds: ["rep-live"],
        favoriteCounts: new Map([
          ["rep-live", 1],
          ["rep-later", 2],
          ["rep-no-show", 5],
        ]),
        now: new Date("2026-07-03T18:10:00-04:00"),
        status: "ready",
      }),
    );

    expect(markup).toContain("Sparkle Suite Reps");
    expect(markup).toContain("Browse reps, check show times, and save your favorites.");
    expect(markup).toContain("Ranked by customer favorites.");
    expect(markup).toContain('placeholder="Search reps"');
    expect(markup).toContain("5 favorites");
    expect(markup).toContain("2 favorites");
    expect(markup).toContain("1 favorite");
    expect(markup).toContain("Live now");
    expect(markup).toContain("Upcoming");
    expect(markup).toContain("No show scheduled");
    expect(markup).toContain("Live Rep");
    expect(markup).toContain("Live Sparkle Studio");
    expect(markup).toContain(">TX<");
    expect(markup).toContain("Later Rep");
    expect(markup).toContain("Quiet Rep");
    expect(markup).toContain("View Rep");
    expect(markup).toContain("Board");
    expect(markup).toContain('aria-label="Remove rep from favorites"');
    expect(markup.indexOf("Quiet Rep")).toBeLessThan(markup.indexOf("Later Rep"));
    expect(markup.indexOf("Later Rep")).toBeLessThan(markup.indexOf("Live Rep"));
    expect(markup.indexOf("Quiet Rep")).toBeLessThan(markup.indexOf('placeholder="Search reps"'));
    expect(markup).not.toContain("Command Center");
    expect(markup).not.toContain("Marketplace");
  });

  it("distinguishes a working empty Rep Directory from search misses and API outages", () => {
    const emptyDirectory = renderToStaticMarkup(renderRepsPageContent({ status: "empty" }));
    const emptySearch = renderToStaticMarkup(renderRepsPageContent({ query: "Taylor", status: "ready" }));
    const unavailable = renderToStaticMarkup(renderRepsPageContent({ status: "unavailable" }));

    expect(emptyDirectory).toContain("No public rep profiles are available yet.");
    expect(emptyDirectory).toContain("Eligible Sparkle Suite reps will appear here automatically");
    expect(emptyDirectory).not.toContain("No reps match that search.");
    expect(emptySearch).toContain("No reps match that search.");
    expect(emptySearch).not.toContain("No public rep profiles are available yet.");
    expect(unavailable).toContain("The Rep Directory is temporarily unavailable.");
    expect(unavailable).toContain("Your account and saved favorites are safe.");
  });

  it("renders functional Rep Directory filters and honest degraded favorite-count copy", () => {
    const filtered = renderToStaticMarkup(renderRepsPageContent({ status: "ready", view: "favorites" }));
    const countsUnavailable = renderToStaticMarkup(
      renderRepsPageContent({
        favoriteCountsAvailable: false,
        reps: [{
          id: "rep-one",
          businessName: "One Sparkle",
          displayName: "Rep One",
          avatarUrl: "",
          state: "",
          siteUrl: "",
          nextLiveShowId: "",
        }],
        status: "ready",
      }),
    );

    expect(filtered).toContain('aria-current="page"');
    expect(filtered).toContain('href="/reps?view=live_now"');
    expect(filtered).toContain("You have not saved any favorite reps yet.");
    expect(countsUnavailable).toContain("Live and upcoming reps appear first.");
    expect(countsUnavailable).not.toContain("Ranked by customer favorites.");
    expect(countsUnavailable).not.toContain("0 favorites");
  });

  it("renders favorite reps dashboards for free and Silver customers", () => {
    const freeMarkup = renderToStaticMarkup(renderFavoritesPageContent(getLocalDevAuthState("free")));
    const silverMarkup = renderToStaticMarkup(renderFavoritesPageContent(getLocalDevAuthState("silver")));

    expect(freeMarkup).toContain("Favorites");
    expect(freeMarkup).toContain("Favorite Reps");
    expect(freeMarkup).toContain("Next show");
    expect(freeMarkup).toContain("Dance Floor");
    expect(freeMarkup).toContain("Visit Rep Site");
    expect(freeMarkup).toContain("Silver unlocks rep notes");
    expect(freeMarkup).not.toContain("Rep notes");
    expect(freeMarkup).not.toContain("Ask Nic-Nac");

    expect(silverMarkup).toContain("Favorite Reps");
    expect(silverMarkup).toContain("Next show");
    expect(silverMarkup).toContain("Dance Floor");
    expect(silverMarkup).toContain("Rep notes");
    expect(silverMarkup).toContain("Ask Nic-Nac");
  });

  it("renders injected persisted favorite rep cards on Favorites and Silver", () => {
    const favoriteCard = persistedFavoriteRepCard({
      repDisplayName: "Persisted Glow Rep",
      notes: "Saved from Supabase.",
    });
    const favoritesMarkup = renderToStaticMarkup(renderFavoritesPageContent(getLocalDevAuthState("silver"), [favoriteCard]));
    const silverMarkup = renderToStaticMarkup(
      renderSilverPageContent(getLocalDevAuthState("silver"), undefined, undefined, [favoriteCard]),
    );

    expect(favoritesMarkup).toContain("Persisted Glow Rep");
    expect(favoritesMarkup).toContain("Saved from Supabase.");
    expect(silverMarkup).toContain("Persisted Glow Rep");
    expect(silverMarkup).toContain("Saved from Supabase.");
  });

  it("renders collector discovery as a focused public Showcase utility", () => {
    const markup = renderToStaticMarkup(renderCollectorsPageContent(getLocalDevAuthState("free")));

    expect(markup).toContain("Collectors");
    expect(markup).toContain("Sparkle Showcase");
    expect(markup).toContain("Public Showcases");
    expect(markup).toContain("Follow");
    expect(markup).toContain("View Showcase");
    expect(markup).toContain("Report");
    expect(markup).toContain("Block");
    expect(markup).not.toContain("Friend request");
    expect(markup).not.toContain("DM");
    expect(markup).not.toContain("Marketplace");
    expect(markup).not.toContain("Trade with this collector");
  });

  it("renders injected persisted collector discovery rows", () => {
    const collectors: PublicCollectorProfile[] = [
      {
        userId: "user-persisted-collector",
        handle: "persisted-casey",
        displayName: "Persisted Casey",
        tagline: "Public Supabase Showcase.",
        photoUrl: null,
        showcaseUrl: "/showcase/persisted-casey",
        followerCount: 7,
        followingCount: 3,
        publicPieceCount: 5,
        isFollowedByViewer: true,
        isBlockedByViewer: false,
      },
    ];
    const markup = renderToStaticMarkup(renderCollectorsPageContent(getLocalDevAuthState("silver"), "", collectors));

    expect(markup).toContain("Persisted Casey");
    expect(markup).toContain("Public Supabase Showcase.");
    expect(markup).toContain("/showcase/persisted-casey");
    expect(markup).toContain("Following");
  });

  it("renders a collector sign-in prompt for anonymous visitors", () => {
    const markup = renderToStaticMarkup(renderCollectorsPageContent(getLocalDevAuthState("anonymous")));

    expect(markup).toContain("Collectors");
    expect(markup).toContain("Sign in to discover public Sparkle Showcases and follow collectors you love.");
    expect(markup).toContain('href="/auth/sign-in"');
    expect(markup).not.toContain("Friend request");
    expect(markup).not.toContain("DM");
  });

  it("surfaces favorite rep controls across Silver, live shows, and the Dance Floor", () => {
    const silverMarkup = renderToStaticMarkup(renderSilverPageContent(getLocalDevAuthState("silver")));
    const liveShowsMarkup = renderToStaticMarkup(renderLiveShowsPageContent(finderLiveShowItems()));
    const repBoardsMarkup = renderToStaticMarkup(createElement(RepBoardsPage));

    expect(silverMarkup).toContain("Favorite Reps");
    expect(silverMarkup).toContain('href="/favorites"');
    expect(liveShowsMarkup).toContain('aria-label="Add rep to favorites"');
    expect(liveShowsMarkup).toContain("Favorite reps");
    expect(repBoardsMarkup).toContain('aria-label="Add rep to favorites"');
    expect(repBoardsMarkup).toContain("Favorite reps");
  });

  it("surfaces safe Nic-Nac prompts for favorite reps and public collectors", () => {
    const markup = renderToStaticMarkup(renderSilverPageContent(getLocalDevAuthState("silver")));

    expect(markup).toContain("Show my favorite reps");
    expect(markup).toContain("Find my favorite reps&#x27; next lives");
    expect(markup).toContain("Review public Showcase discovery");
    expect(markup).toContain("Review followed collector status");
    expect(markup).toContain("Search bounded public Showcase discovery with one-way follows and safety filters.");
    expect(markup).toContain("Review one-way followed collectors and their public Showcase status.");
    expect(markup).not.toContain("Find collectors with public Showcases like mine");
    expect(markup).not.toContain("Show followed collectors");
    expect(markup).toContain("dancer leads");
    expect(markup).not.toContain("buy from");
    expect(markup).not.toContain("message seller");
  });

  it("keeps favorite rep UI inside Sparkle Finder copy guardrails", () => {
    const markup = [
      renderToStaticMarkup(renderFavoritesPageContent(getLocalDevAuthState("silver"))),
      renderToStaticMarkup(renderLiveShowsPageContent(finderLiveShowItems())),
      renderToStaticMarkup(createElement(RepBoardsPage)),
    ].join(" ");

    expect(markup).not.toContain("Friend request");
    expect(markup).not.toContain("DM");
    expect(markup).not.toContain("Marketplace");
    expect(markup).not.toContain("Trade with this collector");
  });

  it("keeps favorite form persistence URLs separate from visible local hrefs", () => {
    const markup = renderToStaticMarkup(
      createElement(FavoriteRepsPanel, {
        cards: [
          {
            id: "favorite-rep-kelli",
            userId: "customer-silver-sparkle-mama",
            repId: "rep-kelli",
            repDisplayName: "Kelli Jo",
            repSiteUrl: "https://sparklesuite.example/reps/kelli",
            repBoardUrl: "https://sparklesuite.example/reps/kelli/board/moon-orbit",
            notes: "Great ring lives and easy Saturday rewatch.",
            notifyNextShow: true,
            createdAt: "2026-06-17T12:00:00.000Z",
            updatedAt: "2026-06-17T12:00:00.000Z",
            nextShowAt: "2026-06-17T20:00:00.000Z",
            nextShowTitle: "Moon Orbit Preview",
            boardItemCount: 1,
            isSilverEnhanced: true,
          },
        ],
        isSilver: true,
      }),
    );

    expect(markup).toContain('name="repSiteUrl" value="https://sparklesuite.example/reps/kelli"');
    expect(markup).toContain('name="repBoardUrl" value="https://sparklesuite.example/reps/kelli/board/moon-orbit"');
    expect(markup).toContain('href="/rep-boards?rep=kelli"');
    expect(markup).toContain('href="/rep-boards?listing=moon-orbit"');
  });

  it("preserves selected library filters and only shows matching records", () => {
    const markup = renderToStaticMarkup(
      renderLibraryPageContent(libraryFilterItems(), { q: "rose", type: "ring", label: "diamond" }),
    );

    expect(markup).toContain('value="rose"');
    expect(markup).toContain("Type: ring");
    expect(markup).toContain("Label: diamond");
    expect(markup).toContain(">Filters<");
    expect(markup).toContain("Rose Crown Ring");
    expect(markup).not.toContain("Ocean Pearl Necklace");
  });

  it("renders shared catalog collection and material filters from Sparkle Suite metadata", () => {
    const markup = renderToStaticMarkup(
      renderLibraryPageContent(libraryFilterItems(), {
        q: "",
        type: "all",
        label: "all",
        collection: "Garden Glow",
        material: "Rose gold",
      }, libraryFacetOptions()),
    );

    expect(markup).toContain(">Filters<");
    expect(markup).toContain("Collections");
    expect(markup).toContain("Garden Glow");
    expect(markup).toContain("Materials");
    expect(markup).toContain("Rose gold");
    expect(markup).toContain("Rose Crown Ring");
    expect(markup).not.toContain("Ocean Pearl Necklace");
  });

  it("renders searchable dynamic facets, stones, active chips, and Nic-Nac search help", () => {
    const markup = renderToStaticMarkup(
      renderLibraryPageContent(libraryFilterItems(), {
        q: "rose",
        type: "ring",
        label: "diamond",
        collection: "Garden Glow",
        material: "Rose gold",
        stone: "Pink opal",
        year: "2026",
      }, libraryFacetOptions()),
    );

    expect(markup).toContain("Not sure what it is called?");
    expect(markup).toContain("Ask Nic-Nac");
    expect(markup).not.toContain("Need help hunting?");
    expect(markup).not.toContain("bg-[#fff8e6]");
    expect(markup).toContain("Selected filters");
    expect(markup).toContain("Pink opal");
    expect(markup).toContain("Stone / gem");
    expect(markup).toContain("Search collections");
    expect(markup).toContain("Search stones");
    expect(markup).toContain("Garden Glow");
    expect(markup).toContain("Rose gold");
    expect(markup).toContain("2026");
    expect(markup).toContain('href="/library?');
    expect(markup).not.toContain("Pearl");
  });

  it("uses authoritative cursor metadata even when a page is shorter than the requested limit", () => {
    const items = Array.from({ length: 3 }, (_, index): JewelryItem => ({
      id: `design-load-more-${index}`,
      name: `Ruby Glow Ring ${index}`,
      collectionName: "Garden Glow",
      collectionYear: 2026,
      jewelryType: "ring",
      material: "Rose gold",
      mainStone: "Pink opal",
      imageUrl: "",
      bpLabel: "diamond",
      itemNumber: `RG-LM-${index}`,
      availableListingCount: 1,
      knownRepListingIds: [],
    }));
    const filters = {
      q: "ruby glow",
      type: "ring" as const,
      label: "diamond" as const,
      collection: "Garden Glow",
      material: "Rose gold",
      stone: "Pink opal",
      year: "2026",
      cursor: "current-page",
    };

    const markup = renderToStaticMarkup(
      renderLibraryPageContent(items, filters, libraryFacetOptions(), supportedCatalogPage(items, {
        totalCount: 73,
        hasMore: true,
        nextCursor: "opaque+/= next page",
      })),
    );

    expect(markup).toContain("3 pieces on this page · 73 total matching pieces");
    expect(markup).toContain("Next page");
    expect(markup).toContain("cursor=opaque%2B%2F%3D+next+page");
    expect(markup).toContain("q=ruby+glow");
    expect(markup).toContain("type=ring");
    expect(markup).toContain("collection=Garden+Glow");
    expect(markup).toContain("material=Rose+gold");
    expect(markup).toContain("stone=Pink+opal");
    expect(markup).toContain("label=diamond");
    expect(markup).toContain("year=2026");
    expect(markup).not.toContain("limit=");
  });

  it("hides continuation when authoritative metadata says a full page is complete", () => {
    const items = Array.from({ length: 24 }, (_, index): JewelryItem => ({
      id: `design-complete-${index}`,
      name: `Complete Ring ${index}`,
      collectionName: "Garden Glow",
      collectionYear: 2026,
      jewelryType: "ring",
      material: "Rose gold",
      mainStone: "Pink opal",
      imageUrl: "",
      bpLabel: "standard",
      itemNumber: `RG-DONE-${index}`,
      availableListingCount: 1,
      knownRepListingIds: [],
    }));

    const markup = renderToStaticMarkup(
      renderLibraryPageContent(items, undefined, undefined, supportedCatalogPage(items, {
        totalCount: 24,
        hasMore: false,
        nextCursor: null,
      })),
    );

    expect(markup).toContain("24 pieces on this page · 24 total matching pieces");
    expect(markup).not.toContain("Next page");
    expect(markup).not.toContain("Load more pieces");
  });

  it("shows legacy catalog results as explicitly partial without inventing continuation", () => {
    const items = libraryFilterItems();
    const pageResult: CatalogPageReadResult = {
      status: "success",
      pagination: "unsupported",
      items: items.map((item) => ({ ...item, description: null })),
    };

    const markup = renderToStaticMarkup(
      renderLibraryPageContent(items, undefined, undefined, pageResult),
    );

    expect(markup).toContain("The Jewelry Library may have more pieces than this page can show.");
    expect(markup).toContain("these results are partial");
    expect(markup).not.toContain("Next page");
    expect(markup).not.toContain("Showing 2 of");
  });

  it("treats a successful Suite page as authoritative instead of filtering it a second time", () => {
    const items = [{
      ...libraryFilterItems()[0],
      id: "design-authoritative",
      collectionName: "Garden Glow",
    }];
    const markup = renderToStaticMarkup(
      renderLibraryPageContent(
        items,
        {
          q: "",
          type: "all",
          label: "all",
          collection: "Garden",
          cursor: "",
        },
        libraryFacetOptions(),
        supportedCatalogPage(items, { totalCount: 1, hasMore: false, nextCursor: null }),
      ),
    );

    expect(markup).toContain("design-authoritative");
    expect(markup).not.toContain("No library records match those filters.");
  });

  it("reports unavailable facets instead of inferring options from the current page", () => {
    const items = libraryFilterItems();
    const markup = renderToStaticMarkup(
      renderLibraryPageContent(
        items,
        undefined,
        {
          collections: [],
          materials: [],
          stones: [],
          types: [],
          labels: [],
          years: [],
        },
        supportedCatalogPage(items, { totalCount: 12, hasMore: true, nextCursor: "page-2" }),
        false,
      ),
    );

    expect(markup).toContain("Filter options are temporarily unavailable.");
    expect(markup).toContain("no catalog options were inferred from this page");
    expect(markup).not.toContain("Search collections");
  });

  it("clears the opaque cursor from search and facet changes", () => {
    const markup = renderToStaticMarkup(
      renderLibraryPageContent(libraryFilterItems(), {
        q: "rose",
        type: "ring",
        label: "diamond",
        collection: "Garden Glow",
        cursor: "stale-page-cursor",
      }, libraryFacetOptions()),
    );

    expect(markup).not.toContain('name="cursor"');
    expect(markup).not.toContain("cursor=stale-page-cursor");
  });

  it("renders same-item variants as distinct exact-design cards", () => {
    const items: JewelryItem[] = [
      {
        id: "design-rose-quartz",
        name: "Baguette Braid Sparkle",
        collectionName: "July Birthday 2026",
        collectionYear: 2026,
        jewelryType: "earrings",
        material: "Rhodium Plating",
        mainStone: "Rose Quartz Cubic Zirconia",
        imageUrl: "https://cdn.example.test/rose-quartz.png",
        bpLabel: "standard",
        itemNumber: "ER59000",
        availableListingCount: 1,
        knownRepListingIds: [],
      },
      {
        id: "design-ruby",
        name: "Baguette Braid Sparkle",
        collectionName: "July Birthday 2026",
        collectionYear: 2026,
        jewelryType: "earrings",
        material: "Rhodium Plating",
        mainStone: "Lab-Created Ruby",
        imageUrl: "https://cdn.example.test/ruby.png",
        bpLabel: "standard",
        itemNumber: "ER59000",
        availableListingCount: 1,
        knownRepListingIds: [],
      },
    ];

    const markup = renderToStaticMarkup(renderLibraryPageContent(items));

    expect(markup).toContain('data-design-id="design-rose-quartz"');
    expect(markup).toContain('data-design-id="design-ruby"');
    expect(markup).toContain('href="/library/design-rose-quartz"');
    expect(markup).toContain('href="/library/design-ruby"');
    expect(markup).toContain("Rose Quartz Cubic Zirconia");
    expect(markup).toContain("Lab-Created Ruby");
    expect(markup.match(/Item ER59000/g)).toHaveLength(2);
    expect(markup).toContain("text-xs font-black uppercase tracking-[0.08em] text-[var(--sparkle-ink-muted)]");
    expect(markup).not.toContain("text-[0.66rem] font-black uppercase tracking-[0.1em] text-[var(--sparkle-coral)]");
  });

  it("matches library searches by collection year", () => {
    const markup = renderToStaticMarkup(
      renderLibraryPageContent(libraryFilterItems(), { q: "2026", type: "necklace", label: "diamond" }),
    );

    expect(markup).toContain("Ocean Pearl Necklace");
    expect(markup).not.toContain("Rose Crown Ring");
    expect(markup).not.toContain("No library records match those filters.");
  });

  it("shows an empty library state when no records match selected filters", () => {
    const markup = renderToStaticMarkup(
      renderLibraryPageContent(libraryFilterItems(), { q: "ocean", type: "necklace", label: "standard" }),
    );

    expect(markup).toContain("No library records match those filters.");
    expect(markup).not.toContain("Rose Crown Ring");
    expect(markup).not.toContain("Ocean Pearl Necklace");
  });

  it("shows a no-match library state when a search query returns no catalog records", () => {
    const markup = renderToStaticMarkup(
      renderLibraryPageContent([], { q: "rose", type: "all", label: "all" }),
    );

    expect(markup).toContain("No library records match those filters.");
    expect(markup).not.toContain("The shared Sparkle Suite jewelry catalog is not available");
  });

  it("shows availability and optional catalog metadata on library cards", () => {
    const items: JewelryItem[] = [
      {
        id: "design-available",
        name: "Garden Gala Bracelet",
        collectionName: "Garden Gala",
        collectionYear: 2026,
        jewelryType: "bracelet",
        imageUrl: "",
        bpLabel: "standard",
        itemNumber: "BR1001",
        knownRepListingIds: [],
        searchTags: ["rose gold", "garden"],
      availableListingCount: 2,
      availableLeadCount: 2,
      availableDancerCount: 5,
      },
    ];

    const markup = renderToStaticMarkup(renderLibraryPageContent(items));

    expect(markup).toContain("2 rep leads · 5 dancers available");
    expect(markup).toContain("2026");
    expect(markup).toContain("rose gold");
  });

  it("shows known lead counts without inventing dancer quantities", () => {
    const singularItems: JewelryItem[] = [
      {
        id: "design-known-lead",
        name: "Garden Gala Ring",
        collectionName: "Garden Gala",
        jewelryType: "ring",
        imageUrl: "",
        bpLabel: "standard",
        itemNumber: "RG1001",
        knownRepListingIds: ["lead-1"],
      },
    ];
    const pluralItems: JewelryItem[] = [
      {
        id: "design-known-leads",
        name: "Garden Gala Necklace",
        collectionName: "Garden Gala",
        jewelryType: "necklace",
        imageUrl: "",
        bpLabel: "standard",
        itemNumber: "NK1001",
        knownRepListingIds: ["lead-1", "lead-2"],
      },
    ];

    const singularMarkup = renderToStaticMarkup(renderLibraryPageContent(singularItems));
    const pluralMarkup = renderToStaticMarkup(renderLibraryPageContent(pluralItems));

    expect(singularMarkup).toContain("1 rep lead · dancer quantity unavailable");
    expect(singularMarkup).not.toContain("No dancers right now");
    expect(pluralMarkup).toContain("2 rep leads · dancer quantity unavailable");
    expect(pluralMarkup).not.toContain("No dancers right now");
  });

  it("shows availability unknown when library card counts and known leads are missing", () => {
    const items: JewelryItem[] = [
      {
        id: "design-unknown",
        name: "Garden Gala Earrings",
        collectionName: "Garden Gala",
        jewelryType: "earrings",
        imageUrl: "",
        bpLabel: "standard",
        itemNumber: "ER1001",
        knownRepListingIds: [],
      },
    ];

    const markup = renderToStaticMarkup(renderLibraryPageContent(items));

    expect(markup).toContain("Dancer availability unknown");
    expect(markup).not.toContain("No dancers right now");
  });

  it("renders library card photos with a locked smart crop that favors the jewelry", () => {
    const markup = renderToStaticMarkup(
      createElement(JewelryCard, {
        item: {
          id: "bp-necklace-piper",
          name: "The Piper Necklace",
          collectionName: "July Birthday",
          collectionYear: 2026,
          jewelryType: "necklace",
          material: "Rhodium Plating",
          mainStone: "Lab-Created Ruby",
          bpMsrp: 39.95,
          imageUrl: "https://cdn.example.test/piper-necklace.jpg",
          bpLabel: "standard",
          itemNumber: "NK1234",
          searchTags: ["necklace", "ruby"],
          availableListingCount: 0,
          knownRepListingIds: [],
        },
      }),
    );

    expect(markup).toContain('data-photo-fit="smart-crop"');
    expect(markup).toContain("absolute inset-0 h-full w-full object-cover");
    expect(markup).toContain("object-position:center 78%");
    expect(markup).toContain("min-h-0");
    expect(markup).toContain("min-w-0");
    expect(markup).toContain("overflow-hidden");
    expect(markup).not.toContain("object-contain");
    expect(markup).not.toContain("bg-cover");
  });

  it("renders showcase piece photos through the same smart jewelry frame", () => {
    const markup = renderToStaticMarkup(
      createElement(PieceImage, {
        piece: {
          id: "owned-piper",
          customerId: "customer-1",
          jewelryItemId: "bp-necklace-piper",
          state: "owned",
          note: "",
          isHighlighted: true,
          visibility: "public",
          showcaseStatus: "owned",
          revealStory: "Found it at last.",
          personalPhotoUrl: "https://cdn.example.test/personal-piper.jpg",
          isRarestReveal: true,
          jewelryItem: {
            id: "bp-necklace-piper",
            name: "The Piper Necklace",
            collectionName: "July Birthday",
            collectionYear: 2026,
            jewelryType: "necklace",
            material: "Rhodium Plating",
            mainStone: "Lab-Created Ruby",
            bpMsrp: 39.95,
            imageUrl: "https://cdn.example.test/piper-necklace.jpg",
            bpLabel: "standard",
            itemNumber: "NK1234",
            searchTags: ["necklace", "ruby"],
            availableListingCount: 0,
            knownRepListingIds: [],
          },
        },
      }),
    );

    expect(markup).toContain('src="https://cdn.example.test/personal-piper.jpg"');
    expect(markup).toContain('data-photo-fit="smart-crop"');
    expect(markup).toContain("absolute inset-0 h-full w-full object-cover");
    expect(markup).toContain("object-position:center 78%");
    expect(markup).not.toContain("bg-cover");
  });

  it("renders the item detail route with dancer leads and focused Nic-Nac CTA", () => {
    const markup = renderToStaticMarkup(
      renderItemDetailPageContent({ itemId: "jewel-rainbow-crown-ring" }, getLocalDevAuthState("silver")),
    );

    expect(markup).toContain("Rainbow Crown Ring");
    expect(markup).toContain("Sierra Sparkle Studio");
    expect(markup).toContain(">Nic-Nac</h2>");
    expect(markup).toContain("finder-nic-nac-chatbot");
    expect(markup).toContain("Exact dancer lead");
    expect(markup).toContain("/rep-boards?listing=rainbow-crown");
    expect(markup).not.toContain("sparklesuite.example");
  });

  it("gives Showcase lead cards explicit fixture quantities and an exact-design continuation", () => {
    const piece: SparkleShowcasePiece = {
      id: "showcase-rainbow-crown",
      customerId: "customer-1",
      jewelryItemId: "jewel-rainbow-crown-ring",
      state: "wishlist",
      note: "",
      isHighlighted: false,
      visibility: "public",
      showcaseStatus: "wishlist",
      revealStory: "Still hunting.",
      isRarestReveal: false,
      jewelryItem: {
        id: "jewel-rainbow-crown-ring",
        name: "Rainbow Crown Ring",
        collectionName: "Rainbow Royale",
        jewelryType: "ring",
        imageUrl: "",
        bpLabel: "standard",
        itemNumber: "RG-RAINBOW",
        knownRepListingIds: [],
      },
    };

    const markup = renderToStaticMarkup(createElement(RepLeadPanel, { piece }));

    expect(markup).toContain("rep lead");
    expect(markup).toContain("dancer available");
    expect(markup).toContain("Preview leads count as one dancer each");
    expect(markup).toContain('data-design-id="jewel-rainbow-crown-ring"');
    expect(markup).toContain('data-design-id="jewel-starlit-crown-ring"');
    expect(markup).toContain("Similar design: Starlit Halo Ring");
    expect(markup).toContain('href="/library/jewel-rainbow-crown-ring"');
    expect(markup).toContain("See all dancer leads");
  });

  it("renders API-backed item detail availability with KISS rep site links", () => {
    const apiItem: JewelryItem = {
      id: "design-api",
      name: "API Garden Gala Ring",
      collectionName: "Garden Gala",
      collectionYear: 2026,
      jewelryType: "ring",
      imageUrl: "",
      bpLabel: "standard",
      itemNumber: "RG-API",
      knownRepListingIds: [],
      searchTags: ["garden"],
      availableListingCount: 1,
    };
    const availability: FinderAvailabilityResult = {
      schemaVersion: 2,
      requestedItem: apiItem,
      exactMatches: [
        {
          listingId: "listing-api",
          listedAt: null,
          photoUrl: "https://cdn.example.test/listing-api.jpg",
          photoSource: "listing",
          quantityAvailable: 2,
          item: apiItem,
          showName: "Demo Glow Show",
          repFirstName: "Demo",
          customerSiteUrl: "https://www.yoursparklesuite.com/demo-show?c=rep-demo",
          nextShow: {
            showId: "show-demo",
            showName: "Demo Glow Show",
            repFirstName: "Demo",
            startsAt: "2026-06-06T20:00:00.000Z",
            status: "scheduled",
            customerSiteUrl: "https://www.yoursparklesuite.com/demo-show?c=rep-demo",
          },
        },
      ],
      similarMatches: [
        {
          listingId: "listing-similar",
          listedAt: null,
          photoUrl: "https://cdn.example.test/listing-similar.jpg",
          photoSource: "listing",
          quantityAvailable: 3,
          item: {
            ...apiItem,
            id: "design-similar",
            name: "Similar Garden Gala Ring",
            imageUrl: "https://cdn.example.test/similar-canonical.jpg",
          },
          showName: "Similar Glow Show",
          repFirstName: "Sally",
          customerSiteUrl: "https://www.yoursparklesuite.com/similar-show?c=rep-similar",
          nextShow: {
            showId: "show-similar",
            showName: "Similar Glow Show",
            repFirstName: "Sally",
            startsAt: "2026-06-07T20:00:00.000Z",
            status: "scheduled",
            customerSiteUrl: "https://www.yoursparklesuite.com/similar-show?c=rep-similar",
          },
        },
      ],
      exactPageInfo: {
        totalLeadCount: 13,
        totalDancerCount: 21,
        hasMore: true,
        nextCursor: "exact+/= next",
      },
      similarPageInfo: {
        totalLeadCount: 5,
        totalDancerCount: 9,
        hasMore: true,
        nextCursor: "similar+/= next",
      },
    };

    const markup = renderToStaticMarkup(
      renderItemDetailPageContent(
        { itemId: "design-api" },
        getLocalDevAuthState("silver"),
        apiItem,
        availability,
        { exactCursor: "current exact", similarCursor: "current similar" },
        false,
      ),
    );

    expect(markup).toContain("https://www.yoursparklesuite.com/demo-show?c=rep-demo");
    expect(markup).toContain("Demo Glow Show");
    expect(markup).toContain("Rep: Demo");
    expect(markup).toContain("Visit Rep Site");
    expect(markup).toContain("18 rep leads · 30 dancers available");
    expect(markup).toContain("2 dancers available");
    expect(markup).toContain("3 dancers available");
    expect(markup.match(/data-smoke="dancer-lead-card"/g)).toHaveLength(2);
    expect(markup).toContain('data-design-id="design-api"');
    expect(markup).toContain('data-design-id="design-similar"');
    expect(markup).toContain('src="https://cdn.example.test/listing-api.jpg"');
    expect(markup).toContain('src="https://cdn.example.test/listing-similar.jpg"');
    expect(markup).not.toContain('src="https://cdn.example.test/similar-canonical.jpg"');
    expect(markup.match(/data-photo-role="listing"/g)).toHaveLength(2);
    expect(markup).toContain("Similar design: Similar Garden Gala Ring · Item RG-API");
    expect(markup).toContain("exactCursor=exact%2B%2F%3D+next&amp;similarCursor=current+similar");
    expect(markup).toContain("exactCursor=current+exact&amp;similarCursor=similar%2B%2F%3D+next");
    expect(markup).toContain("#known-dancer-leads");
    expect(markup).toContain("Next page of exact leads");
    expect(markup).toContain("Next page of similar leads");
    expect(markup).not.toContain("Open Dance Floor");

    const terminalMarkup = renderToStaticMarkup(
      renderItemDetailPageContent(
        { itemId: "design-api" },
        getLocalDevAuthState("silver"),
        apiItem,
        {
          ...availability,
          exactPageInfo: { ...availability.exactPageInfo, hasMore: false, nextCursor: null },
          similarPageInfo: { ...availability.similarPageInfo, hasMore: false, nextCursor: null },
        },
        { exactCursor: "final exact", similarCursor: "final similar" },
        false,
      ),
    );
    expect(terminalMarkup.match(/This is the final page\./g)).toHaveLength(2);
    expect(terminalMarkup).toContain("This page shows 1 rep lead and 2 dancers available");
    expect(terminalMarkup).not.toContain("Next page of exact leads");
  });

  it("labels canonical availability fallbacks as catalog photos instead of listing photos", () => {
    const apiItem: JewelryItem = {
      id: "design-canonical-photo",
      name: "Canonical Photo Ring",
      collectionName: "Garden Gala",
      jewelryType: "ring",
      imageUrl: "https://cdn.example.test/design-canonical-photo.jpg",
      bpLabel: "standard",
      itemNumber: "RG-CANONICAL",
      knownRepListingIds: [],
    };
    const availability: FinderAvailabilityResult = {
      schemaVersion: 2,
      requestedItem: apiItem,
      exactMatches: [{
        listingId: "canonical-photo-lead",
        listedAt: null,
        photoUrl: apiItem.imageUrl,
        photoSource: "canonical",
        quantityAvailable: 1,
        item: apiItem,
        showName: "Canonical Glow Show",
        repFirstName: "Casey",
        customerSiteUrl: "https://www.yoursparklesuite.com/canonical",
        nextShow: {
          showId: "canonical-show",
          showName: "Canonical Glow Show",
          repFirstName: "Casey",
          startsAt: "2026-06-07T20:00:00.000Z",
          status: "scheduled",
          customerSiteUrl: "https://www.yoursparklesuite.com/canonical",
        },
      }],
      similarMatches: [],
      exactPageInfo: { totalLeadCount: 1, totalDancerCount: 1, hasMore: false, nextCursor: null },
      similarPageInfo: { totalLeadCount: 0, totalDancerCount: 0, hasMore: false, nextCursor: null },
    };

    const markup = renderToStaticMarkup(
      renderItemDetailPageContent(
        { itemId: apiItem.id },
        getLocalDevAuthState("silver"),
        apiItem,
        availability,
        undefined,
        false,
      ),
    );

    expect(markup).toContain('data-photo-role="canonical"');
    expect(markup).toContain('alt="Canonical Photo Ring catalog photo"');
    expect(markup).not.toContain("listing photo from Casey");
  });

  it("passes independent item-detail search cursors to the availability adapter", async () => {
    const apiItem = {
      id: "design-cursor-wiring",
      name: "Cursor Wiring Ring",
      collectionName: "Garden Gala",
      collectionYear: 2026,
      jewelryType: "ring" as const,
      material: "Gold",
      mainStone: "Ruby",
      description: null,
      bpMsrp: 19.95,
      imageUrl: "",
      bpLabel: "standard" as const,
      itemNumber: "RBP5902",
      searchTags: [],
      availableListingCount: 0,
      availableLeadCount: 0,
      availableDancerCount: 0,
      knownRepListingIds: [],
    };
    const availability: FinderAvailabilityResult = {
      schemaVersion: 2,
      requestedItem: apiItem,
      exactMatches: [],
      similarMatches: [],
      exactPageInfo: { totalLeadCount: 0, totalDancerCount: 0, hasMore: false, nextCursor: null },
      similarPageInfo: { totalLeadCount: 0, totalDancerCount: 0, hasMore: false, nextCursor: null },
    };
    cookiesMock.mockResolvedValue({ get: () => undefined });
    vi.spyOn(accountService, "getCurrentSparkleFinderAccount").mockResolvedValue(getLocalDevAuthState("silver"));
    vi.spyOn(catalogService, "getCatalogJewelryItemById").mockResolvedValue(apiItem);
    const availabilitySpy = vi
      .spyOn(catalogService, "getFinderAvailabilityForJewelryItem")
      .mockResolvedValue(availability);

    const page = await ItemDetailPage({
      params: Promise.resolve({ itemId: apiItem.id }),
      searchParams: Promise.resolve({
        exactCursor: [" exact page two ", "ignored duplicate"],
        similarCursor: " similar page three ",
      }),
    });
    renderToStaticMarkup(page);

    expect(availabilitySpy).toHaveBeenCalledWith(apiItem.id, expect.objectContaining({
      exactCursor: "exact page two",
      similarCursor: "similar page three",
    }));
  });

  it("fails closed when an availability row has zero or malformed dancer quantity", () => {
    const apiItem: JewelryItem = {
      id: "design-zero",
      name: "Zero Quantity Ring",
      collectionName: "Garden Gala",
      jewelryType: "ring",
      imageUrl: "https://cdn.example.test/design-zero.jpg",
      bpLabel: "standard",
      itemNumber: "RG-ZERO",
      knownRepListingIds: [],
    };
    const invalidAvailability = {
      schemaVersion: 2,
      requestedItem: apiItem,
      exactMatches: [{
        listingId: "zero-listing",
        listedAt: null,
        photoUrl: "https://cdn.example.test/zero-listing.jpg",
        quantityAvailable: 0,
        item: apiItem,
        showName: "Zero Show",
        repFirstName: "Zero",
        customerSiteUrl: "https://www.yoursparklesuite.com/zero",
        nextShow: {
          showId: "zero-show",
          showName: "Zero Show",
          repFirstName: "Zero",
          startsAt: "2026-06-07T20:00:00.000Z",
          status: "scheduled",
          customerSiteUrl: "https://www.yoursparklesuite.com/zero",
        },
      }],
      similarMatches: [],
      exactPageInfo: { totalLeadCount: 1, totalDancerCount: 1, hasMore: false, nextCursor: null },
      similarPageInfo: { totalLeadCount: 0, totalDancerCount: 0, hasMore: false, nextCursor: null },
    } as FinderAvailabilityResult;

    const markup = renderToStaticMarkup(
      renderItemDetailPageContent(
        { itemId: apiItem.id },
        getLocalDevAuthState("silver"),
        apiItem,
        invalidAvailability,
        undefined,
        false,
      ),
    );

    expect(markup).toContain("could not be read safely");
    expect(markup).not.toContain("zero-listing");
    expect(markup).not.toContain("zero-listing.jpg");
    expect(markup).not.toContain("0 dancers available");
  });

  it("shows a truthful temporary state when production availability is unavailable", () => {
    const apiItem: JewelryItem = {
      id: "design-unavailable",
      name: "Unavailable Ring",
      collectionName: "Garden Gala",
      jewelryType: "ring",
      imageUrl: "",
      bpLabel: "standard",
      itemNumber: "RG-OFFLINE",
      knownRepListingIds: [],
    };

    const markup = renderToStaticMarkup(
      renderItemDetailPageContent(
        { itemId: apiItem.id },
        getLocalDevAuthState("silver"),
        apiItem,
        undefined,
        undefined,
        false,
      ),
    );

    expect(markup).toContain("Dancer availability is temporarily unavailable");
    expect(markup).not.toContain("No dancer leads yet");
  });

  it("renders library detail photos with full-photo framing", () => {
    const markup = renderToStaticMarkup(
      renderItemDetailPageContent(
        { itemId: "bp-necklace-piper" },
        getLocalDevAuthState("silver"),
        {
          id: "bp-necklace-piper",
          name: "The Piper Necklace",
          collectionName: "July Birthday",
          collectionYear: 2026,
          jewelryType: "necklace",
          material: "Rhodium Plating",
          mainStone: "Lab-Created Ruby",
          bpMsrp: 39.95,
          imageUrl: "https://cdn.example.test/piper-necklace.jpg",
          bpLabel: "standard",
          itemNumber: "NK1234",
          searchTags: ["necklace", "ruby"],
          availableListingCount: 0,
          knownRepListingIds: [],
        },
      ),
    );

    expect(markup).toContain("object-contain");
    expect(markup).toContain("object-position:center 58%");
    expect(markup).toContain('data-photo-fit="full-photo"');
    expect(markup).not.toContain("bg-cover");
  });

  it("renders the item detail Silver prompt for Free customers", () => {
    const markup = renderToStaticMarkup(
      renderItemDetailPageContent({ itemId: "jewel-rainbow-crown-ring" }, getLocalDevAuthState("free")),
    );

    expect(markup).toContain(">Nic-Nac</h2>");
    expect(markup).toContain("Show timing context");
    expect(markup).not.toContain("Browse for free. Let Nic-Nac hunt for you with Silver.");
    expect(markup).not.toContain("Nic-Nac found a fresh dancer lead");
    expect(markup).not.toContain("Next show");
  });

  it("uses App Router notFound behavior for unknown library records", () => {
    expect(() =>
      renderToStaticMarkup(renderItemDetailPageContent({ itemId: "jewel-missing" }, getLocalDevAuthState("silver"))),
    ).toThrow();
  });

  it("renders Dance Floor dancers without customer action controls", () => {
    const markup = renderToStaticMarkup(createElement(RepBoardsPage));

    expect(markup).toContain("Dance Floor");
    expect(markup).toContain("Dancer available");
    expect(markup).toContain("Sierra Sparkle Studio");
    expect(markup).toContain("/rep-boards?listing=rainbow-crown");
    expect(markup).not.toContain("Offer Item");
    expect(markup).not.toContain("Swap With Customer");
    expect(markup).not.toContain("Post Message");
    expect(markup).not.toContain('href="https://sparklesuite.example');
  });

  it("renders live show route content from Finder API-shaped data", () => {
    const markup = renderToStaticMarkup(renderLiveShowsPageContent(finderLiveShowItems()));

    expect(markup).toContain("Master Live Calendar");
    expect(markup).toContain("Demo Glow Show");
    expect(markup).toContain("Rep: Demo");
    expect(markup).toContain("Visit Rep Site");
  });

  it("renders the public photo setup route with a plain light-box resource link", () => {
    const markup = renderToStaticMarkup(createElement(PhotoSetupPage));

    expect(markup).toContain("Sparkle Finder public navigation");
    expect(markup).toContain("Photo setup for jewelry uploads");
    expect(markup).toContain("you do not need this exact one");
    expect(markup).toContain("Any clean, well-lit light box can work.");
    expect(markup).toContain('href="https://www.amazon.com/dp/B0C7Z93NPR"');
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noopener noreferrer"');
    expect(markup).not.toContain("commission");
    expect(markup).not.toContain("paid link");
    expect(markup).not.toContain("Affiliate Disclosure");
    expect(markup).not.toContain("Amazon Associate");
    expect(markup).not.toContain('rel="sponsored');
  });

  it("keeps photo setup publicly reachable without the anonymous hub sign-in wall", () => {
    const markup = renderToStaticMarkup(createElement(PhotoSetupPage));

    expect(markup).not.toContain("Create a free Sparkle Finder account to open this tool.");
    expect(markup).not.toContain("Sign in to open Sparkle Finder");
    expect(markup).toContain("Plain resource link");
    expect(markup).toContain("not an advertisement or storefront");
  });

  it("keeps the homepage photo setup card aligned to the new guidance route", async () => {
    const { DiscoveryCards } = await import("../../components/home/DiscoveryCards");
    const markup = renderToStaticMarkup(createElement(DiscoveryCards));

    expect(markup).toContain("Photo Setup Guide");
    expect(markup).toContain("Prep clean light-box photos for Showcase Studio review.");
    expect(markup).toContain('href="/photo-setup"');
    expect(markup).not.toContain('href="/shop"');
    expect(markup).not.toContain("Diamonds &amp; Unicorns Library");
  });

  it("renders photo setup content without affiliate or shop positioning", () => {
    const markup = renderToStaticMarkup(renderPhotoSetupPageContent());

    expect(markup).toContain("What Nic-Nac needs to see");
    expect(markup).toContain("The goal is a reviewable record, not a professional product shoot.");
    expect(markup).not.toContain("Shop");
    expect(markup).not.toContain("Affiliate");
    expect(markup).not.toContain("Amazon Associate");
  });

  it("renders Silver profile and a Nic-Nac-first curator workspace for Silver customers", () => {
    const markup = renderToStaticMarkup(renderSilverPageContent(getLocalDevAuthState("silver")));

    expect(markup).toContain("Sparkle Mama&#x27;s Sparkle Showcase");
    expect(markup).toContain("Nic-Nac Collection Curator");
    expect(markup).toContain('id="showcase-studio"');
    expect(markup).toContain("Tell Nic-Nac what you want to add, find, or update");
    expect(markup).toContain("Add a piece I own");
    expect(markup).toContain("I am looking for a piece");
    expect(markup).toContain("Upload a missing piece");
    expect(markup).toContain("Favorite reps");
    expect(markup).toContain("Nic-Nac remembers");
    expect(markup).toContain('data-smoke="profile-summary-card"');
    expect(markup).toContain("Your Showcase");
    expect(markup).toContain("Edit Profile");
    expect(markup).toContain("Sparkle Mama");
    expect(markup).toContain('data-smoke="simple-silver-showcase"');
    expect(markup).toContain("Wishlist &amp; Collection");
    expect(markup).toContain("Rainbow Crown Ring");
    expect(markup).toContain("Add to Wishlist");
    expect(markup).toContain("I Own This");
    expect(markup).toContain("Help Me Find It");
    expect(markup).not.toContain('id="add-to-sparkle-showcase"');
    expect(markup).not.toContain(">Library actions<");
    expect(markup).not.toContain(">Add to Sparkle Showcase<");
    expect(markup).not.toContain("Advanced profile and Showcase controls");
    expect(markup).not.toContain("Owner tools");
    expect(markup).not.toContain('data-smoke="profile-editor-card"');
    expect(markup).not.toContain("Save profile");
    expect(markup).not.toContain("Showcase Studio ready");
    expect(markup).not.toContain("Profile photo URL");
    expect(markup).not.toContain('placeholder="https://..."');
    expect(markup).not.toContain("Silver Space");
    expect(markup).not.toContain("Catalog actions");
    expect(markup).not.toContain("Future catalog request path");
  });

  it("renders the active Studio form and exact ambiguity candidates without choosing one", () => {
    const markup = renderToStaticMarkup(createElement(ShowcaseStudioIntakePanel, {
      accountId: "customer-studio-test",
      canSubmit: true,
      initialState: {
        ...initialShowcaseStudioPanelActionState,
        status: "needs_confirmation",
        message: "Choose the exact design.",
        submissionId: "11111111-1111-4111-8111-111111111111",
        candidates: [
          {
            designId: "design-rose-quartz",
            itemNumber: "RBP5902",
            designName: "Rose Quartz Starlight Ring",
            material: "Rose gold",
            mainStone: "Rose Quartz",
            jewelryType: "ring",
            collectionName: "Starlight",
            collectionYear: 2026,
            canonicalPhotoUrl: "https://cdn.example.test/rose-quartz.jpg",
            description: "Soft pink center stone.",
          },
          {
            designId: "design-ruby",
            itemNumber: "RBP5902",
            designName: "Ruby Starlight Ring",
            material: "Rhodium",
            mainStone: "Ruby",
            jewelryType: "ring",
            collectionName: "Starlight",
            collectionYear: 2026,
            canonicalPhotoUrl: "https://cdn.example.test/ruby.jpg",
            description: "Deep red center stone.",
          },
        ],
      },
    }));

    expect(markup).toContain('data-smoke="showcase-studio-intake"');
    expect(markup).toContain('name="originalLabelPhoto"');
    expect(markup).toContain('name="jewelryFrontPhoto"');
    expect(markup).toContain('name="itemNumber"');
    expect(markup).toContain('name="mainStone"');
    expect(markup).toContain('name="material"');
    expect(markup).toContain('name="customerNote"');
    expect(markup).toContain("RBP5902");
    expect(markup).toContain("Rose Quartz Starlight Ring");
    expect(markup).toContain("Ruby Starlight Ring");
    expect(markup).toContain('value="design-rose-quartz"');
    expect(markup).toContain('value="design-ruby"');
    expect(markup).not.toContain('type="radio" checked=""');
    expect(markup).toContain('data-design-id="design-rose-quartz"');
    expect(markup).toContain('data-design-id="design-ruby"');
    expect(markup).toContain("Confirm exact design");
  });

  it("blocks a terminal Studio request from resubmitting until the customer starts fresh", () => {
    const markup = renderToStaticMarkup(createElement(ShowcaseStudioIntakePanel, {
      accountId: "customer-studio-test",
      canSubmit: true,
      submitAction: async (state) => state,
      initialState: {
        ...initialShowcaseStudioPanelActionState,
        status: "error",
        message: "This request is not safe to retry.",
        submissionId: "11111111-1111-4111-8111-111111111111",
      },
    }));

    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>[^<]*(?:<[^>]+>)*Send to Showcase Studio/);
    expect(markup).toContain("Start a fresh Studio request");
  });

  it("renders real Silver account profile details without local fixture page copy", () => {
    const accountState: CurrentSparkleFinderAccountState = {
      status: "authenticated",
      tier: "silver",
      displayName: "Casey Collector",
      email: "casey@example.com",
      customer: {
        id: "user-123",
        displayName: "Casey Collector",
        email: "casey@example.com",
        state: "PA",
        tier: "silver",
      },
      communicationConsent: {
        accountEmailRequired: true,
        accountSmsAllowed: true,
        promotionalEmailOptIn: false,
        promotionalSmsOptIn: false,
        accountSmsConsentedAt: "2026-05-31T12:00:00.000Z",
        promotionalEmailConsentedAt: null,
        promotionalSmsConsentedAt: null,
        privacyAcknowledgedAt: "2026-05-31T00:00:00.000Z",
      },
      silverProfile: {
        customerId: "user-123",
        photoUrl: "",
        tiktokHandle: "@caseyfinds",
        bio: "Looking for jewel tones and unicorns.",
        visibility: "sparkle_finder",
      },
    };

    const markup = renderToStaticMarkup(renderSilverPageContent(accountState));

    expect(markup).toContain("@caseyfinds");
    expect(markup).toContain("Looking for jewel tones and unicorns.");
    expect(markup).toContain(
      "Build, track, highlight, and share the pieces you own or hope to find, then use dancer leads when a wanted piece appears.",
    );
    expect(markup).toContain("Edit Profile");
    expect(markup).toContain('data-smoke="profile-summary-card"');
    expect(markup).not.toContain("sparkle-global-save-indicator");
    expect(markup).not.toContain("Changes auto-save.");
    expect(markup).not.toContain("Auto-save profile");
    expect(markup).not.toContain("Save profile");
    expect(markup).not.toContain("Save Sparkle Showcase piece");
    expect(markup).not.toContain("Manage your Sparkle Finder profile, collection, and watchlist details from your signed-in account.");
    expect(markup).not.toContain("fixture-backed preview");
    expect(markup).not.toContain("Local fixture mode");
  });

  it("keeps local fixture wording for Silver local preview accounts", () => {
    const markup = renderToStaticMarkup(
      renderSilverPageContent({ ...getLocalDevAuthState("silver"), isLocalPreview: true }),
    );

    expect(markup).toContain("fixture-backed preview");
    expect(markup).toContain("Local fixture mode");
  });

  it("renders limited Silver route state for Free customers without enabled write controls", () => {
    const markup = renderToStaticMarkup(
      renderSilverPageContent({ ...getLocalDevAuthState("free"), isLocalPreview: true }),
    );

    expect(markup).toContain("Edit Profile");
    expect(markup).toContain('data-smoke="profile-summary-card"');
    expect(markup).toContain("Add to Wishlist");
    expect(markup).toContain("I Own This");
    expect(markup).toContain("disabled");
    expect(markup).not.toContain("Silver preview needed");
  });

  it("does not claim expired Silver access can save Showcase updates", () => {
    const accountState = activeTrialRouteAccountState();
    accountState.membership = {
      ...accountState.membership,
      effectiveState: "free",
      hasSilverAccess: false,
      isTrialActive: false,
      isTrialExpired: true,
      trialEndsAt: "2026-06-10T12:00:00.000Z",
    };

    const markup = renderToStaticMarkup(renderSilverPageContent(accountState));

    expect(markup).toContain("Silver access needed");
    expect(markup).toContain("Silver access is needed to save Sparkle Showcase updates.");
    expect(markup).not.toContain("Your account can save Sparkle Showcase updates.");
  });

  it("keeps hub route copy inside Sparkle Finder guardrails", () => {
    const copy = [...routes, ...publicRoutes].map(([, renderRoute]) => renderRoute()).join(" ");

    expect(findSparkleFinderCopyViolations(copy)).toEqual([]);
  });

  it("does not render placeholder external Sparkle Suite URLs on hub route pages", () => {
    const markup = [
      ...routes.map(([, renderRoute]) => renderRoute()),
      renderToStaticMarkup(
        renderItemDetailPageContent({ itemId: "jewel-rainbow-crown-ring" }, getLocalDevAuthState("silver")),
      ),
      renderToStaticMarkup(renderSignInPageContent()),
    ].join(" ");

    expect(stripHiddenInputValues(markup)).not.toContain("sparklesuite.example");
  });

  it("renders sign-in choices for Guest, Free preview, and Silver preview", () => {
    const markup = renderToStaticMarkup(renderSignInPageContent());

    expect(markup).toContain("Guest preview keeps the public view anonymous");
    expect(markup).toContain("/auth/preview/anonymous");
    expect(markup).toContain("/auth/preview/free");
    expect(markup).toContain("/auth/preview/silver");
    expect(markup).not.toContain("Free preview keeps Guest preview");
  });

  it("renders the real sign-in form and sign-up link", () => {
    const markup = renderToStaticMarkup(renderSignInPageContent());

    expect(markup).toContain("Email");
    expect(markup).toContain("Password");
    expect(markup).toContain("Sign in");
    expect(markup).toContain("Continue with Google");
    expect(markup).toContain("Email me a magic link");
    expect(markup).toContain("Forgot password?");
    expect(markup).toContain('href="/auth/sign-up"');
  });

  it("renders readable sign-in notices", () => {
    const checkEmailMarkup = renderToStaticMarkup(renderSignInPageContent({ message: "check_email" }));
    const missingCodeMarkup = renderToStaticMarkup(
      renderSignInPageContent({ error: "missing_oauth_code" }),
    );
    const exchangeFailedMarkup = renderToStaticMarkup(
      renderSignInPageContent({ error: "oauth_exchange_failed" }),
    );

    const missingEmailMarkup = renderToStaticMarkup(renderSignInPageContent({ error: "missing_email" }));
    const magicLinkFailedMarkup = renderToStaticMarkup(
      renderSignInPageContent({ error: "magic_link_failed" }),
    );

    expect(checkEmailMarkup).toContain("Check your email for the Sparkle Finder sign-in link.");
    expect(missingCodeMarkup).toContain("Google sign-in did not return a valid authorization code.");
    expect(exchangeFailedMarkup).toContain("Google sign-in could not be completed. Please try again.");
    expect(missingEmailMarkup).toContain("Enter your email and we will send a sign-in link. No password needed.");
    expect(magicLinkFailedMarkup).toContain(
      "Sparkle Finder could not email a sign-in link. Check the address and try again.",
    );
  });

  it("renders a sign-up route with 45-day Silver trial copy", async () => {
    const markup = renderToStaticMarkup(renderSignUpPageContent());

    expect(markup).toContain("45-day Silver trial");
  });

  it("renders sign-up choices for password or magic link", async () => {
    const markup = renderToStaticMarkup(renderSignUpPageContent());

    expect(markup).toContain('name="authMethod"');
    expect(markup).toContain('value="password"');
    expect(markup).toContain('value="magic-link"');
    expect(markup).toContain("Use a password");
    expect(markup).toContain("Email me a magic sign-in link");
  });

  it("renders sign-up Google auth and remaining account details copy", async () => {
    const markup = renderToStaticMarkup(renderSignUpPageContent());

    expect(markup).toContain("Continue with Google");
    expect(markup).toContain(
      "After Google sign-up, Sparkle Finder may ask for the remaining account details needed for your Silver trial.",
    );
  });

  it("renders sign-up phone and privacy copy", async () => {
    const markup = renderToStaticMarkup(renderSignUpPageContent());

    expect(markup).toContain(
      "Used for account verification, recovery, and trial protection. Not sold. Marketing texts are optional.",
    );
    expect(markup).toContain("I acknowledge");
    expect(markup).toContain("privacy");
    expect(markup).toContain('href="/privacy-policy"');
    expect(markup).toContain("Sparkle Finder privacy terms");
    expect(markup).toContain("Nic-Nac AI assistance and memory");
    expect(markup).toContain("linked-rep");
  });

  it("renders anonymous account prompts and 45-day Silver trial account copy", () => {
    const anonymousMarkup = renderToStaticMarkup(renderAccountPageContent(anonymousRouteAccountState()));
    const trialMarkup = renderToStaticMarkup(
      renderAccountPageContent(activeTrialRouteAccountState(), new Date("2026-06-01T12:00:00.000Z")),
    );

    expect(anonymousMarkup).toContain("Sign in to manage your Sparkle Finder account");
    expect(anonymousMarkup).toContain("Silver trial details");
    expect(anonymousMarkup).toContain("/auth/sign-up");
    expect(trialMarkup).toContain("45-day Silver trial");
    expect(trialMarkup).toContain("Trial ends June 10, 2026");
    expect(trialMarkup).toContain("9 days left");
  });

  it("renders account phone privacy copy and leaves promotional SMS unchecked by default", () => {
    const markup = renderToStaticMarkup(renderAccountPageContent(activeTrialRouteAccountState()));

    expect(markup).toContain("Phone is used for account identification, recovery, trial protection, and security notices.");
    expect(markup).toContain("We do not sell your phone number.");
    expect(markup).toContain("Marketing texts are optional and separate from account/security notices.");
    expect(markup).toContain("Nic-Nac AI assistance and memory");
    expect(markup).toContain('name="promotionalSms"');
    expect(markup).not.toContain('name="promotionalSms" checked');
  });

  it("leaves promotional SMS unchecked by default on the sign-up route", async () => {
    const markup = renderToStaticMarkup(renderSignUpPageContent());

    expect(markup).toContain('name="promotionalSms"');
    expect(markup).not.toContain('name="promotionalSms" checked=""');
    expect(markup).not.toContain('name="promotionalSms" checked');
  });

  it("links sign-in visitors to the sign-up route", () => {
    const markup = renderToStaticMarkup(renderSignInPageContent());

    expect(markup).toContain('href="/auth/sign-up"');
  });

  it("hides local preview links in production when preview auth is disabled", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SPARKLE_FINDER_ENABLE_PREVIEW_AUTH", "");

    const markup = renderToStaticMarkup(renderSignInPageContent());

    expect(markup).not.toContain("/auth/preview/anonymous");
    expect(markup).not.toContain("/auth/preview/free");
    expect(markup).not.toContain("/auth/preview/silver");
  });

  it("shows local preview links when preview auth is enabled", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SPARKLE_FINDER_ENABLE_PREVIEW_AUTH", "true");

    const markup = renderToStaticMarkup(renderSignInPageContent());

    expect(markup).toContain("/auth/preview/anonymous");
    expect(markup).toContain("/auth/preview/free");
    expect(markup).toContain("/auth/preview/silver");
  });

  it("keeps local preview redirects on safe local request hosts", async () => {
    const freeResponse = await previewAuthGET(
      new Request("http://localhost:4310/auth/preview/free", {
        headers: { host: "127.0.0.1:4310" },
      }),
      {
        params: Promise.resolve({ mode: "free" }),
      },
    );
    const silverResponse = await previewAuthGET(new Request("http://localhost:4310/auth/preview/silver"), {
      params: Promise.resolve({ mode: "silver" }),
    });
    const anonymousResponse = await previewAuthGET(new Request("http://127.0.0.1:4310/auth/preview/anonymous"), {
      params: Promise.resolve({ mode: "anonymous" }),
    });

    expect(freeResponse.headers.get("location")).toBe("http://127.0.0.1:4310/");
    expect(silverResponse.headers.get("location")).toBe("http://localhost:4310/");
    expect(anonymousResponse.headers.get("location")).toBe("http://127.0.0.1:4310/");
  });

  it("blocks local preview auth cookies in production without the preview flag", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SPARKLE_FINDER_ENABLE_PREVIEW_AUTH", "");

    const response = await previewAuthGET(new Request("http://localhost:4310/auth/preview/silver"), {
      params: Promise.resolve({ mode: "silver" }),
    });

    expect(response.headers.get("location")).toBe("http://localhost:4310/auth/sign-in");
    expect(response.headers.get("set-cookie") ?? "").not.toContain("sparkle_finder_auth_mode");
  });

  it("allows local preview auth cookies in production when the preview flag is enabled", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SPARKLE_FINDER_ENABLE_PREVIEW_AUTH", "true");

    const response = await previewAuthGET(new Request("http://localhost:4310/auth/preview/silver"), {
      params: Promise.resolve({ mode: "silver" }),
    });

    expect(response.headers.get("location")).toBe("http://localhost:4310/");
    expect(response.headers.get("set-cookie") ?? "").toContain("sparkle_finder_auth_mode=silver");
  });

  it("keeps disabled preview auth redirects on the deployed Sparkle Finder host", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SPARKLE_FINDER_ENABLE_PREVIEW_AUTH", "");

    const response = await previewAuthGET(
      new Request("https://sparkle-finder-dev.vercel.app/auth/preview/silver", {
        headers: { host: "sparkle-finder-dev.vercel.app" },
      }),
      {
        params: Promise.resolve({ mode: "silver" }),
      },
    );

    expect(response.headers.get("location")).toBe("https://sparkle-finder-dev.vercel.app/auth/sign-in");
    expect(response.headers.get("set-cookie") ?? "").not.toContain("sparkle_finder_auth_mode");
  });

  it("keeps enabled preview auth redirects on the deployed Sparkle Finder host", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SPARKLE_FINDER_ENABLE_PREVIEW_AUTH", "true");

    const response = await previewAuthGET(
      new Request("https://sparkle-finder-dev.vercel.app/auth/preview/silver", {
        headers: { host: "sparkle-finder-dev.vercel.app" },
      }),
      {
        params: Promise.resolve({ mode: "silver" }),
      },
    );

    expect(response.headers.get("location")).toBe("https://sparkle-finder-dev.vercel.app/");
    expect(response.headers.get("set-cookie") ?? "").toContain("sparkle_finder_auth_mode=silver");
  });

  it("ignores an untrusted Host header when the request URL host is local", async () => {
    const response = await previewAuthGET(
      new Request("http://localhost:4310/auth/preview/free", {
        headers: { host: "evil.example" },
      }),
      {
        params: Promise.resolve({ mode: "free" }),
      },
    );

    expect(response.headers.get("location")).toBe("http://localhost:4310/");
  });

  it("uses a fixed safe local fallback when Host and request URL are untrusted", async () => {
    const response = await previewAuthGET(new Request("http://evil.example/auth/preview/free"), {
      params: Promise.resolve({ mode: "free" }),
    });

    expect(response.headers.get("location")).toBe("http://127.0.0.1:4310/");
  });

  it("uses a safe local Host header even when the request URL host is untrusted", async () => {
    const response = await previewAuthGET(
      new Request("http://evil.example/auth/preview/free", {
        headers: { host: "localhost:4310" },
      }),
      {
        params: Promise.resolve({ mode: "free" }),
      },
    );

    expect(response.headers.get("location")).toBe("http://localhost:4310/");
  });

  it("preserves bracketed IPv6 localhost Host redirects", async () => {
    const response = await previewAuthGET(
      new Request("http://localhost:4310/auth/preview/free", {
        headers: { host: "[::1]:4310" },
      }),
      {
        params: Promise.resolve({ mode: "free" }),
      },
    );

    expect(response.headers.get("location")).toBe("http://[::1]:4310/");
  });

  it("maps fixture rep URLs to local route hrefs", () => {
    expect(getLocalRepBoardHref("https://sparklesuite.example/reps/sierra/board/rainbow-crown")).toBe(
      "/rep-boards?listing=rainbow-crown",
    );
    expect(getLocalRepHref("https://sparklesuite.example/reps/sierra")).toBe("/rep-boards?rep=sierra");
  });

  it("converts Sparkle Suite API rep paths into customer-safe external hrefs", () => {
    expect(getSparkleSuiteRepBoardHref("/amethyst/trade?c=rep-demo", "https://suite.example")).toBe(
      "https://suite.example/amethyst/trade?c=rep-demo",
    );
    expect(getSparkleSuiteRepHref("/amethyst?c=rep-demo", "https://suite.example/")).toBe(
      "https://suite.example/amethyst?c=rep-demo",
    );
    expect(getSparkleSuiteRepBoardHref("https://suite.example/amethyst/trade?c=rep-demo", "https://ignored.example")).toBe(
      "https://suite.example/amethyst/trade?c=rep-demo",
    );
    expect(getSparkleSuiteRepHref("https://suite.example/amethyst?c=rep-demo", "https://ignored.example")).toBe(
      "https://suite.example/amethyst?c=rep-demo",
    );
  });
});

function anonymousRouteAccountState(): CurrentSparkleFinderAccountState {
  return {
    status: "anonymous",
    tier: "anonymous",
    displayName: "Guest",
    email: null,
    customer: null,
    communicationConsent: {
      accountEmailRequired: true,
      accountSmsAllowed: false,
      promotionalEmailOptIn: false,
      promotionalSmsOptIn: false,
      accountSmsConsentedAt: null,
      promotionalEmailConsentedAt: null,
      promotionalSmsConsentedAt: null,
      privacyAcknowledgedAt: null,
    },
  };
}

function activeTrialRouteAccountState(): CurrentSparkleFinderAccountState {
  return {
    status: "authenticated",
    tier: "silver",
    displayName: "Casey Collector",
    email: "casey@example.com",
    customer: {
      id: "user-123",
      displayName: "Casey Collector",
      email: "casey@example.com",
      state: "PA",
      tier: "silver",
    },
    membership: {
      accountId: "user-123",
      personId: "user-123",
      accessState: "silver_trial",
      silverSource: "trial",
      trialStartedAt: "2026-04-26T12:00:00.000Z",
      trialEndsAt: "2026-06-10T12:00:00.000Z",
      silverStartedAt: "2026-04-26T12:00:00.000Z",
      silverEndsAt: "2026-06-10T12:00:00.000Z",
      effectiveState: "silver_trial",
      hasSilverAccess: true,
      isTrialActive: true,
      isTrialExpired: false,
    },
    communicationConsent: {
      accountEmailRequired: true,
      accountSmsAllowed: false,
      promotionalEmailOptIn: false,
      promotionalSmsOptIn: false,
      accountSmsConsentedAt: null,
      promotionalEmailConsentedAt: null,
      promotionalSmsConsentedAt: null,
      privacyAcknowledgedAt: "2026-04-26T12:00:00.000Z",
    },
  };
}

function silverPreviewRouteAccountState(): CurrentSparkleFinderAccountState & { status: "authenticated" } {
  const accountState = getLocalDevAuthState("silver");

  if (accountState.status !== "authenticated") {
    throw new Error("Expected local Silver preview account");
  }

  return {
    ...accountState,
    communicationConsent: {
      accountEmailRequired: true,
      accountSmsAllowed: false,
      accountSmsConsentedAt: null,
      promotionalEmailOptIn: false,
      promotionalEmailConsentedAt: null,
      promotionalSmsOptIn: false,
      promotionalSmsConsentedAt: null,
      privacyAcknowledgedAt: "2026-06-01T12:00:00.000Z",
    },
  };
}

function stripHiddenInputValues(markup: string): string {
  return markup.replace(/<input\b(?=[^>]*type="hidden")[^>]*>/g, "");
}

function extractNavMarkup(markup: string): string {
  const navStart = markup.indexOf('data-smoke="nav"');
  const mainStart = markup.indexOf("<main", navStart);

  if (navStart === -1 || mainStart === -1) {
    return "";
  }

  return markup.slice(navStart, mainStart);
}

function libraryFilterItems(): JewelryItem[] {
  return [
    {
      id: "jewel-rose-crown-ring",
      name: "Rose Crown Ring",
      collectionName: "Garden Glow",
      collectionYear: 2026,
      jewelryType: "ring",
      material: "Rose gold",
      mainStone: "Pink opal",
      imageUrl: "/fixtures/rose-crown-ring.jpg",
      bpLabel: "diamond",
      itemNumber: "RCR-001",
      searchTags: ["rose", "crown"],
      availableListingCount: 1,
      knownRepListingIds: [],
    },
    {
      id: "jewel-ocean-pearl-necklace",
      name: "Ocean Pearl Necklace",
      collectionName: "Tide Line",
      collectionYear: 2026,
      jewelryType: "necklace",
      material: "Sterling silver",
      mainStone: "Pearl",
      imageUrl: "/fixtures/ocean-pearl-necklace.jpg",
      bpLabel: "diamond",
      itemNumber: "OPN-002",
      searchTags: ["ocean", "pearl"],
      availableListingCount: 1,
      knownRepListingIds: [],
    },
  ];
}

function libraryFacetOptions() {
  return {
    collections: [{ value: "Garden Glow", count: 1 }],
    materials: [{ value: "Rose gold", count: 1 }],
    stones: [{ value: "Pink opal", count: 1 }],
    types: [{ value: "ring", count: 1 }],
    labels: [{ value: "diamond", count: 1 }],
    years: [{ value: "2026", count: 1 }],
  };
}

function supportedCatalogPage(
  items: JewelryItem[],
  pageInfo: {
    totalCount: number;
    hasMore: boolean;
    nextCursor: string | null;
  },
): CatalogPageReadResult {
  return {
    status: "success",
    pagination: "supported",
    schemaVersion: 2,
    items: items.map((item) => ({ ...item, description: null })),
    pageInfo,
  };
}

function homepageVaultItem(
  overrides: Partial<HomepageBlingVaultItem> & {
    jewelryItem: JewelryItem;
    jewelryItemId: string;
  },
): HomepageBlingVaultItem {
  return {
    id: "collection-item",
    customerId: "customer-silver-test",
    jewelryItemId: overrides.jewelryItemId,
    state: "owned",
    note: "",
    isHighlighted: false,
    ...overrides,
  };
}

function jewelryItem(overrides: Partial<JewelryItem> & Pick<JewelryItem, "id" | "bpLabel">): JewelryItem {
  return {
    id: overrides.id,
    name: "Test Piece",
    collectionName: "Test Collection",
    jewelryType: "ring",
    imageUrl: "",
    bpLabel: overrides.bpLabel,
    itemNumber: "TEST-1",
    knownRepListingIds: [],
    ...overrides,
  };
}

function finderLiveShowItems(): FinderLiveShow[] {
  return [
    {
      showId: "show-demo",
      showName: "Demo Glow Show",
      repFirstName: "Demo",
      startsAt: "2026-06-06T20:00:00.000Z",
      status: "scheduled",
      customerSiteUrl: "https://www.yoursparklesuite.com/demo-show?c=rep-demo",
    },
  ];
}

function persistedFavoriteRepCard(overrides: Partial<FavoriteRepCard> = {}): FavoriteRepCard {
  return {
    id: "persisted-favorite",
    userId: "customer-silver-sparkle-mama",
    repId: "rep-persisted",
    repDisplayName: "Persisted Rep",
    repSiteUrl: "https://www.yoursparklesuite.com/reps/persisted",
    repBoardUrl: "https://www.yoursparklesuite.com/reps/persisted/board",
    notes: "",
    notifyNextShow: false,
    createdAt: "2026-06-17T12:00:00.000Z",
    updatedAt: "2026-06-17T12:00:00.000Z",
    nextShowAt: null,
    nextShowTitle: null,
    boardItemCount: 0,
    isSilverEnhanced: true,
    ...overrides,
  };
}
