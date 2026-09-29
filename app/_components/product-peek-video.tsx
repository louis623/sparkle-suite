'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './product-peek-video.module.css'

type ProductPeekVideoProps = {
  poster: string
  mp4: string
  width: number
  height: number
  alt: string
  label: string
  active?: boolean
}

function motionPreference() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function ProductPeekVideo({
  poster,
  mp4,
  width,
  height,
  alt,
  label,
  active = true,
}: ProductPeekVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [reduced, setReduced] = useState(false)
  const [userPaused, setUserPaused] = useState(false)
  const playing = active && !reduced && !userPaused

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const shouldPlay = () => active && !motionPreference() && !userPaused && !document.hidden

    if (shouldPlay()) {
      const play = video.play()
      if (play) play.catch(() => {})
    } else {
      video.pause()
    }

    const onVisibility = () => {
      if (shouldPlay()) {
        const play = video.play()
        if (play) play.catch(() => {})
      } else {
        video.pause()
      }
    }

    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [active, reduced, userPaused])

  return (
    <div className={styles.media} style={{ aspectRatio: `${width} / ${height}` }}>
      {/* Native img so reduced-motion CSS can show this still in place of the video. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.still} src={poster} alt={alt} width={width} height={height} />
      <video
        ref={videoRef}
        className={styles.motion}
        poster={poster}
        width={width}
        height={height}
        muted
        loop
        playsInline
        autoPlay={playing}
        preload={active ? 'auto' : 'metadata'}
        aria-label={alt}
        disablePictureInPicture
      >
        <source src={mp4} type="video/mp4" />
      </video>
      {active ? (
        <button
          type="button"
          className={styles.pause}
          aria-pressed={playing}
          aria-label={playing ? `Pause ${label} animation` : `Play ${label} animation`}
          onClick={() => setUserPaused((paused) => !paused)}
        >
          {playing ? 'Pause' : 'Play'}
        </button>
      ) : null}
    </div>
  )
}
