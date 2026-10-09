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
  DEFAULT_CARD_QR_DESIGN,
  buildCardQrCopyLines,
} from '@/lib/workspace/card-qr/design'
import { resolveCardQrDestination } from '@/lib/workspace/card-qr/destination'
import { CARD_QR_FLYER_BEING_BUILT_MESSAGE } from '@/lib/workspace/card-qr/flyer-copy'
import {
  DEFAULT_CARD_QR_FLYER_FORMAT,
  flyerDownloadBytes,
  flyerPreviewCacheKey,
  type CardQrFlyerFormat,
} from '@/lib/workspace/card-qr/flyer-format'
import { resolveCardQrPalette } from '@/lib/workspace/card-qr/palette'
import { CARD_QR_ENTRY_TITLE } from '@/lib/workspace/card-qr/access'
import styles from './CardQrTool.module.css'

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
  const destinationUrl = useMemo(
    () => resolveCardQrDestination(siteHref, origin),
    [origin, siteHref],
  )
  const design = DEFAULT_CARD_QR_DESIGN
  const palette = resolveCardQrPalette({
    templateId: design.templateId,
    appearancePreset,
  })
  const lines = buildCardQrCopyLines({
    displayName,
    businessName,
    email,
    socialHandles,
  })

  useEffect(() => {
    if (!destinationUrl) return
    const controller = new AbortController()
    let objectUrl: string | null = null
    setQrBlob(null)
    setQrObjectUrl(null)
    void fetch(`/api/workspace/card-qr/qr?skin=${encodeURIComponent(appearancePreset)}`, {
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
  }, [appearancePreset, destinationUrl])

  useEffect(() => {
    if (!destinationUrl) return
    const controller = new AbortController()
    let objectUrl: string | null = null
    const key = flyerPreviewCacheKey(flyerFormat, destinationUrl)
    setFlyerLoading(true)
    setFlyerError(null)
    setFlyerPending(false)
    setFlyerCache(null)
    void fetch('/api/workspace/card-qr/flyer', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format: flyerFormat }),
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
  }, [destinationUrl, flyerFormat])

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

  function downloadFlyer() {
    if (!destinationUrl) return
    const bytes = flyerDownloadBytes(
      flyerCache,
      flyerPreviewCacheKey(flyerFormat, destinationUrl),
    )
    if (!bytes) return
    setFlyerError(null)
    const extension = flyerFormat === 'jpg' ? 'jpg' : 'png'
    downloadBlob(bytes, `sparkle-qr-flyer.${extension}`)
  }

  async function download(path: string, filename: string, key: string) {
    setBusy(key)
    setStatus(null)
    try {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ design }),
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
        body: JSON.stringify({ quantity, design }),
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
    <div className={`${styles.stack} suite-marketing`} data-smoke-tool="card-qr">
      <section className={`${styles.section} ${styles.opening}`}>
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
      {notice ? <div className={styles.banner}>{notice}</div> : null}
      {status ? <div className={`${styles.banner} ${styles.warning}`}>{status}</div> : null}

      <section className={`${styles.section} ${styles.qrBand}`} aria-labelledby="card-qr-code">
        <h3 id="card-qr-code" className={styles.title}>QR code</h3>
        <p className={styles.body}>
          Your customer site already has an address. This QR points at it, and
          the flyer and cards use the same code.
        </p>
        <div className={styles.qrLayout}>
          <div className={styles.qrCopy}>
            <p className={`${styles.url} ${styles.qrUrl}`}>{destinationUrl || 'Site address loading'}</p>
            <div className={`${styles.actions} ${styles.qrActions}`}>
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
          <div className={styles.qrFrame}>
            {qrObjectUrl ? (
              // The PNG is fetched with the signed-in session, then shown from a local object URL.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrObjectUrl} alt="QR code for your Suite customer site" />
            ) : (
              <p className={styles.body}>
                {destinationUrl ? 'Loading QR…' : 'QR appears when the site address is ready.'}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.flyerBand}`} aria-labelledby="card-qr-flyer">
        <h3 id="card-qr-flyer" className={styles.title}>QR flyer</h3>
        <p className={styles.body}>
          Free digital download. Portrait 9:16 (1080×1920) for TikTok and other
          social posts. No Stripe charge. The preview is the file you download.
        </p>
        <div className={styles.formatRow} role="group" aria-label="Flyer file type">
          {(['jpg', 'png'] as const).map((format) => (
            <button
              key={format}
              type="button"
              className={styles.choice}
              aria-pressed={flyerFormat === format}
              disabled={flyerPending}
              onClick={() => setFlyerFormat(format)}
            >
              {format === 'png' ? 'PNG' : 'JPG'}
            </button>
          ))}
        </div>
        <div className={styles.layout}>
          <div>
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
            <p className={styles.spec}>
              JPG is the default, and the best file for texting and posting from a phone.
              PNG is full quality. The name and QR stay in the middle so story buttons
              do not cover them. Changing your site theme makes a new matching flyer.
              The QR stays the same.
            </p>
            {flyerError ? <p className={styles.flyerError} role="alert">{flyerError}</p> : null}
          </div>
          <div className={styles.flyerFrame} aria-label="QR flyer preview">
            {flyerPending ? (
              <p className={styles.body} role="status">{CARD_QR_FLYER_BEING_BUILT_MESSAGE}</p>
            ) : flyerCache ? (
              // The image is the server file for the selected type. Download uses these same bytes.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={flyerCache.url} alt="QR flyer preview" />
            ) : (
              <p className={styles.body}>
                {flyerError
                  ? flyerError
                  : destinationUrl
                    ? 'Making your flyer…'
                    : 'The flyer appears when the site address is ready.'}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.cardBand}`} aria-labelledby="card-qr-cards">
        <h3 id="card-qr-cards" className={styles.title}>Business cards</h3>
        <p className={styles.body}>
          Same QR and the same theme. Stripe checkout is required before fulfillment.
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
            {qrObjectUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.cardQr} src={qrObjectUrl} alt="" />
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
        <div className={styles.finePrint}>
          <p className={styles.spec}>{CARD_QR_PRICE_COPY} {CARD_QR_SHIPPING_COPY}</p>
          <p className={styles.spec}>{CARD_QR_TURNAROUND_COPY}</p>
          <p className={styles.spec}>{CARD_QR_REGION_COPY}</p>
          <p className={styles.spec}>
            Print spec: {CARD_QR_PRINT_SPEC.trim} trim, {CARD_QR_PRINT_SPEC.bleed} bleed, {CARD_QR_PRINT_SPEC.safe} safe, {CARD_QR_PRINT_SPEC.stock}.
          </p>
        </div>
      </section>
    </div>
  )
}
