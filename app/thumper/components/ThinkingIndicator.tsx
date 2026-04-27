import { ThumperGlyph } from './ThumperGlyph'
import styles from './ThinkingIndicator.module.css'

export function ThinkingIndicator({ showGlyph }: { showGlyph?: boolean }) {
  return (
    <div className={styles.row}>
      <div className={styles.glyphSlot}>
        {showGlyph ? <ThumperGlyph size={22} /> : null}
      </div>
      <div className={styles.col}>
        <div className={styles.bubble} role="status" aria-live="polite">
          <img
            src="/neon-rabbit-logo.svg"
            alt=""
            className={styles.logo}
            aria-hidden="true"
          />
          <span className={styles.label}>Thumper is thinking…</span>
        </div>
      </div>
    </div>
  )
}
