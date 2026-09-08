import type { AmethystHomepageTemplateData } from '@/lib/amethyst/homepage-template-data'
import type {
  AmethystJoinTeamMember,
  AmethystJoinTemplateData,
} from '@/lib/amethyst/join-template-data'
import type { AmethystTradeTemplateData } from '@/lib/amethyst/trade-template-data'
import type { SiteSettingsDashboardResult } from '@/lib/services/types'
import {
  BRITT_WITH_BLING_PUBLIC_SITE_SLUG,
  BRITT_WITH_BLING_SHOWCASE_VIDEO_URL,
} from '@/lib/britt-with-bling/constants'

export const BRITT_WITH_BLING_PROFILE = {
  email: '',
  displayName: 'Brittany',
  publicName: 'Brittany',
  businessName: 'Britt with Bling',
  teamName: 'The Virtuous Fizzers',
  publicSiteSlug: BRITT_WITH_BLING_PUBLIC_SITE_SLUG,
  futureCustomDomain: 'brittwithbling.com',
  sourceSite: 'https://brittwithbling.com/',
  shopUrl: 'https://bombparty.com/brittwithbling/parties',
  joinPackUrl: 'https://bombparty.com/brittwithbling/packs',
  tiktokUrl: 'https://www.tiktok.com/@brittwithbling',
  tiktokHandle: '@brittwithbling',
  facebookVipUrl: 'https://www.facebook.com/groups/390848873287947',
  heroImageUrl: '/britt-with-bling/hero.jpeg',
  joinHeroImageUrl: '/britt-with-bling/join-hero.jpeg',
  showcaseVideoUrl: BRITT_WITH_BLING_SHOWCASE_VIDEO_URL,
  announcementText:
    'Sterling Club & 12k Gold Vermeil collections are here - genuine precious metals, elevated designs.',
  promoTickerText:
    '10TH ANNIVERSARY SPECIAL: EVERY $599 LAUNCH PACK NOW INCLUDES A GUARANTEED DIAMOND REVEAL! -- JOIN THE VIRTUOUS FIZZERS TODAY -- START YOUR FIZZ BIZ WITH BRITTANY! -- MSRP UP TO $3,500 -- OFFER ENDS DEC 31, 2026!',
} as const

