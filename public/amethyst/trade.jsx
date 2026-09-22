/* global React, ReactDOM */
const { useState, useEffect, useMemo, useRef } = React;

const {
  TweaksPanel, useTweaks,
  TweakSection, TweakSlider, TweakToggle, TweakRadio, TweakSelect,
  TweakColor, TweakText
} = window;

const DEFAULTS = window.TRADE_TWEAK_DEFAULTS || {
  repName: "Sasha",
  businessName: "Sparkle by Sasha",
  liveState: "live",
  contentState: "populated",
  cardCount: 18,
  cardAspect: "square",
  tierVisibility: "rare",
  filterStyle: "dropdowns",
  demoSheet: "closed",
  showTicker: true,
  showHero: true,
  showFaq: true,
  showLegal: true,
  showFooter: true,
  showNicNac: true,
  tickerTopText: "Dance Floor open now | Item-for-item only | Same collection + same jewelry type | Birthday dancers can trade across months",
  tradeHeroTitle: "Find the dancer you wanted to love.",
  tradeHeroSub: "The Dance Floor is for item-for-item swaps only. Requests must stay within the same collection and the same jewelry type.",
  primaryColor: "#5C0EFF",
  accentColor: "#FF1AC2",
  bgTone: "lavender",
  headingFont: "italiana",
  bodyFont: "inter",
  headingWeight: 600,
  shapeRadius: "soft",
  density: "regular",
  saturation: 90,
  preset: "amethyst",
  sparkleLevel: "glittery",
  bgTreatment: "confetti",
  cardSurface: "holographic",
  textureOverlay: "sparkle",
  buttonEnergy: "calm",
  ctaEmphasis: "standard",
  tradeFlair: "holo-unicorn",
  cursorEffect: "sparkle",
  tickerSpeed: 1,
  showSlots: false,
};

