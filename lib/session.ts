import { cookies } from "next/headers";
import { parseSessionToken, SESSION_COOKIE, type SessionUser } from "./auth";
import { canAccess, type SectionKey } from "./permissions";

/** Usuario que ha iniciado sesion (o null). Solo en el servidor. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  return parseSessionToken(store.get(SESSION_COOKIE)?.value);
}

/** Para acciones delicadas: lanza un error si el usuario no tiene permiso. */
export async function requirePermission(section: SectionKey) {
  const user = await getSessionUser();
  if (!user || !canAccess(user, section)) throw new Error("No tienes permiso para hacer esto.");
  return user;
}
