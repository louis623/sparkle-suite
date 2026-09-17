import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  buildAmethystJoinBootstrapScript,
  buildAmethystJoinTweakDefaults,
  defaultAmethystJoinTemplateData,
} from '@/lib/amethyst/join-template-data'

describe('Amethyst join page template data wiring', () => {
  it('ships mobile hero typography safeguards for narrow customer screens', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'public/amethyst/join.css'),
      'utf8',
    )

    expect(css).toMatch(/@media\s+\(max-width:\s*640px\)[\s\S]*?\.jp-hero-card[\s\S]*?box-sizing:\s*border-box;/)
    expect(css).toMatch(/@media\s+\(max-width:\s*640px\)[\s\S]*?\.jp-hero-inner[\s\S]*?width:\s*100vw;/)
    expect(css).toMatch(/@media\s+\(max-width:\s*640px\)[\s\S]*?\.jp-hero-inner[\s\S]*?margin-inline:\s*calc\(50% - 50vw\);/)
    expect(css).toMatch(/@media\s+\(max-width:\s*640px\)[\s\S]*?\.jp-hero-card[\s\S]*?width:\s*calc\(100vw - 48px\);/)
    expect(css).toMatch(/@media\s+\(max-width:\s*640px\)[\s\S]*?\.jp-hero-card[\s\S]*?max-width:\s*340px;/)
    expect(css).toMatch(/\.jp-hero-title\s*\{[\s\S]*?line-height:\s*1\.1;/)
    expect(css).toMatch(/\.jp-hero-title\s*\{[\s\S]*?padding-block:\s*0\.04em 0\.12em;/)
    expect(css).toMatch(/\.jp-hero-title\s*\{[\s\S]*?overflow:\s*visible;/)
    expect(css).toMatch(/\.jp-section-title\s*\{[\s\S]*?line-height:\s*1\.12;/)
    expect(css).toMatch(/\.jp-section-title\s*\{[\s\S]*?padding-block:\s*0\.03em 0\.09em;/)
    expect(css).toMatch(/\.jp-final-title\s*\{[\s\S]*?line-height:\s*1\.12;/)
    expect(css).toMatch(/@media\s+\(max-width:\s*640px\)[\s\S]*?\.jp-hero-title[\s\S]*?font-size:\s*clamp\(32px,\s*9\.6vw,\s*44px\);/)
    expect(css).toMatch(/@media\s+\(max-width:\s*640px\)[\s\S]*?\.jp-hero-title[\s\S]*?max-width:\s*10ch;/)
    expect(css).toMatch(/@media\s+\(max-width:\s*640px\)[\s\S]*?\.jp-hero-title[\s\S]*?overflow-wrap:\s*anywhere;/)
    expect(css).toMatch(/@media\s+\(max-width:\s*640px\)[\s\S]*?\.jp-hero-promo[\s\S]*?max-width:\s*100%;/)
    expect(css).toMatch(/@media\s+\(max-width:\s*640px\)[\s\S]*?\.jp-hero-promo[\s\S]*?display:\s*flex;/)
    expect(css).toMatch(/@media\s+\(max-width:\s*640px\)[\s\S]*?\.jp-hero-promo[\s\S]*?box-sizing:\s*border-box;/)
    expect(css).toMatch(/@media\s+\(max-width:\s*640px\)[\s\S]*?\.jp-hero-promo[\s\S]*?white-space:\s*normal;/)
    expect(css).toMatch(/@media\s+\(max-width:\s*640px\)[\s\S]*?\.jp-hero-pitch[\s\S]*?overflow-wrap:\s*anywhere;/)
    expect(css).toMatch(/@media\s+\(max-width:\s*640px\)[\s\S]*?\.jp-hero-pitch[\s\S]*?max-width:\s*24ch;/)
  })

  it('maps structured editable content into the locked join-page tweak defaults', () => {
    const defaults = buildAmethystJoinTweakDefaults(
      defaultAmethystJoinTemplateData,
    )

    expect(defaults.teamName).toBe(defaultAmethystJoinTemplateData.teamName)
    expect(defaults.repName).toBe(defaultAmethystJoinTemplateData.repName)
    expect(defaults.repCity).toBe(defaultAmethystJoinTemplateData.repCity)
    expect(defaults.repState).toBe(defaultAmethystJoinTemplateData.repState)
    expect(defaults.businessName).toBe(
      defaultAmethystJoinTemplateData.businessName,
    )
    expect(defaults.teamMemberCount).toBe(
      defaultAmethystJoinTemplateData.teamMembers.length,
    )
    expect(defaults.promoText).toBe(defaultAmethystJoinTemplateData.promoText)
    expect(defaults.heroPitch).toBe(defaultAmethystJoinTemplateData.heroPitch)
    expect(defaults.heroCtaText).toBe(
      defaultAmethystJoinTemplateData.heroCtaText,
    )
    expect(defaults.finalPitch).toBe(defaultAmethystJoinTemplateData.finalPitch)
    expect(defaults.bpReferralUrl).toBe(
      defaultAmethystJoinTemplateData.bpReferralUrl,
    )
    expect(defaults.tickerTopText).toBe(
      defaultAmethystJoinTemplateData.tickerTopText,
    )
  })

  it('serializes the full editable join-page payload for the locked export runtime', () => {
    const script = buildAmethystJoinBootstrapScript(
      defaultAmethystJoinTemplateData,
    )

    expect(script).toContain('window.AMETHYST_JOIN_TEMPLATE_DATA')
    expect(script).toContain('"teamMembers"')
    expect(script).toContain('"faqAnswers"')
    expect(script).toContain('"footerTagline"')
    expect(script).toContain('"legalDisclaimer"')
    expect(script).toContain('"repCity"')
    expect(script).toContain('"bpIncomeDisclosureUrl"')
    expect(script).toContain('"shopUrl"')
    expect(script).toContain('"repSocialLinks"')
    expect(script).toContain('"socialLinks"')
    expect(script).toContain('"footerLinks"')
  })

  it('loads the runtime bootstrap script before the locked join-page export', () => {
    const html = readFileSync(
      resolve(process.cwd(), 'public/amethyst/Join.html'),
      'utf8',
    )

    expect(html).toContain(
      '<script src="template-loader.js" data-template-src="/api/amethyst/join-template"></script>',
    )
    expect(html.indexOf('template-loader.js')).toBeLessThan(
      html.indexOf('join-runtime.js'),
    )
    expect(html).not.toContain('react.development')
    expect(html).not.toContain('@babel/standalone')
    expect(html).not.toContain('type="text/babel"')
    expect(html).not.toContain('join.jsx')
    expect(
      readFileSync(
        resolve(process.cwd(), 'public/amethyst/join-runtime.js'),
        'utf8',
      ).length,
    ).toBeGreaterThan(10_000)
  })

  it('ships crawl and sharing metadata with the locked join export', () => {
    const html = readFileSync(
      resolve(process.cwd(), 'public/amethyst/Join.html'),
      'utf8',
    )

    expect(html).toContain(
      '<meta name="description" content="Learn how to join Sparkle by Sasha and build a Bomb Party business with practical support from an active team." />',
    )
    expect(html).toContain(
      '<link rel="canonical" href="https://www.yoursparklesuite.com/amethyst/Join.html" />',
    )
    expect(html).toContain('<meta name="robots" content="index,follow" />')
    expect(html).toContain(
      '<meta property="og:title" content="Sparkle by Sasha - Join the Team" />',
    )
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />')
  })

  it('uses the shared top navigation pattern on the locked join-page export', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/join.jsx'),
      'utf8',
    )

    expect(jsx).toContain('className="hp-header-nav"')
    expect(jsx).toContain('function SocialLogo')
    expect(jsx).toContain('<SocialLogo {...link} />')
    expect(jsx).toContain('aria-label={link.label}')
    expect(jsx).toContain('Dance Floor')
    expect(jsx).toContain('Join Team')
    expect(jsx).toContain('"/amethyst/Homepage.html"')
  })

  it('renders honest non-link actions instead of dead starter-pack anchors', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/join.jsx'),
      'utf8',
    )

    expect(jsx).toContain('function RecruitingAction')
    expect(jsx).toContain('enabled={hasRecruitingLink}')
    expect(jsx).toContain('Ask ${repName} for current join details')
    expect(jsx).toContain('No additional public team cards have been added yet')
    expect(jsx).not.toContain("Earn from your shows and a cut of your team's")
    expect(jsx).not.toContain('The product practically sells itself')
  })

  it('does not render a duplicate leader card when the editable roster already includes the rep', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/join.jsx'),
      'utf8',
    )
    const css = readFileSync(
      resolve(process.cwd(), 'public/amethyst/join.css'),
      'utf8',
    )

    expect(jsx).toContain('const leaderAlreadyAppearsInRoster')
    expect(jsx).toContain('{!leaderAlreadyAppearsInRoster && <TeamCard member={rep} isLeader />}')
    expect(jsx).toContain('const LEAD_IMAGE_URL = runtimeText(CONTENT.repImageUrl)')
    expect(jsx).toContain('imageUrl: LEAD_IMAGE_URL || undefined')
    expect(css).toContain('.jp-hero-eyebrow::after')
  })

  it('renders the sticky live reveal queue strip below the ticker on the join page', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/join.jsx'),
      'utf8',
    )
    const css = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.css'),
      'utf8',
    )

    expect(jsx).toContain('function LiveQueueStrip')
    expect(jsx).toContain('className="hp-trade-preview"')
    expect(jsx).toContain('Live Lineup')
    expect(jsx).toContain('View full lineup')
    expect(jsx).toContain('function LiveQueueModal')
    expect(jsx).toContain('entries.map((entry) =>')
    expect(jsx).not.toContain('entries.slice(0, 4)')
    expect(jsx).not.toContain('Next to reveal')
    expect(jsx).not.toContain('Open dance floor')
    expect(css).toContain('.hp-queue-modal-mask')
  })

  it('centers the join hero card and its contents to match the sections below', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'public/amethyst/join.css'),
      'utf8',
    )

    expect(css).toContain('justify-content: center;')
    expect(css).toContain('text-align: center;')
    expect(css).toContain('margin: 0 auto;')
  })

  it('ships the Sparkle Suite/Morganite skin in the local join preset picker', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/join.jsx'),
      'utf8',
    )
    const html = readFileSync(
      resolve(process.cwd(), 'public/amethyst/Join.html'),
      'utf8',
    )

    expect(jsx).toContain('sparkle_suite_morganite')
    expect(jsx).toContain('Sparkle Suite/Morganite')
    expect(html).toContain('DM+Sans')
    expect(html).toContain('Playfair+Display')
  })

  it('ships the Black Diamond skin in the local join preset picker', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/join.jsx'),
      'utf8',
    )
    const html = readFileSync(
      resolve(process.cwd(), 'public/amethyst/Join.html'),
      'utf8',
    )

    expect(jsx).toContain('black_diamond')
    expect(jsx).toContain('Black Diamond')
    expect(jsx).toContain('moonstone')
    expect(jsx).toContain('Moonstone')
    expect(html).toContain('DM+Sans')
    expect(html).toContain('Playfair+Display')
  })

  it('ships the Rose Gold skin in the local join preset picker', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/join.jsx'),
      'utf8',
    )
    const html = readFileSync(
      resolve(process.cwd(), 'public/amethyst/Join.html'),
      'utf8',
    )

    expect(jsx).toContain('rose_gold')
    expect(jsx).toContain('Rose Gold')
    expect(html).toContain('DM+Sans')
    expect(html).toContain('Playfair+Display')
  })

  it('ships the approved batch skins in the local join preset picker', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/join.jsx'),
      'utf8',
    )
    const html = readFileSync(
      resolve(process.cwd(), 'public/amethyst/Join.html'),
      'utf8',
    )

    expect(jsx).toContain('garnet')
    expect(jsx).toContain('Garnet')
    expect(jsx).toContain('amber')
    expect(jsx).toContain('Amber')
    expect(jsx).toContain('alpine_opal')
    expect(jsx).toContain('Alpine Opal')
    expect(jsx).toContain('emerald_garden')
    expect(jsx).toContain('Emerald Garden')
    expect(jsx).toContain('velvet')
    expect(jsx).toContain('Velvet')
    expect(jsx).toContain('rose_quartz')
    expect(jsx).toContain('Rose Quartz')
    expect(html).toContain('Bitter')
    expect(html).toContain('Nunito')
    expect(html).toContain('Great+Vibes')
    expect(html).toContain('Cormorant+Garamond')
    expect(html).toContain('Lato')
  })

  it('does not ship legacy placeholder skins in the local join preset picker', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/join.jsx'),
      'utf8',
    )

    expect(jsx).not.toContain('value: "editorial"')
    expect(jsx).not.toContain('value: "softGlam"')
    expect(jsx).not.toContain('value: "sparkleParty"')
    expect(jsx).not.toContain('value: "maximum", label: "Maximum"')
    expect(jsx).not.toContain('label: "Editorial"')
    expect(jsx).not.toContain('label: "Soft Glam"')
    expect(jsx).not.toContain('label: "Sparkle Party"')
  })

  it('includes localized wrappers and a Bomb Party IDS link on the join page', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/join.jsx'),
      'utf8',
    )

    expect(jsx).toContain('Bomb Party Income Disclosure Statement')
    expect(jsx).toContain('document.title = `Join ${t.teamName} | ${repName}')
    expect(jsx).toContain('Rep city')
    expect(jsx).toContain('rep city and state')
    expect(jsx).toContain('Proud member of the {CONTENT.memberTeamName} team')
  })

  it('clips lead and member team-card photos to the circular avatar disc', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'public/amethyst/join.css'),
      'utf8',
    )
    const html = readFileSync(
      resolve(process.cwd(), 'public/amethyst/Join.html'),
      'utf8',
    )

    expect(css).toMatch(/\.jp-team-avatar\s*\{[^}]*border-radius:\s*50%;/)
    expect(css).toMatch(/\.jp-team-avatar\s*\{[^}]*overflow:\s*hidden;/)
    expect(css).toMatch(/\.jp-team-avatar-img\s*\{[^}]*object-fit:\s*cover;/)
    expect(css).toMatch(/\.jp-team-avatar-img\s*\{[^}]*border-radius:\s*50%;/)
    expect(html).toContain('join.css?v=20260917-team-social-lead-photo-avatar-clip-v1')
    expect(html).toContain('join-runtime.js?v=20260917-team-social-lead-photo-avatar-clip-v1')
  })

  it('renders shared SVG social marks on team cards and hides empty or hash hrefs', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/join.jsx'),
      'utf8',
    )
    const css = readFileSync(
      resolve(process.cwd(), 'public/amethyst/join.css'),
      'utf8',
    )
    const runtime = readFileSync(
      resolve(process.cwd(), 'public/amethyst/join-runtime.js'),
      'utf8',
    )

    expect(jsx).toContain('import { SocialMark }')
    expect(jsx).toContain('isLiveSocialHref')
    expect(jsx).toContain('function TeamConnect')
    expect(jsx).not.toContain('return <span title="TikTok">TT</span>')
    expect(jsx).not.toContain('return <span title="Facebook">FB</span>')
    expect(jsx).not.toContain('return <span title="YouTube">YT</span>')
    expect(jsx).not.toContain('return <span title="Whatnot">WN</span>')
    expect(jsx).toContain('aria-label={label}')
    expect(jsx).toContain('function SocialLogo')
    expect(jsx).toContain('hp-footer-social-logo')

    expect(css).toMatch(/\.jp-team-social\s*\{[\s\S]*?min-width:\s*44px;/)
    expect(css).toMatch(/\.jp-team-social\s*\{[\s\S]*?min-height:\s*44px;/)
    expect(css).toContain('.jp-team-social-logo')
    expect(css).toContain('.jp-team-social-logo-stroke')

    expect(runtime).toContain('M16.6 3c.4 2.4 1.9 4 4.2 4.3')
    expect(runtime).not.toContain('title:"TikTok"')
    expect(runtime).not.toContain('title:"Whatnot"')
  })
})
