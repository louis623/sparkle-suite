/* Shared powered-by credit for every Amethyst customer page.
   Public pages call <window.SparkleSuiteFooterCredit />. External Suite
   links already open in a new tab via the same rel used by linkProps. */
function SparkleSuiteFooterCredit() {
  return React.createElement(
    'a',
    {
      className: 'ss-powered-by',
      href: 'https://www.yoursparklesuite.com/',
      target: '_blank',
      rel: 'noreferrer noopener',
      'aria-label': "This site's powered by Sparkle Suite (opens in a new tab)",
    },
    "This site's powered by Sparkle Suite",
  )
}

window.SparkleSuiteFooterCredit = SparkleSuiteFooterCredit
