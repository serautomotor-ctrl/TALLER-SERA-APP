"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { $Enums } from "@/app/generated/prisma/client";

export async function createAppointment(formData: FormData) {
  const dateStr = String(formData.get("date") || "");
  const timeStr = String(formData.get("time") || "09:00");
  if (!dateStr) return;

  const date = new Date(`${dateStr}T${timeStr}:00`);
  if (Number.isNaN(date.getTime())) return;

  await prisma.appointment.create({
    data: {
      date,
      plate: String(formData.get("plate") || "").trim().toUpperCase(),
      clientName: String(formData.get("clientName") || "").trim(),
      reason: String(formData.get("reason") || "").trim(),
      notes: String(formData.get("notes") || "").trim(),
    },
  });

  revalidatePath("/agenda");
}

export async function setAppointmentStatus(id: string, status: $Enums.AppointmentStatus) {
  await prisma.appointment.update({ where: { id }, data: { status } });
  revalidatePath("/agenda");
}

export async function removeAppointment(id: string) {
  await prisma.appointment.delete({ where: { id } });
  revalidatePath("/agenda");
}
