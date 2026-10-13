"use client";

import { useId, useState } from "react";
import type { FormEvent } from "react";
import {
  buildFinderLaunchNotifyPayload,
  finderLaunchNotifyErrorMessage,
  finderLaunchNotifyFieldMessage,
  finderLaunchNotifySavedMessage,
  type FinderLaunchNotifyFormInput,
} from "@/lib/sparkle-finder/launch-notify-request";
import styles from "./finder-learn.module.css";

export function FinderLearnNotifyButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className={styles.primaryButton} onClick={() => setOpen(true)} type="button">
        Get notified when we launch
        <ArrowIcon />
      </button>
      {open ? <FinderLaunchNotifyDialog onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export function FinderLaunchNotifyDialog({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [fieldError, setFieldError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input: FinderLaunchNotifyFormInput = {
      firstName: String(form.get("first_name") ?? ""),
      lastName: String(form.get("last_name") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
      address: String(form.get("address") ?? ""),
      birthdayMonth: String(form.get("birthday_month") ?? ""),
      birthdayDay: String(form.get("birthday_day") ?? ""),
      favoriteGemOrStone: String(form.get("favorite_gem_or_stone") ?? ""),
      favoriteMaterial: String(form.get("favorite_material") ?? ""),
      favoriteCut: String(form.get("favorite_cut") ?? ""),
      favoriteCollection: String(form.get("favorite_collection") ?? ""),
      notes: String(form.get("notes") ?? ""),
      tags: String(form.get("tags") ?? ""),
      marketingConsent: form.get("marketing_consent") === "true",
    };
    const built = buildFinderLaunchNotifyPayload(input);
    if (!built.ok) {
      setFieldError(finderLaunchNotifyFieldMessage(built.error));
      setStatus("idle");
      return;
    }

    setFieldError("");
    setStatus("saving");

    try {
      const response = await fetch("/api/finder/launch-notify", {
        method: "POST",
        headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify(built.body),
      });
      const payload = (await response.json().catch(() => null)) as { ok?: unknown } | null;
      if (response.status === 201 && payload?.ok === true) {
        setStatus("saved");
        return;
      }
    } catch {
      setStatus("error");
      return;
    }

    setStatus("error");
  }

  return (
    <div className={styles.notifyOverlay}>
      <div aria-labelledby={titleId} aria-modal="true" className={styles.notifyDialog} role="dialog">
        <div className={styles.notifyHeader}>
          <h2 id={titleId}>Get notified when we launch</h2>
          <button className={styles.notifyClose} onClick={onClose} type="button">
            Close
          </button>
        </div>
        {status === "saved" ? (
          <p className={styles.notifySaved}>{finderLaunchNotifySavedMessage}</p>
        ) : (
          <form className={styles.notifyForm} onSubmit={onSubmit}>
            <Field label="First name" name="first_name" required />
            <Field label="Last name" name="last_name" required />
            <p className={styles.notifyHint}>
              Email or phone <span className={styles.notifyRequired}>Required</span>
            </p>
            <Field label="Email" name="email" type="email" />
            <Field label="Phone" name="phone" type="tel" />
            <Field label="Address" name="address" />
            <Field label="Birthday month" name="birthday_month" type="number" />
            <Field label="Birthday day" name="birthday_day" type="number" />
            <Field label="Favorite gem or stone" name="favorite_gem_or_stone" />
            <Field label="Favorite material" name="favorite_material" />
            <Field label="Favorite cut" name="favorite_cut" />
            <Field label="Favorite collection" name="favorite_collection" />
            <Field label="Notes" name="notes" multiline />
            <Field hint="Separate tags with commas." label="Tags" name="tags" />
            <label className={styles.notifyCheck}>
              <input name="marketing_consent" type="checkbox" value="true" />
              Marketing consent
            </label>
            {fieldError ? (
              <p className={styles.notifyAlert} role="alert">
                {fieldError}
              </p>
            ) : null}
            {status === "error" ? (
              <p className={styles.notifyAlert} role="alert">
                {finderLaunchNotifyErrorMessage}
              </p>
            ) : null}
            <button className={styles.primaryButton} disabled={status === "saving"} type="submit">
              {status === "saving" ? "Saving" : "Get notified when we launch"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({
  hint,
  label,
  multiline = false,
  name,
  required = false,
  type = "text",
}: {
  hint?: string;
  label: string;
  multiline?: boolean;
  name: string;
  required?: boolean;
  type?: string;
}) {
  const id = useId();

  return (
    <div className={styles.notifyField}>
      <label htmlFor={id}>
        {label}
        {required ? <span className={styles.notifyRequired}> Required</span> : null}
      </label>
      {multiline ? <textarea id={id} name={name} rows={3} /> : <input id={id} name={name} type={type} />}
      {hint ? <p className={styles.notifyHint}>{hint}</p> : null}
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 16 16" width="16">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
    </svg>
  );
}
