import { NextRequest } from "next/server";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as authModule from "../../lib/sparkle-finder/auth";
import type { CurrentSparkleFinderAccountState } from "../../lib/sparkle-finder/account-service";

const auth = authModule as typeof authModule & {
  isLocalPreviewAuthEnabled?: () => boolean;
};

describe("Sparkle Finder auth boundary", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("represents unconfigured Supabase auth as anonymous with no credentials", () => {
    const boundary = auth.createNoCredentialSupabaseAuthBoundary();
    const accountState = boundary.getAccountState();

    expect(boundary).toMatchObject({
      adapter: "supabase",
      isConfigured: false,
    });
    expect(accountState).toMatchObject({
      status: "anonymous",
      tier: "anonymous",
      email: null,
      customer: null,
    });
  });

  it("disables local preview auth in production unless the preview flag is enabled", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SPARKLE_FINDER_ENABLE_PREVIEW_AUTH", "");

    expect(auth.isLocalPreviewAuthEnabled?.()).toBe(false);

    vi.stubEnv("SPARKLE_FINDER_ENABLE_PREVIEW_AUTH", "true");

    expect(auth.isLocalPreviewAuthEnabled?.()).toBe(true);
  });

  it("enables local preview auth outside production", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("SPARKLE_FINDER_ENABLE_PREVIEW_AUTH", "");

    expect(auth.isLocalPreviewAuthEnabled?.()).toBe(true);
  });
});

