"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function createVehicle(formData: FormData) {
  const plate = String(formData.get("plate") || "").trim().toUpperCase();
  if (!plate) return;

  const vehicle = await prisma.vehicle.create({
    data: {
      plate,
      clientName: String(formData.get("clientName") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      model: String(formData.get("model") || "").trim(),
    },
  });

  revalidatePath("/fichas");
  redirect(`/fichas?id=${vehicle.id}`);
}

export async function addHistory(vehicleId: string, formData: FormData) {
  const text = String(formData.get("text") || "").trim();
  if (!text) return;
  await prisma.historyEntry.create({ data: { vehicleId, text } });
  revalidatePath("/fichas");
}

export async function addPendingPayment(vehicleId: string, formData: FormData) {
  const amount = parseFloat(String(formData.get("amount") || "").replace(",", "."));
  if (!amount) return;
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) return;
  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: { pendingPayments: Number(vehicle.pendingPayments) + amount },
  });
  revalidatePath("/fichas");
  revalidatePath("/");
}

export async function clearPending(vehicleId: string) {
  await prisma.vehicle.update({ where: { id: vehicleId }, data: { pendingPayments: 0 } });
  revalidatePath("/fichas");
  revalidatePath("/");
}

export async function addWarranty(vehicleId: string, formData: FormData) {
  const text = String(formData.get("text") || "").trim();
  if (!text) return;
  await prisma.warranty.create({ data: { vehicleId, text } });
  revalidatePath("/fichas");
}

export async function removeWarranty(id: string) {
  await prisma.warranty.delete({ where: { id } });
  revalidatePath("/fichas");
}
