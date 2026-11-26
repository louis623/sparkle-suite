'use client'

import { useState, type CSSProperties } from 'react'
import { SocialMark } from '@/lib/amethyst/social-mark-icon'
import type { SocialPlatform } from '@/lib/amethyst/social-mark'
import { isQueuedVideoUrl } from '@/lib/public-site/queue-video-link'
import { isTikTokCardUrl } from '@/lib/public-site/tiktok-video-id'
import { publicVideoDraftUrl } from '@/lib/public-site/media-url'
import type { PublicSiteMediaSlot, PublicSiteMediaSlotKey } from '@/lib/services/types'
import styles from './DashboardPlaceholder.module.css'

type Change = (key: PublicSiteMediaSlotKey, patch: Partial<PublicSiteMediaSlot>) => void

function platformName(url: string) {
  const value = url.toLowerCase()
  if (value.includes('tiktok')) return 'TikTok'
  if (value.includes('youtu')) return 'YouTube'
  if (value.includes('instagram')) return 'Instagram'
  if (value.includes('facebook') || value.includes('fb.watch')) return 'Facebook'
  return ''
}

function platformMark(url: string): SocialPlatform | null {
  const name = platformName(url)
  if (name === 'TikTok') return 'tiktok'
  if (name === 'YouTube') return 'youtube'
  if (name === 'Instagram') return 'instagram'
  if (name === 'Facebook') return 'facebook'
  return null
}

function youtubePosterUrl(videoUrl: string) {
  try {
    const url = new URL(videoUrl)
    if (url.protocol !== 'https:' || url.username || url.password) return ''
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    let id = ''
    if (host === 'youtu.be') id = url.pathname.split('/').filter(Boolean)[0] ?? ''
    else if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
      id = url.searchParams.get('v') || url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/)?.[1] || ''
    }
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : ''
  } catch {
    return ''
  }
}

function storedPosterUrl(slot: PublicSiteMediaSlot) {
  const image = slot.imageUrl.trim()
  if (!image || image.endsWith('.svg')) return ''
  return image
}

function VideoPoster({
  slot,
  variant,
  badge,
  status,
}: {
  slot: PublicSiteMediaSlot
  variant: 'marquee' | 'short'
  badge?: string
  status: string | null
}) {
  const stored = storedPosterUrl(slot)
  const remote = stored || youtubePosterUrl(slot.videoUrl)
  const [failed, setFailed] = useState(false)
  const src = failed ? '' : remote
  const mark = platformMark(slot.videoUrl)
  return (
    <div
      className={variant === 'marquee' ? styles.aboutMarqueePoster : `${styles.aboutShortPoster} ${styles.aboutPosterFilled}`}
      data-poster={src ? 'image' : 'placeholder'}
    >
      {src ? <img src={src} alt="" onError={() => setFailed(true)} /> : null}
      {badge ? <span className={styles.aboutMarqueeBadge}>{badge}</span> : null}
      {status ? <span className={status === 'Queued' ? styles.aboutPillQueue : styles.aboutPillReady}>{status}</span> : null}
      <span className={styles.aboutPlay} aria-hidden="true">▶</span>
      {mark ? (
        <span className={styles.aboutMark}>
          <SocialMark platform={mark} className={styles.aboutMarkIcon} />
        </span>
      ) : null}
    </div>
  )
}

function statusLabel(slot: PublicSiteMediaSlot, queued: boolean) {
  if (!publicVideoDraftUrl(slot.videoUrl)) return null
  if (!queued || !slot.tiktokVideoStatus) return 'Ready'
  if (slot.tiktokVideoStatus === 'live') return 'Ready'
  if (slot.tiktokVideoStatus === 'unavailable') return 'Unavailable'
  return 'Queued'
}