describe("Sparkle Finder Supabase proxy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.doUnmock("../../lib/supabase/server");
    vi.doUnmock("../../lib/sparkle-finder/account-service");
  });

  it("returns a Next response without throwing when Supabase is unconfigured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");

    const { updateSession } = await import("../../lib/supabase/proxy");
    const response = await updateSession(new NextRequest("http://localhost:3000/dashboard"));

    expect(response.status).toBe(200);
  });

  it("treats the old shared Supabase project as unconfigured for Sparkle Finder auth", async () => {
    const { getSparkleFinderSupabaseConfig, isSupabaseConfigured } = await import("../../lib/supabase/config");
    const env = {
      NEXT_PUBLIC_SUPABASE_URL: "https://bqhzfkgkjyuhlsozpylf.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
    };

    expect(getSparkleFinderSupabaseConfig(env)).toBeNull();
    expect(isSupabaseConfigured(env)).toBe(false);
  });

  it("allows a dedicated Supabase project for Sparkle Finder auth", async () => {
    const { getSparkleFinderSupabaseConfig, isSupabaseConfigured } = await import("../../lib/supabase/config");
    const env = {
      NEXT_PUBLIC_SUPABASE_URL: "https://sparklefinderauth123.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
    };

    expect(getSparkleFinderSupabaseConfig(env)).toEqual({
      url: "https://sparklefinderauth123.supabase.co",
      publishableKey: "publishable-key",
    });
    expect(isSupabaseConfigured(env)).toBe(true);
  });

  it("reads browser Supabase config from direct NEXT_PUBLIC env references", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://sparklefinderauth123.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
    vi.resetModules();

    const { isSupabaseConfigured } = await import("../../lib/supabase/client");

    expect(isSupabaseConfigured()).toBe(true);
  });

  it("rejects the old shared Supabase project from browser Supabase config", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://bqhzfkgkjyuhlsozpylf.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
    vi.resetModules();

    const { isSupabaseConfigured } = await import("../../lib/supabase/client");

    expect(isSupabaseConfigured()).toBe(false);
  });

  it("redirects successful email confirmations to a safe local next path", async () => {
    const verifyOtp = vi.fn().mockResolvedValue({ error: null });

    vi.doMock("../../lib/supabase/server", () => ({
      createClient: async () => ({
        auth: {
          verifyOtp,
        },
      }),
    }));

    const { GET } = await import("../../app/auth/confirm/route");
    const response = await GET(
      new Request("http://localhost:4310/auth/confirm?token_hash=abc123&type=email&next=/silver"),
    );

    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: "abc123", type: "email" });
    expect(response.headers.get("location")).toBe(
      "http://localhost:4310/auth/post-login?next=%2Fsilver",
    );
  });

  it("ignores external confirmation next URLs", async () => {
    vi.doMock("../../lib/supabase/server", () => ({
      createClient: async () => ({
        auth: {
          verifyOtp: vi.fn().mockResolvedValue({ error: null }),
        },
      }),
    }));

    const { GET } = await import("../../app/auth/confirm/route");
    const response = await GET(
      new Request("http://localhost:4310/auth/confirm?token_hash=abc123&type=email&next=https://evil.example"),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:4310/auth/post-login?next=%2F",
    );
  });

  it.each([
    ["/\\evil.example"],
    ["/%5Cevil.example"],
    ["//evil.example"],
    ["/%2Fevil.example"],
    ["https://evil.example"],
    ["javascript:alert(1)"],
    ["silver"],
  ])("ignores unsafe confirmation next path %s", async (next) => {
    vi.doMock("../../lib/supabase/server", () => ({
      createClient: async () => ({
        auth: {
          verifyOtp: vi.fn().mockResolvedValue({ error: null }),
        },
      }),
    }));

    const { GET } = await import("../../app/auth/confirm/route");
    const response = await GET(
      new Request(
        `http://localhost:4310/auth/confirm?token_hash=abc123&type=email&next=${encodeURIComponent(next)}`,
      ),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:4310/auth/post-login?next=%2F",
    );
  });

  it("preserves safe confirmation next paths with query strings", async () => {
    vi.doMock("../../lib/supabase/server", () => ({
      createClient: async () => ({
        auth: {
          verifyOtp: vi.fn().mockResolvedValue({ error: null }),
        },
      }),
    }));

    const { GET } = await import("../../app/auth/confirm/route");
    const response = await GET(
      new Request(
        `http://localhost:4310/auth/confirm?token_hash=abc123&type=email&next=${encodeURIComponent(
          "/silver?from=signup",
        )}`,
      ),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:4310/auth/post-login?next=%2Fsilver%3Ffrom%3Dsignup",
    );
  });

  it("routes password recovery confirmations to the reset-password form", async () => {
    const verifyOtp = vi.fn().mockResolvedValue({ error: null });

    vi.doMock("../../lib/supabase/server", () => ({
      createClient: async () => ({
        auth: {
          verifyOtp,
        },
      }),
    }));

    const { GET } = await import("../../app/auth/confirm/route");
    const response = await GET(
      new Request("http://localhost:4310/auth/confirm?token_hash=recover123&type=recovery&next=/silver"),
    );

    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: "recover123", type: "recovery" });
    expect(response.headers.get("location")).toBe(
      "http://localhost:4310/auth/reset-password?next=%2Fsilver",
    );
  });

  it("exchanges a PKCE magic-link code and continues to post-login", async () => {
    const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
    const verifyOtp = vi.fn();

    vi.doMock("../../lib/supabase/server", () => ({
      createClient: async () => ({
        auth: {
          exchangeCodeForSession,
          verifyOtp,
        },
      }),
    }));

    const { GET } = await import("../../app/auth/confirm/route");
    const response = await GET(
      new Request("http://localhost:4310/auth/confirm?code=magic-code&next=/library"),
    );

    expect(exchangeCodeForSession).toHaveBeenCalledWith("magic-code");
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "http://localhost:4310/auth/post-login?next=%2Flibrary",
    );
  });

  it("sends a PKCE recovery code to the reset-password form", async () => {
    const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });

    vi.doMock("../../lib/supabase/server", () => ({
      createClient: async () => ({
        auth: {
          exchangeCodeForSession,
        },
      }),
    }));

    const { GET } = await import("../../app/auth/confirm/route");
    const response = await GET(
      new Request("http://localhost:4310/auth/confirm?code=recovery-code&type=recovery&next=/account"),
    );

    expect(exchangeCodeForSession).toHaveBeenCalledWith("recovery-code");
    expect(response.headers.get("location")).toBe(
      "http://localhost:4310/auth/reset-password?next=%2Faccount",
    );
  });

  it("prefers token_hash confirmation when both a code and token hash are present", async () => {
    const verifyOtp = vi.fn().mockResolvedValue({ error: null });
    const exchangeCodeForSession = vi.fn();

    vi.doMock("../../lib/supabase/server", () => ({
      createClient: async () => ({
        auth: {
          exchangeCodeForSession,
          verifyOtp,
        },
      }),
    }));

    const { GET } = await import("../../app/auth/confirm/route");
    const response = await GET(
      new Request("http://localhost:4310/auth/confirm?code=ignored&token_hash=abc123&type=email&next=/"),
    );

    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: "abc123", type: "email" });
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("http://localhost:4310/auth/post-login?next=%2F");
  });

  it("redirects failed confirmations to sign-in with a safe error", async () => {
    vi.doMock("../../lib/supabase/server", () => ({
      createClient: async () => ({
        auth: {
          verifyOtp: vi.fn().mockResolvedValue({ error: new Error("bad token") }),
        },
      }),
    }));

    const { GET } = await import("../../app/auth/confirm/route");
    const response = await GET(new Request("http://localhost:4310/auth/confirm?token_hash=bad&type=email"));

    expect(response.headers.get("location")).toBe("http://localhost:4310/auth/sign-in?error=confirmation_failed");
  });

  it("signs out to the public homepage and clears local preview auth", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");

    const { GET } = await import("../../app/auth/sign-out/route");
    const response = await GET(new Request("http://localhost:4310/auth/sign-out"));

    expect(response.headers.get("location")).toBe("http://localhost:4310/");
    expect(response.headers.get("set-cookie")).toContain(`${auth.sparkleFinderAuthCookieName}=anonymous`);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it.each([
    [null],
    ["//evil.example"],
    ["/%2Fevil.example"],
    ["/\\evil.example"],
    ["/%5Cevil.example"],
    ["https://evil.example"],
    ["javascript:alert(1)"],
    ["silver"],
  ])("normalizes unsafe next path %s to the customer homepage", async (next) => {
    const { safeSparkleFinderNextPath } = await import("../../lib/sparkle-finder/safe-redirect");

    expect(safeSparkleFinderNextPath(next)).toBe("/");
  });

  it("preserves safe local next paths", async () => {
    const { safeSparkleFinderNextPath } = await import("../../lib/sparkle-finder/safe-redirect");

    expect(safeSparkleFinderNextPath("/account?setup=required")).toBe("/account?setup=required");
  });

  it("builds Google OAuth redirects from the configured Sparkle Finder site URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://yoursparklefinder.com/");

    const { getSparkleFinderOAuthRedirectTo } = await import("../../lib/sparkle-finder/oauth-redirect");

    expect(getSparkleFinderOAuthRedirectTo("/account?setup=required", "https://sparkle-finder-dev.vercel.app")).toBe(
      "https://yoursparklefinder.com/api/auth/callback?next=%2Faccount%3Fsetup%3Drequired",
    );
  });

  it.each([
    ["Neon Rabbit HQ", "https://neon-rabbit-hq.vercel.app"],
    ["Sparkle Suite", "https://www.yoursparklesuite.com"],
  ])("refuses to build Google OAuth redirects from the %s host", async (_label, siteUrl) => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", siteUrl);

    const { getSparkleFinderOAuthRedirectTo } = await import("../../lib/sparkle-finder/oauth-redirect");

    expect(getSparkleFinderOAuthRedirectTo("/account?setup=required", "https://sparkle-finder-dev.vercel.app")).toBe(
      "https://sparkle-finder-dev.vercel.app/api/auth/callback?next=%2Faccount%3Fsetup%3Drequired",
    );
  });

  it("falls back to local Google OAuth redirects when both configured and browser origins are not Sparkle Finder", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://neon-rabbit-hq.vercel.app");

    const { getSparkleFinderOAuthRedirectTo } = await import("../../lib/sparkle-finder/oauth-redirect");

    expect(getSparkleFinderOAuthRedirectTo("/account?setup=required", "https://www.yoursparklesuite.com")).toBe(
      "http://localhost:3000/api/auth/callback?next=%2Faccount%3Fsetup%3Drequired",
    );
  });

  it("falls back to the current browser origin for local Google OAuth previews", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");

    const { getSparkleFinderOAuthRedirectTo } = await import("../../lib/sparkle-finder/oauth-redirect");

    expect(getSparkleFinderOAuthRedirectTo("/account?setup=required", "http://127.0.0.1:4310")).toBe(
      "http://127.0.0.1:4310/api/auth/callback?next=%2Faccount%3Fsetup%3Drequired",
    );
  });

  it("redirects missing Google OAuth codes to sign-in with a safe error", async () => {
    const { GET } = await import("../../app/api/auth/callback/route");
    const response = await GET(new Request("http://localhost:4310/api/auth/callback?next=/account"));

    expect(response.headers.get("location")).toBe("http://localhost:4310/auth/sign-in?error=missing_oauth_code");
  });

  it("exchanges Google OAuth codes and redirects to a safe next path", async () => {
    const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });

    vi.doMock("../../lib/supabase/server", () => ({
      createClient: async () => ({
        auth: {
          exchangeCodeForSession,
        },
      }),
    }));

    const { GET } = await import("../../app/api/auth/callback/route");
    const response = await GET(
      new Request(
        `http://localhost:4310/api/auth/callback?code=oauth-code&next=${encodeURIComponent(
          "/account?setup=required",
        )}`,
      ),
    );

    expect(exchangeCodeForSession).toHaveBeenCalledWith("oauth-code");
    expect(response.headers.get("location")).toBe(
      "http://localhost:4310/auth/post-login?next=%2Faccount%3Fsetup%3Drequired",
    );
  });

  it("falls back to the customer homepage when Google OAuth next is unsafe", async () => {
    vi.doMock("../../lib/supabase/server", () => ({
      createClient: async () => ({
        auth: {
          exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        },
      }),
    }));

    const { GET } = await import("../../app/api/auth/callback/route");
    const response = await GET(
      new Request(
        `http://localhost:4310/api/auth/callback?code=oauth-code&next=${encodeURIComponent(
          "https://evil.example",
        )}`,
      ),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:4310/auth/post-login?next=%2F",
    );
  });

  it("redirects failed Google OAuth exchanges to sign-in with a safe error", async () => {
    vi.doMock("../../lib/supabase/server", () => ({
      createClient: async () => ({
        auth: {
          exchangeCodeForSession: vi.fn().mockResolvedValue({ error: new Error("bad code") }),
        },
      }),
    }));

    const { GET } = await import("../../app/api/auth/callback/route");
    const response = await GET(new Request("http://localhost:4310/api/auth/callback?code=bad-code&next=/account"));

    expect(response.headers.get("location")).toBe("http://localhost:4310/auth/sign-in?error=oauth_exchange_failed");
  });

  it("routes expired trial users to the account billing prompt after login", async () => {
    vi.doMock("../../lib/sparkle-finder/account-service", () => ({
      getCurrentSparkleFinderAccount: vi.fn().mockResolvedValue(expiredTrialMappedToFreeAccountState()),
    }));

    const { GET } = await import("../../app/auth/post-login/route");
    const response = await GET(new Request("http://localhost:4310/auth/post-login?next=/silver"));

    expect(response.headers.get("location")).toBe(
      "http://localhost:4310/account?message=silver_trial_ended",
    );
  });

  it("routes active trial users to the requested safe path after login", async () => {
    vi.doMock("../../lib/sparkle-finder/account-service", () => ({
      getCurrentSparkleFinderAccount: vi.fn().mockResolvedValue(activeTrialAccountState()),
    }));

    const { GET } = await import("../../app/auth/post-login/route");
    const response = await GET(new Request("http://localhost:4310/auth/post-login?next=/silver"));

    expect(response.headers.get("location")).toBe("http://localhost:4310/silver");
  });

  it("routes paid Silver users to the requested safe path after login", async () => {
    vi.doMock("../../lib/sparkle-finder/account-service", () => ({
      getCurrentSparkleFinderAccount: vi.fn().mockResolvedValue(paidSilverAccountState()),
    }));

    const { GET } = await import("../../app/auth/post-login/route");
    const response = await GET(new Request("http://localhost:4310/auth/post-login?next=/dashboard"));

    expect(response.headers.get("location")).toBe("http://localhost:4310/dashboard");
  });

  it("sends a finished sign-in to the collection home instead of another sign-in page", async () => {
    vi.doMock("../../lib/sparkle-finder/account-service", () => ({
      getCurrentSparkleFinderAccount: vi.fn().mockResolvedValue(activeTrialAccountState()),
    }));

    const { GET } = await import("../../app/auth/post-login/route");
    const response = await GET(new Request("http://localhost:4310/auth/post-login?next=/auth/sign-in"));

    expect(response.headers.get("location")).toBe("http://localhost:4310/");
  });

  it("routes anonymous post-login requests back to sign-in", async () => {
    vi.doMock("../../lib/sparkle-finder/account-service", () => ({
      getCurrentSparkleFinderAccount: vi.fn().mockResolvedValue(anonymousAccountState()),
    }));

    const { GET } = await import("../../app/auth/post-login/route");
    const response = await GET(new Request("http://localhost:4310/auth/post-login?next=/silver"));

    expect(response.headers.get("location")).toBe("http://localhost:4310/auth/sign-in?next=%2Fsilver");
  });
});

