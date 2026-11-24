'use client'

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { SitePreviewFrame } from '@/app/nic-nac/components/SitePreviewFrame'
import {
  AMETHYST_APPEARANCE_PRESET_IDS,
  type AmethystAppearancePresetId,
} from '@/lib/amethyst/appearance-presets'
import {
  AMETHYST_SKIN_CARDS,
  type AmethystSkinCard,
} from '@/lib/amethyst/skin-cards'
import {
  groupThemesBySeason,
  THEME_SEASON_TAG,
  uniqueThemes,
  type ThemeSeason,
} from '@/lib/amethyst/theme-seasons'
import styles from './ThemeStudio.module.css'

export const THEME_PREVIEW_UNAVAILABLE =
  "Preview isn't available right now. Your theme choice still works."
export const THEME_PREVIEW_SESSION_EXPIRED =
  'Your session expired. Sign in again to preview your site.'
export const THEME_PREVIEW_LEGACY_NOTICE =
  'Preview uses our newest page engine; small spacing differences from your live site are possible.'

const PREVIEW_PAGES = [
  { id: 'homepage', label: 'Home' },
  { id: 'trade', label: 'Dance Floor' },
  { id: 'join', label: 'Join' },
] as const

type PreviewPage = (typeof PREVIEW_PAGES)[number]['id']
type PreviewEngine = 'ssr' | 'legacy'

export interface ThemePreviewRequest {
  theme: string
  page: PreviewPage
  signal: AbortSignal
}

export interface ThemePreviewResult {
  status: number
  html: string
  engine: PreviewEngine | null
}

export async function loadThemePreview({
  theme,
  page,
  signal,
}: ThemePreviewRequest): Promise<ThemePreviewResult> {
  const response = await fetch(
    `/nic-nac/site-preview?theme=${encodeURIComponent(theme)}&page=${encodeURIComponent(page)}`,
    { signal, cache: 'no-store', headers: { accept: 'text/html' } },
  )
  const engineHeader = response.headers.get('X-Preview-Live-Engine')
  return {
    status: response.status,
    html: response.ok ? await response.text() : '',
    engine: engineHeader === 'legacy' || engineHeader === 'ssr' ? engineHeader : null,
  }
}

type PreviewView =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; html: string; engine: PreviewEngine | null }
  | { status: 'unavailable' }
  | { status: 'expired' }

interface CachedPreview {
  html: string
  engine: PreviewEngine | null
}

function findSkin(id: string) {
  return AMETHYST_SKIN_CARDS.find((card) => card.id === id) ?? null
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])
  return matches
}

