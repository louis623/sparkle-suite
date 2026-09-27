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
import styles from './portfolio-experience.module.css'

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function SlideFrame({ slide }: { slide: PortfolioSlide }) {
  if (slide.kind === 'placeholder') {
    return (
      <div className={styles.placeholder}>
        <p>Placeholder</p>
        <strong>{slide.title}</strong>
        <span>Real capture still to come</span>
      </div>
    )
  }

  return (
    <div className={slide.width < 700 ? styles.phoneFrame : styles.frame}>
      <div className={styles.browserBar} aria-hidden="true">
        <span />
        <span />
        <span />
        <em>{slide.title}</em>
      </div>
      <Image
        src={slide.src}
        alt={slide.alt}
        width={slide.width}
        height={slide.height}
        sizes="(max-width: 700px) 84vw, 760px"
      />
    </div>
  )
}

function PortfolioCarousel({
  carousel,
}: {
  carousel: (typeof sparkleSuitePortfolioContent.carousels)[number]
}) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const count = carousel.slides.length
  const slide = carousel.slides[active]

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
    const onEnd = () => {
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
    viewport.addEventListener('scrollend', onEnd)
    return () => viewport.removeEventListener('scrollend', onEnd)
  }, [])

  function focusSlide(index: number) {
    const next = (index + count) % count
    setActive(next)
    scrollToSlide(next)
  }

  return (
    <section className={styles.showcase} id={carousel.id} aria-labelledby={`${carousel.id}-title`}>
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
        <button type="button" className={styles.carouselButton} aria-label={`Previous ${carousel.label}`} onClick={() => focusSlide(active - 1)}>
          <ChevronLeft size={22} aria-hidden="true" />
        </button>
        <div ref={viewportRef} className={styles.viewport}>
          {carousel.slides.map((item, index) => (
            <div
              key={item.id}
              className={styles.slide}
              data-slide-index={index}
              data-active={index === active}
            >
              <SlideFrame slide={item} />
              <div className={styles.cardMeta}>
                <h3>{item.title}</h3>
                {item.kind === 'capture' && item.href && item.linkLabel ? (
                  <a href={item.href} rel="noopener noreferrer">{item.linkLabel}</a>
                ) : (
                  <p>{item.detail}</p>
                )}
              </div>
            </div>
          ))}
        </div>
        <button type="button" className={styles.carouselButton} aria-label={`Next ${carousel.label}`} onClick={() => focusSlide(active + 1)}>
          <ChevronRight size={22} aria-hidden="true" />
        </button>
      </div>
      <div className={styles.caption} aria-live="polite">
        <p>{slide.detail}</p>
      </div>
      <div className={styles.dots} role="tablist" aria-label={`${carousel.label} slides`}>
        {carousel.slides.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={index === active}
            aria-label={`${item.title}, slide ${index + 1} of ${count}`}
            onClick={() => focusSlide(index)}
          />
        ))}
      </div>
      <Link className={styles.primaryButton} href={sparkleSuiteScheduleBuild.href}>
        {sparkleSuiteScheduleBuild.label} <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </section>
  )
}

export function PortfolioCarousels() {
  return (
    <>
      {sparkleSuitePortfolioContent.carousels.map((carousel) => (
        <PortfolioCarousel key={carousel.id} carousel={carousel} />
      ))}
    </>
  )
}