describe("Sparkle Finder signup server actions", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("next/navigation");
    vi.doUnmock("../../lib/supabase/server");
    vi.doUnmock("../../lib/supabase/service-role");
    vi.doUnmock("../../lib/sparkle-finder/rep-claim");
  });

  it("sends password signup confirmations through the Sparkle Finder confirm route", async () => {
    const signUp = vi.fn().mockResolvedValue({ error: null });
    const redirect = vi.fn((path: string) => {
      throw new Error(`redirect:${path}`);
    });

    vi.doMock("next/navigation", () => ({ redirect }));
    vi.doMock("../../lib/supabase/server", () => ({
      createClient: async () => ({
        auth: {
          signUp,
        },
      }),
    }));

    const formData = new FormData();
    formData.set("displayName", "Sparkle Mama");
    formData.set("email", "mama@example.com");
    formData.set("phone", "555-123-4567");
    formData.set("state", "CA");
    formData.set("password", "sparkle-password");
    formData.set("passwordConfirmation", "sparkle-password");
    formData.set("privacyAcknowledged", "yes");

    const { signUpWithPassword } = await import("../../app/auth/sign-up/actions");

    await expect(signUpWithPassword(formData)).rejects.toThrow("redirect:/auth/sign-in?message=check_email");
    expect(signUp).toHaveBeenCalledWith({
      email: "mama@example.com",
      password: "sparkle-password",
      options: {
        emailRedirectTo: "http://localhost:3000/auth/confirm?next=%2Faccount",
        data: {
          display_name: "Sparkle Mama",
          phone: "555-123-4567",
          state: "CA",
          privacy_acknowledged: true,
          promotional_email_opt_in: false,
          promotional_sms_opt_in: false,
        },
      },
    });
  });

  it("does not send password signup confirmations through the Neon Rabbit HQ host", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://neon-rabbit-hq.vercel.app");

    const signUp = vi.fn().mockResolvedValue({ error: null });
    const redirect = vi.fn((path: string) => {
      throw new Error(`redirect:${path}`);
    });

    vi.doMock("next/navigation", () => ({ redirect }));
    vi.doMock("../../lib/supabase/server", () => ({
      createClient: async () => ({
        auth: {
          signUp,
        },
      }),
    }));

    const formData = new FormData();
    formData.set("displayName", "Sparkle Mama");
    formData.set("email", "mama@example.com");
    formData.set("phone", "555-123-4567");
    formData.set("state", "CA");
    formData.set("password", "sparkle-password");
    formData.set("passwordConfirmation", "sparkle-password");
    formData.set("privacyAcknowledged", "yes");

    const { signUpWithPassword } = await import("../../app/auth/sign-up/actions");

    await expect(signUpWithPassword(formData)).rejects.toThrow("redirect:/auth/sign-in?message=check_email");
    expect(signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          emailRedirectTo: "http://localhost:3000/auth/confirm?next=%2Faccount",
        }),
      }),
    );
  });

  it("requests an email magic link without requiring a password", async () => {
    const signInWithOtp = vi.fn().mockResolvedValue({ error: null });
    const redirect = vi.fn((path: string) => {
      throw new Error(`redirect:${path}`);
    });

    vi.doMock("next/navigation", () => ({ redirect }));
    vi.doMock("../../lib/supabase/server", () => ({
      createClient: async () => ({
        auth: {
          signInWithOtp,
        },
      }),
    }));

    const formData = new FormData();
    formData.set("displayName", "Sparkle Mama");
    formData.set("email", "mama@example.com");
    formData.set("phone", "555-123-4567");
    formData.set("state", "CA");
    formData.set("privacyAcknowledged", "yes");

    const { requestMagicLink } = await import("../../app/auth/sign-up/actions");

    await expect(requestMagicLink(formData)).rejects.toThrow("redirect:/auth/sign-in?message=check_email");
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "mama@example.com",
      options: {
        emailRedirectTo: "http://localhost:3000/auth/confirm?next=%2Fsilver%3Ffrom%3Dsignup",
        data: {
          display_name: "Sparkle Mama",
          phone: "555-123-4567",
          state: "CA",
          privacy_acknowledged: true,
          promotional_email_opt_in: false,
          promotional_sms_opt_in: false,
        },
      },
    });
  });

  it("preserves the requested next path through password signup email confirmation", async () => {
    const signUp = vi.fn().mockResolvedValue({ error: null });
    const redirect = vi.fn((path: string) => {
      throw new Error(`redirect:${path}`);
    });

    vi.doMock("next/navigation", () => ({ redirect }));
    vi.doMock("../../lib/supabase/server", () => ({
      createClient: async () => ({
        auth: {
          signUp,
        },
      }),
    }));

    const formData = new FormData();
    formData.set("displayName", "Sparkle Mama");
    formData.set("email", "mama@example.com");
    formData.set("phone", "555-123-4567");
    formData.set("state", "CA");
    formData.set("password", "sparkle-password");
    formData.set("passwordConfirmation", "sparkle-password");
    formData.set("privacyAcknowledged", "yes");
    formData.set("next", "/silver");

    const { signUpWithPassword } = await import("../../app/auth/sign-up/actions");

    await expect(signUpWithPassword(formData)).rejects.toThrow(
      "redirect:/auth/sign-in?message=check_email&next=%2Fsilver",
    );
    expect(signUp.mock.calls[0][0].options.emailRedirectTo).toBe(
      "http://localhost:3000/auth/confirm?next=%2Fsilver",
    );
  });

  it("preserves next when password signup fails", async () => {
    const signUp = vi.fn().mockResolvedValue({ error: new Error("duplicate") });
    const redirect = vi.fn((path: string) => {
      throw new Error(`redirect:${path}`);
    });

    vi.doMock("next/navigation", () => ({ redirect }));
    vi.doMock("../../lib/supabase/server", () => ({
      createClient: async () => ({
        auth: {
          signUp,
        },
      }),
    }));

    const formData = new FormData();
    formData.set("displayName", "Sparkle Mama");
    formData.set("email", "mama@example.com");
    formData.set("phone", "555-123-4567");
    formData.set("state", "CA");
    formData.set("password", "sparkle-password");
    formData.set("passwordConfirmation", "sparkle-password");
    formData.set("privacyAcknowledged", "yes");
    formData.set("next", "/silver");

    const { signUpWithPassword } = await import("../../app/auth/sign-up/actions");

    await expect(signUpWithPassword(formData)).rejects.toThrow(
      "redirect:/auth/sign-up?next=%2Fsilver&error=signup_failed",
    );
  });

  it("stops password signup before Supabase when the password confirmation does not match", async () => {
    const signUp = vi.fn().mockResolvedValue({ error: null });
    const redirect = vi.fn((path: string) => {
      throw new Error(`redirect:${path}`);
    });

    vi.doMock("next/navigation", () => ({ redirect }));
    vi.doMock("../../lib/supabase/server", () => ({
      createClient: async () => ({
        auth: {
          signUp,
        },
      }),
    }));

    const formData = new FormData();
    formData.set("displayName", "Sparkle Mama");
    formData.set("email", "mama@example.com");
    formData.set("phone", "555-123-4567");
    formData.set("state", "CA");
    formData.set("password", "sparkle-password");
    formData.set("passwordConfirmation", "sparkle-passwrod");
    formData.set("privacyAcknowledged", "yes");
    formData.set("next", "/silver");

    const { signUpWithPassword } = await import("../../app/auth/sign-up/actions");

    await expect(signUpWithPassword(formData)).rejects.toThrow(
      "redirect:/auth/sign-up?next=%2Fsilver&error=password_mismatch",
    );
    expect(signUp).not.toHaveBeenCalled();
  });

  it("preserves the requested next path through magic-link signup", async () => {
    const signInWithOtp = vi.fn().mockResolvedValue({ error: null });
    const redirect = vi.fn((path: string) => {
      throw new Error(`redirect:${path}`);
    });

    vi.doMock("next/navigation", () => ({ redirect }));
    vi.doMock("../../lib/supabase/server", () => ({
      createClient: async () => ({
        auth: {
          signInWithOtp,
        },
      }),
    }));

    const formData = new FormData();
    formData.set("displayName", "Sparkle Mama");
    formData.set("email", "mama@example.com");
    formData.set("phone", "555-123-4567");
    formData.set("state", "CA");
    formData.set("privacyAcknowledged", "yes");
    formData.set("next", "/library");

    const { requestMagicLink } = await import("../../app/auth/sign-up/actions");

    await expect(requestMagicLink(formData)).rejects.toThrow(
      "redirect:/auth/sign-in?message=check_email&next=%2Flibrary",
    );
    expect(signInWithOtp.mock.calls[0][0].options.emailRedirectTo).toBe(
      "http://localhost:3000/auth/confirm?next=%2Flibrary",
    );
  });
});

