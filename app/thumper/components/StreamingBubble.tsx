import { ThumperGlyph } from './ThumperGlyph'
import styles from './StreamingBubble.module.css'

export function StreamingBubble({
  text,
  showGlyph,
}: {
  text: string
  showGlyph?: boolean
}) {
  return (
    <div className={styles.row}>
      <div className={styles.glyphSlot}>
        {showGlyph ? <ThumperGlyph size={22} /> : null}
      </div>
      <div className={styles.bubble}>
        <span className={styles.text}>{text}</span>
        <span className={styles.dots} aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </div>
    </div>
  )
}