function publicRepName(value, fallback = "your rep") {
  const cleaned = String(value || "").trim().replace(/\s+/g, " ");
  if (!cleaned) return fallback;
  return cleaned.split(" ")[0] || fallback;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function redactPublicRepText(text, repName) {
  const value = String(text || "");
  const cleaned = String(repName || "").trim().replace(/\s+/g, " ");
  if (!cleaned || !cleaned.includes(" ")) return value;
  return value.replace(new RegExp(escapeRegExp(cleaned), "g"), publicRepName(cleaned));
}

const CONTENT = window.AMETHYST_TRADE_TEMPLATE_DATA || {};
const RUNTIME_CONTEXT = window.AMETHYST_RUNTIME_CONTEXT || {};
const isMileHighFizzHybrid = CONTENT.publicSiteVariant === "mile_high_fizz_hybrid";
const isBrittWithBlingHybrid = CONTENT.publicSiteVariant === "britt_with_bling_hybrid";
const isBlingKitchenHybrid = CONTENT.publicSiteVariant === "bling_kitchen_hybrid";
const BOOTSTRAP_LISTINGS = Array.isArray(window.AMETHYST_TRADE_BOARD_LISTINGS)
  ? window.AMETHYST_TRADE_BOARD_LISTINGS
  : [];
const TRADE_REQUEST_ENDPOINT = withCurrentSearch("/api/amethyst/trade-requests");
const TRADE_BOARD_ENDPOINT = withCurrentSearch("/api/amethyst/trade-board");
const TRADE_BOARD_REFRESH_MS = 45_000;
const BOARD_PAGE_SIZE = 24;
const DEFAULT_TRADE_REQUEST_ERROR = "We couldn't submit that request. Please try again.";
const TRADE_REQUEST_SCREENSHOT_MAX_BYTES = 8 * 1024 * 1024;
const TRADE_REQUEST_SCREENSHOT_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

function isExternalHref(href) {
  return /^https?:\/\//.test(href || "");
}

function linkProps(href) {
  return isExternalHref(href)
    ? { href, target: "_blank", rel: "noreferrer noopener" }
    : { href: href || "#" };
}

function SocialLogo({ label, shortLabel }) {
  const key = `${label || ""} ${shortLabel || ""}`.toLowerCase();

  if (key.includes("tiktok") || key.includes("tt")) {
    return (
      <svg className="hp-footer-social-logo" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M16.6 3c.4 2.4 1.9 4 4.2 4.3v3.4c-1.6 0-3-.4-4.2-1.3v6.2c0 3.4-2.5 5.7-5.8 5.7-3.1 0-5.5-2.1-5.5-5.1 0-3.2 2.5-5.3 5.8-5.3.4 0 .8 0 1.1.1v3.4c-.4-.1-.8-.2-1.2-.2-1.4 0-2.4.8-2.4 2s.9 2 2.2 2c1.4 0 2.3-.9 2.3-2.8V3h3.5Z" />
      </svg>
    );
  }

  if (key.includes("facebook") || key.includes("fb")) {
    return (
      <svg className="hp-footer-social-logo" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14.2 8.1V6.6c0-.7.5-.9.9-.9h2.3V2.2L14.2 2c-3.2 0-4.8 1.9-4.8 5.1v1H7v3.8h2.4V22h4.2V11.9h3.1l.5-3.8h-3Z" />
      </svg>
    );
  }

  if (key.includes("instagram") || key.includes("ig")) {
    return (
      <svg className="hp-footer-social-logo hp-footer-social-logo-stroke" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="4" width="16" height="16" rx="4.5" />
        <circle cx="12" cy="12" r="3.4" />
        <circle cx="17" cy="7" r="1" />
      </svg>
    );
  }

  if (key.includes("youtube") || key.includes("yt")) {
    return (
      <svg className="hp-footer-social-logo" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21.6 7.2a3 3 0 0 0-2.1-2.1C17.7 4.6 12 4.6 12 4.6s-5.7 0-7.5.5a3 3 0 0 0-2.1 2.1A31 31 0 0 0 2 12a31 31 0 0 0 .4 4.8 3 3 0 0 0 2.1 2.1c1.8.5 7.5.5 7.5.5s5.7 0 7.5-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 22 12a31 31 0 0 0-.4-4.8ZM10 15.4V8.6l5.9 3.4-5.9 3.4Z" />
      </svg>
    );
  }

  return <span className="hp-footer-social-fallback">{shortLabel || (label || "").slice(0, 2).toUpperCase()}</span>;
}

function runtimeText(value) {
  return String(value || "").trim();
}

function buildContextSearch() {
  const params = new URLSearchParams(window.location.search || "");
  const repId = runtimeText(RUNTIME_CONTEXT.repId);
  const publicSiteSlug = runtimeText(RUNTIME_CONTEXT.publicSiteSlug).toLowerCase();

  // Tenant identity comes only from the server bootstrap. Keep harmless view
  // parameters, but never let a shared/crafted page URL retarget API reads.
  params.delete("c");
  params.delete("repId");
  params.delete("publicSiteSlug");
  if (repId) params.set("c", repId);
  if (publicSiteSlug) params.set("publicSiteSlug", publicSiteSlug);

  const query = params.toString();
  return query ? `?${query}` : "";
}

function withCurrentSearch(path) {
  return `${path}${buildContextSearch()}`;
}

// Capture the shared helper once so a missing/blocked optional lineup script
// cannot crash the rest of the customer site during React rendering.
const LIVE_LINEUP_DIALOG_HOOK = window.SparkleLiveLineup?.useDialog || null;

function useLiveLineupDialog(open, onClose) {
  const fallbackRef = React.useRef(null);
  return LIVE_LINEUP_DIALOG_HOOK
    ? LIVE_LINEUP_DIALOG_HOOK(React, open, onClose)
    : fallbackRef;
}

function setMetaContent(selector, value) {
  if (!value) return;
  const node = document.querySelector(selector);
  if (node) node.setAttribute("content", value);
}

function applyTargetedMetadata(pageTitle, description) {
  if (!RUNTIME_CONTEXT.targeted) return;
  document.title = pageTitle;
  setMetaContent('meta[name="description"]', description);
  setMetaContent('meta[property="og:title"]', pageTitle);
  setMetaContent('meta[property="og:description"]', description);
  setMetaContent('meta[name="twitter:title"]', pageTitle);
  setMetaContent('meta[name="twitter:description"]', description);
}

const FOOTER_LINKS = CONTENT.footerLinks || {};
const FOOTER_SOCIALS = Array.isArray(CONTENT.socialLinks)
  ? CONTENT.socialLinks.filter((social) => social?.href && social.href !== "#")
  : [];
const HOME_HREF = FOOTER_LINKS.home || "/amethyst/Homepage.html";
const TRADE_BOARD_HREF = FOOTER_LINKS.tradeBoard || "/amethyst/Trade.html";
const PANTRY_HREF = CONTENT.pantryPageUrl || "";
const JOIN_TEAM_HREF = FOOTER_LINKS.joinTeam || "";
const SHOP_HREF = CONTENT.shopUrl || FOOTER_LINKS.catalog || "#";

function ComingSoonNavItem({ label = "Join Team" }) {
  return (
    <span
      className="hp-header-link hp-header-link-disabled"
      aria-disabled="true"
      aria-label={`${label} coming soon`}
      title={`${label} is coming soon`}
    >
      <span>{label}</span>
      <span className="hp-coming-soon-badge" aria-hidden="true">Soon</span>
    </span>
  );
}

function ComingSoonFooterItem({ label = "Join Team" }) {
  return (
    <span className="hp-footer-coming-soon" aria-label={`${label} coming soon`}>
      {label}
      <span aria-hidden="true">Soon</span>
    </span>
  );
}

const PRESETS = {
  amethyst: {
    sparkleLevel: "glittery", bgTreatment: "confetti", cardSurface: "holographic",
    textureOverlay: "sparkle", buttonEnergy: "calm", ctaEmphasis: "standard",
    tradeFlair: "holo-unicorn", cursorEffect: "sparkle", saturation: 130,
    bgTone: "lavender", primaryColor: "#5C0EFF", accentColor: "#FF1AC2",
    headingFont: "italiana", bodyFont: "inter", headingWeight: 600,
  },
  sparkle_suite_morganite: {
    sparkleLevel: "subtle", bgTreatment: "suite-paper", cardSurface: "warm-paper",
    textureOverlay: "none", buttonEnergy: "suite-lift", ctaEmphasis: "standard",
    tradeFlair: "soft-pink-lift", cursorEffect: "default", saturation: 104,
    bgTone: "suiteBlush", primaryColor: "#ee2c9b", accentColor: "#ff4cae",
    headingFont: "playfair", bodyFont: "dmSans", headingWeight: 500,
  },
  black_diamond: {
    sparkleLevel: "glittery", bgTreatment: "black-velvet", cardSurface: "dark-metallic",
    textureOverlay: "sparkle", buttonEnergy: "diamond-lift", ctaEmphasis: "standard",
    tradeFlair: "cyan-diamond", cursorEffect: "default", saturation: 112,
    bgTone: "blackDiamond", primaryColor: "#d4af37", accentColor: "#00d9ff",
    headingFont: "playfair", bodyFont: "dmSans", headingWeight: 600,
  },
  moonstone: {
    sparkleLevel: "subtle", bgTreatment: "moonstone-charcoal", cardSurface: "silver-pearl",
    textureOverlay: "none", buttonEnergy: "moonstone-lift", ctaEmphasis: "standard",
    tradeFlair: "silver-violet", cursorEffect: "default", saturation: 108,
    bgTone: "moonstone", primaryColor: "#7c3aed", accentColor: "#cbd5e1",
    headingFont: "playfair", bodyFont: "dmSans", headingWeight: 600,
  },
  alpine_opal: {
    sparkleLevel: "glittery", bgTreatment: "alpine-opal", cardSurface: "frosted-opal",
    textureOverlay: "sparkle", buttonEnergy: "alpine-pop", ctaEmphasis: "standard",
    tradeFlair: "opal-summit", cursorEffect: "default", saturation: 112,
    bgTone: "alpineOpal", primaryColor: "#ec4899", accentColor: "#38bdf8",
    headingFont: "playfair", bodyFont: "dmSans", headingWeight: 600,
  },
  emerald_garden: {
    sparkleLevel: "subtle", bgTreatment: "emerald-garden", cardSurface: "spa-ivory",
    textureOverlay: "none", buttonEnergy: "garden-lift", ctaEmphasis: "standard",
    tradeFlair: "champagne-botanical", cursorEffect: "default", saturation: 104,
    bgTone: "emeraldGarden", primaryColor: "#059669", accentColor: "#E5D3B3",
    headingFont: "greatVibes", bodyFont: "lato", headingWeight: 400,
  },
  gnome_garden: {
    primaryColor: "#842421", accentColor: "#F4C45E", bgTone: "gnomeGarden",
    headingFont: "playfair", bodyFont: "dmSans", headingWeight: 600,
    shapeRadius: "soft", density: "regular", saturation: 100,
    heroMotion: "soft_glow", sparkleLevel: "subtle",
    bgTreatment: "gnome-garden", cardSurface: "storybook-parchment",
    textureOverlay: "fireflies", buttonEnergy: "lantern-lift", ctaEmphasis: "standard",
    tradeFlair: "mushroom-glow", cursorEffect: "default", tickerSpeed: 1,
  },
  neon_butterfly: {
    primaryColor: "#ff2acd", accentColor: "#ffc24a", bgTone: "neonButterfly",
    headingFont: "playfair", bodyFont: "dmSans", headingWeight: 600,
    shapeRadius: "soft", density: "regular", saturation: 112,
    heroMotion: "soft_glow", sparkleLevel: "subtle",
    bgTreatment: "neon-butterfly", cardSurface: "neon-velvet-glass",
    textureOverlay: "neon-butterflies", buttonEnergy: "neon-lift", ctaEmphasis: "standard",
    tradeFlair: "butterfly-glow", cursorEffect: "default", tickerSpeed: 1,
  },
  halloween_pumpkin_witch: {
    primaryColor: "#ff6a00", accentColor: "#f4eee3", bgTone: "halloweenPumpkinWitch",
    headingFont: "playfair", bodyFont: "dmSans", headingWeight: 600,
    shapeRadius: "soft", density: "regular", saturation: 112,
    heroMotion: "witch_flight", sparkleLevel: "glittery",
    bgTreatment: "halloween-pumpkin-witch", cardSurface: "midnight-glass",
    textureOverlay: "halloween-sparkles", buttonEnergy: "pumpkin-glow", ctaEmphasis: "standard",
    tradeFlair: "moonlit-bats", cursorEffect: "default", tickerSpeed: 1,
  },
  rose_gold: {
    sparkleLevel: "subtle", bgTreatment: "rose-gold-paper", cardSurface: "pearl-rose",
    textureOverlay: "none", buttonEnergy: "rose-gold-lift", ctaEmphasis: "standard",
    tradeFlair: "champagne-rose", cursorEffect: "default", saturation: 108,
    bgTone: "roseGold", primaryColor: "#e04f73", accentColor: "#f5c66d",
    headingFont: "playfair", bodyFont: "dmSans", headingWeight: 600,
  },
  garnet: {
    sparkleLevel: "subtle", bgTreatment: "garnet-shell", cardSurface: "blush-shell",
    textureOverlay: "none", buttonEnergy: "garnet-lift", ctaEmphasis: "standard",
    tradeFlair: "ruby-polish", cursorEffect: "default", saturation: 112,
    bgTone: "garnet", primaryColor: "#B91C1C", accentColor: "#920000",
    headingFont: "boska", bodyFont: "switzer", headingWeight: 600,
  },
  amber: {
    sparkleLevel: "subtle", bgTreatment: "amber-paper", cardSurface: "sunlit-pearl",
    textureOverlay: "none", buttonEnergy: "amber-pop", ctaEmphasis: "standard",
    tradeFlair: "citrine-glow", cursorEffect: "default", saturation: 116,
    bgTone: "amber", primaryColor: "#F97316", accentColor: "#761A00",
    headingFont: "melodrama", bodyFont: "nunito", headingWeight: 600,
  },
  velvet: {
    sparkleLevel: "glittery", bgTreatment: "velvet-orchid", cardSurface: "plush-orchid",
    textureOverlay: "sparkle", buttonEnergy: "velvet-lift", ctaEmphasis: "standard",
    tradeFlair: "orchid-gloss", cursorEffect: "default", saturation: 110,
    bgTone: "velvet", primaryColor: "#9333EA", accentColor: "#6300B9",
    headingFont: "bitter", bodyFont: "archivo", headingWeight: 600,
  },
  rose_quartz: {
    sparkleLevel: "glittery", bgTreatment: "quartz-paper", cardSurface: "pink-quartz",
    textureOverlay: "sparkle", buttonEnergy: "quartz-pop", ctaEmphasis: "standard",
    tradeFlair: "pink-spark", cursorEffect: "default", saturation: 114,
    bgTone: "roseQuartz", primaryColor: "#E879F9", accentColor: "#63146E",
    headingFont: "sharpie", bodyFont: "ranade", headingWeight: 600,
  },
};

const TONES = {
  lavender: { bg: "#E8DFF5", elevated: "#F2EBFA", deep: "#DCD0EE" },
  warm: { bg: "#FFF0E8", elevated: "#FFF7F1", deep: "#FFE2D0" },
  cool: { bg: "#E0EBFF", elevated: "#EEF3FF", deep: "#CFDFFF" },
  paper: { bg: "#FAF7F2", elevated: "#FFFFFF", deep: "#F0EAE0" },
  midnight: { bg: "#1A0F2E", elevated: "#241640", deep: "#100828" },
  neon: { bg: "#FFE6FA", elevated: "#FFF0FD", deep: "#FFD1F2" },
  suiteBlush: { bg: "#fcf8f6", elevated: "#fffefd", deep: "#f6ede8" },
  blackDiamond: { bg: "#080808", elevated: "#15110f", deep: "#030303" },
  moonstone: { bg: "#15121d", elevated: "#211b2c", deep: "#0d0b13" },
  alpineOpal: { bg: "#fdf2f8", elevated: "#f0f9ff", deep: "#1e1b4b" },
  emeraldGarden: { bg: "#f8f7f0", elevated: "#ffffff", deep: "#dfe9dd" },
  gnomeGarden: { bg: "#173126", elevated: "#FFF3D6", deep: "#102319" },
  neonButterfly: { bg: "#120414", elevated: "#261029", deep: "#09010c" },
  halloweenPumpkinWitch: { bg: "#090909", elevated: "#211914", deep: "#050505" },
  roseGold: { bg: "#fff5f6", elevated: "#fffafa", deep: "#ffe8ec" },
  garnet: { bg: "#FFE5DD", elevated: "#fff8f5", deep: "#ffd0c4" },
  amber: { bg: "#FAFAFA", elevated: "#fffaf5", deep: "#ffe4cf" },
  velvet: { bg: "#FFE8FF", elevated: "#fff7ff", deep: "#f7c9ff" },
  roseQuartz: { bg: "#FAFAFA", elevated: "#fff7ff", deep: "#ffd8ff" },
};

const FONTS = {
  vend: '"Vend Sans", "Inter", system-ui, sans-serif',
  inter: '"Inter", system-ui, sans-serif',
  serif: '"Fraunces", "Domine", Georgia, serif',
  italiana: '"Italiana", "Playfair Display", serif',
  playfair: '"Playfair Display", Georgia, serif',
  dmSans: '"DM Sans", "Inter", system-ui, sans-serif',
  greatVibes: '"Great Vibes", "Playfair Display", cursive',
  lato: '"Lato", "DM Sans", "Inter", system-ui, sans-serif',
  boska: '"Boska", "Playfair Display", Georgia, serif',
  switzer: '"Switzer", "DM Sans", "Inter", system-ui, sans-serif',
  melodrama: '"Melodrama", "Playfair Display", Georgia, serif',
  nunito: '"Nunito", "DM Sans", system-ui, sans-serif',
  bitter: '"Bitter", Georgia, serif',
  archivo: '"Archivo", "DM Sans", system-ui, sans-serif',
  sharpie: '"Sharpie", "Quicksand", system-ui, sans-serif',
  ranade: '"Ranade", "Nunito", system-ui, sans-serif',
  bubbly: '"Quicksand", "Nunito", system-ui, sans-serif',
  chunky: '"Archivo Black", "Inter", sans-serif',
};

const COLLECTIONS = ["OG", "Birthday", "Spring Luxe", "Simply Studded", "Market Fresh", "Stacks"];
const TYPES = ["Ring", "Necklace", "Earrings", "Bracelet", "Pendant", "Stack"];
const MATERIALS = [
  "Sterling silver",
  "Triple-plated gold",
  "Nickel-free brass",
  "Gold vermeil",
  "Mixed alloy plating",
  "Silver-tone finish",
];
const STONES = ["Amethyst", "Opal", "Pearl", "Moonstone", "Citrine", "Topaz"];
const PIECE_NAMES = [
  "Halo Bloom Ring",
  "Velvet Hour Necklace",
  "Petal Drop Earrings",
  "Crescent Bracelet",
  "North Star Pendant",
  "Aurora Stack",
  "Lavender Tide Ring",
  "Birthday Spark Necklace",
  "Moon Petal Earrings",
  "Golden Glow Bracelet",
  "Starlight Pendant",
  "Rose Halo Stack",
];

const LIVE_QUEUE_NAMES = [
  "Jamie L.", "Priya M.", "Devon R.", "Carla J.", "Sophie A.", "Monique T.",
  "Riley B.", "Harper V.", "Tasha W.", "Megan C.", "Bailey H.", "Jordan P.",
  "Lindsey F.", "Cassie N.", "Avery D.", "Noelle K.", "Rae S.", "Mira T.",
  "Joelle G.", "Kelsey B.", "Danielle R.", "Heather M.", "Brittany J.", "Tori C.",
  "Amber L.", "Sadie P.", "Lauren E.", "Robin A.", "Faith D.", "Nicole V.",
];

const LIVE_QUEUE_ENTRIES = RUNTIME_CONTEXT.targeted ? [] : LIVE_QUEUE_NAMES.map((name, index) => ({
  position: index + 1,
  label:
    index === 0
      ? "Unboxing Now"
      : index === 1
        ? "On Deck"
        : index === 2
          ? "Up Next"
          : "In Lineup",
  name,
  highlight: index === 0,
  marker: index === 0 ? "?" : "",
}));

function buildSamples(count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    let tier = "everyday";
    if (i === 0) tier = "unicorn";
    else if (i === 1) tier = "diamond";

    const collection = COLLECTIONS[i % COLLECTIONS.length];
    const type = TYPES[i % TYPES.length];
    const material = MATERIALS[i % MATERIALS.length];
    const stone = STONES[i % STONES.length];
    const msrpBase = collection === "Birthday" ? 42 : collection === "OG" ? 39 : 48;
    out.push({
      id: i + 1,
      name: PIECE_NAMES[i % PIECE_NAMES.length] + (i >= PIECE_NAMES.length ? ` ${Math.floor(i / PIECE_NAMES.length) + 1}` : ""),
      tier,
      collection,
      type,
      material,
      stone,
      msrp: msrpBase + ((i * 7) % 18),
      size: type === "Ring" ? ["6", "7", "8", "9"][i % 4] : null,
      note: tier === "diamond"
        ? "Rare Diamond dancer - still item-for-item only."
        : tier === "unicorn"
          ? "Rare Unicorn dancer."
          : "Dance Floor dancer.",
      glyph: PIECE_NAMES[i % PIECE_NAMES.length].charAt(0),
      photoUrl: null,
    });
  }
  return out;
}