describe("Sparkle Finder sign-in magic link", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("next/navigation");
    vi.doUnmock("../../lib/supabase/server");
  });

  it("emails a sign-in link without a password", async () => {
    const signInWithOtp = vi.fn().mockResolvedValue({ error: null });
    const redirect = vi.fn((path: string) => {
      throw new Error(`redirect:${path}`);
    });

    vi.doMock("next/navigation", () => ({ redirect }));
    vi.doMock("../../lib/supabase/server", () => ({
      createClient: async () => ({
        auth: {
          signInWithOtp,
        },
      }),
    }));

    const formData = new FormData();
    formData.set("email", "mama@example.com");
    formData.set("next", "/library");

    const { requestSignInMagicLink } = await import("../../app/auth/sign-in/actions");

    await expect(requestSignInMagicLink(formData)).rejects.toThrow(
      "redirect:/auth/sign-in?message=check_email&next=%2Flibrary",
    );
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "mama@example.com",
      options: {
        emailRedirectTo: "http://localhost:3000/auth/confirm?next=%2Flibrary",
        shouldCreateUser: false,
      },
    });
  });

  it("asks for an email before sending a sign-in link", async () => {
    const signInWithOtp = vi.fn().mockResolvedValue({ error: null });
    const redirect = vi.fn((path: string) => {
      throw new Error(`redirect:${path}`);
    });

    vi.doMock("next/navigation", () => ({ redirect }));
    vi.doMock("../../lib/supabase/server", () => ({
      createClient: async () => ({
        auth: {
          signInWithOtp,
        },
      }),
    }));

    const { requestSignInMagicLink } = await import("../../app/auth/sign-in/actions");

    await expect(requestSignInMagicLink(new FormData())).rejects.toThrow(
      "redirect:/auth/sign-in?error=missing_email",
    );
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it("returns to sign-in when the magic link email cannot be sent", async () => {
    const signInWithOtp = vi.fn().mockResolvedValue({ error: new Error("rate limit") });
    const redirect = vi.fn((path: string) => {
      throw new Error(`redirect:${path}`);
    });

    vi.doMock("next/navigation", () => ({ redirect }));
    vi.doMock("../../lib/supabase/server", () => ({
      createClient: async () => ({
        auth: {
          signInWithOtp,
        },
      }),
    }));

    const formData = new FormData();
    formData.set("email", "mama@example.com");

    const { requestSignInMagicLink } = await import("../../app/auth/sign-in/actions");

    await expect(requestSignInMagicLink(formData)).rejects.toThrow(
      "redirect:/auth/sign-in?error=magic_link_failed",
    );
  });
});

