import { createHmac, timingSafeEqual } from "crypto";

/**
 * Enlaces publicos firmados para que el cliente pueda ver su factura o presupuesto
 * sin contrasena. El token depende del tipo y del id, asi no se puede adivinar.
 */
export type ShareKind = "factura" | "presupuesto";

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("Falta la variable de entorno AUTH_SECRET");
  return s;
}

export function shareToken(kind: ShareKind, id: string) {
  return createHmac("sha256", secret()).update(`doc:${kind}:${id}`).digest("base64url").slice(0, 24);
}

export function isValidShareToken(kind: ShareKind, id: string, token: string | undefined) {
  if (!token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(shareToken(kind, id));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function sharePath(kind: ShareKind, id: string) {
  return `/doc/${kind}/${id}?t=${shareToken(kind, id)}`;
}
