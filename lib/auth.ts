import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "crypto";

const SESSION_COOKIE = "taller_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type SessionUser = {
  /** id del usuario, o "admin" para la contrasena general del taller */
  id: string;
  name: string;
  isAdmin: boolean;
  /** secciones a las que puede entrar (claves de lib/permissions) */
  permissions: string[];
  mechanicId: string | null;
};

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

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export const ADMIN_SESSION: Omit<SessionUser, "permissions"> & { permissions: string[] } = {
  id: "admin",
  name: "Administrador",
  isAdmin: true,
  permissions: [],
  mechanicId: null,
};

export function createSessionToken(user: SessionUser = ADMIN_SESSION): { value: string; maxAge: number } {
  const expires = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const body = Buffer.from(
    JSON.stringify({ u: user.id, n: user.name, a: user.isAdmin, p: user.permissions, m: user.mechanicId, e: expires })
  ).toString("base64url");
  const payload = `v2.${body}`;
  return { value: `${payload}.${sign(payload)}`, maxAge: SESSION_MAX_AGE_SECONDS };
}

export function parseSessionToken(token: string | undefined): SessionUser | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [marker, middle, signature] = parts;

  // Formato antiguo (antes de los usuarios): equivale al administrador
  if (marker === "ok") {
    const expires = Number(middle);
    if (!Number.isFinite(expires) || expires < Date.now()) return null;
    if (!safeEqual(signature, sign(`${marker}.${middle}`))) return null;
    return { ...ADMIN_SESSION };
  }

  if (marker !== "v2") return null;
  if (!safeEqual(signature, sign(`${marker}.${middle}`))) return null;
  try {
    const data = JSON.parse(Buffer.from(middle, "base64url").toString("utf8"));
    if (!Number.isFinite(data.e) || data.e < Date.now()) return null;
    return {
      id: String(data.u),
      name: String(data.n || ""),
      isAdmin: !!data.a,
      permissions: Array.isArray(data.p) ? data.p.map(String) : [],
      mechanicId: data.m ? String(data.m) : null,
    };
  } catch {
    return null;
  }
}

export function isValidSessionToken(token: string | undefined): boolean {
  return parseSessionToken(token) !== null;
}

export { SESSION_COOKIE };
