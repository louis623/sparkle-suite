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
    eyebrow: "For Bomb Party collectors",
    headlineLead: "Find the pieces you",
    headlineAccent: "love.",
    body: "Sparkle Finder is the collector side of Sparkle Suite. Look through the jewelry library, see which Suite reps carry a piece, and keep the ones that matter to you.",
    note: "An account is required. This page does not open one yet.",
    explore: { href: "#why", label: "See why it helps" },
    peek: {
      label: "Jewelry library",
      caption: "Real pieces from the Sparkle Suite catalog.",
    },
    gallery: [
      {
        src: "/learn/peeks/cosmic-navigator.webp",
        width: 1200,
        height: 1200,
        alt: "The Cosmic Navigator necklace from the Sparkle Suite jewelry library.",
        name: "The Cosmic Navigator",
      },
      {
        src: "/learn/peeks/northstar.webp",
        width: 1200,
        height: 1200,
        alt: "You Are My Northstar necklace from the Sparkle Suite jewelry library.",
        name: "You Are My Northstar",
      },
    ],
  },
  why: {
    id: "why",
    eyebrow: "Why it helps",
    heading: "Stop hunting alone.",
    body: "Lives end. Facebook threads move on. Sparkle Finder is one place to discover the pieces you love, instead of starting the hunt over every time.",
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
    body: "Sparkle Finder is not a jewelry marketplace. You find a piece here, then visit the Sparkle Suite rep who carries it.",
    aside: "With Silver, Showcase Studio lets you add pieces you own, and Nic-Nac helps with the hunt.",
    features: [
      {
        title: "From the library to the rep",
        kicker: "In Finder today",
        body: "Open a piece and see which Sparkle Suite rep carries it, then visit their site. Finder does not invent stock.",
        peek: {
          src: "/learn/peeks/rep-path.webp",
          width: 1600,
          height: 1511,
          alt: "A Sparkle Finder piece page for The Cosmic Navigator, with the Suite rep who carries it.",
          label: "Piece page",
        },
      },
      {
        title: "Live shows and the Dance Floor",
        kicker: "In Finder today",
        body: "Catch live shows and see Dance Floor quantity leads. Sparkle Suite keeps those counts.",
        peek: {
          src: "/learn/peeks/shows.webp",
          width: 1600,
          height: 1033,
          alt: "Sparkle Finder live shows, listing upcoming Sparkle Suite shows.",
          label: "Live shows",
        },
      },
      {
        title: "A vault, and a Showcase if you want one",
        kicker: "In Finder today",
        body: "Save a piece from the library. Keep what you own in your Bling Vault, choose one Hero Piece, and turn on Showcase only when you decide to show it off.",
        peek: {
          src: "/learn/peeks/save.webp",
          width: 1100,
          height: 1445,
          alt: "Sparkle Finder library cards with Save, for pieces you want to keep.",
          label: "Save a piece",
        },
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
    body: "Free includes a 30-day Silver trial. No card at signup. Finder does not charge you automatically. On day 30, Silver drops to Free and Finder pings you.",
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
