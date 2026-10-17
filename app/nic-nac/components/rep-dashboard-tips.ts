/**
 * Hover tips for the big Tools dashboard subject cards.
 * Edit the sentences here. Keep each tip to 2 or 3 short sentences:
 * what the card is, and how it helps a rep's business or LIVE shows.
 * Do not add made-up numbers, rates, or comparisons.
 */

export const DASHBOARD_TIP_HOVER_MS = 2_000

/** A touch long-press. Shorter than the pointer rest, so a normal tap still opens Manage. */
export const DASHBOARD_TIP_LONG_PRESS_MS = 700

export const DASHBOARD_TIP_IDS = [
  'shows',
  'customers',
  'dance-floor',
  'messages',
  'visitors',
  'last-month',
] as const

export type DashboardTipId = (typeof DASHBOARD_TIP_IDS)[number]

export const REP_DASHBOARD_TIPS: Record<DashboardTipId, readonly string[]> = {
  shows: [
    'This is your show calendar, starting with the next one on the books.',
    'It helps you see how soon you go LIVE, so you can line up pieces, messages, and your Dance Floor.',
    'Open it to look through your shows, read the details, or set your show time zone.',
  ],
  customers: [
    'This is everyone on your customer list, from shows, your site, and Nic-Nac.',
    'It shows who you can email or text, who is new, who has gone quiet, and whose birthday is coming up, so you can reach them before your next LIVE.',
    'Open a group to work that list.',
  ],
  'dance-floor': [
    'This is your Dance Floor: pieces still listed, pieces that already left, and trades waiting on you.',
    'Use it to choose what to feature in your next LIVE and to keep swaps moving.',
    'Open it to add a piece or answer a request.',
  ],
  messages: [
    'This is your Message Center, with unread notes from Sparkle Suite.',
    'It keeps show updates and customer notes in one place, so nothing sits unseen before you go LIVE.',
    'Open it to read what is waiting.',
  ],
  visitors: [
    'This is who opened your public site recently, including QR scans and where they are.',
    'The busy hours help you time a LIVE for when people are already looking.',
    'Open a visit card to see your site or your QR codes.',
  ],
  'last-month': [
    'This is a snapshot of last month.',
    'Once an earlier month is saved, the arrows show what changed, so you can plan shows, customers, and your Dance Floor.',
    'Open a row to manage that part of your business.',
  ],
}

export function dashboardTipText(id: DashboardTipId) {
  return REP_DASHBOARD_TIPS[id].join(' ')
}
