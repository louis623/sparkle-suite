export const finderLearnContent = {
  seoTitle: "Sparkle Finder",
  seoDescription:
    "Sparkle Finder is the collector side of Sparkle Suite. Find Bomb Party jewelry, see which Suite reps have it, catch live shows, save favorites, and show off what you own.",
  brand: "Sparkle Finder",
  byline: "by Sparkle Suite",
  tagline: "Find it, favorite it, show it off.",
  comingSoon: "Coming soon",
  nav: [
    { href: "#why", label: "Why it helps" },
    { href: "#discover", label: "What you can do" },
    { href: "#how", label: "How it works" },
    { href: "#silver", label: "Silver" },
  ],
  hero: {
    eyebrow: "For Bomb Party collectors, by Sparkle Suite",
    headlineLead: "Find the pieces you",
    headlineAccent: "love.",
    body:
      "Sparkle Finder is the collector side of Sparkle Suite. Find jewelry, see which Suite reps have it, catch live shows, save favorites, and show off what you own.",
    note: "An account is required. This page does not open one yet.",
    explore: { href: "#why", label: "See why it helps" },
  },
  why: {
    id: "why",
    eyebrow: "Why it helps",
    heading: "Stop hunting alone.",
    body:
      "Lives end. Facebook threads move on. Sparkle Finder is one place to discover the pieces you love, instead of starting the hunt over every time.",
    points: [
      {
        title: "One place to discover",
        body: "Start in the jewelry library instead of piecing the search together across lives and posts.",
      },
      {
        title: "See who has it",
        body: "When a Sparkle Suite rep carries a piece, you can visit their site from Finder.",
      },
      {
        title: "Keep what matters",
        body: "Save favorites, build your own collection, and show it off only if you want to.",
      },
    ],
  },
  discover: {
    id: "discover",
    eyebrow: "What you can do",
    heading: "Look, save, and go see the rep.",
    body:
      "Sparkle Finder is not a jewelry marketplace. You find a piece here, then visit the Sparkle Suite rep who carries it.",
    features: [
      {
        title: "Jewelry library",
        body: "Look through the jewelry library and find pieces you love.",
      },
      {
        title: "Suite reps who carry it",
        body: "See which Sparkle Suite reps carry a piece, then visit their site.",
      },
      {
        title: "Live shows and the Dance Floor",
        body: "Catch live shows and see Dance Floor quantity leads. Sparkle Suite keeps those counts. Finder does not invent stock.",
      },
      {
        title: "Favorites",
        body: "Save pieces and Suite reps you want to come back to.",
      },
      {
        title: "Bling Vault and Hero Piece",
        body: "Keep what you own in your Bling Vault, and choose one Hero Piece.",
      },
      {
        title: "Showcase",
        body: "Show off your collection when you choose. Showcase stays opt-in.",
      },
      {
        title: "Showcase Studio",
        body: "Add pieces you own, with photos, from your own account.",
      },
      {
        title: "Nic-Nac",
        body: "A helper for the hunt while you have Silver. Nic-Nac is part of Silver.",
      },
    ],
  },
  how: {
    id: "how",
    eyebrow: "How it works",
    heading: "Browse, save, then visit the Suite rep.",
    steps: [
      {
        title: "Browse",
        body: "Look through the jewelry library for the pieces you love.",
      },
      {
        title: "Save",
        body: "Favorite them, and keep what you own in your Bling Vault.",
      },
      {
        title: "Visit the Suite rep",
        body: "Open their site, catch a live show, or check the Dance Floor.",
      },
    ],
  },
  silver: {
    id: "silver",
    eyebrow: "Silver",
    heading: "Free to start. Silver if you want it.",
    body:
      "You need an account to use Finder, including Free. Free includes a 30-day Silver trial. No card at signup. Finder does not charge you automatically. On day 30, Silver drops to Free and Finder pings you. After that, Silver is $6 a month only if you want it.",
    offerLabel: "Silver, if you keep it",
    price: "$6",
    period: "a month",
    offerNote: "Only if you choose it. This page does not take payment.",
    facts: [
      "Account required, including Free",
      "30-day Silver trial",
      "No card at signup",
      "No automatic charge",
      "Day 30 returns you to Free",
      "Finder pings you so you can choose",
    ],
  },
  profile: {
    id: "profile",
    eyebrow: "Fine print",
    heading: "How a jewelry profile is used.",
    body: "If you share jewelry preferences with Finder, they are used in three ways.",
    uses: [
      "Shared with Sparkle Suite reps only, so they can use them. Nobody else receives them.",
      "Kept for your own Finder profile and collection.",
      "Used by Finder to point you toward pieces you might like.",
    ],
  },
  cta: {
    id: "soon",
    heading: "Find it, favorite it, show it off.",
    body: "Sparkle Finder accounts are not open from this page yet.",
  },
  footer: {
    links: [
      { href: "/privacy-policy", label: "Privacy Policy" },
      { href: "/terms-and-conditions", label: "Terms and Conditions" },
      { href: "https://www.yoursparklesuite.com", label: "Sparkle Suite" },
    ],
    socials: [
      { href: "https://www.youtube.com/@yoursparklesuite", label: "YouTube" },
      { href: "https://www.tiktok.com/@yoursparklesuite", label: "TikTok" },
    ],
    disclaimer:
      "Sparkle Finder is a discovery hub by Sparkle Suite. We are not affiliated with, endorsed by, sponsored by, or officially connected to Bomb Party. Sparkle Finder is powered by Neon Rabbit Digital Services.",
    developerHref: "https://neonrabbit.net",
    developerLabel: "neonrabbit.net",
  },
} as const;

export function finderLearnVisibleCopy(content: typeof finderLearnContent = finderLearnContent): string {
  return collectText(content).join("\n");
}

function collectText(value: unknown): string[] {
  if (typeof value === "string") {
    return value.startsWith("#") || value.startsWith("/") || value.startsWith("http") ? [] : [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectText(entry));
  }

  if (value && typeof value === "object") {
    return Object.values(value).flatMap((entry) => collectText(entry));
  }

  return [];
}
