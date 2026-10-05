export const sparkleProductFooterDisclaimer =
  "Sparkle Suite is an independent tool for Reps and Collectors. We are not affiliated with, endorsed by, sponsored by, or officially connected to Bomb Party.";

export const finderLearnContent = {
  seoTitle: "Sparkle Finder",
  seoDescription:
    "Sparkle Finder is the collector side of Sparkle Suite. Find Bomb Party jewelry, see which Suite reps have it, catch live shows, save favorites, and show off what you own.",
  brand: "Sparkle Finder",
  byline: "by Sparkle Suite",
  tagline: "Find it, favorite it, show it off.",
  comingSoon: "Get notified when we launch",
  createAccount: "Create an account",
  hero: {
    eyebrow: "For Bomb Party collectors",
    headlineLead: "Find the pieces you",
    headlineAccent: "love.",
    body: "Sparkle Finder is the collector side of Sparkle Suite. Look through the jewelry library, see which Suite reps carry a piece, and keep the ones that matter to you.",
  },
  pillars: {
    id: "how",
    items: [
      {
        title: "Search",
        image: "/learn/pillars/search.png",
        bullets: [
          "Browse our jewelry library built from our BP reps' revealed dancers.",
          "Look for pieces you already own, or pieces you want to collect.",
        ],
      },
      {
        title: "Save",
        image: "/learn/pillars/save.png",
        bullets: [
          "Already own a piece? Save it to your virtual collection.",
          "Want it? Save it to your wish list and get notified when a BP rep has it on their Dance Floor.",
        ],
      },
      {
        title: "Go to the show",
        image: "/learn/pillars/go-to-the-show.png",
        bullets: [
          "See the next show for the rep who has the piece you want.",
          "Follow your favorite reps and browse their Dance Floors anytime.",
          "Always know where and when the next show is.",
        ],
      },
      {
        title: "Show it off",
        image: "/learn/pillars/show-it-off.png",
        bullets: [
          "Curate your virtual collection that matches your real pieces.",
          "Share with friends and family",
          "Brag about the bling",
        ],
      },
    ],
  },
  offers: {
    id: "silver",
    silver: {
      highlight: "30 days of Silver is free.",
      noCard: "No card is needed to sign up.",
      price: "Silver is $6 per month, about the cost of a pumpkin spice latte.",
      charge: "No automatic charge. On day 30, Silver drops to Free unless you choose to pay $6 a month.",
      includesLabel: "Silver includes",
      includes: [
        "Save the pieces you love to your collection",
        "Nic-Nac is your collection curator and jewelry finder assistant",
      ],
    },
    free: {
      title: "Free",
      includesLabel: "Free includes",
      includes: [
        "Look through BP rep listings",
        "Follow your favorite reps",
        "Window shop their virtual dance floors",
        "See when their next show times and dates are",
      ],
    },
  },
  footer: {
    links: [
      { href: "/privacy-policy", label: "Privacy Policy" },
      { href: "/terms-and-conditions", label: "Terms and Conditions" },
    ],
    socials: [
      { href: "https://www.youtube.com/@SparkleSuite", label: "YouTube" },
      { href: "https://www.tiktok.com/@yoursparklesuite.com", label: "TikTok" },
    ],
    disclaimer: sparkleProductFooterDisclaimer,
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
