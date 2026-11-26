'use client'

import { useEffect, useRef, useState, type MouseEvent, ReactNode, RefObject } from 'react'
import { flushSync } from 'react-dom'
import {
  ABOUT_NARRATIVE_MAX_LENGTH,
  ABOUT_TITLE_MAX_LENGTH,
} from '@/lib/public-site/about-section'
import { resolveSocialHeroLinks } from '@/lib/public-site/social-hero'
import type { SocialPlatformKey } from '@/lib/public-site/social-visibility'
import type { HeroAnimationType, PublicSiteMediaSlot, PublicSiteMediaSlotKey, SiteSettingsDashboardResult } from '@/lib/services/types'
import { applyHeroMotionSwitch } from '@/lib/amethyst/hero-motion-client'
import visibility from './PublicSiteVisibility.module.css'
import type { SiteSettingsDraft } from '@/app/nic-nac/components/DashboardPlaceholder'
import { HomepageMediaSlot } from './HomepageMediaSlot'
import { PublicSiteVisibility } from './PublicSiteVisibility'
import { SocialHandlesSettings } from './SocialHandlesSettings'
import { SocialPhonePreview } from './SocialPhonePreview'
import styles from './DashboardPlaceholder.module.css'
import {
  buildSiteSetupChecklist,
  openWorkspaceSection,
  SHOWS_ON,
  SETUP_FIELD_IDS,
  siteSectionStatus,
  type SiteSectionId,
} from './site-settings-layout'
import {
  discountCodeFieldError,
  discountMessageFieldError,
  discountOfferFieldError,
  emailFieldError,
  shopLinkFieldError,
  SITE_FIELD_IDS,
} from './site-settings-save'

const EMPTY_SLOTS: PublicSiteMediaSlot[] = [
  { key: 'showcase', caption: '', imageUrl: '', videoUrl: '' },
  { key: 'about_1', caption: '', imageUrl: '', videoUrl: '' },
  { key: 'about_2', caption: '', imageUrl: '', videoUrl: '' },
  { key: 'about_3', caption: '', imageUrl: '', videoUrl: '' },
  { key: 'about_4', caption: '', imageUrl: '', videoUrl: '' },
]

function ShowsOn({ id, children }: { id: string; children: string }) {
  return (
    <span id={id} className={styles.showsOn} data-shows-on="">
      Shows on your site: {children}
    </span>
  )
}

function describedBy(...ids: Array<string | false | null | undefined>) {
  const value = ids.filter(Boolean).join(' ')
  return value || undefined
}

