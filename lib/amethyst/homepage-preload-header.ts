/** Surface only viewport-independent, public assets before HTML parsing.
 * Responsive art stays in HTML: HTTP hints cannot reliably evaluate media. */
export function homepagePreloadHeader(html: string) {
  if (!html.includes('data-server-rendered="true"')) return ''
  const links = [...html.matchAll(/<link\b[^>]*rel="preload"[^>]*>/g)].map(([tag]) => ({
    href: tag.match(/href="([^"]+)"/)?.[1],
    as: tag.match(/as="([^"]+)"/)?.[1],
    media: tag.match(/media="([^"]+)"/)?.[1],
    responsive: /imagesrcset=/.test(tag),
  }))
  const images = links.filter(link => link.as === 'image')
  const uniqueImages = new Set(images.map(link => link.href))
  return [...new Set(links.filter(link => link.href && /^\/amethyst\/[a-z0-9/_.-]+$/i.test(link.href)
    && (link.as === 'font' || (link.as === 'image' && !link.responsive && (!link.media || uniqueImages.size === 1))))
    .map(link => '<' + link.href + '>; rel=preload; as=' + link.as + (link.as === 'font' ? '; type="font/woff2"; crossorigin=anonymous' : '; fetchpriority=high')))].join(', ')
}
