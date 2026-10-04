"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Gem, KeyRound, Loader2, Mail, ShieldCheck } from "lucide-react";
import { requestMagicLink, signUpWithPassword } from "@/app/auth/sign-up/actions";
import { finderIntakeFinePrint } from "@/lib/sparkle-finder/collector-intake";
import { getSparkleFinderOAuthRedirectTo } from "@/lib/sparkle-finder/oauth-redirect";
import { PASSWORD_MIN_LENGTH, PASSWORD_REQUIREMENTS } from "@/lib/sparkle-finder/password-policy";
import { safeSparkleFinderNextPath } from "@/lib/sparkle-finder/safe-redirect";
import { createClient } from "@/lib/supabase/client";
import { usStates } from "@/lib/us-states";

const inputClassName =
  "min-h-11 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-white px-3 text-sm font-normal text-[var(--sparkle-ink)]";
const buttonClassName =
  "inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-[var(--sparkle-radius-sm)] px-5 text-sm font-bold transition active:translate-y-px disabled:cursor-wait disabled:opacity-70";

type SignupFormProps = {
  nextPath?: string | null;
  notice?: string | null;
  passwordMinLength?: number;
  passwordRequirements?: string;
};

export function SignupForm({
  nextPath = "/",
  notice = null,
  passwordMinLength = PASSWORD_MIN_LENGTH,
  passwordRequirements = PASSWORD_REQUIREMENTS,
}: SignupFormProps) {
  const [authMethod, setAuthMethod] = useState<"password" | "magic-link">("password");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [isGoogleStarting, setIsGoogleStarting] = useState(false);
  const safeNextPath = safeSparkleFinderNextPath(nextPath);
  const passwordsDoNotMatch =
    authMethod === "password" && password.length > 0 && passwordConfirmation.length > 0 && password !== passwordConfirmation;

  async function handleGoogleSignup() {
    setGoogleError(null);
    setIsGoogleStarting(true);

    try {
      const supabase = createClient();
      const redirectTo = getSparkleFinderOAuthRedirectTo(safeNextPath, window.location.origin);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });

      if (error) {
        setGoogleError("Google sign-up could not be started. Please try again.");
        setIsGoogleStarting(false);
      }
    } catch {
      setGoogleError("Google sign-up is not configured in this environment.");
      setIsGoogleStarting(false);
    }
  }

  return (
    <form
      action={signUpWithPassword}
      aria-label="Sparkle Finder signup form"
      className="grid gap-4 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-[var(--sparkle-paper)] p-5 shadow-[var(--sparkle-shadow-sm)]"
    >
      <div className="flex items-start gap-3">
        <Gem aria-hidden="true" className="mt-1 size-5 text-[var(--sparkle-coral)]" />
        <div>
          <h2 className="text-lg font-bold text-[var(--sparkle-plum-deep)]">Create your Silver trial</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--sparkle-ink-muted)]">
            Your 30-day Silver trial starts when you finish this form. No card. On day 30, Silver becomes Free unless you pay $6 a month.
          </p>
        </div>
      </div>

      <input name="next" type="hidden" value={safeNextPath} />

      <div className="grid gap-2 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-white p-3">
        <button
          aria-busy={isGoogleStarting}
          className={`${buttonClassName} border border-[var(--sparkle-border-strong)] bg-white text-[var(--sparkle-plum-deep)]`}
          disabled={isGoogleStarting}
          onClick={handleGoogleSignup}
          type="button"
        >
          {isGoogleStarting ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
          {isGoogleStarting ? "Opening Google..." : "Continue with Google"}
        </button>
        <p className="text-sm leading-6 text-[var(--sparkle-ink-muted)]">
          Google sign-up does not start Silver. Finish this form to start the 30-day trial.
        </p>
        {googleError ? <p className="text-sm font-semibold text-[var(--sparkle-plum-deep)]">{googleError}</p> : null}
      </div>

      {notice ? (
        <p className="rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-white p-3 text-sm font-semibold leading-6 text-[var(--sparkle-plum-deep)]">
          {notice}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold text-[var(--sparkle-plum-deep)]">
          First name
          <input autoComplete="given-name" className={inputClassName} maxLength={80} name="firstName" required />
        </label>
        <label className="grid gap-2 text-sm font-bold text-[var(--sparkle-plum-deep)]">
          Last name
          <input autoComplete="family-name" className={inputClassName} maxLength={80} name="lastName" required />
        </label>
      </div>

      <label className="grid gap-2 text-sm font-bold text-[var(--sparkle-plum-deep)]">
        Email
        <input
          autoComplete="email"
          className={inputClassName}
          name="email"
          placeholder="you@example.com"
          required
          type="email"
        />
      </label>

      <label className="grid gap-2 text-sm font-bold text-[var(--sparkle-plum-deep)]">
        Phone
        <input
          autoComplete="tel"
          className={inputClassName}
          name="phone"
          placeholder="555-123-4567"
          required
          type="tel"
        />
        <span className="text-xs font-semibold leading-5 text-[var(--sparkle-ink-muted)]">
          Used for account verification, recovery, and trial protection. Not sold. Marketing texts are optional.
        </span>
      </label>

      <label className="grid gap-2 text-sm font-bold text-[var(--sparkle-plum-deep)]">
        State
        <select autoComplete="address-level1" className={inputClassName} name="state" required defaultValue="">
          <option value="" disabled>
            Select your state
          </option>
          {usStates.map((state) => (
            <option key={state.value} value={state.value}>
              {state.label}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="grid gap-3 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] p-3">
        <legend className="px-1 text-sm font-bold text-[var(--sparkle-plum-deep)]">Birthday</legend>
        <p className="text-xs font-semibold leading-5 text-[var(--sparkle-ink-muted)]">Month and day only. No year.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold text-[var(--sparkle-plum-deep)]">
            Month
            <select className={inputClassName} defaultValue="" name="birthdayMonth" required>
              <option value="" disabled>
                Month
              </option>
              {birthdayMonths.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-[var(--sparkle-plum-deep)]">
            Day
            <select className={inputClassName} defaultValue="" name="birthdayDay" required>
              <option value="" disabled>
                Day
              </option>
              {birthdayDays.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      <label className="grid gap-2 text-sm font-bold text-[var(--sparkle-plum-deep)]">
        Favorite stone
        <input className={inputClassName} maxLength={80} name="favoriteStone" required />
      </label>
      <label className="grid gap-2 text-sm font-bold text-[var(--sparkle-plum-deep)]">
        Cut
        <input className={inputClassName} maxLength={80} name="cut" required />
      </label>
      <label className="grid gap-2 text-sm font-bold text-[var(--sparkle-plum-deep)]">
        Finish
        <input className={inputClassName} maxLength={80} name="finish" required />
      </label>
      <label className="grid gap-2 text-sm font-bold text-[var(--sparkle-plum-deep)]">
        Ring size
        <input className={inputClassName} maxLength={20} name="ringSize" required />
      </label>
      <label className="grid gap-2 text-sm font-bold text-[var(--sparkle-plum-deep)]">
        Other jewelry notes
        <textarea className={inputClassName} maxLength={500} name="jewelryNotes" rows={3} />
      </label>

      <fieldset className="grid gap-3 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] p-3">
        <legend className="px-1 text-sm font-bold text-[var(--sparkle-plum-deep)]">Sign-up method</legend>
        <label className="flex items-start gap-3 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-white p-3 text-sm leading-6 text-[var(--sparkle-ink-muted)]">
          <input
            checked={authMethod === "password"}
            className="mt-1"
            name="authMethod"
            onChange={() => setAuthMethod("password")}
            type="radio"
            value="password"
          />
          <span>
            <span className="block font-bold text-[var(--sparkle-plum-deep)]">Use a password</span>
            Create a password and confirm your email.
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-white p-3 text-sm leading-6 text-[var(--sparkle-ink-muted)]">
          <input
            checked={authMethod === "magic-link"}
            className="mt-1"
            name="authMethod"
            onChange={() => setAuthMethod("magic-link")}
            type="radio"
            value="magic-link"
          />
          <span>
            <span className="block font-bold text-[var(--sparkle-plum-deep)]">Email me a magic sign-in link</span>
            Use an email link instead of setting a password today.
          </span>
        </label>
      </fieldset>

      <label className="grid gap-2 text-sm font-bold text-[var(--sparkle-plum-deep)]">
        Password
        <input
          aria-describedby="signup-password-requirements"
          autoComplete="new-password"
          className={inputClassName}
          disabled={authMethod === "magic-link"}
          minLength={passwordMinLength}
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          required={authMethod === "password"}
          type="password"
          value={password}
        />
        <span className="text-xs font-semibold leading-5 text-[var(--sparkle-ink-muted)]" id="signup-password-requirements">
          {passwordRequirements}
        </span>
      </label>

      <label className="grid gap-2 text-sm font-bold text-[var(--sparkle-plum-deep)]">
        Confirm password
        <input
          aria-describedby="signup-password-requirements"
          autoComplete="new-password"
          className={inputClassName}
          disabled={authMethod === "magic-link"}
          minLength={passwordMinLength}
          name="passwordConfirmation"
          onChange={(event) => setPasswordConfirmation(event.target.value)}
          required={authMethod === "password"}
          type="password"
          value={passwordConfirmation}
        />
        {passwordsDoNotMatch ? (
          <span className="text-xs font-semibold leading-5 text-[var(--sparkle-rose)]">
            Passwords do not match yet.
          </span>
        ) : null}
      </label>

      <fieldset className="grid gap-3 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] p-3">
        <legend className="px-1 text-sm font-bold text-[var(--sparkle-plum-deep)]">Privacy and updates</legend>
        <label className="flex items-start gap-3 text-sm leading-6 text-[var(--sparkle-ink-muted)]">
          <input className="mt-1" name="userAgreement" required type="checkbox" value="yes" />
          <span>I agree to the Sparkle Finder user agreement.</span>
        </label>
        <label className="flex items-start gap-3 text-sm leading-6 text-[var(--sparkle-ink-muted)]">
          <input className="mt-1" name="privacyAcknowledged" required type="checkbox" value="yes" />
          <span>
            I acknowledge the{" "}
            <a className="font-bold text-[var(--sparkle-rose)] underline-offset-4 hover:underline" href="/privacy-policy">
              Sparkle Finder privacy terms
            </a>{" "}
            and understand Nic-Nac AI assistance and memory may use my account, collection, Showcase, Wishlist,
            request, linked-rep, conversation, and saved memory details to provide Finder and Silver support.
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm leading-6 text-[var(--sparkle-ink-muted)]">
          <input className="mt-1" name="promotionalEmail" type="checkbox" value="yes" />
          <span>Email me optional Sparkle Finder updates and Silver tips.</span>
        </label>
        <label className="flex items-start gap-3 text-sm leading-6 text-[var(--sparkle-ink-muted)]">
          <input className="mt-1" name="promotionalSms" type="checkbox" value="yes" />
          <span>Text me optional promotional messages. Consent is optional.</span>
        </label>
        <p className="text-xs font-semibold leading-5 text-[var(--sparkle-ink-muted)]">{finderIntakeFinePrint}</p>
      </fieldset>

      <SignupSubmitButton authMethod={authMethod} passwordsDoNotMatch={passwordsDoNotMatch} />

      <p className="flex items-start gap-2 text-xs font-semibold leading-5 text-[var(--sparkle-ink-muted)]">
        <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[var(--sparkle-coral)]" />
        Password signup sends a confirmation email. Magic-link signup sends an email sign-in link.
      </p>
    </form>
  );
}

const birthdayMonths = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const birthdayDays = Array.from({ length: 31 }, (_, index) => String(index + 1));

function SignupSubmitButton({
  authMethod,
  passwordsDoNotMatch,
}: {
  authMethod: "password" | "magic-link";
  passwordsDoNotMatch: boolean;
}) {
  const { pending } = useFormStatus();

  if (authMethod === "magic-link") {
    return (
      <button
        aria-busy={pending}
        className={`${buttonClassName} bg-[var(--sparkle-plum)] text-white`}
        disabled={pending}
        formAction={requestMagicLink}
        type="submit"
      >
        {pending ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Mail aria-hidden="true" className="size-4" />}
        {pending ? "Sending link..." : "Email sign-in link"}
      </button>
    );
  }

  return (
    <button
      aria-busy={pending}
      className={`${buttonClassName} bg-[var(--sparkle-plum)] text-white`}
      disabled={pending || passwordsDoNotMatch}
      type="submit"
    >
      {pending ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <KeyRound aria-hidden="true" className="size-4" />}
      {pending ? "Creating account..." : "Create account"}
    </button>
  );
}
