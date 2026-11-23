import { LIVE_LINEUP_RELEASE } from './release'

export const LIVE_LINEUP_HELP_RESOURCE_ID = 'use-live-queue-during-show'
export const LIVE_LINEUP_HELP_TITLE = 'How to run your show with Live Lineup'
export const LIVE_LINEUP_HELP_GUIDE_VALUE = 'live-lineup'
export const LIVE_LINEUP_HELP_UPDATE_PART = 'update'
export const LIVE_LINEUP_HELP_UPDATE_ID = 'update-extension'

export const LIVE_LINEUP_UPDATE_WARNING =
  "Don't remove the extension. Removing it erases your Live Lineup connection code."

export const LIVE_LINEUP_UPDATE_STEPS = [
  'On your computer, open Chrome and go to chrome://extensions.',
  'Turn on Developer mode (top right), press Update, then turn Developer mode back off.',
  'Open your Bomb Party Live Party Orders page. The notice clears once the extension reports the new version.',
] as const

export const LIVE_LINEUP_UPDATE_AUTOMATIC_NOTE =
  'On 2.0.13 or newer, this usually happens by itself when Chrome starts, and the extension has a Check for updates button.'

export const LIVE_LINEUP_UPDATE_DELAY_NOTE =
  'Updates can take a few hours to show up after we release one.'

export const LIVE_LINEUP_NEED_A_HAND =
  'If anything looks off, tap Report a bug at the top of your Workspace or message us through Workspace Support.'

export const LIVE_LINEUP_HELP_BUTTON_LABEL = 'Contact Sparkle Suite Support'

const WHATS_NEW = [
  'Start Show and Stop Show buttons. They\'re in the extension and on your Workspace Live Lineup card. Press Start and your site says "I have an open lineup." right away, even before the first order. Press Stop and it goes back to "Check the calendar for the next show." with your next scheduled show listed.',
  'It wraps up on its own if you forget. If you don\'t press Stop, the lineup ends when your party closes, or after 2 hours with no new orders.',
  'Updates install themselves. Every time Chrome starts, the extension checks for an update and installs it. Your version number and a Check for updates button are right in the extension.',
  'Clearer status in your Workspace. The card shows your extension version and whether it\'s connected. If something\'s wrong, it turns red and says Needs attention. Tap it to see what\'s going on. "Reconnecting" only shows in your Workspace; your customers just see that the lineup is updating automatically.',
  'Customers with more than one order stay together. They show as one row with the order count, move together when you drag them, and you tap the count to see each order.',
  'Customer card. Tap it to see and save private notes, a birthday, and favorites like stone, metal, cut and collection. It\'s private to your Workspace.',
  'Easier on your phone. The order count and Customer card sit together on the right, the Customer card button is bigger to tap, and grouped rows no longer pop open or closed on their own.',
] as const

const DURING_YOUR_SHOW = [
  'Keep your Workspace Live Lineup card open on your phone or computer. You\'ll see Live and Connected, and orders come in the same order as Bomb Party.',
  'Use Reveal next, Hold, or drag a name to change the order. Undo takes back your last change. None of this changes your Bomb Party orders.',
  'Tap Customer card to see a customer\'s private notes, birthday and favorites, or to add them.',
  'If the status turns red and says Needs attention, tap it to see why. Most of the time the Live Party Orders page closed or reloaded. Keep that page open and Live Lineup reconnects on its own.',
] as const

const WHEN_YOU_ARE_DONE = [
  'Press Stop Show. Your site goes back to "Check the calendar for the next show." Forgot? It ends on its own when your party closes or after 2 hours with no new orders.',
  'Keep your next show on your Workspace Calendar so it shows up under that message.',
] as const

export const liveLineupHelpBeforeYouStart = [
  'Google Chrome on your computer',
  'The Sparkle Suite extension from the Chrome Web Store',
  'The assigned Live Lineup code shown at the top of your Workspace',
  'Your Bomb Party Live Party Orders page',
] as const

export type LiveLineupReleaseStamp = {
  version: string
  publishedAt: string | null
  rolloutEnabled: boolean
}

export type LiveLineupGuideImage = {
  src: string
  width: number
  height: number
  caption: string
  alt: string
}

