# Brittany Workspace Media Controls Closeout

Date: September 8, 2026

## Outcome

Brittany's grandfathered Britt with Bling site now has Brittany-only Workspace
controls for every customer-facing media area that Louis approved for editing:

- the existing “What is a Bomb Party?” showcase video;
- the About Brittany portrait;
- three optional Sparkle Moment short videos; and
- an explicit switch for publishing or hiding the About Brittany / Sparkle
  Moments section without deleting saved media.

The Workspace preloads the currently visible showcase video and a usable
existing Brittany portrait when the corresponding migrated values are missing
or unplayable. Louis can replace or remove those values, and an explicit
removal remains removed instead of silently restoring a legacy fallback. Empty
Sparkle Moment cards stay off the customer page.

This is scoped to the `brittwithbling` tenant. Ordinary rep settings retain
their existing interface. Brittany also retains the standard customer-site
theme selector; the custom homepage now consumes the normal semantic theme
colors, fonts, surfaces, and shape tokens so changing the theme visibly changes
her customer site.

## Preserved boundaries

- The hero image remains curated and has no upload control.
- “The Rise of Her” remains static and has no Workspace editor.
- Brittany's saved customer data was not changed during implementation or
  smoke testing. The restored About section remains hidden until she or Louis
  explicitly saves and publishes it.
- No extension, Chrome Web Store, email, credit, billing, DNS-provider, Live
  Queue, or unrelated customer change was made.
- Existing `artifacts/` and `test-results/` were preserved.

## Verification

- 195 relevant service, Workspace, Amethyst, Brittany-site, and live-preview
  tests passed in the final focused run.
- The broader Amethyst template suite passed 91 tests. Its local link checks
  subsequently passed with HTTP 200 for Homepage and Dance Floor.
- Two clean production builds passed, including Next.js TypeScript validation
  and static generation.
- Local rendered Brittany page: meaningful content, no framework overlay or
  browser errors, fixed hero present, one Rise iframe, one showcase iframe, and
  hidden unpublished About section.
- Safe synthetic Workspace smoke: opened Tools → Customer-facing site setup,
  removed a showcase video, changed Black Diamond to Rose Gold, saved, and
  confirmed the persisted result with no browser errors. The reusable reviewer
  settings were manually restored to Black Diamond and their original showcase
  video after the test.
- Live `https://www.yoursparklesuite.com/brittwithbling`: HTTP 200 and visual
  smoke passed. Hero, “The Rise of Her,” current showcase video, Dance Floor
  Coming soon language, and hidden unpublished About section were confirmed.
  The apex path redirects to the same www route.
- Vercel inspection confirms both Suite domains resolve to Ready deployment
  `dpl_2QEEHmatFCVaoGV53q45AyYWWFQi`. As expected for this shared Vercel
  project, its configured customer aliases also moved with the production
  deployment; no registrar or DNS record was edited.

The exact signed-in Brittany production Workspace was not opened: verification
used the supported local synthetic reviewer rather than Louis's personal account
or Brittany's customer account. No authentication bypass or repair was attempted.

## Provenance

- Repository: `C:\Users\louis\sparkle-suite-repo`
- GitHub: `louis623/sparkle-suite`
- Branch: `codex/nic-nac-trade-hardening`
- Application commit: `a2e0f467` (`Add Brittany custom site media controls`)
- Deployment: `dpl_2QEEHmatFCVaoGV53q45AyYWWFQi`
- Deployment URL: `https://sparkle-suite-pib5d79zw-louis-2849s-projects.vercel.app`
- Live review URL: `https://www.yoursparklesuite.com/brittwithbling`

## Next step owned by Louis

Louis plans to copy any still-missing media from Brittany's old site. Do not
automatically fetch, upload, publish, or replace that media. Use Brittany's new
Workspace controls when Louis explicitly resumes that work, and publish the
About section only after its chosen portrait/videos are ready.
