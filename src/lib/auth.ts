import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "eat_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 jours

function getPassword(): string | null {
  const pwd = process.env.APP_PASSWORD;
  if (!pwd || pwd.length === 0) return null;
  return pwd;
}

export function isAuthEnabled(): boolean {
  return getPassword() !== null;
}

function getSecret(): Buffer {
  const pwd = getPassword();
  if (!pwd) throw new Error("APP_PASSWORD not set");
  return createHmac("sha256", "eat-scheduler-session-v1").update(pwd).digest();
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createSessionToken(): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = `v1.${issuedAt}`;
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [version, issuedAtStr, signature] = parts;
  if (version !== "v1") return false;

  const issuedAt = Number(issuedAtStr);
  if (!Number.isFinite(issuedAt)) return false;
  const ageSeconds = Math.floor(Date.now() / 1000) - issuedAt;
  if (ageSeconds < 0 || ageSeconds > SESSION_MAX_AGE_SECONDS) return false;

  const expected = sign(`${version}.${issuedAtStr}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function checkPassword(submitted: string): boolean {
  const expected = getPassword();
  if (!expected) return false;
  const a = Buffer.from(submitted);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
