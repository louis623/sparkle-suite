/**
 * Retry one failed Suite-list resource notice.
 *
 * Does not publish the resource, bump its version, or post a Message Center
 * announcement. Refuses unless the existing suite_official_notice_sends row
 * for the key is status failed, and the resource is still published at that
 * version. deliverSuiteListNotice then reclaims the failed row and sends once.
 *
 * A sent or still-sending row is left alone.
 *
 * Usage (from a checkout that contains this fix, with production env):
 *   npx tsx scripts/retry-failed-suite-list-notice.ts --key suite-list:resource:<id>:v1
 */
import { config } from 'dotenv'

config({ path: '.env.local' })

import { createAdminClient } from '@/lib/supabase/admin'
import { ServiceError } from '@/lib/services/errors'
import {
  assertRetryableFailedNotice,
  deliverSuiteListNotice,
  parseSuiteListResourceNoticeKey,
  resourceNoticeContent,
} from '@/lib/services/suite-official-notice'

function readKey() {
  const index = process.argv.indexOf('--key')
  const key = index >= 0 ? process.argv[index + 1] : ''
  if (!key) {
    throw new Error('Pass --key suite-list:resource:<id>:v<version>.')
  }
  return key
}

async function main() {
  const idempotencyKey = readKey()
  const { resourceId, version } = parseSuiteListResourceNoticeKey(idempotencyKey)
  const supabase = createAdminClient()
  const existing = await supabase
    .from('suite_official_notice_sends')
    .select('status, broadcast_id, error_message')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle()
  if (existing.error) throw existing.error
  assertRetryableFailedNotice(existing.data)

  const resource = await supabase
    .from('workspace_resources')
    .select('id, resource_type, title, summary, body, thumbnail_url, video_url, action_url, status, version')
    .eq('id', resourceId)
    .maybeSingle()
  if (resource.error) throw resource.error
  const row = resource.data
  if (!row) {
    throw new Error(`Resource ${resourceId} was not found. Nothing was published or sent.`)
  }
  if (row.status !== 'published' || Number(row.version) !== version) {
    throw new Error(
      `Resource ${resourceId} is ${row.status} at v${row.version}. Refusing to send v${version} or publish a new version.`,
    )
  }

  const delivery = await deliverSuiteListNotice({
    supabase,
    idempotencyKey,
    sourceKind: 'workspace_resource',
    sourceId: resourceId,
    content: resourceNoticeContent({
      resourceType: String(row.resource_type),
      title: String(row.title ?? ''),
      summary: typeof row.summary === 'string' ? row.summary : '',
      body: typeof row.body === 'string' ? row.body : '',
      thumbnailUrl: typeof row.thumbnail_url === 'string' ? row.thumbnail_url : null,
      videoUrl: typeof row.video_url === 'string' ? row.video_url : null,
      actionUrl: typeof row.action_url === 'string' ? row.action_url : null,
    }),
  })
  console.log(JSON.stringify({ resourceId, version, ...delivery }))
  if (delivery.status !== 'sent') process.exitCode = 1
}

main().catch((error) => {
  const message = error instanceof ServiceError ? error.userMessage : error instanceof Error ? error.message : 'Retry failed.'
  console.error(message)
  process.exitCode = 1
})
