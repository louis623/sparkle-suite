'use client'

import Link from 'next/link'
import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react'

import { prelaunchContent } from '@/lib/prelaunch/content'
import { readBrowserQueueAttribution, rememberBrowserQueueAttribution } from '@/lib/prelaunch/attribution'
import { SparkleSeal } from './PrelaunchVisuals'

type WaitlistFormValues = {
  name: string
  email: string
  phone: string
  tiktokHandle: string
  teamRepName: string
  setupPain: string
  website: string
  smsConsent: boolean
  emailConsent: boolean
}

const initialValues: WaitlistFormValues = {
  name: '',
  email: '',
  phone: '',
  tiktokHandle: '',
  teamRepName: '',
  setupPain: '',
  website: '',
  smsConsent: false,
  emailConsent: true,
}

export function PrelaunchWaitlistForm() {
  const [values, setValues] = useState<WaitlistFormValues>(initialValues)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  useEffect(rememberBrowserQueueAttribution, [])

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const target = event.currentTarget
    const { name } = target

    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      setValues((current) => ({
        ...current,
        [name]: target.checked,
      }))
      return
    }

    setValues((current) => ({
      ...current,
      [name]: target.value,
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!event.currentTarget.reportValidity()) return
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const response = await fetch('/api/prelaunch/waitlist', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ ...values, attribution: readBrowserQueueAttribution() }),
      })

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null

      if (!response.ok) {
        throw new Error(payload?.error || prelaunchContent.waitlistErrorFallback)
      }

      setIsSubmitted(true)
      setValues(initialValues)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : prelaunchContent.waitlistErrorFallback,
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="ss-waitlist" id="waitlist">
      <div className="ss-wrap">
        <div className="ss-waitlist__panel">
          <div className="ss-waitlist__intro">
            <span className="ss-eyebrow">{prelaunchContent.waitlistEyebrow}</span>
            <h2>
              {prelaunchContent.waitlistHeading}
            </h2>
            <p>{prelaunchContent.waitlistBody}</p>
            <p className="ss-waitlist__small">{prelaunchContent.waitlistNote}</p>
          </div>
          <div className={isSubmitted ? 'ss-form-wrap is-sent' : 'ss-form-wrap'}>
            <form className="ss-form" noValidate onSubmit={handleSubmit}>
              <input
                autoComplete="off"
                hidden
                name="website"
                onChange={handleChange}
                tabIndex={-1}
                type="text"
                value={values.website}
              />
              <fieldset className="ss-form__fieldset">
                <div className="ss-form__row">
                  <FormField
                    autoComplete="name"
                    id="waitlist-name"
                    label={prelaunchContent.waitlistFields.name.label}
                    name="name"
                    onChange={handleChange}
                    placeholder="First & last"
                    required
                    value={values.name}
                  />
                  <FormField
                    autoComplete="email"
                    id="waitlist-email"
                    label={prelaunchContent.waitlistFields.email.label}
                    name="email"
                    onChange={handleChange}
                    placeholder={prelaunchContent.waitlistFields.email.placeholder}
                    required
                    type="email"
                    value={values.email}
                  />
                </div>
                <div className="ss-form__row">
                  <FormField
                    autoComplete="tel"
                    id="waitlist-phone"
                    label={prelaunchContent.waitlistFields.phone.label}
                    name="phone"
                    onChange={handleChange}
                    placeholder="(555) 123-4567"
                    type="tel"
                    value={values.phone}
                  />
                  <FormField
                    id="waitlist-tiktok"
                    label={prelaunchContent.waitlistFields.tiktokHandle.label}
                    name="tiktokHandle"
                    onChange={handleChange}
                    placeholder={prelaunchContent.waitlistFields.tiktokHandle.placeholder}
                    value={values.tiktokHandle}
                  />
                </div>
                <FormField
                  id="waitlist-team-rep"
                  label={prelaunchContent.waitlistFields.teamRepName.label}
                  name="teamRepName"
                  onChange={handleChange}
                  placeholder="The rep or team you're under"
                  value={values.teamRepName}
                />
                <div className="ss-field">
                  <label htmlFor="waitlist-setup-pain">
                    {prelaunchContent.waitlistFields.setupPain.label}
                    <span className="ss-field__opt"> — Optional</span>
                  </label>
                  <textarea
                    id="waitlist-setup-pain"
                    name="setupPain"
                    onChange={handleChange}
                    placeholder={prelaunchContent.waitlistFields.setupPain.placeholder}
                    value={values.setupPain}
                  />
                </div>
                <div className="ss-consents">
                  <CheckboxField
                    checked={values.smsConsent}
                    id="waitlist-sms-consent"
                    label={prelaunchContent.waitlistSmsConsentLabel}
                    name="smsConsent"
                    onChange={handleChange}
                    strongLabel="Text me updates."
                  />
                  <p className="ss-micro">
                    Message frequency may vary. Message and data rates may
                    apply. Consent is not a condition of purchase. Wireless
                    carriers are not liable for delayed or undelivered messages.
                    Reply HELP for help or STOP to opt out. SMS opt-in data is
                    not sold, rented, traded, or shared for third-party
                    marketing. See our{' '}
                    <Link href="/privacy-policy">Privacy Policy</Link> and{' '}
                    <Link href="/terms-and-conditions">Terms and Conditions</Link>.
                  </p>
                  <CheckboxField
                    checked={values.emailConsent}
                    id="waitlist-email-consent"
                    label={prelaunchContent.waitlistEmailConsentLabel}
                    name="emailConsent"
                    onChange={handleChange}
                    required
                    strongLabel="Email me updates."
                  />
                </div>
              </fieldset>
              {errorMessage ? <p className="ss-error" role="alert">{errorMessage}</p> : null}
              <div className="ss-form__submit">
                <p className="ss-micro">{prelaunchContent.waitlistConsentNote}</p>
                <button
                  className="ss-btn ss-btn--gold"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {isSubmitting
                    ? prelaunchContent.waitlistSubmittingLabel
                    : prelaunchContent.waitlistSubmitLabel}
                  <span aria-hidden="true" className="ss-arrow">
                    &rarr;
                  </span>
                </button>
              </div>
            </form>

            <div aria-live="polite" className="ss-confirm" role="status">
              <SparkleSeal className="ss-confirm__seal" />
              <span className="ss-eyebrow">
                {prelaunchContent.waitlistSuccessEyebrow}
              </span>
              <h3>
                {prelaunchContent.waitlistSuccessTitle}
              </h3>
              <p>{prelaunchContent.waitlistSuccessBody}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

