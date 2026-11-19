"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function saveInsurer(id: string | null, formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  const data = {
    name,
    taxId: String(formData.get("taxId") || "").trim().toUpperCase(),
    address: String(formData.get("address") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    notes: String(formData.get("notes") || "").trim(),
  };
  if (id) await prisma.insurer.update({ where: { id }, data });
  else await prisma.insurer.create({ data });
  revalidatePath("/aseguradoras");
  revalidatePath("/facturas");
}

export async function removeInsurer(id: string) {
  await prisma.insurer.delete({ where: { id } });
  revalidatePath("/aseguradoras");
  revalidatePath("/facturas");
}
