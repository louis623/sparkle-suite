import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireOwnerDirectAccess } from '@/lib/control-center/owner-direct-auth'
import { AuthError, OperatorAuthError } from '@/lib/supabase/operator-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { listTikTokQueue } from '@/lib/services/tiktok-video-queue'
import { TikTokQueuePanel } from '../_components/TikTokQueuePanel'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export default async function TikTokQueuePage() {
  try { await requireOwnerDirectAccess() }
  catch (error) {
    if (error instanceof AuthError) redirect('/control-center/login?redirect=%2Fcontrol-center%2Ftiktok-queue')
    if (error instanceof OperatorAuthError) return <main className="min-h-screen bg-slate-50 px-5 py-12 text-slate-950"><section className="mx-auto max-w-xl rounded-lg border bg-white p-8"><h1 className="text-2xl font-semibold">Owner access required</h1><p className="mt-3">Sign in with the interactive Control Center owner session.</p></section></main>
    throw error
  }
  const admin = createAdminClient()
  const [queue, archive] = await Promise.all([listTikTokQueue(admin, 'queue'), listTikTokQueue(admin, 'archive')])
  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950"><div className="mx-auto max-w-5xl"><Link href="/control-center" className="text-violet-700">Control Center</Link><h1 className="my-5 text-3xl font-semibold">TikTok Queue</h1><TikTokQueuePanel initialQueue={queue} initialArchive={archive} /></div></main>
}
