import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { buildRepPublicPageText } from '@/lib/seo/amethyst-public-metadata'
import { responsivePublicImage } from '@/lib/seo/responsive-public-image'

describe('responsive public images', () => {
  it('builds a sized Next image srcset for public storage photos and leaves unknown hosts alone', () => {
    const photo = responsivePublicImage(
      'https://bqhzfkgkjyuhlsozpylf.supabase.co/storage/v1/object/public/public-site-media/rep/recipes/cake.jpg',
      { alt: 'Chocolate cake', sizes: '380px', widths: [384, 640] },
    )

    expect(photo.loading).toBe('lazy')
    expect(photo.alt).toBe('Chocolate cake')
    expect(photo.src).toContain('/_next/image?')
    expect(photo.src).toContain('w=640')
    expect(photo.srcSet).toContain('384w')
    expect(photo.srcSet).toContain('640w')
    expect(photo.fetchPriority).toBe('low')

    const hero = responsivePublicImage('/britt-with-bling/hero.jpeg', {
      alt: 'Britt with Bling',
      sizes: '100vw',
      widths: [640, 828],
      eager: true,
    })
    expect(hero.loading).toBe('eager')
    expect(hero.fetchPriority).toBe('high')
    expect(hero.srcSet).toContain('w=828')

    const external = responsivePublicImage('https://cdn.example.com/huge.jpg', {
      alt: 'External',
      sizes: '100vw',
    })
    expect(external.src).toBe('https://cdn.example.com/huge.jpg')
    expect(external.srcSet).toBeUndefined()
  })

  it('keeps the browser helper on the same optimizer contract', () => {
    const source = readFileSync('public/amethyst/responsive-image.js', 'utf8')
    expect(source).toContain('window.sparkleResponsiveImage')
    expect(source).toContain('/_next/image?')
    expect(source).toContain('.supabase.co')
    for (const width of [256, 384, 640, 828, 1200, 1920]) {
      expect(source).toContain(String(width))
    }
  })
})

describe('rep public page text', () => {
  it('builds titles from the business name and offering, and adds city and state only when the join template already publishes them', () => {
    expect(buildRepPublicPageText({
      page: 'homepage',
      businessName: 'Britt with Bling',
      repName: 'Britt',
      teamName: 'The Virtuous Fizzers',
    })).toEqual({
      title: 'Britt with Bling | Live jewelry reveals and Dance Floor',
      description: 'Independent Bomb Party rep site for Britt with Bling. Watch live jewelry reveals, follow the Live Lineup, and browse dancers on the Dance Floor.',
    })

    expect(buildRepPublicPageText({
      page: 'homepage',
      businessName: 'Mile High Fizz',
      repName: 'The rep',
      teamName: 'Mile High Fizz',
      city: 'Littleton',
      state: 'Colorado',
    }).title).toBe('Mile High Fizz | Live jewelry reveals and Dance Floor in Littleton, Colorado')

    expect(buildRepPublicPageText({
      page: 'join',
      businessName: 'Sparkly Butterflies',
      repName: 'The rep',
      teamName: 'Sparkly Butterflies',
      city: ' ',
      state: ' ',
    }).title).toBe('Join Sparkly Butterflies')
  })
})
