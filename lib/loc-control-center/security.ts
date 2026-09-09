import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export class LocBridgeError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
// Only use before any business effect has been attempted.
export class LocPreconditionError extends LocBridgeError {}

export function verifyLocSignature(
  raw: string,
  headers: Headers,
  secret = process.env.LOC_CONTROL_CENTER_SECRET,
  now = Date.now(),
) {
  if (!secret || secret.length < 32)
    throw new LocBridgeError(503, "LOC connection is not configured.");
  const timestamp = headers.get("x-loc-timestamp") ?? "";
  const supplied = headers.get("x-loc-signature") ?? "";
  if (
    !/^\d{10}$/.test(timestamp) ||
    Math.abs(now - Number(timestamp) * 1000) > 60_000 ||
    !/^[a-f0-9]{64}$/.test(supplied)
  )
    throw new LocBridgeError(401, "Invalid or expired LOC signature.");
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${raw}`)
    .digest("hex");
  if (
    !timingSafeEqual(Buffer.from(supplied, "hex"), Buffer.from(expected, "hex"))
  )
    throw new LocBridgeError(401, "Invalid LOC signature.");
}
export const digestLocInput = (value: unknown): string =>
  createHash("sha256").update(canonical(value)).digest("hex");
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`,
      )
      .join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
