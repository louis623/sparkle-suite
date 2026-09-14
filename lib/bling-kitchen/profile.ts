import type { AmethystHomepageTemplateData } from '@/lib/amethyst/homepage-template-data'
import type { AmethystJoinTemplateData } from '@/lib/amethyst/join-template-data'
import type { AmethystTradeTemplateData } from '@/lib/amethyst/trade-template-data'
import type { SiteSettingsDashboardResult } from '@/lib/services/types'
import { recipes } from './recipes'

export const BLING_KITCHEN_PROFILE = {
  email: 'blingkitchen19@gmail.com',
  displayName: 'Heather',
  publicName: 'Heather',
  businessName: 'BlingKitchen',
  legalBusinessName: 'The Bling Kitchen',
  teamName: 'Opal Sparkling Gems',
  publicSiteSlug: 'blingkitchen',
  futureCustomDomain: 'theblingkitchen.com',
  sourceSite: 'https://theblingkitchen.com/',
  shopUrl: 'https://www.bombparty.com/blingkitchen/parties',
  joinPackUrl: 'https://www.bombparty.com/blingkitchen/packs',
  tiktokUrl: 'https://www.tiktok.com/@blingkitchen',
  tiktokHandle: '@blingkitchen',
  facebookVipUrl: 'https://www.facebook.com/groups/1485026002799524',
  heroImageUrl:
    'https://bqhzfkgkjyuhlsozpylf.supabase.co/storage/v1/object/public/public-site-media/9a971c05-3631-443e-bcb8-4e9a26e15885/profile/4a5a2fb9-2c72-4536-94d3-771915d80dc6-homepage-hero.jpg',
  aboutImageUrl:
    'https://bqhzfkgkjyuhlsozpylf.supabase.co/storage/v1/object/public/public-site-media/9a971c05-3631-443e-bcb8-4e9a26e15885/profile/40fa6136-b6d1-45b9-b88d-42bfce0f5207-about.jpg',
  joinHeroImageUrl:
    'https://bqhzfkgkjyuhlsozpylf.supabase.co/storage/v1/object/public/public-site-media/9a971c05-3631-443e-bcb8-4e9a26e15885/profile/a1b7725a-285d-464e-8f2f-8f13a9f4e637-join-hero.jpg',
  pantryHeroImageUrl:
    'https://bqhzfkgkjyuhlsozpylf.supabase.co/storage/v1/object/public/public-site-media/9a971c05-3631-443e-bcb8-4e9a26e15885/profile/4fe1181c-b92e-4d0c-ad43-50b62dd7aa71-pantry-hero.jpg',
  announcementText:
    'Sterling Club & 12k Gold Vermeil collections are here - genuine precious metals, elevated designs.',
  promoTickerText:
    'LIVE M/W/F AT 7:00PM EST - SERVING SPARKLE FROM THE HEART OF THE HOME - JOIN HEATHER AT BLINGKITCHEN - PLACE YOUR ORDER & WATCH YOUR REVEAL LIVE',
} as const

export const BLING_KITCHEN_RECIPE_COUNT = recipes.length

export function isBlingKitchenSettings(settings: SiteSettingsDashboardResult) {
  const email = settings.email.trim().toLowerCase()
  const businessName = settings.businessName.trim().toLowerCase()
  const teamName = settings.teamName.trim().toLowerCase()

  return (
    email === BLING_KITCHEN_PROFILE.email ||
    businessName === 'blingkitchen' ||
    businessName === 'bling kitchen' ||
    businessName === 'the bling kitchen' ||
    teamName === 'opal sparkling gems'
  )
}

