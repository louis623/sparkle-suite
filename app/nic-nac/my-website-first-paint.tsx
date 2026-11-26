import styles from '@/app/nic-nac/components/DashboardPlaceholder.module.css'
import type { SiteSettingsDashboardResult } from '@/lib/services/types'

/** The page heading in the first HTML, before the workspace client bundle hydrates. */
export function MyWebsiteFirstPaint(_props: { settings: SiteSettingsDashboardResult }) {
  return (
    <>
      <style>{`html:has([data-testid="my-website-home"]) [data-server-checklist]{display:none}`}</style>
      <div className={styles.siteHome} data-server-checklist="">
        <p className={styles.siteHomeKicker}>Your customer site</p>
        <h1 className={styles.siteHomeTitle}>Tap a part of your site to change it</h1>
        <p className={styles.siteHomeLede}>Everything saves on its own as you go.</p>
      </div>
    </>
  )
}