function normalizeBootstrapPiece(piece, index) {
  if (!piece || typeof piece !== "object") return null;

  const safeName = typeof piece.name === "string" && piece.name.trim()
    ? piece.name.trim()
    : `Dancer ${index + 1}`;
  const safeType = typeof piece.type === "string" && piece.type.trim()
    ? piece.type.trim()
    : "Jewelry";
  const safeTier = piece.tier === "diamond" || piece.tier === "unicorn" ? piece.tier : "everyday";
  const safeMsrp = typeof piece.msrp === "number" ? piece.msrp : null;

  return {
    id: piece.id || `bootstrap-${index + 1}`,
    name: safeName,
    collection: typeof piece.collection === "string" && piece.collection.trim()
      ? piece.collection.trim()
      : "Collection pending",
    type: safeType,
    material: typeof piece.material === "string" && piece.material.trim()
      ? piece.material.trim()
      : "Material pending",
    stone: typeof piece.stone === "string" && piece.stone.trim()
      ? piece.stone.trim()
      : "Stone pending",
    msrp: safeMsrp,
    size: typeof piece.size === "string" && piece.size.trim() ? piece.size.trim() : null,
    note: typeof piece.note === "string" && piece.note.trim()
      ? piece.note.trim()
      : "Item-for-item only. Requests must stay within the same collection and the same jewelry type.",
    glyph: typeof piece.glyph === "string" && piece.glyph.trim()
      ? piece.glyph.trim().charAt(0).toUpperCase()
      : safeName.charAt(0).toUpperCase(),
    tier: safeTier,
    photoUrl: typeof piece.photoUrl === "string" && piece.photoUrl.trim() ? piece.photoUrl.trim() : null,
  };
}

const EMPTY_FILTER_STATE = {
  collection: "all",
  type: "all",
  rarity: "all",
  material: "all",
  size: "all",
};

function getInitialTradeFilters() {
  if (typeof window === "undefined") {
    return EMPTY_FILTER_STATE;
  }

  const requestedCollection = new URLSearchParams(window.location.search).get("collection");
  if (!requestedCollection) {
    return EMPTY_FILTER_STATE;
  }

  return {
    ...EMPTY_FILTER_STATE,
    collection: requestedCollection,
  };
}

function deriveTradeBoardFilterOptions(listings) {
  const collections = new Set();
  const types = new Set();
  const materials = new Set();
  const sizes = new Set();
  const rarityTags = new Set();

  listings.forEach((listing) => {
    if (listing.collection) collections.add(listing.collection);
    if (listing.type) types.add(listing.type);
    if (listing.material) materials.add(listing.material);
    if (listing.size) sizes.add(listing.size);
    if (listing.tier === "diamond" || listing.tier === "unicorn") {
      rarityTags.add(listing.tier);
    }
  });

  const sortValues = (values) => [...values].sort((left, right) => left.localeCompare(right));

  return {
    collections: sortValues(collections),
    types: sortValues(types),
    materials: sortValues(materials),
    sizes: sortValues(sizes),
    rarityTags: sortValues(rarityTags),
  };
}

function filterCollectionOptions(collections, collectionSearch) {
  const query = collectionSearch.trim().toLowerCase();
  if (!query) return collections;
  return collections.filter((collection) => collection.toLowerCase().includes(query));
}

function filterTradeBoardListings(listings, filters) {
  return listings.filter((listing) => {
    if (filters.collection !== "all" && listing.collection !== filters.collection) return false;
    if (filters.type !== "all" && listing.type !== filters.type) return false;
    if (filters.rarity !== "all" && listing.tier !== filters.rarity) return false;
    if (filters.material !== "all" && listing.material !== filters.material) return false;
    if (filters.size !== "all" && listing.size !== filters.size) return false;
    return true;
  });
}

function normalizeTradeBoardSearch(value) {
  return String(value || "").trim().toLowerCase();
}

function searchableTradeBoardText(listing) {
  return [
    listing.name,
    listing.collection,
    listing.type,
    listing.material,
    listing.stone,
    listing.size ? `size ${listing.size}` : "",
    listing.tier,
    listing.note,
  ].filter(Boolean).join(" ").toLowerCase();
}

function searchTradeBoardListings(listings, boardSearch) {
  const terms = normalizeTradeBoardSearch(boardSearch).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return listings;

  return listings.filter((listing) => {
    const haystack = searchableTradeBoardText(listing);
    return terms.every((term) => haystack.includes(term));
  });
}

function compareTradeBoardText(left, right) {
  return String(left || "").localeCompare(String(right || ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function sortTradeBoardListings(listings, sortMode) {
  const sorted = [...listings];
  const rarityRank = { unicorn: 0, diamond: 1, everyday: 2 };
  const msrpValue = (piece) => (typeof piece.msrp === "number" ? piece.msrp : Number.MAX_SAFE_INTEGER);

  if (sortMode === "collection") {
    return sorted.sort((left, right) =>
      compareTradeBoardText(left.collection, right.collection) ||
      compareTradeBoardText(left.type, right.type) ||
      compareTradeBoardText(left.name, right.name)
    );
  }

  if (sortMode === "type") {
    return sorted.sort((left, right) =>
      compareTradeBoardText(left.type, right.type) ||
      compareTradeBoardText(left.collection, right.collection) ||
      compareTradeBoardText(left.name, right.name)
    );
  }

  if (sortMode === "rarity") {
    return sorted.sort((left, right) =>
      (rarityRank[left.tier] ?? 3) - (rarityRank[right.tier] ?? 3) ||
      compareTradeBoardText(left.name, right.name)
    );
  }

  if (sortMode === "msrp-low") {
    return sorted.sort((left, right) => msrpValue(left) - msrpValue(right) || compareTradeBoardText(left.name, right.name));
  }

  if (sortMode === "msrp-high") {
    return sorted.sort((left, right) => msrpValue(right) - msrpValue(left) || compareTradeBoardText(left.name, right.name));
  }

  if (sortMode === "name") {
    return sorted.sort((left, right) => compareTradeBoardText(left.name, right.name));
  }

  return sorted;
}

async function submitTradeRequestRequest(payload) {
  const hasScreenshot = payload.revealScreenshot instanceof File;
  const requestOptions = hasScreenshot
    ? (() => {
        const form = new FormData();
        form.append("listingId", payload.listingId);
        form.append("customerName", payload.customerName);
        form.append("customerDescription", payload.customerDescription);
        form.append("submissionId", payload.submissionId);
        form.append("revealScreenshot", payload.revealScreenshot);
        return {
          method: "POST",
          body: form,
        };
      })()
    : {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          listingId: payload.listingId,
          customerName: payload.customerName,
          customerDescription: payload.customerDescription,
          submissionId: payload.submissionId,
        }),
      };

  const response = await fetch(TRADE_REQUEST_ENDPOINT, requestOptions);

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(body?.error || DEFAULT_TRADE_REQUEST_ERROR);
    error.code = body?.code || null;
    throw error;
  }

  return body;
}

async function fetchTradeBoardListings() {
  const response = await fetch(TRADE_BOARD_ENDPOINT, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) return null;
  const body = await response.json().catch(() => null);
  return Array.isArray(body?.listings) ? body.listings : null;
}

function countActiveTradeBoardFilters(filters) {
  return Object.values(filters).filter((value) => value !== "all").length;
}

function rarityLabel(rarity) {
  if (rarity === "diamond") return "Diamond";
  if (rarity === "unicorn") return "Unicorn";
  return "Everyday";
}

function SparkleFx({ level }) {
  const counts = { none: 0, subtle: 8, glittery: 24, maximum: 60 };
  const n = counts[level] || 0;
  const sparkles = useMemo(() => {
    return Array.from({ length: n }, () => ({
      left: Math.random() * 100,
      delay: Math.random() * 4,
      duration: 3 + Math.random() * 3,
      size: 0.5 + Math.random() * 1.2,
    }));
  }, [n]);

  if (!n) return null;

  return (
    <div className="hp-fx-layer" aria-hidden="true">
      {sparkles.map((sparkle, index) => (
        <span
          key={index}
          className="hp-fx-sparkle"
          style={{
            left: `${sparkle.left}%`,
            bottom: -20,
            animationDelay: `${sparkle.delay}s`,
            animationDuration: `${sparkle.duration}s`,
            transform: `scale(${sparkle.size})`,
          }}
        />
      ))}
    </div>
  );
}

function Header({ businessName }) {
  return (
    <header className="hp-header">
      <div className="hp-header-inner">
        <div className="hp-brand">
          <div className="hp-brand-name slot" data-slot="business name">{businessName}</div>
          <div className="hp-brand-sub">
            <span className="hp-live-dot" aria-hidden="true"></span>
            Live jewelry reveals
          </div>
        </div>
        <nav className="hp-header-nav" aria-label="Primary">
          <a {...linkProps(HOME_HREF)} className="hp-header-link">Home</a>
          <a {...linkProps(TRADE_BOARD_HREF)} className="hp-header-link" aria-current="page">{isBrittWithBlingHybrid ? "Dance Floor · Coming soon" : "Dance Floor"}</a>
          {PANTRY_HREF ? <a {...linkProps(PANTRY_HREF)} className="hp-header-link">In the Pantry</a> : null}
          {JOIN_TEAM_HREF && (
            isBrittWithBlingHybrid || isBlingKitchenHybrid ? (
              <a {...linkProps(JOIN_TEAM_HREF)} className="hp-header-link">Join Team</a>
            ) : (
              <ComingSoonNavItem />
            )
          )}
        </nav>
        <a {...linkProps(SHOP_HREF)} className="hp-shop-btn">Shop live</a>
      </div>
    </header>
  );
}

const ANNOUNCEMENT_TICKER_SPEED_PPS = 46;
const TRADE_TICKER_SPEED_PPS = 55.2;
const EMPTY_TRADE_TICKER_ITEM = {
  name: "Dancers will appear here after the rep adds them to the Dance Floor.",
  type: "",
  collection: "",
  isEmpty: true,
};

function buildTickerLoopItems(items, minimumSegmentItems) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const copies = Math.max(1, Math.ceil(minimumSegmentItems / items.length));
  const segmentItems = Array.from({ length: copies }, () => items).flat();
  return [...segmentItems, ...segmentItems];
}

