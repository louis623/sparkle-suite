'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { WorkspaceLineupSnapshot } from '@/lib/live-lineup/types'
import { eligibleAudienceIdentity, isCurrentLineupAudienceResult, lineupIdentityContext, type LineupAudienceMatch } from '@/lib/live-lineup/audience'
import { createClient } from '@/lib/supabase/client'
import { NIC_NAC_WORKSPACE_REFRESH_EVENT } from '@/lib/nic-nac/workspace-refresh-events'

export function useLineupAudience(snapshot: WorkspaceLineupSnapshot | null, pointer: {current: unknown}) {
  type Chips = {context: string; value: Record<string, LineupAudienceMatch>}
  const [matches, setMatches] = useState<Chips>({context:'',value:{}})
  const [refreshKey, setRefreshKey] = useState(0)
  const context = snapshot ? lineupIdentityContext(snapshot) : ''
  const latest = useRef({snapshot,context}); latest.current = {snapshot,context}
  const epoch = useRef(0)
  const pending = useRef<Chips | null>(null)
  const version = useRef('0')
  const controller = useRef<AbortController | null>(null)
  const refreshTimer = useRef<number | null>(null)
  const commit = useCallback((value: Record<string, LineupAudienceMatch>) => {
    const bound = {context:latest.current.context,value}
    if (pointer.current) pending.current = bound
    else { pending.current = null; setMatches(bound) }
  }, [pointer])
  const finishGesture = useCallback(() => {
    if (pending.current) { setMatches(pending.current); pending.current = null }
  }, [])
  const invalidate = useCallback(() => {
    ++epoch.current
    controller.current?.abort()
    commit({})
    if (refreshTimer.current !== null) window.clearTimeout(refreshTimer.current)
    refreshTimer.current = window.setTimeout(() => { refreshTimer.current = null; setRefreshKey(key => key + 1) }, 150)
  }, [commit])
  useEffect(() => {
    const captured = latest.current
    ++epoch.current; const requestEpoch = epoch.current
    controller.current?.abort(); commit({})
    if (!captured.snapshot?.tenantContext || !captured.snapshot.management) return
    const identities = captured.snapshot.entries.filter(eligibleAudienceIdentity).map(e => ({id:e.id,sourceIdentityVersion:e.sourceIdentityVersion}))
    if (!identities.length) return
    const request = new AbortController(); controller.current = request
    const timeout = window.setTimeout(() => request.abort(), 3000)
    void (async () => {
      try {
        const response = await fetch('/api/workspace/live-lineup/audience', {method:'POST',cache:'no-store',signal:request.signal,
          headers:{'Content-Type':'application/json'},body:JSON.stringify({generation:captured.snapshot!.management!.generation,identities})})
        if (!response.ok) return
        const result: unknown = await response.json()
        if (request.signal.aborted || !isCurrentLineupAudienceResult(result, captured.snapshot!, {
          requestEpoch,currentEpoch:epoch.current,requestContext:captured.context,currentContext:latest.current.context,minimumVersion:version.current,
        })) return
        version.current = result.audienceVersion
        commit(Object.fromEntries(result.matches.map(match => [match.id,match])))
      } catch { /* Enrichment never blocks a lineup refresh or order move. */ }
      finally { window.clearTimeout(timeout); if (controller.current === request) controller.current = null }
    })()
    return () => { request.abort(); window.clearTimeout(timeout) }
  }, [context, refreshKey, commit])
  useEffect(() => {
    version.current = '0'
    if (!snapshot?.tenantContext) return
    const tenant = snapshot.tenantContext
    const broadcast = typeof BroadcastChannel === 'function' ? new BroadcastChannel('lineup-audience') : null
    const localChange = () => { invalidate(); broadcast?.postMessage({tenant}) }
    if (broadcast) broadcast.onmessage = event => { if (event.data?.tenant === tenant) invalidate() }
    window.addEventListener(NIC_NAC_WORKSPACE_REFRESH_EVENT, localChange)
    const db = createClient()
    const channel = db.channel('lineup-audience-' + tenant).on('postgres_changes', {
      event:'*',schema:'public',table:'live_lineup_audience_versions',filter:'rep_id=eq.' + tenant,
    }, payload => {
      const next = (payload.new as {version?: unknown})?.version
      if (typeof next === 'number' || typeof next === 'string') {
        const value = String(next)
        if (/^\d+$/.test(value) && BigInt(value) > BigInt(version.current)) version.current = value
      }
      invalidate()
    }).subscribe()
    const timer = window.setInterval(() => { if (!document.hidden) invalidate() }, 15000)
    return () => { if (refreshTimer.current !== null) window.clearTimeout(refreshTimer.current); window.clearInterval(timer); window.removeEventListener(NIC_NAC_WORKSPACE_REFRESH_EVENT,localChange); broadcast?.close(); void db.removeChannel(channel) }
  }, [snapshot?.tenantContext, invalidate])
  return {matches:matches.context === context ? matches.value : {},finishGesture}
}