function VideoFields({
  slot,
  savedVideoUrl,
  allSourcesEnabled,
  tiktokQueueEnabled,
  actionPending,
  onChange,
  onRemoveVideo,
}: {
  slot: PublicSiteMediaSlot
  savedVideoUrl: string
  allSourcesEnabled: boolean
  tiktokQueueEnabled: boolean
  actionPending?: boolean
  onChange?: Change
  onRemoveVideo?: (key: PublicSiteMediaSlotKey, expectedUrl: string) => void
}) {
  const lockedTikTok = Boolean(
    tiktokQueueEnabled &&
      !slot.videoPreserved &&
      (allSourcesEnabled ? isQueuedVideoUrl(savedVideoUrl) : isTikTokCardUrl(savedVideoUrl)),
  )
  const videoControl = slot.key === 'showcase' ? 'reveal-video' : 'about-video'
  const captionControl = slot.key === 'showcase' ? 'reveal-caption' : 'video-caption'
  const status = statusLabel(slot, tiktokQueueEnabled)
  return (
    <div className={styles.aboutSheet}>
      <label className={styles.aboutSheetRow} data-site-field={videoControl}>
        <span>{allSourcesEnabled ? 'Video link' : 'Video link or embed'}</span>
        <input
          data-site-control={videoControl}
          type="url"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={slot.videoUrl}
          readOnly={lockedTikTok}
          placeholder={allSourcesEnabled ? 'Paste a public TikTok, YouTube, Instagram, or Facebook video link' : 'Paste a public video link or embed code'}
          aria-describedby={lockedTikTok ? `remove-video-help-${slot.key}` : undefined}
          onChange={(event) => {
            const videoUrl = event.target.value
            onChange?.(slot.key, {
              videoUrl,
              tiktokVideoStatus: null,
              ...(tiktokQueueEnabled ? { isVisible: Boolean(videoUrl.trim()) } : {}),
            })
          }}
        />
      </label>
      {lockedTikTok ? <p id={`remove-video-help-${slot.key}`}>Remove this video before adding a new link.</p> : null}
      <label className={styles.aboutSheetRow} data-site-field={captionControl}>
        <span>
          {allSourcesEnabled ? 'Caption' : 'Video caption (optional)'}{' '}
          <span className={styles.aboutCount}>{slot.caption.length} / 180</span>
        </span>
        <input
          data-site-control={captionControl}
          type="text"
          maxLength={180}
          value={slot.caption}
          placeholder={allSourcesEnabled ? 'A short line under the video' : 'Add a short caption shown below the video'}
          onChange={(event) => onChange?.(slot.key, { caption: event.target.value })}
        />
      </label>
      {status === 'Queued' ? (
        <p className={styles.aboutSheetHelp} role="status">Your video is queued. This can take <span className={styles.aboutNowrap}>24–48 hours</span>.</p>
      ) : null}
      {status === 'Unavailable' ? (
        <p className={styles.aboutSheetHelp} role="status">We couldn&apos;t use this video. It may be private or too long. Remove it and try another link, or contact us.</p>
      ) : null}
      {status === 'Ready' && tiktokQueueEnabled && slot.tiktokVideoStatus === 'live' ? (
        <p className={styles.aboutSheetHelp} role="status">Your video is ready. Visitors can tap Play to watch.</p>
      ) : null}
      {lockedTikTok || slot.videoPreserved ? (
        <button
          type="button"
          className={styles.aboutDanger}
          data-site-control={slot.key === 'showcase' ? 'reveal-video-remove' : 'remove-video'}
          disabled={actionPending}
          onClick={() => {
            if (window.confirm('Remove this video from your site?')) onRemoveVideo?.(slot.key, savedVideoUrl)
          }}
        >
          Remove video
        </button>
      ) : null}
    </div>
  )
}

