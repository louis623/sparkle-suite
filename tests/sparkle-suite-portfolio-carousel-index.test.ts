import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { nextCarouselIndex } from '@/lib/sparkle-suite/portfolio-carousel-index'

describe('portfolio carousel index', () => {
  it('holds the current slide when a resize or screenshot resets the scroll position', () => {
    expect(nextCarouselIndex(4, 0, false)).toBe(4)
    expect(nextCarouselIndex(0, 0, false)).toBe(0)
  })

  it('follows the slide the visitor actually scrolled to', () => {
    expect(nextCarouselIndex(4, 5, true)).toBe(5)
    expect(nextCarouselIndex(2, 1, true)).toBe(1)
  })

  it('restores the held slide from resize instead of an intersection observer', () => {
    const source = readFileSync(join(process.cwd(), 'app/_components/portfolio-carousels.tsx'), 'utf8')
    expect(source).toContain('nextCarouselIndex')
    expect(source).toContain("addEventListener('resize', restoreHeldSlide)")
    expect(source).not.toContain('IntersectionObserver')
  })
})