describe("Sparkle Finder password recovery server actions", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("next/navigation");
    vi.doUnmock("../../lib/supabase/server");
  });

  it("sends password reset emails through the Sparkle Finder confirmation route", async () => {
    const resetPasswordForEmail = vi.fn().mockResolvedValue({ error: null });
    const redirect = vi.fn((path: string) => {
      throw new Error(`redirect:${path}`);
    });

    vi.doMock("next/navigation", () => ({ redirect }));
    vi.doMock("../../lib/supabase/server", () => ({
      createClient: async () => ({
        auth: {
          resetPasswordForEmail,
        },
      }),
    }));

    const formData = new FormData();
    formData.set("email", "mama@example.com");
    formData.set("next", "/silver");

    const { requestPasswordReset } = await import("../../app/auth/forgot-password/actions");

    await expect(requestPasswordReset(formData)).rejects.toThrow(
      "redirect:/auth/forgot-password?message=check_email&next=%2Fsilver",
    );
    expect(resetPasswordForEmail).toHaveBeenCalledWith("mama@example.com", {
      redirectTo: "http://localhost:3000/auth/confirm?next=%2Fsilver",
    });
  });

  it("preserves next when password reset email requests fail", async () => {
    const resetPasswordForEmail = vi.fn().mockResolvedValue({ error: new Error("mail failed") });
    const redirect = vi.fn((path: string) => {
      throw new Error(`redirect:${path}`);
    });

    vi.doMock("next/navigation", () => ({ redirect }));
    vi.doMock("../../lib/supabase/server", () => ({
      createClient: async () => ({
        auth: {
          resetPasswordForEmail,
        },
      }),
    }));

    const formData = new FormData();
    formData.set("email", "mama@example.com");
    formData.set("next", "/library");

    const { requestPasswordReset } = await import("../../app/auth/forgot-password/actions");

    await expect(requestPasswordReset(formData)).rejects.toThrow(
      "redirect:/auth/forgot-password?next=%2Flibrary&error=reset_failed",
    );
  });
});

describe("Sparkle Finder signup page", () => {
  it("renders visible sign-up recovery notices and preserves the intended next path", async () => {
    const { renderSignUpPageContent } = await import("../../app/auth/sign-up/page");

    const markup = renderToStaticMarkup(renderSignUpPageContent({ error: "signup_failed", next: "/silver" }));

    expect(markup).toContain("Sparkle Finder could not create that account.");
    expect(markup).toContain("Try Google, try an email link, or use a different email address.");
    expect(markup).toContain('name="next"');
    expect(markup).toContain('value="/silver"');
    expect(markup).toContain('href="/auth/sign-in?next=%2Fsilver"');
  });

  it("uses customer-facing sign-up method copy without exposing Supabase", async () => {
    const { renderSignUpPageContent } = await import("../../app/auth/sign-up/page");

    const markup = renderToStaticMarkup(renderSignUpPageContent());

    expect(markup).toContain("Create a password and confirm your email.");
    expect(markup).toContain("Confirm password");
    expect(markup).toContain('name="passwordConfirmation"');
    expect(markup).toContain("Password signup sends a confirmation email.");
    expect(markup).not.toContain("Supabase");
  });

  it("renders a helpful password mismatch notice", async () => {
    const { renderSignUpPageContent } = await import("../../app/auth/sign-up/page");

    const markup = renderToStaticMarkup(renderSignUpPageContent({ error: "password_mismatch", next: "/silver" }));

    expect(markup).toContain("Those passwords did not match.");
    expect(markup).toContain('value="/silver"');
  });
});

describe("Sparkle Finder sign-in page", () => {
  it("preserves the intended next path on create-account links", async () => {
    const { renderSignInPageContent } = await import("../../app/auth/sign-in/page");

    const markup = renderToStaticMarkup(renderSignInPageContent({ next: "/silver" }));

    expect(markup).toContain('href="/auth/sign-up?next=%2Fsilver"');
    expect(markup).not.toContain('href="/auth/sign-up">Create account</a>');
  });

  it("offers a password reset path that preserves the intended next path", async () => {
    const { renderSignInPageContent } = await import("../../app/auth/sign-in/page");

    const markup = renderToStaticMarkup(renderSignInPageContent({ next: "/silver" }));

    expect(markup).toContain('href="/auth/forgot-password?next=%2Fsilver"');
    expect(markup).toContain("Forgot password?");
  });
});

describe("Sparkle Finder password recovery pages", () => {
  it("renders password reset request copy without exposing Supabase", async () => {
    const { renderForgotPasswordPageContent } = await import("../../app/auth/forgot-password/page");

    const markup = renderToStaticMarkup(renderForgotPasswordPageContent({ next: "/silver" }));

    expect(markup).toContain("Reset your Sparkle Finder password");
    expect(markup).toContain('name="email"');
    expect(markup).toContain('name="next"');
    expect(markup).toContain('value="/silver"');
    expect(markup).not.toContain("Supabase");
  });

  it("renders reset-password form fields with password confirmation", async () => {
    const { renderResetPasswordPageContent } = await import("../../app/auth/reset-password/page");

    const markup = renderToStaticMarkup(renderResetPasswordPageContent({ next: "/silver" }));

    expect(markup).toContain("Choose a new password");
    expect(markup).toContain('name="password"');
    expect(markup).toContain('name="passwordConfirmation"');
    expect(markup).toContain('href="/auth/forgot-password?next=%2Fsilver"');
  });
});

describe("Sparkle Finder dashboard routing", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("next/navigation");
  });

  it("redirects the old dashboard route to the signed-in customer home", async () => {
    const redirect = vi.fn((path: string) => {
      throw new Error(`redirect:${path}`);
    });

    vi.doMock("next/navigation", () => ({ redirect }));

    const { default: DashboardPage } = await import("../../app/(hub)/dashboard/page");

    await expect(DashboardPage()).rejects.toThrow("redirect:/");
    expect(redirect).toHaveBeenCalledWith("/");
  });
});