export const BRITT_WITH_BLING_TEAM_MEMBERS: AmethystJoinTeamMember[] = [
  {
    name: 'Brittany',
    business: 'Britt with Bling',
    state: 'Florida',
    imageUrl: '/britt-with-bling/team-01-brittany.png',
    socialLinks: {
      tiktok: 'https://www.tiktok.com/@brittwithbling',
      website: 'https://bombparty.com/brittwithbling',
      facebook: 'https://www.facebook.com/groups/390848873287947',
    },
  },
  {
    name: 'Rayna',
    business: 'Queen of Blingy Thingz',
    state: 'Florida',
    imageUrl: '/britt-with-bling/team-02-rayna.png',
    socialLinks: {
      tiktok:
        'https://www.tiktok.com/@queenofblingythingz?is_from_webapp=1&sender_device=pc',
      facebook: 'https://www.facebook.com/share/g/14TcP1vbcq8/?mibextid=wwXIfr',
    },
  },
  {
    name: 'Britt',
    business: 'Sudds & Sparkles',
    state: 'Alabama',
    imageUrl: '/britt-with-bling/team-03-britt.png',
    socialLinks: {
      tiktok: 'https://www.tiktok.com/@brittsudduth32',
    },
  },
  {
    name: 'Lindsey',
    business: 'Mile High Fizz',
    state: 'Colorado',
    imageUrl: '/britt-with-bling/team-04-lindsey.png',
    socialLinks: {
      tiktok: 'https://www.tiktok.com/@lindze1188',
      website: 'https://milehighfizz.com/',
      facebook: 'https://www.facebook.com/groups/390848873287947',
    },
  },
  {
    name: 'Trish',
    business: 'Fizzn with Mama T',
    state: 'North Carolina',
    imageUrl: '/britt-with-bling/team-05-trish.png',
    socialLinks: {
      tiktok: 'https://www.tiktok.com/@trishander',
      facebook: 'https://www.facebook.com/groups/390848873287947',
    },
  },
  {
    name: 'Veronica',
    business: 'Fizzy Finds with V',
    state: 'Indiana',
    imageUrl: '/britt-with-bling/team-06-veronica.png',
    socialLinks: {
      tiktok: 'https://www.tiktok.com/@fizzyfindswithv',
      facebook: 'https://www.facebook.com/groups/390848873287947',
    },
  },
  {
    name: 'Kim',
    business: 'Go for the Bling',
    state: 'West Virginia',
    imageUrl: '/britt-with-bling/team-07-kim.png',
    socialLinks: {
      tiktok: 'https://www.tiktok.com/@goforthebling',
    },
  },
  {
    name: 'Brooke',
    business: 'Bdubbfizz',
    state: 'Alabama',
    imageUrl: '/britt-with-bling/team-08-brooke.png',
    socialLinks: {
      facebook: 'https://www.facebook.com/groups/390848873287947',
    },
  },
  {
    name: 'Beverly',
    business: 'Bev with Bling',
    state: 'Tennessee',
    imageUrl: '/britt-with-bling/team-09-beverly.png',
    socialLinks: {
      tiktok: 'https://www.tiktok.com/@bevwithbling',
      facebook: 'https://www.facebook.com/groups/181XwEFtDQ/',
    },
  },
  {
    name: 'Julie',
    business: 'Jules Fizzin Jewels',
    state: 'Illinois',
    imageUrl:
      '/britt-with-bling/team-10-julie.png',
    socialLinks: {
      tiktok: 'https://www.tiktok.com/@julesfizzinjewels',
      facebook: 'https://www.facebook.com/natwithbling.vip?mibextid=LQQJ4d',
    },
  },
  {
    name: 'Natalia',
    business: 'Nat with Blingg',
    state: 'California',
    imageUrl:
      '/britt-with-bling/team-11-natalia.png',
    socialLinks: {
      tiktok: 'https://www.tiktok.com/@natwithblingg',
      facebook: 'https://www.facebook.com/natwithbling.vip?mibextid=LQQJ4d',
    },
  },
  {
    name: 'Karen',
    business: 'The Opal Cowgirl',
    state: 'Oklahoma',
    imageUrl:
      '/britt-with-bling/team-12-karen.png',
    socialLinks: {
      tiktok: 'https://www.tiktok.com/@theopalcowgirl',
    },
  },
  {
    name: 'Angie and Kylee',
    business: 'The Heirloom Duo',
    state: 'Florida',
    imageUrl:
      '/britt-with-bling/team-13-angie-kylee.png',
    socialLinks: {
      tiktok: 'https://www.tiktok.com/@the.heirloom.duo',
    },
  },
  {
    name: 'Heather',
    business: 'Curls and Cubes',
    state: 'Florida',
    imageUrl:
      '/britt-with-bling/team-14-heather.png',
    socialLinks: {
      tiktok: 'https://www.tiktok.com/@curlsandcubes',
      facebook: 'https://www.facebook.com/share/g/1Bs28D8d6p/?mibextid=wwXIfr',
    },
  },
  {
    name: 'Kayse',
    business: 'Twenty 2 Lane',
    state: 'Tennessee',
    imageUrl:
      '/britt-with-bling/team-15-kayse.png',
    socialLinks: {
      tiktok: 'https://www.tiktok.com/@kayse.twenty2lane',
    },
  },
  {
    name: 'Blake',
    business: 'Blakes_famof6',
    state: 'Alabama',
    imageUrl:
      '/britt-with-bling/team-16-blake.png',
    socialLinks: {
      tiktok:
        'https://www.tiktok.com/@blakes_famof6?is_from_webapp=1&sender_device=pc',
    },
  },
  {
    name: 'Michelle',
    business: 'michelledfizzcity',
    state: 'California',
    imageUrl:
      '/britt-with-bling/team-17-michelle.jpeg',
    socialLinks: {
      tiktok: 'https://www.tiktok.com/@michelledfizzcity',
    },
  },
  {
    name: 'Alexandra',
    business: 'Fizzchemy',
    state: 'Ohio',
    imageUrl:
      '/britt-with-bling/team-18-alex-ra.jpeg',
    socialLinks: {
      tiktok: 'https://www.tiktok.com/@fizzchemy?is_from_webapp=1&sender_device=pc',
    },
  },
  {
    name: 'Susan',
    business: 'Gypsy Jewels Boutique',
    state: 'Georgia',
    imageUrl:
      '/britt-with-bling/team-19-susan.jpeg',
    imageClassName: 'object-top',
    socialLinks: {
      tiktok:
        'https://www.tiktok.com/@susanawaters22?is_from_webapp=1&sender_device=pc',
    },
  },
  {
    name: 'Michelle',
    business: 'Fizzinfarm-Housewife',
    state: 'New York',
    imageUrl:
      '/britt-with-bling/team-20-michelle.jpeg',
    socialLinks: {
      tiktok:
        'https://www.tiktok.com/@fizzinfarm_housewife?is_from_webapp=1&sender_device=pc',
    },
  },
  {
    name: 'Danny',
    business: 'sparkletherapy',
    state: 'Florida',
    imageUrl:
      '/britt-with-bling/team-21-danny.jpeg',
    socialLinks: {
      tiktok: 'https://www.tiktok.com/@dannyaa1183?is_from_webapp=1&sender_device=pc',
    },
  },
  {
    name: 'Kelly',
    business: 'fizzinghomeruns',
    state: 'Indiana',
    imageUrl:
      '/britt-with-bling/team-22-kelly.jpeg',
    socialLinks: {
      tiktok: 'https://www.tiktok.com/@kelpoo77?is_from_webapp=1&sender_device=pc',
    },
  },
  {
    name: 'Jenn',
    business: 'jennfizz4keeps',
    state: 'California',
    imageUrl:
      '/britt-with-bling/team-23-jenn.jpeg',
    socialLinks: {
      tiktok:
        'https://www.tiktok.com/@jennfizz4keeps?is_from_webapp=1&sender_device=pc',
    },
  },
  {
    name: 'Kyndal',
    business: 'kyndalhibbeler',
    state: 'Texas',
    imageUrl: '/britt-with-bling/team-24-kyndal.webp',
    socialLinks: {
      tiktok:
        'https://www.tiktok.com/@kyndalhibbeler?is_from_webapp=1&sender_device=pc',
    },
  },
  {
    name: 'Kristin',
    business: 'blingwithkrissig',
    state: 'Florida',
    imageUrl: '/britt-with-bling/team-25-kristin.webp',
    socialLinks: {
      tiktok:
        'https://www.tiktok.com/@blingwithkrissig?is_from_webapp=1&sender_device=pc',
    },
  },
  {
    name: 'Samantha',
    business: 'Bling with Sam',
    state: 'Indiana',
    imageUrl: '/britt-with-bling/team-26-samantha.webp',
    socialLinks: {
      tiktok:
        'https://www.tiktok.com/@samantha.waldrep?is_from_webapp=1&sender_device=pc',
    },
  },
  {
    name: 'Angela',
    business: 'Angies Fizz & Bling',
    state: 'Kentucky',
    imageUrl: '/britt-with-bling/team-27-angela.png',
    socialLinks: {
      tiktok:
        'https://www.tiktok.com/@angiesfizzbling?is_from_webapp=1&sender_device=pc',
    },
  },
]

