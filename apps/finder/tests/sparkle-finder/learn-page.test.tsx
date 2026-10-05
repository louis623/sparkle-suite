import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import LearnLivePage from "../../app/learn-live/page";
import LearnPage from "../../app/learn/page";
import { FinderLearnPage } from "../../components/learn/FinderLearnPage";
import { findSparkleFinderCopyViolations } from "../../lib/sparkle-finder/copy-guardrails";
import { finderLearnContent, finderLearnVisibleCopy } from "../../lib/sparkle-finder/learn-page-content";
import { sparkleSuiteMarketingHref } from "../../lib/sparkle-finder/marketing-destinations";

const liveSuiteHref = "https://www.yoursparklesuite.com";
const smokeSuiteHref = "https://sparkle-suite-smoke.vercel.app/";

const allowedHrefs = new Set([
  "#top",
  "#main-content",
  "/privacy-policy",
  "/terms-and-conditions",
  liveSuiteHref,
  "https://www.youtube.com/@SparkleSuite",
  "https://www.tiktok.com/@yoursparklesuite.com",
  "/brand/sparkle-finder-logo-transparent.png",
  "/brand/sparkle-suite-logo-transparent.png",
  "/learn/pillars/search.png",
  "/learn/pillars/save.png",
  "/learn/pillars/go-to-the-show.png",
  "/learn/pillars/show-it-off.png",
]);

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Sparkle Finder /learn", () => {
  it("renders a public collector page with the locked membership and real features", () => {
    const markup = renderToStaticMarkup(createElement(FinderLearnPage));

    expect(markup).toContain("Find the pieces you");
    expect(markup).toContain(finderLearnContent.tagline);
    expect(markup).toContain("collector side of Sparkle Suite");
    expect(markup).not.toContain("This page does not open one yet.");
    expect(markup).not.toContain("An account is required.");
    expect(markup).not.toContain("See why it helps");
    expect(markup).toContain("Dance Floor");
    const trialAt = markup.indexOf("30 days of Silver is free.");
    const priceAt = markup.indexOf("Silver is $6 per month, about the cost of a pumpkin spice latte.");
    const chargeAt = markup.indexOf("No automatic charge.");
    const silverIncludesAt = markup.indexOf("Silver includes");
    const freeCardAt = markup.indexOf('id="free-title"');
    expect(trialAt).toBeGreaterThan(-1);
    expect(priceAt).toBeGreaterThan(trialAt);
    expect(chargeAt).toBeGreaterThan(priceAt);
    expect(silverIncludesAt).toBeGreaterThan(chargeAt);
    expect(freeCardAt).toBeGreaterThan(silverIncludesAt);
    expect(markup).toContain("No card is needed to sign up.");
    expect(markup).toContain("unless you choose to pay $6 a month");
    expect(markup).not.toContain("If you do not pay, you stay Free and nothing is charged.");
    const silverLines = [
      "Save the pieces you love to your collection",
      "Nic-Nac is your collection curator and jewelry finder assistant",
    ];
    const silverLineAt = silverLines.map((line) => markup.indexOf(line));
    expect(silverLineAt[0]).toBeGreaterThan(silverIncludesAt);
    expect(silverLineAt[1]).toBeGreaterThan(silverLineAt[0]);
    expect(silverLineAt[1]).toBeLessThan(freeCardAt);
    expect(markup).not.toContain("Saving a collection");
    expect(markup).not.toContain("Nic-Nac, your collection curator");
    expect(markup).not.toMatch(/limited helper|unlimited chat|unlimited chatbot|unlimited ai/i);
    expect(markup).not.toContain("A Free profile has fewer tools than Silver.");
    expect(markup).not.toContain("A profile exists on Free.");
    const freeLines = [
      "Look through BP rep listings",
      "Follow your favorite reps",
      "Window shop their virtual dance floors",
      "See when their next show times and dates are",
    ];
    const freeLineAt = freeLines.map((line) => markup.indexOf(line, freeCardAt));
    expect(freeLineAt.every((index) => index > freeCardAt)).toBe(true);
    expect(freeLineAt.every((index, position) => position === 0 || index > freeLineAt[position - 1])).toBe(true);
    expect(markup).not.toContain("Favorite your favorite reps");
    expect(markup).not.toContain("Peruse their virtual dance floors");
    expect(markup).not.toContain("Looking through the jewelry library");
    expect(markup).not.toContain("The rep list");
    expect(markup).not.toContain("BP Rep listing");
    expect(markup).not.toContain(">Show times<");
    expect(markup).toContain("Follow your favorite reps and browse their Dance Floors anytime.");
    expect(markup).not.toMatch(/vault/i);
    expect(markup).toContain(
      "Sparkle Suite is an independent tool for Reps and Collectors. We are not affiliated with, endorsed by, sponsored by, or officially connected to Bomb Party.",
    );
    expect(markup).not.toContain("Sparkle Finder is a discovery hub");
    expect(markup).not.toContain("independent tool for reps");
    expect(markup).not.toContain("neonrabbit.net");
    expect(markup).not.toMatch(/powered by Neon Rabbit/i);
    expect(markup).toContain('aria-label="Sparkle Suite on YouTube"');
    expect(markup).toContain('aria-label="Sparkle Suite on TikTok"');
    expect(markup).toContain("M23 12.2s0-3.2-.4-4.6");
    expect(markup).toContain("M14.2 3.1c.5 2.6 2 4.4 4.5 4.7");
    const freeCard = markup.slice(freeCardAt);
    expect(freeCard).not.toMatch(/save a collection|saving a collection/i);
    expect(markup.match(/Browse our jewelry library built from our BP reps(?:'|&#x27;) revealed dancers\./g)).toHaveLength(1);
    expect(markup.match(/Look for pieces you already own, or pieces you want to collect\./g)).toHaveLength(1);
    expect(markup.match(/Already own a piece\? Save it to your virtual collection\./g)).toHaveLength(1);
    expect(markup.match(/Want it\? Save it to your wish list and get notified when a BP rep has it on their Dance Floor\./g)).toHaveLength(1);
    expect(markup.match(/See the next show for the rep who has the piece you want\./g)).toHaveLength(1);
    expect(markup.match(/Follow your favorite reps and browse their Dance Floors anytime\./g)).toHaveLength(1);
    expect(markup.match(/Always know where and when the next show is\./g)).toHaveLength(1);
    expect(markup.match(/Curate a virtual collection that matches the pieces you own\./g)).toHaveLength(1);
    expect(markup.match(/Share with friends and family, and browse their collections too\./g)).toHaveLength(1);
    expect(markup).not.toContain("Brag about the bling");
    expect(markup).not.toContain("Curate your virtual collection that matches your real pieces.");
    expect(markup).not.toContain("Hunt the jewelry library");
    expect(markup).not.toContain("Own it → your collection");
    expect(markup).not.toContain("Hunt through the jewelry database");
    expect(markup).not.toContain("When you find it, save it.");
    expect(markup).not.toMatch(/vault/i);
    expect(markup).toContain(">Search<");
    expect(markup).toContain(">Save<");
    expect(markup).toContain(">Go to the show<");
    expect(markup).toContain(">Show it off<");
    expect(markup).not.toContain("In Finder today");
    expect(markup).not.toContain(">Jewelry library<");
    expect(markup).not.toContain("Live shows");
    expect(markup).not.toContain("Hero Piece");
    expect(markup).not.toContain("Showcase Studio");
    expect(markup).toContain("Nic-Nac");
    expect(markup).not.toContain("marketplace");
    expect(markup).not.toContain("Browse, save, then visit the Suite rep.");
    expect(markup).not.toMatch(/>0[1-4]</);
    expect(markup).not.toContain("Fine print");
    expect(markup).not.toContain("How a jewelry profile is used.");
    expect(markup).not.toContain("Nobody else receives them.");
    expect(markup).not.toContain(">F<");
    expect(markup).not.toContain(">S<");
    expect(markup).toContain('data-finder-brand="amethyst"');
    expect(markup).not.toContain('x="30.144"');
    expect(markup).not.toContain('href="#how"');
    expect(markup).not.toContain(">How it works<");
    expect(markup).toContain('aria-label="How it works"');
    expect(markup).not.toContain('href="#silver"');
    expect(markup).not.toContain(">Silver</a>");
    expect(markup).not.toContain('href="#soon"');
    expect(markup).not.toContain('href="#why"');
    expect(markup.match(/<img\b/g)).toHaveLength(7);
    expect(markup).toContain('src="/learn/pillars/search.png"');
    expect(markup).toContain('src="/learn/pillars/save.png"');
    expect(markup).toContain('src="/learn/pillars/go-to-the-show.png"');
    expect(markup).toContain('src="/learn/pillars/show-it-off.png"');
    expect(markup).toContain("<ul>");
    expect(markup.match(/src="\/brand\/sparkle-finder-logo-transparent.png"/g)).toHaveLength(2);
    expect(markup.match(/src="\/brand\/sparkle-suite-logo-transparent.png"/g)).toHaveLength(1);
    expect(markup).toContain('aria-label="Sparkle Suite"');
    expect(markup).not.toContain(">Sparkle Suite<");
    expect(markup).not.toMatch(/webp|\/learn\/peeks|background-image|url\(|sparkle-finder-seal|email-signatures|sparkle-finder-logo\.png|filter:/i);
    expect(markup).not.toMatch(/>Sign In<|>Sign Up<|sneak peek/i);
    const header = markup.slice(markup.indexOf("<header"), markup.indexOf("</header>"));
    expect(header).not.toContain("<nav");
    expect([...header.matchAll(/href="([^"]+)"/g)].map((match) => match[1])).toEqual(["#top"]);
    expect(header).toContain('src="/brand/sparkle-finder-logo-transparent.png"');
    expect(markup).not.toContain("heroSeal");
    expect(markup.match(/Get notified when we launch/g)).toHaveLength(2);
    expect(markup.match(/<button\b[^>]*type="button"/g)).toHaveLength(2);
    expect(markup).not.toContain("Create an account");
    expect(markup).not.toContain("Coming soon");
    expect(markup).not.toMatch(/<form|mailto:/i);
    expect(markup).not.toMatch(/create-an-account/i);
    expect(markup).not.toMatch(/Sparkle Finder reps/i);
    expect(markup).not.toMatch(/\$4\.99|\$5\b|45-day/i);
    expect(markup).not.toMatch(/yoursparklefinder\.com|app store|stripe|unicorn/i);
    expect(markup).not.toMatch(/href="\/auth|href="\/create/i);

    const hrefs = [...markup.matchAll(/(?<![a-zA-Z])href="([^"]+)"/g)].map((match) => match[1]);
    const navigationHrefs = hrefs;
    expect(navigationHrefs.length).toBeGreaterThan(0);
    expect(navigationHrefs.every((href) => allowedHrefs.has(href))).toBe(true);
    expect(markup).toContain(`href="${liveSuiteHref}"`);
    expect(markup).not.toContain(smokeSuiteHref);
    expect(findSparkleFinderCopyViolations(finderLearnVisibleCopy())).toEqual([]);
  });

  it("keeps the route free of auth and signup wiring", () => {
    const pageSource = readFileSync(new URL("../../app/learn/page.tsx", import.meta.url), "utf8");
    const learnSource = readFileSync(new URL("../../components/learn/FinderLearnPage.tsx", import.meta.url), "utf8");
    const contentSource = readFileSync(new URL("../../lib/sparkle-finder/learn-page-content.ts", import.meta.url), "utf8");
    const styles = readFileSync(new URL("../../components/learn/finder-learn.module.css", import.meta.url), "utf8");
    const footerStyles = readFileSync(new URL("../../components/marketing/sparkle-marketing-footer.module.css", import.meta.url), "utf8");
    const seal = readFileSync(new URL("../../brand-assets/amethyst/01-amethyst-seal.svg", import.meta.url), "utf8");

    expect(pageSource).not.toContain("getCurrentSparkleFinderAccount");
    expect(pageSource).not.toContain("create-an-account");
    expect(`${learnSource}\n${contentSource}`).not.toMatch(/next\/image|webp|\/learn\/peeks|background-image|url\(/i);
    expect(styles).not.toMatch(/next\/image|webp|\/learn\/peeks|background-image|pillarPanel/i);
    expect(styles).toContain(".pillarArt {");
    expect(styles).toContain(".pillarArt {\n  display: block;\n  width: 100%;\n  height: auto;\n  background: #fff;");
    expect(styles).toContain(".pillarCopy {\n  flex: 1 1 auto;\n  color: #fff;");
    expect(styles).toContain('.pillar[data-pillar="Search"] .pillarCopy {\n  background: var(--finder-deep);');
    expect(styles).toContain('.pillar[data-pillar="Save"] .pillarCopy {\n  background: var(--finder-violet-f);');
    expect(styles).toContain('.pillar[data-pillar="Go to the show"] .pillarCopy {\n  background: var(--finder-plum);');
    expect(styles).toContain('.pillar[data-pillar="Show it off"] .pillarCopy {\n  background: var(--finder-magenta);');
    expect(styles).toContain('content: "✦";');
    expect(styles).not.toContain(".pillarCopy {\n  background: var(--finder-amethyst);\n  color: #fff;");
    expect(styles).toContain("grid-template-columns: repeat(2, minmax(0, 1fr));");
    expect(contentSource).toContain('image: "/learn/pillars/search.png"');
    expect(contentSource).toContain('image: "/learn/pillars/save.png"');
    expect(contentSource).toContain('image: "/learn/pillars/go-to-the-show.png"');
    expect(contentSource).toContain('image: "/learn/pillars/show-it-off.png"');
    expect(contentSource).toContain("bullets:");
    expect(styles).not.toContain("max-width: 6.5ch;");
    expect(styles).not.toContain("max-width: 11ch;");
    expect(styles).not.toContain("background-position: left bottom;");
    expect(styles).not.toContain("background-position: 70% center;");
    expect(learnSource).toContain('src={finderLearnLockupSrc}');
    expect(learnSource).toContain('"/brand/sparkle-finder-logo-transparent.png"');
    expect(learnSource).not.toMatch(/sparkle-finder-seal|email-signatures|sparkle-finder-logo\.png|FinderSeal/);
    expect(styles).toContain(".header {\n  background: #fff;");
    expect(styles).not.toMatch(/\.header\s*\{[^}]*gradient/i);
    expect(learnSource).toContain("SparkleMarketingFooter");
    expect(footerStyles).toContain(".footer {\n  width: 100%;\n  background: #fff;");
    expect(footerStyles).toContain("color: #775d57;");
    expect(footerStyles).toContain("gap: 26px;");
    expect(footerStyles).not.toContain("#fcf8f6");
    expect(styles).not.toContain("font-size: 14px;");
    expect(styles).toContain("--finder-magenta: #c21878");
    expect(styles).not.toContain("gap: 10px;");
    expect(styles).not.toContain("#35155f");
    expect(styles).toContain(".logo {\n  display: block;\n  height: 64px;");
    expect(styles).toContain("--finder-deep: #1a1230");
    expect(styles).toContain("--finder-amethyst: #5b2a8f");
    expect(styles).toContain("--finder-violet-f: #5c0eff");
    expect(styles).toContain("--finder-plum: #480ddf");
    expect(styles).toContain("--finder-magenta: #c21878");
    expect(styles).toContain("--finder-wordmark: #ee2c9b");
    expect(styles).toContain("--finder-seal-fill: #ffffff");
    expect(styles).toContain("--finder-seal-stroke: #c4a8ef");
    expect(styles).not.toMatch(/@keyframes|animation:|unicorn/i);
    expect(seal).toContain('x="30.144"');
    expect(seal).not.toMatch(/#ee2c9b/i);
    const rendered = renderToStaticMarkup(createElement(LearnPage));
    expect(rendered).toContain('data-smoke="finder-learn"');
    expect(rendered).toContain('data-pillar="Search"');
    expect(rendered).toContain('data-pillar="Save"');
    expect(rendered).toContain('data-pillar="Go to the show"');
    expect(rendered).toContain('data-pillar="Show it off"');
    expect(rendered).toContain("<ul>");
    expect(rendered).toContain("<li>");
  });

  it("renders the Smoke live twin with a non-submitting Create an account label", () => {
    const markup = renderToStaticMarkup(createElement(LearnLivePage));
    const pageSource = readFileSync(new URL("../../app/learn-live/page.tsx", import.meta.url), "utf8");

    expect(markup).toContain('data-smoke="finder-learn-live"');
    expect(markup).toContain("Find the pieces you");
    expect(markup).toContain(finderLearnContent.tagline);
    expect(markup).toContain("collector side of Sparkle Suite");
    expect(markup).toContain(">Search<");
    expect(markup).toContain(">Save<");
    expect(markup).toContain(">Go to the show<");
    expect(markup).toContain(">Show it off<");
    expect(markup).toContain("30 days of Silver is free.");
    expect(markup.indexOf("30 days of Silver is free.")).toBeLessThan(
      markup.indexOf("Silver is $6 per month, about the cost of a pumpkin spice latte."),
    );
    expect(markup).toContain("Save the pieces you love to your collection");
    expect(markup).toContain("Nic-Nac is your collection curator and jewelry finder assistant");
    expect(markup).not.toContain("If you do not pay, you stay Free and nothing is charged.");
    expect(markup).not.toContain("A Free profile has fewer tools than Silver.");
    expect(markup).not.toContain("A profile exists on Free.");
    expect(markup).not.toMatch(/limited helper|unlimited chat|unlimited chatbot|unlimited ai/i);
    expect(markup).toContain('id="free-title"');
    expect(markup).toContain("Look through BP rep listings");
    expect(markup).toContain("Follow your favorite reps");
    expect(markup).not.toContain("Favorite your favorite reps");
    expect(markup).toContain("Window shop their virtual dance floors");
    expect(markup).toContain("See when their next show times and dates are");
    expect(markup).not.toContain("Peruse their virtual dance floors");
    expect(markup).not.toContain("BP Rep listing");
    expect(markup).not.toContain('href="#silver"');
    expect(markup).not.toMatch(/vault/i);
    expect(markup).toContain(
      "Sparkle Suite is an independent tool for Reps and Collectors. We are not affiliated with, endorsed by, sponsored by, or officially connected to Bomb Party.",
    );
    expect(markup).not.toContain("Sparkle Finder is a discovery hub");
    expect(markup).not.toContain("independent tool for reps");
    expect(markup).not.toContain("neonrabbit.net");
    expect(markup).not.toMatch(/powered by Neon Rabbit/i);
    expect(markup).toContain("Privacy Policy");
    expect(markup.match(/Create an account/g)).toHaveLength(2);
    expect(markup).not.toContain("Get notified when we launch");
    expect(markup).not.toContain("Coming soon");
    expect(markup.match(/<button\b[^>]*type="button"/g)).toHaveLength(2);
    expect(markup).not.toMatch(/<button[^>]*href=/);
    expect(markup).not.toMatch(/<form|mailto:|create-an-account|href="\/auth|href="\/create/i);
    expect(pageSource).not.toContain("getCurrentSparkleFinderAccount");
    expect(pageSource).not.toContain("create-an-account");
    expect(findSparkleFinderCopyViolations(finderLearnVisibleCopy())).toEqual([]);
    expect(markup).toContain(`href="${liveSuiteHref}"`);
  });

  it("points the Suite footer link at Suite Smoke only when a Smoke marker is set", () => {
    expect(sparkleSuiteMarketingHref({})).toBe(liveSuiteHref);
    expect(sparkleSuiteMarketingHref({
      SPARKLE_ENVIRONMENT: "production",
      NEXT_PUBLIC_SPARKLE_ENVIRONMENT: "production",
    })).toBe(liveSuiteHref);
    expect(finderLearnContent.footer.links.some((link) => link.label === "Sparkle Suite")).toBe(false);

    for (const marker of ["SPARKLE_ENVIRONMENT", "NEXT_PUBLIC_SPARKLE_ENVIRONMENT"] as const) {
      vi.stubEnv("SPARKLE_ENVIRONMENT", "");
      vi.stubEnv("NEXT_PUBLIC_SPARKLE_ENVIRONMENT", "");
      vi.stubEnv(marker, "smoke");

      for (const page of [FinderLearnPage, LearnLivePage]) {
        const markup = renderToStaticMarkup(createElement(page));
        expect(markup).toContain('aria-label="Sparkle Suite"');
        expect(markup).toContain('src="/brand/sparkle-suite-logo-transparent.png"');
        expect(markup).not.toContain(">Sparkle Suite<");
        expect(markup).toContain(`href="${smokeSuiteHref}"`);
        expect(markup).not.toContain(`href="${liveSuiteHref}"`);
        expect(markup).toContain('href="https://www.youtube.com/@SparkleSuite"');
        expect(markup).toContain('href="https://www.tiktok.com/@yoursparklesuite.com"');
      }
    }
  });
});