describe("Sparkle Finder account route", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("next/navigation");
    vi.doUnmock("../../lib/supabase/server");
  });

  it("renders a sign-in prompt instead of account controls for anonymous visitors", async () => {
    const { renderAccountPageContent } = await import("../../app/account/page");
    const markup = renderToStaticMarkup(renderAccountPageContent(anonymousAccountState()));

    expect(markup).toContain("Sign in to manage your Sparkle Finder account");
    expect(markup).toContain("/auth/sign-in");
    expect(markup).not.toContain("Save communication preferences");
    expect(markup).not.toContain("Save profile basics");
  });

  it("renders privacy and consent labels for authenticated accounts", async () => {
    const { renderAccountPageContent } = await import("../../app/account/page");
    const markup = renderToStaticMarkup(renderAccountPageContent(activeTrialAccountState()));

    expect(markup).toContain("Optional promotional email");
    expect(markup).toContain("Optional promotional SMS");
    expect(markup).toContain("Marketing texts are optional and separate from account/security notices.");
    expect(markup).toContain("Phone is used for account identification, recovery, trial protection, and security notices.");
    expect(markup).toContain("We do not sell your phone number.");
    expect(markup).toContain('href="/auth/sign-out"');
    expect(markup).toContain("Sign out");
    expect(markup).toContain('name="promotionalSms"');
    expect(markup).not.toContain('name="promotionalSms" checked');
  }, 10_000);

  it("marks Google-like authenticated accounts without phone, state, or privacy acknowledgment incomplete", async () => {
    const { getAccountCompletionState } = await import("../../lib/sparkle-finder/account-completion");
    const base = activeTrialAccountState() as CurrentSparkleFinderAccountState & {
      status: "authenticated";
      customer: NonNullable<CurrentSparkleFinderAccountState["customer"]>;
    };
    const accountState = {
      ...base,
      customer: {
        ...base.customer,
        phoneE164: "",
        state: "",
      },
      communicationConsent: {
        ...base.communicationConsent,
        privacyAcknowledgedAt: null,
      },
    };

    expect(getAccountCompletionState(accountState)).toEqual({
      isComplete: false,
      missingFields: ["phone", "state", "privacy acknowledgment"],
    });
  });

  it("marks Guest display names incomplete for authenticated accounts", async () => {
    const { getAccountCompletionState } = await import("../../lib/sparkle-finder/account-completion");
    const base = activeTrialAccountState() as CurrentSparkleFinderAccountState & {
      status: "authenticated";
      customer: NonNullable<CurrentSparkleFinderAccountState["customer"]>;
    };
    const accountState = {
      ...base,
      displayName: "Guest",
      customer: {
        ...base.customer,
        displayName: "Guest",
      },
    };

    expect(getAccountCompletionState(accountState).missingFields).toContain("display name");
  });

  it("renders completion guidance before account controls for incomplete authenticated accounts", async () => {
    const { renderAccountPageContent } = await import("../../app/account/page");
    const base = activeTrialAccountState() as CurrentSparkleFinderAccountState & {
      status: "authenticated";
      customer: NonNullable<CurrentSparkleFinderAccountState["customer"]>;
    };
    const accountState = {
      ...base,
      displayName: "Guest",
      customer: {
        ...base.customer,
        displayName: "Guest",
        phoneE164: "",
        state: "",
      },
      communicationConsent: {
        ...base.communicationConsent,
        privacyAcknowledgedAt: null,
      },
    };

    const markup = renderToStaticMarkup(renderAccountPageContent(accountState));

    expect(markup).toContain("Complete your Sparkle Finder account");
    expect(markup).toContain(
      "Google sign-in created your secure login. Add the remaining details needed for trial protection, account support, and privacy acknowledgment.",
    );
    expect(markup).toContain("Update profile basics");
    expect(markup).toContain("Update communication preferences");
    expect(markup).not.toContain("Save profile basics");
    expect(markup).not.toContain("Save communication preferences");
    expect(markup).toContain("name=\"privacyAcknowledged\"");
    expect(markup).toContain('href="/privacy-policy"');
    expect(markup).toContain("I acknowledge the");
    expect(markup).toContain("Sparkle Finder privacy terms");
    expect(markup).toContain("<select");
    expect(markup).toContain('name="state"');
    expect(markup).toContain("Select your state");
    expect(markup).toContain('value="PA"');
  });

  it("normalizes existing state names before rendering the account dropdown", async () => {
    const { renderAccountPageContent } = await import("../../app/account/page");
    const base = activeTrialAccountState() as CurrentSparkleFinderAccountState & {
      status: "authenticated";
      customer: NonNullable<CurrentSparkleFinderAccountState["customer"]>;
    };
    const accountState = {
      ...base,
      customer: {
        ...base.customer,
        state: "florida",
      },
    };

    const markup = renderToStaticMarkup(renderAccountPageContent(accountState));

    expect(markup).toContain('<option value="FL" selected="">Florida</option>');
    expect(markup).not.toContain('<option value="AL" selected="">Alabama</option>');
  });

  it("renders account save notices from safe message and error states", async () => {
    const { renderAccountPageContent } = await import("../../app/account/page");

    const savedMarkup = renderToStaticMarkup(
      renderAccountPageContent(activeTrialAccountState(), undefined, {
        tone: "success",
        title: "Profile saved",
        body: "Your Sparkle Finder profile basics were updated.",
      }),
    );
    const errorMarkup = renderToStaticMarkup(
      renderAccountPageContent(activeTrialAccountState(), undefined, {
        tone: "error",
        title: "Profile was not saved",
        body: "Sparkle Finder could not save those profile basics. Please check the fields and try again.",
      }),
    );

    expect(savedMarkup).toContain("Profile saved");
    expect(savedMarkup).toContain("Your Sparkle Finder profile basics were updated.");
    expect(errorMarkup).toContain("Profile was not saved");
  });

  it("renders Secret Rep ID claim controls for authenticated non-rep accounts", async () => {
    const { renderAccountPageContent } = await import("../../app/account/page");
    const markup = renderToStaticMarkup(renderAccountPageContent(activeTrialAccountState()));

    expect(markup).toContain("Claim your BP Rep badge");
    expect(markup).toContain("Secret Rep ID Number");
    expect(markup).toContain("Do not share this number publicly.");
    expect(markup).toContain('name="secretRepIdNumber"');
    expect(markup).toContain("Claim BP Rep badge");
  });

  it("replaces Secret Rep ID claim controls with linked rep status after claim", async () => {
    const { renderAccountPageContent } = await import("../../app/account/page");
    const accountState: CurrentSparkleFinderAccountState = {
      ...repIncludedSilverAccountState(),
      repEntitlement: {
        sparkleSuiteRepId: "rep-bling-kitchen",
        businessName: "BlingKitchen",
        subscriptionStatus: "active",
        publicDiscoveryEnabled: false,
      },
    };

    const markup = renderToStaticMarkup(renderAccountPageContent(accountState));

    expect(markup).toContain("Rep badge linked");
    expect(markup).toContain("BlingKitchen");
    expect(markup).not.toContain('name="secretRepIdNumber"');
  });

  it("renders a self-facing Sparkle Suite rep marker on rep account surfaces", async () => {
    const { renderAccountPageContent } = await import("../../app/account/page");
    const accountState: CurrentSparkleFinderAccountState = {
      ...activeTrialAccountState(),
      repEntitlement: {
        sparkleSuiteRepId: "rep-kelli",
        businessName: "Kelli Jo Sparkles",
        subscriptionStatus: "active",
        publicDiscoveryEnabled: false,
      },
    };

    const markup = renderToStaticMarkup(renderAccountPageContent(accountState));

    expect(markup).toContain("Sparkle Suite rep");
    expect(markup).toContain("Kelli Jo Sparkles");
    expect(markup).not.toContain("Bomb Party rep");
  });

  it("renders the existing profile phone so profile saves preserve it", async () => {
    const { renderAccountPageContent } = await import("../../app/account/page");
    const accountState = activeTrialAccountState() as CurrentSparkleFinderAccountState & {
      status: "authenticated";
      customer: NonNullable<CurrentSparkleFinderAccountState["customer"]> & { phoneE164: string };
    };
    accountState.customer.phoneE164 = "+15551234567";

    const markup = renderToStaticMarkup(renderAccountPageContent(accountState));

    expect(markup).toContain('name="phone"');
    expect(markup).toContain('value="+15551234567"');
  });

  it("shows 45-day Silver trial countdown copy for active trials", async () => {
    const { renderAccountPageContent } = await import("../../app/account/page");
    const markup = renderToStaticMarkup(
      renderAccountPageContent(activeTrialAccountState(), new Date("2026-06-01T12:00:00.000Z")),
    );

    expect(markup).toContain("45-day Silver trial");
    expect(markup).toContain("Trial ends June 10, 2026");
    expect(markup).toContain("9 days left");
  });

  it("shows an account-page notice when a Silver trial is close to ending", async () => {
    const { renderAccountPageContent } = await import("../../app/account/page");
    const markup = renderToStaticMarkup(
      renderAccountPageContent(activeTrialAccountState(), new Date("2026-06-07T12:00:00.000Z")),
    );

    expect(markup).toContain("Silver trial ends in 3 days");
    expect(markup).toContain("This account page shows reminders before any Free downgrade.");
  });

  it("does not show trial downgrade warnings for paid or rep-included Silver", async () => {
    const { renderAccountPageContent } = await import("../../app/account/page");
    const paidMarkup = renderToStaticMarkup(renderAccountPageContent(paidSilverAccountState()));
    const repMarkup = renderToStaticMarkup(renderAccountPageContent(repIncludedSilverAccountState()));

    expect(paidMarkup).not.toContain("Free downgrade");
    expect(paidMarkup).not.toContain("Silver trial ends in");
    expect(repMarkup).not.toContain("Free downgrade");
    expect(repMarkup).not.toContain("Silver trial ends in");
  });

  it("shows an honest upgrade CTA when an expired trial maps to Free", async () => {
    const { renderAccountPageContent } = await import("../../app/account/page");
    const markup = renderToStaticMarkup(renderAccountPageContent(expiredTrialMappedToFreeAccountState()));

    expect(markup).toContain(
      "Your 45-day Silver trial has ended",
    );
    expect(markup).toContain(
      "Silver trial access is open for beta. Paid checkout is intentionally disabled until Stripe is fully smoked.",
    );
    expect(markup).toContain("disabled");
    expect(markup).not.toContain("/stripe");
  });

  it("updates consent preferences through the verified-user RPC and revalidates safely", async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: { user: { id: "user-123", email: "casey@example.com" } },
      error: null,
    });
    const rpc = vi.fn().mockResolvedValue({ data: {}, error: null });
    const redirect = vi.fn((path: string) => {
      throw new Error(`redirect:${path}`);
    });
    const revalidatePath = vi.fn();

    vi.doMock("next/navigation", () => ({ redirect }));
    vi.doMock("next/cache", () => ({ revalidatePath }));
    vi.doMock("../../lib/supabase/server", () => ({
      createClient: async () => ({
        auth: { getUser },
        rpc,
      }),
    }));

    const formData = new FormData();
    formData.set("promotionalEmail", "yes");
    formData.set("promotionalSms", "yes");
    formData.set("accountSmsAllowed", "yes");
    formData.set("privacyAcknowledged", "yes");

    const { updateCommunicationPreferences } = await import("../../app/account/actions");

    await expect(updateCommunicationPreferences(formData)).rejects.toThrow(
      "redirect:/account?message=preferences_saved",
    );
    expect(getUser).toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith("update_sparkle_finder_communication_preferences", {
      promotional_email_opt_in: true,
      promotional_sms_opt_in: true,
      account_sms_allowed: true,
      privacy_acknowledged: true,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/account");
  });

  it("opts out of optional communications when consent checkboxes are omitted", async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: { user: { id: "user-123", email: "casey@example.com" } },
      error: null,
    });
    const rpc = vi.fn().mockResolvedValue({ data: {}, error: null });
    const redirect = vi.fn((path: string) => {
      throw new Error(`redirect:${path}`);
    });
    const revalidatePath = vi.fn();

    vi.doMock("next/navigation", () => ({ redirect }));
    vi.doMock("next/cache", () => ({ revalidatePath }));
    vi.doMock("../../lib/supabase/server", () => ({
      createClient: async () => ({
        auth: { getUser },
        rpc,
      }),
    }));

    const { updateCommunicationPreferences } = await import("../../app/account/actions");

    await expect(updateCommunicationPreferences(new FormData())).rejects.toThrow(
      "redirect:/account?message=preferences_saved",
    );
    expect(getUser).toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith("update_sparkle_finder_communication_preferences", {
      promotional_email_opt_in: false,
      promotional_sms_opt_in: false,
      account_sms_allowed: false,
      privacy_acknowledged: false,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/account");
  });

  it("claims a Sparkle Suite rep identity through the verified service-role path", async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: { user: { id: "user-123", email: "casey@example.com" } },
      error: null,
    });
    const redirect = vi.fn((path: string) => {
      throw new Error(`redirect:${path}`);
    });
    const revalidatePath = vi.fn();
    const serviceRoleClient = { from: vi.fn() };
    const claimSparkleSuiteRepForFinderUser = vi.fn().mockResolvedValue({
      ok: true,
      status: "claimed",
      suiteRepId: "rep-bling-kitchen",
      businessName: "BlingKitchen",
    });

    vi.doMock("next/navigation", () => ({ redirect }));
    vi.doMock("next/cache", () => ({ revalidatePath }));
    vi.doMock("../../lib/supabase/server", () => ({
      createClient: async () => ({
        auth: { getUser },
      }),
    }));
    vi.doMock("../../lib/supabase/service-role", () => ({
      createSupabaseServiceRoleClient: () => serviceRoleClient,
    }));
    vi.doMock("../../lib/sparkle-finder/rep-claim", () => ({
      claimSparkleSuiteRepForFinderUser,
    }));

    const formData = new FormData();
    formData.set("secretRepIdNumber", " BLI-3767 ");

    const { claimSparkleSuiteRepAccount } = await import("../../app/account/actions");

    await expect(claimSparkleSuiteRepAccount(formData)).rejects.toThrow("redirect:/account?message=rep_claimed");
    expect(claimSparkleSuiteRepForFinderUser).toHaveBeenCalledWith(
      expect.objectContaining({
        finderUserId: "user-123",
        finderEmail: "casey@example.com",
        displayName: "casey",
        secretRepIdNumber: "BLI-3767",
        serviceRoleClient,
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/account");
  });

  it("updates profile basics for existing Google-created account rows", async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: { user: { id: "user-123", email: "casey@example.com" } },
      error: null,
    });
    const maybeSingle = vi.fn().mockResolvedValue({ data: { user_id: "user-123" }, error: null });
    const updateEq = vi.fn().mockResolvedValue({ data: {}, error: null });
    const insert = vi.fn().mockResolvedValue({ data: {}, error: null });
    const redirect = vi.fn((path: string) => {
      throw new Error(`redirect:${path}`);
    });
    const revalidatePath = vi.fn();
    const update = vi.fn(() => ({
      eq: updateEq,
    }));
    const from = vi.fn(() => ({
      insert,
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle })),
      })),
      update,
    }));

    vi.doMock("next/navigation", () => ({ redirect }));
    vi.doMock("next/cache", () => ({ revalidatePath }));
    vi.doMock("../../lib/supabase/server", () => ({
      createClient: async () => ({
        auth: { getUser },
        from,
      }),
    }));

    const formData = new FormData();
    formData.set("displayName", "Casey Collector");
    formData.set("phone", "555-123-4567");
    formData.set("state", "Florida");

    const { updateAccountProfile } = await import("../../app/account/actions");

    await expect(updateAccountProfile(formData)).rejects.toThrow("redirect:/account?message=profile_saved");
    expect(updateEq).toHaveBeenCalledWith("user_id", "user-123");
    expect(update).toHaveBeenCalledWith({
      display_name: "Casey Collector",
      email: "casey@example.com",
      phone_e164: "555-123-4567",
      state: "FL",
    });
    expect(insert).not.toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/account");
  });

  it("inserts profile basics when a Google-created account row is missing", async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: { user: { id: "user-123", email: "casey@example.com" } },
      error: null,
    });
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const updateEq = vi.fn().mockResolvedValue({ data: {}, error: null });
    const insert = vi.fn().mockResolvedValue({ data: {}, error: null });
    const redirect = vi.fn((path: string) => {
      throw new Error(`redirect:${path}`);
    });
    const revalidatePath = vi.fn();
    const update = vi.fn(() => ({ eq: updateEq }));
    const from = vi.fn(() => ({
      insert,
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle })),
      })),
      update,
    }));

    vi.doMock("next/navigation", () => ({ redirect }));
    vi.doMock("next/cache", () => ({ revalidatePath }));
    vi.doMock("../../lib/supabase/server", () => ({
      createClient: async () => ({
        auth: { getUser },
        from,
      }),
    }));

    const formData = new FormData();
    formData.set("displayName", "Casey Collector");
    formData.set("phone", "555-123-4567");
    formData.set("state", "PA");

    const { updateAccountProfile } = await import("../../app/account/actions");

    await expect(updateAccountProfile(formData)).rejects.toThrow("redirect:/account?message=profile_saved");
    expect(update).not.toHaveBeenCalled();
    expect(insert).toHaveBeenCalledWith({
      user_id: "user-123",
      display_name: "Casey Collector",
      email: "casey@example.com",
      phone_e164: "555-123-4567",
      state: "PA",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/account");
  });
});

