import { buildLineupCalendar } from './lineup-calendar'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { buildAmethystHomepageBootstrapScript, defaultAmethystHomepageTemplateData } from './homepage-template-data'
import { buildAmethystTradeBootstrapScript, defaultAmethystTradeTemplateData } from './trade-template-data'
import { buildAmethystJoinBootstrapScript, defaultAmethystJoinTemplateData } from './join-template-data'
import type { AmethystTradeBoardListing } from './trade-board-listings'
import type { AmethystHomepageEventCard } from './homepage-upcoming-shows'

export const SKIN_PREVIEW_PAGES = ['homepage', 'trade', 'join', 'unsubscribe'] as const
export type SkinPreviewPage = (typeof SKIN_PREVIEW_PAGES)[number]
export const SKIN_PREVIEW_SKINS = ['amethyst', 'gnome_garden', 'neon_butterfly', 'halloween_pumpkin_witch', 'halloween_pumpkin_cat', 'gilded_autumn', 'rose_gold', 'midnight_rose', 'pearl_rose', 'rose_champagne'] as const
export type SkinPreviewSkin = (typeof SKIN_PREVIEW_SKINS)[number]
const FILES: Record<SkinPreviewPage, string> = {
  homepage: 'Homepage.html', trade: 'Trade.html', join: 'Join.html', unsubscribe: 'Unsubscribe.html',
}
const LABELS: Record<SkinPreviewPage, string> = {
  homepage: 'Home', trade: 'Dance Floor', join: 'Join', unsubscribe: 'Preferences',
}
const previewPath = (skin: SkinPreviewSkin, page: SkinPreviewPage) => `/skin-preview/${skin}/${page}`

// Explicit sample data only. The opaque preview never contacts the live lineup endpoint.
export const GNOME_PREVIEW_LINEUP = {
  liveQueuePresentation: 'grouped-v1' as const,
  liveQueueScope: null,
  liveQueueEventCursor: 0,
  liveQueueEvents: [],
  liveQueueRevision: 0,
  liveQueueSourceReady: true,
  liveQueueServerTime: '2026-09-09T00:00:00.000Z',
  liveQueueLastUpdated: '2026-09-09T00:00:00.000Z',
  liveQueueAgeSeconds: 0,
  liveQueueStaleAfterSeconds: 45,
  liveQueueState: 'live' as const,
  liveQueueSummary: 'Sample lineup for appearance preview. No live show is connected.',
  liveQueueEntries: ['Sample Harper', 'Sample Rowan', 'Sample Sage'].map((name, index) => ({
    name, position: index + 1, token: `sample-${index + 1}`, remainingOrders: 1, highlight: false, label: 'Sample only',
  })),
}

// Fixture-only data: this module never resolves a rep or reads customer records.
export const GNOME_PREVIEW_LISTINGS: AmethystTradeBoardListing[] = [
  { id: 'sample-ring', name: 'Woodland Wishes', collection: 'OG', type: 'Ring', material: 'Rose gold plating', stone: 'Green crystal', size: '8', note: 'Sample dancer. Same collection and jewelry type for requests.', glyph: 'W', tier: 'everyday', photoUrl: null, photoSource: 'missing', quantityAvailable: 2 },
  { id: 'sample-earrings', name: 'Lantern Light', collection: 'OG', type: 'Earrings', material: 'Gold plating', stone: 'Champagne crystal', size: null, note: 'Sample dancer for appearance review.', glyph: 'L', tier: 'everyday', photoUrl: null, photoSource: 'missing', quantityAvailable: 1 },
  { id: 'sample-necklace', name: 'Moonlit Garden', collection: 'Birthday', type: 'Necklace', material: 'Silver plating', stone: 'Opal shimmer', size: null, note: 'Sample dancer for appearance review.', glyph: 'M', tier: 'everyday', photoUrl: null, photoSource: 'missing', quantityAvailable: 1 },
]

export const GNOME_PREVIEW_EVENTS: AmethystHomepageEventCard[] = [
  { id: 'sample-garden-evening', title: 'A Little Woodland Sparkle', description: 'Pull up a chair for a cozy evening of live reveals.\nBring your favorite mug and see what the garden has in store.', eventTime: '2099-09-12T23:00:00.000Z', timeZone: 'America/New_York', durationMinutes: 90, featured: true, codes: [{ code: 'SAMPLE10', desc: 'Sample offer for this preview' }], collections: [{ label: 'OG Collection', href: previewPath('gnome_garden', 'trade') }], platforms: [{ kind: 'tt', label: 'Watch on TikTok', href: '#preview-action' }] },
  { id: 'sample-morning-show', title: 'Coffee, Gnomes & a Little Surprise', description: 'A relaxed weekend gathering with new favorites, familiar faces, and plenty of sparkle.', eventTime: '2099-09-14T15:00:00.000Z', timeZone: 'America/New_York', durationMinutes: 60, featured: false, codes: [], collections: [], platforms: [{ kind: 'tt', label: 'Watch on TikTok', href: '#preview-action' }] },
]

const NEON_PREVIEW_EVENTS: AmethystHomepageEventCard[] = [
  { id: 'sample-neon-night', title: 'Neon Butterfly Night', description: 'Join us for a glowing evening of live jewelry reveals.\nCome for the color, stay for the sparkle.', eventTime: '2099-09-12T23:00:00.000Z', timeZone: 'America/New_York', durationMinutes: 90, featured: true, codes: [{ code: 'SAMPLE10', desc: 'Sample offer for this preview' }], collections: [{ label: 'OG Collection', href: previewPath('neon_butterfly', 'trade') }], platforms: [{ kind: 'tt', label: 'Watch on TikTok', href: '#preview-action' }] },
  { id: 'sample-afterglow', title: 'The Afterglow Reveal', description: 'A relaxed weekend show with bright surprises, familiar faces, and plenty of sparkle.', eventTime: '2099-09-14T15:00:00.000Z', timeZone: 'America/New_York', durationMinutes: 60, featured: false, codes: [], collections: [], platforms: [{ kind: 'tt', label: 'Watch on TikTok', href: '#preview-action' }] },
]

