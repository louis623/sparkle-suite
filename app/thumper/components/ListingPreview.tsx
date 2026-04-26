import styles from './ListingPreview.module.css'

export function ListingPreview({
  designName,
  itemNumber,
  msrp,
}: {
  designName: string
  itemNumber?: string | null
  msrp?: number | null
}) {
  const priceText =
    typeof msrp === 'number' ? `$${msrp.toLocaleString()}` : itemNumber ? `Item ${itemNumber}` : ''
  return (
    <div className={styles.row}>
      <div className={styles.thumb} aria-hidden="true" />
      <div className={styles.meta}>
        <div className={styles.name}>{designName}</div>
        {priceText ? <div className={styles.price}>{priceText}</div> : null}
      </div>
    </div>
  )
}
