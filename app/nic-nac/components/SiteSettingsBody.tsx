'use client'

import { useEffect, useState, type MouseEvent, ReactNode, RefObject } from 'react'
import { flushSync } from 'react-dom'
import {
  ABOUT_NARRATIVE_MAX_LENGTH,
  ABOUT_TITLE_MAX_LENGTH,
} from '@/lib/public-site/about-section'
import { resolveSocialHeroLinks, resolveSocialPlatformUrl } from '@/lib/public-site/social-hero'
import type { SocialPlatformKey } from '@/lib/public-site/social-visibility'
import type { PublicSiteMediaSlot, PublicSiteMediaSlotKey } from '@/lib/services/types'
import type { SiteSettingsDraft } from '@/app/nic-nac/components/DashboardPlaceholder'
import { AboutMarquee, AboutShortRail, aboutPhotoStyle } from './AboutYouPanels'
import { LookEmojiPicker } from './LookEmojiPicker'
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

function splitTicker(line: string) {
  const parts: Array<{ text: string; url?: string; raw: string }> = []
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^()\s]+)\)/g
  let last = 0
  for (const match of line.matchAll(pattern)) {
    const index = match.index ?? 0
    if (index > last) parts.push({ text: line.slice(last, index), raw: line.slice(last, index) })
    parts.push({ text: match[1], url: match[2], raw: match[0] })
    last = index + match[0].length
  }
  if (last < line.length || parts.length === 0) parts.push({ text: line.slice(last), raw: line.slice(last) })
  return parts
}

function TickerChips({
  text,
  onChange,
  onSelect,
  textareaRef,
}: {
  text: string
  onChange: (next: string) => void
  onSelect: (selection: { start: number; end: number; text: string } | null) => void
  textareaRef: RefObject<HTMLTextAreaElement | null>
}) {
  const lines = text.length > 0 ? text.split('\n') : ['']
  const lineStart = (index: number) => lines.slice(0, index).reduce((count, line) => count + line.length + 1, 0)
  const rememberCaret = (start: number, end: number) => {
    textareaRef.current?.setSelectionRange(start, end)
    onSelect(start === end ? null : { start, end, text: text.slice(start, end) })
  }
  const writeLine = (index: number, nextLine: string) => {
    const next = lines.slice()
    next[index] = nextLine
    onChange(next.join('\n'))
  }
  return (
    <div className={styles.lookChipBlock}>
      {lines.map((line, index) => {
        const parts = splitTicker(line)
        return (
          <p key={index} className={styles.lookChipLine}>
            {parts.map((part, partIndex) => {
              const before = parts.slice(0, partIndex).reduce((count, item) => count + item.raw.length, 0)
              if (part.url) {
                return (
                  <button
                    key={partIndex}
                    type="button"
                    className={styles.lookChip}
                    onClick={() => writeLine(index, parts.map((item, itemIndex) => itemIndex === partIndex ? part.text : item.raw).join(''))}
                  >
                    {part.text}
                    <span aria-hidden="true"> ×</span>
                    <span className={styles.visuallyHidden}>Remove link</span>
                  </button>
                )
              }
              return (
                <input
                  key={partIndex}
                  className={styles.lookChipText}
                  value={part.text}
                  aria-label={`Announcement ${index + 1}`}
                  style={{ width: `${Math.max(part.text.length, 12)}ch` }}
                  onChange={(event) => {
                    const nextParts = parts.map((item, itemIndex) => itemIndex === partIndex ? event.target.value.replace(/\n/g, ' ') : item.raw)
                    writeLine(index, nextParts.join(''))
                  }}
                  onSelect={(event) => {
                    const input = event.currentTarget
                    const start = lineStart(index) + before + (input.selectionStart ?? 0)
                    const end = lineStart(index) + before + (input.selectionEnd ?? input.selectionStart ?? 0)
                    rememberCaret(start, end)
                  }}
                />
              )
            })}
          </p>
        )
      })}
      <button type="button" className={styles.lookAddLine} onClick={() => onChange(text.length > 0 ? `${text}\n` : '')}>Add a line</button>
      <div className={styles.lookMarquee} aria-hidden="true"><span>{lines.map((line) => splitTicker(line).map((part) => part.text).join('')).filter(Boolean).join('   ·   ') || 'Your announcements will scroll here'}</span></div>
    </div>
  )
}

