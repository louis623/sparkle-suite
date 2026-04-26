import styles from './Chips.module.css'

const CHIP_LABELS = ["What's on my board?", 'Remove a listing']

export function Chips({
  visible,
  onPick,
  disabled,
}: {
  visible: boolean
  onPick: (text: string) => void
  disabled?: boolean
}) {
  if (!visible) return null
  return (
    <div className={styles.row} role="group" aria-label="Suggested prompts">
      {CHIP_LABELS.map((label) => (
        <button
          key={label}
          type="button"
          className={styles.chip}
          onClick={() => onPick(label)}
          disabled={disabled}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
