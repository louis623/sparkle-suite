import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import LearnPage from "../../app/learn/page";
import { FinderLearnPage } from "../../components/learn/FinderLearnPage";
import { findSparkleFinderCopyViolations } from "../../lib/sparkle-finder/copy-guardrails";
import { finderLearnContent, finderLearnVisibleCopy } from "../../lib/sparkle-finder/learn-page-content";

const allowedHrefs = new Set([
  "#top",
  "#main-content",
  "#how",
  "#silver",
  "/privacy-policy",
  "/terms-and-conditions",
  "https://www.yoursparklesuite.com",
  "https://www.youtube.com/@yoursparklesuite",
  "https://www.tiktok.com/@yoursparklesuite",
  "https://neonrabbit.net",
]);

describe("Sparkle Finder /learn", () => {
  it("renders a public collector page with the locked membership and real features", () => {
    const markup = renderToStaticMarkup(createElement(FinderLearnPage));

    expect(markup).toContain("Find the pieces you");
    expect(markup).toContain(finderLearnContent.tagline);
    expect(markup).toContain("collector side of Sparkle Suite");
    expect(markup).toContain("This page does not open one yet.");
    expect(markup).toContain("Dance Floor");
    expect(markup).toContain("$6");
    expect(markup).toContain("a month");
    expect(markup).toContain("30-day Silver trial");
    expect(markup).toContain("No card at signup");
    expect(markup).toContain("No automatic charge");
    expect(markup).toContain("drops to Free");
    expect(markup).toContain("Finder pings you");
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
    expect(markup).not.toContain("Bling Vault");
    expect(markup).not.toContain("Live shows");
    expect(markup).not.toContain("Hero Piece");
    expect(markup).not.toContain("Showcase Studio");
    expect(markup).not.toContain("Nic-Nac");
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
    expect(markup).toContain('href="#silver"');
    expect(markup).not.toContain('href="#soon"');
    expect(markup).not.toContain('href="#why"');
    expect(markup).not.toMatch(/<img|webp|\/learn\/peeks|background-image|url\(/i);
    expect(markup).not.toContain("heroSeal");
    expect(markup).toContain("Coming soon");
    expect(markup).not.toMatch(/create-an-account/i);
    expect(markup).not.toMatch(/Sparkle Finder reps/i);
    expect(markup).not.toMatch(/\$4\.99|\$5\b|45-day/i);
    expect(markup).not.toMatch(/yoursparklefinder\.com|app store|stripe|unicorn/i);
    expect(markup).not.toMatch(/href="\/auth|href="\/create/i);

    const hrefs = [...markup.matchAll(/(?<![a-zA-Z])href="([^"]+)"/g)].map((match) => match[1]);
    const navigationHrefs = hrefs;
    expect(navigationHrefs.length).toBeGreaterThan(0);
    expect(navigationHrefs.every((href) => allowedHrefs.has(href))).toBe(true);
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
});
