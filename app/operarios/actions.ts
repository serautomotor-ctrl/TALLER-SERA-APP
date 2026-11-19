"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import type { $Enums } from "@/app/generated/prisma/client";

function refresh() {
  revalidatePath("/operarios");
  revalidatePath("/taller");
  revalidatePath("/horario");
  revalidatePath("/");
}

function num(v: FormDataEntryValue | null) {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export async function createMechanic(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  await prisma.mechanic.create({
    data: { name, color: String(formData.get("color") || "#E8833A"), hourlyCost: num(formData.get("hourlyCost")) },
  });
  await logAction("Alta de operario", name);
  refresh();
}

export async function updateMechanic(id: string, formData: FormData) {
  await prisma.mechanic.update({
    where: { id },
    data: {
      name: String(formData.get("name") || "").trim() || undefined,
      color: String(formData.get("color") || "#E8833A"),
      hourlyCost: num(formData.get("hourlyCost")),
      active: formData.get("active") === "on",
    },
  });
  refresh();
}

export async function addAbsence(mechanicId: string, formData: FormData) {
  const from = String(formData.get("from") || "");
  const to = String(formData.get("to") || from);
  if (!from) return;
  await prisma.absence.create({
    data: {
      mechanicId,
      kind: (String(formData.get("kind") || "vacaciones") as $Enums.AbsenceKind),
      from: new Date(`${from}T00:00:00`),
      to: new Date(`${to || from}T23:59:59`),
      note: String(formData.get("note") || "").trim(),
    },
  });
  refresh();
}

export async function removeAbsence(id: string) {
  await prisma.absence.delete({ where: { id } });
  refresh();
}

/** Fichar entrada / salida (registro de jornada) */
export async function toggleClock(mechanicId: string) {
  const open = await prisma.clocking.findFirst({ where: { mechanicId, out: null }, orderBy: { in: "desc" } });
  if (open) {
    await prisma.clocking.update({ where: { id: open.id }, data: { out: new Date() } });
  } else {
    await prisma.clocking.create({ data: { mechanicId } });
  }
  refresh();
}

export async function addManualClocking(mechanicId: string, formData: FormData) {
  const day = String(formData.get("day") || "");
  const tin = String(formData.get("in") || "");
  const tout = String(formData.get("out") || "");
  const note = String(formData.get("note") || "").trim();
  if (!day || !tin) return;
  const inAt = new Date(`${day}T${tin}:00`);
  const outAt = tout ? new Date(`${day}T${tout}:00`) : null;
  if (outAt && outAt <= inAt) return;
  await prisma.clocking.create({ data: { mechanicId, in: inAt, out: outAt, note: note || "Corregido a mano" } });
  await logAction("Fichaje corregido a mano", `${day} ${tin}-${tout || "?"}`);
  refresh();
}

export async function removeClocking(id: string) {
  const c = await prisma.clocking.delete({ where: { id } });
  await logAction("Fichaje borrado", c.in.toLocaleString("es-ES"));
  refresh();
}
