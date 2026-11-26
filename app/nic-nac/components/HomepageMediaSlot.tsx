'use client'

import type { CSSProperties } from 'react'
import { isQueuedVideoUrl } from '@/lib/public-site/queue-video-link'
import { isTikTokCardUrl } from '@/lib/public-site/tiktok-video-id'
import { publicVideoDraftUrl } from '@/lib/public-site/media-url'
import type { PublicSiteMediaSlot, PublicSiteMediaSlotKey } from '@/lib/services/types'
import styles from './DashboardPlaceholder.module.css'
import { SHOWS_ON, SETUP_FIELD_IDS } from './site-settings-layout'

function ShowsOn({ id, children }: { id: string; children: string }) {
  return (
    <span id={id} className={styles.showsOn} data-shows-on="">
      Shows on your site: {children}
    </span>
  )
}

export function HomepageMediaSlot({
  slot,
  savedVideoUrl,
  isBrittWithBling,
  allSourcesEnabled,
  tiktokQueueEnabled,
  isUploading,
  feedback,
  actionPending,
  onChange,
  onUpload,
  onRemoveVideo,
}: {
  slot: PublicSiteMediaSlot
  savedVideoUrl: string
  isBrittWithBling: boolean
  allSourcesEnabled: boolean
  tiktokQueueEnabled: boolean
  isUploading: boolean
  feedback?: { message: string; tone: 'error' | 'success' } | null
  actionPending?: boolean
  onChange?: (
    key: PublicSiteMediaSlotKey,
    patch: Partial<PublicSiteMediaSlot>,
  ) => void
  onUpload?: (key: PublicSiteMediaSlotKey, file: File) => void
  onRemoveVideo?: (key: PublicSiteMediaSlotKey, expectedUrl: string) => void
}) {
  const label =
    slot.key === 'showcase'
      ? isBrittWithBling
        ? 'What is a Bomb Party? showcase video'
        : 'Live reveal video'
      : slot.key === 'about_1'
        ? isBrittWithBling
          ? 'About Brittany portrait'
          : 'About portrait photo'
        : isBrittWithBling
          ? `Sparkle moment ${Number(slot.key.slice(-1)) - 1}`
          : `About short video ${Number(slot.key.slice(-1)) - 1}`
  const allowsPhoto = slot.key === 'about_1'
  const allowsVideo = slot.key !== 'about_1'
  const lockedTikTok = Boolean(
    tiktokQueueEnabled &&
      !slot.videoPreserved &&
      (allSourcesEnabled ? isQueuedVideoUrl(savedVideoUrl) : isTikTokCardUrl(savedVideoUrl)),
  )
  const hasVisiblePhoto = allowsPhoto && Boolean(slot.imageUrl) && slot.isVisible !== false
  const hasVisibleVideo =
    allowsVideo && Boolean(publicVideoDraftUrl(slot.videoUrl)) && slot.isVisible !== false
  const videoShows = slot.key === 'showcase' ? SHOWS_ON.revealVideo : SHOWS_ON.aboutVideo
  const captionShows = slot.key === 'showcase' ? SHOWS_ON.revealCaption : SHOWS_ON.videoCaption
  const videoControl = slot.key === 'showcase' ? 'reveal-video' : 'about-video'
  const captionControl = slot.key === 'showcase' ? 'reveal-caption' : 'video-caption'
  const videoDescribedBy = [
    `${slot.key}-video-shows`,
    lockedTikTok ? `remove-video-help-${slot.key}` : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section
      className={`${styles.homepageMediaCard} ${
        allowsPhoto ? styles.homepagePortraitMediaCard : styles.homepageVideoMediaCard
      }`}
    >
      <div className={styles.homepageMediaCardHeader}>
        <strong>{label}</strong>
        {hasVisiblePhoto ? <span>Photo added</span> : null}
        {isBrittWithBling && hasVisibleVideo ? <span>Video added</span> : null}
        {isBrittWithBling && slot.isVisible === false ? <span>Removed</span> : null}
      </div>
      {hasVisiblePhoto ? (
        <div className={styles.homepagePortraitFramePreview}>
          <img
            className={styles.homepageMediaPreview}
            src={slot.imageUrl}
            alt={`${label} preview`}
            width={800}
            height={1000}
            style={{
              '--homepage-portrait-focus-x': `${slot.portraitFocusX ?? 50}%`,
              '--homepage-portrait-focus-y': `${slot.portraitFocusY ?? 20}%`,
              '--homepage-portrait-zoom': slot.portraitZoom ?? 1.18,
            } as CSSProperties}
          />
        </div>
      ) : null}
      {allowsPhoto ? (
        <div data-site-field="about-photo">
        <label className={styles.homepageMediaUploadButton}>
          {isUploading ? 'Uploading...' : slot.imageUrl ? 'Replace photo' : 'Upload photo'}
          <input
            id={SETUP_FIELD_IDS.aboutPhoto}
            className={styles.homepageMediaFileInput}
            data-site-control="about-photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={isUploading}
            aria-describedby="about-photo-shows"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) onUpload?.(slot.key, file)
              event.target.value = ''
            }}
          />
        </label>
        <ShowsOn id="about-photo-shows">{SHOWS_ON.aboutPhoto}</ShowsOn>
        </div>
      ) : null}
      {feedback ? (
        <p
          className={
            feedback.tone === 'success'
              ? styles.homepageMediaUploadSuccess
              : styles.homepageMediaUploadError
          }
          role="status"
        >
          {feedback.message}
        </p>
      ) : null}
      {allowsVideo ? (
        <label className={styles.searchField} data-site-field={videoControl}>
          <span className={styles.searchLabel}>
            {allSourcesEnabled ? 'Video link' : 'Video link or embed'}
          </span>
          <input
            className={styles.searchInput}
            data-site-control={videoControl}
            type="text"
            placeholder={
              allSourcesEnabled
                ? 'Paste a public TikTok, YouTube, Instagram, or Facebook video link'
                : 'Paste a public video link or embed code'
            }
            value={slot.videoUrl}
            readOnly={lockedTikTok}
            aria-describedby={videoDescribedBy}
            onChange={(event) => {
              const videoUrl = event.target.value
              onChange?.(slot.key, {
                videoUrl,
                tiktokVideoStatus: null,
                ...(isBrittWithBling || tiktokQueueEnabled
                  ? { isVisible: Boolean(videoUrl.trim()) }
                  : {}),
              })
            }}
          />
          {lockedTikTok ? (
            <span id={`remove-video-help-${slot.key}`}>Remove this video before adding a new link.</span>
          ) : null}
          {tiktokQueueEnabled && slot.tiktokVideoStatus ? (
            <span role="status">
              {allSourcesEnabled
                ? slot.tiktokVideoStatus === 'live'
                  ? 'Your video is ready. Visitors can tap Play to watch.'
                  : slot.tiktokVideoStatus === 'unavailable'
                    ? "We couldn't use this video. It may be private or too long. Remove it and try another link, or contact us."
                    : 'Your video is queued. This can take 24–48 hours.'
                : slot.tiktokVideoStatus === 'live'
                  ? 'Video is ready and now playing on your site.'
                  : 'Video is queued to be pulled and placed on your site. This can take up to 24–48 hours.'}
            </span>
          ) : null}
          <ShowsOn id={`${slot.key}-video-shows`}>{videoShows}</ShowsOn>
        </label>
      ) : null}
      {allowsVideo ? (
        <label className={styles.searchField} data-site-field={captionControl}>
          <span className={styles.searchLabel}>
            {allSourcesEnabled ? 'Caption (optional)' : 'Video caption (optional)'}
          </span>
          <input
            className={styles.searchInput}
            data-site-control={captionControl}
            maxLength={180}
            placeholder={
              allSourcesEnabled
                ? 'A short line under the video'
                : 'Add a short caption shown below the video'
            }
            value={slot.caption}
            aria-describedby={`${slot.key}-caption-shows`}
            onChange={(event) => onChange?.(slot.key, { caption: event.target.value })}
          />
          <ShowsOn id={`${slot.key}-caption-shows`}>{captionShows}</ShowsOn>
        </label>
      ) : null}
      {isBrittWithBling && hasVisibleVideo ? (
        <div className={styles.homepageMediaCurrentState}>
          <span>Current video is ready.</span>
          <a href={slot.videoUrl} target="_blank" rel="noreferrer noopener">
            Open video
          </a>
        </div>
      ) : null}
      {allowsVideo && slot.videoUrl.trim() && !hasVisibleVideo ? (
        <p className={styles.homepageMediaUploadError} role="status">
          This link is not a playable public video. Replace it so your other changes can save.
        </p>
      ) : null}
      {hasVisiblePhoto ? (
        <fieldset className={styles.homepagePortraitControls} data-site-field="smart-frame" data-site-control="smart-frame">
          <legend>Smart Frame</legend>
          <span>Fine-tune only if the automatic preview needs it.</span>
          <label>
            <span>Zoom</span>
            <input
              type="range"
              min="1"
              max="1.5"
              step="0.01"
              value={slot.portraitZoom ?? 1.18}
              onChange={(event) =>
                onChange?.(slot.key, { portraitZoom: Number(event.target.value) })
              }
            />
          </label>
          <label>
            <span>Move subject up or down</span>
            <input
              type="range"
              min="0"
              max="60"
              step="1"
              value={slot.portraitFocusY ?? 20}
              onChange={(event) =>
                onChange?.(slot.key, { portraitFocusY: Number(event.target.value) })
              }
            />
          </label>
          <label>
            <span>Move subject left or right</span>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={slot.portraitFocusX ?? 50}
              onChange={(event) =>
                onChange?.(slot.key, { portraitFocusX: Number(event.target.value) })
              }
            />
          </label>
          <ShowsOn id="smart-frame-shows">{SHOWS_ON.smartFrame}</ShowsOn>
        </fieldset>
      ) : null}
      {allowsPhoto ? (
        <label className={styles.searchField} data-site-field="photo-caption">
          <span className={styles.searchLabel}>Photo caption</span>
          <input
            className={styles.searchInput}
            data-site-control="photo-caption"
            maxLength={240}
            value={slot.caption}
            aria-describedby="photo-caption-shows"
            onChange={(event) => onChange?.(slot.key, { caption: event.target.value })}
          />
          <ShowsOn id="photo-caption-shows">{SHOWS_ON.photoCaption}</ShowsOn>
        </label>
      ) : null}
      {hasVisiblePhoto ? (
        <button
          type="button"
          className={styles.homepageMediaRemoveButton}
          data-site-control="remove-photo"
          onClick={() =>
            onChange?.(slot.key, {
              imageUrl: '',
              ...(isBrittWithBling ? { isVisible: false } : {}),
            })
          }
        >
          Remove photo
        </button>
      ) : null}
      {lockedTikTok || slot.videoPreserved ? (
        <button
          type="button"
          className={styles.homepageMediaRemoveButton}
          data-site-control={slot.key === 'showcase' ? 'reveal-video-remove' : 'remove-video'}
          disabled={actionPending}
          onClick={() => {
            if (window.confirm('Remove this video from your site?')) onRemoveVideo?.(slot.key, savedVideoUrl)
          }}
        >
          Remove video
        </button>
      ) : isBrittWithBling && hasVisibleVideo ? (
        <button
          type="button"
          className={styles.homepageMediaRemoveButton}
          data-site-control={slot.key === 'showcase' ? 'reveal-video-remove' : 'remove-video'}
          onClick={() => onChange?.(slot.key, { videoUrl: '', isVisible: false })}
        >
          Remove video
        </button>
      ) : null}
    </section>
  )
}