const HALLOWEEN_PREVIEW_EVENTS: AmethystHomepageEventCard[] = [
  { id: 'sample-pumpkin-night', title: 'Pumpkin Moon Reveal Night', description: 'Join us beneath the glittering crescent for a playful Halloween reveal.\\nCostumes are welcome; spooky pressure is not.', eventTime: '2099-10-30T23:00:00.000Z', timeZone: 'America/New_York', durationMinutes: 90, featured: true, codes: [{ code: 'BOO10', desc: 'Sample offer for this preview' }], collections: [{ label: 'Dance Floor', href: previewPath('halloween_pumpkin_witch', 'trade') }], platforms: [{ kind: 'tt', label: 'Watch on TikTok', href: '#preview-action' }] },
  { id: 'sample-witching-hour', title: 'The Sparkling Witching Hour', description: 'A cozy Halloween gathering with glowing pumpkins, bright surprises, and plenty of friendly sparkle.', eventTime: '2099-10-31T22:00:00.000Z', timeZone: 'America/New_York', durationMinutes: 60, featured: false, codes: [], collections: [], platforms: [{ kind: 'tt', label: 'Watch on TikTok', href: '#preview-action' }] },
]

type PreviewProfile = {
  label: string
  businessName: string
  repName: string
  teamName: string
  ticker: string
  tagline: string
  eyebrow: string
  headline: string
  heroSub: string
  aboutHeadline: string
  aboutParagraphs: [string, string, string]
  signupSub: string
  events: AmethystHomepageEventCard[]
}

