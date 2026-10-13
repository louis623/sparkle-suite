'use client'

import { useEffect, useId, useRef, useState } from 'react'

import { sparkleSuiteMarketingHubContent as hub } from '@/lib/sparkle-suite/marketing-hub-content'

import styles from './marketing-hub.module.css'

const smoke = hub.suite.smokeSignIn

/**
 * On-card Suite sign-in shell for the marketing hub.
 * Google opens in a separate window and is not a Suite session.
 * Forgot password is a demo message only.
 */
export function SuiteSignInShell() {
  const [open, setOpen] = useState(false)
  const [forgotNoted, setForgotNoted] = useState(false)
  const [popupBlocked, setPopupBlocked] = useState(false)
  const titleId = useId()
  const noticeId = useId()
  const dialogId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    const signInButton = buttonRef.current
    closeRef.current?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setOpen(false)
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      signInButton?.focus()
    }
  }, [open])

  function openGoogleOnly() {
    const popup = window.open(smoke.googleUrl, 'sparkle-suite-smoke-google', 'popup=yes,width=520,height=720')
    if (!popup) {
      setPopupBlocked(true)
      return
    }

    try {
      popup.opener = null
    } catch {
      // Keep the hub page in place even if the browser refuses to clear opener.
    }

    setPopupBlocked(false)
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={styles.accountLink}
        aria-controls={dialogId}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        {hub.suite.signInLabel}
      </button>
      <div className={styles.cardModal} hidden={!open} onClick={() => setOpen(false)}>
        <div
          id={dialogId}
          className={styles.cardModalPanel}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={noticeId}
          onClick={(event) => event.stopPropagation()}
        >
          <h3 className={styles.cardModalTitle} id={titleId}>
            {smoke.title}
          </h3>
          <p className={styles.smokeNotice} id={noticeId}>
            {smoke.googleNotice}
          </p>
          <button
            type="button"
            className={styles.googleButton}
            data-smoke-google-url={smoke.googleUrl}
            onClick={openGoogleOnly}
          >
            {smoke.googleLabel}
          </button>
          {popupBlocked ? (
            <a href={smoke.googleUrl} target="_blank" rel="noopener noreferrer">
              {smoke.popupBlocked}
            </a>
          ) : null}
          <p className={styles.smokeNotice}>{smoke.passwordNotice}</p>
          <p className={styles.demoNotice}>{smoke.forgotDemo}</p>
          <button type="button" className={styles.forgotButton} onClick={() => setForgotNoted(true)}>
            {smoke.forgotLabel}
          </button>
          {forgotNoted ? (
            <p className={styles.forgotResult} role="status">
              {smoke.forgotResult}
            </p>
          ) : null}
          <button ref={closeRef} type="button" className={styles.closeButton} onClick={() => setOpen(false)}>
            {smoke.closeLabel}
          </button>
        </div>
      </div>
    </>
  )
}
