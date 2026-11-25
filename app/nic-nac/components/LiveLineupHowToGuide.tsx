'use client'

import type { Ref } from 'react'
import Image from 'next/image'
import {
  LIVE_LINEUP_GUIDE_IMAGES,
  LIVE_LINEUP_HELP_BUTTON_LABEL,
  LIVE_LINEUP_HELP_UPDATE_ID,
  LIVE_LINEUP_NEED_A_HAND,
  LIVE_LINEUP_UPDATE_AUTOMATIC_NOTE,
  LIVE_LINEUP_UPDATE_DELAY_NOTE,
  LIVE_LINEUP_UPDATE_STEPS,
  LIVE_LINEUP_UPDATE_WARNING,
  liveLineupGuideContent,
  type LiveLineupGuideImage,
} from '@/lib/live-lineup/how-to-guide'
import styles from './LiveLineupHowToGuide.module.css'

const ONE_COLUMN_SIZES = '(max-width: 560px) 100vw, 560px'
const EXTENSIONS_URL = 'chrome://extensions'

function StepText({ step }: { step: string }) {
  if (step === LIVE_LINEUP_UPDATE_STEPS[1]) {
    return (
      <>
        Turn on <strong>Developer mode</strong> (top right), press <strong>Update</strong>, then
        turn Developer mode back off.
      </>
    )
  }
  const urlAt = step.indexOf(EXTENSIONS_URL)
  if (urlAt === -1) return step
  return (
    <>
      {step.slice(0, urlAt)}
      <code className={styles.url}>{EXTENSIONS_URL}</code>
      {step.slice(urlAt + EXTENSIONS_URL.length)}
    </>
  )
}

function OfficialLink({ label, href }: { label: string; href: string }) {
  return (
    <a className={styles.externalLink} href={href} target="_blank" rel="noopener">
      {label}
      <span className={styles.visuallyHidden}> (opens in a new tab)</span>
    </a>
  )
}

function PlatformSteps({
  title,
  titleId,
  steps,
  link,
}: {
  title: string
  titleId: string
  steps: readonly string[]
  link: { label: string; href: string }
}) {
  return (
    <div className={styles.platform}>
      <h3 id={titleId} className={styles.platformTitle}>
        {title}
      </h3>
      <ol className={styles.list}>
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p className={styles.copy}>
        <OfficialLink label={link.label} href={link.href} />
      </p>
    </div>
  )
}

function GuideFigure({ image }: { image: LiveLineupGuideImage }) {
  return (
    <figure className={styles.figure}>
      <Image
        src={image.src}
        alt={image.alt}
        width={image.width}
        height={image.height}
        sizes={ONE_COLUMN_SIZES}
        loading="lazy"
        className={styles.shot}
        style={{ width: '100%', height: 'auto' }}
      />
      <figcaption className={styles.caption}>{image.caption}</figcaption>
    </figure>
  )
}

export function LiveLineupHowToGuide({
  now,
  supportView = false,
  onContactSupport,
  updateHeadingRef,
}: {
  now?: number
  supportView?: boolean
  onContactSupport?: () => void
  updateHeadingRef?: Ref<HTMLHeadingElement>
}) {
  const content = liveLineupGuideContent(now ?? Date.now())
  const duringStart = content.beforeYouGoLive.length + 1
  const doneStart = duringStart + content.duringYourShow.length

  return (
    <div className={styles.guide}>
      <section className={styles.section} aria-labelledby="live-lineup-whats-new">
        <h2 id="live-lineup-whats-new" className={styles.sectionTitle}>
          What&apos;s new
        </h2>
        <ul className={styles.list}>
          {content.whatsNew.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="live-lineup-before">
        <h2 id="live-lineup-before" className={styles.sectionTitle}>
          Before you go live
        </h2>
        <ol className={styles.list} start={1}>
          {content.beforeYouGoLive.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <GuideFigure image={LIVE_LINEUP_GUIDE_IMAGES.extensionStartStop} />
      </section>

      <section className={styles.section} aria-labelledby="live-lineup-during">
        <h2 id="live-lineup-during" className={styles.sectionTitle}>
          During your show
        </h2>
        <ol className={styles.list} start={duringStart}>
          {content.duringYourShow.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <div className={styles.pair}>
          <GuideFigure image={LIVE_LINEUP_GUIDE_IMAGES.workspaceLive} />
          <GuideFigure image={LIVE_LINEUP_GUIDE_IMAGES.needsAttention} />
        </div>
      </section>

      <section className={styles.section} aria-labelledby="live-lineup-stay-awake">
        <h2 id="live-lineup-stay-awake" className={styles.sectionTitle}>
          {content.stayAwake.title}
        </h2>
        <p className={styles.copy}>{content.stayAwake.intro}</p>
        <p className={styles.copy}>{content.stayAwake.note}</p>
        <div className={styles.platforms}>
          <PlatformSteps
            title="On a Mac:"
            titleId="live-lineup-stay-awake-mac"
            steps={content.stayAwake.macSteps}
            link={content.stayAwake.macLink}
          />
          <PlatformSteps
            title="On Windows:"
            titleId="live-lineup-stay-awake-windows"
            steps={content.stayAwake.windowsSteps}
            link={content.stayAwake.windowsLink}
          />
        </div>
        <p className={styles.copy}>{content.stayAwake.ifAsleep}</p>
      </section>

      <section className={styles.section} aria-labelledby="live-lineup-done">
        <h2 id="live-lineup-done" className={styles.sectionTitle}>
          When you&apos;re done
        </h2>
        <ol className={styles.list} start={doneStart}>
          {content.whenYouAreDone.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <GuideFigure image={LIVE_LINEUP_GUIDE_IMAGES.customerSiteAfterStop} />
      </section>

      <section className={styles.section} aria-labelledby={LIVE_LINEUP_HELP_UPDATE_ID}>
        <h2
          id={LIVE_LINEUP_HELP_UPDATE_ID}
          ref={updateHeadingRef}
          tabIndex={-1}
          className={styles.sectionTitle}
        >
          If your Workspace says your extension is out of date
        </h2>
        <p className={styles.warning}>{LIVE_LINEUP_UPDATE_WARNING}</p>
        <ol className={styles.list}>
          {content.updateSteps.map((step) => (
            <li key={step}>
              <StepText step={step} />
            </li>
          ))}
        </ol>
        <p className={styles.copy}>{LIVE_LINEUP_UPDATE_AUTOMATIC_NOTE}</p>
        <p className={styles.copy}>{LIVE_LINEUP_UPDATE_DELAY_NOTE}</p>
      </section>

      <section className={styles.section} aria-labelledby="live-lineup-help">
        <h2 id="live-lineup-help" className={styles.sectionTitle}>
          Need a hand?
        </h2>
        <p className={styles.copy}>{LIVE_LINEUP_NEED_A_HAND}</p>
        {supportView ? null : (
          <button type="button" className={styles.supportButton} onClick={onContactSupport}>
            {LIVE_LINEUP_HELP_BUTTON_LABEL}
          </button>
        )}
      </section>
    </div>
  )
}
