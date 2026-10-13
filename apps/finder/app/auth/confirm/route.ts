import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { safeSparkleFinderNextPath } from "@/lib/sparkle-finder/safe-redirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const nextPath = safeSparkleFinderNextPath(requestUrl.searchParams.get("next"));

  if (!code && (!tokenHash || !type)) {
    return NextResponse.redirect(new URL("/auth/sign-in?error=confirmation_failed", requestUrl.origin));
  }

  try {
    const supabase = await createClient();
    const { error } = tokenHash && type
      ? await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type,
        })
      : await supabase.auth.exchangeCodeForSession(code ?? "");

    if (error) {
      return NextResponse.redirect(new URL("/auth/sign-in?error=confirmation_failed", requestUrl.origin));
    }
  } catch {
    return NextResponse.redirect(new URL("/auth/sign-in?error=confirmation_failed", requestUrl.origin));
  }

  if (type === "recovery") {
    const resetPasswordUrl = new URL("/auth/reset-password", requestUrl.origin);
    resetPasswordUrl.searchParams.set("next", nextPath);

    return NextResponse.redirect(resetPasswordUrl);
  }

  const postLoginUrl = new URL("/auth/post-login", requestUrl.origin);
  postLoginUrl.searchParams.set("next", nextPath);

  return NextResponse.redirect(postLoginUrl);
}
