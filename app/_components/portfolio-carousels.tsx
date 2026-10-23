'use client'

import Link from 'next/link'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  sparkleSuitePortfolioContent,
  sparkleSuiteScheduleBuild,
  type PortfolioSlide,
} from '@/lib/sparkle-suite/portfolio-content'
import { nextCarouselIndex } from '@/lib/sparkle-suite/portfolio-carousel-index'
import { portfolioCarouselMotion } from '@/lib/sparkle-suite/portfolio-motion'
import { CommunityThemeSitePeek } from './community-theme-site-peek'
import { ProductPeekVideo, type ProductPeekPlaybackProps } from './product-peek-video'
import { CAROUSEL_DWELL_MS, newCarouselClock, tickCarouselClock, type PeekPlaybackState } from '@/lib/sparkle-suite/portfolio-carousel-playback'
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

function SlideFrame({ slide, prioritizePoster = false, ...playbackProps }: ProductPeekPlaybackProps & { slide: PortfolioSlide; prioritizePoster?: boolean }) {
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
          <CommunityThemeSitePeek theme={slide.theme} title={slide.title} {...playbackProps} />
        ) : recording ? (
          <ProductPeekVideo
            poster={recording.poster}
            mp4={recording.mp4}
            width={recording.width}
            height={recording.height}
            alt={slide.alt}
            label={slide.title}
            {...playbackProps}
            eagerPoster={prioritizePoster}
            fit="contain"
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
  const sessionRef = useRef(0)
  const clock = useRef(newCarouselClock())
  const [visible, setVisible] = useState(0)
  const [centered, setCentered] = useState<number | null>(null)
  const [session, setSession] = useState(0)
  const [paused, setPaused] = useState(false)
  const [requested, setRequested] = useState(false)
  const [automatic, setAutomatic] = useState(false)
  const [inView, setInView] = useState(false)
  const [pageVisible, setPageVisible] = useState(true)
  const [playback, setPlayback] = useState<PeekPlaybackState>('idle')
  const [fallback, setFallback] = useState(false)
  const count = carousel.slides.length

  const resetPlayback = useCallback(() => {
    clock.current = newCarouselClock()
    sessionRef.current += 1
    setSession(sessionRef.current)
    setPlayback('idle')
    setFallback(false)
  }, [])

  const scrollToSlide = useCallback((index: number, behavior?: ScrollBehavior) => {
    const viewport = viewportRef.current
    const target = viewport?.querySelector<HTMLElement>(`[data-slide-index="${index}"]`)
    if (!viewport || !target) return
    const viewportRect = viewport.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    const delta = targetRect.left - viewportRect.left - (viewportRect.width - targetRect.width) / 2
    const chosen = behavior ?? (prefersReducedMotion() ? 'auto' : 'smooth')
    if (Math.abs(delta) <= 3) { setCentered(index); return }
    setCentered(null)
    programmaticRef.current = true
    window.clearTimeout(programmaticTimer.current)
    programmaticTimer.current = window.setTimeout(() => {
      programmaticRef.current = false
    }, chosen === 'auto' ? 80 : 700)
    viewport.scrollTo({ left: viewport.scrollLeft + delta, behavior: chosen })
  }, [])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const nearest = () => {
      const slides = [...viewport.querySelectorAll<HTMLElement>('[data-slide-index]')]
      const rect = viewport.getBoundingClientRect()
      const center = rect.left + rect.width / 2
      let closest = 0
      let distance = Number.POSITIVE_INFINITY
      slides.forEach((item, index) => {
        const itemRect = item.getBoundingClientRect()
        const delta = Math.abs(itemRect.left + itemRect.width / 2 - center)
        if (delta < distance) { distance = delta; closest = index }
      })
      return { index: closest, distance }
    }
    const publishVisible = (index: number) => {
      if (visibleRef.current === index) return
      visibleRef.current = index
      setVisible(index)
      resetPlayback()
    }
    const settle = () => {
      const next = nearest()
      activeRef.current = nextCarouselIndex(activeRef.current, next.index, userMovedRef.current)
      publishVisible(next.index)
      setCentered(next.distance <= 3 ? next.index : null)
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
      setCentered(null)
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        // Captions follow the physically nearest slide; media waits for centering.
        publishVisible(nearest().index)
        if (!programmaticRef.current && !userMovedRef.current) {
          restoreHeldSlide()
          return
        }
        window.clearTimeout(settleTimer)
        settleTimer = window.setTimeout(settle, 100)
      })
    }
    const markUserMoved = () => {
      userMovedRef.current = true
      programmaticRef.current = false
      setCentered(null)
      window.clearTimeout(settleTimer)
      // Pointer taps without a drag must also settle and resume.
      settleTimer = window.setTimeout(settle, 150)
    }
    const onScrollEnd = () => {
      settle()
      userMovedRef.current = false
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    const syncPreference = () => {
      setAutomatic(!reduce.matches && !connection?.saveData)
      setRequested(false)
    }
    const onVisibility = () => setPageVisible(!document.hidden)
    // This observer gates playback only; it never chooses or restores an index.
    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting && entry.intersectionRatio >= .35)
    }, { threshold: [.35] })
    observer.observe(viewport)
    syncPreference()
    onVisibility()
    restoreFrame = requestAnimationFrame(() => scrollToSlide(0, 'auto'))
    reduce.addEventListener('change', syncPreference)
    window.addEventListener('resize', restoreHeldSlide)
    document.addEventListener('visibilitychange', onVisibility)
    viewport.addEventListener('pointerdown', markUserMoved)
    viewport.addEventListener('wheel', markUserMoved, { passive: true })
    viewport.addEventListener('touchstart', markUserMoved, { passive: true })
    viewport.addEventListener('scroll', onScroll, { passive: true })
    viewport.addEventListener('scrollend', onScrollEnd)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
      cancelAnimationFrame(restoreFrame)
      window.clearTimeout(settleTimer)
      window.clearTimeout(programmaticTimer.current)
      reduce.removeEventListener('change', syncPreference)
      window.removeEventListener('resize', restoreHeldSlide)
      document.removeEventListener('visibilitychange', onVisibility)
      viewport.removeEventListener('pointerdown', markUserMoved)
      viewport.removeEventListener('wheel', markUserMoved)
      viewport.removeEventListener('touchstart', markUserMoved)
      viewport.removeEventListener('scroll', onScroll)
      viewport.removeEventListener('scrollend', onScrollEnd)
    }
  }, [resetPlayback, scrollToSlide])

  const enabled = (automatic || requested) && !paused
  const eligible = automatic && enabled && inView && pageVisible && centered === visible
  useEffect(() => {
    if (!eligible) return
    let previous = performance.now()
    const timer = window.setInterval(() => {
      const now = performance.now()
      clock.current = tickCarouselClock(clock.current, Math.min(now - previous, 500), !document.hidden, playback)
      previous = now
      if (clock.current.fallback && !fallback) setFallback(true)
      if (clock.current.viewedMs < CAROUSEL_DWELL_MS) return
      const next = (visibleRef.current + 1) % count
      activeRef.current = next
      userMovedRef.current = false
      resetPlayback()
      scrollToSlide(next)
    }, 100)
    return () => window.clearInterval(timer)
  }, [count, eligible, fallback, playback, resetPlayback, scrollToSlide])

  function focusSlide(index: number) {
    const next = (index + count) % count
    activeRef.current = next
    userMovedRef.current = false
    resetPlayback()
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
              <SlideFrame
                key={index === visible ? item.id + '-' + session : item.id}
                slide={item}
                active={index === visible && centered === visible && inView && pageVisible && !fallback}
                paused={!enabled}
                requested={requested}
                showControl={false}
                prioritizePoster={index === 0}
                onPlaybackStateChange={(state) => {
                  if (sessionRef.current === session && visibleRef.current === index) setPlayback(state)
                }}
              />
            </div>
          ))}
        </div>
        <button type="button" className={`${styles.carouselButton} ${styles.nextSlide}`} aria-label={`Next ${carousel.label}`} onClick={() => focusSlide(visible + 1)}>
          <ChevronRight size={26} aria-hidden="true" />
        </button>
        <button type="button" className={styles.playbackControl}
          aria-label={(enabled ? 'Pause ' : 'Play ') + carousel.label + (automatic ? ' animation and slideshow' : ' animation')}
          onClick={() => {
            if (enabled) { setPaused(true); return }
            setRequested(true)
            setPaused(false)
            if (fallback || playback === 'error') resetPlayback()
          }}>{enabled ? (automatic ? 'Pause slideshow' : 'Pause animation') : 'Play animation'}</button>
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
