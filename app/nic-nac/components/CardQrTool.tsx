'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CARD_QR_PACKS,
  CARD_QR_PRICE_COPY,
  CARD_QR_PRINT_SPEC,
  CARD_QR_REGION_COPY,
  CARD_QR_SHIPPING_COPY,
  CARD_QR_TURNAROUND_COPY,
  type CardQrPackQuantity,
} from '@/lib/workspace/card-qr/pricing'
import {
  CARD_QR_ICON_GROUPS,
  CARD_QR_ICON_LABELS,
  CARD_QR_SOCIAL_PLATFORMS,
  CARD_QR_SOCIAL_PLATFORM_LABELS,
  parseCardQrSocialPlatform,
  DEFAULT_CARD_QR_DESIGN,
  cleanTextLinkNumber,
  parseCardQrDesign,
  type CardQrDesign,
  type CardQrFields,
  type CardQrIcon,
} from '@/lib/workspace/card-qr/design'
import { resolveCardQrDestination } from '@/lib/workspace/card-qr/destination'
import { buildCardQrShortUrl } from '@/lib/workspace/card-qr/short-link'
import { CARD_QR_FLYER_BEING_BUILT_MESSAGE } from '@/lib/workspace/card-qr/flyer-copy'
import {
  DEFAULT_CARD_QR_FLYER_FORMAT,
  flyerDownloadBytes,
  flyerPreviewCacheKey,
  type CardQrFlyerFormat,
} from '@/lib/workspace/card-qr/flyer-format'
import { CARD_QR_ENTRY_TITLE } from '@/lib/workspace/card-qr/access'
import { cardQrIconArt } from '@/lib/workspace/card-qr/qr-icon'
import {
  CARD_QR_DESIGN_THEME_SITE,
  cardQrDesignThemeOptions,
  type CardQrDesignThemeOption,
} from '@/lib/workspace/card-qr/design-theme'
import type { BizcardKey } from '@/lib/workspace/card-qr/bizcard-themes'
import styles from './CardQrTool.module.css'

const CARD_BACK_TOGGLES: Array<[keyof CardQrFields, string]> = [
  ['name', 'Name'],
  ['email', 'Email'],
  ['website', 'Website'],
  ['social', 'Social handle'],
  ['discount', 'Discount code line'],
]

async function readError(response: Response) {
  const body = await response.json().catch(() => null)
  return body?.error || 'Something went wrong. Try again.'
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/** The real center-mark artwork (same vectors as the QR badge), drawn in the site's QR color. */
function IconMark({ icon, dark }: { icon: CardQrIcon; dark: string }) {
  const art = cardQrIconArt(icon, dark)
  if (!art) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.markSvg}>
        <circle cx="12" cy="12" r="8.5" fill="none" stroke={dark} strokeWidth="1.6" strokeDasharray="2.6 2.4" />
      </svg>
    )
  }
  return <svg viewBox={art.viewBox} aria-hidden="true" className={styles.markSvg} dangerouslySetInnerHTML={{ __html: art.inner }} />
}

function ThemeTile({ option, selected, onPick }: { option: CardQrDesignThemeOption; selected: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={styles.themeTile}
      title={option.label}
      onClick={onPick}
    >
      <span className={styles.themeThumb} style={{ background: option.dots[0] ?? '#eee' }}>
        {option.thumb ? <img src={option.thumb} alt="" loading="lazy" decoding="async" /> : null}
        {option.isSite ? <span className={styles.themeBadge}>Your site</span> : null}
      </span>
      <span className={styles.themeMeta}>
        <span className={styles.themeName}>{option.label}</span>
        <span className={styles.themeDots} aria-hidden="true">
          {option.dots.map((dot, i) => <span key={i} style={{ background: dot }} />)}
        </span>
      </span>
    </button>
  )
}

function StepHeader({ n, id, title, lede }: { n: number; id: string; title: string; lede: string }) {
  return (
    <header className={styles.stepHead}>
      <span className={styles.stepNum} aria-hidden="true">{n}</span>
      <div>
        <h3 id={id} className={styles.stepTitle}><span className={styles.srOnly}>Step {n}: </span>{title}</h3>
        <p className={styles.stepLede}>{lede}</p>
      </div>
    </header>
  )
}