export function applyBlingKitchenHomepage(
  homepage: AmethystHomepageTemplateData,
): AmethystHomepageTemplateData {
  return {
    ...homepage,
    publicSiteVariant: 'bling_kitchen_hybrid',
    repName: BLING_KITCHEN_PROFILE.publicName,
    businessName: BLING_KITCHEN_PROFILE.businessName,
    teamName: BLING_KITCHEN_PROFILE.teamName,
    tagline: 'Serving Sparkle from the Heart of the Home',
    heroEyebrow: 'With Heather',
    heroHeadline: 'BlingKitchen',
    heroSub:
      'Place your order, return to the live party, and watch Heather reveal your surprise jewelry from the heart of her Ohio kitchen.',
    heroImageUrl: BLING_KITCHEN_PROFILE.heroImageUrl,
    announcementText: BLING_KITCHEN_PROFILE.announcementText,
    announcementLinkLabel: 'Shop Now',
    announcementHref: BLING_KITCHEN_PROFILE.shopUrl,
    promoTickerText: BLING_KITCHEN_PROFILE.promoTickerText,
    shopCtaLabel: 'Shop Bomb Party',
    pantryPageUrl: '/amethyst/Pantry.html',
    aboutHeadline: 'Meet Heather',
    aboutParagraphs: [
      'A Registered Nurse for 25 years with 15 years in surgery, Heather knows that the right tool for the right job makes all the difference. Coming from a long line of Italian cooks and bakers, she believes food is the family love language.',
      'Introduced to Bomb Party by her daughter Mara in 2024, Heather fell in love with the community and the surprise. She built her TikTok following from 183 to over 1,000 in just 3 months by sharing authentic live content.',
      'Married for 35 years, proud Nonna to 3 grandchildren, and devoted dog mom to Enzo, Heather shares her love of food and family while revealing beautiful jewelry and building a legacy.',
    ],
    aboutMediaSlots: [
      {
        typeLabel: 'Meet Heather',
        caption: 'Heather Daugherty - BlingKitchen, Ohio',
        href: '#about',
        mediaUrl: BLING_KITCHEN_PROFILE.aboutImageUrl,
      },
      {
        typeLabel: 'In the Pantry',
        caption: `${BLING_KITCHEN_RECIPE_COUNT} family recipes, kitchen tips, and Heather-style notes.`,
        href: '/amethyst/Pantry.html',
        mediaUrl: BLING_KITCHEN_PROFILE.pantryHeroImageUrl,
      },
    ],
    signupTitle: 'Stay at the Table!',
    signupSub:
      "Get updates on Heather's shows, special moments from the kitchen, and future SMS reminders when they launch.",
    joinTeamTitle: "Join Heather's Team",
    joinTeamSub:
      'Start your Bomb Party business with a warm, no-pressure mentor rooted in care, precision, and community.',
    joinTeamUrl: homepage.showJoinPage ? '/amethyst/Join.html' : '',
    footerTagline:
      'A calm, welcoming space to connect, share recipes, and find your sparkle.',
    showJoinPage: homepage.showJoinPage,
    streamLinks: {
      ...homepage.streamLinks,
      shop: BLING_KITCHEN_PROFILE.shopUrl,
      watch: BLING_KITCHEN_PROFILE.tiktokUrl,
      tiktok: BLING_KITCHEN_PROFILE.tiktokUrl,
      facebook: BLING_KITCHEN_PROFILE.facebookVipUrl,
    },
    socialLinks: homepage.socialLinks,
    footerLinks: {
      ...homepage.footerLinks,
      home: '/amethyst/Homepage.html',
      tradeBoard: '/amethyst/Trade.html',
      joinTeam: homepage.showJoinPage ? '/amethyst/Join.html' : undefined,
      catalog: BLING_KITCHEN_PROFILE.shopUrl,
      preOrders: BLING_KITCHEN_PROFILE.shopUrl,
      pastShows: '#events',
      faq: '#wibp',
      contact: `mailto:${BLING_KITCHEN_PROFILE.email}`,
    },
  }
}