function brittWithBlingTeamMemberKey(member: Pick<AmethystJoinTeamMember, 'name' | 'business'>) {
  return `${member.name.trim().toLowerCase()}::${member.business.trim().toLowerCase()}`
}

const BRITT_WITH_BLING_TEAM_MEMBER_ASSET_BY_KEY = new Map(
  BRITT_WITH_BLING_TEAM_MEMBERS.map((member) => [
    brittWithBlingTeamMemberKey(member),
    member.imageUrl,
  ]),
)

function normalizeBrittWithBlingTeamMemberAssets(
  teamMembers: AmethystJoinTeamMember[],
): AmethystJoinTeamMember[] {
  return teamMembers.map((member) => {
    const imageUrl = member.imageUrl?.trim()
    if (!imageUrl || !/readdy|storage\.readdy-site/i.test(imageUrl)) return member

    const migratedImageUrl = BRITT_WITH_BLING_TEAM_MEMBER_ASSET_BY_KEY.get(
      brittWithBlingTeamMemberKey(member),
    )

    return migratedImageUrl ? { ...member, imageUrl: migratedImageUrl } : member
  })
}

export function isBrittWithBlingSettings(
  settings: SiteSettingsDashboardResult,
  publicSiteSlug?: string | null,
) {
  const email = settings.email.trim().toLowerCase()
  const businessName = settings.businessName.trim().toLowerCase()
  const teamName = settings.teamName.trim().toLowerCase()

  return (
    publicSiteSlug?.trim().toLowerCase() === BRITT_WITH_BLING_PROFILE.publicSiteSlug ||
    (BRITT_WITH_BLING_PROFILE.email !== '' &&
      email === BRITT_WITH_BLING_PROFILE.email) ||
    businessName === 'britt with bling' ||
    teamName === 'the virtuous fizzers'
  )
}

