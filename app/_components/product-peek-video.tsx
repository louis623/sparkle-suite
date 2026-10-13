'use client'
import { useEffect, useRef, useState } from 'react'
import styles from './product-peek-video.module.css'
type ProductPeekVideoProps = {
  poster: string; mp4: string; width: number; height: number
  alt: string; label: string; active?: boolean
}
/** Real recordings, loaded only in view. The poster survives blocked playback. */
export function ProductPeekVideo({ poster, mp4, width, height, alt, label, active = true }: ProductPeekVideoProps) {
  const container = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const [visible, setVisible] = useState(false)
  const [allowed, setAllowed] = useState(false)
  const [requested, setRequested] = useState(false)
  const [paused, setPaused] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const shouldLoad = active && visible && (allowed || requested)
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    const sync = () => setAllowed(!reduce.matches && !connection?.saveData)
    sync()
    reduce.addEventListener('change', sync)
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .2 })
    if (container.current) observer.observe(container.current)
    return () => { observer.disconnect(); reduce.removeEventListener('change', sync) }
  }, [])
  useEffect(() => {
    const player = video.current
    if (!player) return
    const sync = () => {
      if (!shouldLoad || paused || document.hidden) { player.pause(); return }
      if (!player.getAttribute('src')) player.src = mp4
      player.muted = true
      player.play()?.catch(() => setPlaying(false))
    }
    sync()
    document.addEventListener('visibilitychange', sync)
    return () => { player.pause(); document.removeEventListener('visibilitychange', sync) }
  }, [mp4, shouldLoad, paused])
  return <div ref={container} className={styles.media} style={{aspectRatio:width + '/' + height}}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img className={styles.still} src={poster} alt={alt} width={width} height={height} loading="lazy" />
    {shouldLoad || loaded ? <video ref={video} className={styles.motion} data-loaded={loaded && !failed}
      width={width} height={height} muted loop playsInline preload="none" aria-label={alt}
      onPlaying={() => { setPlaying(true); setLoaded(true); setFailed(false) }}
      onPause={() => setPlaying(false)} onError={() => { setPlaying(false); setFailed(true) }}
      disablePictureInPicture /> : null}
    <button type="button" className={styles.pause} aria-label={(playing ? 'Pause ' : 'Play ') + label + ' animation'}
      onClick={() => {
        if (playing) { setPaused(true); return }
        setRequested(true); setPaused(false)
        if (failed && video.current) { video.current.load(); setFailed(false) }
        video.current?.play()?.catch(() => setPlaying(false))
      }}>{playing ? 'Pause animation' : 'Play animation'}</button>
  </div>
}
