"use server";

import { redirect } from "next/navigation";
import { completeCollectorIntake, parseCollectorIntake, type CollectorIntakeInput } from "@/lib/sparkle-finder/collector-intake";
import { persistCompletedCollectorIntake } from "@/lib/sparkle-finder/collector-intake-store";
import { getSparkleFinderSiteOrigin } from "@/lib/sparkle-finder/oauth-redirect";
import { getNewPasswordValidationError } from "@/lib/sparkle-finder/password-policy";
import { safeSparkleFinderNextPath } from "@/lib/sparkle-finder/safe-redirect";
import { createClient } from "@/lib/supabase/server";
import { normalizeUsStateValue } from "@/lib/us-states";

type SignupDetails = {
  displayName: string;
  intake: CollectorIntakeInput;
  password: string;
  passwordConfirmation: string;
  promotionalEmail: boolean;
  promotionalSms: boolean;
  nextPath: string;
};

export async function signUpWithPassword(formData: FormData) {
  const details = getSignupDetails(formData, "/account");
  const completedAt = new Date();
  const intakeFailure = completeCollectorIntake({
    userId: "pending",
    intake: details.intake,
    completedAt,
  });

  if (!intakeFailure.ok || !details.password) {
    redirect(getSignUpRedirect(intakeFailure.ok ? "missing_required_fields" : intakeFailure.reason === "invalid_birthday" ? "invalid_birthday" : "missing_required_fields", details.nextPath));
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
    const { data, error } = await supabase.auth.signUp({
      email: details.intake.email,
      password: details.password,
      options: {
        emailRedirectTo: getEmailRedirectTo(details.nextPath),
        data: getDisplayMetadata(details, completedAt),
      },
    });

    if (error) {
      signupFailed = true;
    } else if (data?.user?.id) {
      const completed = completeCollectorIntake({
        userId: data.user.id,
        intake: details.intake,
        completedAt,
      });

      if (completed.ok) {
        await persistCompletedCollectorIntake(
          supabase as unknown as Parameters<typeof persistCompletedCollectorIntake>[0],
          completed.record,
          completed.membership,
        );
      }
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
  const completedAt = new Date();
  const intakeFailure = completeCollectorIntake({
    userId: "pending",
    intake: details.intake,
    completedAt,
  });

  if (!intakeFailure.ok) {
    redirect(getSignUpRedirect(intakeFailure.reason === "invalid_birthday" ? "invalid_birthday" : "missing_required_fields", details.nextPath));
  }

  let magicLinkFailed = false;

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: details.intake.email,
      options: {
        emailRedirectTo: getEmailRedirectTo(details.nextPath),
        data: getDisplayMetadata(details, completedAt),
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
  const intake = parseCollectorIntake(formData);
  intake.state = normalizeUsStateValue(intake.state);

  return {
    displayName: `${intake.firstName} ${intake.lastName}`.trim(),
    intake,
    password: String(formData.get("password") ?? ""),
    passwordConfirmation: String(formData.get("passwordConfirmation") ?? ""),
    promotionalEmail: formData.get("promotionalEmail") === "yes",
    promotionalSms: formData.get("promotionalSms") === "yes",
    nextPath: safeSparkleFinderNextPath(String(formData.get("next") ?? fallbackNextPath)),
  };
}

function getDisplayMetadata(details: SignupDetails, completedAt: Date) {
  return {
    display_name: details.displayName,
    phone: details.intake.phone,
    state: details.intake.state,
    privacy_acknowledged: details.intake.privacyAccepted,
    promotional_email_opt_in: details.promotionalEmail,
    promotional_sms_opt_in: details.promotionalSms,
    collector_intake_completed_at: completedAt.toISOString(),
    collector_intake: {
      first_name: details.intake.firstName,
      last_name: details.intake.lastName,
      birthday_month: details.intake.birthdayMonth,
      birthday_day: details.intake.birthdayDay,
      favorite_stone: details.intake.favoriteStone,
      cut: details.intake.cut,
      finish: details.intake.finish,
      ring_size: details.intake.ringSize,
      jewelry_notes: details.intake.jewelryNotes,
      user_agreement_accepted: details.intake.userAgreementAccepted,
    },
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
