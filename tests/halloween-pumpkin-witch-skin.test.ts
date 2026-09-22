import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

import {
  AMETHYST_CUSTOMER_SITE_TEMPLATE,
  getAmethystAppearancePreset,
  normalizeAmethystAppearancePreset,
  normalizeCustomerSiteTemplate,
} from "@/lib/amethyst/appearance-presets";
import {
  buildAmethystHomepageTweakDefaults,
  defaultAmethystHomepageTemplateData,
} from "@/lib/amethyst/homepage-template-data";
import {
  buildAmethystTradeTweakDefaults,
  defaultAmethystTradeTemplateData,
} from "@/lib/amethyst/trade-template-data";
import {
  buildAmethystJoinTweakDefaults,
  defaultAmethystJoinTemplateData,
} from "@/lib/amethyst/join-template-data";
import {
  getAmethystSkinCardsForRep,
  getAmethystSkinCard,
  getAmethystSkinDropdownLabel,
  normalizeAmethystSkinSelection,
} from "@/lib/amethyst/skin-cards";
import { GET as getSkinPreview } from "@/app/skin-preview/[skin]/[page]/route";

const root = process.cwd();
const read = (...parts: string[]) =>
  readFileSync(resolve(root, ...parts), "utf8");
const id = "halloween_pumpkin_witch";

describe("Halloween Pumpkin and Witch Amethyst skin", () => {
  it("registers one visual-only preset across Homepage, Dance Floor, and Join", () => {
    const preset = getAmethystAppearancePreset(id);
    const expected = {
      preset: id,
      primaryColor: "#ff6a00",
      accentColor: "#f4eee3",
      bgTone: "halloweenPumpkinWitch",
      headingFont: "playfair",
      bodyFont: "dmSans",
      headingWeight: 600,
      bgTreatment: "halloween-pumpkin-witch",
      cardSurface: "midnight-glass",
      textureOverlay: "halloween-sparkles",
      buttonEnergy: "pumpkin-glow",
      tradeFlair: "moonlit-sparkles",
    };

    expect(preset.label).toBe("Halloween Pumpkin and Witch");
    expect(
      buildAmethystHomepageTweakDefaults(
        defaultAmethystHomepageTemplateData,
        preset.id,
      ),
    ).toMatchObject(expected);
    expect(
      buildAmethystTradeTweakDefaults(
        defaultAmethystTradeTemplateData,
        preset.id,
      ),
    ).toMatchObject(expected);
    expect(
      buildAmethystJoinTweakDefaults(
        defaultAmethystJoinTemplateData,
        preset.id,
      ),
    ).toMatchObject(expected);
    expect(normalizeAmethystAppearancePreset(id)).toBe(id);
    expect(normalizeAmethystSkinSelection("HPW-01")).toBe(id);
    expect(normalizeAmethystSkinSelection("Halloween Pumpkin and Witch")).toBe(
      id,
    );
    expect(AMETHYST_CUSTOMER_SITE_TEMPLATE).toBe("amethyst");
    expect(normalizeCustomerSiteTemplate(id)).toBe("amethyst");
  });

  it("publishes the rep-facing browsing card to every rep", () => {
    const card = getAmethystSkinCard(id);
    expect(card).toMatchObject({
      id,
      code: "HPW-01",
      label: "Halloween Pumpkin and Witch",
      previewHref: `/skin-preview/${id}/homepage`,
      headingFont: "Playfair Display",
      bodyFont: "DM Sans",
    });
    expect(getAmethystSkinDropdownLabel(card)).toBe(
      "Halloween Pumpkin and Witch (HPW-01)",
    );
    expect(
      getAmethystSkinCardsForRep("any-rep").some((item) => item.id === id),
    ).toBe(true);
  });

  it.each(["homepage", "trade", "join", "unsubscribe"] as const)(
    "serves a safe shared-component %s preview",
    async (page) => {
      const response = await getSkinPreview(
        new Request(
          `https://www.yoursparklesuite.com/skin-preview/${id}/${page}?c=ignored-customer`,
        ),
        { params: Promise.resolve({ skin: id, page }) },
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
      const html = await response.text();
      expect(html).toContain("Halloween Pumpkin and Witch");
      expect(html).toContain(id);
      expect(html).toContain('sandbox="allow-scripts"');
      expect(html).not.toContain("ignored-customer");
      expect(html).not.toContain("allow-same-origin");
    },
  );

  it.each(["Homepage.html", "Trade.html", "Join.html", "Unsubscribe.html"])(
    "loads the shared Halloween skin on %s",
    (page) => {
      const html = read("public", "amethyst", page);
      expect(html).toContain("halloween-pumpkin-witch.css");
      expect(html).toContain("halloween-pumpkin-witch.js");
      expect(html).toContain("20260921-hpw2");
    },
  );

  it("ships bright responsive artwork and bounded accessible motion without bats", async () => {
    const css = read("public", "amethyst", "halloween-pumpkin-witch.css");
    const motion = read("public", "amethyst", "halloween-pumpkin-witch.js");

    expect(css).toContain("body.bg-halloween-pumpkin-witch");
    expect(css).toContain("hero-desktop.webp");
    expect(css).toContain("hero-mobile.webp");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("animation-play-state: paused");
    expect(css).toContain("circle at 20% 61%");
    expect(css).toContain("--hp-electric-purple: #e3b7ff");
    expect(css).toContain("color: #ff9a3d;");
    expect(css).not.toContain(".hpw-bat");
    expect(css).not.toContain("bats.webp");
    expect(motion).toContain("Pause animation");
    expect(motion).toContain("Resume animation");
    expect(motion).toContain("document.hidden");
    expect(motion).toContain("MutationObserver");
    expect(motion).toContain("hpw-witch");
    expect(motion).not.toContain("hpw-bat");
    expect(motion).not.toContain("bats.webp");
    expect(motion).not.toContain("requestAnimationFrame");
    expect(motion).not.toContain("setInterval");

    const expectedAssets = {
      "hero-desktop.webp": { width: 1672, height: 941, hasAlpha: false },
      "hero-mobile.webp": { width: 1024, height: 1536, hasAlpha: false },
      "witch.webp": { width: 1659, height: 948, hasAlpha: true },
    };
    for (const [asset, expected] of Object.entries(expectedAssets)) {
      const path = resolve(
        root,
        "public",
        "amethyst",
        "skins",
        "halloween-pumpkin-witch",
        asset,
      );
      const bytes = readFileSync(path);
      const metadata = await sharp(path).metadata();
      expect(bytes.length).toBeGreaterThan(20_000);
      expect(bytes.length).toBeLessThan(700_000);
      expect(bytes.toString("ascii", 0, 4)).toBe("RIFF");
      expect(metadata).toMatchObject(expected);
    }
  });

  it("adds the public preset to validators and the database constraint", () => {
    expect(read("lib", "services", "types.ts")).toContain(`| '${id}'`);
    expect(read("lib", "sparkle-finder", "appearance.ts")).toContain(`${id}:`);
    const migration = read(
      "supabase",
      "migrations",
      "20260921000100_add_halloween_pumpkin_witch_appearance_preset.sql",
    );
    for (const preset of [
      id,
      "neon_butterfly",
      "pearl",
      "luxe",
      "ocean_sapphire",
    ]) {
      expect(migration).toContain(`'${preset}'`);
    }
  });
});
