'use client'

import { useEffect, useMemo, useState } from 'react'
import { BookOpen, ExternalLink, PlayCircle, Search } from 'lucide-react'
import type { WorkspaceResource } from '@/lib/services/workspace-resources'
import styles from './WorkspaceResourceLibrary.module.css'

type ResourceFilter = 'all' | 'blog' | 'video'

function normalizeTargetResourceKey(value?: string | null) {
  const key = value?.trim() ?? ''
  return /^[a-z0-9][a-z0-9-]*$/.test(key) ? key : null
}

function getTargetResourceKeyFromLocation() {
  if (typeof window === 'undefined') return null
  return normalizeTargetResourceKey(
    new URLSearchParams(window.location.search).get('resource'),
  )
}

const RESOURCE_FILTERS: Array<readonly [ResourceFilter, string]> = [
  ['all', 'All resources'],
  ['blog', 'Blogs'],
  ['video', 'Videos'],
]

function resourceTypeLabel(type: WorkspaceResource['resourceType']) {
  if (type === 'video') return 'Video'
  if (type === 'faq') return 'FAQ'
  if (type === 'help') return 'Help'
  return 'Blog'
}

function youtubeThumbnailUrl(videoUrl: string | null) {
  if (!videoUrl) return null

  try {
    const url = new URL(videoUrl)
    const host = url.hostname.replace(/^www\./, '').toLowerCase()
    let videoId: string | null = null

    if (host === 'youtu.be') {
      videoId = url.pathname.split('/').filter(Boolean)[0] ?? null
    } else if (host.endsWith('youtube.com')) {
      videoId =
        url.searchParams.get('v') ||
        url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/)?.[1] ||
        null
    }

    return videoId && /^[A-Za-z0-9_-]{6,}$/.test(videoId)
      ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      : null
  } catch {
    return null
  }
}

export function WorkspaceResourceLibraryView({
  resources,
  loading = false,
  error = null,
  targetResourceKey = null,
}: {
  resources: WorkspaceResource[]
  loading?: boolean
  error?: string | null
  targetResourceKey?: string | null
}) {
  const [filter, setFilter] = useState<ResourceFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const targetKey = normalizeTargetResourceKey(targetResourceKey)

  useEffect(() => {
    if (!targetKey || !resources.some((resource) => resource.resourceKey === targetKey)) return
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(`workspace-resource-${targetKey}`)
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      target?.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [resources, targetKey])
  const visibleResources = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase()
    return resources.filter((resource) => {
      if (filter !== 'all' && resource.resourceType !== filter) return false
      if (!normalized) return true
      return [resource.title, resource.summary, resource.category, ...resource.tags]
        .join(' ')
        .toLowerCase()
        .includes(normalized)
    })
  }, [filter, resources, searchQuery])

  return (
    <section className={styles.library} aria-label="Blogs and videos">

      <div className={styles.toolbar}>
        <div className={styles.filters} aria-label="Resource type">
          {RESOURCE_FILTERS.map(([value, label]) => (
            <button
              type="button"
              key={value}
              aria-pressed={filter === value}
              className={filter === value ? styles.filterActive : styles.filter}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className={styles.search}>
          <Search aria-hidden="true" />
          <span className="sr-only">Search resources</span>
          <input
            type="search"
            value={searchQuery}
            placeholder="Search videos and blogs"
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </label>
      </div>

      {loading ? <p className={styles.state}>Loading resources…</p> : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {!loading && !error && visibleResources.length === 0 ? (
        <p className={styles.state}>No matching resources yet.</p>
      ) : null}

      <div className={styles.grid}>
        {visibleResources.map((resource) => {
          const isTarget = resource.resourceKey === targetKey
          const href = resource.videoUrl || resource.actionUrl
          const thumbnailUrl =
            resource.videoProvider === 'youtube'
              ? youtubeThumbnailUrl(resource.videoUrl) || resource.thumbnailUrl
              : resource.thumbnailUrl
          const generatedDetailHref = `/nic-nac?section=resources&resource=${resource.resourceKey}`
          const hasArticleLink = Boolean(
            resource.actionUrl && resource.actionUrl !== generatedDetailHref,
          )
          return (
            <article
              className={`${styles.card} ${isTarget ? styles.cardTarget : ''}`}
              data-resource-key={resource.resourceKey}
              id={`workspace-resource-${resource.resourceKey}`}
              key={resource.id}
              tabIndex={isTarget ? -1 : undefined}
            >
              <div className={styles.art}>
                {thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbnailUrl} alt="" />
                ) : resource.resourceType === 'video' ? (
                  <PlayCircle aria-hidden="true" />
                ) : (
                  <BookOpen aria-hidden="true" />
                )}
                {resource.isFeatured ? <span>Featured</span> : null}
              </div>
              <div className={styles.cardBody}>
                <div className={styles.meta}>
                  <span>{resourceTypeLabel(resource.resourceType)}</span>
                  <span>{resource.category}</span>
                  {resource.version === 1 ? <span>New</span> : null}
                </div>
                <h3>{resource.title}</h3>
                {isTarget ? <p className={styles.targetNotice}>Opened from Message Center</p> : null}
                {resource.summary ? <p>{resource.summary}</p> : null}
                <div className={styles.cardFooter}>
                  <small>{resource.authorLabel}</small>
                  {resource.resourceType === 'video' && href ? (
                    <a href={href} target={href.startsWith('/') ? undefined : '_blank'} rel={href.startsWith('/') ? undefined : 'noreferrer'}>
                      Watch video
                      <ExternalLink aria-hidden="true" />
                    </a>
                  ) : hasArticleLink && resource.actionUrl ? (
                    <a href={resource.actionUrl} target={resource.actionUrl.startsWith('/') ? undefined : '_blank'} rel={resource.actionUrl.startsWith('/') ? undefined : 'noreferrer'}>
                      Open resource
                      <ExternalLink aria-hidden="true" />
                    </a>
                  ) : null}
                </div>
                {resource.resourceType !== 'video' && resource.body ? (
                  <details className={styles.articleDetails} open={isTarget}>
                    <summary>
                      {resource.resourceType === 'blog' ? 'Read article' : 'Read update'}
                    </summary>
                    <div>{resource.body}</div>
                  </details>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default function WorkspaceResourceLibrary() {
  const [state, setState] = useState<{
    resources: WorkspaceResource[]
    loading: boolean
    error: string | null
  }>({ resources: [], loading: true, error: null })
  const [targetResourceKey] = useState(getTargetResourceKeyFromLocation)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/nic-nac/resource-library?limit=200', {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          | { resources?: WorkspaceResource[]; error?: string }
          | null
        if (!response.ok) throw new Error(payload?.error || 'Resources could not be loaded.')
        setState({ resources: payload?.resources ?? [], loading: false, error: null })
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setState({
          resources: [],
          loading: false,
          error: error instanceof Error ? error.message : 'Resources could not be loaded.',
        })
      })
    return () => controller.abort()
  }, [])

  return <WorkspaceResourceLibraryView {...state} targetResourceKey={targetResourceKey} />
}
