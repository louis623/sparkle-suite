/* global React, ReactDOM */
const { useState, useEffect, useMemo, useRef } = React;

// Match initial timestamps across hydration. Show dates always use the
// event timezone, never the rendering server timezone.
function homepageDateLabel(value, options) {
  const seed = window.SPARKLE_FIRST_PAINT;
  return new Intl.DateTimeFormat(seed?.locale, {
    ...options,
    ...(seed && !options.timeZone ? { timeZone: seed.timeZone } : {}),
  }).format(new Date(value));
}

// Read tweaks panel components from the global scope (loaded from tweaks-panel.jsx)
const {
  TweaksPanel, useTweaks,
  TweakSection, TweakSlider, TweakToggle, TweakRadio, TweakSelect,
  TweakColor, TweakText, TweakButton, TweakNumber
} = window;

function responsiveRepImage(src, options) {
  if (typeof window.sparkleResponsiveImage === "function") {
    return window.sparkleResponsiveImage(src, options);
  }
  return {
    src: src || "",
    alt: options.alt || "",
    decoding: "async",
    loading: options.eager ? "eager" : "lazy",
  };
}

// ============================================================
// Default tweak values — wrapped in EDITMODE markers for persistence
// ============================================================
// Tweak defaults are bootstrapped from the Next app so the locked export can
// read structured rep data without changing layout or motion behavior.
const DEFAULTS = window.HOMEPAGE_TWEAK_DEFAULTS || {
  repName: "Sasha",
  businessName: "Sparkle by Sasha",
  tagline: "Live jewelry reveals every Tuesday - joy you can hold.",
  heroHeadline: "Real jewelry. Live reveals. Pure sparkle.",
  heroSub: "I'm Sasha - every Tuesday at 8pm CST I open Bomb Party boxes live and you watch what's inside, real time.",
  heroMotion: "sparkle_rise",
  buttonStyle: "sparkle",
  tickerVariant: "dual",
  nicNacStyle: "square",
  showTicker: true,
  showLrq: true,
  showHero: true,
  showEvents: true,
  showWibp: true,
  showAbout: true,
  showSignup: true,
  showFooter: true,
  showNicNac: true,
  eventCount: 2,
  lrqState: "live",
  tickerTopText: "Live tonight - 8pm CST | Use code AMETHYST15 | Pre-orders close Friday | New Unicorn drops Tuesday",
  primaryColor: "#5C0EFF",
  accentColor: "#FF1AC2",
  bgTone: "lavender",
  headingFont: "italiana",
  bodyFont: "inter",
  headingWeight: 600,
  shapeRadius: "soft",
  density: "regular",
  saturation: 130,
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
const CONTENT = window.AMETHYST_HOMEPAGE_TEMPLATE_DATA || {};
const RUNTIME_CONTEXT = window.AMETHYST_RUNTIME_CONTEXT || {};
const isMileHighFizzHybrid = CONTENT.publicSiteVariant === "mile_high_fizz_hybrid";
const isBrittWithBlingHybrid = CONTENT.publicSiteVariant === "britt_with_bling_hybrid";
const isBrittDanceFloorComingSoon = CONTENT.danceFloorComingSoon === true;
const isBlingKitchenHybrid = CONTENT.publicSiteVariant === "bling_kitchen_hybrid";
const isHeatherBlingKitchenSite = String(CONTENT.businessName || "").trim().toLowerCase() === "blingkitchen";

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
const DEFAULT_HOMEPAGE_EVENTS = [
  {
    id: "default-homepage-event-1",
    title: "Unicorn Magic Drop",
    description: "Main live reveal",
    eventTime: "2099-11-12T20:00:00.000Z",
    durationMinutes: 60,
    featured: true,
    codes: [
      { code: "UNICORN15", desc: "15% off Unicorn tier boxes" },
      { code: "FREESHIP75", desc: "Free shipping on orders $75+" },
    ],
    collections: [
      { label: "Citrine Sun Series", href: "/amethyst/Trade.html?collection=Citrine%20Sun%20Series" },
      { label: "Holiday Gift Guide", href: "/amethyst/Trade.html?collection=Holiday%20Gift%20Guide" },
    ],
    platforms: [
      { kind: "tt", label: "Join me on TikTok", href: "#" },
      { kind: "fb", label: "Watch on Facebook Live", href: "#" },
    ],
  },
  {
    id: "default-homepage-event-2",
    title: "Saturday Sparkle Brunch",
    description: "Weekend bonus show",
    eventTime: "2099-11-16T13:00:00.000Z",
    durationMinutes: 60,
    featured: false,
    codes: [{ code: "BRUNCH10", desc: "10% off Saturday show purchases" }],
    collections: [
      { label: "Diamond Territory", href: "/amethyst/Trade.html?collection=Diamond%20Territory" },
    ],
    platforms: [
      { kind: "tt", label: "Join me on TikTok", href: "#" },
    ],
  },
];
const HOMEPAGE_EVENT_PAYLOAD = Array.isArray(window.AMETHYST_HOMEPAGE_EVENTS)
  ? window.AMETHYST_HOMEPAGE_EVENTS
  : RUNTIME_CONTEXT.targeted
    ? []
    : DEFAULT_HOMEPAGE_EVENTS;

function isExternalHref(href) {
  return /^https?:\/\//.test(href || "");
}

function linkProps(href) {
  return isExternalHref(href)
    ? { href, target: "_blank", rel: "noreferrer noopener" }
    : { href: href || "#" };
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

function getShopHref() {
  return CONTENT.streamLinks?.shop || "#";
}

function getTradeBoardHref() {
  return CONTENT.footerLinks?.tradeBoard || "/amethyst/Trade.html";
}

function getLiveShowWatchHref(event) {
  const platforms = Array.isArray(event?.platforms) ? event.platforms : [];
  const preferred = platforms.find((platform) => platform?.href && platform.kind === "tt")
    || platforms.find((platform) => platform?.href);

  return preferred?.href || null;
}

function getWatchHref(liveShow) {
  return getLiveShowWatchHref(liveShow) || CONTENT.streamLinks?.watch || CONTENT.streamLinks?.tiktok || "#";
}

function getWatchCtaLabel(isLive) {
  if (isLive) return "Watch Live";
  if (CONTENT.streamLinks?.tiktok) return "Watch on TikTok";
  if (CONTENT.streamLinks?.facebook) return "Watch on Facebook";
  return "Watch updates";
}

function isConfiguredWatchLink(href) {
  return typeof href === "string" && href.trim().length > 0 && href !== "#";
}

const SOCIAL_HERO_ORDER = ["facebook", "tiktok", "instagram", "whatnot", "youtube"];
const SOCIAL_HERO_LABELS = {
  facebook: "Facebook VIP",
  tiktok: "TikTok",
  instagram: "Instagram",
  whatnot: "Whatnot",
  youtube: "YouTube",
};
const SOCIAL_HERO_HOSTS = {
  facebook: ["facebook.com", "fb.com", "fb.watch"],
  tiktok: ["tiktok.com"],
  instagram: ["instagram.com"],
  whatnot: ["whatnot.com"],
  youtube: ["youtube.com", "youtu.be"],
};

function socialHeroHostMatches(key, href) {
  const domains = SOCIAL_HERO_HOSTS[key];
  if (!domains) return false;
  try {
    const host = new URL(href).hostname.replace(/^www\./, "").toLowerCase();
    return domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch (error) {
    return false;
  }
}

function getSocialHeroLinks() {
  const provided = Array.isArray(CONTENT.socialHeroLinks) ? CONTENT.socialHeroLinks : [];
  const fallback = CONTENT.showFacebookVipHeroButton === true && CONTENT.facebookVipUrl
    ? [{ key: "facebook", label: "Facebook VIP", href: CONTENT.facebookVipUrl }]
    : [];
  const source = provided.length > 0 ? provided : fallback;

  return SOCIAL_HERO_ORDER.flatMap((key) => {
    const link = source.find((item) => item && item.key === key);
    if (!link) return [];
    const href = String(link.href || "").trim();
    const label = SOCIAL_HERO_LABELS[key];
    if (!label || !isConfiguredWatchLink(href) || !isExternalHref(href)) return [];
    if (!socialHeroHostMatches(key, href)) return [];
    return [{ key, label, href }];
  });
}

function SocialHeroLinks({ className, labelClassName }) {
  const links = getSocialHeroLinks();
  if (links.length === 0) return null;
  return links.map((link) => (
    <a key={link.key} {...linkProps(link.href)} className={className} data-hero-cta={link.key}>
      {labelClassName ? <span className={labelClassName}>{link.label}</span> : link.label}
    </a>
  ));
}

function getHeroWatchLinks(liveShow, isLive) {
  const links = [];
  const tiktok = CONTENT.streamLinks?.tiktok;
  const whatnot = CONTENT.streamLinks?.whatnot;

  if (isConfiguredWatchLink(tiktok)) {
    links.push({
      id: "tiktok",
      href: getLiveShowWatchHref(liveShow) || tiktok,
      label: isLive ? "Watch TikTok Live" : "Watch on TikTok",
    });
  }
  if (isConfiguredWatchLink(whatnot)) {
    links.push({ id: "whatnot", href: whatnot, label: "Watch on Whatnot" });
  }

  if (links.length > 0) return links;

  const fallback = getWatchHref(liveShow);
  return isConfiguredWatchLink(fallback)
    ? [{ id: "watch", href: fallback, label: getWatchCtaLabel(isLive) }]
    : [];
}

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

function ComingSoonFooterItem({ label = "Join the team" }) {
  return (
    <span className="hp-footer-coming-soon" aria-label={`${label} coming soon`}>
      {label}
      <span aria-hidden="true">Soon</span>
    </span>
  );
}

function getUnsubscribeHref() {
  return CONTENT.footerLinks?.unsubscribe || withCurrentSearch("/amethyst/Unsubscribe.html");
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

function getPlatformHref(platform) {
  return CONTENT.streamLinks?.[platform] || getWatchHref();
}

function getSocialHref(shortLabel) {
  return CONTENT.socialLinks?.find((link) => link.shortLabel === shortLabel)?.href || "#";
}

function getAboutMediaSlot(index) {
  return CONTENT.aboutMediaSlots?.[index] || null;
}

function mediaEmptyPrompt(kind) {
  const preset = window.HOMEPAGE_TWEAK_DEFAULTS?.preset || CONTENT.preset || "";
  const seasonal = preset === "gobble_and_fizz" || preset === "pie_please";
  if (!seasonal) return kind === "portrait" ? "Portrait photo coming soon" : "Video coming soon";
  if (kind === "portrait") return "Add a portrait so guests can meet you.";
  if (kind === "short") return "Add a short from a recent reveal.";
  return "Add a video from a live reveal.";
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

function isScheduledShowLive(event, now = Date.now()) {
  const startAt = Date.parse(event?.eventTime || "");
  if (Number.isNaN(startAt)) return false;

  const durationMinutes = Number(event.durationMinutes) > 0 ? Number(event.durationMinutes) : 60;
  const endAt = startAt + durationMinutes * 60 * 1000;
  return now >= startAt && now < endAt;
}

function getActiveLiveShow(now = Date.now()) {
  return HOMEPAGE_EVENT_PAYLOAD
    .map((event) => normalizeHomepageEvent(event))
    .find((event) => isScheduledShowLive(event, now)) || null;
}

const LIVE_QUEUE_NAMES = [
  "Jamie L.", "Priya M.", "Devon R.", "Carla J.", "Sophie A.", "Monique T.",
  "Riley B.", "Harper V.", "Tasha W.", "Megan C.", "Bailey H.", "Jordan P.",
  "Lindsey F.", "Cassie N.", "Avery D.", "Noelle K.", "Rae S.", "Mira T.",
  "Joelle G.", "Kelsey B.", "Danielle R.", "Heather M.", "Brittany J.", "Tori C.",
  "Amber L.", "Sadie P.", "Lauren E.", "Robin A.", "Faith D.", "Nicole V.",
];

const FALLBACK_LIVE_QUEUE_ENTRIES = LIVE_QUEUE_NAMES.map((name, index) => ({
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
const CONTENT_LIVE_QUEUE_ENTRIES = Array.isArray(CONTENT.liveQueueEntries)
  ? CONTENT.liveQueueEntries
      .map((entry, index) => ({
        position: Number(entry.position) || index + 1,
        label: runtimeText(entry.label) || (index === 0 ? "Currently Unboxing" : index === 1 ? "On Deck" : "In Lineup"),
        name: runtimeText(entry.name),
        highlight: Boolean(entry.highlight),
      }))
      .filter((entry) => entry.name)
  : [];
const LIVE_QUEUE_ENTRIES = CONTENT_LIVE_QUEUE_ENTRIES.length > 0 || RUNTIME_CONTEXT.targeted
  ? CONTENT_LIVE_QUEUE_ENTRIES
  : FALLBACK_LIVE_QUEUE_ENTRIES;

function getLiveQueueSummary(fallback) {
  return runtimeText(CONTENT.liveQueueSummary) || fallback;
}

function getContentLiveQueueState() {
  const state = runtimeText(CONTENT.liveQueueState);
  return ["live", "offline", "loading", "empty", "delayed"].includes(state) ? state : null;
}

const LiveLineupContext = React.createContext(null);
function LiveLineupStatus() {
  const lineup = React.useContext(LiveLineupContext);
  if (!lineup) return null;
  const updated = Date.parse(lineup.liveQueueLastUpdated);
  if (!Number.isFinite(updated)) return null;
  return <p className="hp-lineup-status">
    Updated {homepageDateLabel(updated, { hour: 'numeric', minute: '2-digit' })}
  </p>;
}

function LiveLineupUpdatedAt({ lineup }) {
  const updatedAt = Date.parse(lineup?.liveQueueLastUpdated);
  if (!Number.isFinite(updatedAt)) return null;
  return (
    <time
      className="hp-trade-preview-updated"
      dateTime={new Date(updatedAt).toISOString()}
      title={homepageDateLabel(updatedAt, { dateStyle: 'short', timeStyle: 'medium' })}
    >
      {lineup?.liveQueueState === "delayed" ? "Updating · Last update " : "Updated "}{homepageDateLabel(updatedAt, { hour: "numeric", minute: "2-digit" })}
    </time>
  );
}

// ============================================================
// Preset combos
// ============================================================
const PRESETS = {
  amethyst: {
    heroMotion: "sparkle_rise",
    sparkleLevel: "glittery", bgTreatment: "confetti", cardSurface: "holographic",
    textureOverlay: "sparkle", buttonEnergy: "calm", ctaEmphasis: "standard",
    tradeFlair: "holo-unicorn", cursorEffect: "sparkle", saturation: 130,
    bgTone: "lavender", primaryColor: "#5C0EFF", accentColor: "#FF1AC2",
    headingFont: "italiana", bodyFont: "inter", headingWeight: 600,
  },
  sparkle_suite_morganite: {
    heroMotion: "soft_glow",
    sparkleLevel: "subtle", bgTreatment: "suite-paper", cardSurface: "warm-paper",
    textureOverlay: "none", buttonEnergy: "suite-lift", ctaEmphasis: "standard",
    tradeFlair: "soft-pink-lift", cursorEffect: "default", saturation: 104,
    bgTone: "suiteBlush", primaryColor: "#ee2c9b", accentColor: "#ff4cae",
    headingFont: "playfair", bodyFont: "dmSans", headingWeight: 500,
  },
  black_diamond: {
    heroMotion: "sparkle_rise",
    sparkleLevel: "glittery", bgTreatment: "black-velvet", cardSurface: "dark-metallic",
    textureOverlay: "sparkle", buttonEnergy: "diamond-lift", ctaEmphasis: "standard",
    tradeFlair: "cyan-diamond", cursorEffect: "default", saturation: 112,
    bgTone: "blackDiamond", primaryColor: "#d4af37", accentColor: "#00d9ff",
    headingFont: "playfair", bodyFont: "dmSans", headingWeight: 600,
  },
  moonstone: {
    heroMotion: "soft_glow",
    sparkleLevel: "subtle", bgTreatment: "moonstone-charcoal", cardSurface: "silver-pearl",
    textureOverlay: "none", buttonEnergy: "moonstone-lift", ctaEmphasis: "standard",
    tradeFlair: "silver-violet", cursorEffect: "default", saturation: 108,
    bgTone: "moonstone", primaryColor: "#7c3aed", accentColor: "#cbd5e1",
    headingFont: "playfair", bodyFont: "dmSans", headingWeight: 600,
  },
  alpine_opal: {
    heroMotion: "sparkle_rise",
    sparkleLevel: "glittery", bgTreatment: "alpine-opal", cardSurface: "frosted-opal",
    textureOverlay: "sparkle", buttonEnergy: "alpine-pop", ctaEmphasis: "standard",
    tradeFlair: "opal-summit", cursorEffect: "default", saturation: 112,
    bgTone: "alpineOpal", primaryColor: "#ec4899", accentColor: "#38bdf8",
    headingFont: "playfair", bodyFont: "dmSans", headingWeight: 600,
  },
  emerald_garden: {
    heroMotion: "soft_glow",
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
  gilded_autumn: {
  "primaryColor": "#91451d",
  "accentColor": "#b18338",
  "bgTone": "gildedAutumn",
  "headingFont": "playfair",
  "bodyFont": "dmSans",
  "headingWeight": 500,
  "shapeRadius": "soft",
  "density": "regular",
  "saturation": 100,
  "heroMotion": "autumn_leaves",
  "sparkleLevel": "none",
  "bgTreatment": "gilded-autumn",
  "cardSurface": "warm-paper",
  "textureOverlay": "none",
  "buttonEnergy": "suite-lift",
  "ctaEmphasis": "standard",
  "tradeFlair": "champagne-copper",
  "cursorEffect": "default",
  "tickerSpeed": 1
},
  halloween_pumpkin_cat: {
    "primaryColor": "#ff923d",
    "accentColor": "#f4eee3",
    "bgTone": "halloweenPumpkinCat",
    "headingFont": "georgia",
    "bodyFont": "arial",
    "headingWeight": 600,
    "shapeRadius": "soft",
    "density": "regular",
    "saturation": 100,
    "heroMotion": "cat_candle",
    "sparkleLevel": "none",
    "bgTreatment": "halloween-pumpkin-cat",
    "cardSurface": "pumpkin-cat-glass",
    "textureOverlay": "none",
    "buttonEnergy": "pumpkin-glow",
    "ctaEmphasis": "standard",
    "tradeFlair": "moonlit-sparkles",
    "cursorEffect": "default",
    "tickerSpeed": 1
},
  halloween_pumpkin_witch: {
    primaryColor: "#ff6a00", accentColor: "#f4eee3", bgTone: "halloweenPumpkinWitch",
    headingFont: "playfair", bodyFont: "dmSans", headingWeight: 600,
    shapeRadius: "soft", density: "regular", saturation: 112,
    heroMotion: "witch_flight", sparkleLevel: "glittery",
    bgTreatment: "halloween-pumpkin-witch", cardSurface: "midnight-glass",
    textureOverlay: "halloween-sparkles", buttonEnergy: "pumpkin-glow", ctaEmphasis: "standard",
    tradeFlair: "moonlit-sparkles", cursorEffect: "default", tickerSpeed: 1,
  },
  rose_gold: {
    heroMotion: "sparkle_rise",
    sparkleLevel: "subtle", bgTreatment: "rose-gold-paper", cardSurface: "pearl-rose",
    textureOverlay: "none", buttonEnergy: "rose-gold-lift", ctaEmphasis: "standard",
    tradeFlair: "champagne-rose", cursorEffect: "default", saturation: 108,
    bgTone: "roseGold", primaryColor: "#e04f73", accentColor: "#f5c66d",
    headingFont: "playfair", bodyFont: "dmSans", headingWeight: 600,
  },
  midnight_rose: {
    heroMotion: "sparkle_rise", sparkleLevel: "subtle",
    bgTreatment: "midnight-rose", cardSurface: "midnight-rose",
    textureOverlay: "none", buttonEnergy: "midnight-rose-lift", ctaEmphasis: "standard",
    tradeFlair: "copper-midnight", cursorEffect: "default", saturation: 100, tickerSpeed: 1,
    bgTone: "midnightRose", primaryColor: "#efb5a3", accentColor: "#d29b82",
    headingFont: "playfair", bodyFont: "dmSans", headingWeight: 600,
    shapeRadius: "soft", density: "regular",
  },
  fall_owl_harvest_moon: {
    heroMotion: "sparkle_rise", sparkleLevel: "subtle",
    bgTreatment: "fall-owl", cardSurface: "fall-owl",
    textureOverlay: "none", buttonEnergy: "fall-owl-lift", ctaEmphasis: "standard",
    tradeFlair: "copper-midnight", cursorEffect: "default", saturation: 100, tickerSpeed: 1,
    bgTone: "fallOwl", primaryColor: "#efba73", accentColor: "#c7854f",
    headingFont: "playfair", bodyFont: "dmSans", headingWeight: 600,
    shapeRadius: "soft", density: "regular",
  },
  gobble_and_fizz: {
    heroMotion: "sparkle_rise", sparkleLevel: "subtle",
    bgTreatment: "gobble-and-fizz", cardSurface: "gobble-and-fizz",
    textureOverlay: "none", buttonEnergy: "gobble-and-fizz-lift", ctaEmphasis: "standard",
    tradeFlair: "copper-thanksgiving", cursorEffect: "default", saturation: 100, tickerSpeed: 1,
    bgTone: "gobbleAndFizz", primaryColor: "#efb36c", accentColor: "#c9854f",
    headingFont: "playfair", bodyFont: "dmSans", headingWeight: 600,
    shapeRadius: "soft", density: "regular",
  },
  pie_please: {
    heroMotion: "sparkle_rise", sparkleLevel: "subtle",
    bgTreatment: "pie-please", cardSurface: "pie-please",
    textureOverlay: "none", buttonEnergy: "pie-please-lift", ctaEmphasis: "standard",
    tradeFlair: "copper-thanksgiving", cursorEffect: "default", saturation: 100, tickerSpeed: 1,
    bgTone: "piePlease", primaryColor: "#9b233d", accentColor: "#b95015",
    headingFont: "playfair", bodyFont: "dmSans", headingWeight: 600,
    shapeRadius: "soft", density: "regular",
  },
  pearl_rose: {
    heroMotion: "sparkle_rise", sparkleLevel: "subtle",
    bgTreatment: "pearl-rose", cardSurface: "pearl-rose-paper",
    textureOverlay: "none", buttonEnergy: "pearl-rose-lift", ctaEmphasis: "standard",
    tradeFlair: "copper-pearl", cursorEffect: "default", saturation: 100, tickerSpeed: 1,
    bgTone: "pearlRose", primaryColor: "#954354", accentColor: "#d29b82",
    headingFont: "playfair", bodyFont: "dmSans", headingWeight: 600,
    shapeRadius: "soft", density: "regular",
  },
  sunset_beach: {
    heroMotion: "sparkle_rise",
    sparkleLevel: "subtle", bgTreatment: "sunset-beach", cardSurface: "pearl-rose",
    textureOverlay: "none", buttonEnergy: "rose-gold-lift", ctaEmphasis: "standard",
    tradeFlair: "champagne-rose", cursorEffect: "default", saturation: 108,
    bgTone: "roseGold", primaryColor: "#b82f59", accentColor: "#ad472d",
    headingFont: "playfair", bodyFont: "dmSans", headingWeight: 600,
  },
  rose_champagne: {
    heroMotion: "sparkle_rise",
    sparkleLevel: "subtle", bgTreatment: "rose-champagne", cardSurface: "pearl-rose",
    textureOverlay: "none", buttonEnergy: "rose-gold-lift", ctaEmphasis: "standard",
    tradeFlair: "champagne-rose", cursorEffect: "default", saturation: 108,
    bgTone: "roseGold", primaryColor: "#a04e5d", accentColor: "#d29b82",
    headingFont: "playfair", bodyFont: "dmSans", headingWeight: 600,
  },
  garnet: {
    heroMotion: "soft_glow",
    sparkleLevel: "subtle", bgTreatment: "garnet-shell", cardSurface: "blush-shell",
    textureOverlay: "none", buttonEnergy: "garnet-lift", ctaEmphasis: "standard",
    tradeFlair: "ruby-polish", cursorEffect: "default", saturation: 112,
    bgTone: "garnet", primaryColor: "#B91C1C", accentColor: "#920000",
    headingFont: "boska", bodyFont: "switzer", headingWeight: 600,
  },
  amber: {
    heroMotion: "sparkle_rise",
    sparkleLevel: "subtle", bgTreatment: "amber-paper", cardSurface: "sunlit-pearl",
    textureOverlay: "none", buttonEnergy: "amber-pop", ctaEmphasis: "standard",
    tradeFlair: "citrine-glow", cursorEffect: "default", saturation: 116,
    bgTone: "amber", primaryColor: "#F97316", accentColor: "#761A00",
    headingFont: "melodrama", bodyFont: "nunito", headingWeight: 600,
  },
  velvet: {
    heroMotion: "sparkle_rise",
    sparkleLevel: "glittery", bgTreatment: "velvet-orchid", cardSurface: "plush-orchid",
    textureOverlay: "sparkle", buttonEnergy: "velvet-lift", ctaEmphasis: "standard",
    tradeFlair: "orchid-gloss", cursorEffect: "default", saturation: 110,
    bgTone: "velvet", primaryColor: "#9333EA", accentColor: "#6300B9",
    headingFont: "bitter", bodyFont: "archivo", headingWeight: 600,
  },
  rose_quartz: {
    heroMotion: "sparkle_rise",
    sparkleLevel: "glittery", bgTreatment: "quartz-paper", cardSurface: "pink-quartz",
    textureOverlay: "sparkle", buttonEnergy: "quartz-pop", ctaEmphasis: "standard",
    tradeFlair: "pink-spark", cursorEffect: "default", saturation: 114,
    bgTone: "roseQuartz", primaryColor: "#E879F9", accentColor: "#63146E",
    headingFont: "sharpie", bodyFont: "ranade", headingWeight: 600,
  },
};

// ============================================================
// Color tone palettes
// ============================================================
const TONES = {
  gildedAutumn: {bg:"#fff8ec",elevated:"#fffdf7",deep:"#f0dfc5"},
  halloweenPumpkinCat: {bg:"#080706",elevated:"#1b1511",deep:"#050403"},
  lavender: { bg: "#E8DFF5", elevated: "#F2EBFA", deep: "#DCD0EE" },
  warm:     { bg: "#FFF0E8", elevated: "#FFF7F1", deep: "#FFE2D0" },
  cool:     { bg: "#E0EBFF", elevated: "#EEF3FF", deep: "#CFDFFF" },
  paper:    { bg: "#FAF7F2", elevated: "#FFFFFF", deep: "#F0EAE0" },
  midnight: { bg: "#1A0F2E", elevated: "#241640", deep: "#100828" },
  neon:     { bg: "#FFE6FA", elevated: "#FFF0FD", deep: "#FFD1F2" },
  suiteBlush: { bg: "#fcf8f6", elevated: "#fffefd", deep: "#f6ede8" },
  blackDiamond: { bg: "#080808", elevated: "#15110f", deep: "#030303" },
  moonstone: { bg: "#15121d", elevated: "#211b2c", deep: "#0d0b13" },
  alpineOpal: { bg: "#fdf2f8", elevated: "#f0f9ff", deep: "#1e1b4b" },
  emeraldGarden: { bg: "#f8f7f0", elevated: "#ffffff", deep: "#dfe9dd" },
  gnomeGarden: { bg: "#173126", elevated: "#FFF3D6", deep: "#102319" },
  neonButterfly: { bg: "#120414", elevated: "#261029", deep: "#09010c" },
  roseGold: { bg: "#fff5f6", elevated: "#fffafa", deep: "#ffe8ec" },
  midnightRose: { bg: "#180e16", elevated: "#271920", deep: "#100910" },
  fallOwl: { bg: "#201321", elevated: "#302030", deep: "#160e18" },
  gobbleAndFizz: { bg: "#291522", elevated: "#392330", deep: "#1d111a" },
  piePlease: { bg: "#fcf3e5", elevated: "#fffaf2", deep: "#f2dfc9" },
  pearlRose: { bg: "#faf5ef", elevated: "#fffefa", deep: "#f2e5dc" },
  garnet: { bg: "#FFE5DD", elevated: "#fff8f5", deep: "#ffd0c4" },
  amber: { bg: "#FAFAFA", elevated: "#fffaf5", deep: "#ffe4cf" },
  velvet: { bg: "#FFE8FF", elevated: "#fff7ff", deep: "#f7c9ff" },
  roseQuartz: { bg: "#FAFAFA", elevated: "#fff7ff", deep: "#ffd8ff" },
};

const FONTS = {
  georgia: 'Georgia, "Times New Roman", serif',
  arial: 'Arial, sans-serif',
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
// Match fallback metrics while the embedded face is decoded on slower CPUs.
for (const key of Object.keys(FONTS)) {
  FONTS[key] = FONTS[key].replace(/^"([^"]+)"/, (match, family) => `${match}, "${family.toLowerCase()} fallback"`);
}

// ============================================================
// LRQ rail
// ============================================================
function LRQRail({ state }) {
  if (state === "offline") {
    return (
      <div className="hp-lrq">
        <div className="hp-lrq-inner">
          <div className="hp-lrq-title" style={{ color: "var(--fg-muted)" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--fg-muted)" }} />
            Live Lineup
          </div>
          <div style={{ fontSize: 13, color: "var(--fg-muted)" }}>Lineup opens when the next scheduled show starts.</div>
        </div>
      </div>
    );
  }
  if (state === "loading") {
    return (
      <div className="hp-lrq">
        <div className="hp-lrq-inner">
          <div className="hp-lrq-title">
            <span className="live-dot" />
            Live Lineup
          </div>
          <div style={{ fontSize: 13, color: "var(--fg-muted)" }}>Loading lineup…</div>
        </div>
      </div>
    );
  }
  if (state === "empty" || LIVE_QUEUE_ENTRIES.length === 0) {
    return (
      <div className="hp-lrq">
        <div className="hp-lrq-inner">
          <div className="hp-lrq-title">
            <span className="live-dot" />
            Live Lineup
          </div>
          <div style={{ fontSize: 13, color: "var(--fg)", fontWeight: 600 }}>✦ Ready to Reveal! ✦</div>
        </div>
      </div>
    );
  }
  return (
    <div className="hp-lrq">
      <div className="hp-lrq-inner">
        <div className="hp-lrq-title">
          <span className="live-dot" />
          Live Lineup
        </div>
        <div className="hp-lrq-items">
          <div className="hp-lrq-item">
            <span className="pos">1</span>
            <span className="label">Currently Unboxing</span>
            <span className="name slot" data-slot="customer name">Jamie L.</span>
          </div>
          <div className="hp-lrq-item on-deck">
            <span className="pos">2</span>
            <span className="label">On Deck</span>
            <span className="name slot" data-slot="customer name">Priya M.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Hero (HE2)
// ============================================================
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
        <img src="/amethyst/skins/gnome-garden/lantern.webp" srcSet="/amethyst/skins/gnome-garden/lantern-delivery-48.webp 48w, /amethyst/skins/gnome-garden/lantern-delivery-96.webp 96w, /amethyst/skins/gnome-garden/lantern.webp 157w" sizes="(max-width: 767px) 48px, 100px" alt="" width="157" height="400" decoding="async" />
      </span>
      <span className="gg-lantern gg-lantern-right">
        <img src="/amethyst/skins/gnome-garden/lantern.webp" srcSet="/amethyst/skins/gnome-garden/lantern-delivery-48.webp 48w, /amethyst/skins/gnome-garden/lantern-delivery-96.webp 96w, /amethyst/skins/gnome-garden/lantern.webp 157w" sizes="(max-width: 767px) 48px, 100px" alt="" width="157" height="400" decoding="async" />
      </span>
      {Array.from({ length: 8 }, (_, index) => (
        <span className="gg-firefly" data-firefly-index={index + 1} key={index} />
      ))}
      <img className="gg-gnome" src="/amethyst/skins/gnome-garden/gnome.webp" srcSet="/amethyst/skins/gnome-garden/gnome-delivery-96.webp 96w, /amethyst/skins/gnome-garden/gnome-delivery-192.webp 192w, /amethyst/skins/gnome-garden/gnome.webp 347w" sizes="(max-width: 767px) 82px, 180px" alt="" width="347" height="640" decoding="async" />
    </div>
  );
}

function HeroFirstPaintArt({ preset }) {
  const art = {
    amethyst: ['au-art', 'am01-unicorn/opening-poster.webp', 1310, 704],
    halloween_pumpkin_cat: ['hpc-art', 'halloween-pumpkin-cat/hero-desktop.webp', 1672, 941],
    gilded_autumn: ['ga-art', 'gilded-autumn/hero-poster.webp', 1204, 764],
  }[preset];
  if (!art) return null;
  return <>
    <style>{`.hp-hero:has(.au-video,.hpc-video,.ga-video) [data-first-paint-art]{display:none}`}</style>
    <div className={art[0]} data-first-paint-art="true" aria-hidden="true">
      <img src={'/amethyst/skins/' + art[1]} alt="" width={art[2]} height={art[3]}
        {...(preset === 'halloween_pumpkin_cat' ? {
          srcSet: [720,1200,1672].map(w => '/amethyst/skins/halloween-pumpkin-cat/hero-desktop-' + w + '.webp ' + w + 'w').join(', '),
          sizes: '(max-width: 600px) 178vw, (max-width: 1100px) min(134vw, 965px), 100vw',
        } : preset === 'gilded_autumn' ? {
          srcSet: '/amethyst/skins/gilded-autumn/hero-poster-delivery-360.webp 360w, /amethyst/skins/gilded-autumn/hero-poster-delivery-720.webp 720w, /amethyst/skins/gilded-autumn/hero-poster-delivery-1440.webp 1440w', sizes: '(max-width:400px) 360px, 100vw',
        } : {})} decoding="async" fetchpriority="high" />
    </div>
  </>;
}

function Hero({ t, isLive, liveShow }) {
  const joinTeamHref = CONTENT.footerLinks?.joinTeam || "";
  const mileHighFizzKicker = t.heroEyebrow || CONTENT.heroEyebrow || "With Lindsey";
  const heroWatchLinks = getHeroWatchLinks(liveShow, isLive);

  return (
    <>
    <section className="hp-hero" data-appearance-preset={t.preset} data-hero-motion={t.heroMotion === "still" || t.heroMotion === "none" ? "off" : "on"} data-cat-motion={t.heroMotion === "still" ? "off" : "on"}>
      <HeroFirstPaintArt preset={t.preset} />
      {t.preset === "gnome_garden" && <GnomeGardenDecoration />}
      <div className="hp-hero-media" aria-hidden="true">
        {t.preset === "sunset_beach" && <div className="beach-motion-layer" data-first-paint-video="true" style={{ opacity: 1 }}>
          <video poster="/amethyst/skins/sunset-beach/hero-poster-720.webp" width="1280" height="720" preload="none" playsInline tabIndex={-1} />
        </div>}
      </div>
      {t.preset !== "halloween_pumpkin_cat" && t.preset !== "amethyst" && <SparkleFx level={t.sparkleLevel} motion={t.heroMotion} />}
      <div className="hp-hero-inner">
        <div>
          {isMileHighFizzHybrid && (
            <div className="hp-mhf-hero-kicker">{mileHighFizzKicker}</div>
          )}
          <h2 className="hp-hero-headline slot" data-slot="hero headline">
            {t.heroHeadline.split(/(?<=[.!?])\s+/).map((line, i) => (
              <span key={i} style={{ display: 'block' }}>{line}</span>
            ))}
          </h2>
          <p className="hp-hero-sub slot" data-slot="hero sub">{t.heroSub}</p>
          <div className="hp-hero-ctas">
            {isMileHighFizzHybrid ? (
              <>
                <div className="hp-hero-cta-stack">
                  <div className="hp-hero-cta-primary-row">
                    <a {...linkProps(getShopHref())} className="hp-btn-primary hp-btn-sparkle">
                      Shop Bomb Party
                      <span className="spark" /><span className="spark" /><span className="spark" /><span className="spark" />
                    </a>
                    {joinTeamHref && <a {...linkProps(joinTeamHref)} className="hp-btn-outline">Join My Team</a>}
                    {heroWatchLinks.map((link) => (
                      <a key={link.id} {...linkProps(link.href)} className={`hp-btn-outline hp-btn-watch ${isLive && link.id === "tiktok" ? "is-live" : "is-offline"}`}>
                        {isLive && link.id === "tiktok" && <span className="hp-watch-dot" />}
                        {link.label}
                      </a>
                    ))}
                    <SocialHeroLinks className="hp-btn-outline hp-btn-watch" />
                  </div>
                  <a {...linkProps(getTradeBoardHref())} className="hp-btn-primary hp-btn-sparkle hp-hero-trade-board-cta">
                    {isBrittDanceFloorComingSoon ? "Dance Floor · Coming soon" : "Browse the dance floor"}
                    <span className="spark" /><span className="spark" /><span className="spark" /><span className="spark" />
                  </a>
                </div>
              </>
            ) : (
              <>
                <div className="hp-hero-cta-stack">
                  <div className="hp-hero-cta-primary-row">
                    <a {...linkProps(getShopHref())} className="hp-btn-outline">Shop Bomb Party</a>
                    {t.preset === "halloween_pumpkin_cat" && isBrittWithBlingHybrid && joinTeamHref && <a {...linkProps(joinTeamHref)} className="hp-btn-outline">Join the Team</a>}
                    {heroWatchLinks.map((link) => (
                      <a key={link.id} {...linkProps(link.href)} className={`hp-btn-outline hp-btn-watch ${isLive && link.id === "tiktok" ? "is-live" : "is-offline"}`}>
                        {isLive && link.id === "tiktok" && <span className="hp-watch-dot" />}
                        {link.label}
                      </a>
                    ))}
                    <SocialHeroLinks className="hp-btn-outline hp-btn-watch" />
                  </div>
                  <a {...linkProps(getTradeBoardHref())} className="hp-btn-primary hp-btn-sparkle hp-hero-trade-board-cta">
                    {isBrittDanceFloorComingSoon ? "Dance Floor · Coming soon" : "Browse the dance floor"}
                    <span className="spark" /><span className="spark" /><span className="spark" /><span className="spark" />
                  </a>
                  {isHeatherBlingKitchenSite && CONTENT.pantryPageUrl && (
                    <a {...linkProps(CONTENT.pantryPageUrl)} className="hp-btn-primary hp-btn-sparkle hp-hero-trade-board-cta">
                      In the Pantry
                      <span className="spark" /><span className="spark" /><span className="spark" /><span className="spark" />
                    </a>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
    </>
  );
}

// ============================================================
// Ticker (T3 dual)
// ============================================================
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

function getTikTokVideoId(value) {
  const input = String(value || "");
  const sourceUrl = getCustomerVideoSourceUrl(input);
  if (!isCustomerVideoHost(sourceUrl, ["tiktok.com"])) return "";
  const dataId = input.match(/data-video-id\s*=\s*["']?(\d+)/i);
  if (dataId) return dataId[1];

  const urlId = sourceUrl.match(/(?:\/video\/|\/player\/v1\/|\/embed\/(?:v2\/)?)(\d+)/i);
  return urlId ? urlId[1] : "";
}

function getYouTubeVideoId(value) {
  const input = getCustomerVideoSourceUrl(value);
  if (!isCustomerVideoHost(input, ["youtube.com", "youtube-nocookie.com", "youtu.be"])) return "";
  const shortId = input.match(/(?:youtube\.com\/(?:shorts|embed|live)\/|youtu\.be\/)([\w-]{6,})/i);
  if (shortId) return shortId[1];

  const watchId = input.match(/[?&]v=([\w-]{6,})/i);
  return watchId ? watchId[1] : "";
}

function getCustomerVideoSourceUrl(value) {
  const input = String(value || "").trim();
  if (!input || input === "#") return "";
  const embedSource = input.match(/\b(?:src|cite|href)=["'](https?:\/\/[^"']+)["']/i)?.[1];
  const candidate = embedSource || input;
  try {
    const url = new URL(candidate);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

function isCustomerVideoHost(value, allowedDomains) {
  try {
    const host = new URL(value).hostname.toLowerCase().replace(/\.$/, "");
    return allowedDomains.some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

function getCustomerVideoProvider(value) {
  if (getTikTokVideoId(value)) return "tiktok";
  if (getYouTubeVideoId(value)) return "youtube";
  if (getInstagramEmbedUrl(value)) return "instagram";
  if (getFacebookVideoEmbedUrl(value)) return "facebook";
  return "";
}

function getThemeSampleVideoPath(value) {
  const input = String(value || "").trim();
  return /^\/amethyst\/skins\/[a-z0-9-]+\/hero-loop(?:-v\d+)?\.mp4$/.test(input) ? input : "";
}

function getCustomerVideoPresentation(value) {
  const sourceUrl = getCustomerVideoSourceUrl(value);
  const provider = getCustomerVideoProvider(sourceUrl);
  const presentations = {
    tiktok: { label: "TikTok", ctaLabel: "Watch on TikTok" },
    youtube: { label: "YouTube", ctaLabel: "Watch on YouTube" },
    instagram: { label: "Instagram", ctaLabel: "Open on Instagram" },
    facebook: { label: "Facebook", ctaLabel: "Watch on Facebook" },
  };
  return {
    provider,
    outboundUrl: provider ? sourceUrl : "",
    ...(presentations[provider] || { label: "Video", ctaLabel: "Watch video" }),
  };
}

// Repository-owned Lucide glyphs (ISC), inline so opaque previews need no external SVG fetch.
const CUSTOMER_MEDIA_GLYPHS = {
"video": <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
    <rect x="2" y="6" width="14" height="12" rx="2" />
  </g>,
"camera": <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z" />
    <circle cx="12" cy="13" r="3" />
  </g>,
"shopping-bag": <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 10a4 4 0 0 1-8 0" />
    <path d="M3.103 6.034h17.794" />
    <path d="M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z" />
  </g>,
"gift": <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 7v14" />
    <path d="M20 11v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8" />
    <path d="M7.5 7a1 1 0 0 1 0-5A4.8 8 0 0 1 12 7a4.8 8 0 0 1 4.5-5 1 1 0 0 1 0 5" />
    <rect x="3" y="7" width="18" height="4" rx="1" />
  </g>,
"calendar": <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2v4" />
    <path d="M16 2v4" />
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <path d="M3 10h18" />
  </g>,
"external-link": <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </g>,
"play": <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />
  </g>,
"sparkles": <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />
    <path d="M20 2v4" />
    <path d="M22 4h-4" />
    <circle cx="4" cy="20" r="2" />
  </g>,
"tiktok": <g fill="currentColor">
    <path d="M16.6 3c.4 2.4 1.9 4 4.2 4.3v3.4c-1.6 0-3-.4-4.2-1.3v6.2c0 3.4-2.5 5.7-5.8 5.7-3.1 0-5.5-2.1-5.5-5.1 0-3.2 2.5-5.3 5.8-5.3.4 0 .8 0 1.1.1v3.4c-.4-.1-.8-.2-1.2-.2-1.4 0-2.4.8-2.4 2s.9 2 2.2 2c1.4 0 2.3-.9 2.3-2.8V3h3.5Z" />
  </g>,
"facebook": <g fill="currentColor">
    <path d="M14.2 8.1V6.6c0-.7.5-.9.9-.9h2.3V2.2L14.2 2c-3.2 0-4.8 1.9-4.8 5.1v1H7v3.8h2.4V22h4.2V11.9h3.1l.5-3.8h-3Z" />
  </g>,
"instagram": <g fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="4" y="4" width="16" height="16" rx="4.5" />
    <circle cx="12" cy="12" r="3.4" />
    <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
  </g>,
"youtube": <g fill="currentColor">
    <path d="M21.6 7.2a3 3 0 0 0-2.1-2.1C17.7 4.6 12 4.6 12 4.6s-5.7 0-7.5.5a3 3 0 0 0-2.1 2.1A31 31 0 0 0 2 12a31 31 0 0 0 .4 4.8 3 3 0 0 0 2.1 2.1c1.8.5 7.5.5 7.5.5s5.7 0 7.5-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 22 12a31 31 0 0 0-.4-4.8ZM10 15.4V8.6l5.9 3.4-5.9 3.4Z" />
  </g>
};
function CustomerMediaIcon({ name }) {
  return (
    <svg className="hp-customer-media-icon-svg" viewBox="0 0 24 24" aria-hidden="true">
      {CUSTOMER_MEDIA_GLYPHS[name] || null}
    </svg>
  );
}

function CustomerMediaCard({
  variant,
  dataSlot,
  icon = "video",
  title,
  subtitle,
  provider = "",
  mediaUrl = "",
  emptyLabel,
  footer,
  className = "",
  children,
}) {
  const populated = Boolean(mediaUrl);
  return (
    <figure
      className={`hp-customer-media-card hp-customer-media-card-${variant} ${populated ? "is-populated" : "is-empty"} ${className}`.trim()}
      data-media-provider={provider || "empty"}
      data-slot={dataSlot}
    >
      <div className="hp-customer-media-header">
        <span className="hp-customer-media-icon"><CustomerMediaIcon name={icon} /></span>
        <span className="hp-customer-media-heading">
          <strong>{title}</strong>
          {subtitle ? <span>{subtitle}</span> : null}
        </span>
        <span className="hp-customer-media-spark" aria-hidden="true"><CustomerMediaIcon name="sparkles" /></span>
      </div>
      <div className="hp-customer-media-viewport">
        {populated ? children : (
          <div className="hp-customer-media-empty">
            <span className="hp-customer-media-empty-icon"><CustomerMediaIcon name={icon} /></span>
            <span>{emptyLabel}</span>
          </div>
        )}
      </div>
      {mediaUrl ? footer : null}
    </figure>
  );
}

function CustomerVideoCard({
  className = "",
  dataSlot,
  title,
  subtitle,
  videoUrl,
  variant,
}) {
  const presentation = getCustomerVideoPresentation(videoUrl);
  const sampleVideo = getThemeSampleVideoPath(videoUrl);
  const caption = String(subtitle || "").trim();
  return (
    <CustomerMediaCard
      className={className}
      dataSlot={dataSlot}
      emptyLabel={mediaEmptyPrompt(variant === "short" ? "short" : "showcase")}
      icon="video"
      mediaUrl={presentation.outboundUrl || sampleVideo}
      provider={presentation.provider || (sampleVideo ? "sample" : "")}
      subtitle=""
      title={title}
      variant={variant}
      footer={sampleVideo ? (
        caption ? <figcaption className="hp-customer-media-footer hp-about-media-caption">{caption}</figcaption> : null
      ) : presentation.outboundUrl ? (
        <figcaption className="hp-customer-media-footer hp-customer-video-footer">
          {caption ? <span className="hp-customer-video-caption">{caption}</span> : null}
          <a className="hp-customer-media-action" href={presentation.outboundUrl} target="_blank" rel="noreferrer noopener">
            <CustomerMediaIcon name={presentation.provider || "play"} />
            <span>{presentation.ctaLabel}</span>
            <CustomerMediaIcon name="external-link" />
          </a>
        </figcaption>
      ) : null}
    >
      <CustomerVideoEmbed
        className="hp-customer-media-player"
        title={title}
        videoUrl={videoUrl}
      />
    </CustomerMediaCard>
  );
}

function getInstagramEmbedUrl(value) {
  try {
    const url = new URL(String(value || ""));
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (host !== "instagram.com") return "";
    const match = url.pathname.match(/^\/(reel|reels|p)\/([\w-]+)/i);
    if (!match) return "";
    const resource = match[1].toLowerCase() === "reels" ? "reel" : match[1].toLowerCase();
    return `https://www.instagram.com/${resource}/${match[2]}/embed/`;
  } catch {
    return "";
  }
}

function getFacebookVideoEmbedUrl(value) {
  try {
    const url = new URL(String(value || ""));
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (host !== "facebook.com" && host !== "fb.watch") return "";
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url.toString())}&show_text=false&autoplay=false`;
  } catch {
    return "";
  }
}

// Native iframe lazy loading can fetch several screens ahead on fast networks.
// Keep below-fold social players out of the hero's bandwidth and CPU budget.
function DeferredVideoFrame({ frameRef, src, ...props }) {
  const ownRef = useRef(null);
  const ref = frameRef || ownRef;
  const [nearViewport, setNearViewport] = useState(false);
  useEffect(() => {
    if (!ref.current) return undefined;
    if (typeof IntersectionObserver !== "function") { setNearViewport(true); return undefined; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setNearViewport(true); observer.disconnect(); }
    }, { rootMargin: "200px" });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);
  return <iframe {...props} ref={ref} src={nearViewport ? src : undefined} />;
}

function TikTokEmbed({ className = "", videoUrl, title, children, dataSlot }) {
  const frameRef = useRef(null);
  const videoId = getTikTokVideoId(videoUrl);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || !videoId) return undefined;

    const send = (type) => {
      frame.contentWindow?.postMessage(
        { type, "x-tiktok-player": true },
        "https://www.tiktok.com",
      );
    };
    const playMuted = () => {
      send("mute");
      setMuted(true);
      send("play");
    };
    const handlePlayerMessage = (event) => {
      if (event.origin !== "https://www.tiktok.com" || event.source !== frame.contentWindow) return;
      const message = event.data;
      if (message?.["x-tiktok-player"] === true && message.type === "onPlayerReady") {
        playMuted();
      }
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          playMuted();
        }
      },
      { threshold: [0, 0.5] },
    );

    observer.observe(frame);
    window.addEventListener("message", handlePlayerMessage);
    frame.addEventListener("load", playMuted);
    return () => {
      window.removeEventListener("message", handlePlayerMessage);
      frame.removeEventListener("load", playMuted);
      observer.disconnect();
    };
  }, [videoId]);

  if (!videoId) {
    return (
      <div
        className={`ss-tiktok-embed ss-tiktok-embed-fallback ${className}`}
        data-tiktok-embed="false"
      >
        <span className="ss-tiktok-embed-coming-soon">Coming soon</span>
      </div>
    );
  }

  const toggleMute = () => {
    const nextMuted = !muted;
    frameRef.current?.contentWindow?.postMessage(
      { type: nextMuted ? "mute" : "unMute", "x-tiktok-player": true },
      "https://www.tiktok.com",
    );
    setMuted(nextMuted);
  };

  return (
    <div className={`ss-tiktok-embed ${className}`} data-slot={dataSlot} data-tiktok-embed="true">
      <DeferredVideoFrame
        frameRef={frameRef}
        allow="autoplay; fullscreen"
        allowFullScreen
        className="ss-tiktok-embed-frame"
        loading="lazy"
        src={`https://www.tiktok.com/player/v1/${videoId}?autoplay=0&muted=0&loop=1&controls=0&volume_control=0&description=0&music_info=0&rel=0`}
        title={title || "TikTok video"}
      />
      <button
        aria-label={muted ? "Unmute TikTok video" : "Mute TikTok video"}
        className="ss-tiktok-sound-toggle"
        onClick={toggleMute}
        type="button"
      >
        {muted ? "Unmute" : "Mute"}
      </button>
    </div>
  );
}

function CustomerVideoEmbed({ className = "", videoUrl, title, children, dataSlot }) {
  const sampleVideo = getThemeSampleVideoPath(videoUrl);
  if (sampleVideo) {
    const poster = sampleVideo.replace(/hero-loop(-v\d+)?\.mp4$/, "hero-poster$1.webp");
    return (
      <video
        autoPlay
        className={`hp-theme-sample-video ${className}`.trim()}
        loop
        muted
        playsInline
        poster={poster}
        preload="metadata"
        src={sampleVideo}
      />
    );
  }
  const sourceUrl = getCustomerVideoSourceUrl(videoUrl);
  const tiktokVideoId = getTikTokVideoId(sourceUrl || videoUrl);
  const youtubeVideoId = getYouTubeVideoId(sourceUrl || videoUrl);
  const instagramEmbedUrl = getInstagramEmbedUrl(sourceUrl || videoUrl);
  const facebookEmbedUrl = getFacebookVideoEmbedUrl(sourceUrl || videoUrl);

  if (tiktokVideoId) {
    return (
      <TikTokEmbed className={className} dataSlot={dataSlot} title={title} videoUrl={videoUrl}>
        {children}
      </TikTokEmbed>
    );
  }

  const provider = youtubeVideoId
    ? "youtube"
    : instagramEmbedUrl
      ? "instagram"
      : facebookEmbedUrl
        ? "facebook"
        : "";
  const src = youtubeVideoId
    ? `https://www.youtube-nocookie.com/embed/${youtubeVideoId}?autoplay=1&mute=1&loop=1&playlist=${youtubeVideoId}&controls=0&playsinline=1&rel=0`
    : instagramEmbedUrl || facebookEmbedUrl;

  if (!src) {
    return (
      <div className={`ss-customer-video-embed ss-customer-video-embed-fallback ${className}`} data-slot={dataSlot}>
        <span className="ss-tiktok-embed-coming-soon">Coming soon</span>
      </div>
    );
  }

  return (
    <div className={`ss-customer-video-embed ss-customer-video-embed-${provider} ${className}`} data-slot={dataSlot} data-video-provider={provider}>
      <DeferredVideoFrame
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture; web-share"
        allowFullScreen
        className="ss-customer-video-frame"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        src={src}
        title={title || "Customer video"}
      />
      {children}
    </div>
  );
}

function AboutPortraitCard({ fallbackCaption }) {
  const slot = getAboutMediaSlot(0);
  const hasImage = Boolean(slot?.mediaUrl);

  if (!hasImage) {
    return (
      <CustomerMediaCard
        className="hp-about-portrait-card slot"
        dataSlot="about portrait"
        emptyLabel={mediaEmptyPrompt("portrait")}
        icon="camera"
        title="Meet the rep"
        subtitle={fallbackCaption}
        variant="portrait"
      />
    );
  }

  return (
    <CustomerMediaCard
      className="hp-about-portrait-card slot"
      dataSlot="about portrait"
      icon="camera"
      mediaUrl={slot.mediaUrl}
      title="Meet the rep"
      subtitle={fallbackCaption}
      variant="portrait"
      footer={<figcaption className="hp-customer-media-footer hp-about-media-caption">{slot?.caption || fallbackCaption}</figcaption>}
    >
      <img
        {...responsiveRepImage(slot.mediaUrl, {
          alt: slot?.caption || fallbackCaption || "The rep",
          sizes: "(max-width: 800px) 80vw, 420px",
          widths: [384, 640, 828],
        })}
        className="hp-about-portrait-image"
        style={{
          "--hp-about-portrait-focus-x": `${slot?.portraitFocusX ?? 50}%`,
          "--hp-about-portrait-focus-y": `${slot?.portraitFocusY ?? 20}%`,
          "--hp-about-portrait-zoom": slot?.portraitZoom ?? 1.18,
        }}
      />
    </CustomerMediaCard>
  );
}

function AboutShortCard({ index, hideEmptyMedia = false }) {
  const slot = getAboutMediaSlot(index + 1);
  const presentation = getCustomerVideoPresentation(slot?.href);
  if (slot?.mediaUrl && !presentation.provider) {
    return (
      <CustomerMediaCard
        className="hp-about-short-card slot"
        dataSlot={`about short ${index + 1}`}
        icon="camera"
        mediaUrl={slot.mediaUrl}
        title={`Sparkle moment ${index + 1}`}
        variant="short"
        footer={<figcaption className="hp-customer-media-footer hp-about-media-caption">{slot.caption}</figcaption>}
      >
        <img
          alt={slot.caption || `Sparkle moment ${index + 1}`}
          decoding="async"
          loading="lazy"
          src={slot.mediaUrl}
          style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
        />
      </CustomerMediaCard>
    );
  }
  if (hideEmptyMedia && !presentation.provider) return null;

  return (
    <CustomerVideoCard
      className="hp-about-short-card slot"
      dataSlot={`about short ${index + 1}`}
      subtitle={slot?.caption}
      title={`Sparkle moment ${index + 1}`}
      videoUrl={slot?.href}
      variant="short"
    />
  );
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
  // One copy in server HTML; add only the decorative loop after hydration.
  const [looping, setLooping] = useState(false);
  useEffect(() => { setLooping(true); }, []);
  const lineup = React.useContext(LiveLineupContext);
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
  const fallbackTrades = [
    { name: "Citrine Sun Pendant", type: "Necklace", collection: "Birthday" },
    { name: "Rose Quartz Band", type: "Ring", collection: "OG" },
    { name: "Amethyst Halo Ring", type: "Ring", collection: "Birthday" },
    { name: "Pearl Drop Studs", type: "Earrings", collection: "OG" },
    { name: "Estate Sapphire Cluster", type: "Ring", collection: "Sterling Club" },
  ];
  const trades = contentTrades.length > 0 || RUNTIME_CONTEXT.targeted ? contentTrades : fallbackTrades;
  const announcementTickerItems = looping ? buildTickerLoopItems(items, 6) : items;
  const announcementSegmentLength = announcementTickerItems.length / 2;
  const tradeTickerSource = isBrittDanceFloorComingSoon ? [{ name: "Digital Dance Floor coming soon", isEmpty: true }] : trades.length > 0 ? trades : [EMPTY_TRADE_TICKER_ITEM];
  const tickerTrades = looping ? buildTickerLoopItems(tradeTickerSource, 15) : tradeTickerSource;
  const tradeSegmentLength = tickerTrades.length / 2;
  return (
    <div className="hp-ticker" id="trade-board" aria-label="Customer site updates">
      {looping && <div className="hp-ticker-sr">
        <p>Announcements: {items.map((item) => item.text).join("; ")}</p>
        {items.flatMap((item) => item.parts.filter((part) => part.href)).map((part, index) => (
          <a key={`${part.href}-${index}`} {...linkProps(part.href)}>{part.text}</a>
        ))}
        <p>{lineup?.liveQueueSummary || getLiveQueueSummary("Live Lineup opens when the show starts.")}</p>
        <a {...linkProps(getTradeBoardHref())}>{isBrittDanceFloorComingSoon ? "Digital Dance Floor coming soon" : "Browse current dance floor highlights"}</a>
      </div>}
      <div className="hp-ticker-row">
        <span className="hp-ticker-label">Announcements</span>
        <div className="hp-ticker-track" data-ticker-pps={ANNOUNCEMENT_TICKER_SPEED_PPS} aria-hidden={looping ? "true" : undefined}>
          {announcementTickerItems.map((item, i) => (
            <span key={i} className="hp-ticker-item" data-ticker-segment-start={i === 0 ? "true" : undefined} data-ticker-segment-repeat-start={i === announcementSegmentLength ? "true" : undefined}>
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
        <div className="hp-ticker-track" data-ticker-pps={TRADE_TICKER_SPEED_PPS} aria-hidden={looping ? "true" : undefined}>
          {tickerTrades.map((tr, i) => tr.isEmpty ? (
            <span
              key={i}
              className="hp-ticker-empty"
              data-ticker-segment-start={i === 0 ? "true" : undefined}
              data-ticker-segment-repeat-start={i === tradeSegmentLength ? "true" : undefined}
            >
              {tr.name}
            </span>
          ) : (
            <a
              key={i}
              {...linkProps(getTradeBoardHref())}
              className="hp-ticker-trade"
              data-ticker-segment-start={i === 0 ? "true" : undefined}
              data-ticker-segment-repeat-start={i === tradeSegmentLength ? "true" : undefined}
            >
              {danceFloorTickerLabel(tr)}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function LiveQueueStrip({ state, onOpen }) {
  const lineup = React.useContext(LiveLineupContext);
  const entries = lineup?.liveQueueEntries ?? LIVE_QUEUE_ENTRIES;
  if (entries.length === 0) {
    return window.SparkleLiveLineup?.renderEmpty?.(React, CONTENT.liveQueueCalendarHref) || (
      <section className="hp-trade-preview hp-lineup-idle" data-lineup-surface="calendar" aria-label="Upcoming shows">
        <div className="hp-lineup-idle-inner"><span className="hp-lineup-idle-prompt">Check back for upcoming shows</span></div>
      </section>
    );
  }

  return (
    <section className="hp-trade-preview" data-lineup-surface="list">
      <div className="hp-trade-preview-inner">
        <div className="hp-trade-preview-head">
          <span className="live-dot" style={state === "delayed" ? { background: "var(--fg-muted)", animation: "none" } : undefined} />
          <span>Live Lineup</span>
        </div>
        <div className="hp-trade-preview-items">
          {entries.map((entry) => (
            <button key={entry.token || entry.position} data-lineup-token={entry.token} type="button" onClick={onOpen} className="hp-trade-preview-pill">
              <span className="pos">{entry.position}</span>
              <span className="meta">
                <span className="hp-lineup-sparkle" aria-hidden="true">{"\u2727"}</span>
                  <span className="name">{entry.name}</span>
                  {entry.remainingOrders > 1 && <span className="hp-lineup-order-count">{entry.remainingOrders} orders</span>}
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

function LiveQueueModal({ open, onClose, state }) {
  const lineup = React.useContext(LiveLineupContext);
  const entries = lineup?.liveQueueEntries ?? LIVE_QUEUE_ENTRIES;
  const dialogRef = useLiveLineupDialog(open, onClose);
  if (!open) return null;

  const live = state !== "offline" && state !== "loading" && state !== "empty" && entries.length > 0;

  return (
    <div className="hp-queue-modal-mask" onClick={onClose}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="live-lineup-title" tabIndex={-1} className="hp-queue-modal" onClick={(event) => event.stopPropagation()}>
        <div className="hp-queue-modal-head">
          <div>
            <div className="hp-queue-modal-eyebrow">Live Lineup</div>
            <h2 id="live-lineup-title" className="hp-queue-modal-title">
              {live ? "Full lineup" : state === "loading" ? "Loading lineup" : state === "empty" ? "Lineup ready" : "No Live Lineup right now"}
            </h2>
          </div>
          <button type="button" className="hp-queue-modal-close" onClick={onClose} aria-label="Close Live Lineup">×</button>
        </div>

        {entries.length > 0 && <LiveLineupStatus />}
        {state === "offline" ? (
          <div className="hp-queue-modal-empty">{lineup?.liveQueueSummary || getLiveQueueSummary("No show is running right now. Check the calendar for the next scheduled reveal.")}</div>
        ) : state === "loading" ? (
          <div className="hp-queue-modal-empty">Loading lineup…</div>
        ) : state === "empty" || entries.length === 0 ? (
          <div className="hp-queue-modal-empty">{lineup?.liveQueueSummary || getLiveQueueSummary("Live Lineup is ready. Customer names appear here when a live show is connected.")}</div>
        ) : (
          <div className="hp-queue-modal-list" data-lineup-surface="list">
            {entries.map((entry) => (
              <div key={entry.token || entry.position} data-lineup-token={entry.token} className={`hp-queue-modal-row ${entry.highlight ? "now" : ""}`}>
                <span className="pos">{entry.position}</span>
                <div className="meta">
                  <span className="hp-lineup-sparkle" aria-hidden="true">{"\u2727"}</span>
                  <span className="name">{entry.name}</span>
                  {entry.remainingOrders > 1 && <span className="hp-lineup-order-count">{entry.remainingOrders} orders</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Events
// ============================================================
const EVENTS = Array.isArray(HOMEPAGE_EVENT_PAYLOAD) && (HOMEPAGE_EVENT_PAYLOAD.length > 0 || RUNTIME_CONTEXT.targeted) ? HOMEPAGE_EVENT_PAYLOAD : [
  {
    when: "Tue, Nov 12 - 8:00 PM EST", featured: true, name: "Unicorn Magic Drop - November",
    codes: [
      { code: "UNICORN15", desc: "15% off Unicorn tier boxes" },
      { code: "FREESHIP75", desc: "Free shipping on orders $75+" },
      { code: "STACK3", desc: "Buy 3 boxes, get $10 off" },
      { code: "NEWBIE10", desc: "10% off your first order" },
    ],
    collections: ["Citrine Sun Series", "Estate Halo Drop", "November Unicorns", "Holiday Gift Guide"],
    platforms: ["tt", "fb"],
  },
  {
    when: "Sat, Nov 16 - 1:00 PM EST", featured: false, name: "Saturday Sparkle Brunch",
    codes: [
      { code: "BRUNCH10", desc: "10% off Saturday show purchases" },
      { code: "FREESHIP75", desc: "Free shipping on orders $75+" },
      { code: "GIFT20", desc: "$20 off Holiday gift bundles" },
    ],
    collections: ["Holiday Gift Guide", "Diamond Territory"],
    platforms: ["tt"],
  },
];

function formatEventDateLabel(eventTime, timeZone) {
  const parsed = new Date(eventTime);
  if (Number.isNaN(parsed.getTime())) return eventTime;

  return homepageDateLabel(parsed, {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatEventTimeLabel(eventTime, timeZone) {
  const parsed = new Date(eventTime);
  if (Number.isNaN(parsed.getTime())) return eventTime;

  return homepageDateLabel(parsed, {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  });
}

function sanitizeCalendarFilename(title) {
  return (title || "upcoming-show")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeCalendarText(value) {
  return (value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function toCalendarTimestamp(eventTime) {
  return new Date(eventTime)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function buildCalendarDescription(event) {
  const parts = [];

  if (event.description) {
    parts.push(event.description);
  }

  if (Array.isArray(event.codes) && event.codes.length > 0) {
    parts.push(
      `Discount codes: ${event.codes.map((code) => `${code.code} - ${code.desc}`).join("; ")}`,
    );
  }

  if (Array.isArray(event.platforms) && event.platforms.length > 0) {
    parts.push(
      `Watch links: ${event.platforms.map((platform) => `${platform.label}: ${platform.href}`).join(" | ")}`,
    );
  }

  return parts.join("\n\n");
}

function downloadCalendarEvent(event) {
  const startAt = Date.parse(event.eventTime);
  if (Number.isNaN(startAt)) return;

  const endAt = startAt + ((event.durationMinutes || 60) * 60 * 1000);
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Neon Rabbit//Sparkle Suite//EN",
    "BEGIN:VEVENT",
    `UID:${event.id}@neonrabbit.net`,
    `DTSTAMP:${toCalendarTimestamp(new Date().toISOString())}`,
    `DTSTART:${toCalendarTimestamp(event.eventTime)}`,
    `DTEND:${toCalendarTimestamp(new Date(endAt).toISOString())}`,
    `SUMMARY:${escapeCalendarText(event.title)}`,
    `DESCRIPTION:${escapeCalendarText(buildCalendarDescription(event))}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${sanitizeCalendarFilename(event.title)}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function buildGoogleCalendarHref(event) {
  const startAt = Date.parse(event.eventTime);
  if (Number.isNaN(startAt)) return "#";
  const endAt = new Date(startAt + ((event.durationMinutes || 60) * 60 * 1000));
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title || "Upcoming live reveal",
    dates: `${toCalendarTimestamp(event.eventTime)}/${toCalendarTimestamp(endAt.toISOString())}`,
    details: buildCalendarDescription(event),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function buildOutlookCalendarHref(event) {
  const startAt = Date.parse(event.eventTime);
  if (Number.isNaN(startAt)) return "#";
  const endAt = new Date(startAt + ((event.durationMinutes || 60) * 60 * 1000));
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title || "Upcoming live reveal",
    startdt: new Date(startAt).toISOString(),
    enddt: endAt.toISOString(),
    body: buildCalendarDescription(event),
  });
  return `https://outlook.live.com/calendar/0/action/compose?${params.toString()}`;
}

function useCalendarDialog(open, onClose) {
  const ref = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open || !ref.current) return;
    const dialog = ref.current;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () => [...dialog.querySelectorAll('button:not([disabled]), a[href], [tabindex="0"]')].filter(element => !element.hidden);
    (focusable()[0] || dialog).focus();
    function focusin(event) {
      if (!dialog.contains(event.target)) (focusable()[0] || dialog).focus();
    }
    function keydown(event) {
      if (event.key === "Escape") { event.preventDefault(); close.current(); return; }
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0] || dialog;
      const last = items[items.length - 1] || dialog;
      if (!dialog.contains(document.activeElement) || (event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    }
    document.addEventListener("keydown", keydown);
    document.addEventListener("focusin", focusin);
    return () => {
      document.removeEventListener("keydown", keydown);
      document.removeEventListener("focusin", focusin);
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);
  return ref;
}

function CalendarChooser({ event, onClose }) {
  const dialogRef = useCalendarDialog(Boolean(event), onClose);
  if (!event) return null;
  return (
    <div className="hp-calendar-modal-mask" role="presentation" onClick={onClose}>
      <section ref={dialogRef} tabIndex={-1} className="hp-calendar-modal" role="dialog" aria-modal="true" aria-labelledby="calendar-choice-title" onClick={(click) => click.stopPropagation()}>
        <div className="hp-calendar-modal-head">
          <div>
            <div className="hp-calendar-modal-eyebrow">Save the date</div>
            <h2 id="calendar-choice-title" className="hp-calendar-modal-title">Add to your calendar</h2>
            <p>{event.title}</p>
          </div>
          <button type="button" className="hp-calendar-modal-close" onClick={onClose} aria-label="Close calendar choices">×</button>
        </div>
        <div className="hp-calendar-choice-list">
          <a href={buildGoogleCalendarHref(event)} target="_blank" rel="noreferrer" className="hp-calendar-choice google">Google Calendar</a>
          <a href={buildOutlookCalendarHref(event)} target="_blank" rel="noreferrer" className="hp-calendar-choice outlook">Outlook Calendar</a>
          <button type="button" className="hp-calendar-choice other" onClick={() => downloadCalendarEvent(event)}>Apple Calendar or another app</button>
        </div>
        <p className="hp-calendar-modal-note">Apple Calendar and many other calendar apps use the calendar file download.</p>
      </section>
    </div>
  );
}

function normalizeHomepageEvent(event) {
  const title = event.title || event.name || "Upcoming live reveal";
  const eventTime = event.eventTime || null;
  let timeZone = event.timeZone || "America/New_York";
  try { new Intl.DateTimeFormat("en-US", { timeZone }); }
  catch { timeZone = "America/New_York"; }
  const when = event.when || (eventTime
    ? `${formatEventDateLabel(eventTime, timeZone)} - ${formatEventTimeLabel(eventTime, timeZone)}`
    : "Date TBD - Time TBD");
  const platforms = Array.isArray(event.platforms)
    ? event.platforms.map((platform) => {
        if (typeof platform === "string") {
          return platform === "fb"
            ? { kind: "fb", label: "Watch on Facebook Live", href: "#" }
            : { kind: "tt", label: "Join me on TikTok", href: "#" };
        }

        return platform;
      })
    : [];
  const collections = Array.isArray(event.collections)
    ? event.collections.map((collection) => (
        typeof collection === "string"
          ? { label: collection, href: "#" }
          : collection
      ))
    : [];

  return {
    ...event,
    title,
    name: title,
    description: event.description || null,
    eventTime,
    durationMinutes: event.durationMinutes || 60,
    when,
    codes: Array.isArray(event.codes) ? event.codes : [],
    collections,
    platforms,
  };
}

function EventCodeRow({ code, desc }) {
  const [copied, setCopied] = React.useState(false);
  const onCopy = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <div className="hp-event-code-row">
      <div className="hp-event-code-text">
        <strong>{code}</strong>
        <span className="dash"> — </span>
        <span className="desc">{desc}</span>
      </div>
      <button className={`hp-event-copy ${copied ? "copied" : ""}`} onClick={onCopy}>
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function getVisibleEventDescription(event) {
  const description = typeof event?.description === "string" ? event.description.trim() : "";
  if (!description) return null;

  const title = typeof event?.name === "string" ? event.name.trim() : "";
  if (title && description.localeCompare(title, undefined, { sensitivity: "base" }) === 0) {
    return null;
  }

  return description;
}

function Events({ count }) {
  const [calendarEvent, setCalendarEvent] = useState(null);
  return (
    <section className="hp-section" id="events">
      <div className="hp-container">
        <div className="hp-events-head">
          <div className="hp-section-eyebrow">Upcoming Shows</div>
          <h2 className="hp-section-title">Mark your calendar. The next two reveals.</h2>
          <p className="hp-section-sub">Times shown in your local timezone. Tap a code to copy it before showtime.</p>
        </div>
        <div className="hp-event-grid" style={{ gridTemplateColumns: count === 1 ? "1fr" : undefined }}>
          {HOMEPAGE_EVENT_PAYLOAD.slice(0, count).map((rawEvent, i) => { const event = normalizeHomepageEvent(rawEvent); const ev = event;
            const [dateStr, timeStr = ""] = ev.when.split(" - ");
            const visibleDescription = getVisibleEventDescription(event);
            return (
              <article key={i} className={`hp-event-card ${ev.featured ? "featured" : ""}`}>
                {ev.featured && <span className="hp-event-pill"><span className="pip" />Featured</span>}
                <h3 className="hp-event-name slot" data-slot="event name">{ev.name}</h3>
                <div className="hp-event-meta">
                  <div className="hp-event-meta-row">
                    <span className="hp-event-meta-icon" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                    </span>
                    <span className="slot" data-slot="event date">{dateStr}</span>
                  </div>
                  <div className="hp-event-meta-row">
                    <span className="hp-event-meta-icon" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                    </span>
                    <span>{timeStr}</span>
                  </div>
                </div>

                {visibleDescription && (
                  <p className="hp-event-description slot" data-slot="event description">
                    {visibleDescription}
                  </p>
                )}

                {ev.codes.length > 0 && (
                  <div className="hp-event-section">
                    <div className="hp-event-section-head">
                      <span className="hp-event-section-icon discounts" aria-hidden="true">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7-4.35-7-10a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 5.65-7 10-7 10-1.5 1-2.5 1-4 0z"/></svg>
                      </span>
                      <span className="hp-event-section-title">Discounts</span>
                    </div>
                    <div className="hp-event-codes">
                      {ev.codes.map((c, j) => (
                        <EventCodeRow key={j} code={c.code} desc={c.desc} />
                      ))}
                    </div>
                  </div>
                )}

                {event.collections.length > 0 && (
                  <div className="hp-event-section">
                    <div className="hp-event-section-head">
                      <span className="hp-event-section-icon featured-collections" aria-hidden="true">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                      </span>
                      <span className="hp-event-section-title">Featured Collections</span>
                    </div>
                    <div className="hp-event-collections">
                      {event.collections.map((collection, j) => (
                        <a key={j} {...linkProps(collection.href)} className="hp-event-collection-pill">{collection.label}</a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="hp-event-actions">
                  <button type="button" className="hp-event-add" onClick={() => setCalendarEvent(event)}>
                    <CustomerMediaIcon name="calendar" />
                    <span>Add to calendar</span>
                  </button>
                  {event.platforms.map((platform) => (
                    <a key={`${event.id}-${platform.kind}-${platform.href}`} {...linkProps(platform.href)} className={`hp-event-platform ${platform.kind}`}>
                      <span className={`glyph ${platform.kind}`} />
                      {platform.label}
                    </a>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </div>
      <CalendarChooser event={calendarEvent} onClose={() => setCalendarEvent(null)} />
    </section>
  );
}

// ============================================================
// What is a Bomb Party
// ============================================================
function Wibp({ repName }) {
  return (
    <section className="hp-section" id="wibp" style={{ background: "var(--hp-bg-elevated)" }}>
      <div className="hp-container">
        <div className="hp-wibp-grid">
          <div className="hp-wibp-card">
            <div className="hp-wibp-eyebrow">First time here?</div>
            <h2 className="hp-wibp-title">It's a live jewelry reveal — with <span className="slot" data-slot="rep name">{repName}</span></h2>
            <p className="hp-wibp-body">
              You order a sealed box, then watch it revealed live on <span className="slot" data-slot="rep name">{repName}</span>&apos;s platform.{" "}
              Every box has real jewelry inside — some Everyday Sparkle, some Diamond Territory, and a few rare Unicorn Magic pieces hidden throughout the show.
              After the reveal, your jewelry ships straight to your door from Bomb Party.
            </p>
            <div className="hp-steps">
              <div className="hp-step">
                <div className="hp-step-num"><CustomerMediaIcon name="shopping-bag" /></div>
                <div className="hp-step-label">Order</div>
                <div className="hp-step-desc">Pick a box, place pre-order before showtime.</div>
              </div>
              <div className="hp-step">
                <div className="hp-step-num"><CustomerMediaIcon name="video" /></div>
                <div className="hp-step-label">Watch Live</div>
                <div className="hp-step-desc">Watch the reveal on <span className="slot" data-slot="rep name">{repName}</span>&apos;s platform.</div>
              </div>
              <div className="hp-step">
                <div className="hp-step-num"><CustomerMediaIcon name="gift" /></div>
                <div className="hp-step-label">Receive</div>
                <div className="hp-step-desc">Real jewelry ships to your door.</div>
              </div>
            </div>
          </div>
          <CustomerVideoCard
            className="hp-wibp-video slot"
            dataSlot="showcase video"
            subtitle={CONTENT.showcaseVideoCaption}
            title="Watch a Live Reveal"
            videoUrl={CONTENT.showcaseVideoUrl}
            variant="showcase"
          />
        </div>
      </div>
    </section>
  );
}

function BlingKitchenRevealGuide({ repName }) {
  const watchHref = CONTENT.streamLinks?.tiktok || CONTENT.streamLinks?.watch || getWatchHref();
  const shopHref = getShopHref();
  const vipHref = CONTENT.streamLinks?.facebook || getSocialHref("VIP") || getSocialHref("FB");

  return (
    <section className="bk-home-guide" id="wibp">
      <div className="bk-home-guide-copy">
        <p className="bk-home-section-kicker">How BlingKitchen works</p>
        <h2>Order, pull up a seat, and reveal with Heather.</h2>
        <span>
          BlingKitchen blends live jewelry reveals with Heather's kitchen-table warmth. Place your Bomb Party order, come back to the live, and watch your surprise piece open with the community.
        </span>
      </div>
      <div className="bk-home-guide-steps">
        <a {...linkProps(shopHref)} className="bk-home-guide-step">
          <strong>1</strong>
          <b>Order before the show</b>
          <span>Shop active parties and choose the collection you want Heather to reveal.</span>
        </a>
        <a {...linkProps(watchHref)} className="bk-home-guide-step">
          <strong>2</strong>
          <b>Watch with Heather</b>
          <span>Join Heather live for the reveal, kitchen conversation, and community fun.</span>
        </a>
        <a {...linkProps(vipHref)} className="bk-home-guide-step">
          <strong>3</strong>
          <b>Stay at the table</b>
          <span>Follow show updates, recipes, and VIP community posts between live nights.</span>
        </a>
      </div>
      <CustomerVideoCard
        className="bk-home-guide-media slot"
        dataSlot="showcase video"
        subtitle={CONTENT.showcaseVideoCaption || `Reveal moments with ${repName}`}
        title="Watch a Live Reveal"
        videoUrl={CONTENT.showcaseVideoUrl}
        variant="showcase"
      />
    </section>
  );
}

// ============================================================
// About
// ============================================================
function AboutSection({ repName, hideEmptyMedia = false }) {
  const neutralAbout = [
    `${repName} will share more about this live reveal community soon.`,
    "Customer details, show style, and favorite reveal notes will appear here after they are added.",
    "Live show schedule and updates will stay current from this Sparkle Suite customer site.",
  ];
  const aboutParagraphs = Array.isArray(CONTENT.aboutParagraphs)
    ? CONTENT.aboutParagraphs
    : neutralAbout;
  const visibleAboutParagraphs = aboutParagraphs.filter(Boolean);
  const aboutHeadline = CONTENT.aboutHeadline || `Meet ${repName} and the story behind the sparkle.`;

  return (
    <section className="hp-section" id="about">
      <div className="hp-container">
        <div className="hp-about-grid">
          <div className="hp-about-copy">
            <div className="hp-section-eyebrow">About the rep</div>
            <h2 className="hp-section-title slot" data-slot="about headline">{aboutHeadline}</h2>
            {CONTENT.aboutSubheading ? (
              <div className="hp-section-eyebrow slot" data-slot="about subheading">
                {CONTENT.aboutSubheading}
              </div>
            ) : null}
            <div className="hp-about-body">
              {visibleAboutParagraphs.map((paragraph, index) => (
                <p className="slot" data-slot={`about paragraph ${index + 1}`} key={index}>
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          <AboutPortraitCard fallbackCaption={`${repName} - ${CONTENT.businessName || "Sparkle Suite"}`} />
        </div>
        <div className="hp-about-shorts-grid">
          <AboutShortCard index={0} hideEmptyMedia={hideEmptyMedia} />
          <AboutShortCard index={1} hideEmptyMedia={hideEmptyMedia} />
          <AboutShortCard index={2} hideEmptyMedia={hideEmptyMedia} />
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Signup favorites — pick up to 3, same interaction as Sparkle Finder
// ============================================================
const SIGNUP_PREFERENCE_MAX = 3;
const SIGNUP_NOT_SURE = "not_sure";
const SIGNUP_PREFERENCE_STYLES = `
.hp-pref { border: 0; margin: 0; padding: 0; min-width: 0; display: grid; gap: 8px; }
.hp-pref legend { padding: 0; }
.hp-pref-hint, .hp-pref-group, .hp-pref-live { margin: 0; color: var(--hp-card-muted); font-size: 13px; line-height: 1.4; }
.hp-pref-live { min-height: 1.4em; }
.hp-pref-chips { display: flex; flex-wrap: wrap; gap: 8px; min-width: 0; max-width: 100%; }
.hp-pref-chip { position: relative; display: inline-flex; align-items: center; min-height: 44px; max-width: 100%; margin: 0; padding: 8px 14px; border-radius: 999px; border: 1px solid var(--border); background: var(--hp-field-bg); color: var(--hp-field-fg); font-size: 14px; line-height: 1.3; text-align: left; cursor: pointer; overflow-wrap: anywhere; }
.hp-pref-chip input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; }
.hp-pref-chip.is-selected { background: var(--hp-card-accent); color: var(--hp-action-fg); border-color: var(--hp-card-accent); }
.hp-pref-chip.is-disabled { opacity: 0.45; cursor: not-allowed; }
.hp-pref-chip.is-disabled input { cursor: not-allowed; }
.hp-pref-chip:focus-within { outline: 2px solid var(--hp-primary); outline-offset: 2px; }
.hp-pref-more { justify-self: start; min-height: 44px; padding: 8px 2px; border: 0; background: transparent; color: var(--hp-primary); font: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
.hp-pref-more:focus-visible { outline: 2px solid var(--hp-primary); outline-offset: 2px; }
.hp-signup-form, .hp-signup-preferences, .hp-pref { max-width: 100%; }
.hp-signup-notes-label { display: block; color: var(--hp-card-fg); font-size: 15px; line-height: 1.45; font-weight: 600; letter-spacing: 0; text-transform: none; }
.hp-signup-privacy { margin: 0; max-width: 38rem; color: var(--hp-card-fg); font-size: 15px; font-weight: 600; line-height: 1.5; text-align: center; }
.hp-signup-notes { min-height: 120px; resize: vertical; }
.hp-signup-question { display: grid; gap: 16px; width: 100%; min-width: 0; min-height: 212px; box-sizing: border-box; align-content: center; border: 1px solid var(--border); border-radius: 20px; background: var(--hp-form-panel-bg); color: var(--hp-form-panel-fg); padding: 20px; }
.hp-signup-question.is-choices, .hp-signup-question.is-review { min-height: 0; align-content: start; }
.hp-signup-question.is-review { gap: 0; padding: 8px 18px 12px; }
.hp-signup-review { list-style: none; margin: 0; padding: 0; display: grid; }
.hp-signup-review-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 2px; border-top: 1px solid color-mix(in oklab, var(--hp-form-panel-fg) 12%, transparent); }
.hp-signup-review > .hp-signup-review-row:first-child { border-top: 0; }
.hp-signup-review-copy { min-width: 0; display: grid; gap: 4px; }
.hp-signup-review-label { margin: 0; font-size: 14px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--hp-card-muted); }
.hp-signup-review-value { margin: 0; font-size: 16px; font-weight: 600; line-height: 1.45; color: var(--hp-form-panel-fg); overflow-wrap: break-word; }
.hp-signup-review-meta { margin: 0; font-size: 15px; line-height: 1.45; color: var(--hp-card-muted); overflow-wrap: break-word; }
.hp-signup-review-notes { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.hp-signup-review-edit { flex: none; align-self: center; min-height: 44px; min-width: 44px; padding: 10px 8px; border: 0; background: transparent; color: var(--hp-primary); font: inherit; font-size: 16px; font-weight: 700; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
.hp-signup-review-edit:focus-visible { outline: 2px solid var(--hp-primary); outline-offset: 2px; }
.hp-signup-review-edit:disabled { opacity: 0.45; cursor: wait; }
.hp-signup-intro { display: grid; gap: 6px; min-height: 84px; align-content: end; text-align: center; }
.hp-signup-step-title { margin: 0; color: var(--hp-card-fg); font-family: var(--hp-display-font); font-size: clamp(26px, 3vw, 34px); font-weight: 700; letter-spacing: var(--hp-heading-tracking, -0.02em); line-height: 1.15; }
.hp-signup-step-why { margin: 0 auto; max-width: 36rem; color: var(--hp-card-muted); font-size: 15px; line-height: 1.5; }
.hp-pref > legend { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.hp-signup-progress-wrap { display: grid; justify-items: center; gap: 0; }
.hp-signup-progress { margin: 0; color: var(--hp-card-fg); font-size: 14px; font-weight: 700; letter-spacing: 0.04em; text-align: center; }
.hp-signup-meter { display: flex; gap: 4px; width: min(100%, 420px); }
.hp-signup-meter-step { position: relative; flex: 1 1 0; min-width: 24px; min-height: 44px; padding: 0; border: 0; background: transparent; }
.hp-signup-meter-step::after { content: ""; position: absolute; left: 0; right: 0; top: 50%; height: 4px; border-radius: 999px; transform: translateY(-50%); background: color-mix(in oklab, var(--hp-card-fg) 16%, transparent); }
.hp-signup-meter-step.is-done { cursor: pointer; }
.hp-signup-meter-step.is-done::after, .hp-signup-meter-step.is-current::after { background: var(--hp-card-accent); }
.hp-signup-meter-step.is-done:focus-visible { outline: 2px solid var(--hp-primary); outline-offset: 2px; }
.hp-signup-step-panel { display: grid; gap: 16px; opacity: 1; transform: none; animation: hp-signup-step-in 180ms var(--ease, ease) forwards; }
@keyframes hp-signup-step-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .hp-signup-step-panel { animation: none; opacity: 1; transform: none; } }
.hp-signup-single { width: 100%; max-width: none; margin-inline: 0; }
.hp-signup-input { font-size: 16px; }
.hp-signup-submit { min-height: 48px; }
.hp-signup-submit:focus-visible { outline: 2px solid var(--hp-primary); outline-offset: 3px; }
.hp-signup-check { min-height: 44px; align-items: center; }
.hp-signup-check input { width: 22px; height: 22px; margin-top: 0; accent-color: var(--hp-primary); }
.hp-signup-nav { display: flex; flex-direction: column-reverse; align-items: center; gap: 4px; width: 100%; }
@media (min-width: 720px) { .hp-signup-nav { flex-direction: row; justify-content: center; gap: 12px; } }
.hp-signup-step { display: grid; gap: 16px; min-width: 0; outline: none; }
.hp-signup-identity { display: grid; gap: 16px; }
.hp-signup-step:focus-visible { outline: 2px solid var(--hp-primary); outline-offset: 4px; }
.hp-signup-back { min-height: 44px; min-width: 44px; padding: 8px 12px; border: 0; background: transparent; color: var(--hp-primary); font: inherit; font-size: 15px; font-weight: 700; cursor: pointer; text-decoration: underline; text-underline-offset: 3px; }
.hp-signup-back:focus-visible { outline: 2px solid var(--hp-primary); outline-offset: 2px; }
.hp-signup-back:disabled { opacity: 0.45; cursor: wait; }
.hp-signup-live { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.hp-signup-status.success, .hp-signup-status.error { color: var(--hp-card-fg); border-radius: 12px; padding: 12px 14px; }
.hp-signup-status.success { background: color-mix(in oklab, var(--hp-card-accent) 16%, var(--hp-bg-elevated)); border: 1px solid color-mix(in oklab, var(--hp-card-accent) 42%, var(--border)); }
.hp-signup-status.error { background: color-mix(in oklab, var(--hp-card-fg) 8%, var(--hp-bg-elevated)); border: 1px solid color-mix(in oklab, #9c1c3d 55%, var(--border)); }
@media (max-width: 420px) {
  .hp-pref-chip { font-size: 15px; }
}
#signup .hp-signup-card { max-width: 640px; }
#signup .hp-signup-form { width: 100%; }
#signup .hp-signup-progress-wrap { width: 100%; justify-items: stretch; }
#signup .hp-signup-meter { width: 100%; max-width: none; }
#signup .hp-signup-actions { width: 100%; align-items: stretch; }
#signup .hp-signup-privacy { width: 100%; max-width: none; }
#signup .hp-signup-nav { width: 100%; }
@media (max-width: 719px) {
  #signup .hp-signup-nav { align-items: stretch; }
  #signup .hp-signup-submit { width: 100%; }
  #signup .hp-signup-back { text-align: center; }
}
@media (min-width: 720px) {
  #signup .hp-signup-nav { align-items: center; }
  #signup .hp-signup-submit { flex: 1 1 auto; }
}
#signup .hp-signup-card.is-success {
  padding: 56px 56px 48px;
  overflow: hidden;
}
#signup .hp-signup-card.is-success .hp-signup-card-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  text-align: center;
}
#signup .hp-signup-card.is-success .hp-signup-title,
#signup .hp-signup-card.is-success .hp-signup-sub,
#signup .hp-signup-card.is-success .hp-signup-eyebrow {
  width: 100%;
  overflow: visible;
}
#signup .hp-signup-card.is-success .hp-signup-status.success {
  align-self: center;
  width: fit-content;
  max-width: 100%;
  margin: 16px auto 0;
  text-align: center;
  box-sizing: border-box;
}
@media (max-width: 600px) {
  #signup .hp-signup-card.is-success { padding: 36px 24px 32px; }
  #signup .hp-signup-card:not(.is-success) {
    padding: 36px 24px 32px;
    overflow: clip;
  }
  #signup .hp-signup-card:not(.is-success) .hp-signup-title,
  #signup .hp-signup-card:not(.is-success) .hp-signup-sub,
  #signup .hp-signup-card:not(.is-success) .hp-signup-eyebrow {
    width: 100%;
    overflow: visible;
  }
  #signup .hp-signup-card:not(.is-success) .hp-signup-status.error {
    width: 100%;
    max-width: 100%;
    margin: 0;
    box-sizing: border-box;
  }
}
`;

const SIGNUP_STEP_LABELS = [
  "Let's get you on the list",
  "Stones you love",
  "Metals and finishes",
  "Favorite cuts",
  "Bomb Party collections",
  "How should we reach you?",
  "Your birthday",
  "Ring size",
  "Anything else?",
  "Sign me up",
];
const SIGNUP_LAST_STEP = SIGNUP_STEP_LABELS.length - 1;

function applySignupPreferenceToggle(selected, slug, checked) {
  if (!checked) return selected.filter((item) => item !== slug);
  if (slug === SIGNUP_NOT_SURE) return [SIGNUP_NOT_SURE];
  const withoutSure = selected.filter((item) => item !== SIGNUP_NOT_SURE);
  if (withoutSure.includes(slug) || withoutSure.length >= SIGNUP_PREFERENCE_MAX) return withoutSure;
  return [...withoutSure, slug];
}

function SignupPreferenceChip({ option, fieldName, selected, onChange }) {
  const checked = selected.includes(option.slug);
  const disabled = !checked && selected.length >= SIGNUP_PREFERENCE_MAX;
  return (
    <label className={`hp-pref-chip${checked ? " is-selected" : ""}${disabled ? " is-disabled" : ""}`}>
      <input
        type="checkbox"
        name={fieldName}
        value={option.slug}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(applySignupPreferenceToggle(selected, option.slug, event.target.checked))}
      />
      <span>{option.label}</span>
    </label>
  );
}

function SignupPreferencePicker({ legend, fieldName, options, selected, onChange, showOlderControl }) {
  const [showAll, setShowAll] = useState(false);
  const [showOlder, setShowOlder] = useState(false);
  const list = Array.isArray(options) ? options : [];
  const active = list.filter((option) => !option.isRetired);
  const retired = list.filter((option) => option.isRetired);
  const visibleActive = showAll ? active : active.slice(0, 8);
  const visibleRetired = showOlder ? retired : retired.filter((option) => selected.includes(option.slug));
  const atMax = selected.length >= SIGNUP_PREFERENCE_MAX;

  return (
    <fieldset className="hp-pref">
      <legend className="hp-signup-label">{legend}</legend>
      <p className="hp-pref-hint" id={`${fieldName}-hint`}>Pick at least 1, up to 3</p>
      <div className="hp-pref-chips" role="group" aria-describedby={`${fieldName}-hint`}>
        {visibleActive.map((option) => (
          <SignupPreferenceChip
            key={option.slug}
            option={option}
            fieldName={fieldName}
            selected={selected}
            onChange={onChange}
          />
        ))}
      </div>
      {active.length > 8 ? (
        <button type="button" className="hp-pref-more" onClick={() => setShowAll((current) => !current)}>
          {showAll ? "Show fewer" : "Show all"}
        </button>
      ) : null}
      {showOlderControl && retired.length > 0 ? (
        <button type="button" className="hp-pref-more" onClick={() => setShowOlder((current) => !current)}>
          {showOlder ? "Hide older collections" : "Show older collections"}
        </button>
      ) : null}
      {visibleRetired.length > 0 ? (
        <div className="hp-pref-chips">
          {showOlder ? <p className="hp-pref-group">Older collections</p> : null}
          {visibleRetired.map((option) => (
            <SignupPreferenceChip
              key={option.slug}
              option={option}
              fieldName={fieldName}
              selected={selected}
              onChange={onChange}
            />
          ))}
        </div>
      ) : null}
      <p className="hp-pref-live" aria-live="polite">
        {atMax ? "You've picked 3. Unpick one to choose another." : ""}
      </p>
    </fieldset>
  );
}

function Signup({ repName, businessName }) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    smsConsent: false,
    emailConsent: false,
    marketingConsent: false,
    birthday: "",
    favoriteStones: [],
    favoriteMaterials: [],
    favoriteCuts: [],
    favoriteCollections: [],
    ringSize: "",
    jewelryNotes: "",
  });
  const [preferenceOptions, setPreferenceOptions] = useState(null);
  const [preferenceOptionsError, setPreferenceOptionsError] = useState(false);
  const [submitState, setSubmitState] = useState({ status: "idle", message: "" });
  const [step, setStep] = useState(0);
  const [resumeStep, setResumeStep] = useState(null);
  const [returnToReview, setReturnToReview] = useState(false);
  const [stepError, setStepError] = useState("");
  const [stepAnnouncement, setStepAnnouncement] = useState(`Step 1 of ${SIGNUP_STEP_LABELS.length}. ${SIGNUP_STEP_LABELS[0]}.`);
  const stepRef = useRef(null);
  const cardRef = useRef(null);
  const stepWasShown = useRef(false);
  useEffect(() => {
    if (submitState.status !== "success") return;
    const card = cardRef.current;
    if (!card) return;
    card.scrollTop = 0;
    card.scrollLeft = 0;
    const top = card.getBoundingClientRect().top;
    if (top < 0) card.scrollIntoView({ block: "start", inline: "nearest" });
  }, [submitState.status]);
  useEffect(() => {
    const announcedTitle = step === SIGNUP_LAST_STEP ? `Join ${repName}` : SIGNUP_STEP_LABELS[step];
    setStepAnnouncement(`Step ${step + 1} of ${SIGNUP_STEP_LABELS.length}. ${announcedTitle}.`);
    if (!stepWasShown.current) {
      stepWasShown.current = true;
      return;
    }
    const field = stepRef.current?.querySelector("input, select, textarea, .hp-signup-review-edit");
    if (field) field.focus();
    else document.querySelector("#signup .hp-signup-submit")?.focus();
  }, [step, repName]);
  useEffect(() => {
    if (!stepError) return;
    document.getElementById("hp-signup-step-error")?.focus();
  }, [stepError]);
  useEffect(() => {
    if (submitState.status === "success") return;
    if (typeof window.matchMedia !== "function" || !window.matchMedia("(max-width: 600px)").matches) return;
    const card = cardRef.current;
    if (!card) return;
    const pin = () => {
      card.scrollTop = 0;
      card.scrollLeft = 0;
    };
    pin();
    const frame = window.requestAnimationFrame(pin);
    return () => window.cancelAnimationFrame(frame);
  }, [step, stepError, submitState.status]);
  useEffect(() => {
    let cancelled = false;
    fetch(withCurrentSearch("/api/amethyst/preference-options"))
      .then((response) => response.json().then((payload) => ({ ok: response.ok, payload })))
      .then(({ ok, payload }) => {
        if (cancelled) return;
        if (!ok || !payload || !payload.options) {
          setPreferenceOptionsError(true);
          return;
        }
        setPreferenceOptions(payload.options);
      })
      .catch(() => {
        if (!cancelled) setPreferenceOptionsError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const signupTitle = CONTENT.signupTitle || "Never miss a show.";
  const signupSub = CONTENT.signupSub || `Get a heads-up when ${repName} goes live, plus first dibs on new drops.`;
  const stepWhy = [
    `${repName} saves your spot with your name and email.`,
    `${repName} uses this to pull pieces you'll want. Pick up to 3.`,
    "So the finish matches what you like to wear. Pick up to 3.",
    "The shape changes the whole piece. Pick up to 3.",
    `${repName} can watch for the Bomb Party lines you want. Pick up to 3.`,
    `Choose email, texts, or both. ${repName} only uses what you pick.`,
    "Only for birthday promotions and gift ideas. It will not be used for anything else.",
    `Optional. It helps ${repName} point you toward rings that are more likely to fit.`,
    `Anything else ${repName} should know? Pieces you're hunting for, sizes, or styles you love.`,
    `Here's what ${businessName} will have when you sign up.`,
  ];
  const stepTitle = step === SIGNUP_LAST_STEP ? `Join ${repName}` : SIGNUP_STEP_LABELS[step];

  function updateField(key, value) {
    setStepError("");
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function favoriteStepForEmptyList() {
    if (form.favoriteStones.length < 1) return 1;
    if (form.favoriteMaterials.length < 1) return 2;
    if (form.favoriteCuts.length < 1) return 3;
    if (form.favoriteCollections.length < 1) return 4;
    return 1;
  }

  function birthdayError() {
    const value = form.birthday.trim();
    if (!value) return "";
    if (!/^\d{2}-\d{2}$/.test(value)) {
      return "Birthday must use month and day in MM-DD format. Do not include a year.";
    }
    const month = Number(value.slice(0, 2));
    const day = Number(value.slice(3, 5));
    const candidate = new Date(Date.UTC(2024, month - 1, day));
    if (candidate.getUTCMonth() !== month - 1 || candidate.getUTCDate() !== day) {
      return "Birthday must be a real month and day.";
    }
    return "";
  }

  function birthdayReviewLabel(value) {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const text = String(value || "").trim();
    if (!/^\d{2}-\d{2}$/.test(text)) return "";
    const month = Number(text.slice(0, 2));
    const day = Number(text.slice(3, 5));
    const candidate = new Date(Date.UTC(2024, month - 1, day));
    if (candidate.getUTCMonth() !== month - 1 || candidate.getUTCDate() !== day) return "";
    return `${months[month - 1]} ${day}`;
  }

  function validateCurrentStep() {
    if (step === 0) {
      if (!form.firstName.trim()) return "First name is required.";
      if (!form.lastName.trim()) return "Last name is required.";
    }
    if (step >= 1 && step <= 4) {
      if (!preferenceOptions) {
        return preferenceOptionsError
          ? "Favorites could not load. Refresh the page and try again."
          : "Favorites are still loading. Try again in a moment.";
      }
      const picks = [form.favoriteStones, form.favoriteMaterials, form.favoriteCuts, form.favoriteCollections][step - 1];
      if (!picks || picks.length < 1) {
        return "Pick at least one favorite in each list. Not sure yet counts.";
      }
    }
    if (step === 5 && !form.smsConsent && !form.emailConsent) {
      return "Choose SMS, email, or both before signing up.";
    }
    if (step === 5 && form.smsConsent && !form.phone.trim()) {
      return "Add your phone number to get text updates.";
    }
    if (step === 6) return birthdayError();
    if (step === 8 && form.jewelryNotes.length > 500) return "Keep jewelry notes to 500 characters.";
    return "";
  }

  function stepForServerMessage(message) {
    if (/favorite|Not sure yet|Refresh the page and pick/i.test(message)) return favoriteStepForEmptyList();
    if (/phone number is required|add your phone number to get text updates/i.test(message)) return 5;
    if (/Choose SMS, email, or both/i.test(message)) return 5;
    if (/email address is required|First name is required|Last name is required/i.test(message)) return 0;
    if (/Birthday must/i.test(message)) return 6;
    if (/ring size/i.test(message)) return 7;
    if (/jewelry notes/i.test(message)) return 8;
    return null;
  }

  function goBack() {
    if (submitState.status === "submitting") return;
    setStepError("");
    setSubmitState({ status: "idle", message: "" });
    if (resumeStep != null && step === 0) {
      const destination = resumeStep;
      setResumeStep(null);
      setStep(destination);
      return;
    }
    if (!returnToReview) setResumeStep(null);
    setStep((current) => Math.max(0, current - 1));
  }

  function goToStep(next) {
    if (submitState.status === "submitting") return;
    if (next < 0 || next >= step) return;
    setStepError("");
    setSubmitState({ status: "idle", message: "" });
    if (step === SIGNUP_LAST_STEP) setReturnToReview(true);
    setResumeStep(null);
    setStep(next);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (step < SIGNUP_LAST_STEP) {
      const error = validateCurrentStep();
      if (error) {
        setStepError(error);
        return;
      }
      if (step === 5 && form.emailConsent && !form.email.trim()) {
        setResumeStep(5);
        setStep(0);
        setStepError("An email address is required if the customer wants email updates.");
        return;
      }
      setStepError("");
      if (returnToReview) {
        setReturnToReview(false);
        setResumeStep(null);
        setStep(SIGNUP_LAST_STEP);
        return;
      }
      if (resumeStep != null && step === 0) {
        const destination = resumeStep;
        setResumeStep(null);
        setStep(destination);
        return;
      }
      setStep((current) => current + 1);
      return;
    }
    if (!preferenceOptions) {
      setStep(1);
      setStepError(preferenceOptionsError
        ? "Favorites could not load. Refresh the page and try again."
        : "Favorites are still loading. Try again in a moment.");
      setSubmitState({ status: "idle", message: "" });
      return;
    }
    if (
      form.favoriteStones.length < 1 ||
      form.favoriteMaterials.length < 1 ||
      form.favoriteCuts.length < 1 ||
      form.favoriteCollections.length < 1
    ) {
      setStep(favoriteStepForEmptyList());
      setStepError("Pick at least one favorite in each list. Not sure yet counts.");
      setSubmitState({ status: "idle", message: "" });
      return;
    }
    setSubmitState({ status: "submitting", message: "" });

    try {
      const response = await fetch(withCurrentSearch("/api/amethyst/customer-audience"), {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          smsConsent: form.smsConsent,
          emailConsent: form.emailConsent,
          marketingConsent: form.marketingConsent,
          birthday: form.birthday,
          favoriteStones: form.favoriteStones,
          favoriteMaterials: form.favoriteMaterials,
          favoriteCuts: form.favoriteCuts,
          favoriteCollections: form.favoriteCollections,
          ringSize: form.ringSize,
          jewelryNotes: form.jewelryNotes,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = payload.error || "We couldn't save your signup right now.";
        const jump = stepForServerMessage(message);
        if (jump != null) {
          setStep(jump);
          setStepError(message);
          setSubmitState({ status: "idle", message: "" });
          return;
        }
        setSubmitState({
          status: "error",
          message,
        });
        return;
      }

      if (typeof window.gtag === "function") window.gtag("event", "lead");

      setForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        smsConsent: false,
        emailConsent: false,
        marketingConsent: false,
        birthday: "",
        favoriteStones: [],
        favoriteMaterials: [],
        favoriteCuts: [],
        favoriteCollections: [],
        ringSize: "",
        jewelryNotes: "",
      });
      setStep(0);
      setResumeStep(null);
      setReturnToReview(false);
      setStepError("");
      setSubmitState({
        status: "success",
        message: "You're on the list. We'll use the channels you selected.",
      });
    } catch (error) {
      setSubmitState({
        status: "error",
        message: "We couldn't save your signup right now.",
      });
    }
  }

  function preferenceShortLabel(label) {
    const text = String(label || "").trim();
    const cut = text.indexOf(" (");
    return cut === -1 ? text : text.slice(0, cut);
  }

  function preferenceNames(picks, options) {
    const list = Array.isArray(options) ? options : [];
    return picks.map((slug) => {
      if (slug === SIGNUP_NOT_SURE) return "Not sure yet";
      const match = list.find((option) => option.slug === slug);
      return preferenceShortLabel(match ? match.label : slug);
    }).join(", ");
  }

  let channelSummary = "";
  if (form.emailConsent && form.smsConsent) channelSummary = "Email and texts";
  else if (form.emailConsent) channelSummary = "Email";
  else if (form.smsConsent) channelSummary = "Texts";
  if (form.marketingConsent) {
    channelSummary = channelSummary ? `${channelSummary}, plus promotional drops` : "Promotional drops";
  }
  const reviewName = [form.firstName.trim(), form.lastName.trim()].filter(Boolean).join(" ");
  const birthdayReview = birthdayReviewLabel(form.birthday);
  const favoriteRows = [
    ["Stones", form.favoriteStones, preferenceOptions?.stone, 1],
    ["Metals", form.favoriteMaterials, preferenceOptions?.material, 2],
    ["Cuts", form.favoriteCuts, preferenceOptions?.cut, 3],
    ["Collections", form.favoriteCollections, preferenceOptions?.collection, 4],
  ];

  return (
    <section className="hp-signup" id="signup">
      <style>{SIGNUP_PREFERENCE_STYLES}</style>
      <div className="hp-container">
        <div
          className={`hp-signup-card${submitState.status === "success" ? " is-success" : ""}`}
          ref={cardRef}
        >
          <div className="hp-signup-card-body">
            <div className="hp-signup-eyebrow">Stay in the loop</div>
            <h2 className="hp-signup-title">{signupTitle}</h2>
            <p className="hp-signup-sub">{signupSub}</p>
            {submitState.message ? (
              <p
                className={`hp-signup-status ${submitState.status}`}
                role={submitState.status === "error" ? "alert" : "status"}
                aria-live="polite"
              >
                {submitState.message}
              </p>
            ) : null}
          </div>
          {submitState.status === "success" ? null : (
          <form className="hp-signup-form" onSubmit={handleSubmit}>
            <div className="hp-signup-progress-wrap">
              <p className="hp-signup-progress" id="hp-signup-progress">Step {step + 1} of {SIGNUP_STEP_LABELS.length}</p>
              <div className="hp-signup-meter" role="group" aria-labelledby="hp-signup-progress">
                {SIGNUP_STEP_LABELS.map((label, index) => (
                  index < step ? (
                    <button
                      key={label}
                      type="button"
                      className="hp-signup-meter-step is-done"
                      aria-label={`Edit ${label}`}
                      disabled={submitState.status === "submitting"}
                      onClick={() => goToStep(index)}
                    />
                  ) : (
                    <span
                      key={label}
                      className={`hp-signup-meter-step${index === step ? " is-current" : ""}`}
                      aria-current={index === step ? "step" : undefined}
                    />
                  )
                ))}
              </div>
            </div>
            <p className="hp-signup-live" aria-live="polite">{stepAnnouncement}</p>
            <div className="hp-signup-step" ref={stepRef} tabIndex={-1} aria-invalid={stepError ? "true" : undefined}>
              <div key={step} className="hp-signup-step-panel">
              {stepError ? (
                <p id="hp-signup-step-error" className="hp-signup-status error" role="alert" tabIndex={-1}>{stepError}</p>
              ) : null}
              <div className="hp-signup-intro">
                <h3 className="hp-signup-step-title" id="hp-signup-step-title">{stepTitle}</h3>
                <p className="hp-signup-step-why" id="hp-signup-step-why">{stepWhy[step]}</p>
              </div>
              {step === 0 ? (
                <div className="hp-signup-question hp-signup-identity">
                  <div className="hp-signup-row">
                    <div className="hp-signup-field">
                      <label className="hp-signup-label" htmlFor="hp-first-name">First name</label>
                      <input id="hp-first-name" className="hp-signup-input" type="text" name="firstName" autoComplete="given-name" autoCapitalize="words" enterKeyHint="next" placeholder="First name" value={form.firstName} onChange={(e) => updateField("firstName", e.target.value)} required />
                    </div>
                    <div className="hp-signup-field">
                      <label className="hp-signup-label" htmlFor="hp-last-name">Last name</label>
                      <input id="hp-last-name" className="hp-signup-input" type="text" name="lastName" autoComplete="family-name" autoCapitalize="words" enterKeyHint="next" placeholder="Last name" value={form.lastName} onChange={(e) => updateField("lastName", e.target.value)} required />
                    </div>
                  </div>
                  <div className="hp-signup-field">
                    <label className="hp-signup-label" htmlFor="hp-email">Email</label>
                    <input id="hp-email" className="hp-signup-input" type="email" name="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} enterKeyHint="next" placeholder="Email address" value={form.email} onChange={(e) => updateField("email", e.target.value)} />
                  </div>
                </div>
              ) : null}
              {step >= 1 && step <= 4 ? (
                <div className="hp-signup-question is-choices">
                  {!preferenceOptions && !preferenceOptionsError ? (
                    <p className="hp-signup-field-note" role="status">Favorites are still loading. Try again in a moment.</p>
                  ) : null}
                  {preferenceOptionsError ? (
                    <p className="hp-signup-status error" role="alert">Favorites could not load. Refresh the page and try again.</p>
                  ) : null}
                  {step === 1 ? (
                    <SignupPreferencePicker
                      legend="Favorite stones"
                      fieldName="favoriteStones"
                      options={preferenceOptions?.stone}
                      selected={form.favoriteStones}
                      onChange={(value) => updateField("favoriteStones", value)}
                    />
                  ) : null}
                  {step === 2 ? (
                    <SignupPreferencePicker
                      legend="Favorite metals & finishes"
                      fieldName="favoriteMaterials"
                      options={preferenceOptions?.material}
                      selected={form.favoriteMaterials}
                      onChange={(value) => updateField("favoriteMaterials", value)}
                    />
                  ) : null}
                  {step === 3 ? (
                    <SignupPreferencePicker
                      legend="Favorite cuts"
                      fieldName="favoriteCuts"
                      options={preferenceOptions?.cut}
                      selected={form.favoriteCuts}
                      onChange={(value) => updateField("favoriteCuts", value)}
                    />
                  ) : null}
                  {step === 4 ? (
                    <SignupPreferencePicker
                      legend="Favorite Bomb Party collections"
                      fieldName="favoriteCollections"
                      options={preferenceOptions?.collection}
                      selected={form.favoriteCollections}
                      onChange={(value) => updateField("favoriteCollections", value)}
                      showOlderControl
                    />
                  ) : null}
                </div>
              ) : null}
              {step === 5 ? (
                <div className="hp-signup-question">
                  <label className="hp-signup-check">
                    <input type="checkbox" checked={form.smsConsent} onChange={(e) => updateField("smsConsent", e.target.checked)} />
                    <span>Text me show reminders and SMS updates.</span>
                  </label>
                  <label className="hp-signup-check">
                    <input type="checkbox" checked={form.emailConsent} onChange={(e) => updateField("emailConsent", e.target.checked)} />
                    <span>Email me show reminders and collection updates.</span>
                  </label>
                  <label className="hp-signup-check">
                    <input type="checkbox" checked={form.marketingConsent} onChange={(e) => updateField("marketingConsent", e.target.checked)} />
                    <span>I also want promotional drops, launches, and special offers.</span>
                  </label>
                  {form.smsConsent ? (
                    <div className="hp-signup-field">
                      <label className="hp-signup-label" htmlFor="hp-phone">Phone</label>
                      <input id="hp-phone" className="hp-signup-input" type="tel" name="tel" inputMode="tel" autoComplete="tel" enterKeyHint="next" placeholder="Mobile number" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
                    </div>
                  ) : null}
                </div>
              ) : null}
              {step === 6 ? (
                <div className="hp-signup-question">
                  <div className="hp-signup-field">
                  <label className="hp-signup-label" htmlFor="hp-birthday">Birthday <span className="hp-signup-label-aux">(month and day, optional)</span></label>
                  <input id="hp-birthday" className="hp-signup-input" type="text" name="birthday" inputMode="text" autoComplete="off" enterKeyHint="next" placeholder="MM-DD" aria-describedby="hp-signup-step-why" value={form.birthday} onChange={(e) => updateField("birthday", e.target.value)} />
                  </div>
                </div>
              ) : null}
              {step === 7 ? (
                <div className="hp-signup-question">
                  <div className="hp-signup-field">
                  <label className="hp-signup-label" htmlFor="hp-ring-size">Ring size <span className="hp-signup-label-aux">(optional)</span></label>
                  <select id="hp-ring-size" className="hp-signup-input" name="ringSize" autoComplete="off" value={form.ringSize} onChange={(e) => updateField("ringSize", e.target.value)}>
                    <option value="">Select a size</option>
                    <option value="5">5</option>
                    <option value="6">6</option>
                    <option value="7">7</option>
                    <option value="8">8</option>
                    <option value="9">9</option>
                    <option value="10">10</option>
                    <option value="11">11</option>
                    <option value="not_sure">Not sure</option>
                  </select>
                  </div>
                </div>
              ) : null}
              {step === 8 ? (
                <div className="hp-signup-question">
                  <div className="hp-signup-field">
                  <textarea id="hp-jewelry-notes" className="hp-signup-input hp-signup-notes" name="jewelryNotes" autoComplete="off" enterKeyHint="next" maxLength={500} rows={4} aria-labelledby="hp-signup-step-title" aria-describedby="hp-signup-step-why" value={form.jewelryNotes} onChange={(e) => updateField("jewelryNotes", e.target.value)} />
                  </div>
                </div>
              ) : null}
              {step === SIGNUP_LAST_STEP ? (
                <div className="hp-signup-question is-review">
                  <ul className="hp-signup-review">
                    <li className="hp-signup-review-row">
                      <div className="hp-signup-review-copy">
                        <p className="hp-signup-review-label">Name</p>
                        <p className="hp-signup-review-value">{reviewName}</p>
                        {form.email.trim() ? <p className="hp-signup-review-meta">{form.email.trim()}</p> : null}
                      </div>
                      <button type="button" className="hp-signup-review-edit" aria-label={`Edit ${SIGNUP_STEP_LABELS[0]}`} onClick={() => goToStep(0)} disabled={submitState.status === "submitting"}>Edit</button>
                    </li>
                    <li className="hp-signup-review-row">
                      <div className="hp-signup-review-copy">
                        <p className="hp-signup-review-label">Channels</p>
                        <p className="hp-signup-review-value">{channelSummary}</p>
                        {form.smsConsent && form.phone.trim() ? <p className="hp-signup-review-meta">{form.phone.trim()}</p> : null}
                      </div>
                      <button type="button" className="hp-signup-review-edit" aria-label={`Edit ${SIGNUP_STEP_LABELS[5]}`} onClick={() => goToStep(5)} disabled={submitState.status === "submitting"}>Edit</button>
                    </li>
                    {favoriteRows.map(([label, picks, options, stepIndex]) => (
                      <li className="hp-signup-review-row" key={label}>
                        <div className="hp-signup-review-copy">
                          <p className="hp-signup-review-label">{label}</p>
                          <p className="hp-signup-review-value">{preferenceNames(picks, options)}</p>
                        </div>
                        <button type="button" className="hp-signup-review-edit" aria-label={`Edit ${SIGNUP_STEP_LABELS[stepIndex]}`} onClick={() => goToStep(stepIndex)} disabled={submitState.status === "submitting"}>Edit</button>
                      </li>
                    ))}
                    {birthdayReview ? (
                      <li className="hp-signup-review-row">
                        <div className="hp-signup-review-copy">
                          <p className="hp-signup-review-label">Birthday</p>
                          <p className="hp-signup-review-value">{birthdayReview}</p>
                        </div>
                        <button type="button" className="hp-signup-review-edit" aria-label={`Edit ${SIGNUP_STEP_LABELS[6]}`} onClick={() => goToStep(6)} disabled={submitState.status === "submitting"}>Edit</button>
                      </li>
                    ) : null}
                    {form.ringSize ? (
                      <li className="hp-signup-review-row">
                        <div className="hp-signup-review-copy">
                          <p className="hp-signup-review-label">Ring size</p>
                          <p className="hp-signup-review-value">{form.ringSize === "not_sure" ? "Not sure" : form.ringSize}</p>
                        </div>
                        <button type="button" className="hp-signup-review-edit" aria-label={`Edit ${SIGNUP_STEP_LABELS[7]}`} onClick={() => goToStep(7)} disabled={submitState.status === "submitting"}>Edit</button>
                      </li>
                    ) : null}
                    {form.jewelryNotes.trim() ? (
                      <li className="hp-signup-review-row">
                        <div className="hp-signup-review-copy">
                          <p className="hp-signup-review-label">Notes</p>
                          <p className="hp-signup-review-value hp-signup-review-notes">{form.jewelryNotes.trim()}</p>
                        </div>
                        <button type="button" className="hp-signup-review-edit" aria-label={`Edit ${SIGNUP_STEP_LABELS[8]}`} onClick={() => goToStep(8)} disabled={submitState.status === "submitting"}>Edit</button>
                      </li>
                    ) : null}
                  </ul>
                </div>
              ) : null}
              </div>
            </div>
            <div className="hp-signup-actions">
              {step === SIGNUP_LAST_STEP ? (
                <p className="hp-signup-privacy">
                  We never sell your information. Your answers are only used by {businessName} to give you a better experience.
                </p>
              ) : null}
              <div className="hp-signup-nav">
                {step > 0 ? (
                  <button type="button" className="hp-signup-back" onClick={goBack} disabled={submitState.status === "submitting"}>Back</button>
                ) : null}
                <button type="submit" className="hp-signup-submit" disabled={submitState.status === "submitting"}>
                  {submitState.status === "submitting" ? "Saving..." : step === SIGNUP_LAST_STEP ? "Sign me up" : "Continue"}
                  <span className="hp-signup-submit-arrow" aria-hidden="true">→</span>
                </button>
              </div>
              {step === SIGNUP_LAST_STEP ? (
                <p className="hp-signup-consent slot" data-slot="consent — pending legal">
                  Choose SMS, email, or both. Marketing consent stays separate from reminders and updates from <span className="slot" data-slot="business name">{businessName}</span>.
                  Msg & data rates may apply. Reply STOP to unsubscribe. <a {...linkProps(getUnsubscribeHref())}>Manage or unsubscribe</a>.
                </p>
              ) : null}
            </div>
          </form>
          )}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Footer
// ============================================================
function Footer({ businessName }) {
  const joinTeamHref = CONTENT.footerLinks?.joinTeam || "";
  const footerSocials = (Array.isArray(CONTENT.socialLinks)
    ? CONTENT.socialLinks
    : []
  ).filter((social) => social?.href && social.href !== "#");
  const mileHighFizzFooterLinks = [
    { label: "Watch Live", href: CONTENT.streamLinks?.tiktok || CONTENT.streamLinks?.watch || "#" },
    { label: "VIP Group", href: CONTENT.streamLinks?.facebook || getSocialHref("VIP") || getSocialHref("FB") },
  ];

  return (
    <footer className="hp-footer">
      <div className="hp-footer-inner">
        <div>
          <div className="hp-footer-brand slot" data-slot="business name">{businessName}</div>
          <p className="hp-footer-tag">
            {CONTENT.footerTagline || "Live jewelry reveals every Tuesday at 8pm CST. Real pieces, real sparkle."}
          </p>
          {CONTENT.memberTeamName ? (
            <p className="hp-footer-team">Proud member of the {CONTENT.memberTeamName} team</p>
          ) : null}
          {window.AMETHYST_PUBLIC_IDENTITY && <div className="hp-footer-identity">
            <p>{window.AMETHYST_PUBLIC_IDENTITY.identity}</p>
            <p>{window.AMETHYST_PUBLIC_IDENTITY.intro}</p>
            {window.AMETHYST_PUBLIC_IDENTITY.showSchedule && <p>{`Live shows run ${window.AMETHYST_PUBLIC_IDENTITY.showSchedule}.`}</p>}
          </div>}
          <div className="hp-footer-socials">
            {footerSocials.map((social) => (
              <a
                key={social.shortLabel || social.label}
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
            <li><a {...linkProps(CONTENT.footerLinks?.home || withCurrentSearch("/amethyst/Homepage.html"))}>Home</a></li>
            <li><a {...linkProps(getTradeBoardHref())}>{isBrittDanceFloorComingSoon ? "Dance Floor · Coming soon" : "Dance Floor"}</a></li>
            {CONTENT.pantryPageUrl && <li><a {...linkProps(CONTENT.pantryPageUrl)}>In the Pantry</a></li>}
            {joinTeamHref && <li><a {...linkProps(joinTeamHref)}>Join Team</a></li>}
          </ul>
        </div>
        <div className="hp-footer-col">
          <ul>
            <li><a {...linkProps(CONTENT.footerLinks?.faq || "/faq")}>FAQ</a></li>
            {isMileHighFizzHybrid && mileHighFizzFooterLinks.map((link) => (
              <li key={link.label}><a {...linkProps(link.href)}>{link.label}</a></li>
            ))}
          </ul>
        </div>
      </div>
      <div className="hp-footer-bottom">
        <div className="legal-row">
          <span>© 2026 {businessName} · <window.SparkleSuiteFooterCredit /></span>
          <span><a href="#">Privacy</a> · <a href="#">Terms</a> · <a href="#">Accessibility</a></span>
        </div>
        <p>
          {CONTENT.legalDisclaimer || `${businessName} is operated by an independent Bomb Party Representative. Bomb Party is a registered trademark of Bomb Party LLC. This site is not endorsed by, directly affiliated with, maintained, authorized, or sponsored by Bomb Party LLC.`}
        </p>
      </div>
    </footer>
  );
}

// ============================================================
// Sparkle FX layer
// ============================================================
function SparkleFx({ level, motion }) {
  const counts = { none: 0, subtle: 8, glittery: 24, maximum: 60 };
  const n = counts[level] || 0;
  const sparkles = useMemo(() => {
    return Array.from({ length: n }, (_, i) => ({
      left: ((i * 61 + 17) % 100),
      delay: ((i * 37 + 11) % 40) / 10,
      duration: 3 + ((i * 13 + 7) % 30) / 10,
      size: 0.5 + ((i * 19 + 3) % 12) / 10,
    }));
  }, [n]);

  if (motion === "still") return null;
  if (motion === "soft_glow") {
    return <div className="hp-fx-layer hp-hero-fx-layer hp-fx-layer-glow" aria-hidden="true" />;
  }

  if (!n) return null;
  return (
    <div className="hp-fx-layer hp-hero-fx-layer" aria-hidden="true">
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

function SparkleSuiteHeaderStack({ t, scheduleIsLive, effectiveLrqState, onOpenQueue }) {
  return (
    <div className="hp-sticky-stack">
      {/* Header */}
      <header className="hp-header">
        <div className="hp-header-inner">
          <div className="hp-brand">
            <h1 className="hp-brand-name slot" style={{ margin: 0 }} data-slot="business name">{t.businessName}{window.AMETHYST_PUBLIC_IDENTITY?.place || ""}</h1>
            <div className="hp-brand-sub">
              {scheduleIsLive && <span className="hp-live-dot" aria-hidden="true"></span>}
              {scheduleIsLive ? "Live now" : "Jewelry reveals"}
            </div>
          </div>
          <nav className="hp-header-nav" aria-label="Primary">
            <a href="#top" className="hp-header-link" aria-current="page">Home</a>
            <a {...linkProps(getTradeBoardHref())} className="hp-header-link">{isBrittDanceFloorComingSoon ? "Dance Floor · Coming soon" : "Dance Floor"}</a>
            {CONTENT.pantryPageUrl ? (
              <a {...linkProps(CONTENT.pantryPageUrl)} className="hp-header-link">In the Pantry</a>
            ) : null}
            {CONTENT.footerLinks?.joinTeam && (
              <a {...linkProps(CONTENT.footerLinks.joinTeam)} className="hp-header-link">Join Team</a>
            )}
          </nav>
          <a {...linkProps(getShopHref())} className="hp-shop-btn">{scheduleIsLive ? "Shop live" : "Shop"}</a>
        </div>
      </header>

      {/* Ticker */}
      {t.showTicker && <Ticker topText={t.tickerTopText} />}

      {t.showLrq && <LiveQueueStrip state={effectiveLrqState} onOpen={onOpenQueue} />}
    </div>
  );
}

function MileHighFizzHomepage({ t, repName, businessName, isLive, liveShow, queueState, onOpenQueue }) {
  const joinTeamHref = CONTENT.footerLinks?.joinTeam || "#";
  const heroVideoUrl = CONTENT.heroVideoUrl || "/mile-high-fizz/hero.mp4";
  const heroWatchLinks = getHeroWatchLinks(liveShow, isLive);

  return (
    <div className="mhf-page" id="top">
      <SparkleSuiteHeaderStack t={t} scheduleIsLive={isLive} effectiveLrqState={queueState} onOpenQueue={onOpenQueue} />

      {t.preset === "halloween_pumpkin_cat" ? <Hero t={t} isLive={isLive} liveShow={liveShow} /> : (
      <section className="mhf-hero" data-hero-motion={t.heroMotion === "still" || t.heroMotion === "none" ? "off" : "on"} aria-labelledby="mhf-hero-title">
        {t.preset === "gnome_garden" && <GnomeGardenDecoration />}
        {t.preset !== "gilded_autumn" && <video className="mhf-hero-video" autoPlay muted loop playsInline poster="">
          <source src={CONTENT.heroVideoUrl || heroVideoUrl} type="video/mp4" />
        </video>}
        <div className="mhf-hero-shade" aria-hidden="true" />
        <div className="mhf-hero-content">
          <h2 id="mhf-hero-title" className="mhf-hero-title mhf-logo-gradient">
            {CONTENT.heroHeadline || businessName}
          </h2>
          <p className="mhf-hero-with">WITH {repName.toUpperCase()}</p>
          <p className="mhf-hero-line">{CONTENT.heroSub || "REVEALING SOMETHING MAGICAL TOGETHER"}</p>
          <p className="mhf-hero-instruction">PLACE YOUR ORDER AND RETURN TO THE LIVE PARTY TO WATCH YOUR REVEAL</p>
          <div className="mhf-hero-ctas">
            <div className="mhf-hero-cta-stack">
              <div className="mhf-hero-cta-primary-row">
                <a {...linkProps(getShopHref())} className="mhf-cta mhf-cta-shop">Shop Bomb Party</a>
                <a {...linkProps(joinTeamHref)} className="mhf-cta mhf-cta-join">Join My Team</a>
                {heroWatchLinks.map((link) => (
                  <a key={link.id} {...linkProps(link.href)} className={`mhf-cta mhf-cta-watch ${isLive && link.id === "tiktok" ? "is-live" : ""}`}>
                    {link.label}
                  </a>
                ))}
                <SocialHeroLinks className="mhf-cta mhf-cta-watch" />
              </div>
              <a {...linkProps(getTradeBoardHref())} className="mhf-cta mhf-cta-dance-floor">Browse the Dance Floor</a>
            </div>
          </div>
        </div>
      </section>
      )}

      <div className="mhf-below-hero-shell">
        <div className="mhf-automation-panel">
          {t.showEvents && <Events count={t.eventCount} />}
          {t.showWibp && <Wibp repName={repName} />}
          {t.showAbout && <AboutSection repName={repName} />}
          {t.showSignup && <Signup repName={repName} businessName={businessName} />}
          {t.showFooter && <Footer businessName={businessName} />}
        </div>
      </div>
    </div>
  );
}

function BrittWithBlingFeaturedReveal() {
  const reveal = CONTENT.featuredReveal;
  if (!reveal) return null;

  return (
    <section id="legacy" className="bwb-featured-reveal" aria-labelledby="bwb-featured-title">
      <div className="bwb-source-shell bwb-featured-grid">
        <div className="bwb-featured-copy">
          <p className="bwb-source-eyebrow">{reveal.eyebrow}</p>
          <h2 id="bwb-featured-title" className="bwb-source-title">{reveal.title}</h2>
          <div className="bwb-source-rule" aria-hidden="true" />
          <p className="bwb-source-body">{reveal.body}</p>
          <a {...linkProps(reveal.ctaHref)} className="bwb-source-cta">
            {reveal.ctaLabel}
          </a>
        </div>
        <TikTokEmbed
          className="bwb-featured-video"
          title={reveal.videoTitle}
          videoUrl={reveal.videoUrl}
        >
          <span className="bwb-video-play" aria-hidden="true">▶</span>
          <span className="bwb-video-kicker">Featured TikTok</span>
          <span className="bwb-video-title">{reveal.videoTitle}</span>
        </TikTokEmbed>
      </div>
    </section>
  );
}

function BrittWithBlingRevealExplainer() {
  const explainer = CONTENT.revealExplainer;
  if (!explainer) return null;
  const showcaseVisible = CONTENT.showcaseVideoVisible !== false;
  const configuredShowcase = getCustomerVideoProvider(CONTENT.showcaseVideoUrl)
    ? CONTENT.showcaseVideoUrl
    : explainer.videoUrl;

  return (
    <section id="wibp" className="bwb-source-explainer" aria-labelledby="bwb-explainer-title">
      <div className={`bwb-source-shell bwb-explainer-grid ${showcaseVisible ? "" : "is-copy-only"}`.trim()}>
        <div className="bwb-explainer-copy">
          <h2 id="bwb-explainer-title" className="bwb-source-title">{explainer.title}</h2>
          <p className="bwb-source-body">{explainer.body}</p>
          <div className="bwb-explainer-steps">
            {explainer.steps.map((step, index) => (
              <article key={step.title} className="bwb-explainer-step">
                <span>{index + 1}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
        {showcaseVisible ? (
          <CustomerVideoCard
            className="bwb-tiktok-card slot"
            dataSlot="showcase video"
            subtitle={explainer.videoCaption || explainer.videoHandle || CONTENT.showcaseVideoCaption}
            title="Watch a Live Reveal"
            videoUrl={configuredShowcase}
            variant="showcase"
          />
        ) : null}
      </div>
    </section>
  );
}

function BrittWithBlingHomepage({ t, repName, businessName, isLive, liveShow, queueState, onOpenQueue }) {
  const joinTeamHref = CONTENT.footerLinks?.joinTeam || "#";
  const shopCtaLabel = CONTENT.shopCtaLabel || "Shop";
  const heroImageUrl = CONTENT.heroImageUrl || "/britt-with-bling/hero.jpeg";
  const heroWatchLinks = getHeroWatchLinks(liveShow, isLive);

  return (
    <div className="bwb-page" id="top">
      <SparkleSuiteHeaderStack t={t} scheduleIsLive={isLive} effectiveLrqState={queueState} onOpenQueue={onOpenQueue} />

      {t.preset === "halloween_pumpkin_cat" ? <Hero t={t} isLive={isLive} liveShow={liveShow} /> : (
      <section className="bwb-hero" data-hero-motion={t.heroMotion === "still" || t.heroMotion === "none" ? "off" : "on"} aria-labelledby="bwb-hero-title">
        {t.preset === "gnome_garden" && <GnomeGardenDecoration />}
        <img className="bwb-hero-image" {...responsiveRepImage(heroImageUrl, { alt: businessName || "Live jewelry reveals", sizes: "100vw", widths: [640, 828, 1200, 1920], eager: true })} />
        <div className="bwb-hero-shade" aria-hidden="true" />
        <div className="bwb-hero-content">
          <p className="bwb-hero-team">{CONTENT.heroEyebrow || "The Virtuous Fizzers"}</p>
          <h2 id="bwb-hero-title" className="bwb-hero-title">
            {CONTENT.heroHeadline || businessName}
          </h2>
          <p className="bwb-hero-line">{CONTENT.heroSub || "Where Faith Meets Fizz & Every Reveal is a VIP Experience"}</p>
          <p className="bwb-hero-instruction">PLACE YOUR ORDER AND RETURN TO THE LIVE PARTY TO WATCH YOUR REVEAL</p>
          <div className="bwb-hero-ctas">
            <div className="bwb-hero-cta-stack">
              <div className="bwb-hero-cta-primary-row">
                <a {...linkProps(getShopHref())} className="bwb-cta bwb-cta-shop">{shopCtaLabel}</a>
                <a {...linkProps(joinTeamHref)} className="bwb-cta bwb-cta-join">Join the Team</a>
                {heroWatchLinks.map((link) => (
                  <a key={link.id} {...linkProps(link.href)} className={`bwb-cta bwb-cta-watch ${isLive && link.id === "tiktok" ? "is-live" : ""}`}>
                    {link.label}
                  </a>
                ))}
                <SocialHeroLinks className="bwb-cta bwb-cta-watch" />
              </div>
              <a {...linkProps(getTradeBoardHref())} className="bwb-cta bwb-cta-dance-floor">Dance Floor · Coming soon</a>
            </div>
          </div>
        </div>
      </section>
      )}

      <div className="bwb-below-hero-shell">
        <BrittWithBlingFeaturedReveal />
        <div className="bwb-automation-panel">
          {t.showEvents && <Events count={t.eventCount} />}
          {t.showWibp && <BrittWithBlingRevealExplainer />}
          {t.showAbout && CONTENT.showAboutSection && (
            <AboutSection repName={repName} hideEmptyMedia />
          )}
          {t.showSignup && <Signup repName={repName} businessName={businessName} />}
          {t.showFooter && <Footer businessName={businessName} />}
        </div>
      </div>
    </div>
  );
}

function BlingKitchenHomepage({ t, repName, businessName, isLive, liveShow, queueState, onOpenQueue }) {
  const pantryHref = CONTENT.pantryPageUrl || "#";
  const heroImageUrl = CONTENT.heroImageUrl || "";
  const heroWatchLinks = getHeroWatchLinks(liveShow, isLive);
  const tiktokLink = heroWatchLinks.find((link) => link.id === "tiktok") || { href: "https://www.tiktok.com/@blingkitchen" };
  // Louis-approved framed kitchen hero (option C). Seasonal / art skins keep their own hero.
  const useFramedKitchenHero = Boolean(heroImageUrl) && !/halloween|gnome|neon|gilded|unicorn|am01|rose|pearl|witch/i.test(String(t.preset || ""));

  return (
    <div className="bk-home-page" id="top">
      <SparkleSuiteHeaderStack t={t} scheduleIsLive={isLive} effectiveLrqState={queueState} onOpenQueue={onOpenQueue} />

      {t.preset === "halloween_pumpkin_cat" ? <Hero t={t} isLive={isLive} liveShow={liveShow} /> : useFramedKitchenHero ? (
      <section className="bkf-hero" aria-labelledby="bkf-hero-title">
        <div className="bkf-hero-inner">
          <div className="bkf-hero-copy">
            <p className="bkf-eyebrow">{CONTENT.heroEyebrow || "With Heather"}</p>
            <h2 id="bkf-hero-title">{CONTENT.heroHeadline || businessName}</h2>
            <p className="bkf-tagline">{CONTENT.tagline || "Serving Sparkle from the Heart of the Home"}</p>
            <p className="bkf-sub">Live jewelry reveals from my Ohio kitchen.</p>
            <div className="bkf-ctas">
              <a {...linkProps(getShopHref())} className="bkf-btn bkf-btn-primary">Shop Bomb Party</a>
              {tiktokLink && <a {...linkProps(tiktokLink.href)} className={"bkf-btn bkf-btn-secondary" + (isLive ? " is-live" : "")}>{isLive ? "Watch Live on TikTok" : "Watch on TikTok"}</a>}
            </div>
            <div className="bkf-links">
              <a {...linkProps(getTradeBoardHref())}>Browse the Dance Floor →</a>
              <a {...linkProps(pantryHref)}>In the Pantry →</a>
            </div>
            <p className="bkf-live"><i aria-hidden="true"></i>Live M / W / F · 7 PM EST</p>
          </div>
          {heroImageUrl && (
            <div className="bkf-card">
              <img {...responsiveRepImage(heroImageUrl, { alt: "Heather in the kitchen with Bomb Party jewelry on display", sizes: "(max-width: 800px) 100vw, 480px", widths: [384, 640, 828, 1200], eager: true })} />
            </div>
          )}
        </div>
      </section>
      ) : (
      <section className="bk-home-hero" data-hero-motion={t.heroMotion === "still" || t.heroMotion === "none" ? "off" : "on"} aria-labelledby="bk-home-hero-title">
        {t.preset === "gnome_garden" && <GnomeGardenDecoration />}
        {heroImageUrl && <img className="bk-home-hero-image" {...responsiveRepImage(heroImageUrl, { alt: businessName || "BlingKitchen", sizes: "100vw", widths: [640, 828, 1200, 1920], eager: true })} />}
        <div className="bk-home-hero-content">
          <p>{CONTENT.heroEyebrow || "With Heather"}</p>
          <h2 id="bk-home-hero-title">{businessName}</h2>
          <span>{CONTENT.heroSub || t.heroSub}</span>
          <div className="bk-home-hero-ctas">
            <div className="bk-home-hero-cta-stack">
              <div className="bk-home-hero-cta-primary-row">
                <a {...linkProps(getShopHref())}><span className="bk-home-cta-label">Shop Bomb Party</span></a>
                <a {...linkProps(pantryHref)}><span className="bk-home-cta-label">In the Pantry</span></a>
                {heroWatchLinks.map((link) => (
                  <a key={link.id} {...linkProps(link.href)} className={isLive && link.id === "tiktok" ? "is-live" : ""}>
                    <span className="bk-home-cta-label">{link.label}</span>
                  </a>
                ))}
                <SocialHeroLinks labelClassName="bk-home-cta-label" />
              </div>
              <a {...linkProps(getTradeBoardHref())} className="bk-home-cta-dance-floor"><span className="bk-home-cta-label">Browse the Dance Floor</span></a>
            </div>
          </div>
        </div>
      </section>
      )}

      <div className="bk-home-below-shell">
        <section className="bk-home-pantry-callout">
          <div>
            <p>Recipes with Heather</p>
            <h2>In the Pantry</h2>
            <span>Family recipes, kitchen notes, and favorite treats preserved from Heather's original BlingKitchen site.</span>
          </div>
          <a {...linkProps(pantryHref)}>Open Recipes</a>
        </section>
        <div className="bk-home-automation-panel">
          {t.showEvents && <Events count={t.eventCount} />}
          {t.showWibp && <BlingKitchenRevealGuide repName={repName} />}
          {t.showAbout && <AboutSection repName={repName} />}
          {t.showSignup && <Signup repName={repName} businessName={businessName} />}
          {t.showFooter && <Footer businessName={businessName} />}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Main App
// ============================================================
function applyHomepageTheme(t, document) {
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

    // Body classes use the same source on the server and browser.
    const body = document.body;
    body.className = "homepage";
    if (isMileHighFizzHybrid) body.classList.add("mile-high-fizz");
    if (isBrittWithBlingHybrid) body.classList.add("britt-with-bling");
    if (isBlingKitchenHybrid) body.classList.add("bling-kitchen");
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
  if (t.bgTreatment === "gilded-autumn") body.classList.add("bg-gilded-autumn");
    if (t.bgTreatment === "halloween-pumpkin-cat") body.classList.add("bg-halloween-pumpkin-cat");
    if (t.bgTreatment === "halloween-pumpkin-witch") body.classList.add("bg-halloween-pumpkin-witch");
    if (t.bgTreatment === "rose-gold-paper") body.classList.add("bg-rose-gold-paper");
    if (t.bgTreatment === "sunset-beach") body.classList.add("bg-rose-gold-paper", "bg-sunset-beach");
    if (t.bgTreatment === "rose-champagne") body.classList.add("bg-rose-gold-paper", "bg-rose-champagne");
    if (t.bgTreatment === "midnight-rose") body.classList.add("bg-midnight-rose");
    if (t.bgTreatment === "fall-owl") body.classList.add("bg-fall-owl");
    if (t.bgTreatment === "gobble-and-fizz") body.classList.add("bg-gobble-and-fizz");
    if (t.bgTreatment === "pie-please") body.classList.add("bg-pie-please");
    if (t.bgTreatment === "pearl-rose") body.classList.add("bg-pearl-rose");
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
  if (t.cardSurface === "pumpkin-cat-glass") body.classList.add("surface-pumpkin-cat-glass");
    if (t.cardSurface === "midnight-glass") body.classList.add("surface-midnight-glass");
    if (t.cardSurface === "pearl-rose-paper") body.classList.add("surface-pearl-rose-paper");
    if (t.cardSurface === "pearl-rose") body.classList.add("surface-pearl-rose");
    if (t.cardSurface === "midnight-rose") body.classList.add("surface-midnight-rose");
    if (t.cardSurface === "fall-owl") body.classList.add("surface-fall-owl");
    if (t.cardSurface === "gobble-and-fizz") body.classList.add("surface-gobble-and-fizz");
    if (t.cardSurface === "pie-please") body.classList.add("surface-pie-please");
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
    if (t.buttonEnergy === "midnight-rose-lift") body.classList.add("btn-midnight-rose-lift");
    if (t.buttonEnergy === "pearl-rose-lift") body.classList.add("btn-pearl-rose-lift");
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
    if (["sparkle_rise", "soft_glow", "still", "witch_flight"].includes(t.heroMotion)) {
      body.classList.add(`hero-motion-${t.heroMotion.replace("_", "-")}`);
    }
    if (t.cursorEffect === "sparkle") body.classList.add("cursor-sparkle");
    if (t.density === "compact") body.classList.add("density-compact");
    if (t.density === "spacious") body.classList.add("density-spacious");
    if (t.shapeRadius === "sharp") body.classList.add("shape-sharp");
    if (t.shapeRadius === "soft") body.classList.add("shape-soft");
}

function App() {
  const [lineup, setLineup] = useState(() => RUNTIME_CONTEXT.targeted ? (window.SparkleLiveLineup?.initialState?.(CONTENT) || CONTENT) : null);
  window.SparkleLiveLineup?.useRevealFlare?.(React, lineup);
  useEffect(() => {
    if (!RUNTIME_CONTEXT.targeted || !window.SparkleLiveLineup) return;
    return window.SparkleLiveLineup.start({ url: withCurrentSearch('/api/amethyst/live-lineup'), initial: CONTENT, onUpdate: setLineup });
  }, []);
  const [t, setTweak] = useTweaks(DEFAULTS);
  const [queueOpen, setQueueOpen] = useState(false);
  const repName = publicRepName(t.repName);
  const [now, setNow] = useState(() => window.SPARKLE_FIRST_PAINT?.now ?? Date.now());
  const activeLiveShow = useMemo(() => getActiveLiveShow(now), [now]);
  const scheduleIsLive = Boolean(activeLiveShow);
  const contentLiveQueueState = lineup?.liveQueueState || getContentLiveQueueState();
  const effectiveLrqState = contentLiveQueueState || (scheduleIsLive ? t.lrqState : "offline");

  // Targeted pages keep the server title and description.

  useEffect(() => { applyHomepageTheme(t, document); }, [t]);

  useEffect(() => {
    window.AMETHYST_APPLY_HOMEPAGE_TEMPLATE?.(t);
  }, [t]);

  useEffect(() => {
    window.SPARKLE_FIRST_PAINT = null;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const applyPreset = (p) => {
    const presetVals = PRESETS[p];
    if (!presetVals) return;
    setTweak({ preset: p, ...presetVals });
  };

  return (
    <LiveLineupContext.Provider value={lineup}>
      {isBrittWithBlingHybrid ? (
        <BrittWithBlingHomepage
          t={t}
          repName={repName}
          businessName={t.businessName}
          isLive={scheduleIsLive}
          liveShow={activeLiveShow}
          queueState={effectiveLrqState}
          onOpenQueue={() => setQueueOpen(true)}
        />
      ) : isBlingKitchenHybrid ? (
        <BlingKitchenHomepage
          t={t}
          repName={repName}
          businessName={t.businessName}
          isLive={scheduleIsLive}
          liveShow={activeLiveShow}
          queueState={effectiveLrqState}
          onOpenQueue={() => setQueueOpen(true)}
        />
      ) : isMileHighFizzHybrid ? (
        <MileHighFizzHomepage
          t={{ ...t, heroSub: redactPublicRepText(t.heroSub, t.repName) }}
          repName={repName}
          businessName={t.businessName}
          isLive={scheduleIsLive}
          liveShow={activeLiveShow}
          queueState={effectiveLrqState}
          onOpenQueue={() => setQueueOpen(true)}
        />
      ) : (
        <>
      <SparkleSuiteHeaderStack
        t={t}
        scheduleIsLive={scheduleIsLive}
        effectiveLrqState={effectiveLrqState}
        onOpenQueue={() => setQueueOpen(true)}
      />

      <div className="hp-saturate" id="top">
      {/* Hero */}
      {t.showHero && <Hero t={{ ...t, heroSub: redactPublicRepText(t.heroSub, t.repName) }} isLive={scheduleIsLive} liveShow={activeLiveShow} />}

      {/* Events */}
      {t.showEvents && <Events count={t.eventCount} />}

      {/* What is a Bomb Party */}
      {t.showWibp && <Wibp repName={repName} />}

      {/* About */}
      {t.showAbout && <AboutSection repName={repName} />}

      {/* Signup */}
      {t.showSignup && <Signup repName={repName} businessName={t.businessName} />}

      {/* Footer */}
      {t.showFooter && <Footer businessName={t.businessName} />}
      </div>
        </>
      )}

      <LiveQueueModal open={queueOpen} onClose={() => setQueueOpen(false)} state={effectiveLrqState} />

      {/* TWEAKS PANEL */}
      <TweaksPanel title="Tweaks" subtitle="Tune the vibe" defaultWidth={380}>
        <TweakSection title="Flamboyance presets" subtitle="Snap a whole vibe in one click">
          <TweakRadio
            label="Preset"
            value={t.preset}
            onChange={applyPreset}
            options={[
              { value: "amethyst", label: "Chasing Unicorns (Amethyst)" },
              { value: "sparkle_suite_morganite", label: "Sparkle Suite/Morganite" },
              { value: "black_diamond", label: "Black Diamond" },
              { value: "moonstone", label: "Moonstone" },
              { value: "alpine_opal", label: "Alpine Opal" },
              { value: "emerald_garden", label: "Emerald Garden" },
              { value: "gnome_garden", label: "Gnome Forest" },
              { value: "neon_butterfly", label: "Neon Butterfly" },
            { value: "halloween_pumpkin_witch", label: "Halloween Pumpkin and Witch" },
              { value: "gilded_autumn", label: "The Golden Leaves of Autumn" },
              { value: "halloween_pumpkin_cat", label: "Halloween Pumpkin and Cat" },
              { value: "rose_gold", label: "Rose Gold" },
              { value: "midnight_rose", label: "Midnight Rose" },
              { value: "fall_owl_harvest_moon", label: "Fall Owl and Harvest Moon" },
              { value: "gobble_and_fizz", label: "Gobble & Fizz" },
              { value: "pie_please", label: "Pumpkin Pie" },
              { value: "pearl_rose", label: "Pearl Rose" },
              { value: "sunset_beach", label: "Sunset Beach" },
              { value: "rose_champagne", label: "Rose Champagne" },
              { value: "garnet", label: "Garnet" },
              { value: "amber", label: "Amber" },
              { value: "velvet", label: "Velvet" },
              { value: "rose_quartz", label: "Rose Quartz" },
            ]}
          />
        </TweakSection>

        <TweakSection title="Sparkle & motion">
          <TweakRadio
            label="Hero motion"
            value={t.heroMotion}
            onChange={(v) => setTweak("heroMotion", v)}
            options={[
              { value: "sparkle_rise", label: "Sparkle rise" },
              { value: "soft_glow", label: "Soft glow" },
              { value: "still", label: "Still" },
            ]}
          />
          <TweakRadio
            label="Hero sparkle intensity"
            value={t.sparkleLevel}
            onChange={(v) => setTweak("sparkleLevel", v)}
            options={[
              { value: "none", label: "Off" },
              { value: "subtle", label: "Subtle" },
              { value: "glittery", label: "Standard" },
              { value: "maximum", label: "Extra" },
            ]}
          />
          <TweakRadio
            label="Button energy"
            value={t.buttonEnergy}
            onChange={(v) => setTweak("buttonEnergy", v)}
            options={[
              { value: "calm", label: "Calm" },
              { value: "bouncy", label: "Bouncy" },
              { value: "wiggle", label: "Wiggle" },
            ]}
          />
          <TweakRadio
            label="CTA emphasis"
            value={t.ctaEmphasis}
            onChange={(v) => setTweak("ctaEmphasis", v)}
            options={[
              { value: "standard", label: "Standard" },
              { value: "pulse", label: "Pulse" },
            ]}
          />
          <TweakSlider
            label="Ticker speed"
            value={t.tickerSpeed}
            onChange={(v) => setTweak("tickerSpeed", v)}
            min={0.3} max={3} step={0.1}
          />
        </TweakSection>

        <TweakSection title="Background & texture">
          <TweakSelect
            label="Background treatment"
            value={t.bgTreatment}
            onChange={(v) => setTweak("bgTreatment", v)}
            options={[
              { value: "clean", label: "Clean" },
              { value: "mesh", label: "Gradient mesh" },
              { value: "confetti", label: "Confetti dots" },
              { value: "aurora", label: "Aurora hero" },
              { value: "suite-paper", label: "Suite paper" },
              { value: "rose-gold-paper", label: "Rose gold paper" },
            ]}
          />
          <TweakSelect
            label="Card surface"
            value={t.cardSurface}
            onChange={(v) => setTweak("cardSurface", v)}
            options={[
              { value: "matte", label: "Matte" },
              { value: "glass", label: "Glass" },
              { value: "holographic", label: "Holographic" },
              { value: "warm-paper", label: "Warm paper" },
              { value: "pearl-rose", label: "Pearl rose" },
            ]}
          />
          <TweakSelect
            label="Texture overlay"
            value={t.textureOverlay}
            onChange={(v) => setTweak("textureOverlay", v)}
            options={[
              { value: "none", label: "None" },
              { value: "grain", label: "Grain" },
              { value: "sparkle", label: "Sparkle dust" },
            ]}
          />
          <TweakRadio
            label="Cursor effect"
            value={t.cursorEffect}
            onChange={(v) => setTweak("cursorEffect", v)}
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
            onChange={(v) => setTweak("bgTone", v)}
            options={[
              { value: "lavender", label: "Lavender (Amethyst)" },
              { value: "warm", label: "Warm peach" },
              { value: "cool", label: "Cool blue" },
              { value: "paper", label: "Paper" },
              { value: "neon", label: "Neon pink" },
              { value: "midnight", label: "Midnight" },
              { value: "suiteBlush", label: "Suite blush" },
              { value: "roseGold", label: "Rose gold" },
            ]}
          />
          <TweakColor
            label="Primary"
            value={t.primaryColor}
            onChange={(v) => setTweak("primaryColor", v)}
          />
          <TweakColor
            label="Accent"
            value={t.accentColor}
            onChange={(v) => setTweak("accentColor", v)}
          />
          <TweakSlider
            label="Saturation"
            value={t.saturation}
            onChange={(v) => setTweak("saturation", v)}
            min={50} max={180} step={5}
            unit="%"
          />
        </TweakSection>

        <TweakSection title="Typography & shape">
          <TweakSelect
            label="Heading font"
            value={t.headingFont}
            onChange={(v) => setTweak("headingFont", v)}
            options={[
              { value: "vend", label: "Vend Sans (default)" },
              { value: "serif", label: "Editorial serif" },
              { value: "italiana", label: "Glam serif" },
              { value: "playfair", label: "Playfair polish" },
              { value: "bubbly", label: "Bubbly rounded" },
              { value: "chunky", label: "Chunky display" },
            ]}
          />
          <TweakSlider
            label="Heading weight"
            value={t.headingWeight}
            onChange={(v) => setTweak("headingWeight", v)}
            min={300} max={900} step={100}
          />
          <TweakRadio
            label="Corner radius"
            value={t.shapeRadius}
            onChange={(v) => setTweak("shapeRadius", v)}
            options={[
              { value: "sharp", label: "Sharp" },
              { value: "default", label: "Default" },
              { value: "soft", label: "Soft" },
            ]}
          />
          <TweakRadio
            label="Density"
            value={t.density}
            onChange={(v) => setTweak("density", v)}
            options={[
              { value: "compact", label: "Compact" },
              { value: "regular", label: "Regular" },
              { value: "spacious", label: "Spacious" },
            ]}
          />
        </TweakSection>

        <TweakSection title="Content density">
          <TweakSlider
            label="Event cards"
            value={t.eventCount}
            onChange={(v) => setTweak("eventCount", v)}
            min={1} max={2} step={1}
          />
          <TweakRadio
            label="LRQ state"
            value={t.lrqState}
            onChange={(v) => setTweak("lrqState", v)}
            options={[
              { value: "live", label: "Live" },
              { value: "loading", label: "Loading" },
              { value: "empty", label: "Empty" },
              { value: "offline", label: "Offline" },
            ]}
          />
        </TweakSection>

        <TweakSection title="Section visibility">
          <TweakToggle label="Ticker" value={t.showTicker} onChange={(v) => setTweak("showTicker", v)} />
          <TweakToggle label="Live Lineup" value={t.showLrq} onChange={(v) => setTweak("showLrq", v)} />
          <TweakToggle label="Hero" value={t.showHero} onChange={(v) => setTweak("showHero", v)} />
          <TweakToggle label="Events" value={t.showEvents} onChange={(v) => setTweak("showEvents", v)} />
          <TweakToggle label="Bomb Party explainer" value={t.showWibp} onChange={(v) => setTweak("showWibp", v)} />
          <TweakToggle label="About section" value={t.showAbout} onChange={(v) => setTweak("showAbout", v)} />
          <TweakToggle label="Signup" value={t.showSignup} onChange={(v) => setTweak("showSignup", v)} />
          <TweakToggle label="Footer" value={t.showFooter} onChange={(v) => setTweak("showFooter", v)} />
        </TweakSection>

        <TweakSection title="Copy sandbox">
          <TweakText label="Rep name" value={t.repName} onChange={(v) => setTweak("repName", v)} />
          <TweakText label="Business name" value={t.businessName} onChange={(v) => setTweak("businessName", v)} />
          <TweakText label="Hero headline" value={t.heroHeadline} onChange={(v) => setTweak("heroHeadline", v)} />
          <TweakText label="Hero sub" value={t.heroSub} onChange={(v) => setTweak("heroSub", v)} />
          <TweakText label="Ticker top row" value={t.tickerTopText} onChange={(v) => setTweak("tickerTopText", v)} />
        </TweakSection>

        <TweakSection title="Slot inspector">
          <TweakToggle label="Show edit slots overlay" value={t.showSlots} onChange={(v) => setTweak("showSlots", v)} />
        </TweakSection>
      </TweaksPanel>
    </LiveLineupContext.Provider>
  );
}

const homepageRoot = document.getElementById("root");
if (homepageRoot.dataset?.serverRendered === "true" && ReactDOM.hydrateRoot) {
  // Commit hydration before the independent theme controllers attach media.
  // Replacing the server tree would discard loaded posters and move content.
  ReactDOM.flushSync(() => ReactDOM.hydrateRoot(homepageRoot, <App />));
} else {
  ReactDOM.createRoot(homepageRoot).render(<App />);
}
