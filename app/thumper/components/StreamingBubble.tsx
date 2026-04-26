import { ThumperGlyph } from './ThumperGlyph'
import { RelativeTime } from './RelativeTime'
import styles from './StreamingBubble.module.css'

export function StreamingBubble({
  text,
  showGlyph,
  timestamp,
}: {
  text: string
  showGlyph?: boolean
  timestamp?: string | number
}) {
  return (
    <div className={styles.row}>
      <div className={styles.glyphSlot}>
        {showGlyph ? <ThumperGlyph size={22} /> : null}
      </div>
      <div className={styles.col}>
        <div className={styles.bubble}>
          <span className={styles.text}>{text}</span>
          <span className={styles.dots} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </div>
        {timestamp !== undefined ? (
          <div className={styles.timestamp}>
            <RelativeTime value={timestamp} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
