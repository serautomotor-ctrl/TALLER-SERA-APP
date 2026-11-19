import { prisma } from "./prisma";
import { getSessionUser } from "./session";

/** Guarda una linea en el registro de acciones (quien hizo que y cuando). Nunca rompe la accion principal. */
export async function logAction(action: string, detail = "") {
  try {
    const user = await getSessionUser();
    await prisma.auditLog.create({ data: { userName: user?.name || "", action, detail: detail.slice(0, 500) } });
  } catch {
    // el registro es secundario: si falla no bloqueamos al usuario
  }
}
