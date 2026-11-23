"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import { requirePermission } from "@/lib/session";
import { mergePlateConfig, type PlateConfig } from "@/lib/plate";

export async function getPlateConfig(): Promise<PlateConfig> {
  await requirePermission("placas");
  const s = await prisma.settings.findUniqueOrThrow({ where: { id: "singleton" }, select: { plateConfig: true } });
  return mergePlateConfig(s.plateConfig);
}

export async function savePlateConfig(cfg: PlateConfig) {
  await requirePermission("placas");
  const clean = mergePlateConfig(cfg);
  await prisma.settings.update({ where: { id: "singleton" }, data: { plateConfig: clean } });
  await logAction("Ajustes de placas guardados", `Desplaz. ${clean.offsetX}/${clean.offsetY} mm, escala ${clean.scale}%`);
  revalidatePath("/placas");
}

/** Apunta en el registro las placas que se mandan a imprimir */
export async function recordPlateJob(data: { plate: string; qty: number; holderName: string; holderTaxId: string; notes: string }) {
  const user = await requirePermission("placas");
  const plate = data.plate.toUpperCase().replace(/[^A-Z0-9Ñ\- ]/g, "").trim();
  if (!plate) return { error: "Falta la matricula." };
  const qty = Math.min(20, Math.max(1, Math.round(data.qty) || 1));
  await prisma.plateJob.create({
    data: {
      plate,
      qty,
      holderName: data.holderName.trim().slice(0, 120),
      holderTaxId: data.holderTaxId.trim().toUpperCase().slice(0, 20),
      notes: data.notes.trim().slice(0, 300),
      userName: user.name,
    },
  });
  await logAction("Placas impresas", `${plate} x${qty}`);
  revalidatePath("/placas");
  return {};
}

export async function deletePlateJob(id: string) {
  const user = await requirePermission("placas");
  if (!user.isAdmin) throw new Error("Solo un administrador puede borrar del registro.");
  const job = await prisma.plateJob.delete({ where: { id } });
  await logAction("Registro de placas borrado", `${job.plate} x${job.qty}`);
  revalidatePath("/placas");
}