const PREVIEW_PROFILES = {
  rose_gold: {
    label: 'Rose Gold', businessName: 'Sparkle by Sasha', repName: 'Sasha', teamName: 'The Sparkle Circle',
    ticker: 'Live jewelry reveals | A little sparkle, a lovely surprise | Explore the Dance Floor',
    tagline: 'Good company. Beautiful surprises.',
    eyebrow: '', headline: 'Real jewelry. Live reveals. Pure sparkle.',
    heroSub: 'Join Sasha for live jewelry reveals, friendly conversation, and your next favorite find.',
    aboutHeadline: 'Come for a reveal. Stay for the company.',
    aboutParagraphs: ['Hi, I’m Sasha. I love sharing the surprise of a jewelry reveal with you.', 'Whether you are discovering your first piece or chasing your next favorite, you are welcome here.', 'Check the sample show calendar and come join the fun.'],
    signupSub: 'Get a friendly heads-up before the next live reveal.',
    events: [
      { id: 'sample-rose-evening', title: 'Rose Gold Reveal Night', description: 'A little sparkle, good company, and beautiful jewelry surprises. Join Sasha for an evening of live reveals.', eventTime: '2099-10-12T23:00:00.000Z', timeZone: 'America/New_York', durationMinutes: 90, featured: true, codes: [{ code: 'SAMPLE10', desc: 'Sample offer for this appearance preview' }], collections: [{ label: 'OG Collection', href: previewPath('rose_gold', 'trade') }], platforms: [{ kind: 'tt', label: 'Watch on TikTok', href: '#preview-action' }] },
      { id: 'sample-rose-weekend', title: 'Saturday Sparkle & Sip', description: 'Bring your favorite drink and settle in for a relaxed weekend reveal.', eventTime: '2099-10-14T17:00:00.000Z', timeZone: 'America/New_York', durationMinutes: 60, featured: false, codes: [], collections: [{ label: 'Birthday Collection', href: previewPath('rose_gold', 'trade') }], platforms: [{ kind: 'fb', label: 'Watch on Facebook', href: '#preview-action' }] },
    ],
  },
  rose_champagne: {
    label: 'Rose Champagne', businessName: 'Sparkle by Sasha', repName: 'Sasha', teamName: 'The Sparkle Circle',
    ticker: 'Live jewelry reveals | A little sparkle, a lovely surprise | Explore the Dance Floor',
    tagline: 'Good company. Beautiful surprises.',
    eyebrow: '', headline: 'Real jewelry. Live reveals. Pure sparkle.',
    heroSub: 'Join Sasha for live jewelry reveals, friendly conversation, and your next favorite find.',
    aboutHeadline: 'Come for a reveal. Stay for the company.',
    aboutParagraphs: ['Hi, I’m Sasha. I love sharing the surprise of a jewelry reveal with you.', 'Whether you are discovering your first piece or chasing your next favorite, you are welcome here.', 'Check the sample show calendar and come join the fun.'],
    signupSub: 'Get a friendly heads-up before the next live reveal.',
    events: [
      { id: 'sample-rose-evening', title: 'Rose Gold Reveal Night', description: 'A little sparkle, good company, and beautiful jewelry surprises. Join Sasha for an evening of live reveals.', eventTime: '2099-10-12T23:00:00.000Z', timeZone: 'America/New_York', durationMinutes: 90, featured: true, codes: [{ code: 'SAMPLE10', desc: 'Sample offer for this appearance preview' }], collections: [{ label: 'OG Collection', href: previewPath('rose_champagne', 'trade') }], platforms: [{ kind: 'tt', label: 'Watch on TikTok', href: '#preview-action' }] },
      { id: 'sample-rose-weekend', title: 'Saturday Sparkle & Sip', description: 'Bring your favorite drink and settle in for a relaxed weekend reveal.', eventTime: '2099-10-14T17:00:00.000Z', timeZone: 'America/New_York', durationMinutes: 60, featured: false, codes: [], collections: [{ label: 'Birthday Collection', href: previewPath('rose_champagne', 'trade') }], platforms: [{ kind: 'fb', label: 'Watch on Facebook', href: '#preview-action' }] },
    ],
  },
  midnight_rose: {
    label: 'Midnight Rose', businessName: 'Sparkle by Sasha', repName: 'Sasha', teamName: 'The Sparkle Circle',
    ticker: 'Live jewelry reveals | A little sparkle, a lovely surprise | Explore the Dance Floor',
    tagline: 'Good company. Beautiful surprises.',
    eyebrow: '', headline: 'Real jewelry. Live reveals. Pure sparkle.',
    heroSub: 'Join Sasha for live jewelry reveals, friendly conversation, and your next favorite find.',
    aboutHeadline: 'Come for a reveal. Stay for the company.',
    aboutParagraphs: ['Hi, I’m Sasha. I love sharing the surprise of a jewelry reveal with you.', 'Whether you are discovering your first piece or chasing your next favorite, you are welcome here.', 'Check the sample show calendar and come join the fun.'],
    signupSub: 'Get a friendly heads-up before the next live reveal.',
    events: [
      { id: 'sample-rose-evening', title: 'Rose Gold Reveal Night', description: 'A little sparkle, good company, and beautiful jewelry surprises. Join Sasha for an evening of live reveals.', eventTime: '2099-10-12T23:00:00.000Z', timeZone: 'America/New_York', durationMinutes: 90, featured: true, codes: [{ code: 'SAMPLE10', desc: 'Sample offer for this appearance preview' }], collections: [{ label: 'OG Collection', href: previewPath('midnight_rose', 'trade') }], platforms: [{ kind: 'tt', label: 'Watch on TikTok', href: '#preview-action' }] },
      { id: 'sample-rose-weekend', title: 'Saturday Sparkle & Sip', description: 'Bring your favorite drink and settle in for a relaxed weekend reveal.', eventTime: '2099-10-14T17:00:00.000Z', timeZone: 'America/New_York', durationMinutes: 60, featured: false, codes: [], collections: [{ label: 'Birthday Collection', href: previewPath('midnight_rose', 'trade') }], platforms: [{ kind: 'fb', label: 'Watch on Facebook', href: '#preview-action' }] },
    ],
  },
  pearl_rose: {
    label: 'Pearl Rose', businessName: 'Sparkle by Sasha', repName: 'Sasha', teamName: 'The Sparkle Circle',
    ticker: 'Live jewelry reveals | A little sparkle, a lovely surprise | Explore the Dance Floor',
    tagline: 'Good company. Beautiful surprises.',
    eyebrow: '', headline: 'Real jewelry. Live reveals. Pure sparkle.',
    heroSub: 'Join Sasha for live jewelry reveals, friendly conversation, and your next favorite find.',
    aboutHeadline: 'Come for a reveal. Stay for the company.',
    aboutParagraphs: ['Hi, I’m Sasha. I love sharing the surprise of a jewelry reveal with you.', 'Whether you are discovering your first piece or chasing your next favorite, you are welcome here.', 'Check the sample show calendar and come join the fun.'],
    signupSub: 'Get a friendly heads-up before the next live reveal.',
    events: [
      { id: 'sample-rose-evening', title: 'Rose Gold Reveal Night', description: 'A little sparkle, good company, and beautiful jewelry surprises. Join Sasha for an evening of live reveals.', eventTime: '2099-10-12T23:00:00.000Z', timeZone: 'America/New_York', durationMinutes: 90, featured: true, codes: [{ code: 'SAMPLE10', desc: 'Sample offer for this appearance preview' }], collections: [{ label: 'OG Collection', href: previewPath('pearl_rose', 'trade') }], platforms: [{ kind: 'tt', label: 'Watch on TikTok', href: '#preview-action' }] },
      { id: 'sample-rose-weekend', title: 'Saturday Sparkle & Sip', description: 'Bring your favorite drink and settle in for a relaxed weekend reveal.', eventTime: '2099-10-14T17:00:00.000Z', timeZone: 'America/New_York', durationMinutes: 60, featured: false, codes: [], collections: [{ label: 'Birthday Collection', href: previewPath('pearl_rose', 'trade') }], platforms: [{ kind: 'fb', label: 'Watch on Facebook', href: '#preview-action' }] },
    ],
  },
  amethyst: {
    label: 'Chasing Unicorns (Amethyst)', businessName: 'Sparkle by Sasha', repName: 'Sasha', teamName: 'The Sparkle Circle',
    ticker: 'Live jewelry reveals | A little magic in every surprise | Explore the Dance Floor',
    tagline: 'A little magic. A beautiful surprise.',
    eyebrow: '', headline: 'Real jewelry. Live reveals. Pure sparkle.',
    heroSub: 'Join Sasha for live jewelry reveals, friendly conversation, and your next favorite find.',
    aboutHeadline: 'Come for a reveal. Stay for the company.',
    aboutParagraphs: ['Hi, I’m Sasha. I love sharing the surprise of a jewelry reveal with you.', 'Whether you are chasing a rare unicorn or discovering an everyday favorite, you are welcome here.', 'The calendar below shows sample upcoming shows for this appearance preview.'],
    signupSub: 'Get a friendly heads-up before the next reveal.',
    events: NEON_PREVIEW_EVENTS.map((event, index) => ({...event, title: index === 0 ? 'Chasing Unicorns Reveal Night' : 'A Little Evening Magic', collections: event.collections.map(collection => ({...collection, href: previewPath('amethyst', 'trade')}))})),
  },
  gilded_autumn: {
    label: 'The Golden Leaves of Autumn', businessName: 'Sparkle by Sasha', repName: 'Sasha', teamName: 'The Sparkle Circle',
    ticker: 'Live jewelry reveals | Find your next favorite | Explore the Dance Floor',
    tagline: 'Good company. Beautiful surprises.',
    eyebrow: '', headline: 'Real jewelry. Live reveals. Pure sparkle.',
    heroSub: 'Join Sasha for live jewelry reveals, friendly conversation, and your next favorite find.',
    aboutHeadline: 'Come for a reveal. Stay for the company.',
    aboutParagraphs: ['Hi, I’m Sasha. I love sharing the surprise of a jewelry reveal with you.', 'Whether you are shopping for a gift or finding something for yourself, you are welcome here.', 'Browse the sample show calendar below to see how upcoming events appear on this skin.'],
    signupSub: 'Get a friendly heads-up before the next live reveal.',
    events: [{ id: 'sample-autumn-evening', title: 'An Autumn Evening of Reveals', description: 'Settle in for jewelry reveals and good company.', eventTime: '2099-10-12T23:00:00.000Z', timeZone: 'America/New_York', durationMinutes: 90, featured: true, codes: [{code:'SAMPLE10',desc:'Sample offer for this preview'}], collections: [{label:'Dance Floor',href:previewPath('gilded_autumn','trade')}], platforms:[{kind:'tt',label:'Watch on TikTok',href:'#preview-action'},{kind:'fb',label:'Watch on Facebook',href:'#preview-action'}] }],
  },
  gnome_garden: {
    label: 'Gnome Forest', businessName: 'The Gnome Forest', repName: 'Sasha', teamName: 'The Garden Circle',
    ticker: 'Welcome to the garden | Live reveals & lovely surprises | Explore the Dance Floor',
    tagline: 'A little wonder. A little sparkle. A place to feel at home.',
    eyebrow: 'Come for the sparkle. Stay for the company.', headline: 'A little wonder. A lot of sparkle.',
    heroSub: 'Settle in for live jewelry reveals, friendly faces, and the joy of discovering something you love.',
    aboutHeadline: 'There is always room for you here.',
    aboutParagraphs: [
      'The best part of a reveal is sharing the surprise. This little corner of the garden is a place to unwind, chat, and discover a new favorite together.',
      'Whether you love a quiet shimmer or a statement piece, you are welcome just as you are. Bring your curiosity and make yourself at home.',
      'Our sample calendar shows how upcoming live gatherings, collection notes, and helpful details fit together on your site.',
    ],
    signupSub: 'A friendly heads-up for the next gathering in the garden.',
    events: GNOME_PREVIEW_EVENTS,
  },
  neon_butterfly: {
    label: 'Neon Butterfly', businessName: "Kelly's Sparkle Lounge", repName: 'Kelly', teamName: 'The Butterfly Circle',
    ticker: 'Welcome to the glow | Live reveals & neon surprises | Explore the Dance Floor',
    tagline: 'Bright color. Warm company. A little magic in every reveal.',
    eyebrow: 'Step into the glow.', headline: 'Let your sparkle take flight.',
    heroSub: 'Live jewelry reveals, electric color, and a welcoming place to find your next favorite.',
    aboutHeadline: 'A bright place to land.',
    aboutParagraphs: [
      'The best part of a reveal is sharing the surprise. This neon lounge is a place to unwind, connect, and discover a new favorite together.',
      'Whether your style is a quiet shimmer or full electric color, you are welcome here. Bring your curiosity and let your sparkle take flight.',
      'The sample calendar shows how upcoming live gatherings, collection notes, and helpful details flow through every page.',
    ],
    signupSub: 'A friendly heads-up before the next night in the glow.',
    events: NEON_PREVIEW_EVENTS,
  },
  halloween_pumpkin_cat: {
    label: 'Halloween Pumpkin and Cat', businessName: 'Sparkle by Sasha', repName: 'Sasha', teamName: 'The Sparkle Circle',
    ticker: 'Come for the sparkle. Stay for the surprises.', tagline: 'A little mystery. A lot of sparkle.',
    eyebrow: '', headline: 'Real jewelry. Live reveals. Pure sparkle.', heroSub: 'A little mystery. A lot of sparkle. Join Sasha for live jewelry reveals and find your next favorite.',
    aboutHeadline: 'A little mystery. A warm welcome.',
    aboutParagraphs: ['Join Sasha for live jewelry reveals, friendly conversation, and the fun of finding your next favorite.', 'Come as you are and enjoy the surprise together.', 'The calendar below shows sample upcoming shows for this skin preview.'],
    signupSub: 'Get a friendly heads-up before the next reveal.',
    events: HALLOWEEN_PREVIEW_EVENTS.map(event => ({...event, collections: event.collections.map(collection => ({...collection, href: previewPath('halloween_pumpkin_cat', 'trade')}))})),
  },
  halloween_pumpkin_witch: {
    label: 'Halloween Pumpkin and Witch', businessName: 'Moonlit Pumpkin Sparkle', repName: 'Sasha', teamName: 'The Moonlight Circle',
    ticker: 'A sparkling Halloween is here | Glowing pumpkins & moonlit surprises | Explore the Dance Floor',
    tagline: 'Bright pumpkins. Moonlit magic. A little mischief in every reveal.',
    eyebrow: 'Meet us beneath the pumpkin moon.', headline: 'A frightfully fun night to sparkle.',
    heroSub: 'Glowing jack-o-lanterns, silver moonlight, and a welcoming place to share the Halloween fun.',
    aboutHeadline: 'There is room around the lantern for everyone.',
    aboutParagraphs: [
      'The best part of a reveal is sharing the surprise. This moonlit corner is a place to unwind, laugh, and discover a new favorite together.',
      'Whether your Halloween style is sweet, spooky, or covered in glitter, you are welcome here. Bring your curiosity and enjoy the glow.',
      'The sample calendar shows how upcoming live gatherings, collection notes, and helpful details flow through every customer page.',
    ],
    signupSub: 'A friendly little warning before the next sparkling witching hour.',
    events: HALLOWEEN_PREVIEW_EVENTS,
  },
} satisfies Record<SkinPreviewSkin, PreviewProfile>

