import type { ReactNode } from 'react'
import { NicNacGlyph } from './NicNacGlyph'
import { Markdown } from './Markdown'
import { RelativeTime } from './RelativeTime'
import styles from './Bubble.module.css'

export interface BubbleImage {
  url: string
}

export function Bubble({
  variant,
  showGlyph,
  children,
  text,
  images,
  timestamp,
  renderMarkdown,
  layout = 'default',
}: {
  variant: 'rep' | 'nicNac'
  showGlyph?: boolean
  children?: ReactNode
  // When provided, renders text via Markdown (assistant) or as-is (rep).
  text?: string
  images?: BubbleImage[]
  timestamp?: string | number
  renderMarkdown?: boolean
  // Main-photo confirmation uses a wide photo and normal-weight text.
  layout?: 'default' | 'main-photo'
}) {
  const hasImages = !!images && images.length > 0
  const isMainPhoto = layout === 'main-photo'
  const imageBlock = hasImages ? (
    <div key="images" className={isMainPhoto ? styles.previewPhotos : styles.imageGrid}>
      {images!.map((img, i) => (
        <a
          key={i}
          href={img.url}
          target="_blank"
          rel="noopener noreferrer"
          className={isMainPhoto ? styles.previewFrame : styles.imageThumb}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.url} alt="" />
        </a>
      ))}
    </div>
  ) : null
  const textBlock =
    text !== undefined && text !== '' ? (
      renderMarkdown ? (
        <div key="text" className={styles.mdRoot}>
          <Markdown text={text} />
        </div>
      ) : (
        <span key="text" className={isMainPhoto ? styles.previewText : styles.plain}>
          {text}
        </span>
      )
    ) : null
  // No whitespace text nodes. pre-wrap would turn those into a gap above the
  // photo and an indent on the sentence.
  const body = <>{imageBlock}{textBlock}{children}</>

  if (variant === 'rep') {
    return (
      <div className={styles.repRow}>
        <div className={styles.repCol}>
          <div className={`${styles.bubble} ${styles.rep}`}>{body}</div>
          {timestamp !== undefined ? (
            <div className={`${styles.timestamp} ${styles.timestampRep}`}>
              <RelativeTime value={timestamp} />
            </div>
          ) : null}
        </div>
      </div>
    )
  }
  return (
    <div className={styles.nicNacRow}>
      <div className={styles.glyphSlot}>
        {showGlyph ? <NicNacGlyph size={22} /> : null}
      </div>
      <div className={isMainPhoto ? `${styles.nicNacCol} ${styles.previewCol}` : styles.nicNacCol}>
        <div
          className={
            isMainPhoto
              ? `${styles.bubble} ${styles.nicNac} ${styles.previewBubble}`
              : `${styles.bubble} ${styles.nicNac}`
          }
        >
          {body}
        </div>
        {timestamp !== undefined ? (
          <div className={`${styles.timestamp} ${styles.timestampNicNac}`}>
            <RelativeTime value={timestamp} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
