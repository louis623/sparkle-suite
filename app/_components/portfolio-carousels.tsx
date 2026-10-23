'use client'

import Link from 'next/link'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  sparkleSuitePortfolioContent,
  sparkleSuiteScheduleBuild,
  type PortfolioSlide,
} from '@/lib/sparkle-suite/portfolio-content'
import { nextCarouselIndex } from '@/lib/sparkle-suite/portfolio-carousel-index'
import { portfolioCarouselMotion } from '@/lib/sparkle-suite/portfolio-motion'
import { CommunityThemeSitePeek } from './community-theme-site-peek'
import { ProductPeekVideo } from './product-peek-video'
import styles from './portfolio-experience.module.css'

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function SlideCaption({
  slide,
  interactive,
}: {
  slide: PortfolioSlide
  interactive: boolean
}) {
  const href = slide.kind === 'placeholder' ? undefined : slide.href
  const linkLabel = slide.kind === 'placeholder' ? undefined : slide.linkLabel
  return (
    <>
      <h3>{slide.title}</h3>
      {href && linkLabel ? (
        interactive ? (
          <a
            href={href}
            {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            {linkLabel}
            {href.startsWith('http') ? <span className={styles.srOnly}> (opens in a new tab)</span> : null}
          </a>
        ) : (
          <span className={styles.linkLine}>{linkLabel}</span>
        )
      ) : null}
      <p className={styles.cardDetail}>{slide.detail}</p>
    </>
  )
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

  const windowLabel = slide.kind === 'capture' ? slide.linkLabel : slide.title
  const recording = slide.kind === 'capture' ? portfolioCarouselMotion[slide.id] : undefined

  return (
    <div className={styles.siteWindow}>
      <div className={styles.browserBar}><span aria-hidden="true">● ● ●</span>{windowLabel}</div>
      <div className={styles.mediaWell}>
        {slide.kind === 'site' ? (
          <CommunityThemeSitePeek theme={slide.theme} title={slide.title} motion={active} />
        ) : recording ? (
          <ProductPeekVideo
            poster={recording.poster}
            mp4={recording.mp4}
            width={recording.width}
            height={recording.height}
            alt={slide.alt}
            label={slide.title}
            active={active}
            showControl={active}
            eagerPoster={prioritizePoster}
            fit="cover"
          />
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
  const visibleRef = useRef(0)
  const autoplayTimer = useRef(0)
  const [visible, setVisible] = useState(0)
  const count = carousel.slides.length
  const countRef = useRef(count)
  countRef.current = count

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
    const publishVisible = (index: number) => {
      if (visibleRef.current === index) return
      visibleRef.current = index
      setVisible(index)
    }
    const applyUserScroll = () => {
      const next = nextCarouselIndex(activeRef.current, nearestIndex(), userMovedRef.current)
      activeRef.current = next
      publishVisible(nearestIndex())
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
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        // Caption, dots, and the pause control follow the slide that is centered now.
        publishVisible(nearestIndex())
        if (programmaticRef.current) return
        if (!userMovedRef.current) {
          restoreHeldSlide()
          return
        }
        window.clearTimeout(settleTimer)
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
    const onVisibility = () => armAutoplay()
    document.addEventListener('visibilitychange', onVisibility)
    armAutoplay()
    return () => {
      cancelAnimationFrame(frame)
      cancelAnimationFrame(restoreFrame)
      window.clearTimeout(settleTimer)
      window.clearTimeout(programmaticTimer.current)
      window.clearInterval(autoplayTimer.current)
      window.removeEventListener('resize', restoreHeldSlide)
      document.removeEventListener('visibilitychange', onVisibility)
      viewport.removeEventListener('pointerdown', markUserMoved)
      viewport.removeEventListener('wheel', markUserMoved)
      viewport.removeEventListener('touchstart', markUserMoved)
      viewport.removeEventListener('scroll', onScroll)
      viewport.removeEventListener('scrollend', onScrollEnd)
    }
  }, [])

  function armAutoplay() {
    window.clearInterval(autoplayTimer.current)
    if (prefersReducedMotion() || document.hidden) return
    // Advance on our own clock. A recording ending must not hold the carousel.
    autoplayTimer.current = window.setInterval(() => {
      const next = (activeRef.current + 1) % countRef.current
      activeRef.current = next
      userMovedRef.current = false
      scrollToSlide(next)
    }, 6500)
  }

  function focusSlide(index: number) {
    const next = (index + count) % count
    activeRef.current = next
    userMovedRef.current = false
    scrollToSlide(next)
    armAutoplay()
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
            focusSlide(visible - 1)
          }
          if (event.key === 'ArrowRight') {
            event.preventDefault()
            focusSlide(visible + 1)
          }
        }}
      >
        <div className={styles.stage}>
        <button type="button" className={`${styles.carouselButton} ${styles.previousSlide}`} aria-label={`Previous ${carousel.label}`} onClick={() => focusSlide(visible - 1)}>
          <ChevronLeft size={26} aria-hidden="true" />
        </button>
        <div ref={viewportRef} className={styles.viewport}>
          {carousel.slides.map((item, index) => (
            <div
              key={item.id}
              className={styles.slide}
              data-slide-index={index}
              data-active={index === visible}
            >
              <SlideFrame slide={item} active={index === visible} prioritizePoster={index === 0} />
            </div>
          ))}
        </div>
        <button type="button" className={`${styles.carouselButton} ${styles.nextSlide}`} aria-label={`Next ${carousel.label}`} onClick={() => focusSlide(visible + 1)}>
          <ChevronRight size={26} aria-hidden="true" />
        </button>
        </div>
        <div className={styles.cardDeck}>
          {carousel.slides.map((item) => (
            <div key={`${item.id}-size`} className={styles.cardSizer} aria-hidden="true">
              <SlideCaption slide={item} interactive={false} />
            </div>
          ))}
          {carousel.slides.map((item, index) => (
            <div key={item.id} className={styles.cardMeta} hidden={index !== visible}>
              <SlideCaption slide={item} interactive />
            </div>
          ))}
        </div>
      </div>
      <div ref={dotsRef} className={styles.dots} data-count={count} role="group" aria-label={`${carousel.label} slides`}>
        {carousel.slides.map((item, index) => (
          <button
            key={item.id}
            type="button"
            aria-current={index === visible ? 'true' : undefined}
            aria-label={`${item.title}, slide ${index + 1} of ${count}`}
            tabIndex={index === visible ? 0 : -1}
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
        <span className={styles.srOnly} aria-live="polite">Slide {visible + 1} of {count}</span>
        <span aria-hidden="true">{visible + 1} / {count}</span>
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
