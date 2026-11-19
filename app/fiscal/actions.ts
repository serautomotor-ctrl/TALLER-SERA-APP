"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";

export async function addAsset(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const cost = parseFloat(String(formData.get("cost") || "").replace(",", "."));
  const years = parseInt(String(formData.get("years") || "10"), 10);
  const date = String(formData.get("purchaseDate") || "");
  if (!name || !Number.isFinite(cost) || cost <= 0 || !date) return;
  await prisma.asset.create({
    data: { name, cost, years: Number.isFinite(years) && years > 0 ? years : 10, purchaseDate: new Date(`${date}T12:00:00`), notes: String(formData.get("notes") || "").trim() },
  });
  await logAction("Bien amortizable anadido", `${name}: ${cost.toFixed(2)} EUR`);
  revalidatePath("/fiscal");
}

export async function removeAsset(id: string) {
  await prisma.asset.delete({ where: { id } });
  revalidatePath("/fiscal");
}
