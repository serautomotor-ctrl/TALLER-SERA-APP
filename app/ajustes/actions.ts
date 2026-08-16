"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth";

export async function updateSettings(formData: FormData) {
  await prisma.settings.update({
    where: { id: "singleton" },
    data: {
      workshopName: String(formData.get("workshopName") || "").trim(),
      taxId: String(formData.get("taxId") || "").trim(),
      address: String(formData.get("address") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      hourlyRate: parseFloat(String(formData.get("hourlyRate") || "0").replace(",", ".")) || 0,
    },
  });
  revalidatePath("/ajustes");
  revalidatePath("/");
}

export async function addChecklistItem(formData: FormData) {
  const text = String(formData.get("text") || "").trim();
  if (!text) return;
  const settings = await prisma.settings.findUniqueOrThrow({ where: { id: "singleton" } });
  if (settings.checklist.includes(text)) return;
  await prisma.settings.update({ where: { id: "singleton" }, data: { checklist: [...settings.checklist, text] } });
  revalidatePath("/ajustes");
  revalidatePath("/recepcion");
}

export async function removeChecklistItem(text: string) {
  const settings = await prisma.settings.findUniqueOrThrow({ where: { id: "singleton" } });
  await prisma.settings.update({
    where: { id: "singleton" },
    data: { checklist: settings.checklist.filter((t) => t !== text) },
  });
  revalidatePath("/ajustes");
  revalidatePath("/recepcion");
}

export async function changePassword(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const current = String(formData.get("currentPassword") || "");
  const next = String(formData.get("newPassword") || "");
  const confirm = String(formData.get("confirmPassword") || "");

  const settings = await prisma.settings.findUniqueOrThrow({ where: { id: "singleton" } });

  if (!verifyPassword(current, settings.passwordHash, settings.passwordSalt)) {
    return { error: "La contrasena actual no es correcta." };
  }
  if (next.length < 6) {
    return { error: "La nueva contrasena debe tener al menos 6 caracteres." };
  }
  if (next !== confirm) {
    return { error: "Las dos contrasenas nuevas no coinciden." };
  }

  const { hash, salt } = hashPassword(next);
  await prisma.settings.update({
    where: { id: "singleton" },
    data: { passwordHash: hash, passwordSalt: salt },
  });

  return { ok: true };
}
