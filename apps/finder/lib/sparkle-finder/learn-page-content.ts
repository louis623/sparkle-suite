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
    services: ["Jewelry library", "Live shows", "Bling Vault"],
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
        mark: "Jewelry library",
      },
      {
        title: "Live shows and the Dance Floor",
        kicker: "In Finder today",
        body: "Catch live shows and see Dance Floor quantity leads. Sparkle Suite keeps those counts.",
        mark: "Live shows",
      },
      {
        title: "A vault, and a Showcase if you want one",
        kicker: "In Finder today",
        body: "Save a piece from the library. Keep what you own in your Bling Vault, choose one Hero Piece, and turn on Showcase only when you decide to show it off.",
        mark: "Vault",
      },
    ],
  },
  how: {
    id: "how",
    heading: "How it works",
    steps: [
      {
        title: "Search",
        body: "Hunt through the jewelry database for pieces you already own and pieces you want to collect.",
      },
      {
        title: "Save",
        body: "When you find it, save it. If you own it, it's your virtual collection. If you don't, put it on your wish list, or see if a rep has it on their Dance Floor.",
      },
      {
        title: "Go to the show",
        body: "See when that rep's next show is, go, and look at their website. Finder can tell you when a rep has a piece you're looking for.",
      },
      {
        title: "Show it off",
        body: "Curate your collection and share it with friends and family. Brag about the bling.",
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