function anonymousAccountState(): CurrentSparkleFinderAccountState {
  return {
    status: "anonymous",
    tier: "anonymous",
    displayName: "Guest",
    email: null,
    customer: null,
    communicationConsent: {
      accountEmailRequired: true,
      accountSmsAllowed: false,
      promotionalEmailOptIn: false,
      promotionalSmsOptIn: false,
      accountSmsConsentedAt: null,
      promotionalEmailConsentedAt: null,
      promotionalSmsConsentedAt: null,
      privacyAcknowledgedAt: null,
    },
  };
}

function activeTrialAccountState(): CurrentSparkleFinderAccountState {
  return {
    status: "authenticated",
    tier: "silver",
    displayName: "Casey Collector",
    email: "casey@example.com",
    customer: {
      id: "user-123",
      displayName: "Casey Collector",
      email: "casey@example.com",
      state: "PA",
      tier: "silver",
    },
    membership: {
      accountId: "user-123",
      personId: "user-123",
      accessState: "silver_trial",
      silverSource: "trial",
      trialStartedAt: "2026-04-26T12:00:00.000Z",
      trialEndsAt: "2026-06-10T12:00:00.000Z",
      silverStartedAt: "2026-04-26T12:00:00.000Z",
      silverEndsAt: "2026-06-10T12:00:00.000Z",
      effectiveState: "silver_trial",
      hasSilverAccess: true,
      isTrialActive: true,
      isTrialExpired: false,
    },
    communicationConsent: {
      accountEmailRequired: true,
      accountSmsAllowed: false,
      promotionalEmailOptIn: true,
      promotionalSmsOptIn: false,
      accountSmsConsentedAt: null,
      promotionalEmailConsentedAt: "2026-05-01T12:00:00.000Z",
      promotionalSmsConsentedAt: null,
      privacyAcknowledgedAt: "2026-04-26T12:00:00.000Z",
    },
  };
}