function syncDynamicTickerTracks() {
  document.querySelectorAll("[data-ticker-pps]").forEach((track) => {
    const first = track.querySelector("[data-ticker-segment-start='true']");
    const repeat = track.querySelector("[data-ticker-segment-repeat-start='true']");
    const pixelsPerSecond = Number(track.getAttribute("data-ticker-pps")) || ANNOUNCEMENT_TICKER_SPEED_PPS;
    if (!first || !repeat || pixelsPerSecond <= 0) return;

    const distance = repeat.offsetLeft - first.offsetLeft;
    if (!Number.isFinite(distance) || distance <= 0) return;

    track.style.setProperty("--hp-ticker-scroll-offset", `${distance * -1}px`);
    track.style.setProperty("--hp-ticker-dynamic-duration", `${distance / pixelsPerSecond}s`);
  });
}

function useDynamicTickerMotion() {
  useEffect(() => {
    let frame = 0;
    const timers = [];
    const scheduleSync = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(syncDynamicTickerTracks);
    };
    const scheduleDelayedSync = (delayMs) => {
      const timer = window.setTimeout(scheduleSync, delayMs);
      timers.push(timer);
    };
    const syncWhenVisible = () => {
      if (document.visibilityState === "visible") scheduleSync();
    };

    scheduleSync();
    [60, 250, 1000].forEach(scheduleDelayedSync);
    window.addEventListener("resize", scheduleSync);
    window.addEventListener("orientationchange", scheduleSync);
    window.addEventListener("pageshow", scheduleSync);
    document.addEventListener("visibilitychange", syncWhenVisible);
    document.fonts?.ready?.then(scheduleSync).catch(() => {});

    const observer = "ResizeObserver" in window ? new ResizeObserver(scheduleSync) : null;
    document.querySelectorAll("[data-ticker-pps]").forEach((track) => {
      observer?.observe(track);
      Array.from(track.children).forEach((child) => observer?.observe(child));
    });

    return () => {
      window.cancelAnimationFrame(frame);
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("resize", scheduleSync);
      window.removeEventListener("orientationchange", scheduleSync);
      window.removeEventListener("pageshow", scheduleSync);
      document.removeEventListener("visibilitychange", syncWhenVisible);
      observer?.disconnect();
    };
  }, []);
}

function parseAnnouncementTickerItems(topText) {
  return String(topText || "").split(/\n|\|/).map((item) => item.trim()).filter(Boolean).map((item) => {
    const parts = [];
    const linkPattern = /\[([^\]]+)\]\(([^()\s]+)\)/g;
    let cursor = 0;
    let match;

    while ((match = linkPattern.exec(item))) {
      if (match.index > cursor) parts.push({ text: item.slice(cursor, match.index), href: "" });
      try {
        const url = new URL(match[2], window.location.origin);
        parts.push(/^(https?):$/.test(url.protocol)
          ? { text: match[1], href: url.href }
          : { text: match[0], href: "" });
      } catch {
        parts.push({ text: match[0], href: "" });
      }
      cursor = match.index + match[0].length;
    }

    if (cursor < item.length) parts.push({ text: item.slice(cursor), href: "" });
    if (parts.length === 0) parts.push({ text: item, href: "" });
    return { text: parts.map((part) => part.text).join(""), parts };
  });
}

