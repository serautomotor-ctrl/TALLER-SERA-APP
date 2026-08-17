"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function requestAppointment(formData: FormData): Promise<{ ok?: boolean; error?: string }> {
  const clientName = String(formData.get("clientName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const dateStr = String(formData.get("date") || "");
  const timeStr = String(formData.get("time") || "09:00");
  if (!clientName || !phone || !dateStr) {
    return { error: "Rellena tu nombre, telefono y la fecha que prefieras." };
  }

  const date = new Date(`${dateStr}T${timeStr}:00`);
  if (Number.isNaN(date.getTime())) {
    return { error: "La fecha no es valida." };
  }

  await prisma.appointment.create({
    data: {
      date,
      clientName,
      phone,
      plate: String(formData.get("plate") || "").trim().toUpperCase(),
      reason: String(formData.get("reason") || "").trim(),
      notes: String(formData.get("notes") || "").trim(),
      fromWeb: true,
    },
  });

  revalidatePath("/agenda");
  return { ok: true };
}