export type LineupReviewState = 'empty' | 'queued' | 'delayed' | 'no-calendar'
export function resolveLineupReviewState(url: string, env: Record<string, string | undefined> = process.env): LineupReviewState | null {
  if (env.SPARKLE_ENVIRONMENT !== 'smoke' || env.NEXT_PUBLIC_SPARKLE_ENVIRONMENT !== 'smoke') return null
  const state = new URL(url).searchParams.get('lineupReview')
  return ['empty', 'queued', 'delayed', 'no-calendar'].includes(state || '') ? state as LineupReviewState : null
}

function reviewLineup(state: LineupReviewState | null) {
  if (!state || state === 'queued') return GNOME_PREVIEW_LINEUP
  if (state === 'delayed') return { ...GNOME_PREVIEW_LINEUP, liveQueueState: 'delayed' as const, liveQueueAgeSeconds: 90, liveQueueSourceReady: false, liveQueueEvents: [], liveQueueSummary: 'Showing the last received sample lineup while checking for updates.' }
  return { ...GNOME_PREVIEW_LINEUP, liveQueueState: 'empty' as const, liveQueueEntries: [], liveQueueOrderCount: 0, liveQueueGroupCount: 0, liveQueueCurrent: null, liveQueueOnDeck: null, liveQueueEvents: [], liveQueueSummary: 'No sample orders waiting.' }
}

