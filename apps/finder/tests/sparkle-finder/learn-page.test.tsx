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
  "#how",
  "/privacy-policy",
  "/terms-and-conditions",
  liveSuiteHref,
  "https://www.youtube.com/@yoursparklesuite",
  "https://www.tiktok.com/@yoursparklesuite",
  "https://neonrabbit.net",
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
      "Favorite your favorite reps",
      "See when their next show times and dates are",
      "Peruse their virtual dance floors",
    ];
    const freeLineAt = freeLines.map((line) => markup.indexOf(line));
    expect(freeLineAt.every((index) => index > freeCardAt)).toBe(true);
    expect(freeLineAt.every((index, position) => position === 0 || index > freeLineAt[position - 1])).toBe(true);
    expect(markup).not.toContain("Looking through the jewelry library");
    expect(markup).not.toContain("The rep list");
    expect(markup).not.toContain("BP Rep listing");
    expect(markup).not.toContain(">Show times<");
    expect(markup).not.toContain("Dance Floors");
    expect(markup).not.toMatch(/vault/i);
    const freeCard = markup.slice(freeCardAt);
    expect(freeCard).not.toMatch(/save a collection|saving a collection/i);
    expect(markup.match(/Hunt through the jewelry database/g)).toHaveLength(1);
    expect(markup.match(/When you find it, save it\./g)).toHaveLength(1);
    expect(markup.match(/See when that rep(?:'|&#x27;)s next show is/g)).toHaveLength(1);
    expect(markup.match(/Brag about the bling\./g)).toHaveLength(1);
    expect(markup).toContain(">Search<");
    expect(markup).toContain(">Save<");
    expect(markup).toContain(">Go to the show<");
    expect(markup).toContain(">Show it off<");
    expect(markup).not.toContain("In Finder today");
    expect(markup).not.toContain("Jewelry library");
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
    expect(markup).toContain(">F<");
    expect(markup).not.toContain(">S<");
    expect(markup).toContain('data-finder-brand="amethyst"');
    expect(markup).toContain('x="30.144"');
    expect(markup).toContain("var(--finder-violet-f)");
    expect(markup).toContain('href="#how"');
    expect(markup).toContain(">How it works<");
    expect(markup).not.toContain('href="#silver"');
    expect(markup).not.toContain(">Silver</a>");
    expect(markup).not.toContain('href="#soon"');
    expect(markup).not.toContain('href="#why"');
    expect(markup).not.toMatch(/<img|webp|\/learn\/peeks|background-image|url\(/i);
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
    const seal = readFileSync(new URL("../../brand-assets/amethyst/01-amethyst-seal.svg", import.meta.url), "utf8");

    expect(pageSource).not.toContain("getCurrentSparkleFinderAccount");
    expect(pageSource).not.toContain("create-an-account");
    expect(`${learnSource}\n${contentSource}\n${styles}`).not.toMatch(/next\/image|<img|webp|\/learn\/peeks|background-image|url\(/i);
    expect(styles).toContain("--finder-deep: #1a0b2e");
    expect(styles).toContain("--finder-amethyst: #5b2a8f");
    expect(styles).toContain("--finder-violet-f: #5c0eff");
    expect(styles).toContain("--finder-seal-fill: #ffffff");
    expect(styles).toContain("--finder-seal-stroke: #c4a8ef");
    expect(styles).toContain("--finder-wordmark: #ee2c9b");
    expect(styles).not.toMatch(/@keyframes|animation:|unicorn/i);
    expect(seal).toContain('x="30.144"');
    expect(seal).not.toMatch(/#ee2c9b/i);
    expect(renderToStaticMarkup(createElement(LearnPage))).toContain('data-smoke="finder-learn"');
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
    expect(markup).toContain("Favorite your favorite reps");
    expect(markup).toContain("See when their next show times and dates are");
    expect(markup).toContain("Peruse their virtual dance floors");
    expect(markup).not.toContain("BP Rep listing");
    expect(markup).not.toContain('href="#silver"');
    expect(markup).not.toMatch(/vault/i);
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
    expect(finderLearnContent.footer.links.find((link) => link.label === "Sparkle Suite")?.href).toBe(liveSuiteHref);

    for (const marker of ["SPARKLE_ENVIRONMENT", "NEXT_PUBLIC_SPARKLE_ENVIRONMENT"] as const) {
      vi.stubEnv("SPARKLE_ENVIRONMENT", "");
      vi.stubEnv("NEXT_PUBLIC_SPARKLE_ENVIRONMENT", "");
      vi.stubEnv(marker, "smoke");

      for (const page of [FinderLearnPage, LearnLivePage]) {
        const markup = renderToStaticMarkup(createElement(page));
        expect(markup).toContain(">Sparkle Suite<");
        expect(markup).toContain(`href="${smokeSuiteHref}"`);
        expect(markup).not.toContain(`href="${liveSuiteHref}"`);
        expect(markup).toContain('href="https://www.youtube.com/@yoursparklesuite"');
      }
    }
  });
});
