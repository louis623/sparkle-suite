import { ThumperGlyph } from './ThumperGlyph'
import styles from './ThumperHeader.module.css'

export function ThumperHeader({ onClose }: { onClose?: () => void }) {
  return (
    <header className={styles.header}>
      <div className={styles.titleGroup}>
        <ThumperGlyph size={22} />
        <span className={styles.title}>Thumper</span>
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className={styles.closeBtn}
          aria-label="Close Thumper"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path
              d="M2 2 L12 12 M12 2 L2 12"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      ) : null}
    </header>
  )
}
