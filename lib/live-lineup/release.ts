/** Louis confirmed publication on November 17, 2026 between 07:15 and 07:30 America/New_York.
 * Use the reported window's upper bound (07:30 EST / 12:30 UTC), not an invented exact Google timestamp.
 * The 24-hour adoption report therefore cannot run earlier than 07:30 EST November 18.
 */
export const LIVE_LINEUP_RELEASE: {
  protocol: 1; version: string; publishedAt: string | null; rolloutEnabled: boolean
} = Object.freeze({protocol:1,version:'2.0.10',publishedAt:'2026-11-17T12:30:00.000Z',rolloutEnabled:true})
