/**
 * Official YouTube profile for icons and footer social.
 * Louis confirmed https://youtube.com/@sparklesuite (2026-09-28). That short
 * link is the same channel as this canonical URL: UCpISEvH3gBaRfC8OoCKH7Qg.
 * Embeds are individual listed videos, not this profile.
 */
export const sparkleSuiteYouTubeChannelUrl = 'https://www.youtube.com/@SparkleSuite' as const
/** Official TikTok profile for icons and footer social. Not an embed. */
export const sparkleSuiteTikTokChannelUrl = 'https://www.tiktok.com/@yoursparklesuite.com' as const

export const sparkleSuitePublicLandingSafety = {
  disclaimer:
    'Sparkle Suite is an independent tool for reps. We are not affiliated with, endorsed by, sponsored by, or officially connected to Bomb Party.',
  audienceClarifier:
    'Sparkle Suite is built for reps who want a more polished customer experience, smoother live shows, and less patchwork behind the scenes.',
} as const

export const sparkleSuitePublicLandingContent = {
  brand: 'Sparkle Suite',
  sections: [
    { id: 'hero', label: 'Hero' },
    { id: 'customer-site-proof', label: 'Customer site proof' },
    { id: 'workspace-proof', label: 'Workspace proof' },
    { id: 'pricing', label: 'Pricing' },
  ],
  hero: {
    eyebrow: 'Now building Sparkle Suite sites',
    headline: 'Your brand. Your show. A setup that shines.',
    body:
      'Sparkle Suite gives reps a polished customer site, standout live-show tools, and built-in support that helps customers feel the difference.',
    primaryCta: { label: 'Join the build queue', href: '/prelaunch#waitlist' },
  },
  workspaceProof: {
    eyebrow: 'Rep workspace',
    heading: 'Run the show with less scramble behind the scenes.',
    body:
      'Help customers find the next live, follow the line, and browse the Dance Floor. Your workspace brings your site, Live queue, Live event calendar, and Nic-Nac together. Customer email and SMS updates are coming soon.',
  },
  customerSiteProof: {
    eyebrow: 'Customer-facing site',
    heading: 'Make the customer side feel like you.',
    body:
      'Choose a look that fits your brand, then give customers one polished place to find your show, queue, dance floor, and updates.',
  },
  assets: {
    tradeBoardDesktopProof: {
      src: '/sparkle-suite/landing/trade-board-desktop-proof.png',
      alt: 'Sparkle Suite customer Dance Floor preview on desktop.',
    },
    nicNacWorkspaceProof: {
      src: '/sparkle-suite/landing/nic-nac-workspace-proof.png',
      alt: 'Sparkle Suite Nic-Nac workspace preview on desktop.',
    },
    customerSiteVioletProof: {
      src: '/sparkle-suite/landing/customer-site-violet-proof.png',
      alt: 'Violet customer-facing Sparkle Suite site preview.',
    },
    customerSiteNightProof: {
      src: '/sparkle-suite/landing/customer-site-night-proof.png',
      alt: 'Dark customer-facing Sparkle Suite site preview.',
    },
    customerSiteBlushProof: {
      src: '/sparkle-suite/landing/customer-site-blush-proof.png',
      alt: 'Blush customer-facing Sparkle Suite site preview.',
    },
  },
  pricing: {
    eyebrow: 'Pricing',
    heading: 'Time to level up.',
    body:
      'If you have been waiting for a sign to stop piecing it together, this is it.',
    buildFee: {
      label: 'Sparkle Suite setup fee',
      price: '$49.99',
      body: 'One-time and non-refundable, itemized separately at checkout.',
    },
    standard: {
      label: 'Standard monthly',
      badge: 'Current monthly rate',
      price: '$74.99/month',
      term: 'Monthly subscription from the start.',
      firstCheckout: '$124.98 first checkout. Tax is not included in this price.',
    },
    included: [
      'Customer site',
      'Dance Floor',
      'Live queue',
      'Live event calendar',
      'Email updates',
      'SMS updates',
      'Nic-Nac',
    ],
    primaryCta: { label: 'Join the build queue', href: '/prelaunch#waitlist' },
    sectionCta: { label: 'Join the build queue', href: '/prelaunch#waitlist' },
  },
  publicNicNacAssistant: {
    teaser: 'Still have questions? Ask Nic-Nac.',
    body:
      "Get quick answers about setup, pricing, what's included, and whether Sparkle Suite fits your live-show workflow.",
    buttonLabel: 'Ask Nic-Nac',
    panelTitle: 'Ask Nic-Nac',
    panelIntro:
      'Nic-Nac can answer public Sparkle Suite questions before you join the build queue.',
    starterQuestions: [
      "What's included?",
      'How does setup work?',
      'Is Sparkle Suite affiliated with Bomb Party?',
    ],
    inputLabel: 'Your question',
    inputPlaceholder: 'Ask about setup, pricing, included tools, or fit.',
    submitLabel: 'Ask',
    handoffLabels: {
      name: 'Name',
      email: 'Email',
      question: 'Question for Louis',
      submit: 'Save question for Louis',
      saved:
        'Your question is saved for Louis to review. No marketing signup, payment, email, or text was triggered.',
    },
  },
  footer: {
    links: [
      { label: 'Privacy Policy', href: '/privacy-policy' },
      { label: 'Terms and Conditions', href: '/terms-and-conditions' },
    ],
    socialLinks: [
      { label: 'Sparkle Finder', href: 'https://yoursparklefinder.com' },
      { label: 'YouTube', href: sparkleSuiteYouTubeChannelUrl },
      { label: 'TikTok', href: sparkleSuiteTikTokChannelUrl },
    ],
  },
} as const