function fixtureBootstrap(page: SkinPreviewPage, skin: SkinPreviewSkin = 'gnome_garden', review: LineupReviewState | null = null) {
  const profile = PREVIEW_PROFILES[skin]
  const footerLinks = {
    ...defaultAmethystHomepageTemplateData.footerLinks,
    home: previewPath(skin, 'homepage'), tradeBoard: previewPath(skin, 'trade'), joinTeam: previewPath(skin, 'join'),
    unsubscribe: previewPath(skin, 'unsubscribe'), catalog: '#preview-action', preOrders: '#preview-action',
  }
  const common = {
    ...reviewLineup(review),
    ...buildLineupCalendar({ ...defaultAmethystHomepageTemplateData, footerLinks }, review === 'no-calendar' ? [] : profile.events),
    businessName: profile.businessName, repName: profile.repName, footerLinks,
    tickerTopText: profile.ticker,
    footerTagline: profile.tagline,
    tradeBoardTickerItems: GNOME_PREVIEW_LISTINGS.map(({ name, type, collection }) => ({ name, type, collection })),
  }
  if (page === 'homepage' && common.liveQueueCalendarHref) common.liveQueueCalendarHref = '#events'
  const context = { targeted: true } as const
  if (page === 'trade') {
    return buildAmethystTradeBootstrapScript({ ...defaultAmethystTradeTemplateData, ...common, shopUrl: '#preview-action' }, GNOME_PREVIEW_LISTINGS, skin, context)
  }
  if (page === 'join') {
    return buildAmethystJoinBootstrapScript({
      ...defaultAmethystJoinTemplateData, ...common, teamName: profile.teamName, heroTitle: skin === 'amethyst' || skin === 'gilded_autumn' || (skin === 'rose_gold' || skin === 'midnight_rose' || skin === 'pearl_rose' || skin === 'rose_champagne') ? 'Find your place with Sasha.' : skin === 'neon_butterfly' ? 'Find your place in the glow.' : (skin === 'halloween_pumpkin_witch' || skin === 'halloween_pumpkin_cat') ? 'Find your place beneath the pumpkin moon.' : 'Find your place in the garden.',
      shopUrl: '#preview-action', bpReferralUrl: '', hasRecruitingLink: false,
      teamMembers: [
        ...(skin === 'neon_butterfly'
          ? [
              { name: 'Maya', business: 'Electric Gem Co.', state: 'Florida', initials: 'M', socialLinks: {} },
              { name: 'Tori', business: 'Afterglow Reveals', state: 'Georgia', initials: 'T', socialLinks: {} },
              { name: 'Jules', business: 'Bright Wing Sparkle', state: 'Virginia', initials: 'J', socialLinks: {} },
            ]
          : [
              { name: 'Sasha', business: (skin === 'rose_gold' || skin === 'midnight_rose' || skin === 'pearl_rose' || skin === 'rose_champagne') ? profile.businessName : 'The Gnome Forest', state: 'Virginia', initials: 'S', socialLinks: {} },
              { name: 'Alex', business: 'Moonlit Sparkle', state: 'North Carolina', initials: 'A', socialLinks: {} },
              { name: 'Jamie', business: 'Little Lantern Reveals', state: 'Georgia', initials: 'J', socialLinks: {} },
            ]),
      ],
      faqAnswers: {
        ...defaultAmethystJoinTemplateData.faqAnswers,
        whatIsTeam: `${profile.businessName} is a team of independent Bomb Party reps led by ${profile.repName}. Ask the team lead how the group communicates and what support is currently available.`,
      },
    }, skin, context, GNOME_PREVIEW_LISTINGS)
  }
  return buildAmethystHomepageBootstrapScript({
    ...defaultAmethystHomepageTemplateData, ...common,
    teamName: profile.teamName, tagline: profile.tagline,
    heroEyebrow: profile.eyebrow,
    heroHeadline: profile.headline,
    heroSub: profile.heroSub,
    tickerTopText: profile.ticker,
    aboutHeadline: profile.aboutHeadline,
    aboutParagraphs: profile.aboutParagraphs,
    signupSub: profile.signupSub,
    streamLinks: { shop: '#preview-action', watch: '#preview-action', tiktok: '#preview-action', facebook: '#preview-action', whatnot: '#preview-action' },
    joinTeamUrl: previewPath(skin, 'join'),
  }, profile.events, skin, context)
}

