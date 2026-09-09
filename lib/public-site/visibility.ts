/** Presentation preferences, never feature entitlements or data deletion. */
export interface PublicSiteVisibility {
  announcements?: boolean
  danceFloor?: boolean
  liveLineup?: boolean
  joinTeam?: boolean
}

export function resolvePublicSiteVisibility(settings: {
  tickerVisible: boolean
  danceFloorVisible?: boolean
  liveLineupVisible?: boolean
  showJoinPage: boolean
  joinTeamAccessEnabled?: boolean
}): PublicSiteVisibility {
  return {
    announcements: settings.tickerVisible,
    danceFloor: settings.danceFloorVisible !== false,
    liveLineup: settings.liveLineupVisible !== false,
    joinTeam: settings.joinTeamAccessEnabled === true && settings.showJoinPage,
  }
}

// Shared presentation layer covers the standard theme and custom renderers,
// including links rewritten to a rep slug or custom domain. No queue mutation.
export function buildPublicSiteVisibilityCss(visibility: PublicSiteVisibility = {}) {
  const selectors: string[] = []
  if (visibility.announcements === false) selectors.push('.hp-ticker-row:not(.reverse)', '.hp-ticker-sr > p:first-child', '.hp-ticker-sr > a:not(:last-child)')
  if (visibility.danceFloor === false) selectors.push('.hp-ticker-row.reverse', '.hp-ticker-sr > a:last-child', 'a[href*="/amethyst/Trade.html"]', 'a[href$="/trade"]', 'a[href*="/trade?"]', 'a[href*="/trade#"]')
  if (visibility.liveLineup === false) selectors.push('.hp-trade-preview', '.hp-lrq', '.hp-queue-modal-mask', '.hp-ticker-sr > p:not(:first-child)')
  if (visibility.joinTeam === false) selectors.push('.mhf-cta-join', '.bwb-cta-join', 'a[href*="/amethyst/Join.html"]', 'a[href$="/join"]', 'a[href*="/join?"]', 'a[href*="/join#"]')
  if (visibility.announcements === false && visibility.danceFloor === false) selectors.push('.hp-ticker')
  return selectors.length ? `${selectors.join(',')} { display: none !important; }` : ''
}

export function buildPublicSiteVisibilityScript(visibility?: PublicSiteVisibility) {
  const css = JSON.stringify(buildPublicSiteVisibilityCss(visibility)).replace(/</g, '\\u003c')
  return `if (typeof document !== 'undefined') { var visibilityStyle = document.getElementById('sparkle-public-site-visibility'); if (!visibilityStyle) { visibilityStyle = document.createElement('style'); visibilityStyle.id = 'sparkle-public-site-visibility'; document.head.appendChild(visibilityStyle); } visibilityStyle.textContent = ${css}; }`
}
