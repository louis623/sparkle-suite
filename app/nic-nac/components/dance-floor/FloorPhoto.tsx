'use client'
import { useEffect, useRef, useState } from 'react'
import styles from './dance-floor.module.css'
export function FloorPhoto({ photoUrl, alt, className }: { photoUrl?: string | null; alt: string; className?: string }) {
  const image = useRef<HTMLImageElement>(null)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  useEffect(() => {
    const node = image.current
    if (photoUrl && node?.complete && node.naturalWidth === 0) setFailedUrl(photoUrl)
  }, [photoUrl])
  return photoUrl && failedUrl !== photoUrl
    ? <img ref={image} key={photoUrl} className={className ?? styles.photo} src={photoUrl} alt={alt} loading="lazy" onError={() => setFailedUrl(photoUrl)} />
    : <div className={className ?? styles.noPhoto} role="img" aria-label={alt}><span aria-hidden="true">✨</span></div>
}
