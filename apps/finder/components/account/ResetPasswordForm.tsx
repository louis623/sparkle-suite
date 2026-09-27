"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { PASSWORD_MIN_LENGTH, PASSWORD_REQUIREMENTS } from "@/lib/sparkle-finder/password-policy";
import { safeSparkleFinderNextPath } from "@/lib/sparkle-finder/safe-redirect";
import { createClient } from "@/lib/supabase/client";

const inputClassName =
  "min-h-11 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-white px-3 text-sm font-normal text-[var(--sparkle-ink)]";
const buttonClassName =
  "inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-[var(--sparkle-radius-sm)] px-5 text-sm font-bold transition active:translate-y-px disabled:cursor-wait disabled:opacity-70";

type ResetPasswordFormProps = {
  nextPath?: string | null;
  passwordMinLength?: number;
  passwordRequirements?: string;
};

export function ResetPasswordForm({
  nextPath = "/",
  passwordMinLength = PASSWORD_MIN_LENGTH,
  passwordRequirements = PASSWORD_REQUIREMENTS,
}: ResetPasswordFormProps) {
  const safeNextPath = safeSparkleFinderNextPath(nextPath);
  const forgotPasswordHref =
    safeNextPath === "/" ? "/auth/forgot-password" : `/auth/forgot-password?next=${encodeURIComponent(safeNextPath)}`;
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const passwordsDoNotMatch = password.length > 0 && passwordConfirmation.length > 0 && password !== passwordConfirmation;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage(null);

    if (password !== passwordConfirmation) {
      setStatusMessage("Those passwords did not match. Please enter the same password twice.");
      return;
    }

    if (password.length < passwordMinLength) {
      setStatusMessage(passwordRequirements);
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setStatusMessage("Sparkle Finder could not update that password. Your reset link may have expired.");
        setIsSubmitting(false);
        return;
      }

      window.location.assign(`/auth/post-login?next=${encodeURIComponent(safeNextPath)}`);
    } catch {
      setStatusMessage("Sparkle Finder password reset is not configured in this environment.");
      setIsSubmitting(false);
    }
  }

  return (
    <form
      aria-label="Sparkle Finder reset password form"
      className="grid gap-4 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-[var(--sparkle-paper)] p-5 shadow-[var(--sparkle-shadow-sm)]"
      onSubmit={handleSubmit}
    >
      <div className="flex items-start gap-3">
        <KeyRound aria-hidden="true" className="mt-1 size-5 text-[var(--sparkle-coral)]" />
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-[var(--sparkle-coral)]">
            Account recovery
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-playfair)] text-3xl font-semibold leading-tight text-[var(--sparkle-plum-deep)]">
            Choose a new password
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--sparkle-ink-muted)]">
            Enter your new password twice so Sparkle Finder can make sure there is no typo.
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--sparkle-ink-muted)]" id="password-requirements">
            {passwordRequirements}
          </p>
        </div>
      </div>

      <label className="grid gap-2 text-sm font-bold text-[var(--sparkle-plum-deep)]">
        New password
        <input
          aria-describedby="password-requirements"
          autoComplete="new-password"
          className={inputClassName}
          minLength={passwordMinLength}
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </label>

      <label className="grid gap-2 text-sm font-bold text-[var(--sparkle-plum-deep)]">
        Confirm password
        <input
          aria-describedby="password-requirements"
          autoComplete="new-password"
          className={inputClassName}
          minLength={passwordMinLength}
          name="passwordConfirmation"
          onChange={(event) => setPasswordConfirmation(event.target.value)}
          required
          type="password"
          value={passwordConfirmation}
        />
        {passwordsDoNotMatch ? (
          <span className="text-xs font-semibold leading-5 text-[var(--sparkle-rose)]">
            Passwords do not match yet.
          </span>
        ) : null}
      </label>

      {statusMessage ? (
        <p className="rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-white p-3 text-sm font-semibold leading-6 text-[var(--sparkle-plum-deep)]">
          {statusMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          aria-busy={isSubmitting}
          className={`${buttonClassName} bg-[var(--sparkle-plum)] text-white`}
          disabled={isSubmitting || passwordsDoNotMatch}
          type="submit"
        >
          {isSubmitting ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
          {isSubmitting ? "Saving password..." : "Save new password"}
        </button>
        <Link
          className="text-sm font-bold text-[var(--sparkle-plum-deep)] underline-offset-4 hover:underline"
          href={forgotPasswordHref}
        >
          Send a new reset link
        </Link>
      </div>
    </form>
  );
}
