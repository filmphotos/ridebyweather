import { randomBytes, randomInt } from "crypto";

// Unambiguous alphabet (no 0/O/1/I) for the short user-facing code.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const PAIRING_TTL_MS = 10 * 60 * 1000; // 10 minutes

/** Short human-readable code shown on the device + embedded in the QR URL. */
export function generatePairingCode(length = 6): string {
  let s = "";
  for (let i = 0; i < length; i++) {
    s += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return s;
}

/** Opaque secret the device polls with (never shown to the user). */
export function generateDeviceSecret(): string {
  return randomBytes(24).toString("hex");
}
