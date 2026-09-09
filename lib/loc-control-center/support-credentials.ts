import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { LocBridgeError } from "./security";
type SealedToken = { iv: string; tag: string; ciphertext: string };
function key(secret = process.env.LOC_CONTROL_CENTER_SECRET) {
  if (!secret || secret.length < 32)
    throw new LocBridgeError(
      503,
      "LOC support credentials are not configured.",
    );
  return createHash("sha256")
    .update(`loc-support-session:v1:${secret}`)
    .digest();
}
export function sealSupportToken(
  token: string,
  binding: string,
  secret?: string,
): SealedToken {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  cipher.setAAD(Buffer.from(binding));
  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  return {
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: encrypted.toString("base64"),
  };
}
export function openSupportToken(
  value: SealedToken,
  binding: string,
  secret?: string,
): string {
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key(secret),
      Buffer.from(value.iv, "base64"),
    );
    decipher.setAAD(Buffer.from(binding));
    decipher.setAuthTag(Buffer.from(value.tag, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(value.ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new LocBridgeError(
      409,
      "The support connection changed. End or reconcile the original session before reconnecting.",
    );
  }
}
