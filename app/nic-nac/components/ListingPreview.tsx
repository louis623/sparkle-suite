import styles from './ListingPreview.module.css'

export function ListingPreview({
  designName,
  itemNumber,
}: {
  designName: string
  itemNumber?: string | null
}) {
  const itemText = itemNumber ? `Item ${itemNumber}` : ''
  return (
    <div className={styles.row}>
      <div className={styles.thumb} aria-hidden="true" />
      <div className={styles.meta}>
        <div className={styles.name}>{designName}</div>
        {itemText ? <div className={styles.price}>{itemText}</div> : null}
      </div>
    </div>
  )
}
