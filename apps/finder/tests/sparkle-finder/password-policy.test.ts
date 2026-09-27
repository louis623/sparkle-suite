import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getNewPasswordValidationError,
  getPasswordMinLength,
  getPasswordRequirements,
  PASSWORD_MIN_LENGTH,
  PASSWORD_REQUIREMENTS,
} from "../../lib/sparkle-finder/password-policy";

const liveEnv = {
  SPARKLE_ENVIRONMENT: "production",
  NEXT_PUBLIC_SPARKLE_ENVIRONMENT: "production",
};

const smokeCopy = "Smoke only — any password you can remember.";

describe("Sparkle Finder password policy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("keeps the live 8-character minimum and does not add character classes", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
    expect(getPasswordMinLength({})).toBe(8);
    expect(getPasswordMinLength(liveEnv)).toBe(8);
    expect(getPasswordRequirements(liveEnv)).toBe(PASSWORD_REQUIREMENTS);
    expect(getNewPasswordValidationError("password", "password", liveEnv)).toBeNull();
    expect(getNewPasswordValidationError("simple", "simple", {})).toBe(PASSWORD_REQUIREMENTS);
    expect(getNewPasswordValidationError("short", "short", liveEnv)).toBe(PASSWORD_REQUIREMENTS);
  });

  it("still rejects a mismatched confirmation on live", () => {
    expect(getNewPasswordValidationError("password", "Password", liveEnv)).toBe(
      "Those passwords did not match. Please enter the same password twice.",
    );
  });

  it.each([
    { SPARKLE_ENVIRONMENT: "smoke" },
    { NEXT_PUBLIC_SPARKLE_ENVIRONMENT: "smoke" },
    {
      SPARKLE_ENVIRONMENT: "smoke",
      NEXT_PUBLIC_SPARKLE_ENVIRONMENT: "smoke",
    },
  ])("relaxes length and skips character classes on Smoke only", (env) => {
    expect(getPasswordMinLength(env)).toBe(6);
    expect(getPasswordRequirements(env)).toBe(smokeCopy);
    expect(getNewPasswordValidationError("simple", "simple", env)).toBeNull();
    expect(getNewPasswordValidationError("pass", "pass", env)).toBe(smokeCopy);
    expect(getNewPasswordValidationError("simple", "simples", env)).toBe(
      "Those passwords did not match. Please enter the same password twice.",
    );
  });

  it("renders the live reset form with an 8-character minimum", async () => {
    vi.stubEnv("SPARKLE_ENVIRONMENT", "production");
    vi.stubEnv("NEXT_PUBLIC_SPARKLE_ENVIRONMENT", "production");

    const { renderResetPasswordPageContent } = await import("../../app/auth/reset-password/page");
    const markup = renderToStaticMarkup(renderResetPasswordPageContent({ next: "/silver" }));

    expect(markup).toContain("Use at least 8 characters.");
    expect(markup).toContain('minLength="8"');
    expect(markup).not.toContain(smokeCopy);
  });

  it.each(["SPARKLE_ENVIRONMENT", "NEXT_PUBLIC_SPARKLE_ENVIRONMENT"] as const)(
    "renders the Smoke reset form from %s",
    async (envName) => {
      vi.stubEnv("SPARKLE_ENVIRONMENT", "");
      vi.stubEnv("NEXT_PUBLIC_SPARKLE_ENVIRONMENT", "");
      vi.stubEnv(envName, "smoke");

      const { renderResetPasswordPageContent } = await import("../../app/auth/reset-password/page");
      const markup = renderToStaticMarkup(renderResetPasswordPageContent());

      expect(markup).toContain(smokeCopy);
      expect(markup).toContain('minLength="6"');
      expect(markup).not.toContain("Use at least 8 characters.");
      expect(markup).not.toContain("including uppercase");
    },
  );

  it("renders the live sign-up form with an 8-character minimum", async () => {
    vi.stubEnv("SPARKLE_ENVIRONMENT", "production");
    vi.stubEnv("NEXT_PUBLIC_SPARKLE_ENVIRONMENT", "");

    const { renderSignUpPageContent } = await import("../../app/auth/sign-up/page");
    const markup = renderToStaticMarkup(renderSignUpPageContent());

    expect(markup).toContain("Use at least 8 characters.");
    expect(markup).toContain('minLength="8"');
  });

  it("stops a short live signup before Supabase and allows a short Smoke signup", async () => {
    const signUp = vi.fn().mockResolvedValue({ error: null });
    const redirect = vi.fn((path: string) => {
      throw new Error(`redirect:${path}`);
    });

    vi.doMock("next/navigation", () => ({ redirect }));
    vi.doMock("../../lib/supabase/server", () => ({
      createClient: async () => ({
        auth: { signUp },
      }),
    }));

    vi.stubEnv("SPARKLE_ENVIRONMENT", "production");
    vi.stubEnv("NEXT_PUBLIC_SPARKLE_ENVIRONMENT", "production");

    const { signUpWithPassword } = await import("../../app/auth/sign-up/actions");
    const shortPassword = signupForm("simple");

    await expect(signUpWithPassword(shortPassword)).rejects.toThrow(
      "redirect:/auth/sign-up?next=%2Faccount&error=weak_password",
    );
    expect(signUp).not.toHaveBeenCalled();

    vi.stubEnv("NEXT_PUBLIC_SPARKLE_ENVIRONMENT", "smoke");
    const smokePassword = signupForm("simple");

    await expect(signUpWithPassword(smokePassword)).rejects.toThrow("redirect:/auth/sign-in?message=check_email");
    expect(signUp).toHaveBeenCalledWith(expect.objectContaining({ password: "simple" }));
  });
});

function signupForm(password: string) {
  const formData = new FormData();
  formData.set("displayName", "Sparkle Mama");
  formData.set("email", "mama@example.com");
  formData.set("phone", "555-123-4567");
  formData.set("state", "CA");
  formData.set("password", password);
  formData.set("passwordConfirmation", password);
  formData.set("privacyAcknowledged", "yes");
  return formData;
}