export function SiteSection({
  id,
  number,
  title,
  summary,
  status,
  defaultOpen,
  plain = false,
  hidden = false,
  hideHeading = false,
  children,
}: {
  id: SiteSectionId
  number?: string
  title: string
  summary: string
  status: string
  defaultOpen: boolean
  plain?: boolean
  hidden?: boolean
  hideHeading?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  useEffect(() => {
    const onOpen = (event: Event) => {
      if ((event as CustomEvent<string>).detail === `site-section-${id}`) setOpen(true)
    }
    window.addEventListener('site-section-open', onOpen)
    return () => window.removeEventListener('site-section-open', onOpen)
  }, [id])
  if (hidden) return null
  if (plain) {
    return (
      <section id={`site-section-${id}`} data-site-section={id} className={styles.siteDialogSection}>
        {hideHeading ? null : (
          <>
            <h2 className={styles.siteDialogSectionTitle}>{title}</h2>
            <p className={styles.siteDialogSectionSummary}>{summary}</p>
          </>
        )}
        {children}
      </section>
    )
  }
  return (
    <details
      id={`site-section-${id}`}
      data-site-section={id}
      className={styles.siteSectionDisclosure}
      open={open}
      tabIndex={-1}
      onToggle={(event) => {
        const next = event.currentTarget.open
        setOpen((current) => (current === next ? current : next))
      }}
    >
      <summary className={styles.siteSectionSummary}>
        {number ? (
          <span className={styles.siteSectionIndex} aria-hidden="true">
            {number}
          </span>
        ) : null}
        <span className={styles.siteSectionHeading}>
          <span className={styles.siteSectionTitle}>{title}</span>
          <span className={styles.siteSectionBlurb}>{summary}</span>
        </span>
        <span className={styles.siteSectionChip} data-section-status={status}>
          {status}
        </span>
      </summary>
      <div className={styles.siteSectionBody}>{children}</div>
    </details>
  )
}

const SECTION_SHELLS = [
  ['1', 'top-bar', 'Top bar', 'Your name, store link, and announcements'],
  ['2', 'hero', 'Hero', 'The headline customers see first'],
  ['3', 'upcoming-shows', 'Upcoming shows', 'Shows on your homepage'],
  ['4', 'bomb-party', 'What is a Bomb Party', 'The live reveal explanation'],
  ['5', 'about', 'About you', 'Your photo and story'],
  ['6', 'signup', 'Sign-up discount', 'Customers can choose to join your list and get a one-time code.'],
  ['7', 'footer', 'Footer & socials', 'Tagline, email, social links, and team'],
  ['8', 'other-pages', 'Other pages', 'Dance Floor, Join, and Live Lineup'],
] as const

/** Fixed first paint for My Website. Real settings replace the words without changing the boxes. */
export function SiteSettingsLoadingShell() {
  return (
    <div className={styles.siteSettingsCard} data-site-settings-shell="">
      <div className={styles.myWebsiteHeader} data-site-section="header">
        <p className={styles.myWebsiteKicker}>Public site</p>
        <h1 className={styles.myWebsiteTitle}>My Website</h1>
        <p className={styles.myWebsiteAddress}>Loading your site address</p>
      </div>
      <div className={styles.setupChecklist} data-testid="site-setup-checklist">
        <p className={styles.setupChecklistCount}>Checking what's left to finish</p>
      </div>
      <div className={styles.siteSectionList}>
        {SECTION_SHELLS.map(([number, id, title, summary]) => (
          <details key={id} className={styles.siteSectionDisclosure} data-site-section={id}>
            <summary className={styles.siteSectionSummary}>
              <span className={styles.siteSectionIndex} aria-hidden="true">{number}</span>
              <span className={styles.siteSectionHeading}>
                <span className={styles.siteSectionTitle}>{title}</span>
                <span className={styles.siteSectionBlurb}>{summary}</span>
              </span>
            </summary>
          </details>
        ))}
      </div>
    </div>
  )
}

export function SetupChecklist({ items }: { items: ReturnType<typeof buildSiteSetupChecklist> }) {
  const remaining = items.filter((item) => !item.done)
  if (remaining.length === 0) return null
  const showFirst = () => {
    const item = remaining[0]
    if (!item) return
    const details = document.getElementById(`site-section-${item.section}`)
    if (details) {
      flushSync(() => {
        window.dispatchEvent(new CustomEvent('site-section-open', { detail: details.id }))
      })
    }
    const field = document.getElementById(item.fieldId)
    if (field instanceof HTMLElement) {
      field.focus({ focusVisible: true } as FocusOptions)
    }
  }
  return (
    <div className={styles.setupChecklist} data-testid="site-setup-checklist">
      <p className={styles.setupChecklistCount}>
        {remaining.length === 1 ? '1 thing left to finish' : `${remaining.length} things left to finish`}
      </p>
      <p className={styles.setupChecklistItems}>{remaining.map((item) => item.label).join(' · ')}</p>
      <button type="button" className={styles.setupChecklistButton} onClick={showFirst}>
        Show me
      </button>
    </div>
  )
}

function jumpToSection(event: MouseEvent<HTMLAnchorElement>) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  const id = event.currentTarget.getAttribute('href')?.slice(1)
  if (!id) return
  event.preventDefault()
  const target = document.getElementById(id)
  if (target) {
    flushSync(() => {
      window.dispatchEvent(new CustomEvent('site-section-open', { detail: target.id }))
    })
  }
  target?.scrollIntoView({ block: 'start' })
  if (target instanceof HTMLElement) target.focus()
}

export function SiteMapRail() {
  const links = [
    ['site-section-top-bar', '1 Top bar'],
    ['site-section-hero', '2 Hero'],
    ['site-section-upcoming-shows', '3 Upcoming shows'],
    ['site-section-bomb-party', '4 What is a Bomb Party'],
    ['site-section-about', '5 About you'],
    ['site-section-signup', '6 Sign-up discount'],
    ['site-section-footer', '7 Footer & socials'],
  ] as const
  return (
    <nav className={styles.siteMapRail} aria-label="My Website sections" data-site-map="">
      <p className={styles.siteMapKicker}>Homepage</p>
      <ol className={styles.siteMapList}>
        {links.map(([id, label]) => (
          <li key={id}>
            <a href={`#${id}`} onClick={jumpToSection}>
              {label}
            </a>
          </li>
        ))}
      </ol>
      <p className={styles.siteMapKicker}>Other pages</p>
      <a href="#site-section-other-pages" onClick={jumpToSection}>
        Dance Floor, Join, Live Lineup
      </a>
    </nav>
  )
}

function followWorkspaceLink(event: MouseEvent<HTMLAnchorElement>) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  openWorkspaceSection(event.currentTarget.getAttribute('href') || event.currentTarget.href)
}

