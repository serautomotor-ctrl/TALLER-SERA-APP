"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function markReminded(vehicleId: string) {
  await prisma.vehicle.update({ where: { id: vehicleId }, data: { lastReminderAt: new Date() } });
  await prisma.historyEntry.create({ data: { vehicleId, text: "Aviso enviado al cliente (ITV / revision)" } });
  revalidatePath("/avisos");
  revalidatePath("/fichas");
}

export async function postponeReminder(vehicleId: string, field: "itvDate" | "nextServiceDate", months: number) {
  const v = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!v) return;
  const base = v[field] ?? new Date();
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  await prisma.vehicle.update({ where: { id: vehicleId }, data: { [field]: d } });
  revalidatePath("/avisos");
  revalidatePath("/fichas");
}
