import { describe, expect, it } from "vitest";
import {
  sealSupportToken,
  openSupportToken,
} from "@/lib/loc-control-center/support-credentials";
import { locOperationCatalog } from "@/lib/loc-control-center/catalog";
import { redactCredentialFields } from "@/lib/loc-control-center/dispatcher";

describe("LOC native support credentials", () => {
  it("encrypts the CSRF token and binds it to the exact owner, connection, session and target", () => {
    const secret = "safe-test-secret".repeat(4),
      token = "secret-csrf-value",
      binding = "owner:connection:session:target";
    const encrypted = sealSupportToken(token, binding, secret);
    expect(JSON.stringify(encrypted)).not.toContain(token);
    expect(openSupportToken(encrypted, binding, secret)).toBe(token);
    expect(() =>
      openSupportToken(encrypted, "owner:other:session:target", secret),
    ).toThrow();
    expect(() =>
      openSupportToken(encrypted, binding, "rotated-key".repeat(5)),
    ).toThrow();
    expect(() =>
      openSupportToken(
        { ...encrypted, tag: Buffer.alloc(16).toString("base64") },
        binding,
        secret,
      ),
    ).toThrow();
  });
  it("keeps all disclosed session operations owner-only and excludes billing/auth arbitrary routes", () => {
    const support = locOperationCatalog.filter(
      (row) =>
        row.name.startsWith("support.session.") ||
        row.name.startsWith("support.workspace."),
    );
    expect(support.length).toBeGreaterThan(10);
    expect(support.every((row) => row.ownerOnly)).toBe(true);
    expect(
      support.some((row) => /billing|auth|gateway|proxy/.test(row.name)),
    ).toBe(false);
  });
  it("removes nested credentials from durable operation results", () => {
    expect(
      redactCredentialFields({
        ok: true,
        clientAccount: {
          repId: "safe-id",
          temporaryPassword: "secret",
          token: { accessToken: "bearer" },
          csrfToken: "csrf",
        },
      }),
    ).toEqual({ ok: true, clientAccount: { repId: "safe-id", token: {} } });
  });
});