function Ticker({ topText }) {
  useDynamicTickerMotion();
  const items = parseAnnouncementTickerItems(topText);
  const contentTrades = Array.isArray(CONTENT.tradeBoardTickerItems)
    ? CONTENT.tradeBoardTickerItems
        .map((item) => ({
          name: runtimeText(item.name),
          type: runtimeText(item.type),
          collection: runtimeText(item.collection),
        }))
        .filter((item) => item.name)
    : [];
  const bootstrapTrades = BOOTSTRAP_LISTINGS
    .map((listing) => ({
      name: runtimeText(listing.name),
      type: runtimeText(listing.type),
      collection: runtimeText(listing.collection),
    }))
    .filter((item) => item.name);
  const fallbackTrades = [
    { name: "OG Halo Bloom Ring", type: "Ring", collection: "OG" },
    { name: "Birthday Spark Necklace", type: "Necklace", collection: "Birthday" },
    { name: "North Star Pendant", type: "Pendant", collection: "Spring Luxe" },
    { name: "Aurora Stack", type: "Stack", collection: "Stacks" },
  ];
  const trades = contentTrades.length > 0
    ? contentTrades
    : bootstrapTrades.length > 0
      ? bootstrapTrades
      : RUNTIME_CONTEXT.targeted ? [] : fallbackTrades;
  const announcementTickerItems = buildTickerLoopItems(items, 6);
  const announcementSegmentLength = announcementTickerItems.length / 2;
  const tradeTickerSource = isBrittWithBlingHybrid ? [{ name: "Digital Dance Floor coming soon", isEmpty: true }] : trades.length > 0 ? trades : [EMPTY_TRADE_TICKER_ITEM];
  const tickerTrades = buildTickerLoopItems(tradeTickerSource, 15);
  const tradeSegmentLength = tickerTrades.length / 2;

  return (
    <div className="hp-ticker" aria-label="Customer site updates">
      <div className="hp-ticker-sr">
        <p>Announcements: {items.map((item) => item.text).join("; ")}</p>
        {items.flatMap((item) => item.parts.filter((part) => part.href)).map((part, index) => (
          <a key={`${part.href}-${index}`} {...linkProps(part.href)}>{part.text}</a>
        ))}
        <a {...linkProps(TRADE_BOARD_HREF)}>{isBrittWithBlingHybrid ? "Digital Dance Floor coming soon" : "Browse current dance floor highlights"}</a>
      </div>
      <div className="hp-ticker-row">
        <span className="hp-ticker-label">Announcements</span>
        <div className="hp-ticker-track" data-ticker-pps={ANNOUNCEMENT_TICKER_SPEED_PPS} aria-hidden="true">
          {announcementTickerItems.map((item, index) => (
            <span key={index} className="hp-ticker-item" data-ticker-segment-start={index === 0 ? "true" : undefined} data-ticker-segment-repeat-start={index === announcementSegmentLength ? "true" : undefined}>
              <span className="dot" />
              {item.parts.map((part, partIndex) => part.href ? (
                <a key={partIndex} href={part.href} target="_blank" rel="noreferrer" className="hp-ticker-item-link">{part.text}</a>
              ) : part.text)}
            </span>
          ))}
        </div>
      </div>
      <div className="hp-ticker-row reverse">
        <span className="hp-ticker-label">Dance Floor</span>
        <div className="hp-ticker-track" data-ticker-pps={TRADE_TICKER_SPEED_PPS} aria-hidden="true">
          {tickerTrades.map((tr, index) => tr.isEmpty ? (
            <span
              key={index}
              className="hp-ticker-empty"
              data-ticker-segment-start={index === 0 ? "true" : undefined}
              data-ticker-segment-repeat-start={index === tradeSegmentLength ? "true" : undefined}
            >
              {tr.name}
            </span>
          ) : (
            <a
              key={index}
              {...linkProps(TRADE_BOARD_HREF)}
              className="hp-ticker-trade"
              data-ticker-segment-start={index === 0 ? "true" : undefined}
              data-ticker-segment-repeat-start={index === tradeSegmentLength ? "true" : undefined}
            >
              {tr.name} - {tr.type || "Jewelry"} - {tr.collection || "Collection pending"}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

const LiveLineupContext = React.createContext(null);
function LiveLineupUpdatedAt({ lineup }) {
  const updatedAt = Date.parse(lineup?.liveQueueLastUpdated);
  if (!Number.isFinite(updatedAt)) return null;
  return (
    <time
      className="hp-trade-preview-updated"
      dateTime={new Date(updatedAt).toISOString()}
      title={new Date(updatedAt).toLocaleString()}
    >
      Updated {new Date(updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
    </time>
  );
}

function LiveLineupProvider({ children }) {
  const [lineup, setLineup] = React.useState(() => RUNTIME_CONTEXT.targeted ? CONTENT : null);
  React.useEffect(() => {
    if (!RUNTIME_CONTEXT.targeted || !window.SparkleLiveLineup) return;
    return window.SparkleLiveLineup.start({
      url: withCurrentSearch("/api/amethyst/live-lineup"),
      initial: CONTENT,
      onUpdate: setLineup,
    });
  }, []);
  return <LiveLineupContext.Provider value={lineup}>{children}</LiveLineupContext.Provider>;
}

function LiveQueueStrip({ live, onOpen }) {
  const lineup = React.useContext(LiveLineupContext);
  const entries = lineup?.liveQueueEntries ?? LIVE_QUEUE_ENTRIES;
  const delayed = lineup?.liveQueueState === "delayed";
  if (entries.length === 0) {
    return (
      <section className="hp-trade-preview">
        <div className="hp-trade-preview-inner">
          <div className="hp-trade-preview-head">
            <span className="live-dot" style={{ background: "var(--fg-muted)" }} />
            <span>Live Lineup</span>
          </div>
          <div className="hp-trade-preview-items" style={{ color: "var(--fg-muted)" }}>
            {lineup?.liveQueueSummary || "Live Lineup is waiting for a recent update."}
          </div>
          <button type="button" className="hp-trade-preview-link" onClick={onOpen}>View full lineup</button>
          <LiveLineupUpdatedAt lineup={lineup} />
        </div>
      </section>
    );
  }

  return (
    <section className="hp-trade-preview">
      <div className="hp-trade-preview-inner">
        <div className="hp-trade-preview-head">
          <span className="live-dot" style={delayed ? { background: "var(--fg-muted)", animation: "none" } : undefined} />
          <span>Live Lineup</span>
        </div>
        <div className="hp-trade-preview-items">
          {entries.map((entry) => (
            <button key={entry.position} type="button" onClick={onOpen} className="hp-trade-preview-pill">
              <span className="pos">{entry.position}</span>
              <span className="meta">
                <span className="name">{entry.name}</span>
              </span>
            </button>
          ))}
        </div>
        <button type="button" className="hp-trade-preview-link" onClick={onOpen}>View full lineup</button>
        <LiveLineupUpdatedAt lineup={lineup} />
      </div>
    </section>
  );
}

function LiveQueueModal({ open, onClose, live }) {
  const lineup = React.useContext(LiveLineupContext);
  const entries = lineup?.liveQueueEntries ?? LIVE_QUEUE_ENTRIES;
  const dialogRef = useLiveLineupDialog(open, onClose);
  if (!open) return null;

  return (
    <div className="hp-queue-modal-mask" onClick={onClose}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="live-lineup-title" tabIndex={-1} className="hp-queue-modal" onClick={(event) => event.stopPropagation()}>
        <div className="hp-queue-modal-head">
          <div>
            <div className="hp-queue-modal-eyebrow">Live Lineup</div>
            <h2 id="live-lineup-title" className="hp-queue-modal-title">
              {entries.length ? "Full lineup" : "Live Lineup"}
            </h2>
          </div>
          <button type="button" className="hp-queue-modal-close" onClick={onClose} aria-label="Close queue">
            &times;
          </button>
        </div>
        {entries.length > 0 && <p className="hp-lineup-status">{lineup?.liveQueueSummary}</p>}
        {entries.length > 0 ? (
          <div className="hp-queue-modal-list">
            {entries.map((entry) => (
              <div key={entry.position} className={`hp-queue-modal-row ${entry.highlight ? "now" : ""}`}>
                <span className="pos">{entry.position}</span>
                <div className="meta">
                  <span className="name">{entry.name}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="hp-queue-modal-empty">
            {lineup?.liveQueueSummary || "Live Lineup is waiting for a recent update."}
          </div>
        )}
      </div>
    </div>
  );
}

function GnomeGardenDecoration() {
  const [paused, setPaused] = useState(false);
  return (
    <div className="gg-decoration" data-paused={paused}>
      <GnomeGardenScene />
      <button type="button" className="gg-motion-control" aria-pressed={paused} onClick={() => setPaused((current) => !current)}>
        {paused ? "Resume animation" : "Pause animation"}
      </button>
    </div>
  );
}

function GnomeGardenScene() {
  return (
    <div className="gg-scene" aria-hidden="true" style={{ pointerEvents: "none" }}>
      <span className="gg-lantern gg-lantern-left">
        <img src="/amethyst/skins/gnome-garden/lantern.webp" alt="" width="157" height="400" decoding="async" />
      </span>
      <span className="gg-lantern gg-lantern-right">
        <img src="/amethyst/skins/gnome-garden/lantern.webp" alt="" width="157" height="400" decoding="async" />
      </span>
      {Array.from({ length: 8 }, (_, index) => (
        <span className="gg-firefly" data-firefly-index={index + 1} key={index} />
      ))}
      <img className="gg-gnome" src="/amethyst/skins/gnome-garden/gnome.webp" alt="" width="347" height="640" decoding="async" />
    </div>
  );
}

function TradeHero({ tweakRepName, tweakHeroTitle, tweakHeroSub, gnomeGarden }) {
  return (
    <section className="tp-hero">
      {gnomeGarden && <GnomeGardenDecoration />}
      <div className="tp-hero-inner">
        <h1 className="tp-hero-title slot" data-slot="trade hero title">{tweakHeroTitle}</h1>
        <p className="tp-hero-sub slot" data-slot="trade hero sub">
          {tweakHeroSub} Browse what <span className="slot" data-slot="rep name">{tweakRepName}</span> has available, then request the closest fit you love.
        </p>
      </div>
    </section>
  );
}

function Filters({
  style,
  listings,
  resultCount,
  visibleCount,
  filters,
  setFilters,
  boardSearch,
  setBoardSearch,
  sortMode,
  setSortMode,
  collectionSearch,
  setCollectionSearch,
  secondaryOpen,
  setSecondaryOpen,
}) {
  const availableDancerCount = listings.reduce(
    (total, listing) => total + Math.max(0, Number(listing.quantityAvailable ?? 1)),
    0,
  );
  const options = useMemo(() => deriveTradeBoardFilterOptions(listings), [listings]);
  const visibleCollections = useMemo(
    () => filterCollectionOptions(options.collections, collectionSearch),
    [options.collections, collectionSearch],
  );
  const activeFilterCount = countActiveTradeBoardFilters(filters);
  const activeBoardControlCount =
    activeFilterCount + (boardSearch.trim() ? 1 : 0) + (sortMode !== "newest" ? 1 : 0);

  const setFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTER_STATE);
    setBoardSearch("");
    setSortMode("newest");
    setCollectionSearch("");
  };

  return (
    <div className={`tp-filters style-${style}`}>
      <div className="tp-filters-topline">
        <div>
          <div className="tp-mobile-filter-cue">Search or filter the Dance Floor</div>
          <div className="tp-filter-results">
            <strong>{availableDancerCount}</strong> available dancers
          </div>
          <div className="tp-board-showing">
            Showing {Math.min(visibleCount, resultCount)} of {resultCount} matches
          </div>
        </div>
        <div className="tp-filter-actions">
          {activeBoardControlCount > 0 && (
            <button type="button" className="tp-filter-link" onClick={clearFilters}>
              Clear filters
            </button>
          )}
          <button
            type="button"
            className={`tp-filter-toggle ${secondaryOpen ? "active" : ""}`}
            onClick={() => setSecondaryOpen((open) => !open)}
            aria-expanded={secondaryOpen}
            aria-controls="trade-filter-panel"
          >
            More filters
            {activeBoardControlCount > 0 && <span className="tp-filter-badge">{activeBoardControlCount}</span>}
          </button>
        </div>
      </div>

      <div className="tp-board-search-row">
        <label className="tp-board-search">
          <span>Search Dance Floor</span>
          <input
            type="search"
            value={boardSearch}
            onChange={(event) => setBoardSearch(event.target.value)}
            placeholder="Search by dancer, collection, size"
          />
        </label>
        <label className="tp-board-sort">
          <span>Sort dancers</span>
          <select value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
            <option value="newest">Newest added</option>
            <option value="collection">Collection</option>
            <option value="type">Jewelry type</option>
            <option value="rarity">Rare first</option>
            <option value="name">Dancer name</option>
            <option value="msrp-low">MSRP low to high</option>
            <option value="msrp-high">MSRP high to low</option>
          </select>
        </label>
      </div>

      <div className="tp-filter-primary-grid">
        <div className="tp-filters-row tp-filters-row-primary">
          <button
            type="button"
            className={`tp-filter-pill ${filters.type === "all" ? "active" : ""}`}
            onClick={() => setFilter("type", "all")}
          >
            All types
          </button>
          {options.types.map((type) => (
            <button
              key={type}
              type="button"
              className={`tp-filter-pill ${filters.type === type ? "active" : ""}`}
              onClick={() => setFilter("type", type)}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="tp-filters-row tp-filters-row-primary">
          <button
            type="button"
            className={`tp-filter-pill ${filters.rarity === "all" ? "active" : ""}`}
            onClick={() => setFilter("rarity", "all")}
          >
            All rarity
          </button>
          {options.rarityTags.map((rarity) => (
            <button
              key={rarity}
              type="button"
              className={`tp-filter-pill ${filters.rarity === rarity ? "active" : ""}`}
              onClick={() => setFilter("rarity", rarity)}
            >
              {rarityLabel(rarity)}
            </button>
          ))}
        </div>

        {options.collections.length > 0 && (
          <div className="tp-filters-row tp-filters-row-primary tp-filters-row-collections" aria-label="Filter by collection">
            {options.collections.map((collection) => (
              <button
                key={collection}
                type="button"
                className={`tp-filter-pill ${filters.collection === collection ? "active" : ""}`}
                onClick={() => setFilter("collection", collection)}
              >
                {collection}
              </button>
            ))}
          </div>
        )}
      </div>

      {secondaryOpen && (
        <div className="tp-filter-panel" id="trade-filter-panel">
          <div className="tp-filter-group">
            <div className="tp-filter-group-head">
              <h3>Collection</h3>
              <span>Search or browse</span>
            </div>
            <input
              type="search"
              value={collectionSearch}
              onChange={(event) => setCollectionSearch(event.target.value)}
              placeholder="Search collections"
              className="tp-filter-search"
            />
            <div className="tp-filter-chip-grid">
              <button
                type="button"
                className={`tp-filter-chip ${filters.collection === "all" ? "active" : ""}`}
                onClick={() => setFilter("collection", "all")}
              >
                All collections
              </button>
              {visibleCollections.map((collection) => (
                <button
                  key={collection}
                  type="button"
                  className={`tp-filter-chip ${filters.collection === collection ? "active" : ""}`}
                  onClick={() => setFilter("collection", collection)}
                >
                  {collection}
                </button>
              ))}
            </div>
          </div>

          <div className="tp-filter-grid">
            <div className="tp-filter-group">
              <div className="tp-filter-group-head">
                <h3>Material</h3>
                <span>Secondary filter</span>
              </div>
              <div className="tp-filter-chip-grid">
                <button
                  type="button"
                  className={`tp-filter-chip ${filters.material === "all" ? "active" : ""}`}
                  onClick={() => setFilter("material", "all")}
                >
                  All materials
                </button>
                {options.materials.map((material) => (
                  <button
                    key={material}
                    type="button"
                    className={`tp-filter-chip ${filters.material === material ? "active" : ""}`}
                    onClick={() => setFilter("material", material)}
                  >
                    {material}
                  </button>
                ))}
              </div>
            </div>

            {options.sizes.length > 0 && (
              <div className="tp-filter-group">
                <div className="tp-filter-group-head">
                  <h3>Size</h3>
                  <span>When applicable</span>
                </div>
                <div className="tp-filter-chip-grid">
                  <button
                    type="button"
                    className={`tp-filter-chip ${filters.size === "all" ? "active" : ""}`}
                    onClick={() => setFilter("size", "all")}
                  >
                    All sizes
                  </button>
                  {options.sizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      className={`tp-filter-chip ${filters.size === size ? "active" : ""}`}
                      onClick={() => setFilter("size", size)}
                    >
                      Size {size}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TradeCard({ piece, onTap, repName, tierVisible }) {
  const showTier = piece.tier !== "everyday" || tierVisible === "all";
  const tierLabel = piece.tier === "unicorn" ? "Unicorn" : piece.tier === "diamond" ? "Diamond" : "Everyday";

  return (
    <article className={`tp-card ${piece.tier}`} onClick={() => onTap(piece)}>
      <div className={`tp-card-photo slot ${piece.photoUrl ? "has-photo" : ""}`} data-slot="jewelry photo">
        {showTier && (
          <span className={`tp-card-tier ${piece.tier}`}>
            <span className="pip" />
            {tierLabel}
          </span>
        )}
        {piece.photoUrl ? (
          <img className="tp-card-photo-img" src={piece.photoUrl} alt={piece.name} loading="lazy" decoding="async" />
        ) : (
          <div className="photo-glyph">{piece.glyph}</div>
        )}
      </div>
      <div className="tp-card-body">
        <div className="tp-card-collection">{piece.collection}</div>
        <h3 className="tp-card-name slot" data-slot="design name">{piece.name}</h3>
        <div className="tp-card-meta">
          <span>{piece.type}{piece.size ? ` - Size ${piece.size}` : ""}</span>
          <span className="tp-card-msrp">Bomb Party MSRP <strong>{piece.msrp === null ? "TBD" : `$${piece.msrp}`}</strong></span>
        </div>
        <div className="tp-card-quantity">{Math.max(0, Number(piece.quantityAvailable ?? 1))} available</div>
        <div className="tp-card-material">{piece.material} · {piece.stone}</div>
        <div className="tp-card-rep slot" data-slot="brand separation">
          Offered by <strong>{repName}</strong>, an Independent Bomb Party Representative.
        </div>
      </div>
    </article>
  );
}

function ExpandedCard({ piece, onClose, onWantThis, repName }) {
  if (!piece) return null;

  const tierLabel = piece.tier === "unicorn"
    ? "Unicorn"
    : piece.tier === "diamond"
      ? "Diamond"
      : "Everyday";

  return (
    <div className="tp-card-expand-mask" onClick={onClose}>
      <div className="tp-card-expand" onClick={(event) => event.stopPropagation()}>
        <button className="tp-card-close" onClick={onClose} aria-label="Close">&times;</button>
        <div className={`tp-card-expand-photo slot ${piece.photoUrl ? "has-photo" : ""}`} data-slot="jewelry photo">
          {piece.photoUrl ? (
            <img className="tp-card-expand-photo-img" src={piece.photoUrl} alt={piece.name} loading="lazy" decoding="async" />
          ) : (
            <div className="photo-glyph">{piece.glyph}</div>
          )}
        </div>
        <div className="tp-card-expand-body">
          <span className={`tp-card-tier ${piece.tier} tp-card-expand-tier`}>
            <span className="pip" />
            {tierLabel}
          </span>
          <div className="tp-card-expand-collection">{piece.collection} collection</div>
          <h2 className="tp-card-expand-name slot" data-slot="design name">{piece.name}</h2>
          <p className="tp-card-expand-desc slot" data-slot="description">
            This {piece.type.toLowerCase()} can be requested as an item-for-item trade if the item number just revealed for you stays within the same collection and the same jewelry type.
          </p>
          <dl className="tp-card-expand-specs">
            <div>
              <dt>Collection</dt>
              <dd>{piece.collection}</dd>
            </div>
            <div>
              <dt>Jewelry type</dt>
              <dd>{piece.type}{piece.size ? ` - Size ${piece.size}` : ""}</dd>
            </div>
            <div>
              <dt>Material</dt>
              <dd>{piece.material}</dd>
            </div>
            <div>
              <dt>Main stone</dt>
              <dd>{piece.stone}</dd>
            </div>
            <div>
              <dt>Bomb Party MSRP</dt>
              <dd>{piece.msrp === null ? "TBD" : `$${piece.msrp}`} (reference only)</dd>
            </div>
            <div>
              <dt>Available</dt>
              <dd>{Math.max(0, Number(piece.quantityAvailable ?? 1))}</dd>
            </div>
          </dl>
          <div className="tp-card-expand-box slot" data-slot="reveal box photo">
            <div className="thumb">BOX</div>
            <div>{piece.note}</div>
          </div>
          <div className="tp-card-expand-rep slot" data-slot="brand separation">
            Offered by <strong>{repName}</strong>, an Independent Bomb Party Representative. No money difference and no credit are part of this Dance Floor trade.
          </div>
          <button className="tp-card-expand-cta" onClick={() => onWantThis(piece)}>
            Request this trade
            <span>?</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function RequestSheet({ piece, onClose, onSubmit, success, pending, error, repName }) {
  const [name, setName] = useState("");
  const [offering, setOffering] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotError, setScreenshotError] = useState("");
  const [submissionId, setSubmissionId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    setName("");
    setOffering("");
    setScreenshot(null);
    setScreenshotError("");
    setSubmissionId(crypto.randomUUID());
  }, [piece?.id, success]);

  const trimmedName = name.trim();
  const trimmedOffering = offering.trim();
  const canSubmit = Boolean(trimmedName && trimmedOffering && !screenshotError && !pending);

  if (!piece && !success) return null;

  if (success) {
    return (
      <div className="tp-sheet-mask" onClick={pending ? undefined : onClose}>
        <div className="tp-sheet success" onClick={(event) => event.stopPropagation()}>
          <button className="tp-sheet-close" onClick={onClose} aria-label="Close" disabled={pending}>&times;</button>
          <div className="tp-sheet-handle" />
          <div className="tp-sheet-success-icon">&#10003;</div>
          <h3 className="tp-sheet-success-title">Request sent.</h3>
          <p className="tp-sheet-success-body">
            <strong>{repName}</strong> will review your match after the show and follow up directly.
          </p>
          <p className="tp-sheet-success-legal">
            This trade is solely between you and <strong>{repName}</strong>, an Independent Bomb Party Representative. The platform does not verify condition, authenticity, or value.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="tp-sheet-mask" onClick={pending ? undefined : onClose}>
      <div className="tp-sheet" onClick={(event) => event.stopPropagation()}>
        <button className="tp-sheet-close" onClick={onClose} aria-label="Close" disabled={pending}>&times;</button>
        <div className="tp-sheet-handle" />
        <div className="tp-sheet-eyebrow">Trade Request</div>
        <h3 className="tp-sheet-title">{piece.name}</h3>
        <div className="tp-sheet-piece">
          {piece.collection} - {piece.type}{piece.size ? ` - Size ${piece.size}` : ""}
        </div>
        <p className="tp-sheet-helper">
          Briefly describe the dancer you just revealed for <strong>{repName}</strong>. Include the collection and jewelry type if you know them.
        </p>
        <form
          className="tp-sheet-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit) return;
            onSubmit({
              listingId: piece.id,
              customerName: trimmedName,
              customerDescription: trimmedOffering,
              submissionId,
              revealScreenshot: screenshot,
            });
          }}
        >
          <div className="tp-sheet-field">
            <label>Your name</label>
            <input
              type="text"
              placeholder="As shown on your reveal"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              required
            />
          </div>
          <div className="tp-sheet-field">
            <label>What did you just reveal?</label>
            <textarea
              placeholder="Example: July Birthday 2026 necklace"
              value={offering}
              onChange={(event) => setOffering(event.target.value)}
              maxLength={1000}
              required
            />
          </div>
          <div className="tp-sheet-field">
            <label>Screenshot of your reveal (recommended)</label>
            <div className="tp-sheet-upload">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  setScreenshotError("");
                  setScreenshot(null);
                  if (!file) return;
                  if (!TRADE_REQUEST_SCREENSHOT_TYPES.has(file.type)) {
                    setScreenshotError("Please upload a JPG, PNG, or WebP screenshot.");
                    event.target.value = "";
                    return;
                  }
                  if (file.size > TRADE_REQUEST_SCREENSHOT_MAX_BYTES) {
                    setScreenshotError("Please upload a screenshot under 8 MB.");
                    event.target.value = "";
                    return;
                  }
                  setScreenshot(file);
                }}
                disabled={pending}
              />
              <div>
                <strong>{screenshot ? screenshot.name : "Add a screenshot"}</strong>
                <span>
                  A screenshot helps the rep confirm the dancer quickly. It expires after 48 hours.
                </span>
              </div>
            </div>
            {screenshotError && (
              <div className="tp-sheet-error" role="alert">
                {screenshotError}
              </div>
            )}
          </div>
          {error && (
            <div className="tp-sheet-error" role="alert">
              {error}
            </div>
          )}
          <button type="submit" className="tp-sheet-submit" disabled={!canSubmit}>
            {pending ? "Submitting..." : "Submit trade request"}
          </button>
        </form>
      </div>
    </div>
  );
}

function EmptyState({ repName }) {
  return (
    <div className="tp-empty">
      <div className="tp-empty-glyph">?</div>
      <h3 className="tp-empty-title">{isBrittWithBlingHybrid ? "Digital Dance Floor coming soon" : "Dance Floor is empty right now."}</h3>
      <p className="tp-empty-sub">
          <strong>{repName}</strong> adds dancers after live reveals. Check back after the next show for fresh one-for-one trade options.
      </p>
      <div className="tp-empty-next">
        <span className="live-dot" />
        Dancers will appear after this rep adds them to the Dance Floor.
      </div>
    </div>
  );
}

function NoMatchesState({ onClear }) {
  return (
    <div className="tp-empty">
      <div className="tp-empty-glyph">?</div>
          <h3 className="tp-empty-title">No dancers match these filters.</h3>
      <p className="tp-empty-sub">
        Try a different collection, jewelry type, rarity tag, or material mix to widen the Dance Floor again.
      </p>
      <button type="button" className="tp-empty-reset" onClick={onClear}>
        Clear filters
      </button>
    </div>
  );
}

function Footer({ businessName }) {
  return (
    <footer className="hp-footer">
      <div className="hp-footer-inner">
        <div>
          <div className="hp-footer-brand slot" data-slot="business name">{businessName}</div>
          <p className="hp-footer-tag">{CONTENT.footerTagline || "Live jewelry reveals every Tuesday at 8pm CST. Real jewelry, real sparkle."}</p>
          {CONTENT.memberTeamName ? (
            <p className="hp-footer-team">Proud member of the {CONTENT.memberTeamName} team</p>
          ) : null}
          <div className="hp-footer-socials">
            {FOOTER_SOCIALS.map((social) => (
              <a
                key={social.shortLabel}
                {...linkProps(social.href)}
                className="hp-footer-social"
                aria-label={social.label}
                title={social.label}
              >
                <SocialLogo {...social} />
              </a>
            ))}
          </div>
        </div>
        <div className="hp-footer-col">
          <ul>
            <li><a {...linkProps(HOME_HREF)}>Home</a></li>
            <li><a {...linkProps(TRADE_BOARD_HREF)}>{isBrittWithBlingHybrid ? "Dance Floor · Coming soon" : "Dance Floor"}</a></li>
            {PANTRY_HREF && <li><a {...linkProps(PANTRY_HREF)}>In the Pantry</a></li>}
            {JOIN_TEAM_HREF && <li><a {...linkProps(JOIN_TEAM_HREF)}>Join Team</a></li>}
          </ul>
        </div>
        <div className="hp-footer-col">
          <ul>
            <li><span className="hp-footer-coming-soon">FAQ · Coming soon</span></li>
          </ul>
        </div>
      </div>
      <div className="hp-footer-bottom">
        <div className="legal-row">
          <span>&copy; 2026 {businessName} - Powered by Sparkle Suite</span>
          <span>
            <a {...linkProps(FOOTER_LINKS.privacy || "#faq")}>Privacy</a> -{" "}
            <a {...linkProps(FOOTER_LINKS.terms || "#faq")}>Terms</a> -{" "}
            <a {...linkProps(FOOTER_LINKS.accessibility || "#faq")}>Accessibility</a>
          </span>
        </div>
        <p>{CONTENT.legalDisclaimer || "Trades are private agreements between the customer and the rep. Bomb Party MSRP is shown for reference only and does not drive trade eligibility."}</p>
      </div>
    </footer>
  );
}

function App() {
  const [t, setTweak] = useTweaks(DEFAULTS);
  const [expanded, setExpanded] = useState(null);
  const [requesting, setRequesting] = useState(null);
  const [success, setSuccess] = useState(false);
  const [requestPending, setRequestPending] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [submittedListingIds, setSubmittedListingIds] = useState([]);
  const [liveListings, setLiveListings] = useState(BOOTSTRAP_LISTINGS);
  const [filters, setFilters] = useState(getInitialTradeFilters);
  const [boardSearch, setBoardSearch] = useState("");
  const [sortMode, setSortMode] = useState("newest");
  const [visibleCount, setVisibleCount] = useState(BOARD_PAGE_SIZE);
  const [collectionSearch, setCollectionSearch] = useState("");
  const [secondaryFiltersOpen, setSecondaryFiltersOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const repName = publicRepName(t.repName);

  useEffect(() => {
    applyTargetedMetadata(
      `${t.businessName} - Dance Floor`,
      `Browse available dancers from ${t.businessName}'s Dance Floor.`,
    );
  }, [t.businessName]);

  const bootstrappedListings = useMemo(
    () => liveListings.map(normalizeBootstrapPiece).filter(Boolean),
    [liveListings],
  );
  const samples = useMemo(() => {
    if (bootstrappedListings.length > 0) {
      return bootstrappedListings.slice(0, t.cardCount);
    }

    if (RUNTIME_CONTEXT.targeted) return [];

    return buildSamples(t.cardCount);
  }, [bootstrappedListings, t.cardCount]);
  const availableSamples = useMemo(
    () => samples.filter((piece) => !submittedListingIds.includes(piece.id)),
    [samples, submittedListingIds],
  );
  const availableSamplesRef = useRef(availableSamples);
  availableSamplesRef.current = availableSamples;
  const filteredByFacets = useMemo(
    () => filterTradeBoardListings(availableSamples, filters),
    [availableSamples, filters],
  );
  const filtered = useMemo(
    () => sortTradeBoardListings(searchTradeBoardListings(filteredByFacets, boardSearch), sortMode),
    [filteredByFacets, boardSearch, sortMode],
  );
  const visibleTradeBoardPieces = filtered.slice(0, visibleCount);
  const hasMoreTradeBoardPieces = visibleCount < filtered.length;

  useEffect(() => {
    setVisibleCount(BOARD_PAGE_SIZE);
  }, [filters, boardSearch, sortMode, availableSamples.length]);

  useEffect(() => {
    if (t.demoSheet === "form") {
      setRequesting(availableSamplesRef.current[0] || null);
      setSuccess(false);
      setRequestError("");
      setExpanded(null);
    } else if (t.demoSheet === "success") {
      setRequesting({ id: 0, name: "Saved sample request" });
      setSuccess(true);
      setRequestError("");
      setExpanded(null);
    } else {
      setRequesting(null);
      setSuccess(false);
      setRequestError("");
    }
  }, [t.demoSheet]);

  useEffect(() => {
    const root = document.documentElement;
    const tone = TONES[t.bgTone] || TONES.lavender;
    root.style.setProperty("--hp-primary", t.primaryColor);
    root.style.setProperty("--hp-accent", t.accentColor);
    root.style.setProperty("--hp-bg", tone.bg);
    root.style.setProperty("--hp-bg-elevated", tone.elevated);
    root.style.setProperty("--bg-deep", tone.deep);
    root.style.setProperty("--primary", t.primaryColor);
    root.style.setProperty("--accent", t.accentColor);
    root.style.setProperty("--hp-display-font", FONTS[t.headingFont] || FONTS.vend);
    root.style.setProperty("--hp-body-font", FONTS[t.bodyFont] || FONTS.vend);
    root.style.setProperty("--hp-heading-weight", t.headingWeight);
    root.style.setProperty("--hp-saturation", (t.saturation || 100) / 100);
    root.style.setProperty("--ticker-speed", t.tickerSpeed);
  }, [t]);

  useEffect(() => {
    const body = document.body;
    body.className = "tradepage";
    if (isMileHighFizzHybrid) body.classList.add("mile-high-fizz-trade");
    if (isBrittWithBlingHybrid) body.classList.add("britt-with-bling-trade");
    if (isBlingKitchenHybrid) body.classList.add("bling-kitchen-trade");
    if (t.showSlots) body.classList.add("slots-on");
    if (t.bgTreatment === "mesh") body.classList.add("bg-mesh");
    if (t.bgTreatment === "confetti") body.classList.add("fx-confetti");
    if (t.bgTreatment === "aurora") body.classList.add("fx-aurora");
    if (t.bgTreatment === "suite-paper") body.classList.add("bg-suite-paper");
    if (t.bgTreatment === "black-velvet") body.classList.add("bg-black-velvet");
    if (t.bgTreatment === "moonstone-charcoal") body.classList.add("bg-moonstone-charcoal");
    if (t.bgTreatment === "alpine-opal") body.classList.add("bg-alpine-opal");
    if (t.bgTreatment === "emerald-garden") body.classList.add("bg-emerald-garden");
    if (t.bgTreatment === "gnome-garden") body.classList.add("bg-gnome-garden");
    if (t.bgTreatment === "neon-butterfly") body.classList.add("bg-neon-butterfly");
    if (t.bgTreatment === "halloween-pumpkin-witch") body.classList.add("bg-halloween-pumpkin-witch");
    if (t.bgTreatment === "rose-gold-paper") body.classList.add("bg-rose-gold-paper");
    if (t.bgTreatment === "garnet-shell") body.classList.add("bg-garnet-shell");
    if (t.bgTreatment === "amber-paper") body.classList.add("bg-amber-paper");
    if (t.bgTreatment === "velvet-orchid") body.classList.add("bg-velvet-orchid");
    if (t.bgTreatment === "quartz-paper") body.classList.add("bg-quartz-paper");
    if (t.cardSurface === "glass") body.classList.add("surface-glass");
    if (t.cardSurface === "holographic") body.classList.add("fx-holographic");
    if (t.cardSurface === "warm-paper") body.classList.add("surface-warm-paper");
    if (t.cardSurface === "dark-metallic") body.classList.add("surface-dark-metallic");
    if (t.cardSurface === "silver-pearl") body.classList.add("surface-silver-pearl");
    if (t.cardSurface === "frosted-opal") body.classList.add("surface-frosted-opal");
    if (t.cardSurface === "spa-ivory") body.classList.add("surface-spa-ivory");
    if (t.cardSurface === "storybook-parchment") body.classList.add("surface-storybook-parchment");
    if (t.cardSurface === "neon-velvet-glass") body.classList.add("surface-neon-velvet-glass");
    if (t.cardSurface === "midnight-glass") body.classList.add("surface-midnight-glass");
    if (t.cardSurface === "pearl-rose") body.classList.add("surface-pearl-rose");
    if (t.cardSurface === "blush-shell") body.classList.add("surface-blush-shell");
    if (t.cardSurface === "sunlit-pearl") body.classList.add("surface-sunlit-pearl");
    if (t.cardSurface === "plush-orchid") body.classList.add("surface-plush-orchid");
    if (t.cardSurface === "pink-quartz") body.classList.add("surface-pink-quartz");
    if (t.textureOverlay === "grain") body.classList.add("tex-grain");
    if (t.textureOverlay === "sparkle") body.classList.add("tex-sparkle");
    if (t.textureOverlay === "fireflies") body.classList.add("tex-fireflies");
    if (t.textureOverlay === "neon-butterflies") body.classList.add("tex-neon-butterflies");
    if (t.buttonEnergy === "bouncy") body.classList.add("btn-bouncy");
    if (t.buttonEnergy === "wiggle") body.classList.add("btn-wiggle");
    if (t.buttonEnergy === "suite-lift") body.classList.add("btn-suite-lift");
    if (t.buttonEnergy === "diamond-lift") body.classList.add("btn-diamond-lift");
    if (t.buttonEnergy === "moonstone-lift") body.classList.add("btn-moonstone-lift");
    if (t.buttonEnergy === "alpine-pop") body.classList.add("btn-alpine-pop");
    if (t.buttonEnergy === "garden-lift") body.classList.add("btn-garden-lift");
    if (t.buttonEnergy === "lantern-lift") body.classList.add("btn-lantern-lift");
    if (t.buttonEnergy === "neon-lift") body.classList.add("btn-neon-lift");
    if (t.buttonEnergy === "rose-gold-lift") body.classList.add("btn-rose-gold-lift");
    if (t.buttonEnergy === "garnet-lift") body.classList.add("btn-garnet-lift");
    if (t.buttonEnergy === "amber-pop") body.classList.add("btn-amber-pop");
    if (t.buttonEnergy === "velvet-lift") body.classList.add("btn-velvet-lift");
    if (t.buttonEnergy === "quartz-pop") body.classList.add("btn-quartz-pop");
    if (t.ctaEmphasis === "pulse") body.classList.add("cta-pulse");
    if (t.tradeFlair === "holo-unicorn") body.classList.add("holo-unicorn");
    if (t.tradeFlair === "soft-pink-lift") body.classList.add("soft-pink-lift");
    if (t.tradeFlair === "cyan-diamond") body.classList.add("cyan-diamond");
    if (t.tradeFlair === "silver-violet") body.classList.add("silver-violet");
    if (t.tradeFlair === "opal-summit") body.classList.add("opal-summit");
    if (t.tradeFlair === "champagne-botanical") body.classList.add("champagne-botanical");
    if (t.tradeFlair === "mushroom-glow") body.classList.add("mushroom-glow");
    if (t.tradeFlair === "butterfly-glow") body.classList.add("butterfly-glow");
    if (t.tradeFlair === "champagne-rose") body.classList.add("champagne-rose");
    if (t.tradeFlair === "ruby-polish") body.classList.add("ruby-polish");
    if (t.tradeFlair === "citrine-glow") body.classList.add("citrine-glow");
    if (t.tradeFlair === "orchid-gloss") body.classList.add("orchid-gloss");
    if (t.tradeFlair === "pink-spark") body.classList.add("pink-spark");
    if (t.cursorEffect === "sparkle") body.classList.add("cursor-sparkle");
    if (t.density === "compact") body.classList.add("density-compact");
    if (t.density === "spacious") body.classList.add("density-spacious");
    if (t.shapeRadius === "sharp") body.classList.add("shape-sharp");
    if (t.shapeRadius === "soft") body.classList.add("shape-soft");
  }, [t]);

  const refreshTradeBoardListings = async () => {
    const listings = await fetchTradeBoardListings();
    if (listings) setLiveListings(listings);
  };

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "hidden") return;
      void refreshTradeBoardListings();
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshTradeBoardListings();
      }
    };

    refreshIfVisible();
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshIfVisible);
    const intervalId = window.setInterval(refreshIfVisible, TRADE_BOARD_REFRESH_MS);

    return () => {
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshIfVisible);
      window.clearInterval(intervalId);
    };
  }, []);

  const applyPreset = (presetName) => {
    const presetValues = PRESETS[presetName];
    if (!presetValues) return;
    setTweak({ preset: presetName, ...presetValues });
  };

  const live = t.liveState === "live";
  const isEmpty = t.contentState === "empty";
  const showNoMatches = !isEmpty && availableSamples.length > 0 && filtered.length === 0;
  const clearFilters = () => {
    setFilters(EMPTY_FILTER_STATE);
    setBoardSearch("");
    setSortMode("newest");
    setCollectionSearch("");
  };
  const handleTradeRequestSubmit = async (payload) => {
    setRequestPending(true);
    setRequestError("");

    try {
      await submitTradeRequestRequest(payload);
      await refreshTradeBoardListings();
      setSubmittedListingIds((current) =>
        current.includes(payload.listingId) ? current : [...current, payload.listingId],
      );
      setSuccess(true);
    } catch (error) {
      const isUnavailable =
        error?.code === "REQUEST_ALREADY_EXISTS" || error?.code === "LISTING_NOT_FOUND";
      if (isUnavailable) {
        setSubmittedListingIds((current) =>
          current.includes(payload.listingId) ? current : [...current, payload.listingId],
        );
      }
      setRequestError(error?.message || DEFAULT_TRADE_REQUEST_ERROR);
    } finally {
      setRequestPending(false);
    }
  };

  return (
    <>
      <SparkleFx level={t.sparkleLevel} />

      <div className={isMileHighFizzHybrid ? "mhf-trade-page" : isBrittWithBlingHybrid ? "bwb-trade-page" : isBlingKitchenHybrid ? "bk-trade-page" : ""}>
        <div className="hp-sticky-stack">
          <Header businessName={t.businessName} />
          {t.showTicker && <Ticker topText={t.tickerTopText} />}
          <LiveQueueStrip live={live} onOpen={() => setQueueOpen(true)} />
        </div>

        <div className={isMileHighFizzHybrid ? "hp-saturate mhf-trade-shell" : isBrittWithBlingHybrid ? "hp-saturate bwb-trade-shell" : isBlingKitchenHybrid ? "hp-saturate bk-trade-shell" : "hp-saturate"}>
          {t.showHero && (
            <TradeHero
              gnomeGarden={t.preset === "gnome_garden"}
              tweakRepName={repName}
              tweakHeroTitle={isBrittWithBlingHybrid ? "Digital Dance Floor coming soon" : t.tradeHeroTitle}
              tweakHeroSub={isBrittWithBlingHybrid ? "This feature is not in use for this show. Check back for updates." : redactPublicRepText(t.tradeHeroSub, t.repName)}
            />
          )}

          <div className={isMileHighFizzHybrid ? "mhf-trade-board-panel" : isBrittWithBlingHybrid ? "bwb-trade-board-panel" : isBlingKitchenHybrid ? "bk-trade-board-panel" : ""}>
            <section className="tp-board">
              <div className="tp-board-inner no-lrq">
                <div>
                  <Filters
                    style={t.filterStyle}
                    listings={availableSamples}
                    resultCount={filtered.length}
                    visibleCount={visibleTradeBoardPieces.length}
                    filters={filters}
                    setFilters={setFilters}
                    boardSearch={boardSearch}
                    setBoardSearch={setBoardSearch}
                    sortMode={sortMode}
                    setSortMode={setSortMode}
                    collectionSearch={collectionSearch}
                    setCollectionSearch={setCollectionSearch}
                    secondaryOpen={secondaryFiltersOpen}
                    setSecondaryOpen={setSecondaryFiltersOpen}
                  />
                  {isEmpty ? (
                    <div className="tp-grid-wrap"><EmptyState repName={repName} /></div>
                  ) : showNoMatches ? (
                    <div className="tp-grid-wrap"><NoMatchesState onClear={clearFilters} /></div>
                  ) : (
                    <div className="tp-grid-wrap">
                      <div className={`tp-grid aspect-${t.cardAspect}`}>
                        {visibleTradeBoardPieces.map((piece) => (
                          <TradeCard
                            key={piece.id}
                            piece={piece}
                            onTap={(selectedPiece) => setExpanded(selectedPiece)}
                            repName={repName}
                            tierVisible={t.tierVisibility}
                          />
                        ))}
                      </div>
                      <div className="tp-board-pagination">
                        <div className="tp-board-showing">
                          Showing {visibleTradeBoardPieces.length} of {filtered.length} dancers
                        </div>
                        {hasMoreTradeBoardPieces && (
                          <button
                            type="button"
                            className="tp-load-more"
                            onClick={() => setVisibleCount((count) => count + BOARD_PAGE_SIZE)}
                          >
                            Load more
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {t.showLegal && (
              <div className="tp-legal slot" data-slot="brand separation footer">
                {CONTENT.legalDisclaimer || "Trades are private agreements between the customer and the rep. Bomb Party MSRP is shown for reference only and does not drive trade eligibility."}
              </div>
            )}

            {t.showFooter && <Footer businessName={t.businessName} />}
          </div>
        </div>
      </div>

      <LiveQueueModal open={queueOpen} onClose={() => setQueueOpen(false)} live={live} />

      <ExpandedCard
        piece={expanded}
        onClose={() => setExpanded(null)}
        onWantThis={(piece) => {
          setExpanded(null);
          setRequesting(piece);
          setSuccess(false);
          setRequestError("");
        }}
        repName={repName}
      />

      <RequestSheet
        piece={requesting}
        onClose={() => {
          if (requestPending) return;
          setRequesting(null);
          setSuccess(false);
          setRequestError("");
          setTweak("demoSheet", "closed");
        }}
        onSubmit={handleTradeRequestSubmit}
        success={success}
        pending={requestPending}
        error={requestError}
        repName={repName}
      />

      <TweaksPanel title="Tweaks" subtitle="Tune the dance floor" defaultWidth={380}>
        <TweakSection title="Dance Floor" subtitle="Page-specific behavior">
          <TweakRadio
            label="Live state"
            value={t.liveState}
            onChange={(value) => setTweak("liveState", value)}
            options={[
              { value: "live", label: "Live show" },
              { value: "offline", label: "Offline" },
            ]}
          />
          <TweakRadio
            label="Content"
            value={t.contentState}
            onChange={(value) => setTweak("contentState", value)}
            options={[
              { value: "populated", label: "Populated" },
              { value: "empty", label: "Empty" },
            ]}
          />
          <TweakSlider
          label="Number of dancers"
            value={t.cardCount}
            onChange={(value) => setTweak("cardCount", value)}
            min={6}
            max={30}
            step={2}
          />
          <TweakRadio
            label="Card aspect"
            value={t.cardAspect}
            onChange={(value) => setTweak("cardAspect", value)}
            options={[
              { value: "portrait", label: "Portrait 4:5" },
              { value: "square", label: "Square" },
            ]}
          />
          <TweakRadio
            label="Tier labels"
            value={t.tierVisibility}
            onChange={(value) => setTweak("tierVisibility", value)}
            options={[
              { value: "rare", label: "Rare only" },
              { value: "all", label: "All tiers" },
            ]}
          />
          <TweakSelect
            label="Filter bar style"
            value={t.filterStyle}
            onChange={(value) => setTweak("filterStyle", value)}
            options={[
              { value: "pills", label: "Horizontal pills" },
              { value: "dropdowns", label: "Dropdowns" },
            ]}
          />
          <TweakRadio
            label="Demo: request sheet"
            value={t.demoSheet}
            onChange={(value) => setTweak("demoSheet", value)}
            options={[
              { value: "closed", label: "Closed" },
              { value: "form", label: "Form" },
              { value: "success", label: "Success" },
            ]}
          />
        </TweakSection>

        <TweakSection title="Flamboyance presets" subtitle="Snap a whole vibe in one click">
          <TweakRadio
            label="Preset"
            value={t.preset}
            onChange={applyPreset}
            options={[
              { value: "amethyst", label: "Amethyst" },
              { value: "sparkle_suite_morganite", label: "Sparkle Suite/Morganite" },
              { value: "black_diamond", label: "Black Diamond" },
              { value: "moonstone", label: "Moonstone" },
              { value: "alpine_opal", label: "Alpine Opal" },
              { value: "emerald_garden", label: "Emerald Garden" },
              { value: "gnome_garden", label: "Gnome Forest" },
              { value: "neon_butterfly", label: "Neon Butterfly" },
              { value: "halloween_pumpkin_witch", label: "Halloween Pumpkin and Witch" },
              { value: "rose_gold", label: "Rose Gold" },
              { value: "garnet", label: "Garnet" },
              { value: "amber", label: "Amber" },
              { value: "velvet", label: "Velvet" },
              { value: "rose_quartz", label: "Rose Quartz" },
            ]}
          />
        </TweakSection>

        <TweakSection title="Sparkle & motion">
          <TweakRadio
            label="Sparkle level"
            value={t.sparkleLevel}
            onChange={(value) => setTweak("sparkleLevel", value)}
            options={[
              { value: "none", label: "None" },
              { value: "subtle", label: "Subtle" },
              { value: "glittery", label: "Glittery" },
              { value: "maximum", label: "Max" },
            ]}
          />
          <TweakRadio
            label="Button energy"
            value={t.buttonEnergy}
            onChange={(value) => setTweak("buttonEnergy", value)}
            options={[
              { value: "calm", label: "Calm" },
              { value: "bouncy", label: "Bouncy" },
              { value: "wiggle", label: "Wiggle" },
            ]}
          />
          <TweakSlider
            label="Ticker speed"
            value={t.tickerSpeed}
            onChange={(value) => setTweak("tickerSpeed", value)}
            min={0.3}
            max={3}
            step={0.1}
          />
        </TweakSection>

        <TweakSection title="Background & texture">
          <TweakSelect
            label="Background treatment"
            value={t.bgTreatment}
            onChange={(value) => setTweak("bgTreatment", value)}
            options={[
              { value: "clean", label: "Clean" },
              { value: "mesh", label: "Gradient mesh" },
              { value: "confetti", label: "Confetti dots" },
              { value: "aurora", label: "Aurora hero" },
            ]}
          />
          <TweakSelect
            label="Card surface"
            value={t.cardSurface}
            onChange={(value) => setTweak("cardSurface", value)}
            options={[
              { value: "matte", label: "Matte" },
              { value: "glass", label: "Glass" },
              { value: "holographic", label: "Holographic" },
            ]}
          />
        </TweakSection>

        <TweakSection title="Color">
          <TweakSelect
            label="Background tone"
            value={t.bgTone}
            onChange={(value) => setTweak("bgTone", value)}
            options={[
              { value: "lavender", label: "Lavender" },
              { value: "warm", label: "Warm peach" },
              { value: "cool", label: "Cool blue" },
              { value: "paper", label: "Paper" },
              { value: "neon", label: "Neon pink" },
              { value: "midnight", label: "Midnight" },
            ]}
          />
          <TweakColor label="Primary" value={t.primaryColor} onChange={(value) => setTweak("primaryColor", value)} />
          <TweakColor label="Accent" value={t.accentColor} onChange={(value) => setTweak("accentColor", value)} />
        </TweakSection>

        <TweakSection title="Typography & shape">
          <TweakSelect
            label="Heading font"
            value={t.headingFont}
            onChange={(value) => setTweak("headingFont", value)}
            options={[
              { value: "vend", label: "Vend Sans" },
              { value: "serif", label: "Editorial serif" },
              { value: "italiana", label: "Glam serif" },
              { value: "bubbly", label: "Rounded" },
              { value: "chunky", label: "Chunky display" },
            ]}
          />
          <TweakSlider
            label="Heading weight"
            value={t.headingWeight}
            onChange={(value) => setTweak("headingWeight", value)}
            min={300}
            max={900}
            step={100}
          />
        </TweakSection>

        <TweakSection title="Section visibility">
          <TweakToggle label="Ticker" value={t.showTicker} onChange={(value) => setTweak("showTicker", value)} />
          <TweakToggle label="Page hero" value={t.showHero} onChange={(value) => setTweak("showHero", value)} />
          <TweakToggle label="Brand separation note" value={t.showLegal} onChange={(value) => setTweak("showLegal", value)} />
          <TweakToggle label="Footer" value={t.showFooter} onChange={(value) => setTweak("showFooter", value)} />
        </TweakSection>

        <TweakSection title="Copy sandbox">
          <TweakText label="Rep name" value={t.repName} onChange={(value) => setTweak("repName", value)} />
          <TweakText label="Business name" value={t.businessName} onChange={(value) => setTweak("businessName", value)} />
          <TweakText label="Ticker text" value={t.tickerTopText} onChange={(value) => setTweak("tickerTopText", value)} />
          <TweakText label="Hero title" value={t.tradeHeroTitle} onChange={(value) => setTweak("tradeHeroTitle", value)} />
          <TweakText label="Hero sub" value={t.tradeHeroSub} onChange={(value) => setTweak("tradeHeroSub", value)} />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<LiveLineupProvider><App /></LiveLineupProvider>);
