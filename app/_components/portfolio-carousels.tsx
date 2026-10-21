'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  sparkleSuitePortfolioContent,
  sparkleSuiteScheduleBuild,
  type PortfolioSlide,
} from '@/lib/sparkle-suite/portfolio-content'
import { portfolioMotion } from '@/lib/sparkle-suite/portfolio-motion'
import { ProductPeekVideo } from './product-peek-video'
import styles from './portfolio-experience.module.css'

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

  const recording = slide.video ? undefined : portfolioMotion[slide.id]
  const video = slide.video ?? (recording
    ? { mp4: recording.mp4, width: recording.width, height: recording.height }
    : undefined)

  return (
    <div className={slide.width < 700 ? styles.phoneFrame : styles.frame}>
      <div className={styles.browserBar} aria-hidden="true">
        <em>{slide.title}</em>
      </div>
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
            eagerPoster={Boolean(recording) && prioritizePoster}
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
          >
            {slide.hero.eyebrow ? <p>{slide.hero.eyebrow}</p> : null}
            <strong>{slide.hero.headline}</strong>
            <span>{slide.hero.sub}</span>
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
  const [active, setActive] = useState(0)
  const count = carousel.slides.length

  function scrollToSlide(index: number) {
    const viewport = viewportRef.current
    const target = viewport?.querySelector<HTMLElement>(`[data-slide-index="${index}"]`)
    if (!viewport || !target) return
    const viewportRect = viewport.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    const delta = targetRect.left - viewportRect.left - (viewportRect.width - targetRect.width) / 2
    viewport.scrollTo({
      left: viewport.scrollLeft + delta,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    })
  }

  useEffect(() => {
    scrollToSlide(0)
    const viewport = viewportRef.current
    if (!viewport) return
    const syncActive = () => {
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
      setActive(closest)
    }
    let frame = 0
    let settleTimer = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(settleTimer)
      frame = requestAnimationFrame(() => {
        settleTimer = window.setTimeout(syncActive, 80)
      })
    }
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0]
      const index = Number(visible?.target.getAttribute('data-slide-index'))
      if (Number.isInteger(index)) setActive(index)
    }, { root: viewport, threshold: [0.6] })
    viewport.querySelectorAll('[data-slide-index]').forEach((slide) => observer.observe(slide))
    viewport.addEventListener('scroll', onScroll, { passive: true })
    viewport.addEventListener('scrollend', syncActive)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(settleTimer)
      observer.disconnect()
      viewport.removeEventListener('scroll', onScroll)
      viewport.removeEventListener('scrollend', syncActive)
    }
  }, [])

  function focusSlide(index: number) {
    const next = (index + count) % count
    setActive(next)
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
              <div className={styles.cardMeta}>
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
            </div>
          ))}
        </div>
        <button type="button" className={`${styles.carouselButton} ${styles.nextSlide}`} aria-label={`Next ${carousel.label}`} onClick={() => focusSlide(active + 1)}>
          <ChevronRight size={26} aria-hidden="true" />
        </button>
        </div>
      </div>
      <div ref={dotsRef} className={styles.dots} role="group" aria-label={`${carousel.label} slides`}>
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
