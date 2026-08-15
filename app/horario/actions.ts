"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function startEntry(formData: FormData) {
  const existing = await prisma.timeEntry.findFirst({ where: { end: null } });
  if (existing) return;

  const task = String(formData.get("task") || "").trim() || "Tarea general";
  const plate = String(formData.get("plate") || "").trim().toUpperCase();

  await prisma.timeEntry.create({ data: { task, plate } });
  revalidatePath("/horario");
  revalidatePath("/");
}

export async function togglePause(id: string) {
  const entry = await prisma.timeEntry.findUnique({ where: { id } });
  if (!entry || entry.end) return;

  if (entry.paused && entry.pauseStart) {
    const pausedFor = Date.now() - entry.pauseStart.getTime();
    await prisma.timeEntry.update({
      where: { id },
      data: { paused: false, pausedMs: entry.pausedMs + pausedFor, pauseStart: null },
    });
  } else {
    await prisma.timeEntry.update({ where: { id }, data: { paused: true, pauseStart: new Date() } });
  }
  revalidatePath("/horario");
  revalidatePath("/");
}

export async function finishEntry(id: string) {
  const entry = await prisma.timeEntry.findUnique({ where: { id } });
  if (!entry || entry.end) return;

  let pausedMs = entry.pausedMs;
  if (entry.paused && entry.pauseStart) {
    pausedMs += Date.now() - entry.pauseStart.getTime();
  }

  await prisma.timeEntry.update({
    where: { id },
    data: { end: new Date(), paused: false, pauseStart: null, pausedMs },
  });
  revalidatePath("/horario");
  revalidatePath("/");
  revalidatePath("/ordenes");
}
