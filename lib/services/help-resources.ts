import type { HelpResource } from '@/lib/services/types'

type HelpResourceInput = Omit<
  HelpResource,
  'beforeYouStart' | 'steps' | 'relatedFeatureIds' | 'quickActions'
> & {
  beforeYouStart?: string[]
  steps?: string[]
  relatedFeatureIds?: string[]
  quickActions?: string[]
}

function helpResource(input: HelpResourceInput): HelpResource {
  return {
    beforeYouStart: ['Open the Sparkle Suite workspace.'],
    steps: [
      'Open Help & Resources.',
      'Choose the closest workflow.',
      'Ask Nic-Nac if you want guided help.',
    ],
    relatedFeatureIds: [],
    quickActions: [],
    ...input,
  }
}

const WORKFLOW_RESOURCES: HelpResource[] = [
  helpResource({
    id: 'start-here-workspace',
    type: 'workflow',
    group: 'Setup',
    category: 'Setup',
    title: 'Start here: Learn your Sparkle Suite workspace',
    summary: 'A quick map of the workspace so reps know where the main tools live.',
    body:
      'Use this as the first stop when the workspace feels like a lot. It explains the main areas without expecting reps to know product names first.',
    goal: 'Understand the main Sparkle Suite workspace areas without feeling lost.',
    useWhen: 'Use this when you are new, returning after time away, or unsure where to start.',
    beforeYouStart: ['Open the Sparkle Suite workspace.'],
    steps: [
      'Review the dashboard as your home base.',
      'Open Nic-Nac when you want plain-English guidance.',
      'Use Site Settings for customer-facing site details.',
    'Use the Dance Floor for dancers, requests, and trade follow-up.',
      'Use Calendar and Live Queue tools before and during live shows.',
      'Use Account for billing and site analytics.',
      'Use Help & Resources when you need the next workflow.',
    ],
    goodResult: 'You know which workspace area to open for the job in front of you.',
    nicNacPrompt: 'Walk me through the Sparkle Suite workspace.',
    stillStuck: 'Ask Nic-Nac what you are trying to do and which workspace area to open.',
    relatedFeatureIds: ['nic-nac', 'customer-site', 'trade-board', 'live-queue', 'billing'],
    quickActions: ['Ask Nic-Nac for directions', 'Open Site Settings', 'Open Dance Floor'],
    video: {
      title: 'Workspace orientation walkthrough',
      provider: 'youtube',
      status: 'placeholder',
    },
  }),
  helpResource({
    id: 'finish-setup-approve-site',
    type: 'workflow',
    group: 'Setup',
    category: 'Setup',
    title: 'Finish setup and approve your customer site',
    summary: 'Move from a new account to a usable workspace and customer-facing site.',
    body:
      'This workflow keeps setup focused on the basics reps need before sharing their Sparkle Suite link.',
    goal: 'Finish setup, approve the customer-site preview, and unlock the workspace.',
    useWhen: 'Use this when your account is new or your site preview still needs approval.',
    beforeYouStart: [
      'Business or show display name',
      'Public links and social profiles',
      'Sparkle Suite/Morganite theme confirmation',
    ],
    steps: [
      'Confirm your business and profile basics.',
      'Add the public links shoppers need.',
      'Confirm the locked Sparkle Suite/Morganite theme.',
      'Review the customer-facing site preview.',
      'Ask Nic-Nac to help adjust unclear setup answers.',
      'Approve the final setup preview.',
      'Confirm that the Sparkle Suite workspace opens after approval.',
    ],
    goodResult: 'Your customer site is approved and the workspace opens for regular use.',
    nicNacPrompt: 'Help me finish setup and approve my customer site.',
    stillStuck:
      'Tell Nic-Nac which setup step is blocked and include any visible error or missing field.',
    relatedFeatureIds: ['customer-site', 'nic-nac', 'account-settings'],
    quickActions: ['Review site preview', 'Ask Nic-Nac about setup', 'Open Site Settings'],
  }),
  helpResource({
    id: 'update-customer-site',
    type: 'workflow',
    group: 'Setup',
    category: 'Customer Site',
    title: 'Update your customer-facing site',
    summary: 'Make common customer-site edits without needing support.',
    body:
      'Use Site Settings for public-facing changes shoppers notice first. Custom hero image upload is not part of the launch surface.',
    goal: 'Update the customer-facing site details reps can safely manage from the workspace.',
    useWhen: 'Use this when your show info, links, branding, or Join Team visibility changes.',
    beforeYouStart: ['The exact copy, link, handle, or setting you want to change.'],
    steps: [
      'Open Site Settings.',
      'Update display name, business name, ticker, site tagline, hero title, hero subtitle, or social links.',
      'Confirm the Shop Now link points to the right customer destination.',
      'Set Join Team visibility for launch expectations.',
      'Confirm the auto-save indicator shows the change was saved.',
      'Open the customer-facing site preview and confirm the change.',
    ],
    goodResult: 'The customer-facing site shows the updated public details.',
    nicNacPrompt: 'Help me update my customer-facing site.',
    stillStuck:
      'Ask Nic-Nac to identify which site setting controls the change and include the exact copy or link you wanted to use.',
    relatedFeatureIds: ['customer-site', 'account-settings', 'nic-nac'],
    quickActions: ['Open Site Settings', 'Preview customer site', 'Ask Nic-Nac for a site edit'],
    video: {
      title: 'Public site editing walkthrough',
      provider: 'youtube',
      status: 'placeholder',
    },
  }),
  helpResource({
    id: 'embed-tiktok-video-on-customer-site',
    type: 'workflow',
    group: 'Setup',
    category: 'Customer Site',
    title: 'Embed a TikTok video on your customer-facing site',
    summary:
      'Add one of your TikTok videos to the homepage or one of the three About short-video spots in a few clear steps.',
    body:
      'Use a public TikTok video you want shoppers to see. Sparkle Suite accepts either TikTok\'s copied embed code or the full link to that individual video; a TikTok profile link will not create a video embed.',
    goal:
      'Show a working TikTok video in the right customer-facing spot without changing the rest of the site.',
    useWhen:
      'Use this when you want to feature a TikTok on the homepage or add a video below your About story.',
    beforeYouStart: [
      'The public TikTok video you want to display',
      'A desktop or mobile browser signed in to TikTok',
    ],
    steps: [
      'Open the individual TikTok video you want customers to watch.',
      'Choose Share, then Embed, and copy the TikTok embed code. You can instead copy that individual video\'s full TikTok link.',
      'In the Sparkle Suite workspace, open Site Settings.',
      'Find Homepage photos and videos.',
      'Choose Showcase video for the main homepage feature, or choose About short video 1, 2, or 3 for a portrait video below your About story.',
      'Paste the TikTok embed code or full individual-video link into TikTok embed code or video URL.',
      'Wait for the auto-save indicator to confirm the change saved.',
      'Open Preview customer site and play the video to confirm it appears in the selected spot.',
    ],
    goodResult:
      'The selected TikTok video plays on the customer-facing site in the Showcase or About short-video location you chose.',
    nicNacPrompt:
      'Help me add this TikTok video to my customer-facing site. I want it in the Showcase video or one of my three About short-video spots.',
    stillStuck:
      'Give Nic-Nac the individual TikTok video link, tell it which spot you chose, and include what the preview shows. Do not send a profile link when you want a video embed.',
    relatedFeatureIds: ['customer-site', 'account-settings', 'nic-nac'],
    quickActions: [
      'Open Site Settings',
      'Paste TikTok embed code or video URL',
      'Preview customer site',
    ],
  }),
  helpResource({
    id: 'get-ready-for-live-show',
    type: 'workflow',
    group: 'Live Shows',
    category: 'Live Shows',
    title: 'Get ready for a live show',
    summary: 'A pre-show checklist for site, queue, calendar, and dance floor readiness.',
    body:
      'Use this before going live so customers can find the right show details and the rep is not chasing setup pieces mid-show.',
    goal: 'Confirm the main Sparkle Suite live-show surfaces are ready before show time.',
    useWhen: 'Use this on show day or while scheduling the next show.',
    beforeYouStart: [
      'Show date and time',
      'Live platform',
      'Customer site link',
      'Current Dance Floor dancers',
    ],
    steps: [
      'Confirm the upcoming show appears in the calendar.',
      'Open the customer site link and check the visible show information.',
      'Review the Dance Floor for unavailable dancers.',
      'Check Live Queue readiness based on current rollout instructions.',
      'Confirm any customer update feature is enabled only if it is production-ready for this account.',
      'Ask Nic-Nac to review anything that looks out of place.',
    ],
    goodResult: 'The customer site, show details, and dance floor are ready before the live starts.',
    nicNacPrompt: 'Help me get ready for a live show.',
    stillStuck:
      'Tell Nic-Nac which pre-show check failed and include the show date, platform, and visible issue.',
    relatedFeatureIds: ['live-event-calendar', 'live-queue', 'trade-board', 'customer-site'],
    quickActions: ['Open Calendar', 'Open Dance Floor', 'Check Live Queue'],
  }),
  helpResource({
    id: 'use-live-queue-during-show',
    type: 'workflow',
    group: 'Live Shows',
    category: 'Live Queue',
    title: 'Use Live Queue during a show',
    summary: 'Understand what the queue is doing and what to check when it looks wrong.',
    body:
      'Live Queue can be coming soon or launch-gated depending on rollout state. Follow the approved extension rollout for your account. The upgraded Live Lineup uses a private computer key, explicitly selected Party Orders tab/show, and recent server-verified updates. Ask support when the queue is stale, unexpectedly empty, or missing customers. Creating a key alone is not proof of connection. Older versions use the legacy sync code and Party Filter reference; never paste a new private key into those versions. Web Store approval, unpacked testing, rep rollout, and installed-copy verification remain separate release steps.',
    goal: 'Keep the public queue understandable during a live show.',
    useWhen: 'Use this when checking Live Queue before or during a live show.',
    beforeYouStart: [
      'The approved extension version for your account; keep private keys out of chat',
      'Bomb Party Party Orders tab',
      'Current party or show context',
    ],
    steps: [
      'Confirm the approved Live Queue setup path for this account.',
      'For the upgraded extension, pair using Extension connection setup and verify the selected source. Legacy versions use their assigned short code instead.',
      'Confirm the Bomb Party Party Orders tab is open when queue sync is expected.',
      'Confirm the selected show and parties. In upgraded Workspace Show controls, hiding a party is reversible and keeps its order and holds private.',
      'Drag to reorder, Hold customers who step away, and Return them deliberately. These controls do not change Bomb Party orders.',
      'Check whether the queue is stale, empty, or missing expected names.',
      'Ask Nic-Nac to gather status details if the queue still looks wrong.',
    ],
    goodResult:
      'The queue state makes sense for the current show, or the right support details are collected.',
    nicNacPrompt: 'Help me check my Live Queue.',
    stillStuck:
      'Include extension version, visible status, selected show/parties, whether Chrome and the selected BP tab are open, and what the public queue shows. Never include private keys or customer order details.',
    relatedFeatureIds: ['live-queue'],
    quickActions: ['Check extension status', 'Review stale queue', 'Ask Nic-Nac for help'],
  }),
  helpResource({
    id: 'add-jewelry-to-trade-board',
    type: 'workflow',
    group: 'Dance Floor',
    category: 'Dance Floor',
    title: 'Add a dancer to your Dance Floor',
    summary:
      'Easy button: send the item number or tag photo and a clear photo of the jewelry. Nic-Nac will tell you what is missing.',
    body:
      'You can send either photo first. The item-info tag or label tells Nic-Nac which dancer it is. The clear jewelry photo is the photo customers see on the Dance Floor. They do two different jobs. A boxed display photo works when the jewelry is cleanly visible and looks good on the website.',
    goal: 'Add one dancer with correct details and a customer-facing jewelry photo.',
    useWhen: 'Use this when you have jewelry you are willing to make available for trade.',
    beforeYouStart: [
      'Item number or readable item-info tag/photo',
      'Clear, close, centered photo of the jewelry itself for customers to see',
      'Ring size, if it is a ring and you have the size',
    ],
    steps: [
      'Open the Dance Floor and choose Add dancer, or tell Nic-Nac: “Help me add a dancer to my Dance Floor.”',
      'Send the item number or a readable item-info tag/photo so Nic-Nac can identify the dancer.',
      'Send a clear, close, centered photo of the jewelry itself. This is the photo customers will see on your Dance Floor.',
      'Let Nic-Nac check the jewelry database. It will use what you already sent and ask only for anything still missing.',
      'If Nic-Nac finds the dancer, confirm the match. If it cannot find it, send the missing details it asks for. For a ring, add the size if Nic-Nac asks for it.',
      'Review the dancer details and customer-facing photo. When they look right, confirm the add.',
    ],
    goodResult:
      'Your dancer appears on the Dance Floor with the right details, available status, and the clear photo customers should see.',
    nicNacPrompt: 'Help me add a dancer to my Dance Floor.',
    stillStuck:
      'Ask Nic-Nac what information is missing. If support is needed, include the item number, photos uploaded, and where the flow stopped.',
    relatedFeatureIds: ['trade-board', 'nic-nac'],
    quickActions: [
      'Add a dancer to Dance Floor',
      'Review photo best practices',
      'Ask Nic-Nac what info is missing',
    ],
    video: {
      title: 'Add a dancer to your Dance Floor: a complete walkthrough',
      provider: 'youtube',
      status: 'placeholder',
    },
  }),
  helpResource({
    id: 'handle-trade-requests',
    type: 'workflow',
    group: 'Dance Floor',
    category: 'Trade Requests',
    title: 'Handle trade requests',
    summary:
      'Review customer trade requests, reveal screenshots, approvals, and follow-up without losing the thread.',
    body:
      'Sparkle Suite organizes trade interest, but the rep still controls trade judgment, approvals, shipping, and follow-through. Customers describe the dancer they just revealed and may attach a recommended reveal screenshot. The screenshot appears in the Dance Floor request inbox and on Nic-Nac trade request cards when available, then expires after 48 hours. Sparkle Suite does not guarantee equal value, settle disputes, or approve trades for the rep.',
    goal: 'Move trade requests through a clear decision and fulfillment rhythm.',
    useWhen: 'Use this when a customer requests a trade or a pending trade needs follow-up.',
    beforeYouStart: [
      'Customer request note with the revealed jewelry description',
      'Optional reveal screenshot, if the customer uploaded one',
      'Current dancer status',
      'Rep decision on whether the trade should move forward',
    ],
    steps: [
      'Open the trade request inbox.',
      'Review the requested dancer and the customer description of the jewelry they just revealed.',
      'Open the reveal screenshot from the request inbox or Nic-Nac trade request card when one is attached.',
      'Use the description, screenshot, and live-show context to confirm the collection and jewelry type.',
      'Approve the request when the trade should move forward under the same collection and same jewelry type rule.',
      'Deny the request when the trade should not move forward.',
      'When approving, enter the just-revealed item number and ring size when needed so cleanup and fulfillment stay accurate.',
      'Move approved trades through shipped and completed when follow-through happens.',
      'Keep only one request moving forward when several customers want the same dancer.',
    ],
    goodResult:
      'Each request has the right status, any reveal screenshot has been used as supporting context, and the rep knows what follow-up remains.',
    nicNacPrompt: 'Help me handle my trade requests.',
    stillStuck:
      'Include the customer name, requested dancer, customer description, whether a reveal screenshot is attached or expired, request status, and the decision you are trying to make. A missing screenshot alone should not block the trade if the description and show context are enough.',
    relatedFeatureIds: ['trade-board'],
    quickActions: [
      'Open request inbox',
      'View reveal screenshot',
      'Approve request',
      'Deny request',
    ],
  }),
  helpResource({
    id: 'manage-customers-and-updates',
    type: 'workflow',
    group: 'Customers & Account',
    category: 'Customers',
    title: 'Manage customers and updates',
    summary: 'Keep customer roster, signup, opt-outs, and update readiness clear.',
    body:
      'Email Updates and SMS Updates must be treated according to their current account readiness. Customer messages should only go to opted-in reachable customers when the feature is production-ready for that account; otherwise describe the flow as coming soon or sandbox.',
    goal: 'Understand which customers are reachable and what update tools are ready to use.',
    useWhen: 'Use this when checking customer signup, opt-outs, Email Updates, or SMS Updates.',
    beforeYouStart: [
      'Customer roster access',
      'Signup form link',
      'Current Email/SMS readiness state',
    ],
    steps: [
      'Open the customer roster.',
      'Review which customers are reachable by email or SMS.',
      'Use the signup form link when a customer wants to opt in.',
      'Respect opt-outs and STOP status.',
      'Confirm whether Email Updates or SMS Updates are coming soon, sandbox, or production-ready for this account.',
      'Ask Nic-Nac before sending or promising any customer update flow.',
    ],
    goodResult:
      'The rep knows who is reachable and avoids promising update behavior that is not ready.',
    nicNacPrompt: 'Help me understand my customer updates.',
    stillStuck:
      'Include the customer channel, opt-in question, and whether the account is in sandbox or production mode.',
    relatedFeatureIds: ['email-updates', 'sms-updates', 'customer-roster'],
    quickActions: [
      'Copy signup form link',
      'Review reachable customers',
      'Ask Nic-Nac about updates',
    ],
  }),
  helpResource({
    id: 'billing-account-basics',
    type: 'workflow',
    group: 'Customers & Account',
    category: 'Billing',
    title: 'Billing and account basics',
    summary: 'Review platform billing and account status.',
    body:
      'Platform billing is managed through Stripe. Payment behavior may be sandbox or test-mode during demo and launch review.',
    goal: 'Understand subscription billing and account payment state.',
    useWhen: 'Use this when reviewing payment status or account billing.',
    beforeYouStart: [
      'Account billing section',
      'Current demo or production context',
    ],
    steps: [
      'Open Account.',
      'Review subscription billing status.',
      'Confirm whether payment behavior is sandbox, test-mode, or production-ready.',
      'Ask Nic-Nac to explain unclear account status before escalating.',
    ],
    goodResult: 'The rep understands subscription billing and account payment state.',
    nicNacPrompt: 'Help me understand my billing.',
    stillStuck:
      'Include billing status, checkout mode, and the action you attempted.',
    relatedFeatureIds: ['billing', 'account-settings'],
    quickActions: ['Manage billing'],
  }),
  helpResource({
    id: 'referral-program-basics',
    type: 'workflow',
    group: 'Customers & Account',
    category: 'Referrals',
    title: 'Share your referral code',
    summary: 'Find your code, share your link, and understand when rewards credit.',
    body:
      'Referral rewards are account credits, not cash. A referred rep needs three paid subscription months before the credit is issued.',
    goal: 'Share the right referral link and know how pending, earned, and credited referrals are tracked.',
    useWhen: 'Use this when a rep asks where their code is or how referral credit works.',
    beforeYouStart: [
      'Account billing section',
      'Referral program card',
      'Current subscription status',
    ],
    steps: [
      'Open Account.',
      'Find the Referral program card.',
      'Copy the referral link or code.',
      'Share the link with the new rep before they start checkout.',
      'Review pending, earned, and credited counts after referred reps subscribe.',
      'Keep the referring account active so earned credits can be applied.',
    ],
    goodResult:
      'The rep can share a referral link and understands that the credit is automatic after three paid subscription months.',
    nicNacPrompt: 'Help me share my referral code.',
    stillStuck:
      'Include the referral code, whether the referred rep already subscribed, and what status count looks wrong.',
    relatedFeatureIds: ['billing', 'account-settings'],
    quickActions: ['Open Account', 'Copy referral link', 'Review referral status'],
  }),
  helpResource({
    id: 'fix-something-or-ask-for-help',
    type: 'workflow',
    group: 'Help',
    category: 'Support',
    title: 'Fix something or ask for help',
    summary: 'Try the right first checks, then package support details when blocked.',
    body:
      'This path keeps reps from getting stuck and helps support start from the actual issue instead of asking the rep to repeat everything.',
    goal: 'Resolve simple issues or collect clean support details when the rep is blocked.',
    useWhen: 'Use this when something looks broken, confusing, stale, missing, or blocked.',
    beforeYouStart: [
      'The page or workflow where the issue happened',
      'What you tried',
      'Any visible error',
    ],
    steps: [
      'Open the closest workflow guide.',
      'Check the Good Result section to confirm what should happen.',
      'Ask Nic-Nac to walk through the workflow.',
      'If still blocked, collect the page, account, action attempted, and visible error.',
      'Send the support request with those details.',
    ],
    goodResult: 'The rep either resolves the issue or sends support enough context to act.',
    nicNacPrompt: 'Help me troubleshoot this Sparkle Suite issue.',
    stillStuck:
      'Include page, account email, action attempted, expected result, actual result, and any visible error.',
    relatedFeatureIds: ['nic-nac', 'account-settings'],
    quickActions: ['Ask Nic-Nac to troubleshoot', 'Gather support details', 'Escalate to support'],
  }),
]