function TextLinkCheck({ checked, disabled, onChange, where }: { checked: boolean; disabled: boolean; onChange: () => void; where: string }) {
  return (
    <div className={styles.checkWrap}>
      <label className={styles.check} data-disabled={disabled || undefined}>
        <input type="checkbox" checked={checked && !disabled} disabled={disabled} onChange={onChange} />
        <span className={styles.checkBox} aria-hidden="true" />
        <span className={styles.checkText}>Add text-to-link number</span>
      </label>
      <p className={styles.hint}>
        {disabled ? 'Save a number in step 1 to turn this on.' : `Shows your number ${where}.`}
      </p>
    </div>
  )
}

export function CardQrTool({
  siteHref,
  displayName,
  businessName,
  email,
  appearancePreset,
  socialHandles,
  repId,
  customDomain,
}: {
  siteHref: string | null
  displayName: string
  businessName: string
  email: string
  appearancePreset: string
  socialHandles: Record<string, string>
  repId?: string | null
  customDomain?: string | null
}) {
  const hasCustomDomain = Boolean(customDomain?.trim())
  const [origin, setOrigin] = useState<string | null>(null)
  const [quantity, setQuantity] = useState<CardQrPackQuantity>(500)
  const [status, setStatus] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [orderMessage, setOrderMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [qrBlob, setQrBlob] = useState<Blob | null>(null)
  const [qrObjectUrl, setQrObjectUrl] = useState<string | null>(null)
  const [flyerFormat, setFlyerFormat] = useState<CardQrFlyerFormat>(DEFAULT_CARD_QR_FLYER_FORMAT)
  const [flyerCache, setFlyerCache] = useState<{ key: string; bytes: Blob; url: string } | null>(null)
  const [flyerLoading, setFlyerLoading] = useState(false)
  const [flyerError, setFlyerError] = useState<string | null>(null)
  const [flyerPending, setFlyerPending] = useState(false)
  const [design, setDesign] = useState<CardQrDesign>(DEFAULT_CARD_QR_DESIGN)
  const [textLinkDraft, setTextLinkDraft] = useState('')
  const [cardFront, setCardFront] = useState<{ key: string; bytes: Blob; url: string } | null>(null)
  const [cardBack, setCardBack] = useState<{ key: string; bytes: Blob; url: string } | null>(null)
  const [cardLoading, setCardLoading] = useState(false)
  const [cardError, setCardError] = useState<string | null>(null)
  const [cardPending, setCardPending] = useState<string | null>(null)
  const [cardWarnings, setCardWarnings] = useState<string[]>([])
  /** Design theme picker: per visit only (never saved, never changes the live site). */
  const [designTheme, setDesignTheme] = useState<string>(CARD_QR_DESIGN_THEME_SITE)
  const [siteCardKey, setSiteCardKey] = useState<BizcardKey | null>(null)
  const qrIcon = design.qrIcon
  const textLinkNumber = design.textLinkNumber
  /** The flyer only carries the number when its own checkbox is on. */
  const flyerTextLinkNumber = design.fields.flyerTextLink ? textLinkNumber : ''
  const themeOptions = useMemo(
    () => cardQrDesignThemeOptions(appearancePreset, siteCardKey),
    [appearancePreset, siteCardKey],
  )
  const activeTheme = themeOptions.find((option) => option.id === designTheme) ?? themeOptions[0]
  const qrDark = activeTheme.qrDark
  const designTouched = useRef(false)
  const destinationUrl = useMemo(
    () => resolveCardQrDestination(siteHref, origin),
    [origin, siteHref],
  )
  /** Flyer cache key carries the theme so a download never hands back another theme's file. */
  const flyerKeyUrl = destinationUrl ? `${destinationUrl}#theme=${designTheme}` : ''
  const qrUrl = useMemo(
    () => (origin && repId ? buildCardQrShortUrl(origin, repId) : null),
    [origin, repId],
  )
  const cardKey = JSON.stringify({ hasCustomDomain, fields: design.fields, qrIcon, textLinkNumber, socialPlatform: design.socialPlatform, appearancePreset, designTheme, displayName, businessName, email, socialHandles })

  useEffect(() => {
    if (!destinationUrl) return
    const controller = new AbortController()
    let objectUrl: string | null = null
    setQrBlob(null)
    setQrObjectUrl(null)
    void fetch(
      `/api/workspace/card-qr/qr?theme=${encodeURIComponent(designTheme)}&icon=${encodeURIComponent(qrIcon)}`,
      {
      credentials: 'same-origin',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(await readError(response))
        const blob = await response.blob()
        if (!blob.type.startsWith('image/')) throw new Error('QR did not come back as an image.')
        const png = blob.type === 'image/png'
          ? blob
          : new Blob([await blob.arrayBuffer()], { type: 'image/png' })
        const nextUrl = URL.createObjectURL(png)
        if (controller.signal.aborted) {
          URL.revokeObjectURL(nextUrl)
          return
        }
        objectUrl = nextUrl
        setQrBlob(png)
        setQrObjectUrl(nextUrl)
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setStatus(error instanceof Error ? error.message : 'Could not load the QR.')
      })
    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [designTheme, destinationUrl, qrIcon])

  useEffect(() => {
    if (!destinationUrl) return
    const controller = new AbortController()
    let objectUrl: string | null = null
    const key = flyerPreviewCacheKey(flyerFormat, flyerKeyUrl, qrIcon, flyerTextLinkNumber)
    setFlyerLoading(true)
    setFlyerError(null)
    setFlyerPending(false)
    setFlyerCache(null)
    void fetch('/api/workspace/card-qr/flyer', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format: flyerFormat, icon: qrIcon, textLinkNumber: flyerTextLinkNumber, theme: designTheme }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(await readError(response))
        const contentType = response.headers.get('content-type') ?? ''
        if (contentType.includes('application/json')) {
          const body = await response.json()
          if (body?.status === 'being_built') {
            setFlyerPending(true)
            return
          }
          throw new Error(body?.error || body?.message || 'Could not make the flyer.')
        }
        const blob = await response.blob()
        const mime = flyerFormat === 'jpg' ? 'image/jpeg' : 'image/png'
        const file = blob.type === mime ? blob : new Blob([await blob.arrayBuffer()], { type: mime })
        const url = URL.createObjectURL(file)
        if (controller.signal.aborted) {
          URL.revokeObjectURL(url)
          return
        }
        objectUrl = url
        setFlyerCache({ key, bytes: file, url })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setFlyerError(error instanceof Error ? error.message : 'Could not make the flyer.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setFlyerLoading(false)
      })
    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [designTheme, destinationUrl, flyerKeyUrl, flyerFormat, qrIcon, flyerTextLinkNumber])

  useEffect(() => {
    if (!destinationUrl) return
    const controller = new AbortController()
    const urls: string[] = []
    setCardLoading(true)
    setCardError(null)
    setCardPending(null)
    const timer = window.setTimeout(() => {
      type Side = { pending: string } | { key: string; bytes: Blob; url: string }
      const fetchSide = async (output: 'front' | 'back'): Promise<Side> => {
        const response = await fetch('/api/workspace/card-qr/card', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ output, design, theme: designTheme }),
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(await readError(response))
        if ((response.headers.get('content-type') ?? '').includes('application/json')) {
          const body = await response.json()
          if (body?.status === 'being_built') return { pending: String(body.message) }
          throw new Error(body?.error || 'Could not make the card.')
        }
        if (output === 'back') {
          const raw = response.headers.get('x-card-qr-card-warnings')
          let list: string[] = []
          try { list = raw ? (JSON.parse(decodeURIComponent(raw)) as string[]) : [] } catch { list = [] }
          if (!controller.signal.aborted) setCardWarnings(list)
        }
        const blob = await response.blob()
        const file = blob.type === 'image/png' ? blob : new Blob([await blob.arrayBuffer()], { type: 'image/png' })
        const url = URL.createObjectURL(file)
        urls.push(url)
        return { key: cardKey, bytes: file, url }
      }
      void Promise.all([fetchSide('front'), fetchSide('back')])
        .then(([front, back]) => {
          if (controller.signal.aborted) return
          if ('pending' in front || 'pending' in back) {
            setCardPending('pending' in front ? front.pending : 'pending' in back ? back.pending : null)
            setCardFront(null)
            setCardBack(null)
            return
          }
          setCardFront(front)
          setCardBack(back)
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return
          setCardError(error instanceof Error ? error.message : 'Could not make the card.')
        })
        .finally(() => {
          if (!controller.signal.aborted) setCardLoading(false)
        })
    }, 350)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
      for (const url of urls) URL.revokeObjectURL(url)
    }
    // cardKey covers every input of the card files.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardKey, destinationUrl])

  useEffect(() => {
    const controller = new AbortController()
    void fetch('/api/workspace/card-qr', { credentials: 'same-origin', signal: controller.signal })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (controller.signal.aborted) return
        if (typeof body?.siteCardKey === 'string') setSiteCardKey(body.siteCardKey as BizcardKey)
        if (designTouched.current) return
        if (body?.profile?.design) {
          const saved = parseCardQrDesign(body.profile.design)
          setDesign(saved)
          setTextLinkDraft(saved.textLinkNumber)
        }
      })
      .catch(() => {
        // A missing profile table leaves the center mark on None.
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    setOrigin(window.location.origin)
    const params = new URLSearchParams(window.location.search)
    if (params.get('cardOrder') === 'cancelled') {
      setStatus('Checkout cancelled. No card order was placed.')
    }
    const sessionId = params.get('session_id')
    if (params.get('cardOrder') === 'success' && sessionId) {
      void fetch(`/api/workspace/card-qr/order?session_id=${encodeURIComponent(sessionId)}`)
        .then(async (response) => {
          if (!response.ok) throw new Error(await readError(response))
          const body = await response.json()
          setOrderMessage(body.message)
        })
        .catch((error: unknown) => {
          setStatus(error instanceof Error ? error.message : 'Could not confirm the order.')
        })
    }
  }, [])

  function downloadQr() {
    if (!qrBlob) return
    setNotice(null)
    downloadBlob(qrBlob, 'sparkle-site-qr.png')
  }

  async function copyQr() {
    if (!qrBlob) return
    setStatus(null)
    setNotice(null)
    try {
      if (!navigator.clipboard?.write) throw new Error('Clipboard image copy is not available.')
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': qrBlob }),
      ])
      setNotice('Copied')
    } catch {
      setStatus('Could not copy the QR.')
    }
  }

  function saveDesign(next: CardQrDesign) {
    designTouched.current = true
    setDesign(next)
    setNotice(null)
    void fetch('/api/workspace/card-qr', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ design: next }),
    })
      .then(async (response) => {
        if (!response.ok) return
        const body = await response.json()
        if (body.iconStored === false || body.cardStored === false) {
          setNotice('Your choices are on the preview. They are not saved on the profile yet.')
        }
      })
      .catch(() => {
        // The preview still uses the choice.
      })
  }

  function chooseIcon(icon: CardQrIcon) {
    saveDesign({ ...design, qrIcon: icon })
  }

  function toggleField(field: keyof CardQrFields) {
    saveDesign({ ...design, fields: { ...design.fields, [field]: !design.fields[field] } })
  }

  function commitTextLink() {
    const cleaned = cleanTextLinkNumber(textLinkDraft)
    setTextLinkDraft(cleaned)
    if (cleaned !== design.textLinkNumber) saveDesign({ ...design, textLinkNumber: cleaned })
  }

  function downloadCardPng(side: 'front' | 'back') {
    const file = side === 'front' ? cardFront : cardBack
    if (!file || file.key !== cardKey) return
    downloadBlob(file.bytes, `sparkle-business-card-${side}.png`)
  }

  async function downloadCardPdf() {
    setBusy('card-pdf')
    setCardError(null)
    try {
      const response = await fetch('/api/workspace/card-qr/card', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ output: 'pdf', design, theme: designTheme }),
      })
      if (!response.ok) throw new Error(await readError(response))
      const blob = await response.blob()
      if (blob.type !== 'application/pdf') throw new Error('The print file did not come back as a PDF.')
      downloadBlob(blob, 'sparkle-business-card-print.pdf')
    } catch (error) {
      setCardError(error instanceof Error ? error.message : 'Could not make the print PDF.')
    } finally {
      setBusy(null)
    }
  }

  function downloadFlyer() {
    if (!destinationUrl) return
    const bytes = flyerDownloadBytes(
      flyerCache,
      flyerPreviewCacheKey(flyerFormat, flyerKeyUrl, qrIcon, flyerTextLinkNumber),
    )
    if (!bytes) return
    setFlyerError(null)
    const extension = flyerFormat === 'jpg' ? 'jpg' : 'png'
    downloadBlob(bytes, `sparkle-qr-flyer.${extension}`)
  }

  async function startCheckout() {
    setBusy('checkout')
    setStatus(null)
    try {
      const response = await fetch('/api/workspace/card-qr/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity, design, theme: designTheme }),
      })
      if (!response.ok) throw new Error(await readError(response))
      const body = await response.json()
      if (!body.url) throw new Error('Checkout did not return a payment page.')
      window.location.assign(body.url)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Checkout could not start.')
      setBusy(null)
    }
  }

  const savedNumber = textLinkNumber
  const draftClean = cleanTextLinkNumber(textLinkDraft)
  const numberDirty = draftClean !== savedNumber

  return (
    <div className={`${styles.stack} suite-marketing`} data-smoke-tool="card-qr">
      <header className={styles.opening}>
        <div className={styles.openingInner}>
          <div>
            <p className={styles.kicker}>Workspace tool</p>
            <h2 className={styles.pageTitle}>{CARD_QR_ENTRY_TITLE}</h2>
            <p className={styles.pageLede}>
              One QR for your current Suite site. The flyer is a free portrait
              download. Printed cards are paid before anyone prints them.
            </p>
          </div>
          <span className={styles.eyebrow}>Smoke only</span>
        </div>
        <ol className={styles.stepNav} aria-label="Steps">
          <li><a href="#card-qr-text">1 · Text-to-link</a></li>
          <li><a href="#card-qr-code">2 · QR code</a></li>
          <li><a href="#card-qr-flyer">3 · QR flyer</a></li>
          <li><a href="#card-qr-cards">4 · Business cards</a></li>
        </ol>
      </header>

      {orderMessage ? <div className={styles.banner}>{orderMessage}</div> : null}
      {notice ? <div className={styles.banner}>{notice}</div> : null}
      {status ? <div className={`${styles.banner} ${styles.warning}`}>{status}</div> : null}

      <div className={styles.steps}>
        <section className={`${styles.step} ${styles.themeStep}`} aria-labelledby="card-qr-theme">
          <header className={styles.stepHead}>
            <span className={`${styles.stepNum} ${styles.themeNum}`} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.8 1.8-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.8-.5-1.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8Z"/><circle cx="7.5" cy="11.5" r="1.2" fill="currentColor"/><circle cx="10.5" cy="7.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="8" r="1.2" fill="currentColor"/></svg>
            </span>
            <div>
              <h3 id="card-qr-theme" className={styles.stepTitle}>Design theme</h3>
              <p className={styles.stepLede}>
                Try your QR, flyer and cards in another look. This only changes what you make here. Your live site keeps its theme, and this resets to your site theme next visit.
              </p>
            </div>
          </header>
          <div className={styles.themeRail} role="radiogroup" aria-labelledby="card-qr-theme">
            {themeOptions.map((option) => (
              <ThemeTile
                key={option.id}
                option={option}
                selected={option.id === activeTheme.id}
                onPick={() => setDesignTheme(option.id)}
              />
            ))}
          </div>
          <p className={styles.hint} role="status">
            {activeTheme.isSite
              ? `Using your site design${activeTheme.label === 'Your custom design' ? '' : `: ${activeTheme.label}`}.`
              : `Previewing ${activeTheme.label}. Your live site is unchanged.`}
          </p>
        </section>

        <section className={styles.step} aria-labelledby="card-qr-text">
          <StepHeader
            n={1}
            id="card-qr-text"
            title="Text-to-link number"
            lede="Optional. The number customers text to get your shop link. Save it once here, then choose in steps 3 and 4 whether it goes on your flyer and your card."
          />
          <div className={styles.numberRow}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Your text-to-link number</span>
              <input
                type="tel"
                inputMode="tel"
                className={styles.input}
                placeholder="(555) 201-4410"
                maxLength={24}
                value={textLinkDraft}
                onChange={(event) => setTextLinkDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') commitTextLink()
                }}
              />
            </label>
            <button
              type="button"
              className={numberDirty || !savedNumber ? `${styles.button} ${styles.buttonPrimary}` : `${styles.button} ${styles.savedButton}`}
              disabled={!numberDirty}
              onClick={commitTextLink}
            >
              {numberDirty ? (draftClean ? 'Save number' : 'Remove number') : savedNumber ? 'Saved' : 'Save number'}
            </button>
          </div>
          <p className={styles.hint} role="status">
            {savedNumber && !numberDirty
              ? `Saved: ${savedNumber}. It is never copied from your account phone.`
              : 'Leave it empty if you don\u2019t use one. It is never copied from your account phone.'}
          </p>
        </section>

        <section className={styles.step} aria-labelledby="card-qr-code">
          <StepHeader
            n={2}
            id="card-qr-code"
            title="QR code"
            lede="A short link to your customer site, colored for your theme. The flyer and cards use this same code."
          />
          <div className={`${styles.split} ${styles.qrSplit}`}>
            <div className={`${styles.controls} ${styles.qrControls}`}>
              <div>
                <p className={styles.fieldLabel} id="card-qr-mark-label">Center mark</p>
                <div className={styles.markPanel} role="radiogroup" aria-labelledby="card-qr-mark-label">
                  {CARD_QR_ICON_GROUPS.map((group) => (
                    <div key={group.id} className={styles.markGroup} role="group" aria-labelledby={`card-qr-mark-${group.id}`}>
                      <p className={styles.markGroupLabel} id={`card-qr-mark-${group.id}`}>{group.label}</p>
                      <div className={styles.marks}>
                        {group.icons.map((icon) => (
                          <button
                            key={icon}
                            type="button"
                            role="radio"
                            className={styles.mark}
                            aria-checked={qrIcon === icon}
                            aria-label={CARD_QR_ICON_LABELS[icon]}
                            title={CARD_QR_ICON_LABELS[icon]}
                            onClick={() => chooseIcon(icon)}
                          >
                            <IconMark icon={icon} dark={qrDark} />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <p className={styles.hint}>Selected: {CARD_QR_ICON_LABELS[qrIcon]}</p>
              </div>
              <div className={styles.linkBox}>
                <p className={styles.fieldLabel}>Goes to</p>
                <p className={styles.url}>{destinationUrl || 'Site address loading'}</p>
                {qrUrl ? <p className={styles.hint}>Short link {qrUrl}</p> : null}
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={`${styles.button} ${styles.buttonPrimary}`}
                  disabled={!qrBlob}
                  onClick={downloadQr}
                >
                  Download QR
                </button>
                <button type="button" className={styles.button} disabled={!qrBlob} onClick={copyQr}>
                  Copy QR
                </button>
              </div>
            </div>
            <div className={styles.stage}>
              <div className={styles.qrFrame}>
                {qrObjectUrl ? (
                  // The PNG is fetched with the signed-in session, then shown from a local object URL.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrObjectUrl} alt="QR code for your Suite customer site" />
                ) : (
                  <p className={styles.hint}>
                    {destinationUrl ? 'Loading QR…' : 'QR appears when the site address is ready.'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className={styles.step} aria-labelledby="card-qr-flyer">
          <StepHeader
            n={3}
            id="card-qr-flyer"
            title="QR flyer"
            lede="Free digital download. Portrait 9:16 (1080×1920) for TikTok and other social posts. No Stripe charge. The preview is the file you download."
          />
          <div className={styles.split}>
            <div className={styles.controls}>
              <TextLinkCheck
                checked={design.fields.flyerTextLink}
                disabled={!savedNumber}
                onChange={() => toggleField('flyerTextLink')}
                where="under the steps on your flyer"
              />
              <div>
                <p className={styles.fieldLabel} id="card-qr-format-label">File type</p>
                <div className={styles.segment} role="radiogroup" aria-labelledby="card-qr-format-label">
                  {(['jpg', 'png'] as const).map((format) => (
                    <button
                      key={format}
                      type="button"
                      role="radio"
                      aria-checked={flyerFormat === format}
                      disabled={flyerPending}
                      onClick={() => setFlyerFormat(format)}
                    >
                      {format === 'png' ? 'PNG' : 'JPG'}
                    </button>
                  ))}
                </div>
                <p className={styles.hint}>
                  JPG is best for texting and posting from a phone. PNG is full quality.
                </p>
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={`${styles.button} ${styles.buttonPrimary}`}
                  disabled={!destinationUrl || flyerLoading || flyerPending || !flyerCache}
                  onClick={downloadFlyer}
                >
                  {flyerPending
                    ? 'Flyer in progress'
                    : flyerLoading
                      ? 'Making flyer…'
                      : `Download ${flyerFormat === 'jpg' ? 'JPG' : 'PNG'}`}
                </button>
              </div>
              <p className={styles.hint}>
                The name and QR stay in the middle so story buttons don&apos;t cover them.
                Changing your site theme makes a new matching flyer and recolors the QR.
              </p>
              {flyerError ? <p className={styles.error} role="alert">{flyerError}</p> : null}
            </div>
            <div className={styles.stage}>
              <div className={styles.flyerFrame} aria-label="QR flyer preview">
                {flyerPending ? (
                  <p className={styles.hint} role="status">{CARD_QR_FLYER_BEING_BUILT_MESSAGE}</p>
                ) : flyerCache ? (
                  // The image is the server file for the selected type. Download uses these same bytes.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={flyerCache.url} alt="QR flyer preview" />
                ) : (
                  <p className={styles.hint}>
                    {flyerError
                      ? flyerError
                      : destinationUrl
                        ? 'Making your flyer…'
                        : 'The flyer appears when the site address is ready.'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className={styles.step} aria-labelledby="card-qr-cards">
          <StepHeader
            n={4}
            id="card-qr-cards"
            title="Business cards"
            lede="Same QR and the same theme, printed two-sided. Stripe checkout is required before anything prints."
          />
          <div className={styles.cardControls}>
            <TextLinkCheck
              checked={design.fields.textLink}
              disabled={!savedNumber}
              onChange={() => toggleField('textLink')}
              where="as a Text line on the back of your card"
            />
            <div>
              <p className={styles.fieldLabel} id="card-qr-back-label">Back of card</p>
              <div className={styles.toggles} role="group" aria-labelledby="card-qr-back-label">
                {CARD_BACK_TOGGLES.map(([field, label]) => (
                  <button
                    key={field}
                    type="button"
                    className={styles.toggle}
                    aria-pressed={design.fields[field]}
                    disabled={field === 'website' && !hasCustomDomain}
                    onClick={() => toggleField(field)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {!hasCustomDomain ? (
                <p className={styles.hint}>Website shows on the card once your site has its own domain.</p>
              ) : null}
              {design.fields.discount ? (
                <p className={styles.hint}>The discount code is a blank line so you can write a code in by hand.</p>
              ) : null}
              {design.fields.social ? (
                <label className={`${styles.field} ${styles.socialField}`}>
                  <span className={styles.fieldLabel}>Social platform</span>
                  <select
                    className={styles.input}
                    value={design.socialPlatform}
                    onChange={(event) => {
                      const next = parseCardQrSocialPlatform(event.target.value)
                      if (next && next !== design.socialPlatform) saveDesign({ ...design, socialPlatform: next })
                    }}
                  >
                    {CARD_QR_SOCIAL_PLATFORMS.map((platform) => (
                      <option key={platform} value={platform}>{CARD_QR_SOCIAL_PLATFORM_LABELS[platform]}</option>
                    ))}
                  </select>
                  <span className={styles.hint}>
                    {socialHandles && !String(socialHandles[design.socialPlatform] ?? '').trim()
                      ? `Add your ${CARD_QR_SOCIAL_PLATFORM_LABELS[design.socialPlatform]} link in Site settings to show it. Until then the card uses another handle you have, with that app's icon.`
                      : `Your ${CARD_QR_SOCIAL_PLATFORM_LABELS[design.socialPlatform]} handle shows on the back with the ${CARD_QR_SOCIAL_PLATFORM_LABELS[design.socialPlatform]} icon.`}
                  </span>
                </label>
              ) : null}
            </div>
          </div>

          <div className={styles.cardStage} aria-label="Business card preview" aria-busy={cardLoading}>
            {cardPending ? (
              <p className={styles.hint} role="status">{cardPending}</p>
            ) : cardFront && cardBack ? (
              <>
                <figure className={styles.cardSide}>
                  {/* The PNG is the server file. Download uses these same bytes. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cardFront.url} alt="Business card front" />
                  <figcaption>Front</figcaption>
                </figure>
                <figure className={styles.cardSide}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cardBack.url} alt="Business card back" />
                  <figcaption>Back</figcaption>
                </figure>
              </>
            ) : (
              <p className={styles.hint}>
                {cardError ?? (destinationUrl ? 'Making your card…' : 'The card appears when the site address is ready.')}
              </p>
            )}
          </div>
          {cardWarnings.map((w) => <p key={w} className={styles.error} role="status">{w}</p>)}
          {cardError && cardFront ? <p className={styles.error} role="alert">{cardError}</p> : null}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.button}
              disabled={!cardFront || !cardBack || cardLoading || busy === 'card-pdf' || Boolean(cardPending)}
              onClick={downloadCardPdf}
            >
              {busy === 'card-pdf' ? 'Making print PDF…' : 'Download print PDF'}
            </button>
            <button
              type="button"
              className={styles.button}
              disabled={!cardFront || cardLoading || Boolean(cardPending)}
              onClick={() => downloadCardPng('front')}
            >
              Front PNG
            </button>
            <button
              type="button"
              className={styles.button}
              disabled={!cardBack || cardLoading || Boolean(cardPending)}
              onClick={() => downloadCardPng('back')}
            >
              Back PNG
            </button>
          </div>
          <p className={styles.hint}>
            The preview is the print file: 3.5 × 2 in with 0.125 in bleed at 300 dpi. The PDF
            has both sides in CMYK with crop marks. Your card follows your site theme and fonts.
          </p>

          <div className={styles.order}>
            <div>
              <p className={styles.fieldLabel} id="card-qr-pack-label">Order printed cards</p>
              <div className={styles.prices} role="radiogroup" aria-labelledby="card-qr-pack-label">
                {([500, 1000] as const).map((packQuantity) => {
                  const pack = CARD_QR_PACKS[packQuantity]
                  return (
                    <button
                      key={pack.quantity}
                      type="button"
                      role="radio"
                      className={styles.price}
                      aria-checked={quantity === pack.quantity}
                      onClick={() => setQuantity(pack.quantity)}
                    >
                      <span>{pack.label}</span>
                      <strong>{pack.priceLabel}</strong>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className={styles.orderAction}>
              <button
                type="button"
                className={`${styles.button} ${styles.buttonPrimary}`}
                disabled={!destinationUrl || busy === 'checkout' || Boolean(cardPending)}
                onClick={startCheckout}
              >
                {busy === 'checkout' ? 'Opening checkout…' : `Checkout ${CARD_QR_PACKS[quantity].priceLabel}`}
              </button>
              <p className={styles.hint}>
                After payment, Smoke shows the order-received note. Minuteman fulfillment
                stays a manual ops step in this version.
              </p>
            </div>
          </div>
          <div className={styles.finePrint}>
            <p>{CARD_QR_PRICE_COPY} {CARD_QR_SHIPPING_COPY}</p>
            <p>{CARD_QR_TURNAROUND_COPY}</p>
            <p>{CARD_QR_REGION_COPY}</p>
            <p>
              Print spec: {CARD_QR_PRINT_SPEC.trim} trim, {CARD_QR_PRINT_SPEC.bleed} bleed, {CARD_QR_PRINT_SPEC.safe} safe, {CARD_QR_PRINT_SPEC.stock}.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
