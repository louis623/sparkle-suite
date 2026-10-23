'use client'
import { useEffect, useRef, useState } from 'react'
import type { PeekPlaybackState } from '@/lib/sparkle-suite/portfolio-carousel-playback'
import styles from './product-peek-video.module.css'

export type ProductPeekPlaybackProps = {
  active?: boolean
  paused?: boolean
  requested?: boolean
  showControl?: boolean
  onPlaybackStateChange?: (state: PeekPlaybackState) => void
}
type ProductPeekVideoProps = ProductPeekPlaybackProps & {
  poster: string; mp4: string; width: number; height: number
  alt: string; label: string
  eagerPoster?: boolean
  fit?: 'contain' | 'cover'
}
/** Real recordings, loaded only in view. Carousel owners control both media and advancement. */
export function ProductPeekVideo({ poster, mp4, width, height, alt, label, active = true, paused: controlledPaused, requested: controlledRequested = false, eagerPoster = false, fit = 'contain', showControl = true, onPlaybackStateChange }: ProductPeekVideoProps) {
  const container = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const callback = useRef(onPlaybackStateChange)
  const [visible, setVisible] = useState(false)
  const [allowed, setAllowed] = useState(false)
  const [requested, setRequested] = useState(false)
  const [paused, setPaused] = useState(false)
  const [playback, setPlayback] = useState<PeekPlaybackState>('idle')
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const isPaused = controlledPaused ?? paused
  const shouldLoad = active && visible && (allowed || requested || controlledRequested)
  useEffect(() => { callback.current = onPlaybackStateChange }, [onPlaybackStateChange])
  useEffect(() => { callback.current?.(playback) }, [playback])
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    const sync = () => {
      setAllowed(!reduce.matches && !connection?.saveData)
      setRequested(false)
    }
    sync()
    reduce.addEventListener('change', sync)
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting && entry.intersectionRatio >= .2), { threshold: [.2] })
    if (container.current) observer.observe(container.current)
    return () => { observer.disconnect(); reduce.removeEventListener('change', sync) }
  }, [])
  useEffect(() => {
    const player = video.current
    if (!player) return
    let cancelled = false
    const sync = () => {
      if (!shouldLoad || isPaused || document.hidden) { player.pause(); return }
      if (!player.getAttribute('src')) player.src = mp4
      player.muted = true
      setPlayback('loading')
      player.play()?.catch((error: DOMException) => {
        if (cancelled || error.name === 'AbortError') return
        setPlayback('error'); setFailed(true)
      })
    }
    sync()
    document.addEventListener('visibilitychange', sync)
    return () => { cancelled = true; player.pause(); document.removeEventListener('visibilitychange', sync) }
  }, [mp4, shouldLoad, isPaused])
  return <div ref={container} className={styles.media} data-fit={fit} data-playback={playback} data-control={showControl}>
    <div className={styles.frame} style={{
    aspectRatio: width + '/' + height,
    ...(eagerPoster ? {
      backgroundImage: `url("${poster}")`,
      backgroundPosition: fit === 'cover' ? 'center top' : 'var(--peek-object-position, center)',
      backgroundRepeat: 'no-repeat',
      backgroundSize: fit,
    } : {}),
  }}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img className={styles.still} src={poster} alt={alt} width={width} height={height} loading={eagerPoster ? 'eager' : 'lazy'} fetchPriority={eagerPoster ? 'high' : 'auto'} decoding={eagerPoster ? 'sync' : 'async'} />
    {shouldLoad || loaded ? <video ref={video} className={styles.motion} data-loaded={loaded && !failed && active}
      width={width} height={height} muted loop playsInline preload="none" aria-label={alt}
      onPlaying={() => { setPlayback('playing'); setLoaded(true); setFailed(false) }}
      onWaiting={() => setPlayback('waiting')}
      onStalled={() => { if ((video.current?.readyState ?? 0) < 3) setPlayback('waiting') }}
      onPause={() => setPlayback((state) => state === 'error' ? state : 'paused')}
      onError={() => { setPlayback('error'); setFailed(true) }}
      disablePictureInPicture /> : null}
    </div>
    {showControl ? <div className={styles.controls}><button type="button" className={styles.pause} aria-label={(playback === 'playing' ? 'Pause ' : 'Play ') + label + ' animation'}
      onClick={() => {
        if (playback === 'playing') { setPaused(true); return }
        setRequested(true); setPaused(false)
        if (failed && video.current) { video.current.load(); setFailed(false) }
        video.current?.play()?.catch(() => { setPlayback('error'); setFailed(true) })
      }}>{playback === 'playing' ? 'Pause animation' : 'Play animation'}</button></div> : null}
  </div>
}