const FEATURE_REFERENCE_TITLES = [
  ['customer-site', 'Customer Site', 'Update your public-facing Sparkle Suite site details.'],
  ['trade-board', 'Dance Floor', 'Manage dancers, requests, and trade follow-up.'],
  ['live-queue', 'Live Queue', 'Help customers follow queue state when rollout is active.'],
  [
    'live-event-calendar',
    'Live Event Calendar',
    'Show upcoming lives in a clear customer-facing place.',
  ],
  [
    'email-updates',
    'Email Updates',
    'Reach opted-in customers when Email Updates are ready for the account.',
  ],
  [
    'sms-updates',
    'SMS Updates',
    'Reach opted-in customers when SMS Updates are ready for the account.',
  ],
  ['nic-nac', 'Nic-Nac', 'Use the built-in Sparkle Suite assistant for guided rep support.'],
  ['billing', 'Billing', 'Review platform billing and payment status.'],
  ['account-settings', 'Account / Settings', 'Manage account basics and workspace settings.'],
] as const

const FEATURE_RESOURCES: HelpResource[] = FEATURE_REFERENCE_TITLES.map(
  ([id, title, summary]) =>
    helpResource({
      id,
      type: 'feature_reference',
      group: 'Feature Index',
      category: 'Feature Index',
      title,
      summary,
      body: `${title} reference lives under the Feature Index. Use the Workflow Playbook first when you are trying to complete a specific task.`,
      goal: `Know where ${title} fits in Sparkle Suite.`,
      useWhen: `Use this when you already know you need ${title} reference help.`,
      beforeYouStart: ['Know the feature you want to inspect.'],
      steps: [
        'Open Help & Resources.',
        `Choose ${title} in the Feature Index.`,
        'Use the related workflow guide when you need step-by-step help.',
      ],
      goodResult: `You know which ${title} workflow or workspace section to open next.`,
      nicNacPrompt: `Help me with ${title}.`,
      stillStuck: `Ask Nic-Nac which ${title} workflow applies to your situation.`,
      relatedFeatureIds: [id],
      quickActions: [`Open ${title}`, 'Ask Nic-Nac for guided help'],
    }),
)

