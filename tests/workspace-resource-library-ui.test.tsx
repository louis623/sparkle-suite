import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { WorkspaceResourceLibraryView } from '@/app/nic-nac/components/WorkspaceResourceLibrary'

describe('workspace resource library UI', () => {
  it('renders blog and video resources with clear actions', () => {
    const html = renderToStaticMarkup(
      createElement(WorkspaceResourceLibraryView, {
        resources: [
          {
            id: 'blog-1',
            resourceKey: 'monthly-planning',
            resourceType: 'blog',
            title: 'Plan a strong month',
            summary: 'A practical monthly planning guide.',
            body: 'Choose three priorities, set realistic dates, and review them weekly.',
            category: 'Business',
            tags: ['planning'],
            thumbnailUrl: null,
            videoProvider: null,
            videoUrl: null,
            actionUrl: '/nic-nac?section=resources&resource=monthly-planning',
            status: 'published',
            version: 1,
            changeSummary: 'New guide',
            isFeatured: true,
            authorLabel: 'Sparkle Suite',
            publishedAt: '2026-08-17T20:00:00.000Z',
          },
          {
            id: 'video-1',
            resourceKey: 'trade-board-video',
            resourceType: 'video',
            title: 'Dance Floor walkthrough',
            summary: 'See the Dance Floor workflow.',
            body: '',
            category: 'Dance Floor',
            tags: ['trade'],
            thumbnailUrl: null,
            videoProvider: 'youtube',
            videoUrl: 'https://www.youtube.com/watch?v=abc123',
            actionUrl: 'https://www.youtube.com/watch?v=abc123',
            status: 'published',
            version: 1,
            changeSummary: 'New video',
            isFeatured: false,
            authorLabel: 'Sparkle Suite',
            publishedAt: '2026-08-17T20:00:00.000Z',
          },
        ],
      }),
    )

    expect(html).toContain('aria-label="Blogs and videos"')
    expect(html).toContain('Blog')
    expect(html).toContain('Videos')
    expect(html).toContain('Plan a strong month')
    expect(html).toContain('Read article')
    expect(html).toContain('Dance Floor walkthrough')
    expect(html).toContain('Watch video')
  })

  it('renders a useful empty state', () => {
    const html = renderToStaticMarkup(
      createElement(WorkspaceResourceLibraryView, { resources: [] }),
    )
    expect(html).toContain('No matching resources yet.')
  })

  it('uses YouTube art and omits an empty summary', () => {
    const html = renderToStaticMarkup(
      createElement(WorkspaceResourceLibraryView, {
        resources: [
          {
            id: 'video-2',
            resourceKey: 'quick-tour',
            resourceType: 'video',
            title: 'Quick tour',
            summary: '',
            body: '',
            category: 'General',
            tags: [],
            thumbnailUrl: null,
            videoProvider: 'youtube',
            videoUrl: 'https://youtu.be/abc123',
            actionUrl: null,
            status: 'published',
            version: 1,
            changeSummary: '',
            isFeatured: false,
            authorLabel: 'Sparkle Suite',
            publishedAt: null,
          },
        ],
      }),
    )

    expect(html).toContain('https://i.ytimg.com/vi/abc123/hqdefault.jpg')
    expect(html).not.toContain('<p></p>')
  })

  it('highlights and opens a resource targeted from Message Center', () => {
    const html = renderToStaticMarkup(
      createElement(WorkspaceResourceLibraryView, {
        targetResourceKey: 'monthly-planning',
        resources: [
          {
            id: 'blog-target',
            resourceKey: 'monthly-planning',
            resourceType: 'blog',
            title: 'Plan a strong month',
            summary: 'A practical monthly planning guide.',
            body: 'Choose three priorities and review them weekly.',
            category: 'Business',
            tags: ['planning'],
            thumbnailUrl: null,
            videoProvider: null,
            videoUrl: null,
            actionUrl: '/nic-nac?section=resources&resource=monthly-planning',
            status: 'published',
            version: 1,
            changeSummary: 'New guide',
            isFeatured: false,
            authorLabel: 'Sparkle Suite',
            publishedAt: null,
          },
        ],
      }),
    )

    expect(html).toContain('id="workspace-resource-monthly-planning"')
    expect(html).toContain('Opened from Message Center')
    expect(html).toContain('<details')
    expect(html).toContain('open=""')
  })
})
