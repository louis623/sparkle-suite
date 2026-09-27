"use server";

import { redirect } from "next/navigation";
import { getSparkleFinderSiteOrigin } from "@/lib/sparkle-finder/oauth-redirect";
import { getNewPasswordValidationError } from "@/lib/sparkle-finder/password-policy";
import { safeSparkleFinderNextPath } from "@/lib/sparkle-finder/safe-redirect";
import { createClient } from "@/lib/supabase/server";
import { normalizeUsStateValue } from "@/lib/us-states";

type SignupDetails = {
  displayName: string;
  email: string;
  phone: string;
  state: string;
  password: string;
  passwordConfirmation: string;
  privacyAcknowledged: boolean;
  promotionalEmail: boolean;
  promotionalSms: boolean;
  nextPath: string;
};

export async function signUpWithPassword(formData: FormData) {
  const details = getSignupDetails(formData, "/account");

  if (!details.displayName || !details.email || !details.phone || !details.state || !details.password || !details.privacyAcknowledged) {
    redirect(getSignUpRedirect("missing_required_fields", details.nextPath));
  }

  if (details.password !== details.passwordConfirmation) {
    redirect(getSignUpRedirect("password_mismatch", details.nextPath));
  }

  const passwordError = getNewPasswordValidationError(details.password, details.passwordConfirmation);

  if (passwordError) {
    redirect(getSignUpRedirect("weak_password", details.nextPath));
  }

  let signupFailed = false;

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({
      email: details.email,
      password: details.password,
      options: {
        emailRedirectTo: getEmailRedirectTo(details.nextPath),
        data: getDisplayMetadata(details),
      },
    });

    if (error) {
      signupFailed = true;
    }
  } catch {
    signupFailed = true;
  }

  if (signupFailed) {
    redirect(getSignUpRedirect("signup_failed", details.nextPath));
  }

  redirect(getSignInRedirect("check_email", details.nextPath));
}

export async function requestMagicLink(formData: FormData) {
  const details = getSignupDetails(formData, "/silver?from=signup");

  if (!details.displayName || !details.email || !details.phone || !details.state || !details.privacyAcknowledged) {
    redirect(getSignUpRedirect("missing_required_fields", details.nextPath));
  }

  let magicLinkFailed = false;

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: details.email,
      options: {
        emailRedirectTo: getEmailRedirectTo(details.nextPath),
        data: getDisplayMetadata(details),
      },
    });

    if (error) {
      magicLinkFailed = true;
    }
  } catch {
    magicLinkFailed = true;
  }

  if (magicLinkFailed) {
    redirect(getSignUpRedirect("magic_link_failed", details.nextPath));
  }

  redirect(getSignInRedirect("check_email", details.nextPath));
}

function getSignupDetails(formData: FormData, fallbackNextPath: string): SignupDetails {
  return {
    displayName: String(formData.get("displayName") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    state: normalizeUsStateValue(String(formData.get("state") ?? "")),
    password: String(formData.get("password") ?? ""),
    passwordConfirmation: String(formData.get("passwordConfirmation") ?? ""),
    privacyAcknowledged: formData.get("privacyAcknowledged") === "yes",
    promotionalEmail: formData.get("promotionalEmail") === "yes",
    promotionalSms: formData.get("promotionalSms") === "yes",
    nextPath: safeSparkleFinderNextPath(String(formData.get("next") ?? fallbackNextPath)),
  };
}

function getDisplayMetadata(details: SignupDetails) {
  return {
    display_name: details.displayName,
    phone: details.phone,
    state: details.state,
    privacy_acknowledged: details.privacyAcknowledged,
    promotional_email_opt_in: details.promotionalEmail,
    promotional_sms_opt_in: details.promotionalSms,
  };
}

function getEmailRedirectTo(nextPath: string) {
  const origin = getSparkleFinderSiteOrigin();
  const next = encodeURIComponent(nextPath);

  return `${origin}/auth/confirm?next=${next}`;
}

function getSignUpRedirect(error: string, nextPath: string): string {
  const params = new URLSearchParams();

  if (nextPath !== "/") {
    params.set("next", nextPath);
  }

  params.set("error", error);

  return `/auth/sign-up?${params.toString()}`;
}

function getSignInRedirect(message: string, nextPath: string): string {
  const params = new URLSearchParams({ message });

  if (nextPath !== "/") {
    params.set("next", nextPath);
  }

  return `/auth/sign-in?${params.toString()}`;
}