export function ThemeStudio({
  status,
  cards,
  savedThemeId,
  draftThemeId,
  onDraftThemeChange,
  now,
  loadPreview = loadThemePreview,
}: {
  status: 'loading' | 'ready' | 'error'
  cards: readonly AmethystSkinCard[]
  savedThemeId: string
  draftThemeId: string
  onDraftThemeChange: (themeId: string) => void
  now?: Date
  loadPreview?: (request: ThemePreviewRequest) => Promise<ThemePreviewResult>
}) {
  const wide = useMediaQuery('(min-width: 880px)')
  const [armed, setArmed] = useState(false)
  const [chosenId, setChosenId] = useState(draftThemeId)
  const [page, setPage] = useState<PreviewPage>('homepage')
  const [yearRoundOpen, setYearRoundOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [view, setView] = useState<PreviewView>({ status: 'idle' })
  const [requestToken, setRequestToken] = useState(0)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cacheRef = useRef(new Map<string, CachedPreview>())
  const draftRef = useRef(draftThemeId)

  useEffect(() => {
    if (draftThemeId === draftRef.current) return
    draftRef.current = draftThemeId
    setChosenId(draftThemeId)
  }, [draftThemeId])

  useEffect(() => {
    const win = window
    if (typeof win.requestIdleCallback === 'function') {
      const id = win.requestIdleCallback(() => setArmed(true), { timeout: 1500 })
      return () => win.cancelIdleCallback(id)
    }
    const timer = win.setTimeout(() => setArmed(true), 300)
    return () => win.clearTimeout(timer)
  }, [])

  const savedCard = findSkin(savedThemeId)
  const offeredIds = new Set(cards.map((card) => card.id))
  function isOfferedPresetId(id: string): id is AmethystAppearancePresetId {
    for (const presetId of AMETHYST_APPEARANCE_PRESET_IDS) {
      if (presetId === id && offeredIds.has(presetId)) return true
    }
    return false
  }
  const savedOffered = savedCard ? offeredIds.has(savedCard.id) : true
  const themes = uniqueThemes(savedCard && !savedOffered ? [...cards, savedCard] : cards)
  const groups = groupThemesBySeason(themes, savedCard?.id ?? savedThemeId, now ?? new Date())
  const chosen = themes.find((theme) => theme.id === chosenId) ?? savedCard
  const chosenOffered = chosen ? offeredIds.has(chosen.id) : false
  const shouldLoad = Boolean(chosen && chosenOffered && (dialogOpen || (armed && wide)))
  const cacheKey = chosen ? `${chosen.id}:${page}` : ''

  useEffect(() => {
    if (!shouldLoad || !chosen) return
    const key = `${chosen.id}:${page}`
    const cached = cacheRef.current.get(key)
    if (cached) {
      setView({ status: 'ready', html: cached.html, engine: cached.engine })
      return
    }
    const controller = new AbortController()
    setView({ status: 'loading' })
    let active = true
    void loadPreview({ theme: chosen.id, page, signal: controller.signal })
      .then((result) => {
        if (!active) return
        if (result.status === 401) {
          setView({ status: 'expired' })
          return
        }
        if (result.status !== 200 || !result.html) {
          setView({ status: 'unavailable' })
          return
        }
        const snapshot = { html: result.html, engine: result.engine }
        cacheRef.current.set(key, snapshot)
        setView({ status: 'ready', html: snapshot.html, engine: snapshot.engine })
      })
      .catch((error: unknown) => {
        if (!active) return
        if (error instanceof Error && error.name === 'AbortError') return
        setView({ status: 'unavailable' })
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [shouldLoad, chosen, page, requestToken, loadPreview])

  function showCachedOrLoading(themeId: string, nextPage: PreviewPage) {
    if (!isOfferedPresetId(themeId)) {
      setView({ status: 'idle' })
      return
    }
    const cached = cacheRef.current.get(`${themeId}:${nextPage}`)
    if (cached) {
      setView({ status: 'ready', html: cached.html, engine: cached.engine })
      return
    }
    setView({ status: 'loading' })
  }

  function retryPreview() {
    if (cacheKey) cacheRef.current.delete(cacheKey)
    setView({ status: 'loading' })
    setRequestToken((token) => token + 1)
  }

  function openTryOn(themeId: string) {
    setChosenId(themeId)
    showCachedOrLoading(themeId, page)
    setDialogOpen(true)
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }

  function closeTryOn() {
    dialogRef.current?.close()
  }

  function useTheme() {
    if (!chosen) return
    draftRef.current = chosen.id
    onDraftThemeChange(chosen.id)
  }

  function keepTheme() {
    setChosenId(savedThemeId)
    draftRef.current = savedThemeId
    onDraftThemeChange(savedThemeId)
  }

  const savedLabel = savedCard?.label ?? 'your current theme'
  const chosenLabel = chosen?.label ?? savedLabel
  let imageIndex = 0

  return (
    <section className={styles.studio} data-testid="theme-studio" aria-busy={status === 'loading'}>
      <p className={styles.kicker}>Customer-facing site theme</p>
      <div className={styles.layout}>
        <div className={styles.picker}>
          <p className={styles.notice}>
            Customers keep seeing {savedLabel} until you save.
          </p>
          {!savedOffered && chosenId !== savedThemeId ? (
            <p className={styles.warning}>
              You can&apos;t switch back to {savedLabel} after saving.
            </p>
          ) : null}
          {status === 'loading' ? (
            <div>
              <p className={styles.status} role="status">Loading your available themes…</p>
              <div className={styles.grid} aria-hidden="true">
                <span className={styles.skeleton} />
                <span className={styles.skeleton} />
                <span className={styles.skeleton} />
              </div>
            </div>
          ) : null}
          {status === 'error' ? (
            <p className={styles.warning} role="alert">
              Themes unavailable — refresh and try again
            </p>
          ) : null}
          {status === 'ready' ? (
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Choose your theme</legend>
              {groups.inSeason.length > 0 ? (
                <div>
                  <h2 className={styles.groupTitle}>In season now</h2>
                  <div className={styles.grid}>
                    {groups.inSeason.map((theme) => {
                      const eager = imageIndex < 4
                      imageIndex += 1
                      return renderCard(theme, eager)
                    })}
                  </div>
                </div>
              ) : null}
              <div>
                <h2 className={styles.groupTitle}>Year-round</h2>
                <div
                  className={styles.grid}
                  data-year-round=""
                  data-expanded={yearRoundOpen ? 'true' : 'false'}
                >
                  {groups.yearRound.map((theme) => {
                    const eager = imageIndex < 4
                    imageIndex += 1
                    return renderCard(theme, eager)
                  })}
                </div>
                {groups.yearRound.length > 2 ? (
                  <button
                    type="button"
                    className={styles.showAll}
                    hidden={yearRoundOpen}
                    onClick={() => setYearRoundOpen(true)}
                  >
                    Show all {groups.yearRound.length} themes
                  </button>
                ) : null}
              </div>
            </fieldset>
          ) : null}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.use}
              onClick={useTheme}
              disabled={!chosen || chosen.id === draftThemeId}
            >
              Use {chosenLabel}
            </button>
            <button
              type="button"
              className={styles.keep}
              onClick={keepTheme}
              disabled={chosenId === savedThemeId && draftThemeId === savedThemeId}
            >
              Keep {savedLabel}
            </button>
          </div>
          <p className={styles.note}>
            Applies only to your public customer-facing site. Your Sparkle Suite workspace keeps the standard workspace theme.
          </p>
        </div>
        {wide ? (
          <div className={styles.previewColumn}>
            <PreviewSurface
              scope="panel"
              page={page}
              onPage={(nextPage) => {
                setPage(nextPage)
                if (chosen) showCachedOrLoading(chosen.id, nextPage)
              }}
              view={view}
              themeLabel={chosenLabel}
              onRetry={retryPreview}
              retired={!chosenOffered}
            />
          </div>
        ) : null}
      </div>
      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby="theme-try-on-title"
        onClose={() => setDialogOpen(false)}
      >
        {dialogOpen ? (
          <div className={styles.dialogBody}>
            <div className={styles.dialogHeader}>
              <p className={styles.tryKicker}>Try it on · Not live</p>
              <button type="button" className={styles.close} aria-label="Close" autoFocus onClick={closeTryOn}>
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <h1 id="theme-try-on-title" className={styles.dialogTitle}>{chosenLabel}</h1>
            <p className={styles.dialogCopy}>
              Your real headline, shows and photos. Customers still see {savedLabel}.
            </p>
            <PreviewSurface
              scope="dialog"
              page={page}
              onPage={(nextPage) => {
                setPage(nextPage)
                if (chosen) showCachedOrLoading(chosen.id, nextPage)
              }}
              view={view}
              themeLabel={chosenLabel}
              onRetry={retryPreview}
              retired={!chosenOffered}
              framed
            />
            <div className={styles.dialogActions}>
              <button type="button" className={styles.keep} onClick={closeTryOn}>
                Back to themes
              </button>
              <button type="button" className={styles.use} onClick={() => { useTheme(); closeTryOn() }}>
                Use this theme
              </button>
            </div>
          </div>
        ) : null}
      </dialog>
    </section>
  )

  function renderCard(theme: AmethystSkinCard, eager: boolean) {
    const selected = theme.id === chosenId
    const live = theme.id === savedThemeId
    const offered = offeredIds.has(theme.id)
    const seasonTag = seasonTagFor(theme.season, groups.inSeason.some((item) => item.id === theme.id))
    return (
      <article key={theme.id} className={styles.card} data-selected={selected ? 'true' : 'false'}>
        <label className={styles.cardLabel}>
          <input
            className={styles.radio}
            type="radio"
            name="customer-site-theme"
            value={theme.id}
            aria-label={live ? `${theme.label}, ${offered ? 'Live now' : 'Live now, no longer offered'}` : theme.label}
            checked={selected}
            onChange={() => {
              setChosenId(theme.id)
              showCachedOrLoading(theme.id, page)
            }}
          />
          <span
            className={styles.thumbFrame}
            style={{ background: colorBlock(theme.previewColors) }}
          >
            {theme.thumb ? (
              <img
                className={styles.thumb}
                src={theme.thumb}
                alt=""
                width={480}
                height={300}
                loading={eager ? 'eager' : 'lazy'}
                fetchPriority={eager ? 'low' : undefined}
                decoding="async"
                onError={(event) => {
                  event.currentTarget.hidden = true
                }}
              />
            ) : null}
          </span>
          <span className={styles.check} aria-hidden="true" data-check="">✓</span>
          <span className={styles.name}>{theme.label}</span>
          {theme.visibility === 'private' ? <span className={styles.tag}>Just for you</span> : null}
          {seasonTag ? <span className={styles.tag}>{seasonTag}</span> : null}
          {live ? (
            <span className={styles.liveChip}>
              {offered ? 'Live now' : 'Live now (no longer offered)'}
            </span>
          ) : null}
          <span className={styles.dots} aria-hidden="true">
            {theme.previewColors.slice(0, 4).map((color) => (
              <span key={color} className={styles.dot} style={{ background: color }} />
            ))}
          </span>
        </label>
        {offered ? (
          <button
            type="button"
            className={styles.tryOn}
            id={`try-on-${theme.id}`}
            onClick={() => openTryOn(theme.id)}
          >
            Try it on
          </button>
        ) : null}
      </article>
    )
  }
}

function seasonTagFor(season: ThemeSeason, inSeason: boolean) {
  if (inSeason || season === 'none') return null
  return THEME_SEASON_TAG[season]
}

function colorBlock(colors: readonly string[]) {
  const [first, second, third] = colors
  return `linear-gradient(135deg, ${first ?? '#fff'} 0%, ${second ?? first ?? '#ee2c9b'} 58%, ${third ?? first ?? '#ffd4ea'} 100%)`
}

function PreviewSurface({
  scope,
  page,
  onPage,
  view,
  themeLabel,
  onRetry,
  retired,
  framed = false,
}: {
  scope: string
  page: PreviewPage
  onPage: (page: PreviewPage) => void
  view: PreviewView
  themeLabel: string
  onRetry: () => void
  retired: boolean
  framed?: boolean
}) {
  const panelId = `${scope}-preview-panel`
  const pendingFocus = useRef<string | null>(null)
  useEffect(() => {
    const tabId = pendingFocus.current
    if (!tabId) return
    pendingFocus.current = null
    document.getElementById(tabId)?.focus()
  })

  function onTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = PREVIEW_PAGES.findIndex((item) => item.id === page)
    let next = index
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % PREVIEW_PAGES.length
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + PREVIEW_PAGES.length) % PREVIEW_PAGES.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = PREVIEW_PAGES.length - 1
    else return
    event.preventDefault()
    const nextPage = PREVIEW_PAGES[next].id
    pendingFocus.current = `${scope}-tab-${nextPage}`
    onPage(nextPage)
  }

  return (
    <div className={framed ? styles.dialogStage : styles.stage}>
      {retired ? (
        <p className={styles.status}>This theme is no longer offered, so there isn&apos;t a preview.</p>
      ) : (
        <>
          {view.status === 'ready' && view.engine === 'legacy' ? (
            <p className={styles.engineNotice}>{THEME_PREVIEW_LEGACY_NOTICE}</p>
          ) : null}
          <div
            className={styles.tabs}
            role="tablist"
            aria-label="Preview page"
            onKeyDown={onTabKeyDown}
          >
            {PREVIEW_PAGES.map((item) => {
              const selected = page === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  id={`${scope}-tab-${item.id}`}
                  className={styles.tab}
                  aria-selected={selected}
                  aria-controls={panelId}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => onPage(item.id)}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
          <div
            className={styles.stageBody}
            id={panelId}
            role="tabpanel"
            aria-labelledby={`${scope}-tab-${page}`}
          >
            {view.status === 'loading' ? (
              <p className={styles.status} role="status">
                <progress className={styles.spinner} aria-label="Loading preview" />
                Loading preview
              </p>
            ) : null}
            {view.status === 'unavailable' ? (
              <p className={styles.warning} role="alert">
                {THEME_PREVIEW_UNAVAILABLE}{' '}
                <button type="button" className={styles.retry} onClick={onRetry}>Retry</button>
              </p>
            ) : null}
            {view.status === 'expired' ? (
              <p className={styles.warning} role="alert">
                {THEME_PREVIEW_SESSION_EXPIRED}{' '}
                <a className={styles.signInLink} href="/login">Sign in</a>
              </p>
            ) : null}
            {view.status === 'ready' ? (
              <SitePreviewFrame html={view.html} themeLabel={themeLabel} />
            ) : null}
            {view.status === 'idle' ? (
              <p className={styles.status}>Preview loads after the themes are ready.</p>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}
