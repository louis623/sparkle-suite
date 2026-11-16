/** Change only after the Chrome Web Store confirms publication to the intended audience.
 * Candidate ZIPs and review submissions are NOT published releases.
 * Disabled until an exact publication time is recorded; no invented historical timestamp.
 */
export const LIVE_LINEUP_RELEASE: {
  protocol: 1; version: string; publishedAt: string | null; rolloutEnabled: boolean
} = Object.freeze({protocol:1,version:'2.0.7',publishedAt:null,rolloutEnabled:false})