export function AboutMarquee({
  slot,
  savedVideoUrl,
  allSourcesEnabled,
  tiktokQueueEnabled,
  actionPending,
  onChange,
  onRemoveVideo,
}: {
  slot: PublicSiteMediaSlot
  savedVideoUrl: string
  allSourcesEnabled: boolean
  tiktokQueueEnabled: boolean
  actionPending?: boolean
  onChange?: Change
  onRemoveVideo?: (key: PublicSiteMediaSlotKey, expectedUrl: string) => void
}) {
  const filled = Boolean(publicVideoDraftUrl(slot.videoUrl))
  const status = statusLabel(slot, tiktokQueueEnabled)
  return (
    <div className={styles.aboutMarqueeRow}>
      <article className={styles.aboutMarquee}>
        <VideoPoster slot={slot} variant="marquee" badge="Marquee" status={null} />
      </article>
      <div className={styles.aboutMarqueeCopy}>
        <p className={styles.aboutKicker}>Marquee video</p>
        <p className={styles.aboutLegend}>Customers see this as the Watch a Live Reveal card, above the About section.</p>
        {slot.caption ? <p className={styles.aboutVideoCaption}>{slot.caption}</p> : null}
        {status ? <p className={status === 'Queued' ? styles.aboutPillQueue : styles.aboutPillReady}>{status}</p> : null}
        <details className={styles.aboutEdit}>
          <summary>{filled ? 'Edit' : 'Add a video'}</summary>
          <VideoFields
            slot={slot}
            savedVideoUrl={savedVideoUrl}
            allSourcesEnabled={allSourcesEnabled}
            tiktokQueueEnabled={tiktokQueueEnabled}
            actionPending={actionPending}
            onChange={onChange}
            onRemoveVideo={onRemoveVideo}
          />
        </details>
      </div>
    </div>
  )
}

export function AboutShortRail({
  slots,
  savedSlots,
  allSourcesEnabled,
  tiktokQueueEnabled,
  actionPending,
  onChange,
  onRemoveVideo,
}: {
  slots: PublicSiteMediaSlot[]
  savedSlots?: PublicSiteMediaSlot[] | null
  allSourcesEnabled: boolean
  tiktokQueueEnabled: boolean
  actionPending?: boolean
  onChange?: Change
  onRemoveVideo?: (key: PublicSiteMediaSlotKey, expectedUrl: string) => void
}) {
  const ordered = ['about_2', 'about_3', 'about_4']
    .map((key) => slots.find((slot) => slot.key === key))
    .filter((slot): slot is PublicSiteMediaSlot => Boolean(slot))
  const firstEmpty = ordered.find((slot) => !publicVideoDraftUrl(slot.videoUrl))?.key
  return (
    <div className={styles.aboutShortRail} role="list">
      {ordered.map((slot) => {
        const filled = Boolean(publicVideoDraftUrl(slot.videoUrl))
        const hidden = !filled && slot.key !== firstEmpty
        const status = statusLabel(slot, tiktokQueueEnabled)
        return (
          <article key={slot.key} className={hidden ? styles.aboutShortHidden : styles.aboutShort} role="listitem">
            {filled ? (
              <VideoPoster slot={slot} variant="short" status={status} />
            ) : (
              <div className={styles.aboutShortPoster}>
                <span className={styles.aboutPlus} aria-hidden="true">+</span>
              </div>
            )}
            <div className={styles.aboutShortCaption}>
              <p className={styles.aboutVideoCaption}>{filled ? slot.caption : ''}</p>
            </div>
            <details className={styles.aboutEdit}>
              <summary>{filled ? 'Edit' : 'Add a video'}</summary>
              <VideoFields
                slot={slot}
                savedVideoUrl={savedSlots?.find((saved) => saved.key === slot.key)?.videoUrl ?? ''}
                allSourcesEnabled={allSourcesEnabled}
                tiktokQueueEnabled={tiktokQueueEnabled}
                actionPending={actionPending}
                onChange={onChange}
                onRemoveVideo={onRemoveVideo}
              />
            </details>
          </article>
        )
      })}
    </div>
  )
}

export function aboutPhotoStyle(slot: PublicSiteMediaSlot): CSSProperties {
  return {
    '--homepage-portrait-focus-x': `${slot.portraitFocusX ?? 50}%`,
    '--homepage-portrait-focus-y': `${slot.portraitFocusY ?? 20}%`,
    '--homepage-portrait-zoom': String(slot.portraitZoom ?? 1.18),
  } as CSSProperties
}