function LookHeroArt({ image, colors }: { image?: string | null; colors?: readonly string[] }) {
  const [failed, setFailed] = useState(false)
  const gradient = `linear-gradient(160deg, ${colors?.[0] ?? '#f6a9c8'}, ${colors?.[1] ?? '#e0458f'} 55%, ${colors?.[2] ?? '#7a1f55'})`
  const showImage = Boolean(image) && !failed
  return (
    <div className={styles.lookHeroArt} style={{ backgroundImage: showImage ? `url(${image})` : gradient }}>
      {image && !failed ? <img src={image} alt="" hidden onError={() => setFailed(true)} /> : null}
    </div>
  )
}

function ShowsOn({ id, children, legend, caption }: { id: string; children: string; legend?: boolean; caption?: string }) {
  if (!legend) {
    return (
      <span id={id} className={styles.showsOn} data-shows-on="">
        Shows on your site: {children}
      </span>
    )
  }
  return (
    <span id={id} className={styles.lookShows} data-shows-on="">
      <span className={styles.visuallyHidden}>Shows on your site: {children}</span>
      <span aria-hidden="true">{caption ?? children}</span>
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
  className,
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
  className?: string
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
      <section id={`site-section-${id}`} data-site-section={id} className={className ? `${styles.siteDialogSection} ${className}` : styles.siteDialogSection}>
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
  onMediaCommit,
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
  magazine = false,
  heroBackdrop,
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
  onMediaCommit?: () => void
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
  magazine?: boolean
  heroBackdrop?: { image?: string | null; colors: readonly string[] }
}) {
  const checklist = buildSiteSetupChecklist(draft)
  const firstGap = checklist.find((item) => !item.done)?.section ?? null
  const openSection = initialOpenSections?.length ? null : initialOpenSection ?? firstGap
  const status = (section: SiteSectionId) => siteSectionStatus({ section, checklist, draft })
  const sectionOpen = (id: SiteSectionId) =>
    initialOpenSections?.includes(id) === true || openSection === id
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
      onCommit={onMediaCommit}
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
        hideHeading={magazine}
        className={magazine ? styles.lookChapters : undefined}
      >
        {magazine ? (
          <article className={styles.lookChapter}>
            <span className={styles.lookNum} aria-hidden="true">II</span>
            <div className={styles.lookCard}>
              <header className={styles.lookHead}>
                <p className={styles.lookEyebrow}>Top bar</p>
                <h2 className={styles.lookTitle}>Your name & shop</h2>
                <p className={styles.lookLede}>The name at the top of every page, and where every Shop button goes.</p>
              </header>
              <div className={`${styles.siteSettingsGrid} ${styles.lookNameGrid}`}>
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
            <ShowsOn id="business-name-shows" legend={magazine}>{SHOWS_ON.businessName}</ShowsOn>
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
            <ShowsOn id="display-name-shows" legend={magazine}>{SHOWS_ON.displayName}</ShowsOn>
          </label>
          <label className={styles.searchField} data-site-field="shop-link">
            <span className={styles.searchLabel}>Bomb Party rep store link</span>
            <span id={`${SITE_FIELD_IDS.shopLink}-hint`} className={`${styles.helperNote} ${styles.lookKeepHint}`}>
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
            <ShowsOn id="shop-link-shows" legend={magazine}>{SHOWS_ON.shopLink}</ShowsOn>
          </label>
              </div>
            </div>
          </article>
        ) : null}
        <div className={magazine ? styles.lookChapter : styles.siteSettingsGrid}>
          {magazine ? <span className={styles.lookNum} aria-hidden="true">III</span> : null}
          <div className={magazine ? styles.lookCard : undefined}>
            {magazine ? (
              <header className={styles.lookHead}>
                <p className={styles.lookEyebrow}>Announcements</p>
                <h2 className={styles.lookTitle}>Your scrolling news</h2>
                <p className={styles.lookLede}>One announcement per line. Add emojis, then highlight only the words you want to link.</p>
              </header>
            ) : null}
            <div className={magazine ? styles.lookToolRow : styles.tickerComposer}>
              <LookEmojiPicker onInsert={onAddTickerText} />
              <button type="button" className={styles.lookTool} popoverTarget="look-link-words">
                <span aria-hidden="true">🔗</span> Link words
              </button>
              <div id="look-link-words" popover="auto" className={styles.lookLinkPop}>
                <span className={styles.visuallyHidden}>Link selected words</span>
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
                {tickerLinkError ? <span className={styles.tickerLinkError}>{tickerLinkError}</span> : null}
              </div>
              <div className={magazine ? styles.lookToolSwitch : undefined}>
                <PublicSiteVisibility
                  settings={draft}
                  joinTeamAccessEnabled={joinTeamAccessEnabled}
                  onChange={onDraftChange}
                  part="announcements"
                  toolbar={magazine}
                />
              </div>
            </div>
            <label className={`${styles.sortFieldWide} ${magazine ? styles.lookTickerField : ''}`} data-site-field="ticker-text">
              <span className={magazine ? styles.visuallyHidden : styles.searchLabel}>Announcement ticker messages</span>
              <span className={magazine ? styles.lookTickerSource : undefined}>
                <textarea
                  ref={tickerRef}
                  id="my-website-ticker"
                  className={styles.siteSettingsTextarea}
                  data-site-control="ticker-text"
                  value={draft.tickerText}
                  aria-describedby="ticker-shows"
                  rows={Math.max(3, draft.tickerText.split('\n').length)}
                  onChange={(event) => onTickerChange(event.target.value)}
                  onSelect={(event) => {
                    const textarea = event.currentTarget
                    const start = textarea.selectionStart
                    const end = textarea.selectionEnd
                    onTickerSelect(start === end ? null : { start, end, text: textarea.value.slice(start, end) })
                  }}
                />
              </span>
              {magazine ? (
                <TickerChips
                  text={draft.tickerText}
                  onChange={onTickerChange}
                  onSelect={onTickerSelect}
                  textareaRef={tickerRef}
                />
              ) : null}
              <span className={magazine ? styles.visuallyHidden : styles.helperNote}>
                Use one announcement per line. Add emojis, then highlight only the words you want to link.
              </span>
              {hasTickerLinks ? (
                <p className={styles.lookPlainNote}>
                  <span>This fixes an older ticker link that made a whole message clickable. Your words stay; only the old link is removed.</span>
                  <button
                    type="button"
                    className={styles.tickerLinkResetButton}
                    data-site-control="plain-text-links"
                    onClick={onResetTickerLinks}
                  >
                    Make existing links plain text
                  </button>
                </p>
              ) : null}
              <ShowsOn
                id="ticker-shows"
                legend={magazine}
                caption="The scrolling announcements at the top of your site · the bar shows while Show announcements is on"
              >
                {SHOWS_ON.ticker}
              </ShowsOn>
            </label>
          </div>
        </div>
      </SiteSection>

      <SiteSection plain={plain} hidden={!showSection('hero')}
        id="hero"
        number="2"
        title="Hero"
        summary="The headline customers see first"
        status={status('hero')}
        defaultOpen={plain || sectionOpen('hero')}
        hideHeading={magazine}
        className={magazine ? styles.lookChapters : undefined}
      >
        <div className={magazine ? styles.lookChapter : undefined}>
          {magazine ? <span className={styles.lookNum} aria-hidden="true">IV</span> : null}
          <div className={magazine ? styles.lookCard : undefined}>
            {magazine ? (
              <header className={styles.lookHead}>
                <p className={styles.lookEyebrow}>Hero</p>
                <h2 className={styles.lookTitle}>Your first hello</h2>
                <p className={styles.lookLede}>Write right on top of your theme, just like customers will see it.</p>
              </header>
            ) : null}
            <div className={magazine ? styles.lookHeroStage : undefined}>
              {magazine ? <LookHeroArt image={heroBackdrop?.image} colors={heroBackdrop?.colors} /> : null}
              <div className={magazine ? styles.lookFrost : styles.siteSettingsGrid}>
          <label className={styles.sortFieldWide} data-site-field="hero-headline">
            <span className={styles.searchLabel}>Big headline <span className={styles.lookCount}>{(draft.heroHeadline ?? '').length} / 180</span></span>
            <input
              id={SETUP_FIELD_IDS.headline}
              className={styles.searchInput}
              data-site-control="hero-headline"
              value={draft.heroHeadline ?? ''}
              maxLength={180}
              aria-describedby="hero-headline-shows"
              onChange={(event) => onDraftChange?.({ heroHeadline: event.target.value })}
            />
            <span className={magazine ? styles.visuallyHidden : styles.siteSettingsPreviewNote}>This is the large heading customers see first on your homepage.</span>
            <ShowsOn id="hero-headline-shows" legend={magazine}>{SHOWS_ON.heroTitle}</ShowsOn>
          </label>
          <label className={styles.sortFieldWide} data-site-field="hero-subtitle">
            <span className={styles.searchLabel}>Line under the headline <span className={styles.lookCount}>{(draft.heroSubtitle ?? '').length} / 240</span></span>
            <input
              id="my-website-hero-subtitle"
              className={styles.searchInput}
              data-site-control="hero-subtitle"
              value={draft.heroSubtitle ?? ''}
              maxLength={240}
              aria-describedby="hero-subtitle-shows"
              onChange={(event) => onDraftChange?.({ heroSubtitle: event.target.value })}
            />
            <span className={magazine ? styles.visuallyHidden : styles.siteSettingsPreviewNote}>This supporting sentence appears directly beneath the big headline.</span>
            <ShowsOn id="hero-subtitle-shows" legend={magazine}>{SHOWS_ON.heroSubtitle}</ShowsOn>
          </label>
          <div className={styles.sortFieldWide} data-site-field="hero-socials">
            <span className={styles.searchLabel}>Socials in the hero</span>
            <p className={styles.visuallyHidden}>
              {heroSocials.length > 0
                ? `Showing in the hero: ${heroSocials.map((link) => link.label).join(', ')}.`
                : 'No social buttons are set to show in the hero yet.'}
            </p>
            {magazine ? (
              <span className={styles.lookSocials}>
                {resolveSocialPlatformUrl('tiktok', draft.socialHandles?.tiktok) ? (
                  <span className={styles.lookSocialChip}>Watch on TikTok</span>
                ) : null}
                {heroSocials.length > 0
                  ? heroSocials.map((link) => (
                    <span key={link.key} className={styles.lookSocialChip}>{link.label}</span>
                  ))
                  : resolveSocialPlatformUrl('tiktok', draft.socialHandles?.tiktok) ? null : <span className={styles.lookSocialChip}>No hero buttons yet</span>}
              </span>
            ) : (
              <p className={styles.siteSettingsPreviewNote}>
                {heroSocials.length > 0
                  ? `Showing in the hero: ${heroSocials.map((link) => link.label).join(', ')}.`
                  : 'No social buttons are set to show in the hero yet.'}
              </p>
            )}
            <ShowsOn id="hero-socials-shows" legend={magazine} caption={resolveSocialPlatformUrl('tiktok', draft.socialHandles?.tiktok) ? 'Hero buttons, plus Watch on TikTok from her TikTok link' : 'Hero buttons'}>{SHOWS_ON.heroSocials}</ShowsOn>
          </div>
              </div>
            </div>
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
        hideHeading={plain && !isBrittWithBling}
        className={plain && !isBrittWithBling ? styles.aboutMarqueeBlock : undefined}
      >
        {plain && !isBrittWithBling ? (
          slots.filter((slot) => slot.key === 'showcase').map((slot) => (
            <AboutMarquee
              key={slot.key}
              slot={slot}
              savedVideoUrl={savedSlots?.find((saved) => saved.key === slot.key)?.videoUrl ?? ''}
              allSourcesEnabled={draft.allSourcesEnabled === true}
              tiktokQueueEnabled={draft.tiktokQueueEnabled === true}
              actionPending={actionPending}
              onChange={onHomepageMediaChange}
              onRemoveVideo={onHomepageVideoRemove}
            />
          ))
        ) : slots.filter((slot) => slot.key === 'showcase').map(slotProps)}
      </SiteSection>

      <SiteSection plain={plain} hidden={!showSection('about')}
        id="about"
        number="5"
        title="About you"
        summary="About section: your story, photo, and short videos"
        status={status('about')}
        defaultOpen={plain || sectionOpen('about')}
        hideHeading={plain && !isBrittWithBling}
        className={plain && !isBrittWithBling ? styles.aboutSectionContents : undefined}
      >
        {plain && !isBrittWithBling ? (
          <>
            <div className={styles.aboutPhotoBlock}>
              <p className={styles.aboutWhisper}>Your first name is set in Look. It shows in the title if you leave the placeholder as is.</p>
              <h2 className={styles.siteDialogSectionTitle}>Your photo</h2>
              <p className={styles.aboutLegend}>On a phone her story comes before this photo. On a wide screen they sit side by side. JPG, PNG, or WebP, under about <span className={styles.aboutNowrap}>2.5 MB</span>.</p>
              <div className={styles.aboutHero}>
                <div className={styles.aboutPhotoFrame}>
                  {aboutPortrait?.imageUrl ? (
                    <img
                      className={styles.aboutPhoto}
                      src={aboutPortrait.imageUrl}
                      alt=""
                      style={aboutPhotoStyle(aboutPortrait)}
                    />
                  ) : (
                    <div className={styles.aboutPhotoEmpty}>Add your photo</div>
                  )}
                  <div className={styles.aboutStoryCard}>
                    <label className={styles.aboutField} data-site-field="about-title">
                      <span>Title</span>
                      <input
                        id="my-website-about-heading"
                        className={styles.aboutHeadline}
                        data-site-control="about-title"
                        maxLength={ABOUT_TITLE_MAX_LENGTH}
                        placeholder="Meet Brianna"
                        value={draft.aboutHeading ?? ''}
                        onChange={(event) => onDraftChange?.({ aboutHeading: event.target.value })}
                      />
                      <span className={styles.aboutCount}>{(draft.aboutHeading ?? '').length} / {ABOUT_TITLE_MAX_LENGTH}</span>
                    </label>
                    <label className={styles.aboutField} data-site-field="about-story">
                      <span>Your story</span>
                      <textarea
                        id={SETUP_FIELD_IDS.aboutStory}
                        className={styles.aboutStory}
                        data-site-control="about-story"
                        maxLength={ABOUT_NARRATIVE_MAX_LENGTH}
                        rows={4}
                        placeholder="Paste the story you want customers to read."
                        value={draft.aboutNarrative ?? ''}
                        onChange={(event) => onDraftChange?.({ aboutNarrative: event.target.value })}
                      />
                      <span className={styles.aboutCount}>{(draft.aboutNarrative ?? '').length} / {ABOUT_NARRATIVE_MAX_LENGTH} characters</span>
                    </label>
                  </div>
                </div>
                <div className={styles.aboutHeroTools}>
                  <label className={styles.aboutField} data-site-field="photo-caption">
                    <span>Photo caption</span>
                    <input
                      className={styles.aboutCaption}
                      data-site-control="photo-caption"
                      maxLength={240}
                      value={aboutPortrait?.caption ?? ''}
                      onChange={(event) => onHomepageMediaChange?.('about_1', { caption: event.target.value })}
                    />
                    <span className={styles.aboutCount}>{(aboutPortrait?.caption ?? '').length} / 240</span>
                  </label>
                  <div data-site-field="about-photo" className={styles.aboutPhotoActions}>
                    <label className={styles.aboutAction}>
                      {mediaUploadKey === 'about_1' ? 'Uploading...' : aboutPortrait?.imageUrl ? 'Replace photo' : 'Upload photo'}
                      <input
                        id={SETUP_FIELD_IDS.aboutPhoto}
                        data-site-control="about-photo"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={mediaUploadKey === 'about_1'}
                        onChange={(event) => {
                          const file = event.target.files?.[0]
                          if (file) onHomepageMediaUpload?.('about_1', file)
                          event.target.value = ''
                        }}
                      />
                    </label>
                    {aboutPortrait?.imageUrl ? (
                      <button
                        type="button"
                        className={styles.aboutDanger}
                        data-site-control="remove-photo"
                        onClick={() => onHomepageMediaChange?.('about_1', { imageUrl: '' })}
                      >
                        Remove photo
                      </button>
                    ) : null}
                  </div>
                  {mediaUploadFeedback?.key === 'about_1' ? (
                    <p role="status" className={mediaUploadFeedback.tone === 'success' ? styles.homepageMediaUploadSuccess : styles.homepageMediaUploadError}>
                      {mediaUploadFeedback.message}
                    </p>
                  ) : null}
                  {aboutPortrait?.imageUrl ? (
                    <details className={styles.aboutCrop}>
                      <summary>Adjust crop</summary>
                      <fieldset className={styles.aboutSmart} data-site-field="smart-frame" data-site-control="smart-frame">
                        <legend>Smart Frame</legend>
                        <p>Face detection set the starting crop. You can fine‑tune it.</p>
                        <label>
                          <span>Zoom</span>
                          <input type="range" min="1" max="1.5" step="0.01" value={aboutPortrait.portraitZoom ?? 1.18} onChange={(event) => onHomepageMediaChange?.('about_1', { portraitZoom: Number(event.target.value) })} onPointerUp={() => onMediaCommit?.()} />
                        </label>
                        <label>
                          <span>Move subject up or down</span>
                          <input type="range" min="0" max="60" step="1" value={aboutPortrait.portraitFocusY ?? 20} onChange={(event) => onHomepageMediaChange?.('about_1', { portraitFocusY: Number(event.target.value) })} onPointerUp={() => onMediaCommit?.()} />
                        </label>
                        <label>
                          <span>Move subject left or right</span>
                          <input type="range" min="0" max="100" step="1" value={aboutPortrait.portraitFocusX ?? 50} onChange={(event) => onHomepageMediaChange?.('about_1', { portraitFocusX: Number(event.target.value) })} onPointerUp={() => onMediaCommit?.()} />
                        </label>
                      </fieldset>
                    </details>
                  ) : null}
                </div>
              </div>
            </div>
            <div className={styles.aboutShortsBlock}>
              <h2 className={styles.siteDialogSectionTitle}>More to watch</h2>
              <p className={styles.aboutLegend}>These short videos sit in About, after her story and photo. Up to three. Public TikTok, YouTube, Instagram, or Facebook links work, up to 3 minutes.</p>
              <AboutShortRail
                slots={slots}
                savedSlots={savedSlots}
                allSourcesEnabled={draft.allSourcesEnabled === true}
                tiktokQueueEnabled={draft.tiktokQueueEnabled === true}
                actionPending={actionPending}
                onChange={onHomepageMediaChange}
                onRemoveVideo={onHomepageVideoRemove}
              />
            </div>
          </>
        ) : (
        <>
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
        </>
        )}
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
        {plain ? (
          <div className={styles.signupEditor}>
            <header>
              <p className={styles.lookEyebrow}>Sign-up</p>
              <h2 className={styles.lookTitle}>The card she sees</h2>
              <p className={styles.lookLede}>Tap the offer or the message on the card. The code sits in one chip.</p>
            </header>
            <div className={styles.signupLiveCard} aria-label="Customer sign-up card">
              <p className={styles.lookEyebrow}>Stay in the loop</p>
              <h3 className={styles.lookTitle}>Never miss a show.</h3>
              <p className={styles.lookLede}>Help me build shows around what you love. Share a few details and I'll send you show reminders, new drop alerts and updates, and I'll never share your info.</p>
              <p className={styles.signupLiveOffer}>
                Sign up today for a one-time{' '}
                <label className={styles.signupInline} data-site-field="discount-offer">
                  <span className={styles.visuallyHidden}>What they get</span>
                  <input
                    id={SITE_FIELD_IDS.discountOffer}
                    className={styles.signupLiveOfferInput}
                    data-site-control="discount-offer"
                    value={draft.signupDiscountOffer ?? ''}
                    maxLength={40}
                    placeholder="10% off"
                    aria-invalid={discountOfferError ? 'true' : 'false'}
                    aria-describedby={describedBy(
                      discountOfferError ? `${SITE_FIELD_IDS.discountOffer}-error` : null,
                      'discount-offer-shows',
                    )}
                    onBlur={() => onFieldBlur(SITE_FIELD_IDS.discountOffer, 'What they get', discountOfferFieldError(draft.signupDiscountOffer))}
                    onChange={(event) => onDraftChange?.({ signupDiscountOffer: event.target.value })}
                  />
                  <ShowsOn id="discount-offer-shows" legend caption="The offer on the sign-up card">{SHOWS_ON.discountOffer}</ShowsOn>
                </label>
              </p>
              {discountOfferError ? <span id={`${SITE_FIELD_IDS.discountOffer}-error`} className={styles.fieldError} role="status">{discountOfferError}</span> : null}
              <label className={styles.signupMessage} data-site-field="discount-message">
                <span className={styles.visuallyHidden}>Message shown with your code</span>
                <input
                  id={SITE_FIELD_IDS.discountMessage}
                  className={styles.signupLiveMessage}
                  data-site-control="discount-message"
                  value={discountMessage}
                  maxLength={140}
                  placeholder="Thanks for joining"
                  aria-invalid={discountMessageError ? 'true' : 'false'}
                  aria-describedby={describedBy(discountMessageError ? `${SITE_FIELD_IDS.discountMessage}-error` : null, 'discount-message-shows')}
                  onBlur={() => onFieldBlur(SITE_FIELD_IDS.discountMessage, 'Discount message', discountMessageFieldError(discountMessage))}
                  onChange={(event) => onDraftChange?.({ signupDiscountMessage: event.target.value })}
                />
                <ShowsOn id="discount-message-shows" legend caption="The note customers read with the code">{SHOWS_ON.discountMessage}</ShowsOn>
              </label>
              {discountMessageError ? <span id={`${SITE_FIELD_IDS.discountMessage}-error`} className={styles.fieldError} role="status">{discountMessageError}</span> : null}
              <label className={styles.signupCodeChip} data-site-field="discount-code">
                <span>Code</span>
                <input
                  id={SITE_FIELD_IDS.discountCode}
                  data-site-control="discount-code"
                  value={discountCode}
                  maxLength={40}
                  placeholder="WELCOME10"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-invalid={discountCodeError ? 'true' : 'false'}
                  aria-describedby={describedBy(discountCodeError ? `${SITE_FIELD_IDS.discountCode}-error` : null, 'discount-code-shows')}
                  onBlur={() => onFieldBlur(SITE_FIELD_IDS.discountCode, 'Discount code', discountCodeFieldError(discountCode, draft.signupDiscountEnabled))}
                  onChange={(event) => onDraftChange?.({ signupDiscountCode: event.target.value })}
                />
                <ShowsOn id="discount-code-shows" legend caption="The code, after she joins">{SHOWS_ON.discountCode}</ShowsOn>
              </label>
              {discountCodeError ? <span id={`${SITE_FIELD_IDS.discountCode}-error`} className={styles.fieldError} role="status">{discountCodeError}</span> : null}
            </div>
            <div className={styles.signupSwitchRow} data-site-field="signup-switch">
              <span>
                <span className={styles.searchLabel}>Sign-up discount</span>
                <ShowsOn id="signup-switch-shows" legend caption="On when the card offers a one-time code">{SHOWS_ON.signupSwitch}</ShowsOn>
              </span>
              <input
                type="checkbox"
                role="switch"
                className={styles.signupSwitch}
                data-site-control="signup-switch"
                checked={draft.signupDiscountEnabled === true}
                aria-describedby="signup-switch-shows"
                onChange={(event) => onDraftChange?.({ signupDiscountEnabled: event.target.checked })}
                {...{ switch: '' }}
              />
            </div>
            <p className={styles.helperNote}>Suite only shows this code. Set up the code itself in Bomb Party first.</p>
          </div>
        ) : (
        <>
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
        </>
        )}
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
