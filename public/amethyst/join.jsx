/* global React, ReactDOM */
const { useState, useEffect, useMemo } = React;

const {
  TweaksPanel, useTweaks,
  TweakSection, TweakSlider, TweakToggle, TweakRadio, TweakSelect,
  TweakColor, TweakText
} = window;

const DEFAULTS = window.JOIN_TWEAK_DEFAULTS || {
  teamName: "Sparkle by Sasha",
  repName: "Sasha",
  repCity: "Austin",
  repState: "Texas",
  businessName: "Sparkle by Sasha",
  teamMemberCount: 6,
  showPromo: true,
  promoText: "Check the official Bomb Party enrollment page for current starter-pack details and promotions.",
  heroTitle: "Welcome to Sparkle by Sasha",
  heroPitch: "Learn what it takes to become an independent rep, review the official requirements, and ask the team lead what support is currently available.",
  heroCtaText: "See starter packs",
  finalPitch: "Review the current official starter-pack options and enrollment requirements, then ask the team lead any questions before you decide.",
  bpReferralUrl: "https://bombparty.com/?ref=sparklebysasha",
  hasRecruitingLink: true,
  showTicker: true,
  showHero: true,
  showTeam: true,
  showWhy: true,
  showFaq: true,
  showFinalCta: true,
  showFooter: true,
  showNicNac: true,
  tickerTopText: "Live tonight · 8pm CST | Use code AMETHYST15 | Pre-orders close Friday | New Unicorn drops Tuesday",
  primaryColor: "#480DDF",
  accentColor: "#D209E3",
  bgTone: "lavender",
  headingFont: "italiana",
  bodyFont: "inter",
  headingWeight: 600,
  shapeRadius: "soft",
  density: "compact",
  saturation: 110,
  preset: "amethyst",
  sparkleLevel: "glittery",
  bgTreatment: "mesh",
  cardSurface: "holographic",
  textureOverlay: "sparkle",
  buttonEnergy: "calm",
  ctaEmphasis: "pulse",
  tradeFlair: "tier-glow",
  cursorEffect: "default",
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

function runtimeText(value) {
  return String(value || "").trim();
}

const CONTENT = window.AMETHYST_JOIN_TEMPLATE_DATA || {};
const RUNTIME_CONTEXT = window.AMETHYST_RUNTIME_CONTEXT || {};
const publicSiteSlug = runtimeText(RUNTIME_CONTEXT.publicSiteSlug).toLowerCase();
const runtimeRepTarget = runtimeText(RUNTIME_CONTEXT.repId).toLowerCase();
const isKellySparklyButterflies = RUNTIME_CONTEXT.targeted && (
  publicSiteSlug === "sparklybutterflies"
  || runtimeRepTarget === "sparklybutterflies.com"
  || runtimeRepTarget === "b5404543-b90a-41cf-85f6-4e6d1d576cfa"
);
const isHeatherBlingKitchen = RUNTIME_CONTEXT.targeted && (
  publicSiteSlug === "blingkitchen"
  || runtimeRepTarget === "theblingkitchen.com"
);
const isKimGoForTheBling = RUNTIME_CONTEXT.targeted && (
  publicSiteSlug === "goforthebling"
  || runtimeRepTarget === "goforthebling.com"
);
const isMileHighFizzHybrid = CONTENT.publicSiteVariant === "mile_high_fizz_hybrid";
const isBrittWithBlingHybrid = CONTENT.publicSiteVariant === "britt_with_bling_hybrid";
const isBlingKitchenHybrid = CONTENT.publicSiteVariant === "bling_kitchen_hybrid";

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

function isExternalHref(href) {
  return /^https?:\/\//.test(href || "");
}

function linkProps(href) {
  return isExternalHref(href)
    ? { href, target: "_blank", rel: "noreferrer noopener" }
    : { href: href || "#" };
}

function RecruitingAction({ enabled, href, className, unavailableText, children, ...props }) {
  if (!enabled || !href || href === "#") {
    return (
      <span className={className} aria-disabled="true" {...props}>
        {unavailableText}
      </span>
    );
  }
  return <a {...linkProps(href)} className={className} {...props}>{children}</a>;
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

function deriveInitials(name, fallback) {
  if (fallback) return fallback;
  const initials = (name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return initials || "?";
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

const FALLBACK_TEAM = [
  { name: "Lindsey", business: "Virtuous Sisters", initials: "L", state: "Texas", socialLinks: { tiktok: "#", website: "#" } },
  { name: "Mira", business: "Mira's Magic Box", initials: "M", state: "Georgia", socialLinks: { tiktok: "#", youtube: "#" } },
  { name: "Cassidy", business: "Cassidy Sparkle", initials: "C", state: "Florida", socialLinks: { tiktok: "#", website: "#" } },
  { name: "Rae", business: "Rae of Sunshine", initials: "R", state: "Arizona", socialLinks: { tiktok: "#" } },
  { name: "Tasha", business: "Tasha's Treasure", initials: "T", state: "Ohio", socialLinks: { tiktok: "#", website: "#", youtube: "#" } },
  { name: "Joelle", business: "Joelle Glows", initials: "J", state: "California", socialLinks: { tiktok: "#" } },
];

const TEAM_MEMBERS = (CONTENT.teamMembers && CONTENT.teamMembers.length > 0
  ? CONTENT.teamMembers
  : RUNTIME_CONTEXT.targeted
    ? []
    : FALLBACK_TEAM
).map((member) => ({
  ...member,
  initials: deriveInitials(member.name, member.initials),
  socialLinks: member.socialLinks || {},
}));

const FOOTER_LINKS = CONTENT.footerLinks || {};
const FOOTER_SOCIALS = Array.isArray(CONTENT.socialLinks)
  ? CONTENT.socialLinks.filter((social) => social?.href && social.href !== "#")
  : [];
const FACEBOOK_COMMUNITY_URL = FOOTER_SOCIALS.find((social) =>
  String(social?.label || "").toLowerCase().includes("facebook"),
)?.href || "";
const FAQ_ANSWERS = CONTENT.faqAnswers || {};
const REP_SOCIALS = CONTENT.repSocialLinks || {};
const HOME_HREF = FOOTER_LINKS.home || "/amethyst/Homepage.html";
const JOIN_HREF = FOOTER_LINKS.joinTeam || "/amethyst/Join.html";
const SHOP_HREF = CONTENT.shopUrl || DEFAULTS.bpReferralUrl || "#";
const TRADE_BOARD_HREF = FOOTER_LINKS.tradeBoard || "/amethyst/Trade.html";
const PANTRY_HREF = CONTENT.pantryPageUrl || "";
const FAQ_HREF = CONTENT.bombPartyFaqUrl || "https://bombparty.com";
const BP_IDS_HREF = CONTENT.bpIncomeDisclosureUrl || "https://bombpartyassets.blob.core.windows.net/exigoresourcelibraryassets/Rep%20Use%20Documents/Bomb%20Party_Income%20Disclosure%20Statement_2025%20%281%29.pdf";

function getLocationLabel(city, state) {
  const normalizedCity = (city || "").trim();
  const normalizedState = (state || "").trim();

  if (normalizedCity && normalizedState) {
    return `${normalizedCity}, ${normalizedState}`;
  }

  return normalizedCity || normalizedState || "";
}

const FALLBACK_TICKER_TRADES = [
  { name: "Citrine Sun Pendant", type: "Necklace", collection: "Birthday" },
  { name: "Rose Quartz Band", type: "Ring", collection: "OG" },
  { name: "Amethyst Halo Ring", type: "Ring", collection: "Birthday" },
  { name: "Pearl Drop Studs", type: "Earrings", collection: "OG" },
  { name: "Estate Sapphire Cluster", type: "Ring", collection: "Sterling Club" },
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
      ? "Unboxing now"
      : index === 1
        ? "On deck"
        : index === 2
          ? "Up next"
          : "In queue",
  name,
  highlight: index === 0,
}));

function SparkleFx({ level }) {
  const counts = { none: 0, subtle: 8, glittery: 24, maximum: 60 };
  const n = counts[level] || 0;
  const sparkles = useMemo(() => Array.from({ length: n }, () => ({
    left: Math.random() * 100,
    delay: Math.random() * 4,
    duration: 3 + Math.random() * 3,
    size: 0.5 + Math.random() * 1.2,
  })), [n]);
  if (!n) return null;
  return (
    <div className="hp-fx-layer" aria-hidden="true">
      {sparkles.map((s, i) => (
        <span key={i} className="hp-fx-sparkle" style={{
          left: `${s.left}%`,
          bottom: -20,
          animationDelay: `${s.delay}s`,
          animationDuration: `${s.duration}s`,
          transform: `scale(${s.size})`,
        }} />
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
          <a {...linkProps(TRADE_BOARD_HREF)} className="hp-header-link">{isBrittWithBlingHybrid ? "Dance Floor · Coming soon" : "Dance Floor"}</a>
          {PANTRY_HREF ? <a {...linkProps(PANTRY_HREF)} className="hp-header-link">In the Pantry</a> : null}
          <a {...linkProps(JOIN_HREF)} className="hp-header-link" aria-current="page">Join Team</a>
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
  const trades = contentTrades.length > 0 || RUNTIME_CONTEXT.targeted
    ? contentTrades
    : FALLBACK_TICKER_TRADES;
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

function LiveQueueStrip({ onOpen }) {
  const lineup = React.useContext(LiveLineupContext);
  const entries = lineup?.liveQueueEntries ?? LIVE_QUEUE_ENTRIES;
  const lineupState = lineup?.liveQueueState;
  const delayed = lineupState === "delayed";
  const current = lineupState === "live" || lineupState === "empty";
  if (entries.length === 0) {
    return (
      <section className="hp-trade-preview">
        <div className="hp-trade-preview-inner">
          <div className="hp-trade-preview-head">
            <span className="live-dot" style={!current ? { background: "var(--fg-muted)", animation: "none" } : undefined} />
            <span>Live Lineup{delayed ? " · Update delayed" : ""}</span>
          </div>
          <div className="hp-trade-preview-items">
            {lineup?.liveQueueSummary || "Live Lineup is waiting for a recent update."}
          </div>
          <button type="button" className="hp-trade-preview-link" onClick={onOpen}>View full lineup</button>
        </div>
      </section>
    );
  }

  return (
    <section className="hp-trade-preview">
      <div className="hp-trade-preview-inner">
        <div className="hp-trade-preview-head">
          <span className="live-dot" style={!current ? { background: "var(--fg-muted)", animation: "none" } : undefined} />
          <span>Live Lineup{delayed ? " · Update delayed" : ""}</span>
        </div>
        <div className="hp-trade-preview-items">
          {entries.slice(0, 4).map((entry) => (
            <button key={entry.position} type="button" onClick={onOpen} className="hp-trade-preview-pill">
              <span className="pos">{entry.position}</span>
              <span className="meta">
                <span className="name">{entry.name}</span>
              </span>
            </button>
          ))}
        </div>
        <button type="button" className="hp-trade-preview-link" onClick={onOpen}>View full lineup</button>
      </div>
    </section>
  );
}

function LiveQueueModal({ open, onClose }) {
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
            <h2 id="live-lineup-title" className="hp-queue-modal-title">Full lineup</h2>
          </div>
          <button type="button" className="hp-queue-modal-close" onClick={onClose} aria-label="Close Live Lineup">x</button>
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
          <div className="hp-queue-modal-empty">{lineup?.liveQueueSummary || "Live Lineup is waiting for a recent update."}</div>
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

function Hero({ teamName, title, pitch, ctaText, ctaUrl, hasRecruitingLink, showPromo, promoText, repName, locationLabel, gnomeGarden }) {
  return (
    <section className="jp-hero">
      {gnomeGarden && <GnomeGardenDecoration />}
      <div className="jp-hero-media slot" data-slot="hero photo" />
      <div className="jp-hero-inner">
        <div className="jp-hero-card">
          <div className="jp-hero-eyebrow">{isMileHighFizzHybrid ? "Join the Mile High Fizz Team" : "Join the team"}</div>
          {showPromo ? (
            <div className="jp-hero-promo slot" data-slot="current BP promo">
              <span className="pip" />
              <span>{promoText}</span>
            </div>
          ) : null}
          <h1 className="jp-hero-title slot" data-slot="team name headline">
            {title || <>Welcome to <span className="slot" data-slot="team name">{teamName}</span></>}
          </h1>
          <p className="jp-hero-pitch slot" data-slot="recruitment pitch">{pitch}</p>
          <p className="jp-hero-localized">
            Led by <span className="slot" data-slot="rep name">{repName}</span>{locationLabel ? <> in <span className="slot" data-slot="rep city and state">{locationLabel}</span></> : null}.
          </p>
          <div className="jp-hero-ctas">
            <RecruitingAction
              enabled={hasRecruitingLink}
              href={ctaUrl}
              className="hp-btn-primary hp-btn-sparkle solid-light slot"
              data-slot="CTA to BP referral page"
              unavailableText={`Ask ${repName} for current join details`}
            >
              {ctaText}
              <span className="spark" /><span className="spark" /><span className="spark" /><span className="spark" />
            </RecruitingAction>
            <a href="#why" className="hp-btn-outline" style={{ color: "white", borderColor: "rgba(255,255,255,0.4)" }}>Learn more</a>
          </div>
          <p className="jp-hero-compliance">
            Income results vary by sales, effort, and time. Review the{" "}
            <a {...linkProps(BP_IDS_HREF)}>Bomb Party Income Disclosure Statement</a>.
          </p>
        </div>
      </div>
    </section>
  );
}

function PinIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function SocialIcon({ kind }) {
  if (kind === "tt") return <span title="TikTok">TT</span>;
  if (kind === "fb") return <span title="Facebook">FB</span>;
  if (kind === "ig") return <span title="Instagram">IG</span>;
  if (kind === "web") {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z" />
      </svg>
    );
  }
  if (kind === "crown") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M2 19h20l-1-9-5 4-4-7-4 7-5-4-1 9zm0 2h20v2H2z" />
      </svg>
    );
  }
  if (kind === "yt") return <span title="YouTube">YT</span>;
  if (kind === "wn") return <span title="Whatnot">WN</span>;
  return null;
}

function TeamSocial({ href, label, kind }) {
  if (!href) return null;
  return (
    <a className="jp-team-social" {...linkProps(href)} aria-label={label}>
      <SocialIcon kind={kind} />
    </a>
  );
}

function TeamCard({ member, isLeader }) {
  const avatarLabel = member.imageAlt || member.name || "Team member";
  return (
    <article className={`jp-team-card ${isLeader ? "is-leader" : ""}`}>
      <div className="jp-team-avatar slot" data-slot={isLeader ? "rep headshot" : "team member headshot"}>
        {member.imageUrl ? (
          <img
            src={member.imageUrl}
            alt={avatarLabel}
            className={`jp-team-avatar-img ${member.imageClassName || ""}`}
          />
        ) : member.initials}
      </div>
      <div className="jp-team-business slot" data-slot="business name">{member.business}</div>
      <div className="jp-team-name slot" data-slot="first name">{member.name}</div>
      <div className="jp-team-location"><PinIcon /><span className="slot" data-slot="state">{member.state}</span></div>
      {member.bio ? <p className="jp-team-bio">{member.bio}</p> : null}
      <div className="jp-team-connect">
        <div className="jp-team-connect-label">Connect</div>
        <div className="jp-team-socials">
          <TeamSocial href={member.socialLinks?.tiktok} label="TikTok" kind="tt" />
          <TeamSocial href={member.socialLinks?.facebook} label="Facebook VIP" kind="fb" />
          <TeamSocial href={member.socialLinks?.instagram} label="Instagram" kind="ig" />
          <TeamSocial href={member.socialLinks?.website} label="Website" kind="web" />
          <TeamSocial href={member.socialLinks?.youtube} label="YouTube" kind="yt" />
          <TeamSocial href={member.socialLinks?.whatnot} label="Whatnot" kind="wn" />
        </div>
      </div>
    </article>
  );
}

function SpotCard({ ctaUrl, ctaText, hasRecruitingLink, repName }) {
  return (
    <article className="jp-team-card is-spot">
      <div className="jp-spot-glyph">+</div>
      <div className="jp-team-business" style={{ background: "none", color: "var(--hp-primary)", WebkitTextFillColor: "var(--hp-primary)" }}>Open Spot</div>
      <h3 className="jp-spot-title">This is Your Spot</h3>
      <p className="jp-spot-sub">Interested in joining? Review the official details and ask the team lead what support is currently available.</p>
      <RecruitingAction
        enabled={hasRecruitingLink}
        href={ctaUrl}
        className="jp-spot-btn slot"
        data-slot="CTA → BP referral page"
        unavailableText={`Ask ${repName} for current details`}
      >
        {ctaText}
      </RecruitingAction>
    </article>
  );
}

function TeamSection({ rep, members, ctaUrl, ctaText, hasRecruitingLink }) {
  const leaderAlreadyAppearsInRoster = members.some((member) =>
    member.name?.trim().toLowerCase() === rep.name?.trim().toLowerCase() &&
    member.business?.trim().toLowerCase() === rep.business?.trim().toLowerCase(),
  );

  return (
    <section className="jp-section" id="team">
      <div className="jp-container">
        <div className="jp-section-head">
          <div className="jp-section-eyebrow">Meet the team</div>
          <h2 className="jp-section-title">The faces behind the sparkle</h2>
          <p className="jp-section-sub">A growing crew of independent reps doing this their way - full-time, side-hustle, and everywhere in between.</p>
        </div>
        <div className="jp-team-grid">
          {!leaderAlreadyAppearsInRoster && <TeamCard member={rep} isLeader />}
          {members.map((member, index) => <TeamCard key={`${member.name}-${index}`} member={member} />)}
          <SpotCard ctaUrl={ctaUrl} ctaText={ctaText} hasRecruitingLink={hasRecruitingLink} repName={rep.name} />
        </div>
        {RUNTIME_CONTEXT.targeted && members.length === 0 ? (
          <p className="jp-section-sub">No additional public team cards have been added yet. Contact {rep.name} for current team details.</p>
        ) : null}
      </div>
    </section>
  );
}

const BENEFIT_ICONS = {
  community: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  income: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>,
  training: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>,
  product: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12l4 6-10 13L2 9l4-6z" /><path d="M11 3 8 9l4 13 4-13-3-6" /><path d="M2 9h20" /></svg>,
  anywhere: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>,
  growth: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>,
};

const BENEFITS = [
  { key: "community", title: "Meet the Team", desc: "Ask how this team communicates, celebrates wins, and handles everyday questions." },
  { key: "income", title: "Review the Numbers", desc: "Income is not guaranteed. Read the current compensation information and Income Disclosure Statement before deciding." },
  { key: "training", title: "Ask About Support", desc: "Training and mentoring differ by team. Ask the lead exactly what is available now." },
  { key: "product", title: "Know the Product", desc: "Review the current official catalog, policies, and starter-pack details before enrolling." },
  { key: "anywhere", title: "Plan Your Setup", desc: "Ask what equipment, internet, workspace, and show schedule are realistic for you." },
  { key: "growth", title: "Understand the Path", desc: "Learn the official requirements and talk through your goals without promises or pressure." },
];

const KELLY_BENEFITS = [
  {
    key: "community",
    title: "A real welcome from Kelly",
    desc: "Start with Kelly, not a generic checklist. She'll help you get acquainted with Sparkly Butterflies and talk through the questions that matter to you.",
  },
  {
    key: "training",
    title: "Clear answers before you join",
    desc: "Kelly can explain how her team stays connected, what support is currently available, and what your first steps could look like.",
  },
  {
    key: "growth",
    title: "Space to choose your pace",
    desc: "Tell Kelly what you want your business to fit around. She can help you think through a realistic start, without pressure or income promises.",
  },
];

const HEATHER_BENEFITS = [
  {
    key: "community",
    title: "A warm welcome from Heather",
    desc: "Get to know Heather and Opal Sparkling Gems before you decide. She can answer your questions and help you understand what joining her team looks like today.",
  },
  {
    key: "training",
    title: "Practical guidance to get started",
    desc: "Heather can walk you through the official resources, explain how her team stays connected, and share what support is currently available to new reps.",
  },
  {
    key: "growth",
    title: "A start that fits your life",
    desc: "Talk with Heather about your schedule and goals so you can consider a realistic pace without pressure or income promises.",
  },
];

const KIM_BENEFITS = [
  {
    key: "community",
    title: "A personal welcome from Kim",
    desc: "Start with a real conversation about GofortheBling. Kim can tell you about her team and help you decide whether it feels like the right place to begin.",
  },
  {
    key: "training",
    title: "Clear answers and next steps",
    desc: "Kim can point you to the current official information, explain how her team communicates, and tell you what support is available now.",
  },
  {
    key: "growth",
    title: "Room to build your way",
    desc: "Share what you want your business to fit around, then talk through a practical starting pace without pressure or income promises.",
  },
];

const recruitingProfile = isKellySparklyButterflies
  ? {
      name: "Kelly",
      teamName: "Sparkly Butterflies",
      heading: "Come sparkle with Kelly",
      intro: "Joining a team should feel personal. Kelly would love to help you understand the opportunity, see the current starter packs, and decide whether Sparkly Butterflies feels right for you.",
      benefits: KELLY_BENEFITS,
    }
  : isHeatherBlingKitchen
    ? {
        name: "Heather",
        teamName: "Opal Sparkling Gems",
        heading: "Find your place with Heather",
        intro: "Joining a team is a personal decision. Heather would love to answer your questions, show you the current starter packs, and help you decide whether Opal Sparkling Gems feels right for you.",
        benefits: HEATHER_BENEFITS,
      }
    : isKimGoForTheBling
      ? {
          name: "Kim",
          teamName: "GofortheBling",
          heading: "Find your sparkle with Kim",
          intro: "You deserve more than a generic recruiting checklist. Kim can help you understand the opportunity, review the current starter packs, and decide whether GofortheBling feels right for you.",
          benefits: KIM_BENEFITS,
        }
      : null;

function WhyJoin({ teamName, repName, locationLabel, ctaUrl, hasRecruitingLink, contactUrl, facebookUrl }) {
  const displayTeamName = isMileHighFizzHybrid ? "the Diamond Peak Society" : teamName;
  const benefits = recruitingProfile?.benefits || BENEFITS;
  return (
    <section className={`jp-section jp-why${recruitingProfile ? " jp-why--personal" : ""}`} id="why">
      <div className="jp-container">
        <div className="jp-section-head">
          <div className="jp-section-eyebrow">Why join</div>
          <h2 className="jp-section-title">{recruitingProfile?.heading || `Why Join ${displayTeamName}?`}</h2>
          <p className="jp-section-sub">
            {recruitingProfile
              ? recruitingProfile.intro
              : `Review the official requirements and ask ${repName}${locationLabel ? ` in ${locationLabel}` : ""} what this team currently offers before you decide.`}
          </p>
        </div>
        <div className="jp-benefits">
          {benefits.map((benefit) => (
            <article key={benefit.key} className="jp-benefit-card">
              <div className="jp-benefit-icon">{BENEFIT_ICONS[benefit.key]}</div>
              <h3 className="jp-benefit-title">{benefit.title}</h3>
              <p className="jp-benefit-desc">{benefit.desc}</p>
            </article>
          ))}
        </div>
        {recruitingProfile ? (
          <div className="jp-why-actions" aria-label={`${recruitingProfile.name} team next steps`}>
            {contactUrl ? (
              <a {...linkProps(contactUrl)} className="jp-why-btn jp-why-btn--primary">Ask {recruitingProfile.name} a question <span aria-hidden="true">→</span></a>
            ) : null}
            <RecruitingAction
              enabled={hasRecruitingLink}
              href={ctaUrl}
              className="jp-why-btn jp-why-btn--secondary"
              unavailableText={`Ask ${recruitingProfile.name} for current starter-pack details`}
            >
              See {recruitingProfile.name}'s starter packs <span aria-hidden="true">→</span>
            </RecruitingAction>
            <div className="jp-why-text-links">
              <a href="#faq">Read {recruitingProfile.name}'s FAQs <span aria-hidden="true">↓</span></a>
              {facebookUrl ? (
                <a {...linkProps(facebookUrl)}>Visit {recruitingProfile.name}'s Facebook community <span aria-hidden="true">→</span></a>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

const KELLY_FAQ_QUESTIONS = [
  {
    q: "What is it like to join Kelly's Sparkly Butterflies team?",
    aSlot: "FAQ answer — Kelly's team",
    a: "Kelly wants you to feel comfortable asking questions before you make a decision. She'll introduce you to how Sparkly Butterflies stays connected, explain what the team currently offers, and help you decide whether it feels like a good fit.",
  },
  {
    q: "How much does it cost to join Kelly's team?",
    aSlot: "FAQ answer — Kelly's starter packs",
    a: "Bomb Party sets the official starter-pack options, contents, and prices, and those details can change. Use Kelly's starter-pack link on this page for the current information, then ask Kelly about anything you would like help understanding.",
  },
  {
    q: "Does Kelly expect me to have experience?",
    aSlot: "FAQ answer — experience with Kelly",
    a: "You do not need to arrive knowing how to run a live show. Kelly can explain the current enrollment requirements, point you toward official training resources, and share how new Sparkly Butterflies team members get oriented.",
  },
  {
    q: "How much time will Kelly expect me to commit?",
    aSlot: "FAQ answer — time with Kelly",
    a: "Kelly knows that every rep's schedule and goals are different. Talk with Kelly about what you want your business to fit around so you can think through a pace that is realistic for you.",
  },
  {
    q: "What support does Kelly offer new team members?",
    aSlot: "FAQ answer — Kelly's support",
    a: "Kelly can help you find the official onboarding resources, understand how her team communicates, and get answers as you take your first steps. She'll also tell you clearly what personal support is currently available before you enroll.",
  },
  {
    q: "Can Kelly guarantee how much I will earn?",
    aSlot: "FAQ answer — income with Kelly",
    a: "No. Kelly cannot guarantee income, and results vary by sales, expenses, effort, and time. Review the official Income Disclosure Statement and talk through your questions with Kelly before you decide.",
  },
];

function personalizedFaqQuestions(name, teamName) {
  return [
    {
      q: `What is it like to join ${name}'s ${teamName} team?`,
      aSlot: `FAQ answer — ${name}'s team`,
      a: `${name} wants you to feel comfortable asking questions before you decide. ${name} can explain how ${teamName} stays connected, what the team currently offers, and whether it feels like a good fit for you.`,
    },
    {
      q: `How much does it cost to join ${name}'s team?`,
      aSlot: `FAQ answer — ${name}'s starter packs`,
      a: `Bomb Party sets the official starter-pack options, contents, and prices, and those details can change. Use ${name}'s starter-pack link on this page for current information, then ask ${name} about anything you would like help understanding.`,
    },
    {
      q: `Does ${name} expect me to have experience?`,
      aSlot: `FAQ answer — experience with ${name}`,
      a: `You do not need to arrive knowing how to run a live show. ${name} can explain the current enrollment requirements, point you toward official training resources, and tell you how new ${teamName} team members get oriented.`,
    },
    {
      q: `How much time will ${name} expect me to commit?`,
      aSlot: `FAQ answer — time with ${name}`,
      a: `${name} knows that every rep's schedule and goals are different. Talk with ${name} about what you want your business to fit around so you can consider a pace that is realistic for you.`,
    },
    {
      q: `What support does ${name} offer new team members?`,
      aSlot: `FAQ answer — ${name}'s support`,
      a: `${name} can help you find the official onboarding resources, understand how the team communicates, and get answers as you take your first steps. Ask ${name} what personal support is currently available before you enroll.`,
    },
    {
      q: `Can ${name} guarantee how much I will earn?`,
      aSlot: `FAQ answer — income with ${name}`,
      a: `No. ${name} cannot guarantee income, and results vary by sales, expenses, effort, and time. Review the official Income Disclosure Statement and talk through your questions with ${name} before you decide.`,
    },
  ];
}

const FAQ_QUESTIONS = (teamName, repName) => ([
  {
    q: `What is ${teamName}?`,
    aSlot: "FAQ answer — what is the team",
    a: FAQ_ANSWERS.whatIsTeam || `${teamName} is a team of independent Bomb Party reps led by ${repName}. Ask the team lead how the group communicates and what support is currently available.`,
  },
  {
    q: "How much does it cost to join?",
    aSlot: "FAQ answer — cost",
    a: FAQ_ANSWERS.cost || "Starter-pack options, contents, and prices can change. Review the current official enrollment page before making a decision.",
  },
  {
    q: `Do I need experience to join ${teamName}?`,
    aSlot: "FAQ answer — experience",
    a: FAQ_ANSWERS.experience || "Review the current official requirements and ask the team lead what training or onboarding help is available for new reps.",
  },
  {
    q: "How much time do I need to commit?",
    aSlot: "FAQ answer — time commitment",
    a: FAQ_ANSWERS.timeCommitment || "The time needed depends on your goals and how you run your independent business. Review the official policies and plan a schedule that is realistic for you.",
  },
  {
    q: "What kind of support will I receive?",
    aSlot: "FAQ answer — support",
    a: FAQ_ANSWERS.support || "Support differs by team and can change. Ask the team lead which onboarding, communication, and training resources are available now.",
  },
  {
    q: "Can I really make money doing this?",
    aSlot: "FAQ answer — income",
    a: FAQ_ANSWERS.income || "Income is not guaranteed and results vary. Read the current Income Disclosure Statement and consider your costs, time, and goals before enrolling.",
  },
]);

function Faq({ teamName, repName, locationLabel }) {
  const [open, setOpen] = useState(0);
  const displayTeamName = isMileHighFizzHybrid ? "the Diamond Peak Society" : teamName;
  const questions = isKellySparklyButterflies
    ? KELLY_FAQ_QUESTIONS
    : recruitingProfile
      ? personalizedFaqQuestions(recruitingProfile.name, recruitingProfile.teamName)
      : FAQ_QUESTIONS(displayTeamName, repName);
  return (
    <section className="jp-section" id="faq">
      <div className="jp-faq-wrap">
        <div className="jp-section-head">
          <div className="jp-section-eyebrow">FAQ</div>
          <h2 className="jp-section-title">Frequently Asked Questions</h2>
          <p className="jp-section-sub">
            {recruitingProfile
              ? `Straight answers about joining ${recruitingProfile.name} and the ${recruitingProfile.teamName} team.`
              : `Everything you need to know about joining ${displayTeamName}${locationLabel ? ` with ${repName} in ${locationLabel}` : ""}.`}
          </p>
        </div>
        <div className="jp-faq-list">
          {questions.map((item, index) => (
            <div key={index} className={`jp-faq-item ${open === index ? "open" : ""}`}>
              <div className="jp-faq-q" onClick={() => setOpen(open === index ? -1 : index)}>
                <span>{item.q}</span>
                <span className="chev">+</span>
              </div>
              <div className="jp-faq-a">
                <div className="jp-faq-a-inner slot" data-slot={item.aSlot}>{item.a}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="jp-faq-note">
          If you're evaluating income potential, read the{" "}
          <a {...linkProps(BP_IDS_HREF)}>Bomb Party Income Disclosure Statement</a>{" "}
          before enrolling.
        </div>
        <div className="jp-faq-link">
          <a {...linkProps(FAQ_HREF)}>Need more info? See the full Bomb Party rep FAQ →</a>
        </div>
      </div>
    </section>
  );
}

function FinalCta({ teamName, ctaUrl, ctaText, pitch, repName, locationLabel, hasRecruitingLink }) {
  return (
    <section className="jp-final">
      <div className="jp-container">
        <div className="jp-final-card">
          <div className="jp-final-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <h2 className="jp-final-title">Ready to Sparkle With {teamName}?</h2>
          <p className="jp-final-sub">{pitch}</p>
          <p className="jp-final-note">
            {hasRecruitingLink
              ? `Start with the official starter pack page${locationLabel ? `, then connect with ${repName} in ${locationLabel}` : ""}. `
              : `Starter-pack details are not connected on this page yet. Ask ${repName} for the current official options. `}
            Review the{" "}
            <a {...linkProps(BP_IDS_HREF)}>Income Disclosure Statement</a>{" "}
            before you enroll.
          </p>
          <RecruitingAction
            enabled={hasRecruitingLink}
            href={ctaUrl}
            className="jp-final-btn slot"
            data-slot="CTA → BP referral page"
            unavailableText={`Ask ${repName} for current join details`}
          >
            {ctaText}
            <span aria-hidden="true">→</span>
          </RecruitingAction>
        </div>
      </div>
    </section>
  );
}

function Footer({ businessName }) {
  const year = new Date().getFullYear();

  return (
    <footer className="hp-footer">
      <div className="hp-footer-inner">
        <div>
          <div className="hp-footer-brand slot" data-slot="business name">{businessName}</div>
          <p className="hp-footer-tag">{CONTENT.footerTagline || "Live jewelry reveals every Tuesday at 8pm CST. Real pieces, real sparkle."}</p>
          {CONTENT.memberTeamName ? (
            <p className="hp-footer-team">Proud member of the {CONTENT.memberTeamName} team</p>
          ) : null}
          <div className="hp-footer-socials">
            {FOOTER_SOCIALS.map((link, index) => (
              <a
                key={`${link.label}-${index}`}
                {...linkProps(link.href)}
                className="hp-footer-social"
                aria-label={link.label}
                title={link.label}
              >
                <SocialLogo {...link} />
              </a>
            ))}
          </div>
        </div>
        <div className="hp-footer-col">
          <ul>
            <li><a {...linkProps(FOOTER_LINKS.home || "/amethyst/Homepage.html")}>Home</a></li>
            <li><a {...linkProps(FOOTER_LINKS.tradeBoard || TRADE_BOARD_HREF)}>{isBrittWithBlingHybrid ? "Dance Floor · Coming soon" : "Dance Floor"}</a></li>
            {PANTRY_HREF && <li><a {...linkProps(PANTRY_HREF)}>In the Pantry</a></li>}
            <li><a {...linkProps(FOOTER_LINKS.joinTeam || "/amethyst/Join.html")}>Join Team</a></li>
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
          <span>© {year} {businessName} · Powered by Sparkle Suite</span>
          <span><a {...linkProps(FOOTER_LINKS.privacy || "#faq")}>Privacy</a> · <a {...linkProps(FOOTER_LINKS.terms || "#faq")}>Terms</a> · <a {...linkProps(FOOTER_LINKS.accessibility || "#faq")}>Accessibility</a></span>
        </div>
        <p>
          {CONTENT.legalDisclaimer || `${businessName} is operated by an independent Bomb Party Representative. Bomb Party® is a registered trademark of Bomb Party LLC. This site is not endorsed by, directly affiliated with, maintained, authorized, or sponsored by Bomb Party LLC. Any agreements formed between site visitors and the rep are solely between those parties, not Bomb Party LLC and not the platform.`}
        </p>
      </div>
    </footer>
  );
}

function App() {
  const [t, setTweak] = useTweaks(DEFAULTS);
  const [queueOpen, setQueueOpen] = useState(false);
  const locationLabel = getLocationLabel(t.repCity, t.repState);
  const repName = publicRepName(t.repName);
  const hasRecruitingLink = t.hasRecruitingLink !== false && Boolean(runtimeText(t.bpReferralUrl));

  const visibleMembers = useMemo(() => {
    const count = Math.max(0, Math.min(t.teamMemberCount, TEAM_MEMBERS.length));
    return TEAM_MEMBERS.slice(0, count);
  }, [t.teamMemberCount]);

  const repCard = {
    name: repName,
    business: t.businessName,
    initials: (repName[0] || "S").toUpperCase(),
    state: locationLabel || t.repState,
    socialLinks: {
      tiktok: REP_SOCIALS.tiktok,
      website: REP_SOCIALS.website || SHOP_HREF,
      youtube: REP_SOCIALS.youtube,
    },
  };

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
    const locationSuffix = locationLabel ? ` | ${locationLabel}` : "";
    const description = hasRecruitingLink
      ? `Explore ${t.teamName}, current official join details, and information from ${repName}${locationLabel ? ` in ${locationLabel}` : ""}. Review the Income Disclosure Statement before enrolling.`
      : `Learn about ${t.teamName} and ask ${repName}${locationLabel ? ` in ${locationLabel}` : ""} for current official join details. Review the Income Disclosure Statement before enrolling.`;
    let meta = document.querySelector('meta[name="description"]');

    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }

    document.title = `Join ${t.teamName} | ${repName}${locationSuffix}`;
    if (isMileHighFizzHybrid) {
      document.title = "Join the Mile High Fizz Team - Colorado Bomb Party Business Opportunity";
    } else if (isBrittWithBlingHybrid) {
      document.title = "Join The Virtuous Fizzers | Britt with Bling";
    } else if (isBlingKitchenHybrid) {
      document.title = "Join Opal Sparkling Gems | BlingKitchen";
    }
    meta.setAttribute("content", description);
    applyTargetedMetadata(document.title, description);
  }, [hasRecruitingLink, locationLabel, repName, t.teamName]);

  useEffect(() => {
    const body = document.body;
    body.className = "joinpage";
    if (isMileHighFizzHybrid) body.classList.add("mile-high-fizz-join");
    if (isBrittWithBlingHybrid) body.classList.add("britt-with-bling-join");
    if (isBlingKitchenHybrid) body.classList.add("bling-kitchen-join");
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

  const applyPreset = (preset) => {
    const presetValues = PRESETS[preset];
    if (!presetValues) return;
    setTweak({ preset, ...presetValues });
  };

  return (
    <>
      <SparkleFx level={t.sparkleLevel} />

      <div className={isMileHighFizzHybrid ? "mhf-join-page" : isBrittWithBlingHybrid ? "bwb-join-page" : isBlingKitchenHybrid ? "bk-join-page" : ""}>
        <div className="hp-sticky-stack">
          <Header businessName={t.businessName} />

          {t.showTicker ? <Ticker topText={t.tickerTopText} /> : null}

          <LiveQueueStrip onOpen={() => setQueueOpen(true)} />
        </div>

        <div className={isMileHighFizzHybrid ? "hp-saturate mhf-join-shell" : isBrittWithBlingHybrid ? "hp-saturate bwb-join-shell" : isBlingKitchenHybrid ? "hp-saturate bk-join-shell" : "hp-saturate"}>
          <div className={isMileHighFizzHybrid ? "mhf-join-content" : isBrittWithBlingHybrid ? "bwb-join-content" : isBlingKitchenHybrid ? "bk-join-content" : ""}>
            {t.showHero ? (
              <Hero
                gnomeGarden={t.preset === "gnome_garden"}
                teamName={t.teamName}
                title={t.heroTitle || CONTENT.heroTitle}
                pitch={redactPublicRepText(t.heroPitch, t.repName)}
                ctaText={t.heroCtaText}
                ctaUrl={t.bpReferralUrl}
                hasRecruitingLink={hasRecruitingLink}
                showPromo={t.showPromo}
                promoText={t.promoText}
                repName={repName}
                locationLabel={locationLabel}
              />
            ) : null}

            {t.showTeam ? (
              <TeamSection
                rep={repCard}
                members={visibleMembers}
                ctaUrl={t.bpReferralUrl}
                ctaText="Apply to the Team"
                hasRecruitingLink={hasRecruitingLink}
              />
            ) : null}

            {t.showWhy ? (
              <WhyJoin
                teamName={t.teamName}
                repName={repName}
                locationLabel={locationLabel}
                ctaUrl={t.bpReferralUrl}
                hasRecruitingLink={hasRecruitingLink}
                contactUrl={FOOTER_LINKS.contact}
                facebookUrl={FACEBOOK_COMMUNITY_URL}
              />
            ) : null}

            {t.showFaq ? <Faq teamName={t.teamName} repName={repName} locationLabel={locationLabel} /> : null}

            {t.showFinalCta ? (
              <FinalCta
                teamName={isMileHighFizzHybrid ? "the Diamond Peak Society" : t.teamName}
                ctaUrl={t.bpReferralUrl}
                ctaText="Join The Team Now"
                pitch={redactPublicRepText(t.finalPitch, t.repName)}
                repName={repName}
                locationLabel={locationLabel}
                hasRecruitingLink={hasRecruitingLink}
              />
            ) : null}

            {t.showFooter ? <Footer businessName={t.businessName} /> : null}
          </div>
        </div>
      </div>

      <LiveQueueModal open={queueOpen} onClose={() => setQueueOpen(false)} />

      <TweaksPanel title="Tweaks" subtitle="Tune the join page" defaultWidth={380}>
        <TweakSection title="Team & content" subtitle="Page-specific">
          <TweakText label="Team name" value={t.teamName} onChange={(value) => setTweak("teamName", value)} />
          <TweakText label="Rep name" value={t.repName} onChange={(value) => setTweak("repName", value)} />
          <TweakText label="Rep city" value={t.repCity} onChange={(value) => setTweak("repCity", value)} />
          <TweakText label="Rep state" value={t.repState} onChange={(value) => setTweak("repState", value)} />
          <TweakText label="Hero title" value={t.heroTitle} onChange={(value) => setTweak("heroTitle", value)} />
          <TweakSlider
            label="Team members shown"
            value={t.teamMemberCount}
            onChange={(value) => setTweak("teamMemberCount", value)}
            min={0}
            max={TEAM_MEMBERS.length}
            step={1}
          />
          <TweakToggle label="Show current BP promo" value={t.showPromo} onChange={(value) => setTweak("showPromo", value)} />
          <TweakText label="Promo text" value={t.promoText} onChange={(value) => setTweak("promoText", value)} />
          <TweakText label="Hero pitch" value={t.heroPitch} onChange={(value) => setTweak("heroPitch", value)} />
          <TweakText label="Hero CTA text" value={t.heroCtaText} onChange={(value) => setTweak("heroCtaText", value)} />
          <TweakText label="Final CTA pitch" value={t.finalPitch} onChange={(value) => setTweak("finalPitch", value)} />
          <TweakText label="BP referral URL" value={t.bpReferralUrl} onChange={(value) => setTweak("bpReferralUrl", value)} />
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
          <TweakRadio
            label="CTA emphasis"
            value={t.ctaEmphasis}
            onChange={(value) => setTweak("ctaEmphasis", value)}
            options={[
              { value: "standard", label: "Standard" },
              { value: "pulse", label: "Pulse" },
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
          <TweakSelect
            label="Texture overlay"
            value={t.textureOverlay}
            onChange={(value) => setTweak("textureOverlay", value)}
            options={[
              { value: "none", label: "None" },
              { value: "grain", label: "Grain" },
              { value: "sparkle", label: "Sparkle dust" },
            ]}
          />
          <TweakRadio
            label="Cursor effect"
            value={t.cursorEffect}
            onChange={(value) => setTweak("cursorEffect", value)}
            options={[
              { value: "default", label: "Default" },
              { value: "sparkle", label: "Sparkle ✦" },
            ]}
          />
        </TweakSection>

        <TweakSection title="Color">
          <TweakSelect
            label="Background tone"
            value={t.bgTone}
            onChange={(value) => setTweak("bgTone", value)}
            options={[
              { value: "lavender", label: "Lavender (Amethyst)" },
              { value: "warm", label: "Warm peach" },
              { value: "cool", label: "Cool blue" },
              { value: "paper", label: "Paper" },
              { value: "neon", label: "Neon pink" },
              { value: "midnight", label: "Midnight" },
            ]}
          />
          <TweakColor label="Primary" value={t.primaryColor} onChange={(value) => setTweak("primaryColor", value)} />
          <TweakColor label="Accent" value={t.accentColor} onChange={(value) => setTweak("accentColor", value)} />
          <TweakSlider
            label="Saturation"
            value={t.saturation}
            onChange={(value) => setTweak("saturation", value)}
            min={50}
            max={180}
            step={5}
            unit="%"
          />
        </TweakSection>

        <TweakSection title="Typography & shape">
          <TweakSelect
            label="Heading font"
            value={t.headingFont}
            onChange={(value) => setTweak("headingFont", value)}
            options={[
              { value: "vend", label: "Vend Sans (default)" },
              { value: "serif", label: "Editorial serif" },
              { value: "italiana", label: "Glam serif" },
              { value: "bubbly", label: "Bubbly rounded" },
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
          <TweakRadio
            label="Corner radius"
            value={t.shapeRadius}
            onChange={(value) => setTweak("shapeRadius", value)}
            options={[
              { value: "sharp", label: "Sharp" },
              { value: "default", label: "Default" },
              { value: "soft", label: "Soft" },
            ]}
          />
          <TweakRadio
            label="Density"
            value={t.density}
            onChange={(value) => setTweak("density", value)}
            options={[
              { value: "compact", label: "Compact" },
              { value: "regular", label: "Regular" },
              { value: "spacious", label: "Spacious" },
            ]}
          />
        </TweakSection>

        <TweakSection title="Section visibility">
          <TweakToggle label="Ticker" value={t.showTicker} onChange={(value) => setTweak("showTicker", value)} />
          <TweakToggle label="Hero" value={t.showHero} onChange={(value) => setTweak("showHero", value)} />
          <TweakToggle label="Team grid" value={t.showTeam} onChange={(value) => setTweak("showTeam", value)} />
          <TweakToggle label="Why join" value={t.showWhy} onChange={(value) => setTweak("showWhy", value)} />
          <TweakToggle label="FAQ" value={t.showFaq} onChange={(value) => setTweak("showFaq", value)} />
          <TweakToggle label="Final CTA" value={t.showFinalCta} onChange={(value) => setTweak("showFinalCta", value)} />
          <TweakToggle label="Footer" value={t.showFooter} onChange={(value) => setTweak("showFooter", value)} />
        </TweakSection>

        <TweakSection title="Slot inspector">
          <TweakToggle label="Show edit slots overlay" value={t.showSlots} onChange={(value) => setTweak("showSlots", value)} />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<LiveLineupProvider><App /></LiveLineupProvider>);
