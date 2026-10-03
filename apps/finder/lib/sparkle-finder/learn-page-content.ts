export const finderLearnContent = {
  seoTitle: "Sparkle Finder",
  seoDescription:
    "Sparkle Finder is the collector side of Sparkle Suite. Find Bomb Party jewelry, see which Suite reps have it, catch live shows, save favorites, and show off what you own.",
  brand: "Sparkle Finder",
  byline: "by Sparkle Suite",
  tagline: "Find it, favorite it, show it off.",
  comingSoon: "Get notified when we launch",
  createAccount: "Create an account",
  nav: [{ href: "#how", label: "How it works" }],
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
