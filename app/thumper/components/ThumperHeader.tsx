import { ThumperGlyph } from './ThumperGlyph'
import styles from './ThumperHeader.module.css'

export function ThumperHeader({
  onClose,
  onNewConversation,
  newConversationDisabled,
  closeLabel,
}: {
  onClose?: () => void
  onNewConversation?: () => void
  newConversationDisabled?: boolean
  closeLabel?: string
}) {
  return (
    <header className={styles.header}>
      <div className={styles.titleGroup}>
        <ThumperGlyph size={22} />
        <span className={styles.title}>Thumper</span>
      </div>
      <div className={styles.actions}>
        {onNewConversation ? (
          <button
            type="button"
            onClick={onNewConversation}
            className={styles.newBtn}
            aria-label="New conversation"
            disabled={newConversationDisabled}
            title="New conversation"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path
                d="M7 1.5 V 12.5 M 1.5 7 H 12.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        ) : null}
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className={styles.closeBtn}
            aria-label={closeLabel ?? 'Close Thumper'}
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
      </div>
    </header>
  )
}