export function applyBrittWithBlingHomepage(
  homepage: AmethystHomepageTemplateData,
): AmethystHomepageTemplateData {
  const hasCustomTagline =
    homepage.tagline.trim() &&
    homepage.tagline.trim() !== 'Where Faith Meets Fizz & Every Reveal is a VIP Experience'
  const hasCustomAboutHeadline =
    homepage.aboutHeadline.trim() &&
    !/^meet .+ and the story behind .+\.$/i.test(homepage.aboutHeadline.trim())
  const hasConfiguredAboutNarrative = !homepage.aboutParagraphs.some((paragraph) =>
    /share how you got started|nic-nac can rewrite this|add a final paragraph/i.test(
      paragraph,
    ),
  )
  const hasConfiguredAboutMedia = homepage.aboutMediaManaged === true || homepage.aboutMediaSlots.some(
    (slot) => Boolean(slot.mediaUrl?.trim()) || (slot.href && slot.href !== '#'),
  )
  const tiktokSocial = homepage.socialLinks.find((link) => link.label === 'TikTok')?.href
  const facebookSocial = homepage.socialLinks.find((link) => link.label === 'Facebook')?.href
  const tiktokUrl = tiktokSocial && tiktokSocial !== '#'
    ? tiktokSocial
    : homepage.streamLinks.tiktok
  const facebookUrl = facebookSocial && facebookSocial !== '#'
    ? facebookSocial
    : homepage.streamLinks.facebook

  return {
    ...homepage,
    publicSiteVariant: 'britt_with_bling_hybrid',
    heroEyebrow: homepage.teamName || BRITT_WITH_BLING_PROFILE.teamName,
    heroHeadline: homepage.heroHeadlineOverride || homepage.businessName,
    heroSub: hasCustomTagline
      ? homepage.tagline
      : 'Where Faith Meets Fizz & Every Reveal is a VIP Experience. Place your order and return to the live party to watch your reveal.',
    heroImageUrl: BRITT_WITH_BLING_PROFILE.heroImageUrl,
    announcementText: BRITT_WITH_BLING_PROFILE.announcementText,
    announcementLinkLabel: 'Learn More',
    announcementHref: '#wibp',
    promoTickerText: BRITT_WITH_BLING_PROFILE.promoTickerText,
    shopCtaLabel: 'Shop Now',
    featuredReveal: {
      eyebrow: 'Style Council Elite',
      title: 'The Rise of Her',
      body:
        'Representing The Virtuous Fizzers, Brittany has been honored with naming a legacy piece for Bomb Party. Born from the storm, defined by resilience - this is the Mother of Pearl masterpiece.',
      ctaLabel: 'Shop the Luxe Layers Collection',
      ctaHref: BRITT_WITH_BLING_PROFILE.shopUrl,
      videoUrl: 'https://www.tiktok.com/embed/7609434971228425486',
      videoTitle: 'Rise of Her Luxe Layer 2026',
    },
    revealExplainer: {
      title: 'What is a Bomb Party?',
      body:
        'Experience the thrilling, must-watch excitement of a Bomb Party jewelry reveal. Submit your order and watch live as Brittany fizzes, opens, and reveals your beautiful, unique piece of handcrafted jewelry. Join the live party to chase highly sought-after unicorns and diamond pieces while sharing in the fun of discovering your next favorite pieces.',
      videoCaption: 'Watch a Live Reveal!',
      videoHandle: '@brittwithbling on TikTok',
      videoUrl: BRITT_WITH_BLING_PROFILE.showcaseVideoUrl,
      videoTitle: 'Britt with Bling TikTok Video',
      ctaLabel: 'Follow for More Reveals',
      ctaHref: BRITT_WITH_BLING_PROFILE.tiktokUrl,
      steps: [
        {
          title: 'Order Your Jewelry',
          body: 'Purchase the items you want to reveal.',
        },
        {
          title: 'Watch Live',
          body:
            "Join Brittany's live on TikTok to watch as she reveals your surprise jewelry.",
        },
        {
          title: 'Receive Your Amazing Handcrafted Jewelry',
          body: 'Your jewelry ships directly to you - ready to enjoy.',
        },
      ],
    },
    aboutHeadline: hasCustomAboutHeadline ? homepage.aboutHeadline : 'What is a Bomb Party?',
    aboutParagraphs: hasConfiguredAboutNarrative
      ? homepage.aboutParagraphs
      : [
          'Experience the thrill of a live jewelry reveal with Brittany and the Britt with Bling community.',
          'Order your jewelry, return to the live party, and watch the fizz reveal your new favorite sparkle.',
          'When a reveal is not quite your style, the Sparkle Suite Dance Floor gives the community a rep-reviewed place to swap.',
        ],
    aboutMediaSlots: hasConfiguredAboutMedia
      ? homepage.aboutMediaSlots
      : [
          {
            typeLabel: 'Live reveal community',
            caption:
              'Follow Brittany on TikTok for live reveals, launches, and VIP sparkle moments.',
            href: BRITT_WITH_BLING_PROFILE.tiktokUrl,
            mediaUrl: BRITT_WITH_BLING_PROFILE.heroImageUrl,
          },
          {
            typeLabel: 'The Virtuous Fizzers',
            caption:
              'Meet the team, shop with Brittany, and come back when new trade pieces are posted.',
            href: '/amethyst/Join.html',
            mediaUrl: BRITT_WITH_BLING_PROFILE.joinHeroImageUrl,
          },
        ],
    showcaseVideoCaption: '@brittwithbling live reveal highlights',
    // Keep a rep-configured customer video intact; this profile URL is only
    // the fallback for the legacy site configuration.
    showcaseVideoUrl:
      homepage.showcaseVideoUrl.trim() && homepage.showcaseVideoUrl !== '#'
        ? homepage.showcaseVideoUrl
        : BRITT_WITH_BLING_PROFILE.tiktokUrl,
    signupTitle: 'Never Miss a Show!',
    signupSub:
      'Get email updates now and be first in line when SMS show reminders launch.',
    joinTeamTitle: `Join ${homepage.teamName}`,
    joinTeamSub:
      'Start your Fizz Biz with Brittany, mentorship, community, and a launch-pack path built for sparkle.',
    joinTeamUrl: '/amethyst/Join.html',
    footerTagline: hasCustomTagline
      ? homepage.footerTagline
      : 'Britt with Bling is where faith meets fizz, community, and VIP reveals.',
    showJoinPage: homepage.showJoinPage,
    streamLinks: {
      ...homepage.streamLinks,
      shop: BRITT_WITH_BLING_PROFILE.shopUrl,
      watch: tiktokUrl || facebookUrl || homepage.streamLinks.watch,
      tiktok: tiktokUrl,
      facebook: facebookUrl,
    },
    socialLinks: homepage.socialLinks,
    footerLinks: {
      ...homepage.footerLinks,
      home: '/amethyst/Homepage.html',
      tradeBoard: '/amethyst/Trade.html',
      joinTeam: homepage.footerLinks.joinTeam,
      catalog: BRITT_WITH_BLING_PROFILE.shopUrl,
      preOrders: BRITT_WITH_BLING_PROFILE.shopUrl,
      pastShows: '#events',
      faq: '#wibp',
      contact: facebookUrl || BRITT_WITH_BLING_PROFILE.facebookVipUrl,
      privacy: '/privacy-policy',
      terms: '/terms-and-conditions',
      accessibility: 'mailto:hello@yoursparklesuite.com?subject=Accessibility%20support',
    },
  }
}