function escapeAttribute(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function inlineScript(value: string) { return value.replace(/<\/script/gi, '<\\/script') }

export const SKIN_PREVIEW_GUARDS = `
(function () {
  var pages = { 'Homepage.html': 'homepage', 'Trade.html': 'trade', 'Join.html': 'join', 'Unsubscribe.html': 'unsubscribe' };
  var pendingFragment = null;
  function scrollToFragment(fragment) {
    var target = document.getElementById(fragment.slice(1));
    if (!target) { pendingFragment = fragment; return; }
    pendingFragment = null;
    target.scrollIntoView({ behavior: 'auto', block: 'start' });
  }
  window.addEventListener('message', function (event) {
    if (event.source === window.parent && event.data?.type === 'sparkle-skin-preview-scroll' && event.data.fragment === '#events') scrollToFragment('#events');
  });
  function notice() {
    var node = document.getElementById('skin-preview-notice');
    if (!node) {
      node = document.createElement('div'); node.id = 'skin-preview-notice'; node.setAttribute('role', 'status');
      node.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:2147483647;width:min(90%,420px);box-sizing:border-box;padding:14px 18px;border-radius:12px;background:#173126;color:#fff3d6;font:14px/1.5 sans-serif;box-shadow:0 6px 28px #0005;text-align:center';
      document.body.appendChild(node);
    }
    node.textContent = 'This is a sample preview. Nothing is submitted or sent.';
    clearTimeout(window.__previewNoticeTimer); window.__previewNoticeTimer = setTimeout(function () { node.remove(); }, 4500);
  }
  window.fetch = async function (input, options) {
    var method = String(options && options.method || input && input.method || 'GET').toUpperCase();
    var url = String(input && input.url || input);
    if (method === 'GET' && /^\\/api\\/amethyst\\/trade-board(?:[?]|$)/.test(url)) {
      return new Response(JSON.stringify({ listings: window.AMETHYST_TRADE_BOARD_LISTINGS || [] }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (method === 'GET' && /^\\/api\\/amethyst\\/live-lineup(?:[?]|$)/.test(url)) {
      var sample = ${JSON.stringify(GNOME_PREVIEW_LINEUP)};
      sample.liveQueueServerTime = sample.liveQueueLastUpdated = new Date().toISOString();
      return new Response(JSON.stringify(sample), { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
    }
    notice(); throw new Error('Sample preview: requests are disabled. Nothing was sent.');
  };
  document.addEventListener('submit', function (event) { event.preventDefault(); event.stopImmediatePropagation(); notice(); }, true);
  document.addEventListener('click', function (event) {
    // A sandbox can suppress the submit event itself. Catch the action button first.
    var action = event.target.closest && event.target.closest('.tp-sheet-submit, .hp-signup-submit, input[type="file"]');
    if (action) { event.preventDefault(); event.stopImmediatePropagation(); notice(); return; }
    var link = event.target.closest && event.target.closest('a'); if (!link) return;
    var href = link.getAttribute('href') || '';
    if (href.charAt(0) === '#' && href !== '#' && href !== '#preview-action') {
      event.preventDefault(); event.stopImmediatePropagation(); scrollToFragment(href); return;
    }
    event.preventDefault(); event.stopImmediatePropagation();
    var path = href.split('?')[0].split('#')[0];
    var page = pages[path.split('/').pop()] || (/^\\/skin-preview\\/(?:amethyst|gnome_garden|neon_butterfly|halloween_pumpkin_witch|halloween_pumpkin_cat|gilded_autumn|rose_gold|midnight_rose|pearl_rose|rose_champagne)\\/(homepage|trade|join|unsubscribe)$/.exec(path) || [])[1];
    if (page) window.parent.postMessage({ type: 'sparkle-skin-preview-page', page: page, ...(href.endsWith('#events') ? { fragment: '#events' } : {}) }, '*'); else notice();
  }, true);
  function disableUploads() {
    document.querySelectorAll('input[type="file"]').forEach(function (input) {
      if (!input.disabled) input.disabled = true;
      input.setAttribute('aria-label', 'Uploads are unavailable in this sample preview');
      input.title = 'Sample preview — uploads are disabled';
    });
  }
  function inlineMediaIcons() {
    // An opaque sandbox cannot use the external same-origin SVG sprite. Clone
    // repository-owned glyph paths into each existing SVG, preserving its box.
    if (!document.getElementById('rgc-preview-media-symbols')) return;
    document.querySelectorAll('svg use').forEach(function (use) {
      var name = use.getAttribute('data-preview-icon');
      if (!name) return;
      var symbol = document.getElementById('rgc-preview-icon-' + name);
      if (!symbol) return;
      var glyph = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin'].forEach(function (name) {
        if (symbol.hasAttribute(name)) glyph.setAttribute(name, symbol.getAttribute(name));
      });
      Array.from(symbol.childNodes).forEach(function (node) { glyph.appendChild(node.cloneNode(true)); });
      use.replaceWith(glyph);
    });
  }
  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(function () { disableUploads(); inlineMediaIcons(); if (pendingFragment) scrollToFragment(pendingFragment); }).observe(document.getElementById('root'), { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
    disableUploads(); inlineMediaIcons();
  }
})();`

/** Video skins may load only their own self-hosted media in the sample sandbox. */
export function skinPreviewMediaSource(skin: SkinPreviewSkin, origin: string) {
  if (skin === 'pearl_rose') return origin + '/amethyst/skins/pearl-rose/'
  if (skin === 'midnight_rose') return origin + '/amethyst/skins/midnight-rose/'
  if (skin === 'rose_champagne') return origin + '/amethyst/skins/rose-champagne/'
  if (skin === 'amethyst') return origin + '/amethyst/skins/am01-unicorn/'
  if (skin === 'gilded_autumn') return origin + '/amethyst/skins/gilded-autumn/'
  if (skin === 'halloween_pumpkin_cat') return origin + '/amethyst/skins/halloween-pumpkin-cat/'
  return "'none'"
}

/** Renders the unchanged customer components with fixture data inside an opaque sandbox. */
export async function buildSkinPreviewDocument(skin: SkinPreviewSkin, page: SkinPreviewPage, origin: string, review: LineupReviewState | null = null) {
  const root = join(process.cwd(), 'public', 'amethyst')
  let document = await readFile(join(root, FILES[page]), 'utf8')
  document = document.replace(/<script\b[^>]*(?:data-template-src|src)="\/api\/amethyst\/[^\"]+"[^>]*><\/script>/g, '')
  // Inline only allowlisted repository runtime files. Inline Babel input does not need network XHR.
  const runtimeNames = ['tweaks-panel.jsx', 'homepage.jsx', 'trade.jsx', 'unsubscribe.jsx', 'join-runtime.js', 'live-lineup.js', 'neon-butterfly.js', 'halloween-pumpkin-witch.js', 'halloween-pumpkin-cat.js', 'gilded-autumn.js', 'am01-unicorn.js', 'rose-champagne.js', 'midnight-rose.js', 'pearl-rose.js', 'sparkle-suite-footer-credit.js']
  for (const name of runtimeNames) {
    const escaped = name.replace('.', '\\.')
    const pattern = new RegExp(`<script([^>]*?) src="(?:/amethyst/)?${escaped}(?:\\?[^\"]*)?"([^>]*)><\\/script>`, 'g')
    if (!pattern.test(document)) continue
    pattern.lastIndex = 0
    let source = await readFile(join(root, name), 'utf8')
    if ((skin === 'rose_gold' || skin === 'midnight_rose' || skin === 'pearl_rose' || skin === 'rose_champagne') && page === 'homepage' && name === 'homepage.jsx') {
      // Avoid even an initial blocked external-sprite request before the
      // preview observer fills this placeholder with the real glyph paths.
      source = source.replace('<use href={`/amethyst/media-icons.svg#${name}`} />', '<use data-preview-icon={name} />')
    }
    source = inlineScript(source)
    document = document.replace(pattern, (_match, before, after) => `<script${before}${after}>${source}</script>`)
  }
  const csp = `default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' https://unpkg.com; style-src 'unsafe-inline' ${origin} https://fonts.googleapis.com https://api.fontshare.com; font-src ${origin} https://fonts.gstatic.com https://cdn.fontshare.com https://api.fontshare.com data:; img-src ${origin} https: data: blob:; media-src ${skinPreviewMediaSource(skin, origin)}; connect-src 'none'; form-action 'none'; frame-src 'none'; base-uri ${origin}; object-src 'none'`
  document = document.replace('<head>', `<head><meta http-equiv="Content-Security-Policy" content="${escapeAttribute(csp)}"><base href="${escapeAttribute(origin)}/amethyst/"><meta name="robots" content="noindex,nofollow">`)
  document = document.replace(/<meta name="robots" content="index,follow" \/>/g, '')
  const profile = PREVIEW_PROFILES[skin]
  if (page === 'unsubscribe') {
    // The static template retains its generic defaults; only sample documents
    // receive the selected profile's customer-facing name and preferences copy.
    document = document.replace(/<title>[^<]*<\/title>/, '<title>Manage updates - ' + escapeAttribute(profile.businessName) + '</title>')
    document = document.replace(
      'Stop SMS updates, email updates, or both for the Amethyst preview site.',
      'Stop SMS updates, email updates, or both from {BUSINESS_NAME}.',
    )
  }
  const bootstrap = fixtureBootstrap(page, skin, review).replaceAll('Sparkle by Sasha', profile.businessName)
  const reviewGuards = SKIN_PREVIEW_GUARDS.replace('var sample = '+JSON.stringify(GNOME_PREVIEW_LINEUP)+';', 'var sample = '+JSON.stringify(reviewLineup(review))+';')
  let mediaSymbols = ''
  if ((skin === 'rose_gold' || skin === 'midnight_rose' || skin === 'pearl_rose' || skin === 'rose_champagne') && page === 'homepage') {
    mediaSymbols = (await readFile(join(root, 'media-icons.svg'), 'utf8'))
      .replace('<svg xmlns="http://www.w3.org/2000/svg">', '<svg id="rgc-preview-media-symbols" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="0" height="0" style="position:absolute;overflow:hidden;pointer-events:none">')
      .replace(/\bid="([a-z][a-z0-9-]*)"/g, (_match, id: string) => id === 'rgc-preview-media-symbols' ? _match : `id="rgc-preview-icon-${id}"`)
  }
  document = document.replace('<div id="root"></div>', `<div id="root"></div>${mediaSymbols}<script>${inlineScript(reviewGuards)}\n${inlineScript(bootstrap)}</script>`)
  return document.replaceAll('Sparkle by Sasha', profile.businessName)
}

export async function buildGnomeSkinPreviewDocument(page: SkinPreviewPage, origin: string) {
  return buildSkinPreviewDocument('gnome_garden', page, origin)
}

export async function renderSkinPreview(skin: SkinPreviewSkin, page: SkinPreviewPage, origin: string, review: LineupReviewState | null = null) {
  const profile = PREVIEW_PROFILES[skin]
  const document = await buildSkinPreviewDocument(skin, page, origin, review)
  const previewKind = (skin === 'rose_gold' || skin === 'midnight_rose' || skin === 'pearl_rose' || skin === 'rose_champagne') ? 'Theme' : 'Skin'
  const reviewQuery = review ? '?lineupReview='+review : ''
  const reviewControls = review ? '<nav aria-label="Lineup review states">'+(['empty','queued','delayed','no-calendar'] as const).map(state => '<a href="'+previewPath(skin,page)+'?lineupReview='+state+'"'+(state === review ? ' aria-current="page"' : '')+'>'+({empty:'Empty',queued:'Names waiting',delayed:'Delayed', 'no-calendar':'No calendar'}[state])+'</a>').join('')+'</nav>' : ''
  const navigation = SKIN_PREVIEW_PAGES.map((item) => `<a href="${previewPath(skin, item)}${reviewQuery}"${item === page ? ' aria-current="page"' : ''}>${LABELS[item]}</a>`).join('')
  const chrome = skin === 'amethyst'
    ? { bg: '#22064b', fg: '#fff4fa', muted: '#E8DFF5', border: '#FF1AC255', active: '#E8DFF5', focus: '#FF1AC2' }
    : skin === 'pearl_rose'
    ? { bg: '#faf5ef', fg: '#4d2931', muted: '#785963', border: '#dcc4b7', active: '#813f50', focus: '#954354' }
    : skin === 'midnight_rose'
    ? { bg: '#180e16', fg: '#fff0e8', muted: '#dbc0bb', border: '#66424b', active: '#efb5a3', focus: '#efb5a3' }
    : skin === 'rose_champagne'
    ? { bg: '#fff7f5', fg: '#45252e', muted: '#765760', border: '#e8c8c0', active: '#723745', focus: '#a04e5d' }
    : skin === 'gilded_autumn'
    ? { bg: '#392519', fg: '#fff8ec', muted: '#e3cba9', border: '#b1833866', active: '#fff8ec', focus: '#e3cba9' }
    : skin === 'neon_butterfly'
    ? { bg: '#160318', fg: '#fff4fa', muted: '#d9bcd4', border: '#ff2acd55', active: '#ff2acd', focus: '#ffc24a' }
    : (skin === 'halloween_pumpkin_witch' || skin === 'halloween_pumpkin_cat')
      ? { bg: '#090909', fg: '#fff7ed', muted: '#d6c8bb', border: '#ff6a0066', active: '#ff6a00', focus: '#f4eee3' }
      : { bg: '#173126', fg: '#fff3d6', muted: '#dfd4ba', border: '#f4c45e44', active: '#fff3d6', focus: '#f4c45e' }
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${profile.label} · ${previewKind} preview</title><style>
  *{box-sizing:border-box}body{margin:0;background:${chrome.bg};color:${chrome.fg};font:14px/1.4 system-ui,sans-serif}header{min-height:64px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 24px;border-bottom:1px solid ${chrome.border}}header strong{font-size:14px}header small{display:block;color:${chrome.muted};font-size:12px}nav{display:flex;gap:5px;flex-wrap:wrap}nav a{color:inherit;text-decoration:none;border-radius:20px;padding:8px 12px}nav a:hover,nav a[aria-current]{background:${chrome.active};color:${chrome.bg}}a:focus-visible{outline:3px solid ${chrome.focus};outline-offset:3px}iframe{display:block;width:100%;height:calc(100dvh - 65px);border:0;background:${chrome.bg}}@media(max-width:600px){header{padding:10px 12px;flex-direction:column;align-items:flex-start;gap:7px}header small{display:inline;margin-left:6px}nav{width:100%;justify-content:space-between}nav a{padding:7px 9px}iframe{height:calc(100dvh - 100px)}}
  html,body{height:100%;overflow:hidden}body{height:100dvh;display:flex;flex-direction:column}header{flex:0 0 auto}iframe{flex:1 1 0;min-height:0;height:auto}
  </style></head><body><header><div><strong>${previewKind} preview · Sample content${review ? ' · Lineup review' : ''}</strong><small>${profile.label}</small></div><nav aria-label="Preview pages">${navigation}</nav>${reviewControls}</header><iframe id="skin-preview" title="${LABELS[page]} — sample ${profile.label} site" sandbox="allow-scripts" referrerpolicy="no-referrer" srcdoc="${escapeAttribute(document)}"></iframe><script>
  var previewFrame=document.getElementById('skin-preview');
  previewFrame.addEventListener('load',function(){if(window.location.hash==='#events')previewFrame.contentWindow.postMessage({type:'sparkle-skin-preview-scroll',fragment:'#events'},'*');});
  window.addEventListener('message',function(event){var frame=document.getElementById('skin-preview');if(event.source!==frame.contentWindow||event.data?.type!=='sparkle-skin-preview-page')return;var page=event.data.page;if(['homepage','trade','join','unsubscribe'].includes(page))window.location.assign('/skin-preview/${skin}/'+page+'${reviewQuery}'+(event.data.fragment === '#events' ? '#events' : ''));});
  </script></body></html>`
}

export async function renderGnomeSkinPreview(page: SkinPreviewPage, origin: string) {
  return renderSkinPreview('gnome_garden', page, origin)
}