const DOMAIN_FORWARDING_RESOURCE = helpResource({
  id: 'domain-forwarding',
  type: 'support',
  group: 'Support',
  category: 'Site settings',
  title: 'Forward a custom domain to your Sparkle Suite show link',
  summary:
    "Use your domain provider's forwarding/redirect setting to send a custom domain to yoursparklesuite.com/yourshowname.",
  body:
    'Your default customer site link is yoursparklesuite.com/yourshowname. If you own a custom domain, set up standard forwarding or redirecting with your domain provider so visitors land on that Sparkle Suite show link; do not use masked forwarding because it can hide the real page and break customer-facing behavior. Custom domains are self-managed by default: Nic-Nac can point reps to this article, but should not walk through provider-specific DNS setup or domain forwarding screens. If you want Sparkle Suite to help with setup, ask about paid premium tech help.',
  goal: 'Understand the approved custom domain forwarding policy.',
  useWhen: 'Use this when a rep owns a custom domain and wants it to point to Sparkle Suite.',
  beforeYouStart: ['Default Sparkle Suite show link', 'Access to the domain provider account'],
  steps: [
    'Copy the default Sparkle Suite show link.',
    'Open the domain provider forwarding or redirect settings.',
    'Forward the domain to the Sparkle Suite show link.',
    'Avoid masked forwarding.',
    'Ask about paid premium tech help if provider-specific setup help is needed.',
  ],
  goodResult: 'Visitors who use the custom domain land on the Sparkle Suite show link.',
  nicNacPrompt: 'Help me understand custom domain forwarding.',
  stillStuck:
    'Include the domain provider, the destination show link, and whether masked forwarding is enabled.',
  relatedFeatureIds: ['customer-site', 'account-settings'],
  quickActions: ['Copy show link', 'Review domain forwarding steps', 'Ask about premium tech help'],
})

const HELP_RESOURCES: HelpResource[] = [
  ...WORKFLOW_RESOURCES,
  ...FEATURE_RESOURCES,
  DOMAIN_FORWARDING_RESOURCE,
]

export function getHelpResources(query = ''): HelpResource[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return HELP_RESOURCES
  const queryWords = normalized.split(/\s+/).filter(Boolean)

  return HELP_RESOURCES.filter((resource) => {
    const searchableText = [
      resource.type,
      resource.group,
      resource.category,
      resource.title,
      resource.summary,
      resource.body,
      resource.goal,
      resource.useWhen,
      ...resource.beforeYouStart,
      ...resource.steps,
      resource.goodResult,
      resource.nicNacPrompt,
      resource.stillStuck,
      ...resource.relatedFeatureIds,
      ...resource.quickActions,
      resource.video?.title ?? '',
      resource.video?.status ?? '',
    ]
      .join(' ')
      .toLowerCase()

    return (
      searchableText.includes(normalized) ||
      queryWords.every((word) => searchableText.includes(word))
    )
  })
}