export function applyBlingKitchenTrade(
  trade: AmethystTradeTemplateData,
): AmethystTradeTemplateData {
  return {
    ...trade,
    publicSiteVariant: 'bling_kitchen_hybrid',
    repName: BLING_KITCHEN_PROFILE.publicName,
    businessName: BLING_KITCHEN_PROFILE.businessName,
    tradeHeroTitle: 'BlingKitchen Dance Floor',
    tradeHeroSub:
      "Browse Heather's available trade pieces and request a standard Sparkle Suite item-for-item swap.",
    tickerTopText:
      'Dance Floor open - item-for-item only - same collection and jewelry type - Heather reviews every request',
    shopUrl: BLING_KITCHEN_PROFILE.shopUrl,
    footerTagline:
      'Serving sparkle from the heart of the home, with rep-reviewed trades from BlingKitchen.',
    socialLinks: trade.socialLinks,
    footerLinks: {
      ...trade.footerLinks,
      home: '/amethyst/Homepage.html',
      tradeBoard: '/amethyst/Trade.html',
      joinTeam: '/amethyst/Join.html',
      catalog: BLING_KITCHEN_PROFILE.shopUrl,
      preOrders: BLING_KITCHEN_PROFILE.shopUrl,
      pastShows: '/amethyst/Homepage.html#events',
      faq: '#faq',
      contact: BLING_KITCHEN_PROFILE.facebookVipUrl,
    },
  }
}

export function applyBlingKitchenJoin(
  join: AmethystJoinTemplateData,
): AmethystJoinTemplateData {
  return {
    ...join,
    publicSiteVariant: 'bling_kitchen_hybrid',
    repName: BLING_KITCHEN_PROFILE.publicName,
    repCity: '',
    repState: 'Ohio',
    businessName: BLING_KITCHEN_PROFILE.businessName,
    teamName: BLING_KITCHEN_PROFILE.teamName,
    heroTitle: 'Join the Team',
    promoText:
      '$599 Launch Pack. Guaranteed Diamond reveal. MSRP up to $3,500. 10 years of sparkle.',
    heroPitch:
      "Turn your passion for jewelry into a thriving business. Join Heather's team and build your sparkle story one reveal at a time.",
    heroCtaText: 'Start Your Business Today',
    finalPitch:
      "Join Heather's team today and build a business that brings joy, community, and financial freedom.",
    tickerTopText:
      'Join Heather at BlingKitchen | No-pressure mentorship | Warm community | Work from home | Build at your own pace',
    footerTagline:
      "Start your Bomb Party business with Heather's Opal Sparkling Gems community.",
    shopUrl: BLING_KITCHEN_PROFILE.shopUrl,
    repSocialLinks: {
      ...join.repSocialLinks,
      tiktok: BLING_KITCHEN_PROFILE.tiktokUrl,
      website: BLING_KITCHEN_PROFILE.shopUrl,
    },
    socialLinks: join.socialLinks,
    footerLinks: {
      ...join.footerLinks,
      home: '/amethyst/Homepage.html',
      tradeBoard: '/amethyst/Trade.html',
      joinTeam: '/amethyst/Join.html',
      catalog: BLING_KITCHEN_PROFILE.shopUrl,
      preOrders: BLING_KITCHEN_PROFILE.shopUrl,
      pastShows: '/amethyst/Homepage.html#events',
      faq: '#faq',
      contact: BLING_KITCHEN_PROFILE.facebookVipUrl,
    },
    footerColumn: {
      title: '',
      links: [],
    },
    teamMembers: [],
    faqAnswers: {
      whatIsTeam:
        "Heather's team is a warm, no-pressure family built on encouragement, celebration, and collaboration.",
      cost:
        'Starter pack details and current promotions are handled by Bomb Party. The current offer highlights a $599 Launch Pack with a guaranteed Diamond reveal.',
      experience:
        'No experience required. Heather grew her own TikTok organically and personally guides new reps through their first live party.',
      timeCommitment:
        'Bomb Party is a virtual business you can build from home at your own pace.',
      support:
        'Heather brings 25 years of nursing leadership to mentoring: precision, care, and genuine dedication.',
      income:
        'Income varies by effort, sales, and time. Review the Bomb Party income disclosure before enrolling.',
    },
  }
}
