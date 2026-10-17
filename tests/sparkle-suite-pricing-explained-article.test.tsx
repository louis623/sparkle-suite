import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { publishedArticles } from '@/lib/sparkle-suite/articles'
import { howToGetYourOwnBombPartyRepWebsiteArticle } from '@/lib/sparkle-suite/article-content/how-to-get-your-own-bomb-party-rep-website'
import { sparkleSuitePricingExplainedArticle as article } from '@/lib/sparkle-suite/article-content/sparkle-suite-pricing-explained'
import { whatIsSparkleSuiteArticle } from '@/lib/sparkle-suite/article-content/what-is-sparkle-suite'

const approvedBody = "## How much does Sparkle Suite cost?\n\nThere's a one-time setup fee of $49.99, plus a monthly plan. The Standard plan is $74.99 a month. During the founding-rep beta, a limited number of founding reps who sign up get Founder pricing: $49.99 a month for their first 12 paid months, which is 33% off, then $74.99 a month after that.\n\nJoining the build queue is free. You don't pay anything until we've talked and your build is ready to start.\n\n## What is Founder pricing?\n\nFounder pricing is for founding reps during the beta. These early reps are helping me shape and test Sparkle Suite. They use it in real shows, tell me what works and what doesn't, and help make it better for everyone who comes after. The lower price is my thank-you for that.\n\nHere's how it works:\n\n- **$49.99 a month** for your first 12 paid months.\n- **Then $74.99 a month**, the Standard rate.\n- **For a limited number of founding reps** who sign up.\n\nJoining the queue doesn't hold a Founder spot. Spots go to reps who sign up.\n\n## What is the Standard plan?\n\nThe Standard plan is $74.99 a month, plus the one-time setup fee. It includes the same Sparkle Suite tools.\n\n## What does the setup fee cover?\n\nThe $49.99 setup fee is one-time and non-refundable. It covers getting your site built with me.\n\n## What do I pay at first checkout?\n\nYour first checkout is your first month plus setup:\n\n- **Founder:** $49.99 + $49.99 = $99.98\n- **Standard:** $74.99 + $49.99 = $124.98\n\nTax isn't included in those totals.\n\n## What's included in every plan?\n\n- Your own rep website, built to work on phones, with your choice of look\n- Keep your own domain\n- Live Lineup\n- Live Show Calendar\n- Dance Floor for swap requests\n- Team Management, including a public Join Team page and private onboarding links\n- Message Center\n- Nic-Nac, the assistant in your workspace\n- Help & Resources library of videos and blogs\n\nFor a closer look at each tool, see [what is Sparkle Suite?](https://www.yoursparklesuite.com/faq/articles/what-is-sparkle-suite)\n\n## What's coming soon?\n\nEmail and text updates to your customers are coming soon. When they launch, they'll be included on every plan.\n\n## What happens after I join the queue?\n\n1. **Join the build queue.** It's free.\n2. **Hop on a 30-minute call with me.** We talk through your business, your look and your domain.\n3. **Your build starts** once your first month and setup fee are paid.\n\nHow long the build takes depends on the queue, so I won't promise a date I can't keep. More on the build in [how to get your own Bomb Party rep website](https://www.yoursparklesuite.com/faq/articles/how-to-get-your-own-bomb-party-rep-website).\n\n## Can I keep my domain?\n\nYes. If you already own one, you keep it, and we plan the connection together. Joining the queue doesn't move your existing site or email.\n\n## Quick answers\n\n**Is there a free trial?**\nNo. There's no free trial. Joining the build queue is free, and nothing is paid until your build is ready to start.\n\n**Does Founder pricing last forever?**\nNo. It's $49.99 a month for your first 12 paid months, then $74.99.\n\n**Do I pay to join the queue?**\nNo. Nothing is paid until your build is ready to start.\n\n**Is the setup fee refundable?**\nNo, it's non-refundable.\n\n**Will email and text cost extra?**\nNo. They'll be included on every plan when they launch.\n\n## What's next?\n\nSee current plans on the [pricing section](https://www.yoursparklesuite.com/#pricing), read the [FAQ](https://www.yoursparklesuite.com/faq), and join the build queue when you're ready.\n\nSparkle Suite is an independent tool for Reps and Collectors. We are not affiliated with, endorsed by, sponsored by, or officially connected to Bomb Party."

function visibleCopy(blocks: typeof article.body) {
  return blocks.map((block) => block.type === 'heading' ? `## ${block.text}` :
    block.type === 'list' ? block.items.map((item) => `- ${item}`).join('\n') : block.text).join('\n\n')
    .replace(/(?<=\.)\n\n(?=\d+\. )/g, '\n')
}

const href = 'https://www.yoursparklesuite.com/faq/articles/sparkle-suite-pricing-explained'

describe('Sparkle Suite pricing explained article', () => {
  it('publishes the approved title, description, date, and verbatim body', () => {
    expect(article.slug).toBe('sparkle-suite-pricing-explained')
    expect(article.status).toBe('published')
    expect(article.title).toBe('Sparkle Suite Pricing: Founder, Standard and Setup')
    expect(article.description).toBe('Sparkle Suite costs $74.99/mo plus $49.99 setup. Founding beta reps get $49.99/mo for 12 months. See what every plan includes.')
    expect(article.publishedAt).toBe('2026-10-16T23:59:45Z')
    expect(visibleCopy(article.body)).toBe(approvedBody)
    expect(visibleCopy(article.body)).not.toMatch(/\bfirst 20\b|\b20 reps\b|\b20 founding\b|founder spots remaining|spots left/i)
    expect(visibleCopy(whatIsSparkleSuiteArticle.body)).toContain('for a limited number of founding reps')
    expect(visibleCopy(whatIsSparkleSuiteArticle.body)).not.toMatch(/\bfirst 20\b|\b20 founding\b|founder spots remaining|spots left/i)
    expect(publishedArticles()[0]).toBe(article)
    expect(readFileSync('lib/sparkle-suite/article-content/sparkle-suite-pricing-explained.ts', 'utf8')).not.toMatch(/Suggested meta/)
  })

  it('links the existing plain-text pricing mentions without changing their words', () => {
    const linked = `[Sparkle Suite pricing explained](${href})`
    for (const source of [whatIsSparkleSuiteArticle, howToGetYourOwnBombPartyRepWebsiteArticle]) {
      const copy = visibleCopy(source.body)
      expect(copy).toContain(linked)
      expect(copy.replaceAll(linked, '')).not.toContain('Sparkle Suite pricing explained')
    }
  })
})
