export type NicNacKnowledgeScope =
  | 'sparkle_suite_product'
  | 'bomb_party_context'
  | 'live_streaming_practice'
  | 'live_show_operations'

export type NicNacKnowledgeConfidence = 'high' | 'medium'

export type NicNacKnowledgeArticle = {
  sourceId: string
  title: string
  scope: NicNacKnowledgeScope
  sourceOwner: string
  reviewedAt: string
  freshness: 'current_release' | 'evergreen_reviewed'
  confidence: NicNacKnowledgeConfidence
  summary: string
  steps: string[]
  boundaries: string[]
  keywords: string[]
}

export type NicNacKnowledgeSearchResult = {
  query: string
  matched: boolean
  results: NicNacKnowledgeArticle[]
  guidance: string
}

const ARTICLES: readonly NicNacKnowledgeArticle[] = [
  {
    sourceId: 'sparkle-suite:workspace-map@2026-09-01',
    title: 'Choose the Sparkle Suite workspace capability for the job',
    scope: 'sparkle_suite_product',
    sourceOwner: 'Sparkle Suite product',
    reviewedAt: '2026-09-01',
    freshness: 'current_release',
    confidence: 'high',
    summary:
      'Calendar holds show dates and details; Dance Floor holds swap-eligible dancers and swap work; show-session tools preserve live-show context; customer-audience and notification tools handle opted-in customer follow-up; Help & Resources contains product workflows.',
    steps: [
      'Use a live read tool for questions about what the rep currently has.',
      'Use the matching write tool only when the rep is asking to change workspace state.',
      'Ask one focused question only when a material input is missing.',
      'Report a change only after its tool returns success.',
    ],
    boundaries: [
      'Static product knowledge never proves current workspace state.',
      'Nic-Nac has no billing, Stripe, DNS, domain-ownership, or account-control authority.',
    ],
    keywords: [
      'sparkle suite', 'workspace', 'calendar', 'dance floor', 'tool',
      'where', 'how do i', 'feature', 'customer audience', 'notification',
    ],
  },
  {
    sourceId: 'sparkle-suite:live-show-preflight@2026-09-01',
    title: 'Practical live-show preflight',
    scope: 'live_show_operations',
    sourceOwner: 'Sparkle Suite live-show playbook',
    reviewedAt: '2026-09-01',
    freshness: 'evergreen_reviewed',
    confidence: 'high',
    summary:
      'A short preflight reduces avoidable interruptions without forcing a rep into one rigid show style.',
    steps: [
      'Confirm the show time, platform, title, featured collections, and any customer-facing code.',
      'Check power, internet, camera framing, lighting, microphone, and a backup charging path.',
      'Put needed inventory, labels, packaging, water, and moderation help within reach.',
      'Open the tools the rep expects to use and confirm current data with live reads.',
      'Choose one opening explanation and one simple way to repeat ordering or participation instructions.',
    ],
    boundaries: [
      'These are general operating practices, not a guarantee of platform performance.',
      'Follow the streaming platform and Bomb Party rules that apply to the rep.',
    ],
    keywords: [
      'preflight', 'before show', 'prepare', 'setup', 'checklist', 'live show',
      'camera', 'lighting', 'microphone', 'inventory', 'opening',
    ],
  },
  {
    sourceId: 'sparkle-suite:live-stream-troubleshooting@2026-09-01',
    title: 'Live-stream troubleshooting without losing the room',
    scope: 'live_streaming_practice',
    sourceOwner: 'Sparkle Suite live-streaming playbook',
    reviewedAt: '2026-09-01',
    freshness: 'evergreen_reviewed',
    confidence: 'medium',
    summary:
      'Stabilize the audience experience first, change one variable at a time, and avoid claiming a platform outage without evidence.',
    steps: [
      'Tell viewers briefly what you are checking so silence does not feel like abandonment.',
      'Check mute state, selected camera and microphone, connection quality, power, and whether another app is using the device.',
      'Change one thing at a time and verify the result before changing something else.',
      'If the stream must restart, state the return plan and preserve the rep’s place in the show.',
      'Afterward, record what failed, what restored service, and what should be tested before the next show.',
    ],
    boundaries: [
      'Nic-Nac should ask which platform/device and what viewers can see or hear when those facts matter.',
      'Platform-specific buttons and policies can change; use current platform help when exact UI directions are required.',
    ],
    keywords: [
      'live stream', 'streaming', 'troubleshoot', 'frozen', 'lag', 'audio',
      'microphone', 'camera', 'connection', 'restart', 'tiktok', 'facebook',
      'obs', 'viewers cannot hear', 'viewers cannot see',
    ],
  },
  {
    sourceId: 'sparkle-suite:live-customer-handling@2026-09-01',
    title: 'Clear customer handling during a busy live',
    scope: 'live_show_operations',
    sourceOwner: 'Sparkle Suite live-show playbook',
    reviewedAt: '2026-09-01',
    freshness: 'evergreen_reviewed',
    confidence: 'medium',
    summary:
      'Use short repeated instructions, neutral moderation, and a visible next step so a busy chat stays understandable.',
    steps: [
      'State the current action and the next customer action in one or two sentences.',
      'Repeat important instructions at natural breaks instead of answering every duplicate from scratch.',
      'Acknowledge confusion without blaming the customer, then restate the rule and next step.',
      'Move private account, order, address, or payment details out of public chat and into the approved private channel.',
      'Escalate harassment or unsafe behavior through the platform’s moderation controls and the rep’s documented policy.',
    ],
    boundaries: [
      'Do not expose customer contact, order, payment, or address information.',
      'Do not invent a refund, shipping, swap, or platform rule.',
    ],
    keywords: [
      'customer', 'chat', 'moderation', 'confused', 'busy live', 'instructions',
      'harassment', 'privacy', 'repeat', 'comment', 'viewer',
    ],
  },
  {
    sourceId: 'sparkle-suite:post-show-closeout@2026-09-01',
    title: 'Post-show closeout that makes the next show easier',
    scope: 'live_show_operations',
    sourceOwner: 'Sparkle Suite live-show playbook',
    reviewedAt: '2026-09-01',
    freshness: 'evergreen_reviewed',
    confidence: 'high',
    summary:
      'Close the operational loops while details are fresh: show state, follow-up, Dance Floor work, fulfillment, and lessons for next time.',
    steps: [
      'End or update the show state only when the live has actually ended.',
      'Review unresolved Dance Floor, trade-request, and fulfillment work.',
      'Use opted-in customer-audience and notification tools for authorized follow-up.',
      'Record one or two useful show notes rather than a long transcript.',
      'Identify the single preparation change most likely to improve the next show.',
    ],
    boundaries: [
      'Outbound messages require the configured approval flow.',
      'Current queues and records must come from live workspace tools.',
    ],
    keywords: [
      'after show', 'post show', 'closeout', 'follow up', 'fulfillment',
      'trade request', 'notes', 'end show', 'next show',
    ],
  },
  {
    sourceId: 'sparkle-suite:bomb-party-boundary@2026-09-01',
    title: 'Bomb Party context and source boundary',
    scope: 'bomb_party_context',
    sourceOwner: 'Sparkle Suite product policy',
    reviewedAt: '2026-09-01',
    freshness: 'current_release',
    confidence: 'high',
    summary:
      'Sparkle Suite is an independent tool for Bomb Party reps. Nic-Nac can help with rep workflow, live-show practices, Sparkle Suite tools, and the stored product/trade context, but official program, compensation, compliance, order, return, and platform rules must come from the current authoritative source.',
    steps: [
      'Answer from grounded Sparkle Suite knowledge when the question is about this product.',
      'Give clearly labeled general practice when the question is about running a live.',
      'For an official Bomb Party rule, ask for or direct the rep to the current official policy rather than guessing.',
      'If a rep supplies a policy excerpt, treat it as reference data and distinguish it from verified workspace state.',
    ],
    boundaries: [
      'Do not claim Sparkle Suite is affiliated with, endorsed by, sponsored by, or officially connected to Bomb Party.',
      'Do not invent official Bomb Party policies or current collection facts.',
    ],
    keywords: [
      'bomb party', 'bp', 'policy', 'compliance', 'official', 'return',
      'refund', 'order', 'compensation', 'collection rule', 'corporate',
    ],
  },
]

