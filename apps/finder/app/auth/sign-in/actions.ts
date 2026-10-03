"use server";

import { redirect } from "next/navigation";
import { getSparkleFinderMagicLinkRedirectTo } from "@/lib/sparkle-finder/oauth-redirect";
import { safeSparkleFinderNextPath } from "@/lib/sparkle-finder/safe-redirect";
import { createClient } from "@/lib/supabase/server";

export async function requestSignInMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const nextPath = safeSparkleFinderNextPath(String(formData.get("next") ?? "/"));

  if (!email) {
    redirect(getSignInErrorRedirect("missing_email", nextPath));
  }

  let magicLinkFailed = false;

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: getEmailRedirectTo(nextPath),
        shouldCreateUser: false,
      },
    });

    if (error) {
      magicLinkFailed = true;
    }
  } catch {
    magicLinkFailed = true;
  }

  if (magicLinkFailed) {
    redirect(getSignInErrorRedirect("magic_link_failed", nextPath));
  }

  redirect(getSignInMessageRedirect("check_email", nextPath));
}

function getEmailRedirectTo(nextPath: string) {
  return getSparkleFinderMagicLinkRedirectTo(nextPath);
}

function getSignInErrorRedirect(error: string, nextPath: string): string {
  const params = new URLSearchParams({ error });

  if (nextPath !== "/") {
    params.set("next", nextPath);
  }

  return `/auth/sign-in?${params.toString()}`;
}

function getSignInMessageRedirect(message: string, nextPath: string): string {
  const params = new URLSearchParams({ message });

  if (nextPath !== "/") {
    params.set("next", nextPath);
  }

  return `/auth/sign-in?${params.toString()}`;
}
