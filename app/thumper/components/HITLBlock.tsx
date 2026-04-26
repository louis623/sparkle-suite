import { ListingPreview } from './ListingPreview'
import styles from './HITLBlock.module.css'

export function HITLBlock({
  approvalId,
  toolName,
  args,
  onRespond,
}: {
  approvalId: string
  toolName: string
  args: Record<string, unknown>
  onRespond: (approved: boolean) => void
}) {
  // Best-effort identification of the listing being removed. The model passes
  // listingId or itemNumber; we don't have the design name here, so we render
  // a compact preview from whatever's available.
  const designName =
    (args.designName as string | undefined) ??
    (args.itemNumber ? `Item ${args.itemNumber}` : 'this listing')
  const itemNumber = args.itemNumber as string | undefined

  return (
    <div className={styles.block}>
      {toolName === 'remove_listing' ? (
        <>
          <ListingPreview designName={designName} itemNumber={itemNumber} />
          <div className={styles.question}>
            Remove this listing from your board?
          </div>
        </>
      ) : (
        <div className={styles.question}>
          Approve <code>{toolName}</code>?
        </div>
      )}
      <div className={styles.btnRow}>
        <button
          type="button"
          className={styles.cancelBtn}
          onClick={() => onRespond(false)}
          data-approval-id={approvalId}
        >
          Cancel
        </button>
        <button
          type="button"
          className={styles.confirmBtn}
          onClick={() => onRespond(true)}
          data-approval-id={approvalId}
        >
          Remove listing
        </button>
      </div>
    </div>
  )
}