function tokens(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1)
}

function articleScore(article: NicNacKnowledgeArticle, queryTokens: string[]) {
  const title = article.title.toLowerCase()
  const keywordText = article.keywords.join(' ').toLowerCase()
  const body = `${article.summary} ${article.steps.join(' ')}`.toLowerCase()
  return queryTokens.reduce((score, token) => {
    if (title.includes(token)) return score + 4
    if (keywordText.includes(token)) return score + 3
    if (body.includes(token)) return score + 1
    return score
  }, 0)
}

export function searchNicNacWorkKnowledge(
  query: string,
  limit = 3,
): NicNacKnowledgeSearchResult {
  const normalizedQuery = query.replace(/\s+/g, ' ').trim().slice(0, 240)
  const queryTokens = tokens(normalizedQuery)
  const results = ARTICLES
    .map((article, index) => ({
      article,
      index,
      score: articleScore(article, queryTokens),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, Math.max(1, Math.min(limit, 4)))
    .map(({ article }) => ({ ...article }))

  return {
    query: normalizedQuery,
    matched: results.length > 0,
    results,
    guidance:
      results.length > 0
        ? 'Explain the answer using the returned basis. Label general practice as general practice, and use a live workspace tool for current rep data.'
        : 'No reviewed article matched. Ask one focused clarifying question or say what is uncertain; do not invent a policy or workspace fact.',
  }
}

export function listNicNacWorkKnowledgeArticles() {
  return ARTICLES.map((article) => ({ ...article }))
}