function expiredTrialMappedToFreeAccountState(): CurrentSparkleFinderAccountState {
  const base = activeTrialAccountState() as CurrentSparkleFinderAccountState & { status: "authenticated" };

  return {
    ...base,
    tier: "free",
    customer: {
      id: "user-123",
      displayName: "Casey Collector",
      email: "casey@example.com",
      state: "PA",
      tier: "free",
    },
    membership: {
      ...base.membership!,
      trialEndsAt: "2026-05-10T12:00:00.000Z",
      silverEndsAt: "2026-05-10T12:00:00.000Z",
      effectiveState: "free",
      hasSilverAccess: false,
      isTrialActive: false,
      isTrialExpired: true,
    },
  };
}

function paidSilverAccountState(): CurrentSparkleFinderAccountState {
  const base = activeTrialAccountState() as CurrentSparkleFinderAccountState & { status: "authenticated" };

  return {
    ...base,
    membership: {
      ...base.membership!,
      accessState: "silver_paid",
      silverSource: "stripe",
      trialEndsAt: "2026-06-10T12:00:00.000Z",
      silverEndsAt: null,
      effectiveState: "silver_paid",
      hasSilverAccess: true,
      isTrialActive: false,
      isTrialExpired: false,
    },
  };
}

function repIncludedSilverAccountState(): CurrentSparkleFinderAccountState {
  const base = activeTrialAccountState() as CurrentSparkleFinderAccountState & { status: "authenticated" };

  return {
    ...base,
    membership: {
      ...base.membership!,
      accessState: "silver_rep_included",
      silverSource: "sparkle_suite_rep",
      trialEndsAt: "2026-06-10T12:00:00.000Z",
      silverEndsAt: null,
      effectiveState: "silver_rep_included",
      hasSilverAccess: true,
      isTrialActive: false,
      isTrialExpired: false,
    },
  };
}