type FormFieldProps = {
  autoComplete?: string
  id: string
  label: string
  name: keyof WaitlistFormValues
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  placeholder: string
  required?: boolean
  type?: 'email' | 'tel' | 'text'
  value: string
}

function FormField({
  autoComplete,
  id,
  label,
  name,
  onChange,
  placeholder,
  required,
  type = 'text',
  value,
}: FormFieldProps) {
  return (
    <div className="ss-field">
      <label htmlFor={id}>
        {label}
        {!required ? <span className="ss-field__opt"> — Optional</span> : null}
      </label>
      <input
        autoComplete={autoComplete}
        id={id}
        name={name}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
      />
    </div>
  )
}

type CheckboxFieldProps = {
  checked: boolean
  id: string
  label: string
  name: 'smsConsent' | 'emailConsent'
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  required?: boolean
  strongLabel: string
}

function CheckboxField({
  checked,
  id,
  label,
  name,
  onChange,
  required,
  strongLabel,
}: CheckboxFieldProps) {
  const plainLabel = label.replace(strongLabel, '').trim()

  return (
    <label className="ss-check" htmlFor={id}>
      <input
        checked={checked}
        id={id}
        name={name}
        onChange={onChange}
        required={required}
        type="checkbox"
      />
      <span aria-hidden="true" className="ss-check__box">
        <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 12 12">
          <path d="M2 6.5l2.5 2.5L10 3.5" />
        </svg>
      </span>
      <span className="ss-check__text">
        <strong>{strongLabel}</strong> {plainLabel}
      </span>
    </label>
  )
}