export const LIVE_LINEUP_GUIDE_IMAGES = {
  extensionStartStop: {
    src: '/sparkle-suite/help/live-lineup/01-extension-start-stop.jpg',
    width: 1072,
    height: 1117,
    caption:
      "The extension before your show (left) and once you've pressed Start Show (right).",
    alt: "The Sparkle Suite extension before and during a show. Left: Connected + Updating, Extension 2.0.13, a Check for updates button, a pink Start Show button, and Party 1001 checked with 0 orders. Right: the same screen with a Stop Show button, 'Lineup ends at 9:15 PM', and Party 1001 with 6 orders.",
  },
  workspaceLive: {
    src: '/sparkle-suite/help/live-lineup/02-workspace-live-lineup.png',
    width: 560,
    height: 1126,
    caption: 'Live and connected. A customer with 3 orders stays on one row.',
    alt: "The Workspace Live Lineup card during a show: Live, a Stop Show button, Extension 2.0.13 Connected, and five customers in order. The second customer shows a '3 orders' button with a Customer card button under it.",
  },
  needsAttention: {
    src: '/sparkle-suite/help/live-lineup/03-workspace-needs-attention.png',
    width: 560,
    height: 792,
    caption: "If something's off, the status turns red. Tap it for the reason.",
    alt: "The Workspace Live Lineup card with a red Needs attention status and the words 'Tap for status', above the message: Show started, but your Live Lineup extension isn't connected.",
  },
  customerSiteAfterStop: {
    src: '/sparkle-suite/help/live-lineup/04-customer-site-after-stop.png',
    width: 780,
    height: 566,
    caption:
      'After Stop, customers see your next scheduled show (shown on our Fizz Festival demo site).',
    alt: "A customer site on a phone after the show: 'Check the calendar for the next show.' with the next show listed below it, Thanksgiving Morning Parade Show, Thursday, November 26, 8:00 AM Eastern.",
  },
} as const satisfies Record<string, LiveLineupGuideImage>

export type LiveLineupHelpDeepLink = {
  part: 'update' | null
}

/** Same published rule as latestPublishedVersion: rollout on and publishedAt <= now. */
export function publishedLiveLineupVersion(
  now = Date.now(),
  release: LiveLineupReleaseStamp = LIVE_LINEUP_RELEASE,
): string | null {
  if (!release.rolloutEnabled || !release.publishedAt) return null
  const publishedAt = Date.parse(release.publishedAt)
  if (!Number.isFinite(publishedAt) || publishedAt > now) return null
  return release.version
}

export function liveLineupExtensionVersionLabel(
  now = Date.now(),
  release: LiveLineupReleaseStamp = LIVE_LINEUP_RELEASE,
): string {
  return publishedLiveLineupVersion(now, release) ?? 'the newest version'
}

export function liveLineupGuideContent(
  now = Date.now(),
  release: LiveLineupReleaseStamp = LIVE_LINEUP_RELEASE,
) {
  const versionLabel = liveLineupExtensionVersionLabel(now, release)
  const beforeYouGoLive = [
    'On your computer, open Chrome and go to your Bomb Party Live Party Orders page. Keep just one of those tabs open. Opening Chrome a few minutes early gives any update time to install.',
    `Click the Sparkle Suite extension. It should say Connected + Updating and Extension ${versionLabel}. First time only, enter the Live Lineup code shown at the top of your Workspace.`,
    "Under Detected parties, make sure today's party is checked. Uncheck any party you don't want on your site.",
    'Press Start Show, in the extension or on your Workspace card. Your site now says "I have an open lineup." and the extension shows when the lineup ends. If you start from your Workspace, the extension can take about 30 seconds to catch up.',
  ]
  return {
    versionLabel,
    whatsNew: WHATS_NEW,
    beforeYouGoLive,
    duringYourShow: DURING_YOUR_SHOW,
    whenYouAreDone: WHEN_YOU_ARE_DONE,
    updateSteps: LIVE_LINEUP_UPDATE_STEPS,
  }
}

export function liveLineupHelpSteps(now = Date.now()): string[] {
  const content = liveLineupGuideContent(now)
  return [
    ...content.beforeYouGoLive,
    ...content.duringYourShow,
    ...content.whenYouAreDone,
    ...content.updateSteps,
  ]
}

export function parseLiveLineupHelpDeepLink(search: string): LiveLineupHelpDeepLink | null {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  if (params.get('guide') !== LIVE_LINEUP_HELP_GUIDE_VALUE) return null
  const part = params.get('part')
  if (part === null) return { part: null }
  if (part === LIVE_LINEUP_HELP_UPDATE_PART) return { part: 'update' }
  return null
}