export function applyBrittWithBlingTrade(
  trade: AmethystTradeTemplateData,
): AmethystTradeTemplateData {
  return {
    ...trade,
    publicSiteVariant: 'britt_with_bling_hybrid',
    tradeHeroTitle: `${trade.businessName} Dance Floor`,
    tradeHeroSub:
      `When ${trade.repName} adds available dancers, you can request a rep-reviewed item-for-item swap here.`,
    footerTagline:
      `Faith, fizz, VIP reveals, and rep-reviewed trades with ${trade.businessName}.`,
    footerLinks: {
      ...trade.footerLinks,
      home: '/amethyst/Homepage.html',
      tradeBoard: '/amethyst/Trade.html',
      joinTeam: trade.footerLinks.joinTeam,
      catalog: BRITT_WITH_BLING_PROFILE.shopUrl,
      preOrders: BRITT_WITH_BLING_PROFILE.shopUrl,
      pastShows: '/amethyst/Homepage.html#events',
      faq: '#faq',
      contact: BRITT_WITH_BLING_PROFILE.facebookVipUrl,
      privacy: '/privacy-policy',
      terms: '/terms-and-conditions',
      accessibility: 'mailto:hello@yoursparklesuite.com?subject=Accessibility%20support',
    },
  }
}

export function applyBrittWithBlingJoin(
  join: AmethystJoinTemplateData,
  teamMembers: AmethystJoinTeamMember[] = [],
): AmethystJoinTemplateData {
  return {
    ...join,
    publicSiteVariant: 'britt_with_bling_hybrid',
    repCity: '',
    repState: 'Florida',
    heroTitle: `WELCOME TO ${join.teamName.toUpperCase()}`,
    promoText:
      'Review Bomb Party\'s current official starter-pack options and promotions before enrolling.',
    heroPitch:
      `Learn about the independent rep opportunity, review the official requirements, and ask ${join.repName} what support ${join.teamName} currently offers.`,
    heroCtaText: 'REVIEW OFFICIAL JOIN DETAILS',
    finalPitch:
      `Review the current official enrollment details, then ask ${join.repName} any questions about ${join.teamName} before you decide.`,
    bpReferralUrl: BRITT_WITH_BLING_PROFILE.joinPackUrl,
    hasRecruitingLink: true,
    tickerTopText:
      `Explore ${join.teamName} | Review official requirements | Ask about current team support | Income is not guaranteed`,
    footerTagline:
      `Build your Bomb Party business with ${join.repName} and ${join.teamName}.`,
    shopUrl: BRITT_WITH_BLING_PROFILE.shopUrl,
    repSocialLinks: {
      ...join.repSocialLinks,
      website: BRITT_WITH_BLING_PROFILE.shopUrl,
    },
    socialLinks: join.socialLinks,
    footerLinks: {
      ...join.footerLinks,
      home: '/amethyst/Homepage.html',
      tradeBoard: '/amethyst/Trade.html',
      joinTeam: join.footerLinks.joinTeam,
      catalog: BRITT_WITH_BLING_PROFILE.shopUrl,
      preOrders: BRITT_WITH_BLING_PROFILE.shopUrl,
      pastShows: '/amethyst/Homepage.html#events',
      faq: '#join-faq',
      contact: join.repSocialLinks.tiktok || BRITT_WITH_BLING_PROFILE.facebookVipUrl,
      privacy: '/privacy-policy',
      terms: '/terms-and-conditions',
      accessibility: 'mailto:hello@yoursparklesuite.com?subject=Accessibility%20support',
    },
    footerColumn: {
      title: '',
      links: [],
    },
    teamMembers: normalizeBrittWithBlingTeamMemberAssets(teamMembers),
    faqAnswers: {
      whatIsTeam:
        `${join.teamName} is ${join.repName}'s team of independent Bomb Party reps. Ask ${join.repName} how the team communicates and what support is available now.`,
      cost:
        'Starter-pack options, contents, and prices can change. Review the current official Bomb Party enrollment page before making a decision.',
      experience:
        `Review the official requirements and ask ${join.repName} what training or onboarding help is available for new reps.`,
      timeCommitment:
        'The time needed depends on your goals and how you run your independent business. Review the official policies and plan a realistic schedule.',
      support:
        `Support can change. Ask ${join.repName} which communication, onboarding, and training resources ${join.teamName} currently offers.`,
      income:
        'Income varies by effort, sales, and time. Review the Bomb Party income disclosure before enrolling.',
    },
  }
}
