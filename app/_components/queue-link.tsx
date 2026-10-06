'use client'

import { useEffect, useSyncExternalStore, type ComponentPropsWithoutRef } from 'react'
import {
  readBrowserQueueAttribution,
  rememberBrowserQueueAttribution,
  withQueueAttribution,
} from '@/lib/prelaunch/attribution'

const subscribe = (callback: () => void) => {
  window.addEventListener('popstate', callback)
  return () => window.removeEventListener('popstate', callback)
}

/** Use for queue CTAs and internal marketing navigation to retain outreach attribution. */
export function QueueLink({ href = '/prelaunch#waitlist', ...props }: Omit<ComponentPropsWithoutRef<'a'>, 'href'> & { href?: string }) {
  const attributedHref = useSyncExternalStore(
    subscribe,
    () => withQueueAttribution(href, readBrowserQueueAttribution()),
    () => href,
  )
  useEffect(rememberBrowserQueueAttribution, [])
  return <a {...props} href={attributedHref} />
}
