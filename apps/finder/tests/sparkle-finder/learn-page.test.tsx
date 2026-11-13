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
  "#why",
  "#discover",
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
    expect(markup).toContain("Jewelry library");
    expect(markup).toContain("Sparkle Suite reps");
    expect(markup).toContain("Dance Floor");
    expect(markup).toContain("Bling Vault");
    expect(markup).toContain("Hero Piece");
    expect(markup).toContain("Showcase Studio");
    expect(markup).toContain("Nic-Nac");
    expect(markup).toContain("not a jewelry marketplace");
    expect(markup).toContain("$6");
    expect(markup).toContain("30-day Silver trial");
    expect(markup).toContain("No card at signup");
    expect(markup).toContain("does not charge you automatically");
    expect(markup).toContain("drops to Free");
    expect(markup).toContain("Sparkle Suite reps only");
    expect(markup).toContain(">F<");
    expect(markup).not.toContain(">S<");
    expect(markup).toContain("Coming soon");
    expect(markup).not.toMatch(/create-an-account/i);
    expect(markup).not.toMatch(/Sparkle Finder reps/i);
    expect(markup).not.toMatch(/\$4\.99|\$5\b|45-day/i);
    expect(markup).not.toMatch(/yoursparklefinder\.com|app store|stripe|unicorn/i);
    expect(markup).not.toMatch(/href="\/auth|href="\/create/i);

    const hrefs = [...markup.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
    expect(hrefs.length).toBeGreaterThan(0);
    expect(hrefs.every((href) => allowedHrefs.has(href))).toBe(true);
    expect(findSparkleFinderCopyViolations(finderLearnVisibleCopy())).toEqual([]);
  });

  it("keeps the route free of auth and signup wiring", () => {
    const pageSource = readFileSync(new URL("../../app/learn/page.tsx", import.meta.url), "utf8");
    const styles = readFileSync(new URL("../../components/learn/finder-learn.module.css", import.meta.url), "utf8");

    expect(pageSource).not.toContain("getCurrentSparkleFinderAccount");
    expect(pageSource).not.toContain("create-an-account");
    expect(styles).not.toMatch(/@keyframes|animation:|unicorn/i);
    expect(renderToStaticMarkup(createElement(LearnPage))).toContain("data-smoke=\"finder-learn\"");
  });
});
