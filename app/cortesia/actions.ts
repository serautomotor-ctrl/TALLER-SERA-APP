"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";

function intOrNull(v: FormDataEntryValue | null) {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : null;
}

export async function saveCourtesyCar(id: string | null, formData: FormData) {
  const plate = String(formData.get("plate") || "").trim().toUpperCase();
  if (!plate) return;
  const data = {
    plate,
    brand: String(formData.get("brand") || "").trim(),
    model: String(formData.get("model") || "").trim(),
    notes: String(formData.get("notes") || "").trim(),
    active: id ? formData.get("active") === "on" : true,
  };
  if (id) await prisma.courtesyCar.update({ where: { id }, data });
  else await prisma.courtesyCar.create({ data });
  revalidatePath("/cortesia");
}

export async function createLoan(data: {
  carId: string;
  clientName: string;
  phone: string;
  clientPlate: string;
  orderId: string;
  expectedBack: string;
  kmOut: string;
  fuelOut: string;
  notes: string;
  signatureUrl: string;
}): Promise<{ error?: string }> {
  if (!data.carId || !data.clientName.trim()) return { error: "Elige el coche y escribe el nombre del cliente." };
  const busy = await prisma.courtesyLoan.findFirst({ where: { carId: data.carId, returnedAt: null } });
  if (busy) return { error: "Ese coche ya esta prestado." };
  const km = parseInt(data.kmOut, 10);
  const loan = await prisma.courtesyLoan.create({
    data: {
      carId: data.carId,
      clientName: data.clientName.trim(),
      phone: data.phone.trim(),
      clientPlate: data.clientPlate.trim().toUpperCase(),
      orderId: data.orderId || null,
      expectedBack: data.expectedBack ? new Date(`${data.expectedBack}T19:00:00`) : null,
      kmOut: Number.isFinite(km) ? km : null,
      fuelOut: data.fuelOut,
      notes: data.notes.trim(),
      signatureUrl: data.signatureUrl.startsWith("data:image/") ? data.signatureUrl : "",
    },
    include: { car: true },
  });
  await logAction("Coche de cortesia prestado", `${loan.car.plate} a ${loan.clientName}`);
  revalidatePath("/cortesia");
  return {};
}

export async function returnLoan(loanId: string, formData: FormData) {
  const loan = await prisma.courtesyLoan.update({
    where: { id: loanId },
    data: {
      returnedAt: new Date(),
      kmIn: intOrNull(formData.get("kmIn")),
      fuelIn: String(formData.get("fuelIn") || ""),
      notes: String(formData.get("notes") || "").trim() || undefined,
    },
    include: { car: true },
  });
  await logAction("Coche de cortesia devuelto", `${loan.car.plate} por ${loan.clientName}`);
  revalidatePath("/cortesia");
}
