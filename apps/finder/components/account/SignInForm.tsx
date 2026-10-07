"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { KeyRound, Loader2, Mail } from "lucide-react";
import {
  getSparkleFinderMagicLinkRedirectTo,
  getSparkleFinderOAuthRedirectTo,
} from "@/lib/sparkle-finder/oauth-redirect";
import { safeSparkleFinderNextPath } from "@/lib/sparkle-finder/safe-redirect";
import { createClient } from "@/lib/supabase/client";

const inputClassName =
  "min-h-11 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-white px-3 text-sm font-normal text-[var(--sparkle-ink)]";
const buttonClassName =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--sparkle-radius-sm)] px-5 text-sm font-bold transition active:translate-y-px disabled:cursor-wait disabled:opacity-70";

type SignInFormProps = {
  nextPath?: string | null;
};

export function SignInForm({ nextPath = "/" }: SignInFormProps) {
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [magicLinkNotice, setMagicLinkNotice] = useState<string | null>(null);
  const [submitMode, setSubmitMode] = useState<"password" | "google" | "magic-link" | null>(null);
  const safeNextPath = safeSparkleFinderNextPath(nextPath);
  const signUpHref = safeNextPath === "/" ? "/auth/sign-up" : `/auth/sign-up?next=${encodeURIComponent(safeNextPath)}`;
  const forgotPasswordHref =
    safeNextPath === "/" ? "/auth/forgot-password" : `/auth/forgot-password?next=${encodeURIComponent(safeNextPath)}`;
  const isSubmitting = submitMode !== null;

  async function handlePasswordSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSubmitMode("password");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setErrorMessage("Sparkle Finder could not sign you in with those credentials.");
        setSubmitMode(null);
        return;
      }

      window.location.assign(`/auth/post-login?next=${encodeURIComponent(safeNextPath)}`);
    } catch {
      setErrorMessage("Sparkle Finder sign-in is not configured in this environment.");
      setSubmitMode(null);
    }
  }

  async function handleMagicLink() {
    const trimmedEmail = email.trim();
    setErrorMessage(null);
    setMagicLinkNotice(null);

    if (!trimmedEmail) {
      setErrorMessage("Enter your email and we will send a sign-in link. No password needed.");
      return;
    }

    setSubmitMode("magic-link");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          emailRedirectTo: getSparkleFinderMagicLinkRedirectTo(safeNextPath, window.location.origin),
          shouldCreateUser: false,
        },
      });

      if (error) {
        setErrorMessage("Sparkle Finder could not email a sign-in link. Check the address and try again.");
        setSubmitMode(null);
        return;
      }

      setMagicLinkNotice("Check your email for the Sparkle Finder sign-in link.");
      setSubmitMode(null);
    } catch {
      setErrorMessage("Sparkle Finder sign-in is not configured in this environment.");
      setSubmitMode(null);
    }
  }

  async function handleGoogleSignIn() {
    setErrorMessage(null);
    setSubmitMode("google");

    try {
      const supabase = createClient();
      const redirectTo = getSparkleFinderOAuthRedirectTo(safeNextPath, window.location.origin);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });

      if (error) {
        setErrorMessage("Google sign-in could not be started. Please try again.");
        setSubmitMode(null);
      }
    } catch {
      setErrorMessage("Google sign-in is not configured in this environment.");
      setSubmitMode(null);
    }
  }

  return (
    <section
      aria-label="Sparkle Finder sign-in form"
      className="grid gap-4 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-[var(--sparkle-paper)] p-5 shadow-[var(--sparkle-shadow-sm)]"
    >
      <form className="grid gap-4" id="finder-password-sign-in" onSubmit={handlePasswordSignIn}>
        <div className="flex items-start gap-3">
          <KeyRound aria-hidden="true" className="mt-1 size-5 text-[var(--sparkle-coral)]" />
          <div>
            <h2 className="text-lg font-bold text-[var(--sparkle-plum-deep)]">Sign in</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--sparkle-ink-muted)]">
              Use your email and password, continue with Google, or email yourself a magic link. The email link does not
              need a password.
            </p>
          </div>
        </div>

        <label className="grid gap-2 text-sm font-bold text-[var(--sparkle-plum-deep)]">
          Email
          <input
            autoComplete="email"
            className={inputClassName}
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            type="email"
            value={email}
          />
        </label>

        <label className="grid gap-2 text-sm font-bold text-[var(--sparkle-plum-deep)]">
          Password
          <input autoComplete="current-password" className={inputClassName} name="password" required type="password" />
        </label>

        <Link
          className="w-fit text-sm font-bold text-[var(--sparkle-plum-deep)] underline-offset-4 hover:underline"
          href={forgotPasswordHref}
        >
          Forgot password?
        </Link>

        {errorMessage ? (
          <p className="rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-white p-3 text-sm font-semibold leading-6 text-[var(--sparkle-plum-deep)]">
            {errorMessage}
          </p>
        ) : null}
        {magicLinkNotice ? (
          <p className="rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-white p-3 text-sm font-semibold leading-6 text-[var(--sparkle-plum-deep)]">
            {magicLinkNotice}
          </p>
        ) : null}
      </form>

      <div className="flex flex-wrap gap-3">
        <button
          aria-busy={submitMode === "password"}
          className={`${buttonClassName} bg-[var(--sparkle-plum)] text-white`}
          disabled={isSubmitting}
          form="finder-password-sign-in"
          type="submit"
        >
          {submitMode === "password" ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Mail aria-hidden="true" className="size-4" />}
          {submitMode === "password" ? "Signing in..." : "Sign in"}
        </button>
        <button
          aria-busy={submitMode === "google"}
          className={`${buttonClassName} border border-[var(--sparkle-border-strong)] bg-white text-[var(--sparkle-plum-deep)]`}
          disabled={isSubmitting}
          onClick={handleGoogleSignIn}
          type="button"
        >
          {submitMode === "google" ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
          {submitMode === "google" ? "Opening Google..." : "Continue with Google"}
        </button>
        <button
          aria-busy={submitMode === "magic-link"}
          className={`${buttonClassName} border border-[var(--sparkle-border-strong)] bg-white text-[var(--sparkle-plum-deep)]`}
          disabled={isSubmitting}
          onClick={handleMagicLink}
          type="button"
        >
          {submitMode === "magic-link" ? (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Mail aria-hidden="true" className="size-4" />
          )}
          {submitMode === "magic-link" ? "Sending link..." : "Email me a magic link"}
        </button>
      </div>

      <p className="text-sm leading-6 text-[var(--sparkle-ink-muted)]">
        New to Sparkle Finder?{" "}
        <Link
          className="font-bold text-[var(--sparkle-plum-deep)] underline-offset-4 hover:underline"
          href={signUpHref}
        >
          Create an account
        </Link>
      </p>
    </section>
  );
}

