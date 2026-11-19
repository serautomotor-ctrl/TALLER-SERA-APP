"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";

function num(v: FormDataEntryValue | null) {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}

export async function addCashMovement(formData: FormData) {
  const amount = num(formData.get("amount"));
  const concept = String(formData.get("concept") || "").trim();
  const kind = formData.get("kind") === "salida" ? "salida" : "entrada";
  const day = String(formData.get("day") || "");
  if (!concept || !Number.isFinite(amount) || amount <= 0) return;
  const now = new Date();
  const date = day ? new Date(`${day}T${now.toTimeString().slice(0, 8)}`) : now;
  await prisma.cashMovement.create({ data: { kind, amount, concept, date } });
  await logAction(kind === "entrada" ? "Entrada de caja" : "Salida de caja", `${concept}: ${amount.toFixed(2)} EUR`);
  revalidatePath("/caja");
}

export async function removeCashMovement(id: string) {
  const m = await prisma.cashMovement.delete({ where: { id } });
  await logAction("Movimiento de caja borrado", `${m.concept}: ${Number(m.amount).toFixed(2)} EUR`);
  revalidatePath("/caja");
}

export async function closeCash(expected: number, formData: FormData) {
  const counted = num(formData.get("counted"));
  if (!Number.isFinite(counted)) return;
  const day = String(formData.get("day") || "");
  const date = day ? new Date(`${day}T21:00:00`) : new Date();
  await prisma.cashClose.create({ data: { date, expected, counted, note: String(formData.get("note") || "").trim() } });
  await logAction("Cierre de caja", `Esperado ${expected.toFixed(2)} · contado ${counted.toFixed(2)}`);
  revalidatePath("/caja");
}

export async function removeCashClose(id: string) {
  await prisma.cashClose.delete({ where: { id } });
  revalidatePath("/caja");
}
