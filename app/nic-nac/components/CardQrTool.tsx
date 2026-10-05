'use client'

import { useEffect, useMemo, useState } from 'react'
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
  CARD_QR_TEMPLATES,
  DEFAULT_CARD_QR_DESIGN,
  buildCardQrCopyLines,
  parseCardQrDesign,
  type CardQrDesign,
  type CardQrFields,
} from '@/lib/workspace/card-qr/design'
import { resolveCardQrDestination } from '@/lib/workspace/card-qr/destination'
import { resolveCardQrPalette } from '@/lib/workspace/card-qr/palette'
import { CARD_QR_ENTRY_TITLE } from '@/lib/workspace/card-qr/access'
import styles from './CardQrTool.module.css'

const LOCAL_DESIGN_KEY = 'sparkle-suite:smoke-card-qr-design'

const FIELD_OPTIONS: Array<{ key: keyof CardQrFields; label: string }> = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'qr', label: 'QR' },
  { key: 'discount', label: 'Discount' },
  { key: 'social', label: 'Social' },
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

export function CardQrTool({
  siteHref,
  displayName,
  businessName,
  email,
  appearancePreset,
  socialHandles,
}: {
  siteHref: string | null
  displayName: string
  businessName: string
  email: string
  appearancePreset: string
  socialHandles: Record<string, string>
}) {
  const [origin, setOrigin] = useState<string | null>(null)
  const [design, setDesign] = useState<CardQrDesign>(DEFAULT_CARD_QR_DESIGN)
  const [quantity, setQuantity] = useState<CardQrPackQuantity>(500)
  const [status, setStatus] = useState<string | null>(null)
  const [orderMessage, setOrderMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const destinationUrl = useMemo(
    () => resolveCardQrDestination(siteHref, origin),
    [origin, siteHref],
  )
  const palette = resolveCardQrPalette({
    templateId: design.templateId,
    appearancePreset,
  })
  const lines = buildCardQrCopyLines({
    displayName,
    businessName,
    email,
    socialHandles,
    design,
  })

  useEffect(() => {
    setOrigin(window.location.origin)
    const saved = window.localStorage.getItem(LOCAL_DESIGN_KEY)
    if (saved) {
      try {
        setDesign(parseCardQrDesign(JSON.parse(saved)))
      } catch {
        setDesign(DEFAULT_CARD_QR_DESIGN)
      }
    }
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

  useEffect(() => {
    if (!destinationUrl) return
    void fetch('/api/workspace/card-qr')
      .then(async (response) => {
        if (!response.ok) return
        const body = await response.json()
        if (body.profile?.design) setDesign(parseCardQrDesign(body.profile.design))
      })
      .catch(() => undefined)
  }, [appearancePreset, destinationUrl])

  function updateDesign(next: CardQrDesign) {
    setDesign(next)
    window.localStorage.setItem(LOCAL_DESIGN_KEY, JSON.stringify(next))
  }

  async function saveProfile() {
    setBusy('save')
    setStatus(null)
    try {
      const response = await fetch('/api/workspace/card-qr', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ design }),
      })
      if (!response.ok) throw new Error(await readError(response))
      const body = await response.json()
      setStatus(body.notice || 'Saved to your profile.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not save the QR.')
    } finally {
      setBusy(null)
    }
  }

  async function copyUrl() {
    if (!destinationUrl) return
    try {
      await navigator.clipboard.writeText(destinationUrl)
      setStatus('Site address copied.')
    } catch {
      setStatus('Could not copy the site address.')
    }
  }

  async function download(path: string, filename: string, key: string) {
    setBusy(key)
    setStatus(null)
    try {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ design, appearancePreset }),
      })
      if (!response.ok) throw new Error(await readError(response))
      downloadBlob(await response.blob(), filename)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Download failed.')
    } finally {
      setBusy(null)
    }
  }

  async function startCheckout() {
    setBusy('checkout')
    setStatus(null)
    try {
      const response = await fetch('/api/workspace/card-qr/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity, design, appearancePreset }),
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

  const previewStyle = {
    background: palette.background,
    color: palette.ink,
  }

  return (
    <div className={styles.stack} data-smoke-tool="card-qr">
      <section className={styles.section}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>{CARD_QR_ENTRY_TITLE}</h2>
            <p className={styles.subtitle}>
              One QR for your current Suite site. The flyer is a free portrait
              download. Printed cards are paid before anyone prints them.
            </p>
          </div>
          <span className={styles.eyebrow}>Smoke only</span>
        </div>
      </section>

      {orderMessage ? <div className={styles.banner}>{orderMessage}</div> : null}
      {status ? <div className={`${styles.banner} ${styles.warning}`}>{status}</div> : null}

      <section className={styles.section} aria-labelledby="card-qr-builder">
        <h3 id="card-qr-builder" className={styles.title}>QR code builder</h3>
        <p className={styles.body}>
          This code always points at your current Suite customer site. Flyer and
          cards reuse this same QR.
        </p>
        <p className={styles.url}>{destinationUrl || 'Site address loading'}</p>
        <div className={styles.layout}>
          <div>
            <div className={styles.actions}>
              <button type="button" className={`${styles.button} ${styles.buttonPrimary}`} onClick={saveProfile} disabled={!destinationUrl || busy === 'save'}>
                {busy === 'save' ? 'Saving…' : 'Save to profile'}
              </button>
              <button type="button" className={styles.button} onClick={copyUrl} disabled={!destinationUrl}>
                Copy site address
              </button>
              {destinationUrl ? (
                <a className={styles.button} href="/api/workspace/card-qr/qr" download="sparkle-site-qr.png">
                  Download QR
                </a>
              ) : null}
            </div>
          </div>
          <div className={styles.qrFrame}>
            {destinationUrl ? (
              // The QR image is generated for this signed-in rep. Next image optimization does not apply.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/workspace/card-qr/qr?skin=${encodeURIComponent(appearancePreset)}`} alt="QR code for your Suite customer site" />
            ) : (
              <p className={styles.body}>QR appears when the site address is ready.</p>
            )}
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="card-qr-flyer">
        <h3 id="card-qr-flyer" className={styles.title}>QR flyer</h3>
        <p className={styles.body}>
          Free digital download. Portrait 9:16 (1080×1920) for TikTok and other
          social posts. No Stripe charge.
        </p>
        <DesignControls design={design} onDesignChange={updateDesign} />
        <div className={styles.layout}>
          <div>
            <div className={styles.actions}>
              <button
                type="button"
                className={`${styles.button} ${styles.buttonPrimary}`}
                disabled={!destinationUrl || busy === 'flyer'}
                onClick={() => download('/api/workspace/card-qr/flyer', 'sparkle-qr-flyer.png', 'flyer')}
              >
                {busy === 'flyer' ? 'Making flyer…' : 'Download portrait PNG'}
              </button>
            </div>
            <p className={styles.spec}>
              The name and QR stay in the middle so story buttons do not cover them.
              Changing your site theme makes a new matching flyer. The QR stays the same.
            </p>
          </div>
          <div className={styles.flyerFrame} style={previewStyle} aria-label={`${palette.name} flyer preview`}>
            {lines.map((line) => <strong key={line}>{line}</strong>)}
            {design.fields.qr && destinationUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.flyerQr} src="/api/workspace/card-qr/qr" alt="" />
            ) : null}
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="card-qr-cards">
        <h3 id="card-qr-cards" className={styles.title}>Business cards</h3>
        <p className={styles.body}>
          Same QR and the same theme. Stripe checkout is required before fulfillment.
        </p>
        <p className={styles.spec}>{CARD_QR_PRICE_COPY} {CARD_QR_SHIPPING_COPY}</p>
        <p className={styles.spec}>{CARD_QR_TURNAROUND_COPY}</p>
        <p className={styles.spec}>{CARD_QR_REGION_COPY}</p>
        <p className={styles.spec}>
          Print spec: {CARD_QR_PRINT_SPEC.trim} trim, {CARD_QR_PRINT_SPEC.bleed} bleed, {CARD_QR_PRINT_SPEC.safe} safe, {CARD_QR_PRINT_SPEC.stock}.
        </p>
        <div className={styles.prices}>
          {([500, 1000] as const).map((packQuantity) => {
            const pack = CARD_QR_PACKS[packQuantity]
            return (
              <button
                key={pack.quantity}
                type="button"
                className={styles.price}
                aria-pressed={quantity === pack.quantity}
                onClick={() => setQuantity(pack.quantity)}
              >
                <span>{pack.label}</span>
                <strong>{pack.priceLabel}</strong>
              </button>
            )
          })}
        </div>
        <div className={styles.layout}>
          <div className={styles.cardFace} style={previewStyle} aria-label={`${palette.name} card preview`}>
            <div>
              {lines.slice(0, 3).map((line) => <strong key={line}>{line}</strong>)}
            </div>
            {design.fields.qr && destinationUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.cardQr} src="/api/workspace/card-qr/qr" alt="" />
            ) : null}
            <span className={styles.cardMeta}>Front matches {palette.name}. Back stays uncoated.</span>
          </div>
          <div>
            <div className={styles.actions}>
              <button
                type="button"
                className={`${styles.button} ${styles.buttonPrimary}`}
                disabled={!destinationUrl || busy === 'checkout'}
                onClick={startCheckout}
              >
                {busy === 'checkout' ? 'Opening checkout…' : `Checkout ${CARD_QR_PACKS[quantity].priceLabel}`}
              </button>
              <button
                type="button"
                className={styles.button}
                disabled={!destinationUrl || busy === 'press'}
                onClick={() => download('/api/workspace/card-qr/press-stub', 'sparkle-business-card-press-stub.pdf', 'press')}
              >
                Download press file stub
              </button>
            </div>
            <p className={styles.spec}>
              After payment, Smoke shows the order-received note. Minuteman fulfillment
              stays a manual ops step in this version.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

function DesignControls({
  design,
  onDesignChange,
}: {
  design: CardQrDesign
  onDesignChange: (design: CardQrDesign) => void
}) {
  return (
    <div>
      <div className={styles.choiceRow} role="group" aria-label="Template">
        {CARD_QR_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            className={styles.choice}
            aria-pressed={design.templateId === template.id}
            onClick={() => onDesignChange({ ...design, templateId: template.id })}
          >
            {template.label}
          </button>
        ))}
      </div>
      <div className={styles.fieldRow} role="group" aria-label="Fields">
        {FIELD_OPTIONS.map((field) => (
          <button
            key={field.key}
            type="button"
            className={styles.field}
            aria-pressed={design.fields[field.key]}
            onClick={() =>
              onDesignChange({
                ...design,
                fields: { ...design.fields, [field.key]: !design.fields[field.key] },
              })
            }
          >
            {field.label}
          </button>
        ))}
      </div>
      {design.fields.discount ? (
        <input
          className={styles.discountInput}
          aria-label="Discount code"
          value={design.discountCode}
          maxLength={40}
          onChange={(event) => onDesignChange({ ...design, discountCode: event.target.value })}
        />
      ) : null}
    </div>
  )
}
