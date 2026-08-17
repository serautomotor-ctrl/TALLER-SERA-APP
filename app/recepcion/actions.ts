"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { $Enums } from "@/app/generated/prisma/client";

export async function getOrCreateReception(orderId: string) {
  const existing = await prisma.reception.findUnique({ where: { orderId } });
  if (existing) return existing;

  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  const requestedTexts = order.description
    ? order.description.split(/\n|;/).map((t) => t.trim()).filter(Boolean)
    : [];

  return prisma.reception.create({
    data: {
      orderId,
      requestedItems: { create: requestedTexts.map((text) => ({ text })) },
    },
  });
}

export async function setReceptionMileage(receptionId: string, formData: FormData) {
  const mileage = parseInt(String(formData.get("mileage") || ""), 10);
  if (!Number.isFinite(mileage)) return;

  const reception = await prisma.reception.update({
    where: { id: receptionId },
    data: { mileage },
    include: { order: true },
  });

  await prisma.vehicle.update({ where: { plate: reception.order.plate }, data: { mileage } });

  revalidatePath("/recepcion");
  revalidatePath("/fichas");
}

export async function addRequestedItem(receptionId: string, formData: FormData) {
  const text = String(formData.get("text") || "").trim();
  if (!text) return;
  await prisma.requestedItem.create({ data: { receptionId, text } });
  revalidatePath("/recepcion");
}

export async function removeRequestedItem(id: string) {
  await prisma.requestedItem.delete({ where: { id } });
  revalidatePath("/recepcion");
}

export async function addFinding(receptionId: string, formData: FormData) {
  const text = String(formData.get("text") || "").trim();
  if (!text) return;
  await prisma.finding.create({ data: { receptionId, text } });
  revalidatePath("/recepcion");
}

export async function removeFinding(id: string) {
  await prisma.finding.delete({ where: { id } });
  revalidatePath("/recepcion");
}

export async function setFindingPrice(id: string, priceText: string) {
  const price = priceText.trim() === "" ? null : parseFloat(priceText.replace(",", "."));
  await prisma.finding.update({ where: { id }, data: { price: Number.isFinite(price) ? price : null } });
  revalidatePath("/recepcion");
}

export async function addFindingPhoto(id: string, dataUrl: string) {
  const finding = await prisma.finding.findUniqueOrThrow({ where: { id } });
  await prisma.finding.update({ where: { id }, data: { photos: { set: [...finding.photos, dataUrl] } } });
  revalidatePath("/recepcion");
}

export async function removeFindingPhoto(id: string, index: number) {
  const finding = await prisma.finding.findUniqueOrThrow({ where: { id } });
  const photos = finding.photos.filter((_, i) => i !== index);
  await prisma.finding.update({ where: { id }, data: { photos: { set: photos } } });
  revalidatePath("/recepcion");
}

export async function setCheckpoint(receptionId: string, name: string, status: string) {
  const reception = await prisma.reception.findUniqueOrThrow({ where: { id: receptionId } });
  const checkpoints = { ...(reception.checkpoints as Record<string, string>), [name]: status };
  await prisma.reception.update({ where: { id: receptionId }, data: { checkpoints } });
  revalidatePath("/recepcion");
}

export async function setBudgetStatus(receptionId: string, status: $Enums.BudgetStatus) {
  await prisma.reception.update({
    where: { id: receptionId },
    data: { budgetStatus: status, sentAt: status === "enviado" ? new Date() : undefined },
  });
  revalidatePath("/recepcion");
}
