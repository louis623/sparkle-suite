'use client'

import { Pacifico } from 'next/font/google'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  sparkleSuitePortfolioContent,
  sparkleSuiteScheduleBuild,
  type PortfolioSlide,
} from '@/lib/sparkle-suite/portfolio-content'
import { nextCarouselIndex } from '@/lib/sparkle-suite/portfolio-carousel-index'
import { portfolioMotion } from '@/lib/sparkle-suite/portfolio-motion'
import { ProductPeekVideo } from './product-peek-video'
import styles from './portfolio-experience.module.css'

const mileHighScript = Pacifico({ weight: '400', subsets: ['latin'], variable: '--font-mhf-script' })

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const portfolioBands = {
  'rep-highlights': { name: 'paper', className: styles.bandPaper },
  'community-themes': { name: 'blush', className: styles.bandBlush },
} as const

function SlideFrame({ slide, active, prioritizePoster = false }: { slide: PortfolioSlide; active: boolean; prioritizePoster?: boolean }) {
  if (slide.kind === 'placeholder') {
    return (
      <div className={styles.placeholder}>
        <p>Placeholder</p>
        <strong>{slide.title}</strong>
        <span>Real capture still to come</span>
      </div>
    )
  }

  const recording = slide.kind === 'capture' && (slide.video || slide.fixedShowcase)
    ? undefined
    : portfolioMotion[slide.id]
  const video = slide.video ?? (recording
    ? { mp4: recording.mp4, width: recording.width, height: recording.height }
    : undefined)

  return (
    <div className={`${slide.width < 700 ? styles.phoneFrame : styles.frame} ${mileHighScript.variable}`}>
      <div className={styles.mediaWell}>
        {video ? (
          <ProductPeekVideo
            poster={recording?.poster ?? slide.src}
            mp4={video.mp4}
            width={video.width}
            height={video.height}
            alt={recording ? `Recorded website header and complete hero from ${slide.title}` : slide.alt}
            label={slide.title}
            active={active}
            eagerPoster={prioritizePoster}
            fit="cover"
          />
        ) : (
          <Image
            src={slide.src}
            alt={slide.alt}
            width={slide.width}
            height={slide.height}
            sizes="(max-width: 700px) 86vw, 860px"
          />
        )}
        {slide.hero ? (
          <div
            className={styles.heroCopy}
            data-tone={slide.hero.tone}
            data-font={slide.hero.font ?? 'display'}
            data-align={slide.hero.align ?? 'start'}
            data-accent={slide.hero.accent}
            data-lockup={slide.hero.lockup}
          >
            {slide.hero.eyebrow ? <p>{slide.hero.eyebrow}</p> : null}
            <strong>{slide.hero.headline}</strong>
            <span>{slide.hero.sub}</span>
            {slide.hero.instruction ? <em>{slide.hero.instruction}</em> : null}
            {slide.hero.actions?.length ? (
              <div className={styles.heroActions}>
                {slide.hero.actions.map((action) => (
                  <div key={action} className={styles.heroAction}>{action}</div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function PortfolioCarousel({
  carousel,
}: {
  carousel: (typeof sparkleSuitePortfolioContent.carousels)[number]
}) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const dotsRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef(0)
  const userMovedRef = useRef(false)
  const programmaticRef = useRef(false)
  const programmaticTimer = useRef(0)
  const [active, setActive] = useState(0)
  const count = carousel.slides.length

  function scrollToSlide(index: number, behavior?: ScrollBehavior) {
    const viewport = viewportRef.current
    const target = viewport?.querySelector<HTMLElement>(`[data-slide-index="${index}"]`)
    if (!viewport || !target) return
    const viewportRect = viewport.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    const delta = targetRect.left - viewportRect.left - (viewportRect.width - targetRect.width) / 2
    const chosen = behavior ?? (prefersReducedMotion() ? 'auto' : 'smooth')
    programmaticRef.current = true
    window.clearTimeout(programmaticTimer.current)
    programmaticTimer.current = window.setTimeout(() => {
      programmaticRef.current = false
    }, chosen === 'auto' ? 80 : 700)
    viewport.scrollTo({
      left: viewport.scrollLeft + delta,
      behavior: chosen,
    })
  }

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const nearestIndex = () => {
      const slides = [...viewport.querySelectorAll<HTMLElement>('[data-slide-index]')]
      const center = viewport.scrollLeft + viewport.clientWidth / 2
      let closest = 0
      let distance = Number.POSITIVE_INFINITY
      slides.forEach((item, index) => {
        const itemCenter = viewport.scrollLeft
          + (item.getBoundingClientRect().left - viewport.getBoundingClientRect().left)
          + item.offsetWidth / 2
        const delta = Math.abs(itemCenter - center)
        if (delta < distance) {
          distance = delta
          closest = index
        }
      })
      return closest
    }
    const applyUserScroll = () => {
      const next = nextCarouselIndex(activeRef.current, nearestIndex(), userMovedRef.current)
      activeRef.current = next
      setActive(next)
    }
    let frame = 0
    let settleTimer = 0
    let restoreFrame = 0
    const restoreHeldSlide = () => {
      userMovedRef.current = false
      cancelAnimationFrame(restoreFrame)
      restoreFrame = requestAnimationFrame(() => scrollToSlide(activeRef.current, 'auto'))
    }
    const onScroll = () => {
      if (programmaticRef.current) return
      if (!userMovedRef.current) {
        restoreHeldSlide()
        return
      }
      cancelAnimationFrame(frame)
      window.clearTimeout(settleTimer)
      frame = requestAnimationFrame(() => {
        settleTimer = window.setTimeout(applyUserScroll, 80)
      })
    }
    const markUserMoved = () => {
      userMovedRef.current = true
    }
    const onScrollEnd = () => {
      if (userMovedRef.current) applyUserScroll()
      userMovedRef.current = false
    }
    scrollToSlide(0, 'auto')
    window.addEventListener('resize', restoreHeldSlide)
    viewport.addEventListener('pointerdown', markUserMoved)
    viewport.addEventListener('wheel', markUserMoved, { passive: true })
    viewport.addEventListener('touchstart', markUserMoved, { passive: true })
    viewport.addEventListener('scroll', onScroll, { passive: true })
    viewport.addEventListener('scrollend', onScrollEnd)
    return () => {
      cancelAnimationFrame(frame)
      cancelAnimationFrame(restoreFrame)
      window.clearTimeout(settleTimer)
      window.clearTimeout(programmaticTimer.current)
      window.removeEventListener('resize', restoreHeldSlide)
      viewport.removeEventListener('pointerdown', markUserMoved)
      viewport.removeEventListener('wheel', markUserMoved)
      viewport.removeEventListener('touchstart', markUserMoved)
      viewport.removeEventListener('scroll', onScroll)
      viewport.removeEventListener('scrollend', onScrollEnd)
    }
  }, [])

  function focusSlide(index: number) {
    const next = (index + count) % count
    activeRef.current = next
    setActive(next)
    userMovedRef.current = false
    scrollToSlide(next)
    return next
  }

  function moveDot(index: number) {
    const next = focusSlide(index)
    dotsRef.current?.querySelectorAll('button')[next]?.focus()
  }

  const band = portfolioBands[carousel.id]

  return (
    <section
      className={`${styles.showcase} ${band.className}`}
      id={carousel.id}
      aria-labelledby={`${carousel.id}-title`}
      data-band={band.name}
    >
      <div className={styles.showcaseCopy}>
        <p className={styles.eyebrow}>{carousel.eyebrow}</p>
        <h2 id={`${carousel.id}-title`}>{carousel.heading}</h2>
        <p>{carousel.body}</p>
      </div>
      <div
        className={styles.carousel}
        role="region"
        aria-roledescription="carousel"
        aria-label={carousel.label}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') {
            event.preventDefault()
            focusSlide(active - 1)
          }
          if (event.key === 'ArrowRight') {
            event.preventDefault()
            focusSlide(active + 1)
          }
        }}
      >
        <div className={styles.stage}>
        <button type="button" className={`${styles.carouselButton} ${styles.previousSlide}`} aria-label={`Previous ${carousel.label}`} onClick={() => focusSlide(active - 1)}>
          <ChevronLeft size={26} aria-hidden="true" />
        </button>
        <div ref={viewportRef} className={styles.viewport}>
          {carousel.slides.map((item, index) => (
            <div
              key={item.id}
              className={styles.slide}
              data-slide-index={index}
              data-active={index === active}
            >
              <SlideFrame slide={item} active={index === active} prioritizePoster={index === 0} />
            </div>
          ))}
        </div>
        <button type="button" className={`${styles.carouselButton} ${styles.nextSlide}`} aria-label={`Next ${carousel.label}`} onClick={() => focusSlide(active + 1)}>
          <ChevronRight size={26} aria-hidden="true" />
        </button>
        </div>
        {carousel.slides.map((item, index) => (
          <div key={item.id} className={styles.cardMeta} hidden={index !== active}>
            <h3>{item.title}</h3>
            {item.kind === 'capture' && item.href && item.linkLabel ? (
              <a
                href={item.href}
                {...(item.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                {item.linkLabel}
                {item.href.startsWith('http') ? <span className={styles.srOnly}> (opens in a new tab)</span> : null}
              </a>
            ) : null}
            <p className={styles.cardDetail}>{item.detail}</p>
          </div>
        ))}
      </div>
      <div ref={dotsRef} className={styles.dots} data-count={count} role="group" aria-label={`${carousel.label} slides`}>
        {carousel.slides.map((item, index) => (
          <button
            key={item.id}
            type="button"
            aria-current={index === active ? 'true' : undefined}
            aria-label={`${item.title}, slide ${index + 1} of ${count}`}
            tabIndex={index === active ? 0 : -1}
            onClick={() => focusSlide(index)}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
              event.preventDefault()
              moveDot(index + (event.key === 'ArrowRight' ? 1 : -1))
            }}
          />
        ))}
      </div>
      <p className={styles.counter} data-count={count}>
        <span className={styles.srOnly} aria-live="polite">Slide {active + 1} of {count}</span>
        <span aria-hidden="true">{active + 1} / {count}</span>
      </p>
      <Link className={styles.primaryButton} href={sparkleSuiteScheduleBuild.href}>
        {sparkleSuiteScheduleBuild.label} <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </section>
  )
}

export function PortfolioCarousels({
  ids,
}: {
  ids: readonly (typeof sparkleSuitePortfolioContent.carousels)[number]['id'][]
}) {
  const carousels = ids.flatMap((id) => {
    const carousel = sparkleSuitePortfolioContent.carousels.find((item) => item.id === id)
    return carousel ? [carousel] : []
  })

  return (
    <>
      {carousels.map((carousel) => (
        <PortfolioCarousel key={carousel.id} carousel={carousel} />
      ))}
    </>
  )
}
