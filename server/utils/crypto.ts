import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const PASSWORD_KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, PASSWORD_KEY_LENGTH).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, expectedHash] = storedHash.split(":");
  if (!salt || !expectedHash) {
    return false;
  }

  const derived = scryptSync(password, salt, PASSWORD_KEY_LENGTH);
  const expected = Buffer.from(expectedHash, "hex");
  if (derived.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(derived, expected);
}

export function createOpaqueToken(): string {
  return randomBytes(32).toString("hex");
}
