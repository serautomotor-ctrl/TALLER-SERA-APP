"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isValidShareToken } from "@/lib/share";

/** El cliente acepta y firma el presupuesto desde el enlace que le hemos enviado. */
export async function acceptBudgetOnline(budgetId: string, token: string, signerName: string, dataUrl: string): Promise<{ error?: string }> {
  if (!isValidShareToken("presupuesto", budgetId, token)) return { error: "Enlace no valido." };
  if (!signerName.trim()) return { error: "Escribe tu nombre." };
  if (!dataUrl.startsWith("data:image/") || dataUrl.length > 400_000) return { error: "Firma no valida." };

  const budget = await prisma.budget.findUnique({ where: { id: budgetId } });
  if (!budget) return { error: "Presupuesto no encontrado." };
  if (budget.signedAt) return {};

  await prisma.budget.update({
    where: { id: budgetId },
    data: { signatureUrl: dataUrl, signerName: signerName.trim().slice(0, 120), signedAt: new Date(), acceptedOnline: true },
  });
  await prisma.auditLog.create({
    data: { userName: `Cliente: ${signerName.trim().slice(0, 60)}`, action: "Presupuesto aceptado online", detail: budget.number },
  });
  revalidatePath(`/doc/presupuesto/${budgetId}`);
  revalidatePath("/presupuestos");
  return {};
}