export function SiteSettingsBody({
  draft,
  savedSlots,
  joinTeamAccessEnabled,
  isBrittWithBling,
  initialOpenSection,
  initialOpenSections = null,
  emailError,
  shopLinkError,
  discountCodeError,
  discountMessageError,
  socialErrors,
  mediaUploadKey,
  mediaUploadFeedback,
  actionPending,
  tickerRef,
  tickerLinkUrl,
  tickerLinkError,
  tickerLinkSelection,
  hasTickerLinks,
  onDraftChange,
  onSocialHandleChange,
  onHomepageMediaChange,
  onHomepageMediaUpload,
  onHomepageVideoRemove,
  onFieldBlur,
  onSocialBlur,
  onTickerChange,
  onTickerSelect,
  onTickerLinkUrl,
  onAddTickerText,
  onLinkTickerWords,
  onResetTickerLinks,
  sections,
}: {
  draft: SiteSettingsDraft
  savedSlots?: PublicSiteMediaSlot[]
  joinTeamAccessEnabled: boolean
  isBrittWithBling: boolean
  initialOpenSection?: SiteSectionId | null
  initialOpenSections?: SiteSectionId[] | null
  emailError: string | null
  shopLinkError: string | null
  discountCodeError: string | null
  discountMessageError: string | null
  socialErrors: Partial<Record<SocialPlatformKey, string | null>>
  mediaUploadKey?: PublicSiteMediaSlotKey | null
  mediaUploadFeedback?: { key: PublicSiteMediaSlotKey; message: string; tone: 'error' | 'success' } | null
  actionPending?: boolean
  tickerRef: RefObject<HTMLTextAreaElement | null>
  tickerLinkUrl: string
  tickerLinkError: string | null
  tickerLinkSelection: { text: string } | null
  hasTickerLinks: boolean
  onDraftChange?: (patch: Partial<SiteSettingsDraft>) => void
  onSocialHandleChange?: (platform: string, value: string) => void
  onHomepageMediaChange?: (key: PublicSiteMediaSlotKey, patch: Partial<PublicSiteMediaSlot>) => void
  onHomepageMediaUpload?: (key: PublicSiteMediaSlotKey, file: File) => void
  onHomepageVideoRemove?: (key: PublicSiteMediaSlotKey, expectedUrl: string) => void
  onFieldBlur: (id: string, label: string, message: string | null) => void
  onSocialBlur: (platform: SocialPlatformKey) => void
  onTickerChange: (value: string) => void
  onTickerSelect: (selection: { start: number; end: number; text: string } | null) => void
  onTickerLinkUrl: (value: string) => void
  onAddTickerText: (value: string) => void
  onLinkTickerWords: () => void
  onResetTickerLinks: () => void
  sections?: readonly SiteSectionId[]
}) {
  const checklist = buildSiteSetupChecklist(draft)
  const firstGap = checklist.find((item) => !item.done)?.section ?? null
  const openSection = initialOpenSections?.length ? null : initialOpenSection ?? firstGap
  const status = (section: SiteSectionId) => siteSectionStatus({ section, checklist, draft })
  const sectionOpen = (id: SiteSectionId) =>
    initialOpenSections?.includes(id) === true || openSection === id
  const motionMode = draft.heroMotionMode ?? 'choices'
  const rememberedHeroMotion = useRef<HeroAnimationType | null>(
    draft.heroAnimationType !== 'still' ? draft.heroAnimationType : null,
  )
  const slots = draft.homepageMediaSlots ?? EMPTY_SLOTS
  const heroSocials = resolveSocialHeroLinks({
    socialHandles: draft.socialHandles,
    socialVisibility: draft.socialVisibility,
  })
  const discountCode = draft.signupDiscountCode ?? ''
  const discountMessage = draft.signupDiscountMessage ?? ''
  const discountOfferError = discountOfferFieldError(draft.signupDiscountOffer)
  const aboutPortrait = slots.find((slot) => slot.key === 'about_1')

  const showSection = (id: SiteSectionId) => !sections || sections.includes(id)
  const plain = Boolean(sections)
  const slotProps = (slot: PublicSiteMediaSlot) => (
    <HomepageMediaSlot
      key={slot.key}
      slot={slot}
      savedVideoUrl={savedSlots?.find((saved) => saved.key === slot.key)?.videoUrl ?? ''}
      isBrittWithBling={isBrittWithBling}
      allSourcesEnabled={draft.allSourcesEnabled === true}
      tiktokQueueEnabled={draft.tiktokQueueEnabled === true}
      isUploading={mediaUploadKey === slot.key}
      feedback={mediaUploadFeedback?.key === slot.key ? mediaUploadFeedback : null}
      actionPending={actionPending}
      onChange={onHomepageMediaChange}
      onUpload={onHomepageMediaUpload}
      onRemoveVideo={onHomepageVideoRemove}
    />
  )

  return (
    <div className={styles.siteSectionList}>
      <SiteSection plain={plain} hidden={!showSection('top-bar')}
        id="top-bar"
        number="1"
        title="Top bar"
        summary="Your name, store link, and announcements"
        status={status('top-bar')}
        defaultOpen={plain || sectionOpen('top-bar')}
      >
        <div className={styles.siteSettingsGrid}>
          <label className={styles.searchField} data-site-field="business-name">
            <span className={styles.searchLabel}>Business name</span>
            <input
              id={SETUP_FIELD_IDS.businessName}
              className={styles.searchInput}
              data-site-control="business-name"
              value={draft.businessName}
              aria-describedby="business-name-shows"
              autoComplete="organization"
              onChange={(event) => onDraftChange?.({ businessName: event.target.value })}
            />
            <ShowsOn id="business-name-shows">{SHOWS_ON.businessName}</ShowsOn>
          </label>
          <label className={styles.searchField} data-site-field="display-name">
            <span className={styles.searchLabel}>Your first name</span>
            <input
              id={SETUP_FIELD_IDS.displayName}
              className={styles.searchInput}
              data-site-control="display-name"
              value={draft.displayName}
              aria-describedby="display-name-shows"
              autoComplete="given-name"
              onChange={(event) => onDraftChange?.({ displayName: event.target.value })}
            />
            <ShowsOn id="display-name-shows">{SHOWS_ON.displayName}</ShowsOn>
          </label>
          <label className={styles.searchField} data-site-field="shop-link">
            <span className={styles.searchLabel}>Bomb Party rep store link</span>
            <span id={`${SITE_FIELD_IDS.shopLink}-hint`} className={styles.helperNote}>
              This powers the Shop buttons across your customer-facing site. Use the full store URL.
            </span>
            <input
              id={SITE_FIELD_IDS.shopLink}
              className={styles.searchInput}
              data-site-control="shop-link"
              type="url"
              inputMode="url"
              autoComplete="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={draft.shopLink ?? ''}
              aria-invalid={shopLinkError ? 'true' : 'false'}
              aria-describedby={describedBy(
                `${SITE_FIELD_IDS.shopLink}-hint`,
                shopLinkError ? `${SITE_FIELD_IDS.shopLink}-error` : null,
                'shop-link-shows',
              )}
              onBlur={() =>
                onFieldBlur(
                  SITE_FIELD_IDS.shopLink,
                  'Bomb Party rep store link',
                  shopLinkFieldError(draft.shopLink),
                )
              }
              onChange={(event) => onDraftChange?.({ shopLink: event.target.value })}
              placeholder="https://bombparty.com/..."
            />
            {shopLinkError ? (
              <span id={`${SITE_FIELD_IDS.shopLink}-error`} className={styles.fieldError}>
                <span role="img" aria-label="Error">!</span> {shopLinkError}
              </span>
            ) : null}
            <ShowsOn id="shop-link-shows">{SHOWS_ON.shopLink}</ShowsOn>
          </label>
          <label className={`${styles.sortFieldWide}`} data-site-field="ticker-text">
            <span className={styles.searchLabel}>Announcement ticker messages</span>
            <textarea
              ref={tickerRef}
              id="my-website-ticker"
              className={styles.siteSettingsTextarea}
              data-site-control="ticker-text"
              value={draft.tickerText}
              aria-describedby="ticker-shows"
              onChange={(event) => onTickerChange(event.target.value)}
              onSelect={(event) => {
                const textarea = event.currentTarget
                const start = textarea.selectionStart
                const end = textarea.selectionEnd
                onTickerSelect(start === end ? null : { start, end, text: textarea.value.slice(start, end) })
              }}
            />
            <span className={styles.helperNote}>
              Use one announcement per line. Add emojis, then highlight only the words you want to link.
            </span>
            <div className={styles.tickerComposer}>
              <div>
                <span className={styles.searchLabel}>Add an emoji</span>
                <div className={styles.tickerEmojiRow}>
                  {['✨', '💎', '🎥', '🛍️', '🎉', '📣', '⏰', '💖'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className={styles.tickerEmojiButton}
                      data-site-control="ticker-emoji"
                      onClick={() => onAddTickerText(emoji)}
                      aria-label={`Add ${emoji} to the announcement ticker`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className={styles.searchLabel}>Link selected words</span>
                <span className={styles.tickerLinkHint}>
                  {tickerLinkSelection?.text.trim()
                    ? `Ready to link: “${tickerLinkSelection.text}”`
                    : 'Highlight the exact words in your announcement first.'}
                </span>
                <div className={styles.tickerLinkBuilder}>
                  <input
                    className={styles.searchInput}
                    data-site-control="ticker-link-url"
                    type="url"
                    value={tickerLinkUrl}
                    onChange={(event) => onTickerLinkUrl(event.target.value)}
                    placeholder="Paste the destination link"
                    aria-label="Link destination"
                  />
                  <button
                    type="button"
                    className={styles.tickerLinkButton}
                    data-site-control="link-selected-words"
                    onClick={onLinkTickerWords}
                    disabled={!tickerLinkSelection?.text.trim() || !tickerLinkUrl.trim()}
                  >
                    Link selected words
                  </button>
                </div>
                {hasTickerLinks ? (
                  <button
                    type="button"
                    className={styles.tickerLinkResetButton}
                    data-site-control="plain-text-links"
                    onClick={onResetTickerLinks}
                  >
                    Make existing links plain text
                  </button>
                ) : null}
                {hasTickerLinks ? (
                  <span className={styles.tickerLinkHint}>
                    This fixes an older ticker link that made a whole message clickable. Your words stay; only the old link is removed.
                  </span>
                ) : null}
                {tickerLinkError ? <span className={styles.tickerLinkError}>{tickerLinkError}</span> : null}
              </div>
            </div>
            <ShowsOn id="ticker-shows">{SHOWS_ON.ticker}</ShowsOn>
          </label>
        </div>
        <PublicSiteVisibility
          settings={draft}
          joinTeamAccessEnabled={joinTeamAccessEnabled}
          onChange={onDraftChange}
          part="announcements"
        />
      </SiteSection>

      <SiteSection plain={plain} hidden={!showSection('hero')}
        id="hero"
        number="2"
        title="Hero"
        summary="The headline customers see first"
        status={status('hero')}
        defaultOpen={plain || sectionOpen('hero')}
      >
        <div className={styles.siteSettingsGrid}>
          <label className={styles.sortFieldWide} data-site-field="hero-headline">
            <span className={styles.searchLabel}>Big headline</span>
            <input
              id={SETUP_FIELD_IDS.headline}
              className={styles.searchInput}
              data-site-control="hero-headline"
              value={draft.heroHeadline ?? ''}
              maxLength={180}
              aria-describedby="hero-headline-shows"
              onChange={(event) => onDraftChange?.({ heroHeadline: event.target.value })}
            />
            <span className={styles.siteSettingsPreviewNote}>This is the large heading customers see first on your homepage.</span>
            <ShowsOn id="hero-headline-shows">{SHOWS_ON.heroTitle}</ShowsOn>
          </label>
          <label className={styles.sortFieldWide} data-site-field="hero-subtitle">
            <span className={styles.searchLabel}>Line under the headline</span>
            <input
              id="my-website-hero-subtitle"
              className={styles.searchInput}
              data-site-control="hero-subtitle"
              value={draft.heroSubtitle ?? ''}
              maxLength={240}
              aria-describedby="hero-subtitle-shows"
              onChange={(event) => onDraftChange?.({ heroSubtitle: event.target.value })}
            />
            <span className={styles.siteSettingsPreviewNote}>This supporting sentence appears directly beneath the big headline.</span>
            <ShowsOn id="hero-subtitle-shows">{SHOWS_ON.heroSubtitle}</ShowsOn>
          </label>
          <div className={styles.sortFieldWide} data-site-field="hero-socials">
            <span className={styles.searchLabel}>Socials in the hero</span>
            <p className={styles.siteSettingsPreviewNote}>
              {heroSocials.length > 0
                ? `Showing in the hero: ${heroSocials.map((link) => link.label).join(', ')}.`
                : 'No social buttons are set to show in the hero yet.'}
            </p>
            <ShowsOn id="hero-socials-shows">{SHOWS_ON.heroSocials}</ShowsOn>
          </div>
          <div className={styles.sortFieldWide} data-site-field="hero-motion" data-hero-motion-mode={motionMode}>
            {motionMode === 'theme' ? (
              <>
                <p className={styles.siteSettingsPreviewNote} data-site-control="hero-motion" data-chunk="4">
                  Your theme sets the hero animation.
                </p>
                <ShowsOn id="hero-motion-shows">{SHOWS_ON.heroMotion}</ShowsOn>
              </>
            ) : motionMode === 'switch' ? (
              <label className={visibility.row}>
                <span className={styles.heroSwitchCopy}>
                  <span className={styles.searchLabel}>Hero animation</span>
                  <span className={styles.siteSettingsPreviewNote}>
                    Off keeps the hero still. On uses the motion you had before, or Sparkle rise.
                  </span>
                  <ShowsOn id="hero-motion-shows">{SHOWS_ON.heroMotion}</ShowsOn>
                </span>
                <span className={visibility.control}>
                  <input
                    type="checkbox"
                    role="switch"
                    data-site-control="hero-motion"
                    data-chunk="4"
                    checked={draft.heroAnimationType !== 'still'}
                    aria-describedby="hero-motion-shows"
                    ref={(node) => {
                      if (node && !node.hasAttribute('switch')) node.setAttribute('switch', '')
                    }}
                    onChange={(event) => {
                      const next = applyHeroMotionSwitch({
                        on: event.target.checked,
                        current: draft.heroAnimationType,
                        remembered: rememberedHeroMotion.current,
                      })
                      rememberedHeroMotion.current = next.remembered
                      onDraftChange?.({ heroAnimationType: next.heroAnimationType })
                    }}
                  />
                  <span className={visibility.track} aria-hidden="true" />
                  <span className={visibility.status} aria-hidden="true">
                    {draft.heroAnimationType === 'still' ? 'Off' : 'On'}
                  </span>
                </span>
              </label>
            ) : (
              <label>
                <span className={styles.sortLabel}>Hero motion</span>
                <select
                  className={styles.sortSelect}
                  data-site-control="hero-motion"
                  data-chunk="4"
                  value={draft.heroAnimationType}
                  aria-describedby="hero-motion-shows"
                  onChange={(event) => {
                    const heroAnimationType = event.target.value as SiteSettingsDashboardResult['heroAnimationType']
                    if (heroAnimationType !== 'still') rememberedHeroMotion.current = heroAnimationType
                    onDraftChange?.({ heroAnimationType })
                  }}
                >
                  <option value="sparkle_rise">Sparkle rise</option>
                  <option value="soft_glow">Soft glow</option>
                  <option value="still">Still</option>
                </select>
                <span className={styles.siteSettingsPreviewNote}>
                  Hero visuals stay curated by your site appearance so the page keeps its polish on desktop and mobile.
                </span>
                <ShowsOn id="hero-motion-shows">{SHOWS_ON.heroMotion}</ShowsOn>
              </label>
            )}
          </div>
        </div>
      </SiteSection>

      <SiteSection plain={plain} hidden={!showSection('upcoming-shows')}
        id="upcoming-shows"
        number="3"
        title="Upcoming shows"
        summary="Comes from your Calendar"
        status={status('upcoming-shows')}
        defaultOpen={plain || sectionOpen('upcoming-shows')}
      >
        <div data-site-field="upcoming-shows">
          <p className={styles.siteSettingsPreviewNote}>
            Your upcoming shows are edited in Calendar. This page does not load show dates or times.
          </p>
          <a
            className={styles.workspaceSectionLink}
            data-site-control="open-calendar"
            href="/nic-nac?section=show-calendar"
            onClick={followWorkspaceLink}
          >
            Open Calendar
          </a>
          <ShowsOn id="upcoming-shows-shows">{SHOWS_ON.upcomingShows}</ShowsOn>
        </div>
      </SiteSection>

      <SiteSection plain={plain} hidden={!showSection('bomb-party')}
        id="bomb-party"
        number="4"
        title="What is a Bomb Party"
        summary="The live reveal video"
        status={status('bomb-party')}
        defaultOpen={plain || sectionOpen('bomb-party')}
      >
        {slots.filter((slot) => slot.key === 'showcase').map(slotProps)}
      </SiteSection>

      <SiteSection plain={plain} hidden={!showSection('about')}
        id="about"
        number="5"
        title="About you"
        summary="About section: your story, photo, and short videos"
        status={status('about')}
        defaultOpen={plain || sectionOpen('about')}
      >
        <p className={styles.siteSettingsPreviewNote}>
          Add a short title and paste your customer-facing story. Keep it concise so it stays balanced beside your photo.
        </p>
        <div className={styles.siteSettingsGrid}>
          <label className={styles.searchField} data-site-field="about-title">
            <span className={styles.searchLabel}>About title</span>
            <input
              id="my-website-about-heading"
              className={styles.searchInput}
              data-site-control="about-title"
              maxLength={ABOUT_TITLE_MAX_LENGTH}
              placeholder="Meet Brianna"
              value={draft.aboutHeading ?? ''}
              aria-describedby="about-title-shows"
              onChange={(event) => onDraftChange?.({ aboutHeading: event.target.value })}
            />
            <ShowsOn id="about-title-shows">{SHOWS_ON.aboutTitle}</ShowsOn>
          </label>
          <label className={styles.searchField} data-site-field="about-story">
            <span className={styles.searchLabel}>About narrative</span>
            <textarea
              id={SETUP_FIELD_IDS.aboutStory}
              className={styles.siteSettingsTextarea}
              data-site-control="about-story"
              maxLength={ABOUT_NARRATIVE_MAX_LENGTH}
              rows={7}
              placeholder="Paste the story you want customers to read."
              value={draft.aboutNarrative ?? ''}
              aria-describedby="about-story-shows"
              onChange={(event) => onDraftChange?.({ aboutNarrative: event.target.value })}
            />
            <span className={styles.siteSettingsPreviewNote}>
              {(draft.aboutNarrative ?? '').length} / {ABOUT_NARRATIVE_MAX_LENGTH} characters
            </span>
            <ShowsOn id="about-story-shows">{SHOWS_ON.aboutStory}</ShowsOn>
          </label>
        </div>
        <div>
          <div className={styles.walletSettingsTitle}>
            {!draft.allSourcesEnabled && isBrittWithBling ? 'Brittany custom media' : 'Homepage photos and videos'}
          </div>
          <p className={styles.siteSettingsPreviewNote}>
            {draft.allSourcesEnabled
              ? 'Add one portrait photo and up to four videos. Paste a public TikTok, YouTube, Instagram, or Facebook video link into the spot you want. Videos can be up to 3 minutes. Visitors tap Play to watch. Videos already on your site will stay as they are until you remove or replace them. A new video can take 24–48 hours to be ready. Until then, visitors see a card they can tap to watch it on that app.'
              : isBrittWithBling
                ? 'Manage the changeable media on Britt with Bling. Your theme and all standard site settings remain available above.'
                : 'Add one clean portrait photo and up to four customer videos.'}
          </p>
          {isBrittWithBling ? (
            <p className={styles.siteSettingsPreviewNote}>
              Hero and “The Rise of Her” stay managed for this custom site.
            </p>
          ) : null}
        </div>
        {isBrittWithBling ? (
          <label className={styles.walletToggleRow} data-site-field="britt-about-section">
            <span>
              <span className={styles.searchLabel}>Show the About Brittany and Sparkle Moments section</span>
              <span className={styles.helperNote}>
                Empty video spots stay hidden. Turn this off without deleting any saved media.
              </span>
              <ShowsOn id="britt-section-shows">{SHOWS_ON.brittSection}</ShowsOn>
            </span>
            <input
              type="checkbox"
              data-site-control="britt-about-section"
              checked={aboutPortrait?.sectionVisible === true}
              aria-describedby="britt-section-shows"
              onChange={(event) =>
                onHomepageMediaChange?.('about_1', { sectionVisible: event.target.checked })
              }
            />
          </label>
        ) : null}
        <div className={styles.homepageMediaGrid}>
          {!draft.allSourcesEnabled && <aside className={styles.homepageMediaHelp} aria-label="Video links and embeds">
            <strong>Video links and embeds</strong>
            <p>
              Use a public TikTok, YouTube Short, Instagram Reel, or Facebook Reel/video.
              Paste its link or the platform&apos;s embed code into the video spot you want.
              {draft.tiktokQueueEnabled
                ? 'TikTok videos are added to your site by the Sparkle Suite team within 24–48 hours. Until then, your site shows a tap-to-watch TikTok card.'
                : 'TikTok and YouTube play muted, loop, and do not show a pause control.'}
              Instagram and Facebook use their native player controls.
            </p>
          </aside>}
          {slots.filter((slot) => slot.key !== 'showcase').map(slotProps)}
        </div>
      </SiteSection>

      <SiteSection plain={plain} hidden={!showSection('signup')}
        id="signup"
        number="6"
        title="Sign-up discount"
        summary="Customers can choose to join your list and get a one-time code."
        status={status('signup')}
        defaultOpen={plain || sectionOpen('signup')}
        hideHeading={plain}
      >
        <label className={styles.walletToggleRow} data-site-field="signup-switch">
          <span>
            <span className={styles.searchLabel}>Show a discount code after customers sign up for updates</span>
            <ShowsOn id="signup-switch-shows">{SHOWS_ON.signupSwitch}</ShowsOn>
          </span>
          <input
            type="checkbox"
            role="switch"
            data-site-control="signup-switch"
            checked={draft.signupDiscountEnabled === true}
            aria-describedby="signup-switch-shows"
            onChange={(event) => onDraftChange?.({ signupDiscountEnabled: event.target.checked })}
          />
        </label>
        <div className={styles.siteSettingsGrid}>
          <label className={styles.searchField} data-site-field="discount-code">
            <span className={styles.searchLabel}>Code</span>
            <input
              id={SITE_FIELD_IDS.discountCode}
              className={styles.searchInput}
              data-site-control="discount-code"
              value={discountCode}
              maxLength={40}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={discountCodeError ? 'true' : 'false'}
              aria-describedby={describedBy(
                discountCodeError ? `${SITE_FIELD_IDS.discountCode}-error` : null,
                'discount-code-shows',
              )}
              onBlur={() =>
                onFieldBlur(
                  SITE_FIELD_IDS.discountCode,
                  'Discount code',
                  discountCodeFieldError(discountCode, draft.signupDiscountEnabled),
                )
              }
              onChange={(event) => onDraftChange?.({ signupDiscountCode: event.target.value })}
            />
            {discountCodeError ? (
              <span id={`${SITE_FIELD_IDS.discountCode}-error`} className={styles.fieldError}>
                <span role="img" aria-label="Error">!</span> {discountCodeError}
              </span>
            ) : null}
            <ShowsOn id="discount-code-shows">{SHOWS_ON.discountCode}</ShowsOn>
          </label>
          <label className={styles.searchField} data-site-field="discount-offer">
            <span className={styles.searchLabel}>What they get</span>
            <input
              id={SITE_FIELD_IDS.discountOffer}
              className={styles.searchInput}
              data-site-control="discount-offer"
              value={draft.signupDiscountOffer ?? ''}
              maxLength={40}
              placeholder="Free shipping"
              aria-invalid={discountOfferError ? 'true' : 'false'}
              aria-describedby={describedBy(
                'discount-offer-example',
                discountOfferError ? `${SITE_FIELD_IDS.discountOffer}-error` : null,
                'discount-offer-shows',
              )}
              onBlur={() =>
                onFieldBlur(
                  SITE_FIELD_IDS.discountOffer,
                  'What they get',
                  discountOfferFieldError(draft.signupDiscountOffer),
                )
              }
              onChange={(event) => onDraftChange?.({ signupDiscountOffer: event.target.value })}
            />
            <span id="discount-offer-example" className={styles.helperNote}>
              For example, 15% off your next order.
            </span>
            {discountOfferError ? (
              <span id={`${SITE_FIELD_IDS.discountOffer}-error`} className={styles.fieldError}>
                <span role="img" aria-label="Error">!</span> {discountOfferError}
              </span>
            ) : null}
            <ShowsOn id="discount-offer-shows">{SHOWS_ON.discountOffer}</ShowsOn>
          </label>
          <label className={styles.searchField} data-site-field="discount-message">
            <span className={styles.searchLabel}>Message shown with your code</span>
            <input
              id={SITE_FIELD_IDS.discountMessage}
              className={styles.searchInput}
              data-site-control="discount-message"
              value={discountMessage}
              maxLength={140}
              aria-invalid={discountMessageError ? 'true' : 'false'}
              aria-describedby={describedBy(
                'signup-discount-message-count',
                discountMessageError ? `${SITE_FIELD_IDS.discountMessage}-error` : null,
                'discount-message-shows',
              )}
              onBlur={() =>
                onFieldBlur(
                  SITE_FIELD_IDS.discountMessage,
                  'Discount message',
                  discountMessageFieldError(discountMessage),
                )
              }
              onChange={(event) => onDraftChange?.({ signupDiscountMessage: event.target.value })}
            />
            <span id="signup-discount-message-count" className={styles.helperNote}>
              {discountMessage.length}/140 · Plain text
            </span>
            {discountMessageError ? (
              <span id={`${SITE_FIELD_IDS.discountMessage}-error`} className={styles.fieldError}>
                <span role="img" aria-label="Error">!</span> {discountMessageError}
              </span>
            ) : null}
            <ShowsOn id="discount-message-shows">{SHOWS_ON.discountMessage}</ShowsOn>
          </label>
        </div>
        <p className={styles.helperNote}>Suite only shows this code. Set up the code itself in Bomb Party first.</p>
      </SiteSection>

      <SiteSection plain={plain} hidden={!showSection('footer')}
        id="footer"
        number="7"
        title="Footer & socials"
        summary="Tagline, email, social links, and team"
        status={status('footer')}
        defaultOpen={plain || sectionOpen('footer')}
        hideHeading={plain}
      >
        <div className={plain ? styles.socialPanes : undefined}>
        <div>
        {plain ? (
          <>
            <h2 className={styles.siteDialogSectionTitle}>Contact</h2>
            <p className={styles.siteDialogSectionSummary}>Your email shows on the Join page. The tagline and team line appear in small print on your site.</p>
          </>
        ) : null}
        <div className={styles.siteSettingsGrid}>
          <label className={styles.searchField} data-site-field="email">
            <span className={styles.searchLabel}>Email</span>
            <input
              id={SITE_FIELD_IDS.email}
              className={styles.searchInput}
              data-site-control="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={draft.email}
              aria-invalid={emailError ? 'true' : 'false'}
              aria-describedby={plain
                ? (emailError ? `${SITE_FIELD_IDS.email}-error` : undefined)
                : describedBy(emailError ? `${SITE_FIELD_IDS.email}-error` : null, 'email-shows')}
              onBlur={() => onFieldBlur(SITE_FIELD_IDS.email, 'Email', emailFieldError(draft.email))}
              onChange={(event) => onDraftChange?.({ email: event.target.value })}
            />
            {emailError ? (
              <span id={`${SITE_FIELD_IDS.email}-error`} className={styles.fieldError}>
                <span role="img" aria-label="Error">!</span> {emailError}
              </span>
            ) : null}
            {plain ? null : <ShowsOn id="email-shows">{SHOWS_ON.email}</ShowsOn>}
          </label>
          <label className={styles.searchField} data-site-field="tagline">
            <span className={styles.searchLabel}>Footer tagline</span>
            <input
              id="my-website-tagline"
              className={styles.searchInput}
              data-site-control="tagline"
              value={draft.tagline}
              aria-describedby={plain
                ? (draft.grandfatheredHeadlineFallback ? 'tagline-grandfathered' : undefined)
                : describedBy(
                  draft.grandfatheredHeadlineFallback ? 'tagline-grandfathered' : null,
                  'tagline-shows',
                )}
              onChange={(event) => onDraftChange?.({ tagline: event.target.value })}
            />
            {draft.grandfatheredHeadlineFallback ? (
              <span id="tagline-grandfathered" className={styles.siteSettingsPreviewNote}>
                Also shows under your headline if that line is empty.
              </span>
            ) : null}
            {plain ? null : <ShowsOn id="tagline-shows">{SHOWS_ON.tagline}</ShowsOn>}
          </label>
          <label className={styles.searchField} data-site-field="member-team">
            <span className={styles.searchLabel}>Team I belong to (shown in small print)</span>
            <input
              id="my-website-member-team"
              className={styles.searchInput}
              data-site-control="member-team"
              value={draft.memberTeamName ?? ''}
              aria-describedby={plain ? undefined : 'member-team-shows'}
              onChange={(event) => onDraftChange?.({ memberTeamName: event.target.value })}
            />
            {plain ? null : <ShowsOn id="member-team-shows">{SHOWS_ON.memberTeam}</ShowsOn>}
          </label>
          <div className={plain ? styles.searchField : styles.sortFieldWide} data-site-field="team-i-manage">
            <span className={styles.searchLabel}>Team I manage</span>
            <p className={plain ? `${styles.managedTeamLine} ${styles.managedTeamBox}` : styles.managedTeamLine} data-site-control="team-i-manage" data-chunk="4">
              {draft.teamName.trim() || 'Not set yet'}
              {' · '}
              <a
                className={styles.managedTeamLink}
                href="/nic-nac?section=team-management"
                onClick={followWorkspaceLink}
              >
                Edit in Team settings
              </a>
            </p>
            {plain ? null : <ShowsOn id="team-manage-shows">{SHOWS_ON.managedTeam}</ShowsOn>}
          </div>
        </div>
        {plain ? (
          <>
            <h2 className={styles.siteDialogSectionTitle}>Social links</h2>
            <p className={styles.siteDialogSectionSummary}>Paste a link, then choose On site or In hero. The preview shows what customers will see.</p>
          </>
        ) : null}
        <SocialHandlesSettings
          socialHandles={draft.socialHandles}
          socialVisibility={draft.socialVisibility}
          errors={socialErrors}
          onBlur={onSocialBlur}
          onSocialHandleChange={onSocialHandleChange}
          onSocialVisibilityChange={(socialVisibility) => onDraftChange?.({ socialVisibility })}
        />
        </div>
        {plain ? (
          <SocialPhonePreview
            businessName={draft.businessName}
            displayName={draft.displayName}
            tagline={draft.tagline}
            socialHandles={draft.socialHandles}
            socialVisibility={draft.socialVisibility}
          />
        ) : null}
        </div>
      </SiteSection>

      <SiteSection plain={plain} hidden={!showSection('other-pages')}
        id="other-pages"
        title="Other pages"
        summary="Dance Floor, Join Team, and Live Lineup"
        status={status('other-pages')}
        defaultOpen={plain || sectionOpen('other-pages')}
      >
        <PublicSiteVisibility
          settings={draft}
          joinTeamAccessEnabled={joinTeamAccessEnabled}
          onChange={onDraftChange}
          part="pages"
          onWorkspaceLink={followWorkspaceLink}
        />
      </SiteSection>
    </div>
  )
}
