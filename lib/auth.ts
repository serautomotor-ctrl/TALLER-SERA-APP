import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "crypto";

const SESSION_COOKIE = "taller_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Falta la variable de entorno AUTH_SECRET");
  return secret;
}

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const candidate = scryptSync(password, salt, 64);
  const stored = Buffer.from(hash, "hex");
  if (candidate.length !== stored.length) return false;
  return timingSafeEqual(candidate, stored);
}

function sign(value: string): string {
  return createHmac("sha256", getAuthSecret()).update(value).digest("hex");
}

export function createSessionToken(): { value: string; maxAge: number } {
  const expires = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = `ok.${expires}`;
  const signature = sign(payload);
  return { value: `${payload}.${signature}`, maxAge: SESSION_MAX_AGE_SECONDS };
}

export function isValidSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [marker, expiresStr, signature] = parts;
  if (marker !== "ok") return false;
  const expires = Number(expiresStr);
  if (!Number.isFinite(expires) || expires < Date.now()) return false;
  const expectedSignature = sign(`${marker}.${expiresStr}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSignature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export { SESSION_COOKIE };
